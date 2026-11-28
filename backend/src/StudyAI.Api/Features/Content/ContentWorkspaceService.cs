using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Exceptions;
using StudyAI.Data;
using StudyAI.Features.Admin;
using StudyAI.Models;

namespace StudyAI.Features.Content;

public class ContentWorkspaceService : IContentWorkspaceService
{
    private readonly StudyAIDbContext _db;
    private readonly IAuditWriter _auditWriter;

    private static readonly (string Code, string Title)[] Math12Chapters =
    [
        ("M12-C1", "Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số"),
        ("M12-C2", "Vectơ và hệ tọa độ trong không gian"),
        ("M12-C3", "Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm"),
        ("M12-C4", "Nguyên hàm và tích phân"),
        ("M12-C5", "Phương pháp tọa độ trong không gian"),
        ("M12-C6", "Xác suất có điều kiện"),
    ];

    private static readonly HashSet<string> AllowedMaterialCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "pdf", "formula_sheet", "chapter_doc", "topic_doc", "reference_exam", "diagram"
    };

    private static readonly HashSet<string> AllowedMaterialMimes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf", "image/png", "image/jpeg", "image/webp", "text/markdown", "text/plain"
    };

    private static readonly HashSet<string> AllowedMaterialStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "draft", "pending_review", "published", "archived"
    };

    private static readonly HashSet<string> AllowedErrorReportStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "open", "in_progress", "resolved", "escalated", "closed"
    };

    private static readonly HashSet<string> AllowedErrorReportClassifications = new(StringComparer.OrdinalIgnoreCase)
    {
        "content_error", "technical_escalation"
    };

    public ContentWorkspaceService(StudyAIDbContext db, IAuditWriter auditWriter)
    {
        _db = db;
        _auditWriter = auditWriter;
    }

    public async Task<ContentWorkspaceDashboardDto> GetDashboardAsync(CancellationToken ct = default)
    {
        var lessons = await _db.ContentLessons.AsNoTracking()
            .Select(l => new { l.Id, l.Status, l.ChapterId })
            .ToListAsync(ct);

        var chapters = await _db.ContentChapters.AsNoTracking()
            .Include(c => c.Subject)
            .Where(c => c.Subject != null && c.Subject.Grade == "12" &&
                        (c.Subject.Code.ToUpper().Contains("MATH") || c.Subject.Name.Contains("Toán")))
            .Select(c => new { c.Id, c.Title, c.OrderIndex })
            .ToListAsync(ct);

        var questions = await _db.ContentQuestions.AsNoTracking()
            .Select(q => new { q.Id, q.ChapterId, q.Status })
            .ToListAsync(ct);

        var examsCount = await _db.ContentAssessments.AsNoTracking().CountAsync(ct);
        var materialsCount = await _db.ContentMaterials.AsNoTracking().CountAsync(ct);
        var openErrorReports = await _db.ContentErrorReports.AsNoTracking()
            .CountAsync(r => r.Status == "open" || r.Status == "in_progress", ct);

        var aiIndexed = await _db.AiKnowledgeSources.AsNoTracking().CountAsync(s => s.Status == "indexed", ct);
        var aiFailed = await _db.AiKnowledgeSources.AsNoTracking().CountAsync(s => s.Status == "failed", ct);

        var chapterStats = Math12Chapters.Select((ch, idx) =>
        {
            var matchedChapterIds = chapters
                .Where(c => c.OrderIndex == idx + 1 || c.Title.Contains(ch.Title.Split(' ')[0], StringComparison.OrdinalIgnoreCase))
                .Select(c => c.Id)
                .ToHashSet();

            return new ContentChapterQuestionStatDto
            {
                ChapterCode = ch.Code,
                ChapterTitle = ch.Title,
                QuestionCount = questions.Count(q => q.ChapterId != null && matchedChapterIds.Contains(q.ChapterId)),
                LessonCount = lessons.Count(l => matchedChapterIds.Contains(l.ChapterId)),
            };
        }).ToList();

        var recentRevs = await _db.ContentRevisions.AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .Take(8)
            .Select(r => new ContentRecentEditDto
            {
                Id = r.Id,
                EntityType = r.ContentType,
                Title = !string.IsNullOrEmpty(r.Title) ? r.Title : r.ContentId,
                Action = r.Status,
                Actor = r.AuthorId ?? r.CreatedBy ?? "staff",
                Timestamp = r.CreatedAt.ToString("o")
            })
            .ToListAsync(ct);

        return new ContentWorkspaceDashboardDto
        {
            TotalLessons = lessons.Count,
            TotalQuestions = questions.Count,
            TotalExams = examsCount,
            TotalMaterials = materialsCount,
            PublishedCount = lessons.Count(l => l.Status == "published"),
            DraftCount = lessons.Count(l => l.Status == "draft"),
            PendingReviewCount = lessons.Count(l => l.Status == "pending_review" || l.Status == "in_review"),
            OpenErrorReportsCount = openErrorReports,
            AiSourcesIndexedCount = aiIndexed,
            AiSourcesFailedCount = aiFailed,
            QuestionsByChapter = chapterStats,
            RecentEdits = recentRevs,
        };
    }

    public async Task<List<ContentMaterialDto>> GetMaterialsAsync(
        string? category = null, string? status = null, string? search = null, CancellationToken ct = default)
    {
        var query = _db.ContentMaterials.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(category) && category != "all")
            query = query.Where(m => m.Category == category.Trim().ToLowerInvariant());
        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            query = query.Where(m => m.Status == status.Trim().ToLowerInvariant());
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(m => m.Title.ToLower().Contains(term) || m.FileName.ToLower().Contains(term));
        }

        var rows = await query
            .OrderByDescending(m => m.UpdatedAt)
            .ThenBy(m => m.Id)
            .ToListAsync(ct);

        return rows.Select(ToDto).ToList();
    }

    public async Task<ContentMaterialDto> CreateMaterialAsync(
        CreateContentMaterialRequestDto req, string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            throw new ValidationException("Title", "Tiêu đề tài liệu không được để trống.");
        if (string.IsNullOrWhiteSpace(req.FileName) || req.FileName.Contains("..") || req.FileName.Contains('/') || req.FileName.Contains('\\'))
            throw new ValidationException("FileName", "Tên tệp không hợp lệ.");

        var category = (req.Category ?? "chapter_doc").Trim().ToLowerInvariant();
        if (!AllowedMaterialCategories.Contains(category))
            throw new ValidationException("Category", "Danh mục tài liệu không hợp lệ.");

        var mime = (req.MimeType ?? string.Empty).Trim().ToLowerInvariant();
        if (!AllowedMaterialMimes.Contains(mime))
            throw new ValidationException("MimeType", "Định dạng MIME không được hỗ trợ.");

        if (req.FileSizeBytes <= 0 || req.FileSizeBytes > 15 * 1024 * 1024)
            throw new ValidationException("FileSizeBytes", "Dung lượng tệp phải từ 1 byte đến 15 MB.");

        ValidateFileSignatureIfProvided(mime, req.Base64Header);

        if (string.IsNullOrWhiteSpace(req.StoragePathOrUrl))
            throw new ValidationException("StoragePathOrUrl", "Đường dẫn lưu trữ không được để trống.");

        var now = DateTimeOffset.UtcNow;
        var entity = new ContentMaterial
        {
            Id = $"mat-{Guid.NewGuid():N}",
            Title = req.Title.Trim(),
            Category = category,
            ChapterCode = req.ChapterCode?.Trim(),
            ChapterTitle = req.ChapterTitle?.Trim(),
            FileName = req.FileName.Trim(),
            MimeType = mime,
            FileSizeBytes = req.FileSizeBytes,
            FileHashSha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{req.FileName}:{req.FileSizeBytes}:{now.ToUnixTimeMilliseconds()}"))).ToLowerInvariant(),
            StoragePathOrUrl = req.StoragePathOrUrl.Trim(),
            Status = "draft",
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentMaterials.Add(entity);
        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync("content_material_create", "content_material", entity.Id, null, $"{{\"title\":\"{entity.Title}\"}}", ct);
        return ToDto(entity);
    }

    public async Task<ContentMaterialDto> UpdateMaterialStatusAsync(
        string id, string status, string userId, CancellationToken ct = default)
    {
        var normalized = (status ?? string.Empty).Trim().ToLowerInvariant();
        if (!AllowedMaterialStatuses.Contains(normalized))
            throw new ValidationException("Status", "Trạng thái tài liệu không hợp lệ.");

        var entity = await _db.ContentMaterials.FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy tài liệu học tập.");

        entity.Status = normalized;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        // CONTENT-001: If material is no longer published, revoke its AI knowledge sources and remove chunks in the same transaction
        if (normalized != "published")
        {
            var linkedSources = await _db.AiKnowledgeSources
                .Include(s => s.Chunks)
                .Where(s => s.SourceType == "material" && s.SourceRefId == id)
                .ToListAsync(ct);
            foreach (var src in linkedSources)
            {
                if (src.Chunks.Count > 0)
                    _db.AiKnowledgeChunks.RemoveRange(src.Chunks);
                src.Status = "revoked";
                src.ChunkCount = 0;
                src.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync("content_material_status", "content_material", entity.Id, null, $"{{\"status\":\"{normalized}\",\"actor\":\"{userId}\"}}", ct);
        return ToDto(entity);
    }

    public async Task<List<AiKnowledgeSourceDto>> GetKnowledgeSourcesAsync(CancellationToken ct = default)
    {
        var rows = await _db.AiKnowledgeSources.AsNoTracking()
            .OrderByDescending(s => s.UpdatedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(ct);

        return rows.Select(ToDto).ToList();
    }

    public async Task<AiKnowledgeSourceDto> RegisterAndSyncKnowledgeSourceAsync(
        RegisterAiKnowledgeSourceRequestDto req, string userId, CancellationToken ct = default)
    {
        var sourceType = (req.SourceType ?? "lesson").Trim().ToLowerInvariant();
        if (sourceType != "lesson" && sourceType != "material")
            throw new ValidationException("SourceType", "Chỉ hỗ trợ nguồn 'lesson' hoặc 'material'.");
        if (string.IsNullOrWhiteSpace(req.SourceRefId))
            throw new ValidationException("SourceRefId", "Thiếu mã tham chiếu nguồn tri thức.");

        var (resolvedTitle, contentText) = await ResolveApprovedSourceTextAsync(sourceType, req.SourceRefId.Trim(), req.ExtractedText, ct);

        var now = DateTimeOffset.UtcNow;
        var source = new AiKnowledgeSource
        {
            Id = $"aks-{Guid.NewGuid():N}",
            Title = string.IsNullOrWhiteSpace(req.Title) ? resolvedTitle : req.Title.Trim(),
            SourceType = sourceType,
            SourceRefId = req.SourceRefId.Trim(),
            ChapterCode = req.ChapterCode?.Trim(),
            Status = "pending",
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.AiKnowledgeSources.Add(source);
        await _db.SaveChangesAsync(ct);

        if (string.IsNullOrWhiteSpace(contentText))
        {
            source.Status = "failed";
            source.ChunkCount = 0;
            source.LastError = "Không thể trích xuất nội dung văn bản từ tài liệu nguồn.";
            source.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
            return ToDto(source);
        }

        return await IndexSourceChunksAsync(source, contentText, userId, ct);
    }

    public async Task<AiKnowledgeSourceDto> SyncKnowledgeSourceAsync(string id, string userId, CancellationToken ct = default)
    {
        var source = await _db.AiKnowledgeSources.Include(s => s.Chunks).FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy nguồn tri thức AI.");

        var existingText = source.Chunks.Count > 0
            ? string.Join("\n", source.Chunks.OrderBy(c => c.ChunkIndex).Select(c => c.ContentText))
            : null;
        var (_, contentText) = await ResolveApprovedSourceTextAsync(source.SourceType, source.SourceRefId, existingText, ct);
        if (string.IsNullOrWhiteSpace(contentText))
        {
            source.Status = "failed";
            source.LastError = "Không thể trích xuất nội dung văn bản từ tài liệu nguồn.";
            source.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
            return ToDto(source);
        }
        return await IndexSourceChunksAsync(source, contentText, userId, ct);
    }

    public async Task<AiKnowledgeSourceDto> RevokeKnowledgeSourceAsync(string id, string userId, CancellationToken ct = default)
    {
        var source = await _db.AiKnowledgeSources.Include(s => s.Chunks).FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy nguồn tri thức AI.");

        _db.AiKnowledgeChunks.RemoveRange(source.Chunks);
        source.Status = "revoked";
        source.ChunkCount = 0;
        source.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync("ai_knowledge_revoke", "ai_knowledge_source", source.Id, null, $"{{\"actor\":\"{userId}\"}}", ct);
        return ToDto(source);
    }

    public async Task<List<RetrievedKnowledgeChunkDto>> TestRetrieveKnowledgeAsync(
        string query, int topK = 5, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query)) return new List<RetrievedKnowledgeChunkDto>();
        var terms = Regex.Split(query.ToLowerInvariant(), @"[\s,.;:!?()\[\]]+")
            .Where(t => t.Length >= 2)
            .Distinct()
            .ToArray();
        if (terms.Length == 0) return new List<RetrievedKnowledgeChunkDto>();

        var activeChunks = await _db.AiKnowledgeChunks.AsNoTracking()
            .Include(c => c.Source)
            .Where(c => c.Source != null && c.Source.Status == "indexed")
            .ToListAsync(ct);

        // Verify referenced materials/lessons are still published (CONTENT-001)
        var matIds = activeChunks.Where(c => c.Source!.SourceType == "material").Select(c => c.Source!.SourceRefId).Distinct().ToList();
        var publishedMatIds = matIds.Count == 0
            ? new HashSet<string>()
            : (await _db.ContentMaterials.AsNoTracking().Where(m => matIds.Contains(m.Id) && m.Status == "published").Select(m => m.Id).ToListAsync(ct)).ToHashSet(StringComparer.Ordinal);
        var lesIds = activeChunks.Where(c => c.Source!.SourceType == "lesson").Select(c => c.Source!.SourceRefId).Distinct().ToList();
        var publishedLesIds = lesIds.Count == 0
            ? new HashSet<string>()
            : (await _db.ContentLessons.AsNoTracking().Where(l => lesIds.Contains(l.Id) && l.Status == "published").Select(l => l.Id).ToListAsync(ct)).ToHashSet(StringComparer.Ordinal);

        return activeChunks
            .Where(c => (c.Source!.SourceType == "material" && publishedMatIds.Contains(c.Source.SourceRefId))
                     || (c.Source!.SourceType == "lesson" && publishedLesIds.Contains(c.Source.SourceRefId)))
            .Select(c =>
            {
                var hay = $"{c.Title} {c.ContentText}".ToLowerInvariant();
                var score = terms.Count(t => hay.Contains(t, StringComparison.Ordinal));
                return new { Chunk = c, Score = score };
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Chunk.Id)
            .Take(Math.Clamp(topK, 1, 20))
            .Select(x => new RetrievedKnowledgeChunkDto
            {
                ChunkId = x.Chunk.Id,
                SourceId = x.Chunk.SourceId,
                SourceTitle = x.Chunk.Source?.Title ?? x.Chunk.Title,
                ContentText = x.Chunk.ContentText,
                Score = x.Score
            })
            .ToList();
    }

    public async Task<List<ContentErrorReportDto>> GetErrorReportsAsync(
        string? status = null, string? classification = null, CancellationToken ct = default)
    {
        var query = _db.ContentErrorReports.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            query = query.Where(r => r.Status == status.Trim().ToLowerInvariant());
        if (!string.IsNullOrWhiteSpace(classification) && classification != "all")
            query = query.Where(r => r.Classification == classification.Trim().ToLowerInvariant());

        var rows = await query
            .OrderByDescending(r => r.UpdatedAt)
            .ThenBy(r => r.Id)
            .ToListAsync(ct);

        return rows.Select(ToDto).ToList();
    }

    public async Task<ContentErrorReportDto> CreateErrorReportAsync(
        CreateContentErrorReportRequestDto req, string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            throw new ValidationException("Title", "Tiêu đề báo cáo sai sót không được để trống.");
        if (string.IsNullOrWhiteSpace(req.Description))
            throw new ValidationException("Description", "Mô tả chi tiết không được để trống.");

        var now = DateTimeOffset.UtcNow;
        var entity = new ContentErrorReport
        {
            Id = $"err-{Guid.NewGuid():N}",
            ReportCode = $"CR-{now:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            TargetType = (req.TargetType ?? "question").Trim().ToLowerInvariant(),
            TargetId = req.TargetId?.Trim(),
            Title = req.Title.Trim(),
            Description = req.Description.Trim(),
            Severity = (req.Severity ?? "medium").Trim().ToLowerInvariant(),
            Classification = "content_error",
            Status = "open",
            ReportedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentErrorReports.Add(entity);
        await _db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<ContentErrorReportDto> UpdateErrorReportAsync(
        string id, UpdateContentErrorReportRequestDto req, string userId, CancellationToken ct = default)
    {
        var entity = await _db.ContentErrorReports.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("Không tìm thấy báo cáo sai sót.");

        var now = DateTimeOffset.UtcNow;
        if (!string.IsNullOrWhiteSpace(req.Classification))
        {
            var cls = req.Classification.Trim().ToLowerInvariant();
            if (!AllowedErrorReportClassifications.Contains(cls))
                throw new ValidationException("Classification", "Phân loại báo cáo sai sót không hợp lệ.");
            entity.Classification = cls;
        }
        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            var nextStatus = req.Status.Trim().ToLowerInvariant();
            if (!AllowedErrorReportStatuses.Contains(nextStatus))
                throw new ValidationException("Status", "Trạng thái báo cáo sai sót không hợp lệ.");
            entity.Status = nextStatus;
            entity.ResolvedAt = (entity.Status == "resolved" || entity.Status == "closed") ? now : null;
        }
        if (req.ResolutionNote != null)
        {
            var note = req.ResolutionNote.Trim();
            if (note.Length > 1000)
                throw new ValidationException("ResolutionNote", "Ghi chú xử lý không được vượt quá 1000 ký tự.");
            entity.ResolutionNote = note;
        }
        entity.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);
        await _auditWriter.WriteStaffAuditAsync("content_error_report_update", "content_error_report", entity.Id, null, $"{{\"status\":\"{entity.Status}\",\"actor\":\"{userId}\"}}", ct);
        return ToDto(entity);
    }

    private async Task<(string Title, string? ContentText)> ResolveApprovedSourceTextAsync(
        string sourceType, string sourceRefId, string? extractedText, CancellationToken ct)
    {
        if (sourceType == "lesson")
        {
            var lesson = await _db.ContentLessons.AsNoTracking().FirstOrDefaultAsync(l => l.Id == sourceRefId, ct)
                ?? throw new NotFoundException("Không tìm thấy bài học nguồn.");
            if (lesson.Status != "published")
                throw new ValidationException("SourceRefId", "Chỉ được đưa bài học đã xuất bản (published) vào Kho tri thức AI.");
            var text = $"{lesson.Title}\n{lesson.Introduction}\n{lesson.DefinitionsJson}\n{lesson.FormulasJson}\n{lesson.ExamplesJson}\n{lesson.SummaryPointsJson}".Trim();
            return (lesson.Title, string.IsNullOrWhiteSpace(text) ? null : text);
        }

        var material = await _db.ContentMaterials.AsNoTracking().FirstOrDefaultAsync(m => m.Id == sourceRefId, ct)
            ?? throw new NotFoundException("Không tìm thấy tài liệu nguồn.");
        if (material.Status != "published")
            throw new ValidationException("SourceRefId", "Chỉ được đưa tài liệu đã xuất bản (published) vào Kho tri thức AI.");
        var cleanExtracted = string.IsNullOrWhiteSpace(extractedText) ? null : extractedText.Trim();
        return (material.Title, cleanExtracted);
    }

    private async Task<AiKnowledgeSourceDto> IndexSourceChunksAsync(
        AiKnowledgeSource source, string contentText, string userId, CancellationToken ct)
    {
        if (source.Chunks.Count > 0)
            _db.AiKnowledgeChunks.RemoveRange(source.Chunks);

        var chunks = new List<AiKnowledgeChunk>();
        const int chunkSize = 600;
        for (int i = 0, idx = 0; i < contentText.Length; i += chunkSize, idx++)
        {
            var slice = contentText.Substring(i, Math.Min(chunkSize, contentText.Length - i));
            chunks.Add(new AiKnowledgeChunk
            {
                Id = $"akc-{Guid.NewGuid():N}",
                SourceId = source.Id,
                ChunkIndex = idx,
                Title = source.Title,
                ContentText = slice,
                TokenEstimate = Math.Max(1, slice.Length / 4),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        _db.AiKnowledgeChunks.AddRange(chunks);
        source.Status = "indexed";
        source.ChunkCount = chunks.Count;
        source.LastIndexedAt = DateTimeOffset.UtcNow;
        source.LastError = null;
        source.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync("ai_knowledge_sync", "ai_knowledge_source", source.Id, null, $"{{\"chunks\":{chunks.Count},\"actor\":\"{userId}\"}}", ct);
        return ToDto(source);
    }

    private static void ValidateFileSignatureIfProvided(string mime, string? base64Header)
    {
        if (string.IsNullOrWhiteSpace(base64Header)) return;
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(base64Header);
        }
        catch
        {
            throw new ValidationException("Base64Header", "Chữ ký tệp (Base64) không hợp lệ.");
        }

        if (mime == "application/pdf" && (bytes.Length < 4 || bytes[0] != 0x25 || bytes[1] != 0x50 || bytes[2] != 0x44 || bytes[3] != 0x46))
            throw new ValidationException("Base64Header", "Chữ ký tệp PDF không khớp (%PDF).");
        if (mime == "image/png" && (bytes.Length < 4 || bytes[0] != 0x89 || bytes[1] != 0x50 || bytes[2] != 0x4E || bytes[3] != 0x47))
            throw new ValidationException("Base64Header", "Chữ ký tệp PNG không hợp lệ.");
        if (mime == "image/jpeg" && (bytes.Length < 3 || bytes[0] != 0xFF || bytes[1] != 0xD8 || bytes[2] != 0xFF))
            throw new ValidationException("Base64Header", "Chữ ký tệp JPEG không hợp lệ.");
    }

    private static ContentMaterialDto ToDto(ContentMaterial m) => new()
    {
        Id = m.Id,
        Title = m.Title,
        Category = m.Category,
        ChapterCode = m.ChapterCode,
        ChapterTitle = m.ChapterTitle,
        FileName = m.FileName,
        MimeType = m.MimeType,
        FileSizeBytes = m.FileSizeBytes,
        StoragePathOrUrl = m.StoragePathOrUrl,
        Status = m.Status,
        CreatedAt = m.CreatedAt.ToString("o"),
        UpdatedAt = m.UpdatedAt.ToString("o")
    };

    private static AiKnowledgeSourceDto ToDto(AiKnowledgeSource s) => new()
    {
        Id = s.Id,
        Title = s.Title,
        SourceType = s.SourceType,
        SourceRefId = s.SourceRefId,
        ChapterCode = s.ChapterCode,
        Status = s.Status,
        ChunkCount = s.ChunkCount,
        LastIndexedAt = s.LastIndexedAt?.ToString("o"),
        LastError = s.LastError,
        UpdatedAt = s.UpdatedAt.ToString("o")
    };

    private static ContentErrorReportDto ToDto(ContentErrorReport r) => new()
    {
        Id = r.Id,
        ReportCode = r.ReportCode,
        TargetType = r.TargetType,
        TargetId = r.TargetId,
        Title = r.Title,
        Description = r.Description,
        Severity = r.Severity,
        Classification = r.Classification,
        Status = r.Status,
        ReportedByUserId = r.ReportedByUserId,
        ResolutionNote = r.ResolutionNote,
        CreatedAt = r.CreatedAt.ToString("o"),
        UpdatedAt = r.UpdatedAt.ToString("o")
    };
}
