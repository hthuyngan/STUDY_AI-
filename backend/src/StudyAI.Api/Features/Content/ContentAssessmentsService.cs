using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Content;

public class ContentAssessmentsService : IContentAssessmentsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public ContentAssessmentsService(
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

    private static bool IsValidAssessmentStatus(string? status)
    {
        return status is "draft" or "in-review" or "approved" or "published" or "archived";
    }

    private static List<AssessmentOptionDto> ParseAssessmentOptions(string optionsJson)
    {
        var result = new List<AssessmentOptionDto>();
        if (string.IsNullOrWhiteSpace(optionsJson)) return result;

        try
        {
            using var doc = JsonDocument.Parse(optionsJson);
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                int idx = 0;
                var letters = new[] { "A", "B", "C", "D" };
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    if (el.ValueKind == JsonValueKind.Object)
                    {
                        var id = el.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? $"opt-{idx}" : $"opt-{idx}";
                        var label = el.TryGetProperty("label", out var lProp) ? lProp.GetString() ?? (idx < letters.Length ? letters[idx] : $"O{idx + 1}") : (idx < letters.Length ? letters[idx] : $"O{idx + 1}");
                        var text = el.TryGetProperty("text", out var tProp) ? tProp.GetString() ?? "" : "";
                        result.Add(new AssessmentOptionDto { Id = id, Label = label, Text = text });
                    }
                    else if (el.ValueKind == JsonValueKind.String)
                    {
                        var text = el.GetString() ?? "";
                        var label = idx < letters.Length ? letters[idx] : $"O{idx + 1}";
                        result.Add(new AssessmentOptionDto { Id = $"opt-{idx}", Label = label, Text = text });
                    }
                    idx++;
                }
            }
        }
        catch
        {
        }
        return result;
    }

    private static ContentAssessmentItemDto FormatAssessmentSummary(ContentAssessment a)
    {
        return new ContentAssessmentItemDto
        {
            Id = a.Id,
            LessonId = a.LessonId,
            LessonTitle = a.Lesson?.Title ?? a.Title,
            SubjectId = a.Lesson?.Chapter?.SubjectId ?? "",
            SubjectName = a.Lesson?.Chapter?.Subject?.Name ?? "",
            ChapterId = a.Lesson?.ChapterId,
            ChapterName = a.Lesson?.Chapter?.Title,
            QuestionCount = a.Questions.Count(q => !q.IsDeleted),
            PassingScore = a.PassScore,
            DurationMinutes = a.DurationMinutes,
            Status = a.Status,
            CreatedAt = a.CreatedAt.ToString("o"),
            UpdatedAt = a.UpdatedAt.ToString("o"),
            Questions = new List<AssessmentQuestionDto>()
        };
    }

    private static ContentAssessmentItemDto FormatAssessmentDetail(ContentAssessment a)
    {
        var questions = a.Questions
            .Where(q => !q.IsDeleted)
            .OrderBy(q => q.OrderIndex)
            .ThenBy(q => q.CreatedAt)
            .Select(q =>
            {
                var options = ParseAssessmentOptions(q.OptionsJson);
                return new AssessmentQuestionDto
                {
                    Id = q.Id,
                    Prompt = q.Prompt,
                    Topic = q.Topic,
                    Options = options,
                    CorrectOptionId = q.CorrectAnswer,
                    Explanation = q.Explanation ?? ""
                };
            }).ToList();

        return new ContentAssessmentItemDto
        {
            Id = a.Id,
            LessonId = a.LessonId,
            LessonTitle = a.Lesson?.Title ?? a.Title,
            SubjectId = a.Lesson?.Chapter?.SubjectId ?? "",
            SubjectName = a.Lesson?.Chapter?.Subject?.Name ?? "",
            ChapterId = a.Lesson?.ChapterId,
            ChapterName = a.Lesson?.Chapter?.Title,
            QuestionCount = questions.Count,
            PassingScore = a.PassScore,
            DurationMinutes = a.DurationMinutes,
            Status = a.Status,
            CreatedAt = a.CreatedAt.ToString("o"),
            UpdatedAt = a.UpdatedAt.ToString("o"),
            Questions = questions
        };
    }

    public async Task<List<ContentAssessmentItemDto>> ListAssessmentsAsync(
        string? lessonId = null,
        string? status = null,
        string? search = null,
        CancellationToken ct = default)
    {
        var query = _db.ContentAssessments
            .AsNoTracking()
            .Include(x => x.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(x => x.Questions)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(lessonId))
            query = query.Where(a => a.LessonId == lessonId);

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            query = query.Where(a => a.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(a => a.Title.ToLower().Contains(q) || (a.Lesson != null && a.Lesson.Title.ToLower().Contains(q)));
        }

        var list = await query.OrderByDescending(a => a.UpdatedAt).ToListAsync(ct);
        return list.Select(FormatAssessmentSummary).ToList();
    }

    public async Task<ContentAssessmentItemDto> GetAssessmentDetailAsync(string id, CancellationToken ct = default)
    {
        var a = await _db.ContentAssessments
            .AsNoTracking()
            .Include(x => x.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(x => x.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (a == null)
            throw new NotFoundException("Bài kiểm tra / đánh giá không tồn tại.");

        return FormatAssessmentDetail(a);
    }

    public async Task<ContentAssessmentItemDto> CreateAssessmentAsync(CreateAssessmentRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.LessonId))
            throw new ValidationException("LessonId", "Bài học (LessonId) không được để trống.");
        if (req.PassingScore is < 0 or > 100)
            throw new ValidationException("PassingScore", "Điểm đạt phải nằm trong khoảng 0 đến 100.");
        if (req.DurationMinutes is <= 0 or > 480)
            throw new ValidationException("DurationMinutes", "Thời lượng phải nằm trong khoảng 1 đến 480 phút.");
        if (!string.IsNullOrWhiteSpace(req.Status) && !IsValidAssessmentStatus(req.Status))
            throw new ValidationException("Status", "Trạng thái bài đánh giá không hợp lệ.");

        var lesson = await _db.ContentLessons
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(l => l.Id == req.LessonId, ct);

        if (lesson == null)
            throw new NotFoundException("Bài học được liên kết không tồn tại.");

        var existing = await _db.ContentAssessments.FirstOrDefaultAsync(a => a.LessonId == req.LessonId, ct);
        if (existing != null)
            throw new ConflictException("Bài học này đã có bài đánh giá. Vui lòng cập nhật bài đánh giá hiện có.");

        var title = !string.IsNullOrWhiteSpace(req.Title) ? req.Title.Trim() : $"Bài kiểm tra: {lesson.Title}";
        var now = _clock.UtcNow;
        var assessment = new ContentAssessment
        {
            Id = _idGenerator.NewId("asm"),
            LessonId = req.LessonId,
            Title = title,
            PassScore = req.PassingScore ?? 80,
            DurationMinutes = req.DurationMinutes ?? 15,
            Status = !string.IsNullOrWhiteSpace(req.Status) ? req.Status : "draft",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentAssessments.Add(assessment);

        await _auditWriter.WriteStaffAuditAsync(
            "assessment_created",
            "content_assessment",
            assessment.Id,
            null,
            JsonSerializer.Serialize(new { assessment.Id, assessment.LessonId, assessment.Title }),
            ct);

        await _db.SaveChangesAsync(ct);
        assessment.Lesson = lesson;
        return FormatAssessmentDetail(assessment);
    }

    public async Task<ContentAssessmentItemDto> UpdateAssessmentAsync(string id, UpdateAssessmentRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (req.PassingScore is < 0 or > 100)
            throw new ValidationException("PassingScore", "Điểm đạt phải nằm trong khoảng 0 đến 100.");
        if (req.DurationMinutes is <= 0 or > 480)
            throw new ValidationException("DurationMinutes", "Thời lượng phải nằm trong khoảng 1 đến 480 phút.");
        if (!string.IsNullOrWhiteSpace(req.Status) && !IsValidAssessmentStatus(req.Status))
            throw new ValidationException("Status", "Trạng thái bài đánh giá không hợp lệ.");

        var assessment = await _db.ContentAssessments
            .Include(a => a.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(a => a.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (assessment == null)
            throw new NotFoundException("Bài kiểm tra / đánh giá không tồn tại.");

        if (!string.IsNullOrWhiteSpace(req.Title))
            assessment.Title = req.Title.Trim();

        if (req.PassingScore.HasValue)
            assessment.PassScore = req.PassingScore.Value;

        if (req.DurationMinutes.HasValue)
            assessment.DurationMinutes = req.DurationMinutes.Value;

        if (!string.IsNullOrWhiteSpace(req.Status))
            assessment.Status = req.Status.Trim();

        assessment.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "assessment_updated",
            "content_assessment",
            assessment.Id,
            null,
            JsonSerializer.Serialize(new { assessment.Id, assessment.Title, assessment.Status }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatAssessmentDetail(assessment);
    }

    public async Task<bool> DeleteAssessmentAsync(string id, string currentUserId, CancellationToken ct = default)
    {
        var assessment = await _db.ContentAssessments.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (assessment == null)
            throw new NotFoundException("Bài kiểm tra / đánh giá không tồn tại.");

        assessment.Status = "archived";
        assessment.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "assessment_archived",
            "content_assessment",
            id,
            null,
            JsonSerializer.Serialize(new { assessment.Id, assessment.Title }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ContentAssessmentItemDto> UpdateAssessmentStatusAsync(string id, JsonObject body, string currentUserId, CancellationToken ct = default)
    {
        var status = body?["status"]?.ToString();
        if (string.IsNullOrWhiteSpace(status))
            throw new ValidationException("status", "Trạng thái mới không được để trống.");
        if (!IsValidAssessmentStatus(status))
            throw new ValidationException("status", "Trạng thái bài đánh giá không hợp lệ.");

        var assessment = await _db.ContentAssessments
            .Include(a => a.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(a => a.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (assessment == null)
            throw new NotFoundException("Bài kiểm tra / đánh giá không tồn tại.");

        assessment.Status = status.Trim();
        assessment.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "assessment_status_changed",
            "content_assessment",
            assessment.Id,
            null,
            JsonSerializer.Serialize(new { assessment.Id, status = assessment.Status }),
            ct);

        await _db.SaveChangesAsync(ct);
        return FormatAssessmentDetail(assessment);
    }

    public async Task<ContentAssessmentItemDto> AddAssessmentQuestionAsync(string id, AddAssessmentQuestionRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Prompt))
            throw new ValidationException("Prompt", "Nội dung câu hỏi không được để trống.");

        var assessment = await _db.ContentAssessments
            .Include(a => a.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(a => a.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (assessment == null)
            throw new NotFoundException("Bài kiểm tra / đánh giá không tồn tại.");

        var optStrings = req.Options?.Select(o => o.Text).ToList() ?? new List<string>();
        var optJson = req.Options != null ? JsonSerializer.Serialize(req.Options) : JsonSerializer.Serialize(optStrings);

        var now = _clock.UtcNow;
        var q = new ContentQuestion
        {
            Id = _idGenerator.NewId("q"),
            AssessmentId = assessment.Id,
            LessonId = assessment.LessonId,
            SubjectId = assessment.Lesson?.Chapter?.SubjectId,
            ChapterId = assessment.Lesson?.ChapterId,
            Prompt = req.Prompt.Trim(),
            Topic = req.Topic ?? assessment.Lesson?.Title,
            OptionsJson = optJson,
            CorrectAnswer = req.CorrectOptionId ?? "",
            Explanation = req.Explanation,
            Difficulty = "medium",
            Type = "multiple-choice",
            Status = "draft",
            AuthorId = currentUserId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentQuestions.Add(q);
        assessment.UpdatedAt = now;

        await _auditWriter.WriteStaffAuditAsync(
            "assessment_question_added",
            "content_question",
            q.Id,
            null,
            JsonSerializer.Serialize(new { assessmentId = id, questionId = q.Id }),
            ct);

        await _db.SaveChangesAsync(ct);
        assessment.Questions.Add(q);
        return FormatAssessmentDetail(assessment);
    }
}