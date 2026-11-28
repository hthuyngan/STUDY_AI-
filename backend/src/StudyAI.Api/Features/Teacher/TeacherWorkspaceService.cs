using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Exceptions;
using StudyAI.Data;
using StudyAI.Features.AI;
using StudyAI.Models;

namespace StudyAI.Features.Teacher;

public class TeacherWorkspaceService : ITeacherWorkspaceService
{
    private readonly StudyAIDbContext _db;
    private readonly ILlmProvider _llmProvider;
    private readonly IAiUsageService? _aiUsageService;
    private readonly IAuditWriter? _auditWriter;

    private static readonly HashSet<string> AllowedExamStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "draft", "published", "closed"
    };

    private static readonly HashSet<string> AllowedAiModes = new(StringComparer.OrdinalIgnoreCase)
    {
        "lesson_plan", "generate_exercises", "question_gen", "exam_matrix", "feedback_draft"
    };

    private static readonly HashSet<string> AllowedMaterialMimes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf", "image/png", "image/jpeg", "image/webp", "text/markdown", "text/plain"
    };

    public TeacherWorkspaceService(
        StudyAIDbContext db,
        ILlmProvider llmProvider,
        IAiUsageService? aiUsageService = null,
        IAuditWriter? auditWriter = null)
    {
        _db = db;
        _llmProvider = llmProvider;
        _aiUsageService = aiUsageService;
        _auditWriter = auditWriter;
    }

    private async Task<Classroom> VerifyOwnedClassroomAsync(string classroomId, string teacherUserId, bool isAdmin, CancellationToken ct)
    {
        var cls = await _db.Classrooms.AsNoTracking().FirstOrDefaultAsync(c => c.Id == classroomId, ct)
            ?? throw new NotFoundException("Không tìm thấy lớp học.");
        if (!isAdmin && cls.TeacherId != teacherUserId)
            throw new ForbiddenException("Bạn không có quyền truy cập lớp học của giáo viên khác.");
        return cls;
    }

    public async Task<List<TeacherExamDto>> GetExamsAsync(string teacherUserId, bool isAdmin, string? classroomId = null, CancellationToken ct = default)
    {
        var query = _db.TeacherExams.AsNoTracking().AsQueryable();
        if (!isAdmin)
            query = query.Where(e => e.TeacherId == teacherUserId);
        if (!string.IsNullOrWhiteSpace(classroomId))
            query = query.Where(e => e.ClassroomId == classroomId.Trim());

        return await query.OrderByDescending(e => e.CreatedAt).ThenBy(e => e.Id)
            .Select(e => ToDto(e))
            .ToListAsync(ct);
    }

    public async Task<TeacherExamDto> CreateExamAsync(CreateTeacherExamRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            throw new ValidationException("Title", "Tiêu đề đề kiểm tra không được để trống.");
        if (req.DurationMinutes < 5 || req.DurationMinutes > 240)
            throw new ValidationException("DurationMinutes", "Thời lượng kiểm tra phải từ 5 đến 240 phút.");
        if (req.OpenAt.HasValue && req.CloseAt.HasValue && req.CloseAt <= req.OpenAt)
            throw new ValidationException("CloseAt", "Thời điểm đóng đề phải sau thời điểm mở đề.");

        var cls = await VerifyOwnedClassroomAsync(req.ClassroomId, teacherUserId, isAdmin, ct);

        if (string.IsNullOrWhiteSpace(req.SourceAssessmentId))
            throw new ValidationException("SourceAssessmentId", "Đề kiểm tra bắt buộc phải gắn với một đề mẫu Content đã xuất bản.");

        var sourceId = req.SourceAssessmentId.Trim();
        var src = await _db.ContentAssessments.AsNoTracking().FirstOrDefaultAsync(a => a.Id == sourceId, ct)
            ?? throw new NotFoundException("Không tìm thấy đề mẫu Content.");
        if (src.Status != "published")
            throw new ValidationException("SourceAssessmentId", "Chỉ được sao chép đề mẫu đã xuất bản.");
        var qCount = await _db.ContentQuestions.AsNoTracking().CountAsync(q => q.AssessmentId == src.Id, ct);
        if (qCount == 0)
            throw new ValidationException("SourceAssessmentId", "Đề mẫu nguồn chưa có câu hỏi nào.");

        var now = DateTimeOffset.UtcNow;
        var entity = new TeacherExam
        {
            Id = $"texam-{Guid.NewGuid():N}",
            ClassroomId = cls.Id,
            TeacherId = cls.TeacherId,
            SourceAssessmentId = req.SourceAssessmentId?.Trim(),
            Title = req.Title.Trim(),
            DurationMinutes = req.DurationMinutes,
            ShuffleQuestions = req.ShuffleQuestions,
            OpenAt = req.OpenAt,
            CloseAt = req.CloseAt,
            PublishResults = false,
            Status = "draft",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.TeacherExams.Add(entity);
        await _db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<TeacherExamDto> UpdateExamStatusAsync(string examId, UpdateTeacherExamStatusRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default)
    {
        var entity = await _db.TeacherExams.FirstOrDefaultAsync(e => e.Id == examId, ct)
            ?? throw new NotFoundException("Không tìm thấy đề kiểm tra.");
        if (!isAdmin && entity.TeacherId != teacherUserId)
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa đề kiểm tra của lớp khác.");

        var nextStatus = (req.Status ?? string.Empty).Trim().ToLowerInvariant();
        if (!AllowedExamStatuses.Contains(nextStatus))
            throw new ValidationException("Status", "Trạng thái đề kiểm tra không hợp lệ.");

        // Enforce monotonic lifecycle: draft -> published -> closed
        if (entity.Status == "closed" && nextStatus != "closed")
            throw new ValidationException("Status", "Không thể mở lại đề kiểm tra đã đóng.");
        if (entity.Status == "published" && nextStatus == "draft")
            throw new ValidationException("Status", "Không thể chuyển đề đã phát hành về bản nháp.");

        // Prevent publishing an exam without a published source assessment that contains at least 1 question
        if (nextStatus == "published")
        {
            if (string.IsNullOrWhiteSpace(entity.SourceAssessmentId))
                throw new ValidationException("SourceAssessmentId", "Không thể phát hành đề kiểm tra khi chưa gắn đề mẫu có câu hỏi.");
            var src = await _db.ContentAssessments.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == entity.SourceAssessmentId, ct);
            if (src == null || src.Status != "published")
                throw new ValidationException("SourceAssessmentId", "Đề mẫu nguồn chưa được xuất bản.");
            var questionCount = await _db.ContentQuestions.AsNoTracking()
                .CountAsync(q => q.AssessmentId == src.Id, ct);
            if (questionCount == 0)
                throw new ValidationException("SourceAssessmentId", "Đề mẫu nguồn chưa có câu hỏi nào.");
        }

        entity.Status = nextStatus;
        if (req.PublishResults.HasValue)
            entity.PublishResults = req.PublishResults.Value;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        // Integrate with canonical Assignment / Gradebook pipeline (idempotent deterministic ID prevents concurrent duplicate assignments)
        if (nextStatus == "published" && string.IsNullOrWhiteSpace(entity.LinkedAssignmentId))
        {
            var deterministicAssignId = $"assign-{entity.Id}";
            if (deterministicAssignId.Length > 64) deterministicAssignId = deterministicAssignId[..64];
            var existingAssign = await _db.Assignments.FirstOrDefaultAsync(a => a.Id == deterministicAssignId, ct);
            if (existingAssign == null)
            {
                existingAssign = new Assignment
                {
                    Id = deterministicAssignId,
                    ClassroomId = entity.ClassroomId,
                    Title = entity.Title,
                    Description = $"Đề kiểm tra Toán 12 ({entity.DurationMinutes} phút)",
                    Instructions = $"SourceAssessmentId:{entity.SourceAssessmentId}",
                    DueDate = entity.CloseAt ?? DateTimeOffset.UtcNow.AddDays(7),
                    MaxScore = 10.0,
                    Status = "active",
                    CreatedByTeacherId = entity.TeacherId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _db.Assignments.Add(existingAssign);
            }
            entity.LinkedAssignmentId = existingAssign.Id;
        }
        else if (nextStatus == "closed" && !string.IsNullOrWhiteSpace(entity.LinkedAssignmentId))
        {
            var linked = await _db.Assignments.FirstOrDefaultAsync(a => a.Id == entity.LinkedAssignmentId, ct);
            if (linked != null)
            {
                linked.Status = "closed";
                linked.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        await _db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<List<ClassroomMaterialDto>> GetMaterialsAsync(string teacherUserId, bool isAdmin, string? classroomId = null, CancellationToken ct = default)
    {
        var query = _db.ClassroomMaterials.AsNoTracking().AsQueryable();
        if (!isAdmin)
            query = query.Where(m => m.TeacherId == teacherUserId);
        if (!string.IsNullOrWhiteSpace(classroomId))
            query = query.Where(m => m.ClassroomId == classroomId.Trim());

        return await query.OrderByDescending(m => m.CreatedAt).ThenBy(m => m.Id)
            .Select(m => ToDto(m))
            .ToListAsync(ct);
    }

    public async Task<ClassroomMaterialDto> CreateMaterialAsync(CreateClassroomMaterialRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            throw new ValidationException("Title", "Tiêu đề tài liệu không được để trống.");
        if (string.IsNullOrWhiteSpace(req.FileName) || req.FileName.Contains(".."))
            throw new ValidationException("FileName", "Tên tệp không hợp lệ.");
        var isExternalLink = string.Equals(req.Category, "external_link", StringComparison.OrdinalIgnoreCase) &&
                             Uri.TryCreate(req.StoragePathOrUrl?.Trim(), UriKind.Absolute, out var linkUri) &&
                             linkUri.Scheme == Uri.UriSchemeHttps;
        if (!isExternalLink && (req.FileSizeBytes <= 0 || req.FileSizeBytes > 15 * 1024 * 1024))
            throw new ValidationException("FileSizeBytes", "Dung lượng tệp tối đa 15 MB.");
        if (!IsSafeStorageUrl(req.StoragePathOrUrl))
            throw new ValidationException("StoragePathOrUrl", "Đường dẫn tài liệu phải dùng HTTPS hoặc đường dẫn nội bộ hợp lệ.");

        var cls = await VerifyOwnedClassroomAsync(req.ClassroomId, teacherUserId, isAdmin, ct);

        var entity = new ClassroomMaterial
        {
            Id = $"cmat-{Guid.NewGuid():N}",
            ClassroomId = cls.Id,
            TeacherId = cls.TeacherId,
            Title = req.Title.Trim(),
            Category = string.IsNullOrWhiteSpace(req.Category) ? "lecture_note" : req.Category.Trim().ToLowerInvariant(),
            FileName = req.FileName.Trim(),
            MimeType = string.IsNullOrWhiteSpace(req.MimeType) ? "application/pdf" : req.MimeType.Trim().ToLowerInvariant(),
            FileSizeBytes = req.FileSizeBytes,
            StoragePathOrUrl = req.StoragePathOrUrl.Trim(),
            IsRevoked = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.ClassroomMaterials.Add(entity);
        await _db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<ClassroomMaterialDto> UploadMaterialAsync(
        IFormFile file, string classroomId, string title, string category, string teacherUserId, bool isAdmin, CancellationToken ct = default)
    {
        if (file == null || file.Length <= 0)
            throw new ValidationException("File", "Vui lòng chọn tệp để tải lên.");
        if (file.Length > 15 * 1024 * 1024)
            throw new ValidationException("File", "Dung lượng tệp tối đa 15 MB.");
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title", "Tiêu đề tài liệu không được để trống.");

        var safeFileName = Path.GetFileName(file.FileName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(safeFileName) || safeFileName.Contains(".."))
            throw new ValidationException("FileName", "Tên tệp không hợp lệ.");

        var mime = (file.ContentType ?? "application/octet-stream").Trim().ToLowerInvariant();
        if (!AllowedMaterialMimes.Contains(mime))
            throw new ValidationException("MimeType", "Định dạng MIME không được hỗ trợ.");

        var cls = await VerifyOwnedClassroomAsync(classroomId, teacherUserId, isAdmin, ct);

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();
        ValidateMagicBytes(mime, bytes);

        var id = $"cmat-{Guid.NewGuid():N}";
        var root = Path.Combine(AppContext.BaseDirectory, "App_Data", "uploads", "classroom-materials");
        Directory.CreateDirectory(root);
        var ext = Path.GetExtension(safeFileName);
        var safeExt = string.IsNullOrWhiteSpace(ext) ? ".bin" : Regex.Replace(ext.ToLowerInvariant(), @"[^a-z0-9.]", "");
        await File.WriteAllBytesAsync(Path.Combine(root, $"{id}{safeExt}"), bytes, ct);

        var sha = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        var entity = new ClassroomMaterial
        {
            Id = id,
            ClassroomId = cls.Id,
            TeacherId = cls.TeacherId,
            Title = title.Trim(),
            Category = string.IsNullOrWhiteSpace(category) ? "lecture_note" : category.Trim().ToLowerInvariant(),
            FileName = safeFileName,
            MimeType = mime,
            FileSizeBytes = bytes.LongLength,
            FileHashSha256 = sha,
            StoragePathOrUrl = $"/api/v1/teacher/workspace/materials/{id}/download",
            IsRevoked = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.ClassroomMaterials.Add(entity);
        await _db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<(Stream Stream, string MimeType, string FileName)> DownloadMaterialAsync(
        string materialId, string userId, bool isAdmin, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedException();

        var entity = await _db.ClassroomMaterials.AsNoTracking().FirstOrDefaultAsync(m => m.Id == materialId, ct)
            ?? throw new NotFoundException("Không tìm thấy tài liệu lớp học.");

        if (entity.IsRevoked && !isAdmin && entity.TeacherId != userId)
            throw new ForbiddenException("Tài liệu đã bị thu hồi.");

        if (!isAdmin && entity.TeacherId != userId)
        {
            var isEnrolled = await _db.ClassroomStudents.AsNoTracking()
                .AnyAsync(cs => cs.ClassroomId == entity.ClassroomId && cs.StudentId == userId, ct);
            if (!isEnrolled)
                throw new ForbiddenException("Bạn không thuộc lớp học này.");
        }

        var root = Path.Combine(AppContext.BaseDirectory, "App_Data", "uploads", "classroom-materials");
        var ext = Path.GetExtension(entity.FileName);
        var safeExt = string.IsNullOrWhiteSpace(ext) ? ".bin" : Regex.Replace(ext.ToLowerInvariant(), @"[^a-z0-9.]", "");
        var fullPath = Path.Combine(root, $"{entity.Id}{safeExt}");
        if (!File.Exists(fullPath))
            throw new NotFoundException("Tệp vật lý không tồn tại trên máy chủ.");

        return (new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read), entity.MimeType, entity.FileName);
    }

    private static void ValidateMagicBytes(string mime, byte[] bytes)
    {
        if (mime == "application/pdf" && (bytes.Length < 4 || bytes[0] != 0x25 || bytes[1] != 0x50 || bytes[2] != 0x44 || bytes[3] != 0x46))
            throw new ValidationException("File", "Chữ ký tệp PDF không khớp (%PDF).");
        if (mime == "image/png" && (bytes.Length < 4 || bytes[0] != 0x89 || bytes[1] != 0x50 || bytes[2] != 0x4E || bytes[3] != 0x47))
            throw new ValidationException("File", "Chữ ký tệp PNG không hợp lệ.");
        if (mime == "image/jpeg" && (bytes.Length < 3 || bytes[0] != 0xFF || bytes[1] != 0xD8 || bytes[2] != 0xFF))
            throw new ValidationException("File", "Chữ ký tệp JPEG không hợp lệ.");
    }

    public async Task<ClassroomMaterialDto> RevokeMaterialAsync(string materialId, string teacherUserId, bool isAdmin, CancellationToken ct = default)
    {
        var entity = await _db.ClassroomMaterials.FirstOrDefaultAsync(m => m.Id == materialId, ct)
            ?? throw new NotFoundException("Không tìm thấy tài liệu lớp học.");
        if (!isAdmin && entity.TeacherId != teacherUserId)
            throw new ForbiddenException("Bạn không có quyền thu hồi tài liệu của lớp khác.");

        entity.IsRevoked = true;
        await _db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<List<ClassroomAnnouncementDto>> GetAnnouncementsAsync(string teacherUserId, bool isAdmin, string? classroomId = null, CancellationToken ct = default)
    {
        var query = _db.ClassroomAnnouncements.AsNoTracking().AsQueryable();
        if (!isAdmin)
            query = query.Where(a => a.TeacherId == teacherUserId);
        if (!string.IsNullOrWhiteSpace(classroomId))
            query = query.Where(a => a.ClassroomId == classroomId.Trim());

        return await query.OrderByDescending(a => a.IsPinned).ThenByDescending(a => a.CreatedAt)
            .Select(a => ToDto(a))
            .ToListAsync(ct);
    }

    public async Task<ClassroomAnnouncementDto> CreateAnnouncementAsync(CreateClassroomAnnouncementRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            throw new ValidationException("Title", "Tiêu đề thông báo không được để trống.");
        if (string.IsNullOrWhiteSpace(req.Body))
            throw new ValidationException("Body", "Nội dung thông báo không được để trống.");
        if (!string.IsNullOrWhiteSpace(req.AttachmentUrl) && !IsSafeStorageUrl(req.AttachmentUrl))
            throw new ValidationException("AttachmentUrl", "Đường dẫn đính kèm không hợp lệ.");

        var cls = await VerifyOwnedClassroomAsync(req.ClassroomId, teacherUserId, isAdmin, ct);

        var now = DateTimeOffset.UtcNow;
        var entity = new ClassroomAnnouncement
        {
            Id = $"cann-{Guid.NewGuid():N}",
            ClassroomId = cls.Id,
            TeacherId = cls.TeacherId,
            Title = req.Title.Trim(),
            Body = req.Body.Trim(),
            IsPinned = req.IsPinned,
            AttachmentUrl = req.AttachmentUrl?.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ClassroomAnnouncements.Add(entity);
        await _db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<List<TeacherScheduleItemDto>> GetScheduleAsync(string teacherUserId, bool isAdmin, CancellationToken ct = default)
    {
        var ownedClasses = await _db.Classrooms.AsNoTracking()
            .Where(c => isAdmin || c.TeacherId == teacherUserId)
            .Select(c => new { c.Id, c.Name })
            .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        var ownedIds = ownedClasses.Keys.ToHashSet();

        var assignmentRows = await _db.Assignments.AsNoTracking()
            .Where(a => ownedIds.Contains(a.ClassroomId))
            .Select(a => new { a.Id, a.Title, a.ClassroomId, a.DueDate, a.Status })
            .ToListAsync(ct);

        var examRows = await _db.TeacherExams.AsNoTracking()
            .Where(e => ownedIds.Contains(e.ClassroomId))
            .Select(e => new { e.Id, e.Title, e.ClassroomId, e.OpenAt, e.CreatedAt, e.Status })
            .ToListAsync(ct);

        var assignments = assignmentRows.Select(a => new TeacherScheduleItemDto
        {
            Id = a.Id,
            Kind = "assignment_due",
            Title = a.Title,
            ClassroomId = a.ClassroomId,
            ClassroomName = ownedClasses.GetValueOrDefault(a.ClassroomId, string.Empty),
            ScheduledAt = a.DueDate.ToString("o"),
            Status = a.Status
        });

        var exams = examRows.Select(e => new TeacherScheduleItemDto
        {
            Id = e.Id,
            Kind = "exam_window",
            Title = e.Title,
            ClassroomId = e.ClassroomId,
            ClassroomName = ownedClasses.GetValueOrDefault(e.ClassroomId, string.Empty),
            ScheduledAt = (e.OpenAt ?? e.CreatedAt).ToString("o"),
            Status = e.Status
        });

        return assignments.Concat(exams)
            .OrderBy(i => i.ScheduledAt)
            .ToList();
    }

    private static bool IsSafeStorageUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return false;
        var trimmed = url.Trim();
        if (trimmed.Contains("..")) return false;
        if (trimmed.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase)) return true;
        return Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps;
    }

    public async Task<TeacherAiAssistantResponseDto> RunAiAssistantAsync(TeacherAiAssistantRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Prompt))
            throw new ValidationException("Prompt", "Yêu cầu gửi AI Trợ giảng không được để trống.");
        var trimmedPrompt = req.Prompt.Trim();
        if (trimmedPrompt.Length > 4000)
            throw new ValidationException("Prompt", "Yêu cầu gửi AI Trợ giảng không được vượt quá 4000 ký tự.");

        var mode = (req.Mode ?? "lesson_plan").Trim().ToLowerInvariant();
        if (!AllowedAiModes.Contains(mode))
            throw new ValidationException("Mode", "Chế độ AI Trợ giảng không hợp lệ.");

        var cls = await VerifyOwnedClassroomAsync(req.ClassroomId, teacherUserId, isAdmin, ct);
        var grade = string.IsNullOrWhiteSpace(cls.Grade) ? "12" : cls.Grade.Trim();
        var subject = string.IsNullOrWhiteSpace(cls.Subject) ? "Toán" : cls.Subject.Trim();
        var studentCount = await _db.ClassroomStudents.AsNoTracking().CountAsync(cs => cs.ClassroomId == cls.Id, ct);
        var assignmentCount = await _db.Assignments.AsNoTracking().CountAsync(a => a.ClassroomId == cls.Id, ct);

        if (_aiUsageService != null)
        {
            var stats = await _aiUsageService.GetUsageStatsAsync(teacherUserId, DateTimeOffset.UtcNow.Date, null, ct);
            if (stats.TotalRequests >= 50)
                throw new ValidationException("Quota", "Bạn đã vượt quá hạn mức sử dụng AI Trợ giảng trong ngày (50 lượt/ngày).");
        }

        if (!_llmProvider.IsConfigured || _llmProvider is FakeLlmProvider)
        {
            var isFake = _llmProvider is FakeLlmProvider;
            return new TeacherAiAssistantResponseDto
            {
                Content = $"[Bản nháp gợi ý cho lớp {cls.Name} — {subject} lớp {grade} ({studentCount} học sinh, {assignmentCount} bài tập)]\n" +
                          $"Chế độ: {mode}\nYêu cầu: {trimmedPrompt}\n\n" +
                          "Lưu ý: Nhà cung cấp LLM chưa được cấu hình API key thực tế tại hệ thống Admin; đây là khung soạn thảo an toàn để giáo viên hoàn thiện trước khi công bố.",
                RequiresTeacherConfirmation = true,
                ClassroomName = cls.Name,
                StudentCount = studentCount,
                Provider = _llmProvider.ProviderName,
                Status = isFake ? "draft_only" : "unavailable",
                IsAiGenerated = false
            };
        }

        var systemPrompt = $"Bạn là AI Trợ giảng môn {subject} lớp {grade}. Chế độ: {mode}. Lớp học: {cls.Name} ({studentCount} học sinh, {assignmentCount} bài tập). " +
                           "Chỉ hỗ trợ soạn giáo án, sinh bài tập/câu hỏi, ma trận đề và gợi ý nhận xét. Tuyệt đối không bịa điểm số.";
        var sw = Stopwatch.StartNew();
        var llmResp = await _llmProvider.GenerateCompletionAsync(new LlmCompletionRequest(
            Messages: [new LlmChatMessage("user", trimmedPrompt)],
            SystemPrompt: systemPrompt,
            Temperature: 0.4,
            MaxTokens: 1200,
            CancellationToken: ct));
        sw.Stop();

        if (_aiUsageService != null)
        {
            await _aiUsageService.LogUsageAsync(
                teacherUserId,
                $"teacher_assistant:{mode}",
                _llmProvider.ProviderName,
                _llmProvider.DefaultModel ?? "default",
                llmResp.PromptTokens ?? 0,
                llmResp.CompletionTokens ?? 0,
                (int)sw.ElapsedMilliseconds,
                "success",
                null,
                ct);
        }
        if (_auditWriter != null)
        {
            await _auditWriter.WriteStaffAuditAsync("teacher_ai_assistant", "classroom", cls.Id, null, JsonSerializer.Serialize(new { mode, grade, subject, provider = _llmProvider.ProviderName }), ct);
        }

        return new TeacherAiAssistantResponseDto
        {
            Content = llmResp.Content,
            RequiresTeacherConfirmation = true,
            ClassroomName = cls.Name,
            StudentCount = studentCount,
            Provider = _llmProvider.ProviderName,
            Status = "completed",
            IsAiGenerated = true
        };
    }

    private static TeacherExamDto ToDto(TeacherExam e) => new()
    {
        Id = e.Id,
        ClassroomId = e.ClassroomId,
        SourceAssessmentId = e.SourceAssessmentId,
        LinkedAssignmentId = e.LinkedAssignmentId,
        Title = e.Title,
        DurationMinutes = e.DurationMinutes,
        ShuffleQuestions = e.ShuffleQuestions,
        OpenAt = e.OpenAt?.ToString("o"),
        CloseAt = e.CloseAt?.ToString("o"),
        PublishResults = e.PublishResults,
        Status = e.Status,
        CreatedAt = e.CreatedAt.ToString("o")
    };

    private static ClassroomMaterialDto ToDto(ClassroomMaterial m) => new()
    {
        Id = m.Id,
        ClassroomId = m.ClassroomId,
        Title = m.Title,
        Category = m.Category,
        FileName = m.FileName,
        MimeType = m.MimeType,
        FileSizeBytes = m.FileSizeBytes,
        FileHashSha256 = m.FileHashSha256,
        StoragePathOrUrl = m.StoragePathOrUrl,
        IsRevoked = m.IsRevoked,
        CreatedAt = m.CreatedAt.ToString("o")
    };

    private static ClassroomAnnouncementDto ToDto(ClassroomAnnouncement a) => new()
    {
        Id = a.Id,
        ClassroomId = a.ClassroomId,
        Title = a.Title,
        Body = a.Body,
        IsPinned = a.IsPinned,
        AttachmentUrl = a.AttachmentUrl,
        CreatedAt = a.CreatedAt.ToString("o")
    };
}
