using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Data;
using StudyAI.Models;

namespace StudyAI.Features.Content;

public class LessonCompositionService : ILessonCompositionService
{
    private const int CompositionSnapshotSchemaVersion = 2;

    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;

    public LessonCompositionService(IApplicationDbContext db, IAuditWriter auditWriter)
    {
        _db = db;
        _auditWriter = auditWriter;
    }

    public async Task<LessonCompositionDto> GetLessonCompositionAsync(string lessonId, CancellationToken ct = default)
    {
        var lesson = await LoadLessonWithContextAsync(lessonId, ct)
            ?? throw new NotFoundException("Bài học không tồn tại.");

        return await BuildCompositionDtoAsync(lesson, ct);
    }

    public async Task<LessonCompositionDto> ReplaceLessonCompositionAsync(
        string lessonId,
        ReplaceLessonCompositionRequestDto request,
        string actorId,
        CancellationToken ct = default)
    {
        if (request.Blocks is null)
        {
            throw new ValidationException("blocks", "Danh sách blocks không được null.");
        }
        if (request.Blocks.Count > LessonContentBlockValidator.MaxBlocksPerLesson)
        {
            throw new ValidationException("blocks", $"Số lượng block vượt quá giới hạn {LessonContentBlockValidator.MaxBlocksPerLesson}.");
        }

        // Validate all block payloads up front before opening DB writes
        var validatedPayloads = new List<(string? Id, string BlockType, int SchemaVersion, string PayloadJson, int OrderIndex)>(request.Blocks.Count);
        for (var i = 0; i < request.Blocks.Count; i++)
        {
            var b = request.Blocks[i];
            var rawJson = LessonContentBlockValidator.ValidateAndNormalizePayload(b, i);
            validatedPayloads.Add((
                string.IsNullOrWhiteSpace(b.Id) ? null : b.Id.Trim(),
                b.BlockType.Trim(),
                b.SchemaVersion,
                rawJson,
                i));
        }

        var objectiveIds = NormalizeDistinctIds(request.ObjectiveIds);
        var knowledgeUnitIds = NormalizeDistinctIds(request.KnowledgeUnitIds);
        var skillIds = NormalizeDistinctIds(request.SkillIds);
        var prereqIds = NormalizeDistinctIds(request.PrerequisiteLessonIds);

        if (prereqIds.Contains(lessonId, StringComparer.Ordinal))
        {
            throw new ValidationException("prerequisiteLessonIds", "Bài học không thể tự làm điều kiện tiên quyết của chính nó.");
        }

        var execute = async () =>
        {
            await using var tx = _db.Database.IsRelational()
                ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
                : null;

            var lesson = await LoadLessonWithContextAsync(lessonId, ct)
                ?? throw new NotFoundException("Bài học không tồn tại.");

            VerifyLessonRowVersion(lesson, request.RowVersion);

            if (string.Equals(lesson.Status, "published", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(lesson.Status, "archived", StringComparison.OrdinalIgnoreCase))
            {
                throw new ConflictException($"Không thể chỉnh sửa nội dung bài học đang ở trạng thái '{lesson.Status}'. Vui lòng tạo bản nháp/hủy xuất bản hoặc rollback từ lịch sử phiên bản.");
            }

            var curriculumId = lesson.Chapter?.CurriculumEdition?.CurriculumId;
            await ValidateCurriculumNodesAsync(curriculumId, objectiveIds, knowledgeUnitIds, skillIds, ct);
            await ValidatePrerequisitesAndCyclesAsync(lessonId, curriculumId, prereqIds, ct);

            await ApplyCompositionMutationAsync(
                lesson,
                validatedPayloads,
                objectiveIds,
                knowledgeUnitIds,
                skillIds,
                prereqIds,
                actorId,
                string.IsNullOrWhiteSpace(request.Reason) ? "Cập nhật cấu trúc bài học P03" : request.Reason.Trim(),
                sourceRevisionId: null,
                ct);

            if (tx is not null)
            {
                await tx.CommitAsync(ct);
            }
        };

        if (_db.Database.IsRelational())
        {
            await _db.Database.CreateExecutionStrategy().ExecuteAsync(execute);
        }
        else
        {
            await execute();
        }

        var updated = await LoadLessonWithContextAsync(lessonId, ct)
            ?? throw new NotFoundException("Bài học không tồn tại.");
        return await BuildCompositionDtoAsync(updated, ct);
    }

    public async Task<LessonRevisionPageDto> GetRevisionsAsync(string lessonId, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var exists = await _db.ContentLessons.AsNoTracking().AnyAsync(l => l.Id == lessonId, ct);
        if (!exists)
        {
            throw new NotFoundException("Bài học không tồn tại.");
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.ContentRevisions
            .AsNoTracking()
            .Where(r => r.ContentId == lessonId && r.ContentType == "lesson");

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(r => r.Version)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new LessonRevisionDto(
                r.Id,
                r.ContentId,
                r.Version,
                r.Status,
                r.Title,
                r.SnapshotSchemaVersion,
                r.AuthorId,
                r.CreatedBy,
                r.Reason,
                r.SourceRevisionId,
                r.CreatedAt))
            .ToListAsync(ct);

        return new LessonRevisionPageDto(items, page, pageSize, totalCount);
    }

    public async Task<LessonCompositionDto> RollbackToRevisionAsync(
        string lessonId,
        string revisionId,
        RollbackLessonRevisionRequestDto request,
        string actorId,
        CancellationToken ct = default)
    {
        var execute = async () =>
        {
            await using var tx = _db.Database.IsRelational()
                ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
                : null;

            var lesson = await LoadLessonWithContextAsync(lessonId, ct)
                ?? throw new NotFoundException("Bài học không tồn tại.");

            VerifyLessonRowVersion(lesson, request.RowVersion);

            if (string.Equals(lesson.Status, "archived", StringComparison.OrdinalIgnoreCase))
            {
                throw new ConflictException("Không thể rollback bài học đã lưu trữ.");
            }

            var revision = await _db.ContentRevisions
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == revisionId && r.ContentId == lessonId && r.ContentType == "lesson", ct)
                ?? throw new NotFoundException("Phiên bản lịch sử không tồn tại.");

            var snapshot = ParseRevisionSnapshot(revision.SnapshotJson);
            if (!string.IsNullOrWhiteSpace(snapshot.Title))
            {
                lesson.Title = snapshot.Title;
            }
            if (snapshot.HasIntroduction)
            {
                lesson.Introduction = snapshot.Introduction;
            }

            // Rollback always restores into a new draft revision linked by SourceRevisionId
            lesson.Status = "draft";

            var validatedPayloads = new List<(string? Id, string BlockType, int SchemaVersion, string PayloadJson, int OrderIndex)>();
            for (var i = 0; i < snapshot.Blocks.Count; i++)
            {
                var b = snapshot.Blocks[i];
                var rawJson = LessonContentBlockValidator.ValidateAndNormalizePayload(b, i);
                validatedPayloads.Add((b.Id, b.BlockType.Trim(), b.SchemaVersion, rawJson, i));
            }

            var curriculumId = lesson.Chapter?.CurriculumEdition?.CurriculumId;
            await ValidateCurriculumNodesAsync(curriculumId, snapshot.ObjectiveIds, snapshot.KnowledgeUnitIds, snapshot.SkillIds, ct);
            await ValidatePrerequisitesAndCyclesAsync(lessonId, curriculumId, snapshot.PrerequisiteLessonIds, ct);

            var reason = string.IsNullOrWhiteSpace(request.Reason)
                ? $"Khôi phục từ phiên bản v{revision.Version}"
                : request.Reason.Trim();

            await ApplyCompositionMutationAsync(
                lesson,
                validatedPayloads,
                snapshot.ObjectiveIds,
                snapshot.KnowledgeUnitIds,
                snapshot.SkillIds,
                snapshot.PrerequisiteLessonIds,
                actorId,
                reason,
                sourceRevisionId: revision.Id,
                ct);

            if (tx is not null)
            {
                await tx.CommitAsync(ct);
            }
        };

        if (_db.Database.IsRelational())
        {
            await _db.Database.CreateExecutionStrategy().ExecuteAsync(execute);
        }
        else
        {
            await execute();
        }

        var updated = await LoadLessonWithContextAsync(lessonId, ct)
            ?? throw new NotFoundException("Bài học không tồn tại.");
        return await BuildCompositionDtoAsync(updated, ct);
    }

