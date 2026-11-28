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

    private static readonly HashSet<string> AllowedExamStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "draft", "published", "closed"
    };

    public TeacherWorkspaceService(StudyAIDbContext db, ILlmProvider llmProvider)
    {
        _db = db;
        _llmProvider = llmProvider;
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

        if (!string.IsNullOrWhiteSpace(req.SourceAssessmentId))
        {
            var src = await _db.ContentAssessments.AsNoTracking().FirstOrDefaultAsync(a => a.Id == req.SourceAssessmentId.Trim(), ct)
                ?? throw new NotFoundException("Không tìm thấy đề mẫu Content.");
            if (src.Status != "published")
                throw new ValidationException("SourceAssessmentId", "Chỉ được sao chép đề mẫu đã xuất bản.");
        }

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
        if (req.FileSizeBytes <= 0 || req.FileSizeBytes > 15 * 1024 * 1024)
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

        var cls = await VerifyOwnedClassroomAsync(req.ClassroomId, teacherUserId, isAdmin, ct);
        var studentCount = await _db.ClassroomStudents.AsNoTracking().CountAsync(cs => cs.ClassroomId == cls.Id, ct);
        var assignmentCount = await _db.Assignments.AsNoTracking().CountAsync(a => a.ClassroomId == cls.Id, ct);

        if (!_llmProvider.IsConfigured)
        {
            return new TeacherAiAssistantResponseDto
            {
                Content = $"[Bản nháp gợi ý cho lớp {cls.Name} ({studentCount} học sinh, {assignmentCount} bài tập)]\n" +
                          $"Chế độ: {req.Mode}\nYêu cầu: {req.Prompt.Trim()}\n\n" +
                          "Lưu ý: Nhà cung cấp LLM chưa được cấu hình API key tại hệ thống Admin; đây là khung soạn thảo an toàn để giáo viên hoàn thiện trước khi công bố.",
                RequiresTeacherConfirmation = true,
                ClassroomName = cls.Name,
                StudentCount = studentCount,
                Provider = _llmProvider.ProviderName
            };
        }

        var systemPrompt = $"Bạn là AI Trợ giảng Toán lớp 12. Lớp học: {cls.Name} ({studentCount} học sinh, {assignmentCount} bài tập). " +
                           "Chỉ hỗ trợ soạn giáo án, sinh bài tập/câu hỏi, ma trận đề Toán 12 và gợi ý nhận xét. Tuyệt đối không bịa điểm số.";
        var llmResp = await _llmProvider.GenerateCompletionAsync(new LlmCompletionRequest(
            Messages: [new LlmChatMessage("user", req.Prompt.Trim())],
            SystemPrompt: systemPrompt,
            Temperature: 0.4,
            MaxTokens: 1200,
            CancellationToken: ct));

        return new TeacherAiAssistantResponseDto
        {
            Content = llmResp.Content,
            RequiresTeacherConfirmation = true,
            ClassroomName = cls.Name,
            StudentCount = studentCount,
            Provider = _llmProvider.ProviderName
        };
    }

    private static TeacherExamDto ToDto(TeacherExam e) => new()
    {
        Id = e.Id,
        ClassroomId = e.ClassroomId,
        SourceAssessmentId = e.SourceAssessmentId,
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
