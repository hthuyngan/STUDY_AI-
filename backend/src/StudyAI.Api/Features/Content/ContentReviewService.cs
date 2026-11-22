using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Content;

public class ContentReviewService : IContentReviewService
{
    private readonly IApplicationDbContext _db;

    public ContentReviewService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<object>> GetApprovalsAsync(
        string? status = "all",
        string? type = "all",
        string? search = null,
        CancellationToken ct = default)
    {
        var lessonQuery = _db.ContentLessons
            .AsNoTracking()
            .Include(l => l.Author)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .AsQueryable();

        var questionQuery = _db.ContentQuestions
            .AsNoTracking()
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Where(q => !q.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            var s = status.Trim().ToLowerInvariant();
            if (s == "pending" || s == "in-review")
            {
                lessonQuery = lessonQuery.Where(l => l.Status == "in-review");
                questionQuery = questionQuery.Where(q => q.Status == "in-review");
            }
            else if (s == "approved")
            {
                lessonQuery = lessonQuery.Where(l => l.Status == "approved");
                questionQuery = questionQuery.Where(q => q.Status == "approved");
            }
            else if (s == "changes-requested" || s == "draft")
            {
                lessonQuery = lessonQuery.Where(l => l.Status == "draft");
                questionQuery = questionQuery.Where(q => q.Status == "draft");
            }
            else if (s == "published")
            {
                lessonQuery = lessonQuery.Where(l => l.Status == "published");
                questionQuery = questionQuery.Where(q => q.Status == "published");
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var qStr = search.Trim().ToLower();
            lessonQuery = lessonQuery.Where(l => l.Title.ToLower().Contains(qStr));
            questionQuery = questionQuery.Where(q => q.Prompt.ToLower().Contains(qStr));
        }

        var results = new List<object>();

        if (type == "all" || type == "lesson")
        {
            var lessons = await lessonQuery.OrderByDescending(l => l.UpdatedAt).Take(100).ToListAsync(ct);
            var lessonIds = lessons.Select(l => l.Id).ToList();
            var auditLogs = await _db.StaffAuditLogs
                .AsNoTracking()
                .Where(a => a.TargetType == "content_lesson" && lessonIds.Contains(a.TargetId))
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync(ct);

            foreach (var l in lessons)
            {
                var history = auditLogs.Where(a => a.TargetId == l.Id).Select(a => new
                {
                    id = a.Id,
                    action = a.Action,
                    actor = a.ActorUserId,
                    timestamp = a.CreatedAt.ToString("o"),
                    note = a.Payload
                }).ToList();

                var statusStr = l.Status == "in-review" ? "pending" : (l.Status == "draft" ? "changes-requested" : l.Status);

                results.Add(new
                {
                    id = $"apr_l_{l.Id}",
                    title = l.Title,
                    contentType = "lesson",
                    contentId = l.Id,
                    subjectId = l.Chapter?.SubjectId ?? "",
                    subjectName = l.Chapter?.Subject?.Name ?? "",
                    chapterId = l.ChapterId,
                    chapterName = l.Chapter?.Title ?? "",
                    authorName = l.Author?.DisplayName ?? "Biên soạn nội dung",
                    authorRole = "Biên soạn nội dung",
                    version = "v1.0",
                    status = statusStr,
                    submittedAt = l.CreatedAt.ToString("o"),
                    reviewedAt = l.UpdatedAt.ToString("o"),
                    reviewedBy = l.ReviewedBy,
                    contentPreview = new
                    {
                        introduction = l.Introduction ?? "",
                        definitions = l.DefinitionsJson ?? "[]",
                        formulas = l.FormulasJson ?? "[]",
                        examples = l.ExamplesJson ?? "[]",
                        summary = l.SummaryPointsJson ?? "[]"
                    },
                    history
                });
            }
        }

        if (type == "all" || type == "assessment" || type == "question")
        {
            var questions = await questionQuery.OrderByDescending(q => q.UpdatedAt).Take(100).ToListAsync(ct);
            var qIds = questions.Select(q => q.Id).ToList();
            var auditLogs = await _db.StaffAuditLogs
                .AsNoTracking()
                .Where(a => a.TargetType == "content_question" && qIds.Contains(a.TargetId))
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync(ct);

            foreach (var q in questions)
            {
                var history = auditLogs.Where(a => a.TargetId == q.Id).Select(a => new
                {
                    id = a.Id,
                    action = a.Action,
                    actor = a.ActorUserId,
                    timestamp = a.CreatedAt.ToString("o"),
                    note = a.Payload
                }).ToList();

                var statusStr = q.Status == "in-review" ? "pending" : (q.Status == "draft" ? "changes-requested" : q.Status);

                results.Add(new
                {
                    id = $"apr_q_{q.Id}",
                    title = q.Prompt.Length > 80 ? q.Prompt[..80] + "..." : q.Prompt,
                    contentType = "assessment",
                    contentId = q.Id,
                    subjectId = q.Lesson?.Chapter?.SubjectId ?? q.SubjectId ?? "",
                    subjectName = q.Lesson?.Chapter?.Subject?.Name ?? "Toán học",
                    authorName = "Biên soạn nội dung",
                    authorRole = "Biên soạn nội dung",
                    version = "v1.0",
                    status = statusStr,
                    submittedAt = q.CreatedAt.ToString("o"),
                    reviewedAt = q.UpdatedAt.ToString("o"),
                    reviewedBy = q.ReviewedBy,
                    contentPreview = new
                    {
                        questionCount = 1,
                        maxScore = 10,
                        prompt = q.Prompt,
                        options = q.OptionsJson
                    },
                    history
                });
            }
        }

        return results;
    }

    public async Task<List<object>> GetPublicationsAsync(
        string? search = null,
        string? type = "all",
        CancellationToken ct = default)
    {
        var lessonQuery = _db.ContentLessons
            .AsNoTracking()
            .Include(l => l.Author)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .Where(l => l.Status == "published")
            .AsQueryable();

        var questionQuery = _db.ContentQuestions
            .AsNoTracking()
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Where(q => q.Status == "published" && !q.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var qStr = search.Trim().ToLower();
            lessonQuery = lessonQuery.Where(l => l.Title.ToLower().Contains(qStr));
            questionQuery = questionQuery.Where(q => q.Prompt.ToLower().Contains(qStr));
        }

        var results = new List<object>();

        if (type == "all" || type == "lesson")
        {
            var lessons = await lessonQuery.OrderByDescending(l => l.UpdatedAt).Take(100).ToListAsync(ct);
            var lessonIds = lessons.Select(l => l.Id).ToList();
            var lessonRevs = await _db.ContentRevisions
                .AsNoTracking()
                .Where(r => lessonIds.Contains(r.ContentId))
                .OrderByDescending(r => r.Version)
                .ToListAsync(ct);

            var revByLesson = lessonRevs.GroupBy(r => r.ContentId).ToDictionary(g => g.Key, g => g.First());

            var reviewerIds = lessons.Select(l => l.ReviewedBy).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            var reviewerMap = await _db.Users.AsNoTracking().Where(u => reviewerIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.DisplayName, ct);

            foreach (var l in lessons)
            {
                var pubBy = (!string.IsNullOrWhiteSpace(l.ReviewedBy) && reviewerMap.TryGetValue(l.ReviewedBy, out var revName))
                    ? revName
                    : (l.Author?.DisplayName ?? "Ban biên tập");

                revByLesson.TryGetValue(l.Id, out var rev);
                var versionStr = rev != null ? $"v{rev.Version}.0" : "v1.0";
                var changelogStr = rev?.Reason ?? "Xuất bản bài học chuẩn GDPT 2018";

                results.Add(new
                {
                    id = $"pub_{l.Id}",
                    contentId = l.Id,
                    contentType = "lesson",
                    title = l.Title,
                    subjectId = l.Chapter?.SubjectId ?? "",
                    subjectName = l.Chapter?.Subject?.Name ?? "",
                    version = versionStr,
                    publishedAt = l.UpdatedAt.ToString("o"),
                    publisherName = pubBy,
                    publishedBy = pubBy,
                    status = "active",
                    changelog = changelogStr
                });
            }
        }

        if (type == "all" || type == "assessment" || type == "question")
        {
            var questions = await questionQuery.OrderByDescending(q => q.UpdatedAt).Take(100).ToListAsync(ct);
            var questionIds = questions.Select(q => q.Id).ToList();
            var questionRevs = await _db.ContentRevisions
                .AsNoTracking()
                .Where(r => questionIds.Contains(r.ContentId))
                .OrderByDescending(r => r.Version)
                .ToListAsync(ct);

            var revByQuestion = questionRevs.GroupBy(r => r.ContentId).ToDictionary(g => g.Key, g => g.First());

            var reviewerIds = questions.Select(q => q.ReviewedBy).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            var reviewerMap = await _db.Users.AsNoTracking().Where(u => reviewerIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.DisplayName, ct);

            foreach (var q in questions)
            {
                var pubBy = (!string.IsNullOrWhiteSpace(q.ReviewedBy) && reviewerMap.TryGetValue(q.ReviewedBy, out var revName))
                    ? revName
                    : "Ban biên tập";

                revByQuestion.TryGetValue(q.Id, out var rev);
                var versionStr = rev != null ? $"v{rev.Version}.0" : "v1.0";
                var changelogStr = rev?.Reason ?? "Ngân hàng câu hỏi kiểm chứng";

                results.Add(new
                {
                    id = $"pub_{q.Id}",
                    contentId = q.Id,
                    contentType = "assessment",
                    title = q.Prompt.Length > 80 ? q.Prompt[..80] + "..." : q.Prompt,
                    subjectId = q.Lesson?.Chapter?.SubjectId ?? q.SubjectId ?? "",
                    subjectName = q.Lesson?.Chapter?.Subject?.Name ?? "Toán học",
                    version = versionStr,
                    publishedAt = q.UpdatedAt.ToString("o"),
                    publisherName = pubBy,
                    publishedBy = pubBy,
                    status = "active",
                    changelog = changelogStr
                });
            }
        }

        return results;
    }
}