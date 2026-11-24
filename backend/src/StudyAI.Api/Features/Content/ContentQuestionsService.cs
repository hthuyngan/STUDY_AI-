using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Content;

public class ContentQuestionsService : IContentQuestionsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public ContentQuestionsService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    private static string ResolveSubjectName(ContentQuestion q)
    {
        var sName = q.Lesson?.Chapter?.Subject?.Name;
        if (!string.IsNullOrWhiteSpace(sName)) return sName;
        if (!string.IsNullOrWhiteSpace(q.Topic))
        {
            var topicLower = q.Topic.Trim().ToLowerInvariant();
            if (topicLower == "mathematics" || topicLower == "toán") return "Toán 12";
            if (topicLower == "physics" || topicLower == "vật lý") return "Vật lý 12";
            if (topicLower == "chemistry" || topicLower == "hóa học") return "Hóa học 12";
            if (topicLower == "biology" || topicLower == "sinh học") return "Sinh học 12";
            if (topicLower == "english" || topicLower == "tiếng anh") return "Tiếng Anh 12";
            if (topicLower == "history" || topicLower == "lịch sử") return "Lịch sử 12";
            if (topicLower == "geography" || topicLower == "địa lý") return "Địa lý 12";
            if (topicLower == "civiceducation" || topicLower == "giáo dục công dân") return "Giáo dục kinh tế và pháp luật 12";
            if (topicLower == "ngữ văn" || topicLower == "literature") return "Ngữ văn 12";
        }
        if (!string.IsNullOrWhiteSpace(q.SubjectId))
        {
            var sLower = q.SubjectId.ToLowerInvariant();
            if (sLower.Contains("math") || sLower.Contains("toan")) return "Toán 12";
            if (sLower.Contains("phys") || sLower.Contains("vatly")) return "Vật lý 12";
            if (sLower.Contains("chem") || sLower.Contains("hoahoc")) return "Hóa học 12";
            if (sLower.Contains("bio") || sLower.Contains("sinhhoc")) return "Sinh học 12";
            if (sLower.Contains("lit") || sLower.Contains("nguvan")) return "Ngữ văn 12";
            if (sLower.Contains("eng") || sLower.Contains("tienganh")) return "Tiếng Anh 12";
            if (sLower.Contains("hist") || sLower.Contains("lichsu")) return "Lịch sử 12";
            if (sLower.Contains("geo") || sLower.Contains("dialy")) return "Địa lý 12";
            if (sLower.Contains("civic") || sLower.Contains("gdcd")) return "Giáo dục kinh tế và pháp luật 12";
            return q.SubjectId;
        }
        return !string.IsNullOrWhiteSpace(q.Topic) ? q.Topic : "Chưa phân loại";
    }

    private static ContentQuestionItemDto FormatQuestion(ContentQuestion q)
    {
        List<string> options;
        try
        {
            options = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>();
        }
        catch
        {
            options = new List<string>();
        }

        return new ContentQuestionItemDto
        {
            Id = q.Id,
            Code = q.Code,
            LessonId = q.LessonId,
            LessonTitle = q.Lesson?.Title ?? "",
            ChapterId = q.ChapterId ?? q.Lesson?.ChapterId,
            ChapterTitle = q.Lesson?.Chapter?.Title ?? "",
            SubjectId = q.SubjectId ?? q.Lesson?.Chapter?.SubjectId,
            SubjectName = ResolveSubjectName(q),
            Grade = q.Grade ?? q.Lesson?.Chapter?.Subject?.Grade ?? "",
            Prompt = q.Prompt,
            Options = options,
            CorrectAnswer = q.CorrectAnswer,
            Explanation = q.Explanation,
            Topic = q.Topic,
            Difficulty = q.Difficulty,
            Type = q.Type,
            Status = q.Status,
            OrderIndex = q.OrderIndex,
            ImageUrl = q.ImageUrl,
            MetadataJson = q.MetadataJson,
            IsDeleted = q.IsDeleted,
            DeletedAt = q.DeletedAt?.ToString("o"),
            DeletedBy = q.DeletedBy,
            AuthorId = q.AuthorId,
            AuthorName = q.Author?.DisplayName ?? "",
            ReviewedBy = q.ReviewedBy,
            RejectionReason = q.RejectionReason,
            SourceType = q.SourceType,
            SourceBatchId = q.SourceBatchId,
            SourceUrl = q.SourceUrl,
            CopyrightStatus = q.CopyrightStatus,
            CopyrightProofRef = q.CopyrightProofRef,
            Version = q.Version,
            CreatedAt = q.CreatedAt.ToString("o"),
            UpdatedAt = q.UpdatedAt.ToString("o")
        };
    }

    private async Task<ContentRevision> CreateQuestionRevisionAsync(ContentQuestion q, string currentUserId, string reason, string? sourceRevisionId = null, CancellationToken ct = default)
    {
        var maxVersion = await _db.ContentRevisions
            .Where(r => r.ContentId == q.Id)
            .Select(r => (int?)r.Version)
            .MaxAsync(ct) ?? 0;
        var nextVersion = maxVersion + 1;

        var snapshot = new
        {
            schemaVersion = 1,
            q.Id,
            q.Code,
            q.LessonId,
            q.SubjectId,
            q.ChapterId,
            q.Grade,
            q.Prompt,
            q.OptionsJson,
            q.CorrectAnswer,
            q.Explanation,
            q.Topic,
            q.Difficulty,
            q.Type,
            q.Status,
            q.OrderIndex,
            q.ImageUrl,
            q.MetadataJson,
            q.AuthorId,
            q.ReviewedBy
        };

        var revision = new ContentRevision
        {
            Id = _idGenerator.NewId("rev_q"),
            ContentId = q.Id,
            ContentType = "question",
            Version = nextVersion,
            Status = q.Status,
            Title = q.Prompt.Length > 80 ? q.Prompt[..80] : q.Prompt,
            SnapshotJson = JsonSerializer.Serialize(snapshot),
            AuthorId = q.AuthorId,
            CreatedBy = currentUserId,
            Reason = reason,
            SourceRevisionId = sourceRevisionId,
            CreatedAt = _clock.UtcNow
        };

        _db.ContentRevisions.Add(revision);
        return revision;
    }

    private static bool IsRevisionVersionConflict(DbUpdateException ex)
    {
        return ex.InnerException != null &&
               ex.InnerException.Message.Contains("IX_content_revisions_ContentId_Version", StringComparison.OrdinalIgnoreCase);
    }

    private async Task SaveChangesWithRevisionRetryAsync(ContentRevision revision, CancellationToken ct = default)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await _db.SaveChangesAsync(ct);
                return;
            }
            catch (DbUpdateException ex) when (attempt < maxAttempts && IsRevisionVersionConflict(ex))
            {
                _db.Entry(revision).State = EntityState.Detached;
                revision.Version = (await _db.ContentRevisions
                    .Where(r => r.ContentId == revision.ContentId)
                    .Select(r => (int?)r.Version)
                    .MaxAsync(ct) ?? 0) + 1;
                _db.ContentRevisions.Add(revision);
            }
        }
    }

    public async Task<object> ListQuestionsAsync(
        string? grade = null,
        string? subjectId = null,
        string? difficulty = null,
        string? type = null,
        string? status = null,
        string? sourceType = null,
        string? search = null,
        bool includeDeleted = false,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .AsQueryable();

        if (!includeDeleted)
            query = query.Where(q => !q.IsDeleted);

        if (!string.IsNullOrWhiteSpace(grade) && grade != "all")
            query = query.Where(q => q.Grade == grade || (q.Lesson != null && q.Lesson.Chapter != null && q.Lesson.Chapter.Subject != null && q.Lesson.Chapter.Subject.Grade == grade));

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
            query = query.Where(q => q.SubjectId == subjectId || (q.Lesson != null && q.Lesson.Chapter != null && q.Lesson.Chapter.SubjectId == subjectId));

        if (!string.IsNullOrWhiteSpace(difficulty) && difficulty != "all")
            query = query.Where(q => q.Difficulty == difficulty);

        if (!string.IsNullOrWhiteSpace(type) && type != "all")
            query = query.Where(q => q.Type == type);

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            query = query.Where(q => q.Status == status);

        if (!string.IsNullOrWhiteSpace(sourceType) && sourceType != "all")
            query = query.Where(q => q.SourceType == sourceType);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(q => q.Prompt.ToLower().Contains(term) ||
                                     q.Id.ToLower().Contains(term) ||
                                     (q.Code != null && q.Code.ToLower().Contains(term)) ||
                                     (q.Topic != null && q.Topic.ToLower().Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var questions = await query
            .OrderBy(q => q.OrderIndex)
            .ThenByDescending(q => q.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(pageSize, 1, 100))
            .Take(Math.Clamp(pageSize, 1, 100))
            .ToListAsync(ct);

        var result = questions.Select(FormatQuestion).ToList();
        return new { items = result, total, page, pageSize };
    }

    public async Task<QuestionStatsDto> GetQuestionStatisticsAsync(CancellationToken ct = default)
    {
        var allQuestions = await _db.ContentQuestions
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .ToListAsync(ct);

        var nonDeleted = allQuestions.Where(q => !q.IsDeleted).ToList();

        return new QuestionStatsDto
        {
            TotalQuestions = nonDeleted.Count,
            DraftCount = nonDeleted.Count(q => q.Status == "draft"),
            InReviewCount = nonDeleted.Count(q => q.Status == "in-review"),
            ApprovedCount = nonDeleted.Count(q => q.Status == "approved"),
            PublishedCount = nonDeleted.Count(q => q.Status == "published"),
            RejectedCount = nonDeleted.Count(q => q.Status == "rejected"),
            DeletedCount = allQuestions.Count(q => q.IsDeleted),
            ByDifficulty = nonDeleted
                .GroupBy(q => string.IsNullOrWhiteSpace(q.Difficulty) ? "medium" : q.Difficulty)
                .ToDictionary(g => g.Key, g => g.Count()),
            ByType = nonDeleted
                .GroupBy(q => string.IsNullOrWhiteSpace(q.Type) ? "multiple-choice" : q.Type)
                .ToDictionary(g => g.Key, g => g.Count()),
            BySubject = nonDeleted
                .GroupBy(ResolveSubjectName)
                .ToDictionary(g => g.Key, g => g.Count()),
            BySource = nonDeleted
                .GroupBy(q => string.IsNullOrWhiteSpace(q.SourceType) ? "manual" : q.SourceType)
                .ToDictionary(g => g.Key, g => g.Count())
        };
    }

    public async Task<ContentQuestionItemDto> GetQuestionDetailAsync(string questionId, CancellationToken ct = default)
    {
        var q = await _db.ContentQuestions
            .Include(x => x.Author)
            .Include(x => x.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(x => x.Id == questionId, ct);

        if (q == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        return FormatQuestion(q);
    }

    public async Task<ContentQuestionItemDto> CreateQuestionAsync(
        CreateQuestionRequestDto req,
        string currentUserId,
        bool isContentStaffOrAdmin,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Prompt))
            throw new ValidationException("Prompt", "Nội dung câu hỏi không được để trống.");

        var qType = string.IsNullOrWhiteSpace(req.Type) ? "multiple-choice" : req.Type.ToLowerInvariant();

        if (qType == "multiple-choice" || qType == "single-choice")
        {
            if (string.IsNullOrWhiteSpace(req.CorrectAnswer))
                throw new ValidationException("CorrectAnswer", "Câu hỏi trắc nghiệm một đáp án yêu cầu phải có đáp án đúng.");
            if (req.Options == null || req.Options.Count < 2)
                throw new ValidationException("Options", "Câu hỏi trắc nghiệm phải có ít nhất 2 phương án lựa chọn.");
            if (!req.Options.Contains(req.CorrectAnswer))
                throw new ValidationException("CorrectAnswer", "Đáp án đúng phải nằm trong danh sách các phương án lựa chọn.");
        }
        else if (qType == "multiple-select")
        {
            if (string.IsNullOrWhiteSpace(req.CorrectAnswer))
                throw new ValidationException("CorrectAnswer", "Câu hỏi trắc nghiệm nhiều đáp án yêu cầu phải có đáp án đúng.");
            if (req.Options == null || req.Options.Count < 2)
                throw new ValidationException("Options", "Câu hỏi trắc nghiệm nhiều đáp án phải có ít nhất 2 phương án lựa chọn.");
        }
        else if (qType == "true-false")
        {
            if (string.IsNullOrWhiteSpace(req.CorrectAnswer) && string.IsNullOrWhiteSpace(req.MetadataJson))
                throw new ValidationException("CorrectAnswer", "Câu hỏi đúng/sai yêu cầu đáp án đúng (Đúng/Sai) hoặc danh sách mệnh đề.");
        }
        else if (qType == "short-answer")
        {
            if (string.IsNullOrWhiteSpace(req.CorrectAnswer))
                throw new ValidationException("CorrectAnswer", "Câu hỏi trả lời ngắn yêu cầu kết quả mẫu/đáp án chuẩn.");
        }

        string? resolvedSubjectId = req.SubjectId;
        string? resolvedChapterId = req.ChapterId;
        string? resolvedGrade = req.Grade;

        if (!string.IsNullOrWhiteSpace(req.LessonId))
        {
            var lesson = await _db.ContentLessons
                .Include(l => l.Chapter)
                    .ThenInclude(c => c!.Subject)
                .FirstOrDefaultAsync(l => l.Id == req.LessonId, ct);

            if (lesson != null)
            {
                resolvedChapterId ??= lesson.ChapterId;
                resolvedSubjectId ??= lesson.Chapter?.SubjectId;
                resolvedGrade ??= lesson.Chapter?.Subject?.Grade;
            }
        }

        var code = !string.IsNullOrWhiteSpace(req.Code)
            ? req.Code.Trim()
            : $"Q-{DateTime.UtcNow:yyMMdd}-{Guid.NewGuid():N}"[..16].ToUpperInvariant();

        var defaultStatus = isContentStaffOrAdmin
            ? (string.IsNullOrWhiteSpace(req.Status) ? "published" : req.Status)
            : "draft";

        var now = _clock.UtcNow;
        var question = new ContentQuestion
        {
            Id = _idGenerator.NewId("qst"),
            Code = code,
            LessonId = req.LessonId,
            ChapterId = resolvedChapterId,
            SubjectId = resolvedSubjectId,
            Grade = resolvedGrade,
            Prompt = req.Prompt.Trim(),
            OptionsJson = JsonSerializer.Serialize(req.Options ?? new List<string>()),
            CorrectAnswer = req.CorrectAnswer?.Trim() ?? string.Empty,
            Explanation = req.Explanation?.Trim(),
            Topic = req.Topic?.Trim(),
            Difficulty = string.IsNullOrWhiteSpace(req.Difficulty) ? "medium" : req.Difficulty,
            Type = qType,
            Status = defaultStatus,
            OrderIndex = req.OrderIndex,
            ImageUrl = req.ImageUrl,
            MetadataJson = req.MetadataJson,
            AuthorId = currentUserId,
            ReviewedBy = isContentStaffOrAdmin && defaultStatus == "published" ? currentUserId : null,
            SourceType = string.IsNullOrWhiteSpace(req.SourceType) ? "manual" : req.SourceType,
            SourceBatchId = req.SourceBatchId,
            SourceUrl = req.SourceUrl,
            CopyrightStatus = string.IsNullOrWhiteSpace(req.CopyrightStatus) ? "proprietary" : req.CopyrightStatus,
            CopyrightProofRef = req.CopyrightProofRef,
            Version = 1,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentQuestions.Add(question);

        await _auditWriter.WriteStaffAuditAsync(
            "question_created",
            "content_question",
            question.Id,
            null,
            JsonSerializer.Serialize(new { code = question.Code, prompt = question.Prompt, type = question.Type }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatQuestion(question);
    }

    public async Task<ContentQuestionItemDto> UpdateQuestionAsync(
        string questionId,
        UpdateQuestionRequestDto req,
        string currentUserId,
        bool isContentStaffOrAdmin,
        CancellationToken ct = default)
    {
        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        if (!isContentStaffOrAdmin && question.AuthorId != currentUserId)
        {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa câu hỏi của tác giả khác.");
        }

        if (!string.IsNullOrWhiteSpace(req.Status) && req.Status.Trim().ToLowerInvariant() == "published")
        {
            throw new ValidationException("Status", "Không thể xuất bản trực tiếp qua API cập nhật câu hỏi. Vui lòng qua quy trình phê duyệt xuất bản.");
        }

        if (!string.IsNullOrWhiteSpace(req.Prompt)) question.Prompt = req.Prompt.Trim();
        if (req.Options != null) question.OptionsJson = JsonSerializer.Serialize(req.Options);
        if (req.CorrectAnswer != null) question.CorrectAnswer = req.CorrectAnswer.Trim();
        if (req.Explanation != null) question.Explanation = req.Explanation.Trim();
        if (req.Topic != null) question.Topic = req.Topic.Trim();
        if (req.Difficulty != null) question.Difficulty = req.Difficulty.Trim();
        if (req.Type != null) question.Type = req.Type.Trim();
        if (req.OrderIndex.HasValue) question.OrderIndex = req.OrderIndex.Value;
        if (req.ImageUrl != null) question.ImageUrl = req.ImageUrl;
        if (req.MetadataJson != null) question.MetadataJson = req.MetadataJson;
        if (req.Grade != null) question.Grade = req.Grade.Trim();
        if (req.SubjectId != null) question.SubjectId = req.SubjectId.Trim();
        if (req.ChapterId != null) question.ChapterId = req.ChapterId.Trim();
        if (req.LessonId != null) question.LessonId = req.LessonId.Trim();

        question.Version++;
        question.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "question_updated",
            "content_question",
            question.Id,
            null,
            JsonSerializer.Serialize(new { code = question.Code, prompt = question.Prompt }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatQuestion(question);
    }

    public async Task<bool> DeleteQuestionAsync(string questionId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default)
    {
        var question = await _db.ContentQuestions.FindAsync(new object[] { questionId }, ct);
        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        if (!isContentStaffOrAdmin && question.AuthorId != currentUserId)
        {
            throw new ForbiddenException("Bạn không có quyền xóa câu hỏi của tác giả khác.");
        }

        question.IsDeleted = true;
        question.DeletedAt = _clock.UtcNow;
        question.DeletedBy = currentUserId;
        question.Status = "archived";
        question.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "question_soft_deleted",
            "content_question",
            questionId,
            null,
            JsonSerializer.Serialize(new
            {
                prompt = question.Prompt.Substring(0, Math.Min(60, question.Prompt.Length)),
                code = question.Code
            }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ContentQuestionItemDto> RestoreQuestionAsync(string questionId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default)
    {
        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        if (!isContentStaffOrAdmin && question.AuthorId != currentUserId)
        {
            throw new ForbiddenException("Bạn không có quyền khôi phục câu hỏi của tác giả khác.");
        }

        if (!question.IsDeleted)
            throw new ValidationException("IsDeleted", "Câu hỏi này đang hoạt động, không ở trạng thái đã xóa.");

        question.IsDeleted = false;
        question.DeletedAt = null;
        question.DeletedBy = null;
        question.Status = "draft";
        question.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "question_restored",
            "content_question",
            questionId,
            null,
            JsonSerializer.Serialize(new { code = question.Code }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatQuestion(question);
    }

    public async Task<ContentQuestionItemDto> SubmitQuestionReviewAsync(string questionId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default)
    {
        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        if (!isContentStaffOrAdmin && question.AuthorId != currentUserId)
        {
            throw new ForbiddenException("Bạn không có quyền gửi duyệt câu hỏi của tác giả khác.");
        }

        question.Status = "in-review";
        question.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "question_submitted_review",
            "content_question",
            questionId,
            null,
            JsonSerializer.Serialize(new { code = question.Code }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatQuestion(question);
    }

    public async Task<ContentQuestionItemDto> ApproveQuestionAsync(string questionId, string currentUserId, bool canApprove, CancellationToken ct = default)
    {
        if (!canApprove)
        {
            throw new ForbiddenException("QUYỀN PHÊ DUYỆT: Role 'content' là người có thẩm quyền phê duyệt nội dung giáo dục cuối cùng. Admin hoặc vai trò khác không được phép phê duyệt câu hỏi.");
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        if (!string.IsNullOrEmpty(question.AuthorId) && question.AuthorId == currentUserId)
        {
            throw new ForbiddenException("Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không được tự phê duyệt câu hỏi của chính mình.");
        }

        question.Status = "approved";
        question.ReviewedBy = currentUserId;
        question.RejectionReason = null;
        question.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "question_approved",
            "content_question",
            questionId,
            null,
            JsonSerializer.Serialize(new { code = question.Code }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatQuestion(question);
    }

    public async Task<ContentQuestionItemDto> RejectQuestionAsync(string questionId, RejectQuestionRequestDto? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
        {
            throw new ForbiddenException("QUYỀN PHÊ DUYỆT: Role 'content' hoặc 'admin' là người có thẩm quyền từ chối nội dung giáo dục cuối cùng.");
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        if (!string.IsNullOrEmpty(question.AuthorId) && question.AuthorId == currentUserId)
        {
            throw new ForbiddenException("Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không thể tự từ chối câu hỏi của chính mình.");
        }

        var reason = !string.IsNullOrWhiteSpace(body?.Reason)
            ? body.Reason.Trim()
            : "Nội dung câu hỏi chưa đạt tiêu chuẩn kiểm duyệt chất lượng.";

        question.Status = "rejected";
        question.ReviewedBy = currentUserId;
        question.RejectionReason = reason;
        question.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "question_rejected",
            "content_question",
            questionId,
            null,
            JsonSerializer.Serialize(new { code = question.Code, reason }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatQuestion(question);
    }

    public async Task<ContentQuestionItemDto> RequestChangesQuestionAsync(string questionId, JsonObject? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
        {
            throw new ForbiddenException("Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền yêu cầu chỉnh sửa câu hỏi.");
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        if (!string.IsNullOrEmpty(question.AuthorId) && question.AuthorId == currentUserId)
        {
            throw new ForbiddenException("Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không thể tự yêu cầu chỉnh sửa câu hỏi của chính mình.");
        }

        var feedback = body?["feedback"]?.ToString() ?? body?["reason"]?.ToString();
        var reason = !string.IsNullOrWhiteSpace(feedback)
            ? feedback.Trim()
            : "Nội dung câu hỏi cần chỉnh sửa trước khi phê duyệt.";

        question.Status = "draft";
        question.ReviewedBy = currentUserId;
        question.RejectionReason = reason;
        question.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "question_changes_requested",
            "content_question",
            questionId,
            null,
            JsonSerializer.Serialize(new { code = question.Code, feedback = reason, authorId = question.AuthorId, reviewerId = currentUserId }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatQuestion(question);
    }

    public async Task<ContentQuestionItemDto> PublishQuestionAsync(string questionId, string currentUserId, bool canPublish, CancellationToken ct = default)
    {
        if (!canPublish)
        {
            throw new ForbiddenException("QUYỀN XUẤT BẢN: Role 'content' là người có thẩm quyền xuất bản nội dung giáo dục cuối cùng.");
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        if (!string.IsNullOrEmpty(question.AuthorId) && question.AuthorId == currentUserId)
        {
            throw new ForbiddenException("Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không được tự xuất bản câu hỏi của chính mình.");
        }

        question.Status = "published";
        question.ReviewedBy = currentUserId;
        question.RejectionReason = null;
        question.UpdatedAt = _clock.UtcNow;

        var pubRev = await CreateQuestionRevisionAsync(question, currentUserId, "Xuất bản câu hỏi", null, ct);

        await _auditWriter.WriteStaffAuditAsync(
            "question_published",
            "content_question",
            questionId,
            null,
            JsonSerializer.Serialize(new { code = question.Code, revisionId = pubRev.Id }),
            ct);

        await SaveChangesWithRevisionRetryAsync(pubRev, ct);
        return FormatQuestion(question);
    }

    public async Task<ContentQuestionItemDto> UnpublishQuestionAsync(string questionId, string currentUserId, bool canPublish, CancellationToken ct = default)
    {
        if (!canPublish)
        {
            throw new ForbiddenException("QUYỀN XUẤT BẢN: Role 'content' là người có thẩm quyền gỡ xuất bản nội dung giáo dục cuối cùng.");
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        question.Status = "draft";
        question.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "question_unpublished",
            "content_question",
            questionId,
            null,
            JsonSerializer.Serialize(new { code = question.Code }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatQuestion(question);
    }

    public async Task<ContentQuestionItemDto> RollbackQuestionAsync(
        string questionId,
        RollbackContentRequestDto? req,
        string currentUserId,
        bool isAuthorizedReviewer,
        CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
        {
            throw new ForbiddenException("Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền khôi phục/rollback câu hỏi.");
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
            throw new NotFoundException("Câu hỏi không tồn tại.");

        if (question.Status == "draft")
            throw new ConflictException("Câu hỏi đang ở trạng thái bản nháp ('draft'), không thể rollback.");

        ContentRevision? targetRev = null;
        if (!string.IsNullOrWhiteSpace(req?.RevisionId))
        {
            targetRev = await _db.ContentRevisions.FirstOrDefaultAsync(r => r.Id == req.RevisionId && r.ContentId == questionId && r.ContentType == "question", ct);
            if (targetRev == null)
                throw new NotFoundException($"Không tìm thấy phiên bản revision '{req.RevisionId}' cho câu hỏi này.");
        }
        else if (req?.TargetVersion.HasValue == true)
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == questionId && r.ContentType == "question" && r.Version == req.TargetVersion.Value)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync(ct);
            if (targetRev == null)
                throw new NotFoundException($"Không tìm thấy phiên bản v{req.TargetVersion.Value} cho câu hỏi này.");
        }
        else
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == questionId && r.ContentType == "question")
                .OrderByDescending(r => r.CreatedAt)
                .Skip(1)
                .FirstOrDefaultAsync(ct);
        }

        if (targetRev == null)
            throw new ConflictException("Không có phiên bản trước đó để khôi phục câu hỏi.");
        if (string.IsNullOrWhiteSpace(targetRev.SnapshotJson))
            throw new ConflictException("Phiên bản được chọn không có snapshot hợp lệ.");

        var previousStatus = question.Status;

        try
        {
            using var doc = JsonDocument.Parse(targetRev.SnapshotJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("schemaVersion", out var schemaVersion) &&
                (schemaVersion.ValueKind != JsonValueKind.Number || !schemaVersion.TryGetInt32(out var version) || version != 1))
                throw new ConflictException("Schema snapshot của phiên bản không được hỗ trợ.");

            if (root.TryGetProperty("Code", out var codeProp)) question.Code = codeProp.ValueKind == JsonValueKind.Null ? null : codeProp.GetString();
            if (root.TryGetProperty("LessonId", out var lessonProp)) question.LessonId = lessonProp.ValueKind == JsonValueKind.Null ? null : lessonProp.GetString();
            if (root.TryGetProperty("SubjectId", out var subjectProp)) question.SubjectId = subjectProp.ValueKind == JsonValueKind.Null ? null : subjectProp.GetString();
            if (root.TryGetProperty("ChapterId", out var chapterProp)) question.ChapterId = chapterProp.ValueKind == JsonValueKind.Null ? null : chapterProp.GetString();
            if (root.TryGetProperty("Grade", out var gradeProp)) question.Grade = gradeProp.ValueKind == JsonValueKind.Null ? null : gradeProp.GetString();
            if (root.TryGetProperty("Prompt", out var promptProp) && !string.IsNullOrWhiteSpace(promptProp.GetString())) question.Prompt = promptProp.GetString()!;
            if (root.TryGetProperty("OptionsJson", out var optProp)) question.OptionsJson = optProp.GetString() ?? "[]";
            if (root.TryGetProperty("CorrectAnswer", out var ansProp)) question.CorrectAnswer = ansProp.GetString() ?? string.Empty;
            if (root.TryGetProperty("Explanation", out var expProp)) question.Explanation = expProp.ValueKind == JsonValueKind.Null ? null : expProp.GetString();
            if (root.TryGetProperty("Topic", out var topicProp)) question.Topic = topicProp.ValueKind == JsonValueKind.Null ? null : topicProp.GetString();
            if (root.TryGetProperty("Difficulty", out var diffProp)) question.Difficulty = diffProp.GetString() ?? "medium";
            if (root.TryGetProperty("Type", out var typeProp)) question.Type = typeProp.GetString() ?? "multiple-choice";
            if (root.TryGetProperty("OrderIndex", out var orderProp)) question.OrderIndex = orderProp.GetInt32();
            if (root.TryGetProperty("ImageUrl", out var imageProp)) question.ImageUrl = imageProp.ValueKind == JsonValueKind.Null ? null : imageProp.GetString();
            if (root.TryGetProperty("MetadataJson", out var metadataProp)) question.MetadataJson = metadataProp.ValueKind == JsonValueKind.Null ? null : metadataProp.GetString();
            if (root.TryGetProperty("AuthorId", out var authorProp)) question.AuthorId = authorProp.ValueKind == JsonValueKind.Null ? null : authorProp.GetString();
            if (root.TryGetProperty("ReviewedBy", out var reviewerProp)) question.ReviewedBy = reviewerProp.ValueKind == JsonValueKind.Null ? null : reviewerProp.GetString();
        }
        catch (JsonException)
        {
            throw new ConflictException("Snapshot của phiên bản bị hỏng và không thể khôi phục an toàn.");
        }

        question.Status = "draft";
        question.UpdatedAt = _clock.UtcNow;

        var rollbackRev = await CreateQuestionRevisionAsync(question, currentUserId, req?.Reason ?? $"Rollback từ trạng thái {previousStatus} về bản nháp", targetRev?.Id, ct);

        await _auditWriter.WriteStaffAuditAsync(
            "question_rollback",
            "content_question",
            questionId,
            null,
            JsonSerializer.Serialize(new
            {
                code = question.Code,
                previousStatus,
                newStatus = question.Status,
                targetRevisionId = targetRev?.Id,
                targetVersion = targetRev?.Version,
                rollbackRevisionId = rollbackRev.Id,
                actorId = currentUserId
            }),
            ct);

        await SaveChangesWithRevisionRetryAsync(rollbackRev, ct);
        return FormatQuestion(question);
    }

    public async Task<QuestionImportResultDto> ImportQuestionsAsync(QuestionImportBatchRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var batchId = $"batch_{Guid.NewGuid():N}"[..18];
        var sourceType = (req.SourceType ?? "manual").Trim().ToLowerInvariant();

        var isExternalVnhsge = sourceType == "vnhsge" || sourceType == "external_licensed";
        var copyrightStatus = isExternalVnhsge ? "pending_verification" : "proprietary";
        var copyrightProofRef = isExternalVnhsge
            ? "CC-BY-NC-SA-4.0 (arXiv:2305.12199 - Server Controlled License)"
            : (!string.IsNullOrWhiteSpace(req.LicenseProofRef) ? req.LicenseProofRef.Trim() : "Internal Proprietary");
        var initialStatus = isExternalVnhsge ? "draft" : (sourceType == "manual" ? "approved" : "draft");

        var result = new QuestionImportResultDto
        {
            BatchId = batchId,
            SourceType = sourceType,
            DryRun = req.DryRun,
            TotalItems = req.Items?.Count ?? 0
        };

        if (req.Items == null || req.Items.Count == 0)
        {
            return result;
        }

        var batchPrompts = req.Items
            .Where(i => !string.IsNullOrWhiteSpace(i.Prompt))
            .Select(i => i.Prompt.Trim().ToLower())
            .Distinct()
            .ToList();

        var batchCodes = req.Items
            .Where(i => !string.IsNullOrWhiteSpace(i.Code))
            .Select(i => i.Code!.Trim().ToLower())
            .Distinct()
            .ToList();

        var existingPrompts = await _db.ContentQuestions
            .Where(q => !q.IsDeleted && (batchPrompts.Contains(q.Prompt.ToLower()) || (q.Code != null && batchCodes.Contains(q.Code.ToLower()))))
            .Select(q => q.Prompt.Trim().ToLower())
            .ToListAsync(ct);

        var existingCodes = await _db.ContentQuestions
            .Where(q => !q.IsDeleted && q.Code != null && batchCodes.Contains(q.Code.ToLower()))
            .Select(q => q.Code!.Trim().ToLower())
            .ToListAsync(ct);

        var existingPromptSet = new HashSet<string>(existingPrompts, StringComparer.OrdinalIgnoreCase);
        var existingCodeSet = new HashSet<string>(existingCodes, StringComparer.OrdinalIgnoreCase);
        var seenInBatch = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenCodesInBatch = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var validQuestions = new List<ContentQuestion>();

        for (int i = 0; i < req.Items.Count; i++)
        {
            var item = req.Items[i];
            if (string.IsNullOrWhiteSpace(item.Prompt))
            {
                result.ErrorItems++;
                result.Errors.Add($"Bản ghi #{i + 1}: Thiếu nội dung câu hỏi (Prompt).");
                continue;
            }

            var promptKey = item.Prompt.Trim().ToLower();
            var codeKey = !string.IsNullOrWhiteSpace(item.Code) ? item.Code.Trim().ToLower() : null;

            if (existingPromptSet.Contains(promptKey) || seenInBatch.Contains(promptKey) ||
                (codeKey != null && (existingCodeSet.Contains(codeKey) || seenCodesInBatch.Contains(codeKey))))
            {
                result.DuplicateItems++;
                result.Errors.Add($"Bản ghi #{i + 1} ('{item.Prompt[..Math.Min(40, item.Prompt.Length)]}...'): Đã tồn tại trong hệ thống (Duplicate).");
                continue;
            }

            seenInBatch.Add(promptKey);
            if (codeKey != null) seenCodesInBatch.Add(codeKey);

            var qType = string.IsNullOrWhiteSpace(item.Type) ? "multiple-choice" : item.Type.ToLowerInvariant();
            if (qType == "multiple-choice" && (item.Options == null || item.Options.Count < 2))
            {
                result.ErrorItems++;
                result.Errors.Add($"Bản ghi #{i + 1}: Câu hỏi trắc nghiệm phải có ít nhất 2 phương án.");
                continue;
            }

            var code = !string.IsNullOrWhiteSpace(item.Code)
                ? item.Code.Trim()
                : $"Q-IMP-{DateTime.UtcNow:yyMMdd}-{Guid.NewGuid():N}"[..18].ToUpperInvariant();

            var resolvedSubjectId = item.SubjectId;
            if (string.IsNullOrWhiteSpace(resolvedSubjectId))
            {
                var combined = $"{item.Topic} {item.Code} {item.Grade}".ToLowerInvariant();
                string g = !string.IsNullOrWhiteSpace(item.Grade) ? item.Grade : (combined.Contains("10") ? "10" : combined.Contains("11") ? "11" : "12");
                if (combined.Contains("math") || combined.Contains("toan")) resolvedSubjectId = $"sub_math{g}";
                else if (combined.Contains("phys") || combined.Contains("vatly")) resolvedSubjectId = $"sub_phys{g}";
                else if (combined.Contains("chem") || combined.Contains("hoahoc")) resolvedSubjectId = $"sub_chem{g}";
                else if (combined.Contains("bio") || combined.Contains("sinhhoc")) resolvedSubjectId = $"sub_bio{g}";
                else if (combined.Contains("lit") || combined.Contains("nguvan") || combined.Contains("văn")) resolvedSubjectId = $"sub_lit{g}";
                else if (combined.Contains("eng") || combined.Contains("tienganh")) resolvedSubjectId = $"sub_eng{g}";
                else if (combined.Contains("hist") || combined.Contains("lichsu")) resolvedSubjectId = $"sub_hist{g}";
                else if (combined.Contains("geo") || combined.Contains("dialy")) resolvedSubjectId = $"sub_geo{g}";
                else if (combined.Contains("civic") || combined.Contains("gdcd")) resolvedSubjectId = $"sub_civic{g}";
            }

            var now = _clock.UtcNow;
            var question = new ContentQuestion
            {
                Id = _idGenerator.NewId("qst"),
                Code = code,
                Prompt = item.Prompt.Trim(),
                OptionsJson = JsonSerializer.Serialize(item.Options ?? new List<string>()),
                CorrectAnswer = item.CorrectAnswer?.Trim() ?? string.Empty,
                Explanation = item.Explanation?.Trim(),
                Topic = item.Topic?.Trim(),
                Difficulty = string.IsNullOrWhiteSpace(item.Difficulty) ? "medium" : item.Difficulty,
                Type = qType,
                Grade = item.Grade,
                SubjectId = resolvedSubjectId,
                ChapterId = item.ChapterId,
                LessonId = item.LessonId,
                ImageUrl = item.ImageUrl,
                MetadataJson = item.MetadataJson,
                Status = initialStatus,
                SourceType = sourceType,
                SourceBatchId = batchId,
                SourceUrl = req.SourceUrl,
                CopyrightStatus = copyrightStatus,
                CopyrightProofRef = copyrightProofRef,
                AuthorId = currentUserId,
                Version = 1,
                CreatedAt = now,
                UpdatedAt = now
            };

            validQuestions.Add(question);
            result.ValidItems++;
            if (result.PreviewItems.Count < 20)
            {
                result.PreviewItems.Add(FormatQuestion(question));
            }
        }

        if (!req.DryRun && validQuestions.Count > 0)
        {
            await _db.ContentQuestions.AddRangeAsync(validQuestions, ct);

            await _auditWriter.WriteStaffAuditAsync(
                "questions_batch_imported",
                "content_question_batch",
                batchId,
                null,
                JsonSerializer.Serialize(new
                {
                    batchId,
                    sourceType,
                    importedCount = validQuestions.Count,
                    licenseRef = copyrightProofRef
                }),
                ct);

            await _db.SaveChangesAsync(ct);
            result.ImportedIds = validQuestions.Select(q => q.Id).ToList();
        }

        return result;
    }
}