    public async Task<List<CurriculumNodeRefDto>> ListObjectivesAsync(string curriculumId, string? search = null, CancellationToken ct = default)
    {
        await EnsureCurriculumExistsAsync(curriculumId, ct);
        var query = _db.LearningObjectives.AsNoTracking()
            .Where(o => o.CurriculumId == curriculumId && o.Status != "archived");

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(o => o.Code.ToLower().Contains(term) || o.Title.ToLower().Contains(term));
        }

        return await query
            .OrderBy(o => o.Code)
            .Select(o => new CurriculumNodeRefDto(o.Id, o.CurriculumId, o.Code, o.Title, o.Description, o.CognitiveLevel, o.Status))
            .ToListAsync(ct);
    }

    public async Task<CurriculumNodeRefDto> CreateObjectiveAsync(string curriculumId, CreateCurriculumNodeRequestDto request, string actorId, CancellationToken ct = default)
    {
        await EnsureCurriculumExistsAsync(curriculumId, ct);
        var code = NormalizeCode(request.Code);
        var title = RequireTitle(request.Title);

        var exists = await _db.LearningObjectives.AsNoTracking()
            .AnyAsync(o => o.CurriculumId == curriculumId && o.Code == code && o.Status != "archived", ct);
        if (exists)
        {
            throw new ConflictException($"Mã mục tiêu '{code}' đã tồn tại trong chương trình.");
        }

        var now = DateTimeOffset.UtcNow;
        var entity = new LearningObjective
        {
            Id = $"obj_{Guid.NewGuid():N}",
            CurriculumId = curriculumId,
            Code = code,
            Title = title,
            Description = request.Description?.Trim(),
            CognitiveLevel = request.CognitiveLevel?.Trim(),
            Status = "draft",
            SourceName = request.SourceName?.Trim(),
            SourceUrl = request.SourceUrl?.Trim(),
            SourceLicense = request.SourceLicense?.Trim(),
            ReviewedBy = null,
            ReviewedAt = null,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.LearningObjectives.Add(entity);
        await SaveChangesMappingConflictsAsync(ct);
        return new CurriculumNodeRefDto(entity.Id, entity.CurriculumId, entity.Code, entity.Title, entity.Description, entity.CognitiveLevel, entity.Status);
    }

    public async Task<List<CurriculumNodeRefDto>> ListKnowledgeUnitsAsync(string curriculumId, string? search = null, CancellationToken ct = default)
    {
        await EnsureCurriculumExistsAsync(curriculumId, ct);
        var query = _db.KnowledgeUnits.AsNoTracking()
            .Where(k => k.CurriculumId == curriculumId && k.Status != "archived");

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(k => k.Code.ToLower().Contains(term) || k.Title.ToLower().Contains(term));
        }

        return await query
            .OrderBy(k => k.Code)
            .Select(k => new CurriculumNodeRefDto(k.Id, k.CurriculumId, k.Code, k.Title, k.Description, null, k.Status))
            .ToListAsync(ct);
    }

    public async Task<CurriculumNodeRefDto> CreateKnowledgeUnitAsync(string curriculumId, CreateCurriculumNodeRequestDto request, string actorId, CancellationToken ct = default)
    {
        await EnsureCurriculumExistsAsync(curriculumId, ct);
        var code = NormalizeCode(request.Code);
        var title = RequireTitle(request.Title);

        var exists = await _db.KnowledgeUnits.AsNoTracking()
            .AnyAsync(k => k.CurriculumId == curriculumId && k.Code == code && k.Status != "archived", ct);
        if (exists)
        {
            throw new ConflictException($"Mã đơn vị kiến thức '{code}' đã tồn tại trong chương trình.");
        }

        var now = DateTimeOffset.UtcNow;
        var entity = new KnowledgeUnit
        {
            Id = $"ku_{Guid.NewGuid():N}",
            CurriculumId = curriculumId,
            Code = code,
            Title = title,
            Description = request.Description?.Trim(),
            Status = "draft",
            SourceName = request.SourceName?.Trim(),
            SourceUrl = request.SourceUrl?.Trim(),
            SourceLicense = request.SourceLicense?.Trim(),
            ReviewedBy = null,
            ReviewedAt = null,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.KnowledgeUnits.Add(entity);
        await SaveChangesMappingConflictsAsync(ct);
        return new CurriculumNodeRefDto(entity.Id, entity.CurriculumId, entity.Code, entity.Title, entity.Description, null, entity.Status);
    }

    public async Task<List<CurriculumNodeRefDto>> ListSkillsAsync(string curriculumId, string? search = null, CancellationToken ct = default)
    {
        await EnsureCurriculumExistsAsync(curriculumId, ct);
        var query = _db.Skills.AsNoTracking()
            .Where(s => s.CurriculumId == curriculumId && s.Status != "archived");

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(s => s.Code.ToLower().Contains(term) || s.Title.ToLower().Contains(term));
        }

        return await query
            .OrderBy(s => s.Code)
            .Select(s => new CurriculumNodeRefDto(s.Id, s.CurriculumId, s.Code, s.Title, s.Description, null, s.Status))
            .ToListAsync(ct);
    }

    public async Task<CurriculumNodeRefDto> CreateSkillAsync(string curriculumId, CreateCurriculumNodeRequestDto request, string actorId, CancellationToken ct = default)
    {
        await EnsureCurriculumExistsAsync(curriculumId, ct);
        var code = NormalizeCode(request.Code);
        var title = RequireTitle(request.Title);

        var exists = await _db.Skills.AsNoTracking()
            .AnyAsync(s => s.CurriculumId == curriculumId && s.Code == code && s.Status != "archived", ct);
        if (exists)
        {
            throw new ConflictException($"Mã kỹ năng '{code}' đã tồn tại trong chương trình.");
        }

        var now = DateTimeOffset.UtcNow;
        var entity = new Skill
        {
            Id = $"sk_{Guid.NewGuid():N}",
            CurriculumId = curriculumId,
            Code = code,
            Title = title,
            Description = request.Description?.Trim(),
            Status = "draft",
            SourceName = request.SourceName?.Trim(),
            SourceUrl = request.SourceUrl?.Trim(),
            SourceLicense = request.SourceLicense?.Trim(),
            ReviewedBy = null,
            ReviewedAt = null,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Skills.Add(entity);
        await SaveChangesMappingConflictsAsync(ct);
        return new CurriculumNodeRefDto(entity.Id, entity.CurriculumId, entity.Code, entity.Title, entity.Description, null, entity.Status);
    }

    public async Task<CurriculumNodeRefDto> PublishCurriculumNodeAsync(
        string curriculumId,
        string nodeType,
        string nodeId,
        string reviewerId,
        CancellationToken ct = default)
    {
        await EnsureCurriculumExistsAsync(curriculumId, ct);
        var now = DateTimeOffset.UtcNow;

        switch (nodeType)
        {
            case "objectives":
            {
                var node = await _db.LearningObjectives.FirstOrDefaultAsync(o => o.Id == nodeId && o.CurriculumId == curriculumId, ct)
                    ?? throw new NotFoundException("Mục tiêu không tồn tại.");
                EnsureProvenancePresent(node.SourceName, node.SourceLicense, node.SourceUrl);
                node.Status = "published";
                node.ReviewedBy = reviewerId;
                node.ReviewedAt = now;
                node.UpdatedAt = now;
                await _auditWriter.WriteStaffAuditAsync("learning_objective_published", "learning_objective", node.Id, null, JsonSerializer.Serialize(new { reviewerId, node.Code }), ct);
                await SaveChangesMappingConflictsAsync(ct);
                return new CurriculumNodeRefDto(node.Id, node.CurriculumId, node.Code, node.Title, node.Description, node.CognitiveLevel, node.Status);
            }
            case "knowledge-units":
            {
                var node = await _db.KnowledgeUnits.FirstOrDefaultAsync(k => k.Id == nodeId && k.CurriculumId == curriculumId, ct)
                    ?? throw new NotFoundException("Đơn vị kiến thức không tồn tại.");
                EnsureProvenancePresent(node.SourceName, node.SourceLicense, node.SourceUrl);
                node.Status = "published";
                node.ReviewedBy = reviewerId;
                node.ReviewedAt = now;
                node.UpdatedAt = now;
                await _auditWriter.WriteStaffAuditAsync("knowledge_unit_published", "knowledge_unit", node.Id, null, JsonSerializer.Serialize(new { reviewerId, node.Code }), ct);
                await SaveChangesMappingConflictsAsync(ct);
                return new CurriculumNodeRefDto(node.Id, node.CurriculumId, node.Code, node.Title, node.Description, null, node.Status);
            }
            case "skills":
            {
                var node = await _db.Skills.FirstOrDefaultAsync(s => s.Id == nodeId && s.CurriculumId == curriculumId, ct)
                    ?? throw new NotFoundException("Kỹ năng không tồn tại.");
                EnsureProvenancePresent(node.SourceName, node.SourceLicense, node.SourceUrl);
                node.Status = "published";
                node.ReviewedBy = reviewerId;
                node.ReviewedAt = now;
                node.UpdatedAt = now;
                await _auditWriter.WriteStaffAuditAsync("skill_published", "skill", node.Id, null, JsonSerializer.Serialize(new { reviewerId, node.Code }), ct);
                await SaveChangesMappingConflictsAsync(ct);
                return new CurriculumNodeRefDto(node.Id, node.CurriculumId, node.Code, node.Title, node.Description, null, node.Status);
            }
            default:
                throw new ValidationException("nodeType", $"Loại node '{nodeType}' không hợp lệ.");
        }
    }

    private static void EnsureProvenancePresent(string? sourceName, string? sourceLicense, string? sourceUrl)
    {
        if (string.IsNullOrWhiteSpace(sourceName) && string.IsNullOrWhiteSpace(sourceUrl))
        {
            throw new ValidationException("sourceName", "Yêu cầu thông tin nguồn (SourceName hoặc SourceUrl) trước khi xuất bản.");
        }
        if (string.IsNullOrWhiteSpace(sourceLicense))
        {
            throw new ValidationException("sourceLicense", "Yêu cầu thông tin bản quyền (SourceLicense) trước khi xuất bản.");
        }
    }

    public async Task<List<PrerequisiteLessonDto>> ListCurriculumLessonsAsync(string curriculumId, string? excludeLessonId = null, string? search = null, CancellationToken ct = default)
    {
        await EnsureCurriculumExistsAsync(curriculumId, ct);

        var query = _db.ContentLessons
            .AsNoTracking()
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.CurriculumEdition)
            .Where(l => l.Status != "archived" &&
                        l.Chapter != null &&
                        l.Chapter.CurriculumEdition != null &&
                        l.Chapter.CurriculumEdition.CurriculumId == curriculumId);

        if (!string.IsNullOrWhiteSpace(excludeLessonId))
        {
            query = query.Where(l => l.Id != excludeLessonId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(l => l.Title.ToLower().Contains(term) || (l.Code != null && l.Code.ToLower().Contains(term)));
        }

        return await query
            .OrderBy(l => l.Chapter!.OrderIndex)
            .ThenBy(l => l.OrderIndex)
            .Select(l => new PrerequisiteLessonDto(l.Id, l.Code, l.Title, l.ChapterId, l.Status))
            .ToListAsync(ct);
    }

    private async Task<ContentLesson?> LoadLessonWithContextAsync(string lessonId, CancellationToken ct)
    {
        return await _db.ContentLessons
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.CurriculumEdition)
            .FirstOrDefaultAsync(l => l.Id == lessonId, ct);
    }

    private async Task<LessonCompositionDto> BuildCompositionDtoAsync(ContentLesson lesson, CancellationToken ct)
    {
        var blocks = await _db.LessonContentBlocks
            .AsNoTracking()
            .Where(b => b.LessonId == lesson.Id && b.Status != "archived")
            .OrderBy(b => b.OrderIndex)
            .ToListAsync(ct);

        var blockDtos = blocks.Select(b =>
        {
            using var doc = JsonDocument.Parse(b.PayloadJson);
            return new LessonContentBlockDto(
                b.Id,
                b.LessonId,
                b.BlockType,
                b.SchemaVersion,
                doc.RootElement.Clone(),
                b.OrderIndex,
                b.Status,
                Convert.ToBase64String(b.RowVersion),
                b.CreatedAt,
                b.UpdatedAt);
        }).ToList();

        var objectives = await _db.LessonObjectives
            .AsNoTracking()
            .Where(lo => lo.LessonId == lesson.Id)
            .OrderBy(lo => lo.OrderIndex)
            .Select(lo => lo.Objective!)
            .Where(o => o.Status != "archived")
            .Select(o => new CurriculumNodeRefDto(o.Id, o.CurriculumId, o.Code, o.Title, o.Description, o.CognitiveLevel, o.Status))
            .ToListAsync(ct);

        var knowledgeUnits = await _db.LessonKnowledgeUnits
            .AsNoTracking()
            .Where(lk => lk.LessonId == lesson.Id)
            .OrderBy(lk => lk.OrderIndex)
            .Select(lk => lk.KnowledgeUnit!)
            .Where(k => k.Status != "archived")
            .Select(k => new CurriculumNodeRefDto(k.Id, k.CurriculumId, k.Code, k.Title, k.Description, null, k.Status))
            .ToListAsync(ct);

        var skills = await _db.LessonSkills
            .AsNoTracking()
            .Where(ls => ls.LessonId == lesson.Id)
            .OrderBy(ls => ls.OrderIndex)
            .Select(ls => ls.Skill!)
            .Where(s => s.Status != "archived")
            .Select(s => new CurriculumNodeRefDto(s.Id, s.CurriculumId, s.Code, s.Title, s.Description, null, s.Status))
            .ToListAsync(ct);

        var prerequisites = await _db.LessonPrerequisites
            .AsNoTracking()
            .Where(lp => lp.LessonId == lesson.Id)
            .Select(lp => lp.PrerequisiteLesson!)
            .Where(pl => pl.Status != "archived")
            .Select(pl => new PrerequisiteLessonDto(pl.Id, pl.Code, pl.Title, pl.ChapterId, pl.Status))
            .ToListAsync(ct);

        return new LessonCompositionDto(
            lesson.Id,
            lesson.Title,
            lesson.Status,
            lesson.Chapter?.CurriculumEdition?.CurriculumId,
            Convert.ToBase64String(lesson.RowVersion),
            blockDtos,
            objectives,
            knowledgeUnits,
            skills,
            prerequisites);
    }

    private async Task ApplyCompositionMutationAsync(
        ContentLesson lesson,
        List<(string? Id, string BlockType, int SchemaVersion, string PayloadJson, int OrderIndex)> validatedPayloads,
        List<string> objectiveIds,
        List<string> knowledgeUnitIds,
        List<string> skillIds,
        List<string> prereqIds,
        string actorId,
        string reason,
        string? sourceRevisionId,
        CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;

        // Replace active blocks (preserving stable IDs when provided and owned by this lesson)
        var existingBlocks = await _db.LessonContentBlocks
            .Where(b => b.LessonId == lesson.Id && b.Status != "archived")
            .ToListAsync(ct);

        var existingById = existingBlocks.ToDictionary(b => b.Id, StringComparer.Ordinal);
        var keptIds = new HashSet<string>(StringComparer.Ordinal);
        var snapshotBlocks = new List<object>(validatedPayloads.Count);

        // Remove blocks not retained first to avoid OrderIndex unique constraint collisions
        var incomingIds = validatedPayloads
            .Where(p => p.Id is not null && existingById.ContainsKey(p.Id))
            .Select(p => p.Id!)
            .ToHashSet(StringComparer.Ordinal);

        foreach (var old in existingBlocks)
        {
            if (!incomingIds.Contains(old.Id))
            {
                _db.LessonContentBlocks.Remove(old);
            }
            else
            {
                // Shift temporarily negative to avoid swap collisions on (LessonId, OrderIndex)
                old.OrderIndex = -(old.OrderIndex + 1000);
            }
        }
        await _db.SaveChangesAsync(ct);

        foreach (var item in validatedPayloads)
        {
            LessonContentBlock entity;
            if (item.Id is not null && existingById.TryGetValue(item.Id, out var existing))
            {
                entity = existing;
                entity.BlockType = item.BlockType;
                entity.SchemaVersion = item.SchemaVersion;
                entity.PayloadJson = item.PayloadJson;
                entity.OrderIndex = item.OrderIndex;
                entity.Status = lesson.Status;
                entity.UpdatedAt = now;
                keptIds.Add(entity.Id);
            }
            else
            {
                entity = new LessonContentBlock
                {
                    Id = item.Id ?? $"blk_{Guid.NewGuid():N}",
                    LessonId = lesson.Id,
                    BlockType = item.BlockType,
                    SchemaVersion = item.SchemaVersion,
                    PayloadJson = item.PayloadJson,
                    OrderIndex = item.OrderIndex,
                    Status = lesson.Status,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _db.LessonContentBlocks.Add(entity);
            }

            using var doc = JsonDocument.Parse(item.PayloadJson);
            snapshotBlocks.Add(new
            {
                id = entity.Id,
                blockType = entity.BlockType,
                schemaVersion = entity.SchemaVersion,
                payload = doc.RootElement.Clone(),
                orderIndex = entity.OrderIndex
            });
        }

        // Replace relational joins
        var oldObjectives = await _db.LessonObjectives.Where(x => x.LessonId == lesson.Id).ToListAsync(ct);
        _db.LessonObjectives.RemoveRange(oldObjectives);
        for (var i = 0; i < objectiveIds.Count; i++)
        {
            _db.LessonObjectives.Add(new LessonObjective
            {
                Id = $"lo_{Guid.NewGuid():N}",
                LessonId = lesson.Id,
                ObjectiveId = objectiveIds[i],
                OrderIndex = i,
                CreatedAt = now
            });
        }

        var oldKus = await _db.LessonKnowledgeUnits.Where(x => x.LessonId == lesson.Id).ToListAsync(ct);
        _db.LessonKnowledgeUnits.RemoveRange(oldKus);
        for (var i = 0; i < knowledgeUnitIds.Count; i++)
        {
            _db.LessonKnowledgeUnits.Add(new LessonKnowledgeUnit
            {
                Id = $"lk_{Guid.NewGuid():N}",
                LessonId = lesson.Id,
                KnowledgeUnitId = knowledgeUnitIds[i],
                OrderIndex = i,
                CreatedAt = now
            });
        }

        var oldSkills = await _db.LessonSkills.Where(x => x.LessonId == lesson.Id).ToListAsync(ct);
        _db.LessonSkills.RemoveRange(oldSkills);
        for (var i = 0; i < skillIds.Count; i++)
        {
            _db.LessonSkills.Add(new LessonSkill
            {
                Id = $"ls_{Guid.NewGuid():N}",
                LessonId = lesson.Id,
                SkillId = skillIds[i],
                OrderIndex = i,
                CreatedAt = now
            });
        }

        var oldPrereqs = await _db.LessonPrerequisites.Where(x => x.LessonId == lesson.Id).ToListAsync(ct);
        _db.LessonPrerequisites.RemoveRange(oldPrereqs);
        foreach (var prereqId in prereqIds)
        {
            _db.LessonPrerequisites.Add(new LessonPrerequisite
            {
                Id = $"lp_{Guid.NewGuid():N}",
                LessonId = lesson.Id,
                PrerequisiteLessonId = prereqId,
                CreatedAt = now
            });
        }

        lesson.UpdatedAt = now;

        // Create immutable ContentRevision snapshot
        var maxVersion = await _db.ContentRevisions
            .Where(r => r.ContentId == lesson.Id && r.ContentType == "lesson")
            .Select(r => (int?)r.Version)
            .MaxAsync(ct) ?? 0;

        var snapshotObj = new
        {
            schemaVersion = CompositionSnapshotSchemaVersion,
            title = lesson.Title,
            introduction = lesson.Introduction,
            blocks = snapshotBlocks,
            objectiveIds,
            knowledgeUnitIds,
            skillIds,
            prerequisiteLessonIds = prereqIds
        };

        _db.ContentRevisions.Add(new ContentRevision
        {
            Id = $"rev_{Guid.NewGuid():N}",
            ContentId = lesson.Id,
            ContentType = "lesson",
            Version = maxVersion + 1,
            Status = lesson.Status,
            Title = lesson.Title,
            SnapshotJson = JsonSerializer.Serialize(snapshotObj),
            SnapshotSchemaVersion = CompositionSnapshotSchemaVersion,
            AuthorId = lesson.AuthorId,
            CreatedBy = actorId,
            Reason = reason,
            SourceRevisionId = sourceRevisionId,
            CreatedAt = now
        });

        await _auditWriter.WriteStaffAuditAsync(
            sourceRevisionId is not null ? "lesson_composition_rollback" : "lesson_composition_replace",
            "content_lesson",
            lesson.Id,
            null,
            JsonSerializer.Serialize(new { actorUserId = actorId, reason, sourceRevisionId, blockCount = validatedPayloads.Count }),
            ct);

        await SaveChangesMappingConflictsAsync(ct);
    }

    private async Task ValidateCurriculumNodesAsync(
        string? curriculumId,
        List<string> objectiveIds,
        List<string> knowledgeUnitIds,
        List<string> skillIds,
        CancellationToken ct)
    {
        if (objectiveIds.Count == 0 && knowledgeUnitIds.Count == 0 && skillIds.Count == 0)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(curriculumId))
        {
            throw new ValidationException("curriculumId", "Bài học chưa gắn với CurriculumEdition hợp lệ nên không thể liên kết mục tiêu/kiến thức/kỹ năng.");
        }

        if (objectiveIds.Count > 0)
        {
            var matched = await _db.LearningObjectives.AsNoTracking()
                .Where(o => objectiveIds.Contains(o.Id) && o.Status != "archived")
                .Select(o => new { o.Id, o.CurriculumId })
                .ToListAsync(ct);

            if (matched.Count != objectiveIds.Count || matched.Any(o => o.CurriculumId != curriculumId))
            {
                throw new ValidationException("objectiveIds", "Một hoặc nhiều mục tiêu không tồn tại hoặc không thuộc cùng chương trình (CurriculumId).");
            }
        }

        if (knowledgeUnitIds.Count > 0)
        {
            var matched = await _db.KnowledgeUnits.AsNoTracking()
                .Where(k => knowledgeUnitIds.Contains(k.Id) && k.Status != "archived")
                .Select(k => new { k.Id, k.CurriculumId })
                .ToListAsync(ct);

            if (matched.Count != knowledgeUnitIds.Count || matched.Any(k => k.CurriculumId != curriculumId))
            {
                throw new ValidationException("knowledgeUnitIds", "Một hoặc nhiều đơn vị kiến thức không tồn tại hoặc không thuộc cùng chương trình (CurriculumId).");
            }
        }

        if (skillIds.Count > 0)
        {
            var matched = await _db.Skills.AsNoTracking()
                .Where(s => skillIds.Contains(s.Id) && s.Status != "archived")
                .Select(s => new { s.Id, s.CurriculumId })
                .ToListAsync(ct);

            if (matched.Count != skillIds.Count || matched.Any(s => s.CurriculumId != curriculumId))
            {
                throw new ValidationException("skillIds", "Một hoặc nhiều kỹ năng không tồn tại hoặc không thuộc cùng chương trình (CurriculumId).");
            }
        }
    }

    private async Task ValidatePrerequisitesAndCyclesAsync(
        string lessonId,
        string? curriculumId,
        List<string> prereqIds,
        CancellationToken ct)
    {
        if (prereqIds.Count == 0) return;

        if (string.IsNullOrWhiteSpace(curriculumId))
        {
            throw new ValidationException("prerequisiteLessonIds", "Bài học chưa gắn CurriculumEdition nên không thể khai báo điều kiện tiên quyết.");
        }

        var targets = await _db.ContentLessons.AsNoTracking()
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.CurriculumEdition)
            .Where(l => prereqIds.Contains(l.Id) && l.Status != "archived")
            .Select(l => new
            {
                l.Id,
                CurriculumId = l.Chapter != null && l.Chapter.CurriculumEdition != null
                    ? l.Chapter.CurriculumEdition.CurriculumId
                    : null
            })
            .ToListAsync(ct);

        if (targets.Count != prereqIds.Count || targets.Any(t => t.CurriculumId != curriculumId))
        {
            throw new ValidationException("prerequisiteLessonIds", "Bài học tiên quyết không tồn tại hoặc không thuộc cùng chương trình.");
        }

        // BFS from each prerequisite to ensure lessonId is never reachable (prevents direct & indirect cycles)
        var allEdges = await _db.LessonPrerequisites.AsNoTracking()
            .Where(e => e.LessonId != lessonId)
            .Select(e => new { e.LessonId, e.PrerequisiteLessonId })
            .ToListAsync(ct);

        var adj = allEdges
            .GroupBy(e => e.LessonId, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.Select(x => x.PrerequisiteLessonId).ToList(), StringComparer.Ordinal);

        var visited = new HashSet<string>(StringComparer.Ordinal);
        var queue = new Queue<string>(prereqIds);
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (string.Equals(current, lessonId, StringComparison.Ordinal))
            {
                throw new ValidationException("prerequisiteLessonIds", "Phát hiện chu trình điều kiện tiên quyết (cycle) giữa các bài học.");
            }
            if (!visited.Add(current)) continue;
            if (adj.TryGetValue(current, out var nexts))
            {
                foreach (var n in nexts)
                {
                    if (!visited.Contains(n))
                    {
                        queue.Enqueue(n);
                    }
                }
            }
        }
    }

    private async Task EnsureCurriculumExistsAsync(string curriculumId, CancellationToken ct)
    {
        var exists = await _db.Curricula.AsNoTracking()
            .AnyAsync(c => c.Id == curriculumId && c.Status != "archived", ct);
        if (!exists)
        {
            throw new NotFoundException("Chương trình (Curriculum) không tồn tại.");
        }
    }

    private static void VerifyLessonRowVersion(ContentLesson lesson, string? rowVersionBase64)
    {
        if (string.IsNullOrWhiteSpace(rowVersionBase64))
        {
            throw new ConflictException("Thiếu RowVersion để kiểm tra xung đột đồng thời.");
        }
        byte[] clientVersion;
        try
        {
            clientVersion = Convert.FromBase64String(rowVersionBase64.Trim());
        }
        catch (FormatException)
        {
            throw new ValidationException("rowVersion", "RowVersion không đúng định dạng Base64.");
        }
        if (lesson.RowVersion.Length == 0 || !lesson.RowVersion.SequenceEqual(clientVersion))
        {
            throw new ConflictException("Dữ liệu bài học đã bị thay đổi bởi phiên khác (xung đột RowVersion). Vui lòng tải lại.");
        }
    }

    private async Task SaveChangesMappingConflictsAsync(CancellationToken ct)
    {
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Xung đột đồng thời khi lưu dữ liệu (RowVersion).");
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw new ConflictException("Dữ liệu bị trùng khóa duy nhất.");
        }
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        var msg = ex.InnerException?.Message ?? ex.Message;
        return msg.Contains("2601", StringComparison.Ordinal) ||
               msg.Contains("2627", StringComparison.Ordinal) ||
               msg.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase);
    }

    private static List<string> NormalizeDistinctIds(IEnumerable<string>? ids) =>
        (ids ?? Array.Empty<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

    private static string NormalizeCode(string code)
    {
        var normalized = (code ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalized) || normalized.Length > 64)
        {
            throw new ValidationException("code", "Mã phải từ 1 đến 64 ký tự.");
        }
        return normalized;
    }

    private static string RequireTitle(string title)
    {
        var t = (title ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(t) || t.Length > 256)
        {
            throw new ValidationException("title", "Tiêu đề phải từ 1 đến 256 ký tự.");
        }
        return t;
    }

    private sealed record ParsedSnapshot(
        string? Title,
        bool HasIntroduction,
        string? Introduction,
        List<LessonContentBlockInputDto> Blocks,
        List<string> ObjectiveIds,
        List<string> KnowledgeUnitIds,
        List<string> SkillIds,
        List<string> PrerequisiteLessonIds);

    private static ParsedSnapshot ParseRevisionSnapshot(string json)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "{}" : json);
        var root = doc.RootElement;

        var title = root.TryGetProperty("title", out var t) && t.ValueKind == JsonValueKind.String ? t.GetString() : null;
        var hasIntro = root.TryGetProperty("introduction", out var introEl);
        var intro = hasIntro && introEl.ValueKind == JsonValueKind.String ? introEl.GetString() : null;

        var blocks = new List<LessonContentBlockInputDto>();
        if (root.TryGetProperty("blocks", out var blocksEl) && blocksEl.ValueKind == JsonValueKind.Array)
        {
            var idx = 0;
            foreach (var b in blocksEl.EnumerateArray())
            {
                var id = b.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String ? idEl.GetString() : null;
                var bt = b.TryGetProperty("blockType", out var btEl) && btEl.ValueKind == JsonValueKind.String ? btEl.GetString()! : "text";
                var sv = b.TryGetProperty("schemaVersion", out var svEl) && svEl.ValueKind == JsonValueKind.Number ? svEl.GetInt32() : 1;
                var payload = b.TryGetProperty("payload", out var pEl) ? pEl.Clone() : JsonDocument.Parse("{}").RootElement.Clone();
                blocks.Add(new LessonContentBlockInputDto(id, bt, sv, payload, idx++));
            }
        }

        return new ParsedSnapshot(
            title,
            hasIntro,
            intro,
            blocks,
            ReadStringArray(root, "objectiveIds"),
            ReadStringArray(root, "knowledgeUnitIds"),
            ReadStringArray(root, "skillIds"),
            ReadStringArray(root, "prerequisiteLessonIds"));
    }

    private static List<string> ReadStringArray(JsonElement root, string propName)
    {
        if (!root.TryGetProperty(propName, out var el) || el.ValueKind != JsonValueKind.Array)
        {
            return new List<string>();
        }
        return el.EnumerateArray()
            .Where(x => x.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(x.GetString()))
            .Select(x => x.GetString()!.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }
}
