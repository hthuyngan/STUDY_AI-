using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Content;

public class ContentLessonsService : IContentLessonsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public ContentLessonsService(
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

    private static ContentLessonDetailDto FormatLesson(ContentLesson lesson, User? author)
    {
        static JsonArray SafeJsonArray(string? val)
        {
            if (string.IsNullOrEmpty(val)) return new JsonArray();
            try { return JsonNode.Parse(val) as JsonArray ?? new JsonArray(); } catch { return new JsonArray(); }
        }

        var videoDtos = lesson.Videos?
            .OrderBy(v => v.SortOrder)
            .Select(v => new ContentLessonVideoItemDto
            {
                Id = v.Id,
                LessonId = v.LessonId,
                LessonTitle = lesson.Title,
                Title = v.Title,
                Description = v.Description ?? "",
                Provider = v.Provider,
                SourceUrl = v.SourceUrl,
                EmbedUrl = v.EmbedUrl,
                YouTubeVideoId = v.YouTubeVideoId,
                ChannelName = v.ChannelName,
                IsPrimary = v.IsPrimary,
                AttributionText = v.AttributionText,
                Language = v.Language,
                DurationSeconds = v.DurationSeconds,
                ThumbnailUrl = v.ThumbnailUrl,
                SortOrder = v.SortOrder,
                EmbedAllowed = v.EmbedAllowed,
                VerificationStatus = v.VerificationStatus,
                VerifiedAt = v.VerifiedAt?.ToString("o"),
                LastVerifiedAt = (v.LastVerifiedAt ?? v.VerifiedAt)?.ToString("o"),
                IsPublished = v.IsPublished,
                CreatedAt = v.CreatedAt.ToString("o"),
                UpdatedAt = v.UpdatedAt.ToString("o")
            }).ToList() ?? new List<ContentLessonVideoItemDto>();

        return new ContentLessonDetailDto
        {
            Id = lesson.Id,
            ChapterId = lesson.ChapterId,
            ChapterTitle = lesson.Chapter?.Title ?? "",
            Code = lesson.Code,
            CurriculumEditionId = lesson.Chapter?.CurriculumEditionId,
            CurriculumEditionName = lesson.Chapter?.CurriculumEdition?.EditionName,
            TopicId = lesson.TopicId,
            TopicTitle = lesson.Topic?.Title ?? "",
            SubjectId = lesson.Chapter?.SubjectId ?? lesson.Chapter?.CurriculumEdition?.Curriculum?.SubjectId ?? "",
            SubjectName = lesson.Chapter?.Subject?.Name ?? lesson.Chapter?.CurriculumEdition?.Curriculum?.Subject?.Name ?? "",
            Title = lesson.Title,
            Slug = lesson.Slug,
            OrderIndex = lesson.OrderIndex,
            Status = lesson.Status,
            AuthorId = lesson.AuthorId,
            AuthorName = author?.DisplayName ?? "",
            ReviewedBy = lesson.ReviewedBy,
            SourceName = lesson.SourceName,
            SourceUrl = lesson.SourceUrl,
            SourceLicense = lesson.SourceLicense,
            Introduction = lesson.Introduction ?? "",
            LearningObjectives = SafeJsonArray(lesson.LearningObjectivesJson),
            Definitions = SafeJsonArray(lesson.DefinitionsJson),
            Formulas = SafeJsonArray(lesson.FormulasJson),
            Examples = SafeJsonArray(lesson.ExamplesJson),
            ImportantNotes = SafeJsonArray(lesson.ImportantNotesJson),
            SummaryPoints = SafeJsonArray(lesson.SummaryPointsJson),
            Videos = videoDtos,
            QuestionsCount = lesson.Questions?.Count ?? 0,
            CreatedAt = lesson.CreatedAt.ToString("o"),
            UpdatedAt = lesson.UpdatedAt.ToString("o")
            ,RowVersion = lesson.RowVersion.Length == 0 ? "" : Convert.ToBase64String(lesson.RowVersion)
        };
    }

    private async Task<ContentRevision> CreateLessonRevisionAsync(ContentLesson les, string currentUserId, string reason, string? sourceRevisionId = null, CancellationToken ct = default)
    {
        var maxVersion = await _db.ContentRevisions
            .Where(r => r.ContentId == les.Id)
            .Select(r => (int?)r.Version)
            .MaxAsync(ct) ?? 0;
        var nextVersion = maxVersion + 1;

        var snapshot = new
        {
            schemaVersion = 1,
            les.Id,
            les.ChapterId,
            les.TopicId,
            les.Title,
            les.Slug,
            les.Status,
            les.AuthorId,
            les.ReviewedBy,
            les.Introduction,
            les.DefinitionsJson,
            les.FormulasJson,
            les.ExamplesJson,
            les.ImportantNotesJson,
            les.SummaryPointsJson,
            les.OrderIndex
        };

        var revision = new ContentRevision
        {
            Id = _idGenerator.NewId("rev_l"),
            ContentId = les.Id,
            ContentType = "lesson",
            Version = nextVersion,
            Status = les.Status,
            Title = les.Title,
            SnapshotJson = JsonSerializer.Serialize(snapshot),
            AuthorId = les.AuthorId,
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

    public async Task<ContentLessonListResponseDto> ListLessonsAsync(
        string? subjectId = null,
        string? curriculumEditionId = null,
        string? chapterId = null,
        string? topicId = null,
        string? status = null,
        string? search = null,
        bool includeDeleted = false,
        int page = 1,
        int pageSize = 20,
        string sort = "orderIndex",
        string direction = "asc",
        CancellationToken ct = default)
    {
        var query = _db.ContentLessons
            .Include(l => l.Author)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.CurriculumEdition)
                    .ThenInclude(e => e!.Curriculum)
                        .ThenInclude(c => c!.Subject)
            .Include(l => l.Topic)
            .Include(l => l.Videos)
            .Include(l => l.Questions)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            query = query.Where(l => l.Chapter != null && (l.Chapter.SubjectId == subjectId || l.Chapter.CurriculumEdition!.Curriculum!.SubjectId == subjectId));
        }

        if (!string.IsNullOrWhiteSpace(curriculumEditionId) && curriculumEditionId != "all")
            query = query.Where(l => l.Chapter != null && l.Chapter.CurriculumEditionId == curriculumEditionId);

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(l => l.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(chapterId) && chapterId != "all")
        {
            query = query.Where(l => l.ChapterId == chapterId);
        }

        if (!string.IsNullOrWhiteSpace(topicId) && topicId != "all")
        {
            query = query.Where(l => l.TopicId == topicId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(l => l.Title.ToLower().Contains(term) || l.Slug.ToLower().Contains(term));
        }

        var total = await query.CountAsync(ct);
        var descending = direction.Equals("desc", StringComparison.OrdinalIgnoreCase);
        IOrderedQueryable<ContentLesson> ordered = sort.ToLowerInvariant() switch
        {
            "title" => descending ? query.OrderByDescending(l => l.Title) : query.OrderBy(l => l.Title),
            "status" => descending ? query.OrderByDescending(l => l.Status) : query.OrderBy(l => l.Status),
            "updatedat" => descending ? query.OrderByDescending(l => l.UpdatedAt) : query.OrderBy(l => l.UpdatedAt),
            _ => descending ? query.OrderByDescending(l => l.OrderIndex) : query.OrderBy(l => l.OrderIndex)
        };
        var lessons = await ordered
            .ThenByDescending(l => l.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(pageSize, 1, 100))
            .Take(Math.Clamp(pageSize, 1, 100))
            .ToListAsync(ct);

        return new() { Items = lessons.Select(l => FormatLesson(l, l.Author)).ToList(), Page = page, PageSize = pageSize, Total = total };
    }

    public async Task<ContentLessonDetailDto> GetLessonDetailAsync(string lessonId, CancellationToken ct = default)
    {
        var les = await _db.ContentLessons
            .Include(l => l.Author)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.CurriculumEdition)
            .Include(l => l.Topic)
            .Include(l => l.Videos)
            .Include(l => l.Questions)
            .FirstOrDefaultAsync(l => l.Id == lessonId, ct);

        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");

        return FormatLesson(les, les.Author);
    }

    public async Task<ContentLessonDetailDto> CreateLessonAsync(CreateLessonRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var chapter = await _db.ContentChapters.FindAsync(new object[] { req.ChapterId }, ct);
        if (chapter == null)
            throw new ValidationException("ChapterId", "Chương học không tồn tại.");
        if (chapter.Status == "archived")
            throw new ValidationException("ChapterId", "Không thể tạo bài học trong chương đã lưu trữ.");

        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Slug))
            throw new ValidationException("Title/Slug", "Tiêu đề và Slug của bài học không được để trống.");

        var normalizedSlug = req.Slug.Trim().ToLowerInvariant();
        if (await _db.ContentLessons.AnyAsync(l => l.ChapterId == chapter.Id && l.Slug == normalizedSlug && l.Status != "archived", ct))
            throw new ConflictException("Slug bài học đã tồn tại trong chương.");

        var code = string.IsNullOrWhiteSpace(req.Code)
            ? (chapter.CurriculumEditionId == null ? null : req.Slug.Trim().ToUpperInvariant())
            : req.Code.Trim().ToUpperInvariant();
        if (chapter.CurriculumEditionId != null && await _db.ContentLessons.AnyAsync(l => l.ChapterId == chapter.Id && l.Code == code && l.Status != "archived", ct))
            throw new ConflictException("Mã bài học đã tồn tại trong chương.");

        var lessonId = _idGenerator.NewId("les");
        var now = _clock.UtcNow;
        var les = new ContentLesson
        {
            Id = lessonId,
            ChapterId = req.ChapterId,
            Code = code,
            TopicId = string.IsNullOrWhiteSpace(req.TopicId) ? null : req.TopicId,
            Title = req.Title.Trim(),
            Slug = req.Slug.Trim().ToLowerInvariant(),
            OrderIndex = req.OrderIndex,
            Status = "draft",
            AuthorId = currentUserId,
            SourceName = req.SourceName,
            SourceUrl = req.SourceUrl,
            SourceLicense = req.SourceLicense,
            LearningObjectivesJson = req.LearningObjectives?.ToJsonString() ?? "[]",
            Introduction = req.Introduction,
            DefinitionsJson = req.Definitions?.ToJsonString() ?? "[]",
            FormulasJson = req.Formulas?.ToJsonString() ?? "[]",
            ExamplesJson = req.Examples?.ToJsonString() ?? "[]",
            ImportantNotesJson = req.ImportantNotes?.ToJsonString() ?? "[]",
            SummaryPointsJson = req.SummaryPoints?.ToJsonString() ?? "[]",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentLessons.Add(les);

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_created",
            "content_lesson",
            les.Id,
            null,
            JsonSerializer.Serialize(new { title = les.Title, chapterId = les.ChapterId }),
            ct);

        await _db.SaveChangesAsync(ct);

        var author = await _db.Users.FindAsync(new object[] { currentUserId }, ct);
        return FormatLesson(les, author);
    }

    public async Task<ContentLessonDetailDto> UpdateLessonAsync(
        string lessonId,
        UpdateLessonRequestDto req,
        string currentUserId,
        bool isContentStaffOrAdmin,
        CancellationToken ct = default)
    {
        var les = await _db.ContentLessons
            .Include(l => l.Author)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.CurriculumEdition)
            .Include(l => l.Topic)
            .Include(l => l.Videos)
            .Include(l => l.Questions)
            .FirstOrDefaultAsync(l => l.Id == lessonId, ct);

        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");

        if (!isContentStaffOrAdmin && les.AuthorId != currentUserId)
        {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa bài học của tác giả khác.");
        }

        ApplyExpectedRowVersion(les, req.RowVersion);

        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            throw new ValidationException("Status", "Không thể thay đổi trạng thái qua API cập nhật bài học. Vui lòng sử dụng các endpoint workflow chuyên biệt (submit-review, approve, publish, unpublish).");
        }

        if (req.ChapterId != null && req.ChapterId != les.ChapterId)
        {
            var targetChapter = await _db.ContentChapters.FindAsync(new object[] { req.ChapterId }, ct);
            if (targetChapter == null)
                throw new ValidationException("ChapterId", "Chương học đích không tồn tại.");
            if (targetChapter.Status == "archived")
                throw new ValidationException("ChapterId", "Không thể chuyển bài học sang chương đã lưu trữ.");
            les.ChapterId = req.ChapterId;
        }
        if (req.Code != null) les.Code = string.IsNullOrWhiteSpace(req.Code) ? null : req.Code.Trim().ToUpperInvariant();
        if (req.TopicId != null) les.TopicId = string.IsNullOrWhiteSpace(req.TopicId) ? null : req.TopicId;
        if (req.Title != null) les.Title = req.Title.Trim();
        if (req.Slug != null) les.Slug = req.Slug.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(les.Code) && await _db.ContentLessons.AnyAsync(l => l.Id != les.Id && l.ChapterId == les.ChapterId && l.Code == les.Code && l.Status != "archived", ct))
            throw new ConflictException("Mã bài học đã tồn tại trong chương.");
        if (!string.IsNullOrWhiteSpace(les.Slug) && await _db.ContentLessons.AnyAsync(l => l.Id != les.Id && l.ChapterId == les.ChapterId && l.Slug == les.Slug && l.Status != "archived", ct))
            throw new ConflictException("Slug bài học đã tồn tại trong chương.");
        if (req.OrderIndex.HasValue) les.OrderIndex = req.OrderIndex.Value;
        if (req.SourceName != null) les.SourceName = req.SourceName.Trim();
        if (req.SourceUrl != null) les.SourceUrl = req.SourceUrl.Trim();
        if (req.SourceLicense != null) les.SourceLicense = req.SourceLicense.Trim();
        if (req.Introduction != null) les.Introduction = req.Introduction;
        if (req.LearningObjectives != null) les.LearningObjectivesJson = req.LearningObjectives.ToJsonString();
        if (req.Definitions != null) les.DefinitionsJson = req.Definitions.ToJsonString();
        if (req.Formulas != null) les.FormulasJson = req.Formulas.ToJsonString();
        if (req.Examples != null) les.ExamplesJson = req.Examples.ToJsonString();
        if (req.ImportantNotes != null) les.ImportantNotesJson = req.ImportantNotes.ToJsonString();
        if (req.SummaryPoints != null) les.SummaryPointsJson = req.SummaryPoints.ToJsonString();

        les.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_updated",
            "content_lesson",
            les.Id,
            null,
            JsonSerializer.Serialize(new { title = les.Title }),
            ct);

        await SaveWithConcurrencyAsync(ct);
        return FormatLesson(les, les.Author);
    }

    public async Task<bool> DeleteLessonAsync(string lessonId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default)
    {
        var les = await _db.ContentLessons.FindAsync(new object[] { lessonId }, ct);
        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");

        if (!isContentStaffOrAdmin && les.AuthorId != currentUserId)
        {
            throw new ForbiddenException("Bạn không có quyền xóa bài học của tác giả khác.");
        }

        var progressExists = await _db.LessonProgresses.AnyAsync(p => p.LessonId == lessonId, ct);
        if (progressExists)
        {
            throw new ValidationException("Lesson", "Không thể xóa bài học này vì đã có dữ liệu tiến độ học tập của học viên. Vui lòng chuyển trạng thái sang 'archived' thay vì xóa.");
        }

        _db.ContentLessons.Remove(les);

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_deleted",
            "content_lesson",
            lessonId,
            null,
            JsonSerializer.Serialize(new { title = les.Title }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ReorderLessonsAsync(ReorderLessonsRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.ChapterId))
            throw new ValidationException("ChapterId", "ChapterId không được để trống khi sắp xếp bài học.");

        if (req.LessonIds == null || req.LessonIds.Count == 0)
            throw new ValidationException("LessonIds", "Danh sách lessonIds không được rỗng.");

        if (req.LessonIds.Distinct().Count() != req.LessonIds.Count)
            throw new ValidationException("LessonIds", "Danh sách lessonIds chứa mã bài học trùng lặp.");

        var lessonsQuery = _db.ContentLessons.Where(l => l.ChapterId == req.ChapterId);
        if (!string.IsNullOrWhiteSpace(req.TopicId))
        {
            lessonsQuery = lessonsQuery.Where(l => l.TopicId == req.TopicId);
        }

        var lessons = await lessonsQuery.ToListAsync(ct);
        if (lessons.Count != req.LessonIds.Count)
        {
            throw new ValidationException("LessonIds", $"Số lượng bài học gửi lên ({req.LessonIds.Count}) không khớp với tổng số bài học trong phạm vi sắp xếp ({lessons.Count}).");
        }

        var map = lessons.ToDictionary(l => l.Id);
        foreach (var id in req.LessonIds)
        {
            if (!map.ContainsKey(id))
                throw new ValidationException("LessonIds", $"Mã bài học '{id}' không thuộc phạm vi sắp xếp đã chọn.");
        }

        if (req.RowVersions is { Count: > 0 })
        {
            foreach (var lesson in lessons)
            {
                if (!req.RowVersions.TryGetValue(lesson.Id, out var rv))
                    throw new ValidationException("RowVersion", $"Thiếu RowVersion cho bài học '{lesson.Id}'.");
                ApplyExpectedRowVersion(lesson, rv);
            }
        }
        else if (lessons.Any(l => l.RowVersion.Length > 0))
        {
            throw new ValidationException("RowVersion", "Thiếu RowVersions khi sắp xếp bài học.");
        }

        for (int i = 0; i < req.LessonIds.Count; i++)
        {
            var l = map[req.LessonIds[i]];
            l.OrderIndex = i + 1;
            l.UpdatedAt = _clock.UtcNow;
        }

        await _auditWriter.WriteStaffAuditAsync(
            "lessons_reordered",
            "content_lesson",
            req.ChapterId,
            null,
            JsonSerializer.Serialize(new { chapterId = req.ChapterId, topicId = req.TopicId, count = req.LessonIds.Count }),
            ct);

        await SaveWithConcurrencyAsync(ct);
        return true;
    }

    public async Task<ContentLessonDetailDto> SubmitReviewAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default)
    {
        var les = await _db.ContentLessons.Include(l => l.Author).Include(l => l.Chapter).FirstOrDefaultAsync(l => l.Id == lessonId, ct);
        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");
        ApplyExpectedRowVersion(les, action?.RowVersion);

        if (!isContentStaffOrAdmin && les.AuthorId != currentUserId)
        {
            throw new ForbiddenException("Bạn không có quyền gửi duyệt bài học của tác giả khác.");
        }

        if (les.Status != "draft" && les.Status != "changes-requested")
            throw new ValidationException("Status", $"Chỉ bản nháp hoặc bài bị yêu cầu sửa mới có thể gửi duyệt. Trạng thái hiện tại: {les.Status}");

        les.Status = "in-review";
        les.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_submitted",
            "content_lesson",
            les.Id,
            null,
            JsonSerializer.Serialize(new { title = les.Title }),
            ct);

        await SaveWithConcurrencyAsync(ct);
        return FormatLesson(les, les.Author);
    }

    public async Task<ContentLessonDetailDto> ApproveLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền phê duyệt bài học.");

        var les = await _db.ContentLessons.Include(l => l.Author).Include(l => l.Chapter).FirstOrDefaultAsync(l => l.Id == lessonId, ct);
        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");
        ApplyExpectedRowVersion(les, action?.RowVersion);

        if (!string.IsNullOrEmpty(les.AuthorId) && les.AuthorId == currentUserId)
        {
            throw new ForbiddenException("Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không được tự phê duyệt bài học của chính mình.");
        }

        if (les.Status != "in-review")
            throw new ValidationException("Status", $"Chỉ có bài học đang chờ duyệt ('in-review') mới có thể phê duyệt. Trạng thái hiện tại: {les.Status}");

        if (les.Title.Contains("VNHSGE", StringComparison.OrdinalIgnoreCase) ||
            les.Introduction?.Contains("VNHSGE", StringComparison.OrdinalIgnoreCase) == true)
        {
            throw new ForbiddenException("Nội dung bài học có dấu hiệu chứa tài liệu kỳ thi tốt nghiệp THPT Quốc gia (VNHSGE) đang bị khóa bản quyền học thuật hoặc chưa được cấp phép. Không thể phê duyệt.");
        }

        les.Status = "approved";
        les.ReviewedBy = currentUserId;
        les.UpdatedAt = _clock.UtcNow;

        var approvalRevision = await CreateLessonRevisionAsync(les, currentUserId, "Phê duyệt bài học", null, ct);

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_approved",
            "content_lesson",
            les.Id,
            null,
            JsonSerializer.Serialize(new { title = les.Title, authorId = les.AuthorId, reviewerId = currentUserId }),
            ct);

        await SaveChangesWithRevisionRetryAsync(approvalRevision, ct);
        return FormatLesson(les, les.Author);
    }

    public async Task<ContentLessonDetailDto> PublishLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer) throw new ForbiddenException("Bạn không có quyền xuất bản bài học.");
        var les = await _db.ContentLessons.Include(l => l.Author).Include(l => l.Chapter).ThenInclude(c => c!.CurriculumEdition).ThenInclude(e => e!.Curriculum).FirstOrDefaultAsync(l => l.Id == lessonId, ct)
            ?? throw new NotFoundException("Bài học không tồn tại.");
        ApplyExpectedRowVersion(les, action?.RowVersion);
        if (les.Status != "approved") throw new ValidationException("Status", "Chỉ bài học đã được phê duyệt mới có thể xuất bản.");
        if (les.Chapter?.CurriculumEditionId != null && (les.Chapter.Status != "published" || les.Chapter.CurriculumEdition?.Status != "published" || les.Chapter.CurriculumEdition.Curriculum?.Status != "published"))
            throw new ValidationException("ChapterId", "Toàn bộ chuỗi giáo trình, phiên bản và chương phải được xuất bản trước bài học.");
        les.Status = "published"; les.UpdatedAt = _clock.UtcNow;
        await _auditWriter.WriteStaffAuditAsync("lesson_published", "content_lesson", les.Id, null, JsonSerializer.Serialize(new { actorUserId = currentUserId, action?.Reason }), ct);
        await SaveWithConcurrencyAsync(ct); return FormatLesson(les, les.Author);
    }

    public async Task<ContentLessonDetailDto> UnpublishLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền hủy xuất bản bài học.");

        var les = await _db.ContentLessons.Include(l => l.Author).Include(l => l.Chapter).FirstOrDefaultAsync(l => l.Id == lessonId, ct);
        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");
        ApplyExpectedRowVersion(les, action?.RowVersion);

        if (les.Status != "published")
            throw new ValidationException("Status", $"Chỉ có bài học đã xuất bản ('published') mới có thể chuyển về bản nháp. Trạng thái hiện tại: {les.Status}");

        les.Status = "approved";
        les.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_unpublished",
            "content_lesson",
            les.Id,
            null,
            JsonSerializer.Serialize(new { title = les.Title, unpublishedBy = currentUserId }),
            ct);

        await SaveWithConcurrencyAsync(ct);
        return FormatLesson(les, les.Author);
    }

    public async Task<ContentLessonDetailDto> RequestChangesAsync(string lessonId, JsonObject? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền yêu cầu chỉnh sửa bài học.");

        var les = await _db.ContentLessons.Include(l => l.Author).Include(l => l.Chapter).FirstOrDefaultAsync(l => l.Id == lessonId, ct);
        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");
        var rowVersion = body?["rowVersion"]?.ToString() ?? body?["RowVersion"]?.ToString();
        ApplyExpectedRowVersion(les, rowVersion);

        if (!string.IsNullOrEmpty(les.AuthorId) && les.AuthorId == currentUserId)
        {
            throw new ForbiddenException("Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không được tự yêu cầu sửa bài học của chính mình.");
        }

        if (les.Status != "in-review" && les.Status != "approved" && les.Status != "published")
            throw new ValidationException("Status", $"Chỉ có bài học đang chờ duyệt ('in-review'), đã duyệt ('approved') hoặc đã xuất bản ('published') mới có thể yêu cầu chỉnh sửa. Trạng thái hiện tại: {les.Status}");

        var notes = body?["notes"]?.ToString() ?? body?["reason"]?.ToString() ?? "Cần cập nhật thêm nội dung";

        les.Status = "changes-requested";
        les.ReviewedBy = currentUserId;
        les.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_changes_requested",
            "content_lesson",
            les.Id,
            null,
            JsonSerializer.Serialize(new { title = les.Title, reviewerId = currentUserId, notes }),
            ct);

        await SaveWithConcurrencyAsync(ct);
        return FormatLesson(les, les.Author);
    }

    public async Task<ContentLessonDetailDto> RejectLessonAsync(string lessonId, JsonObject? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        return await RequestChangesAsync(lessonId, body, currentUserId, isAuthorizedReviewer, ct);
    }

    public async Task<ContentLessonDetailDto> ArchiveLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền lưu trữ bài học.");

        var les = await _db.ContentLessons.Include(l => l.Author).Include(l => l.Chapter).FirstOrDefaultAsync(l => l.Id == lessonId, ct)
            ?? throw new NotFoundException("Bài học không tồn tại.");
        ApplyExpectedRowVersion(les, action?.RowVersion);

        if (les.Status == "archived")
            throw new ValidationException("Status", "Bài học đã ở trạng thái lưu trữ.");

        les.Status = "archived";
        les.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_archived",
            "content_lesson",
            les.Id,
            null,
            JsonSerializer.Serialize(new { title = les.Title, actorUserId = currentUserId, reason = action?.Reason }),
            ct);

        await SaveWithConcurrencyAsync(ct);
        return FormatLesson(les, les.Author);
    }

    public async Task<ContentLessonDetailDto> ReactivateLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền khôi phục bài học.");

        var les = await _db.ContentLessons.Include(l => l.Author).Include(l => l.Chapter).FirstOrDefaultAsync(l => l.Id == lessonId, ct)
            ?? throw new NotFoundException("Bài học không tồn tại.");
        ApplyExpectedRowVersion(les, action?.RowVersion);

        if (les.Status != "archived")
            throw new ValidationException("Status", "Chỉ bài học đã lưu trữ mới có thể khôi phục về bản nháp.");

        les.Status = "draft";
        les.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_reactivated",
            "content_lesson",
            les.Id,
            null,
            JsonSerializer.Serialize(new { title = les.Title, actorUserId = currentUserId, reason = action?.Reason }),
            ct);

        await SaveWithConcurrencyAsync(ct);
        return FormatLesson(les, les.Author);
    }

    public async Task<ContentLessonDetailDto> RollbackLessonAsync(string lessonId, RollbackContentRequestDto? req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền khôi phục/rollback bài học.");

        var les = await _db.ContentLessons.Include(l => l.Author).FirstOrDefaultAsync(l => l.Id == lessonId, ct);
        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");

        if (les.Status == "draft")
            throw new ConflictException("Bài học đang ở trạng thái bản nháp ('draft'), không thể rollback.");

        ContentRevision? targetRev = null;
        if (!string.IsNullOrWhiteSpace(req?.RevisionId))
        {
            targetRev = await _db.ContentRevisions.FirstOrDefaultAsync(r => r.Id == req.RevisionId && r.ContentId == lessonId && r.ContentType == "lesson", ct);
            if (targetRev == null)
                throw new NotFoundException($"Không tìm thấy phiên bản revision '{req.RevisionId}' cho bài học này.");
        }
        else if (req?.TargetVersion.HasValue == true)
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == lessonId && r.ContentType == "lesson" && r.Version == req.TargetVersion.Value)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync(ct);
            if (targetRev == null)
                throw new NotFoundException($"Không tìm thấy phiên bản v{req.TargetVersion.Value} cho bài học này.");
        }
        else
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == lessonId && r.ContentType == "lesson")
                .OrderByDescending(r => r.CreatedAt)
                .Skip(1)
                .FirstOrDefaultAsync(ct);
        }

        if (targetRev == null)
            throw new ConflictException("Không có phiên bản trước đó để khôi phục bài học.");
        if (string.IsNullOrWhiteSpace(targetRev.SnapshotJson))
            throw new ConflictException("Phiên bản được chọn không có snapshot hợp lệ.");

        var previousStatus = les.Status;

        try
        {
            using var doc = JsonDocument.Parse(targetRev.SnapshotJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("schemaVersion", out var schemaVersion) &&
                (schemaVersion.ValueKind != JsonValueKind.Number || !schemaVersion.TryGetInt32(out var version) || version != 1))
                throw new ConflictException("Schema snapshot của phiên bản không được hỗ trợ.");

            if (root.TryGetProperty("ChapterId", out var chapterProp) && !string.IsNullOrWhiteSpace(chapterProp.GetString())) les.ChapterId = chapterProp.GetString()!;
            if (root.TryGetProperty("TopicId", out var topicProp)) les.TopicId = topicProp.ValueKind == JsonValueKind.Null ? null : topicProp.GetString();
            if (root.TryGetProperty("Title", out var titleProp) && !string.IsNullOrWhiteSpace(titleProp.GetString())) les.Title = titleProp.GetString()!;
            if (root.TryGetProperty("Slug", out var slugProp) && !string.IsNullOrWhiteSpace(slugProp.GetString())) les.Slug = slugProp.GetString()!;
            if (root.TryGetProperty("AuthorId", out var authorProp) && !string.IsNullOrWhiteSpace(authorProp.GetString())) les.AuthorId = authorProp.GetString()!;
            if (root.TryGetProperty("ReviewedBy", out var reviewerProp)) les.ReviewedBy = reviewerProp.ValueKind == JsonValueKind.Null ? null : reviewerProp.GetString();
            if (root.TryGetProperty("Introduction", out var introProp)) les.Introduction = introProp.ValueKind == JsonValueKind.Null ? null : introProp.GetString();
            if (root.TryGetProperty("DefinitionsJson", out var defProp)) les.DefinitionsJson = defProp.ValueKind == JsonValueKind.Null ? null : defProp.GetString();
            if (root.TryGetProperty("FormulasJson", out var formProp)) les.FormulasJson = formProp.ValueKind == JsonValueKind.Null ? null : formProp.GetString();
            if (root.TryGetProperty("ExamplesJson", out var exProp)) les.ExamplesJson = exProp.ValueKind == JsonValueKind.Null ? null : exProp.GetString();
            if (root.TryGetProperty("ImportantNotesJson", out var notesProp)) les.ImportantNotesJson = notesProp.ValueKind == JsonValueKind.Null ? null : notesProp.GetString();
            if (root.TryGetProperty("SummaryPointsJson", out var sumProp)) les.SummaryPointsJson = sumProp.ValueKind == JsonValueKind.Null ? null : sumProp.GetString();
            if (root.TryGetProperty("OrderIndex", out var orderProp)) les.OrderIndex = orderProp.GetInt32();
        }
        catch (JsonException)
        {
            throw new ConflictException("Snapshot của phiên bản bị hỏng và không thể khôi phục an toàn.");
        }

        les.Status = "draft";
        les.UpdatedAt = _clock.UtcNow;

        var rollbackRev = await CreateLessonRevisionAsync(les, currentUserId, req?.Reason ?? $"Rollback từ trạng thái {previousStatus} về bản nháp", targetRev?.Id, ct);

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_rollback",
            "content_lesson",
            les.Id,
            null,
            JsonSerializer.Serialize(new
            {
                title = les.Title,
                previousStatus,
                newStatus = les.Status,
                targetRevisionId = targetRev?.Id,
                targetVersion = targetRev?.Version,
                rollbackRevisionId = rollbackRev.Id,
                actorId = currentUserId
            }),
            ct);

        await SaveChangesWithRevisionRetryAsync(rollbackRev, ct);
        return FormatLesson(les, les.Author);
    }

    private void ApplyExpectedRowVersion(ContentLesson lesson, string? expected)
    {
        if (lesson.RowVersion.Length == 0 && string.IsNullOrWhiteSpace(expected)) return;
        if (string.IsNullOrWhiteSpace(expected)) throw new ValidationException("RowVersion", "Thiếu RowVersion.");
        byte[] bytes;
        try { bytes = Convert.FromBase64String(expected); }
        catch { throw new ValidationException("RowVersion", "RowVersion không đúng định dạng Base64."); }
        if (!lesson.RowVersion.SequenceEqual(bytes)) throw new ConflictException("Dữ liệu đã được thay đổi bởi người dùng khác.");
        _db.Entry(lesson).Property(nameof(lesson.RowVersion)).OriginalValue = bytes;
    }

    private async Task SaveWithConcurrencyAsync(CancellationToken ct)
    {
        try { await _db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { throw new ConflictException("Dữ liệu đã được thay đổi bởi người dùng khác."); }
    }
}
