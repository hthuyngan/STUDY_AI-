using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Api.Controllers;

[Authorize(Roles = "content,admin")]
[ApiController]
[Route("api/v1/content")]
public class ContentController : ControllerBase
{
    private readonly StudyAIDbContext _db;

    public ContentController(StudyAIDbContext db)
    {
        _db = db;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    [HttpGet("subjects")]
    public async Task<IActionResult> ListSubjects()
    {
        var subjects = await _db.ContentSubjects
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
            .OrderBy(s => s.Name)
            .ToListAsync();

        var result = subjects.Select(s => new ContentSubjectItemDto
        {
            Id = s.Id,
            Name = s.Name,
            Code = s.Code,
            Grade = s.Grade,
            Description = s.Description ?? "",
            ChapterCount = s.Chapters.Count,
            LessonCount = s.Chapters.Sum(c => c.Lessons.Count)
        }).ToList();

        return Ok(new ContentSubjectListResponseDto
        {
            Items = result,
            Total = result.Count
        });
    }

    [HttpGet("subjects/{subjectId}")]
    public async Task<IActionResult> GetSubjectDetail(string subjectId)
    {
        var s = await _db.ContentSubjects
            .Include(sub => sub.Chapters)
                .ThenInclude(ch => ch.Lessons)
            .FirstOrDefaultAsync(sub => sub.Id == subjectId);

        if (s == null)
            return NotFound(new { detail = "Môn học không tồn tại." });

        var chapters = s.Chapters.OrderBy(c => c.OrderIndex).Select(ch => new
        {
            id = ch.Id,
            title = ch.Title,
            orderIndex = ch.OrderIndex,
            lessons = ch.Lessons.OrderBy(l => l.OrderIndex).Select(les => new
            {
                id = les.Id,
                title = les.Title,
                slug = les.Slug,
                status = les.Status,
                orderIndex = les.OrderIndex
            }).ToList()
        }).ToList();

        return Ok(new
        {
            id = s.Id,
            name = s.Name,
            code = s.Code,
            grade = s.Grade,
            description = s.Description ?? "",
            chapters
        });
    }

    [HttpGet("lessons")]
    public async Task<IActionResult> ListLessons(
        [FromQuery] string? status = null,
        [FromQuery] string? subjectId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.ContentLessons.Include(l => l.Author).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(l => l.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            var chapterIds = await _db.ContentChapters
                .Where(c => c.SubjectId == subjectId)
                .Select(c => c.Id)
                .ToListAsync();

            query = query.Where(l => chapterIds.Contains(l.ChapterId));
        }

        var total = await query.CountAsync();
        var lessons = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            items = lessons.Select(l => FormatLesson(l, l.Author)).ToList(),
            page,
            pageSize,
            total
        });
    }

    [HttpGet("lessons/{lessonId}")]
    public async Task<IActionResult> GetLessonDetail(string lessonId)
    {
        var les = await _db.ContentLessons
            .Include(l => l.Author)
            .FirstOrDefaultAsync(l => l.Id == lessonId);

        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        return Ok(FormatLesson(les, les.Author));
    }

    [HttpPost("lessons")]
    public async Task<IActionResult> CreateLesson([FromBody] CreateLessonRequestDto req)
    {
        var chapter = await _db.ContentChapters.FindAsync(req.ChapterId);
        if (chapter == null)
            return BadRequest(new { detail = "Chương học không tồn tại." });

        var lessonId = $"les_{Guid.NewGuid():N}";
        var les = new ContentLesson
        {
            Id = lessonId,
            ChapterId = req.ChapterId,
            Title = req.Title,
            Slug = req.Slug,
            OrderIndex = 0,
            Status = "draft",
            AuthorId = CurrentUserId,
            Introduction = req.Introduction,
            DefinitionsJson = req.Definitions?.ToJsonString(),
            FormulasJson = req.Formulas?.ToJsonString(),
            ExamplesJson = req.Examples?.ToJsonString(),
            ImportantNotesJson = req.ImportantNotes?.ToJsonString(),
            SummaryPointsJson = req.SummaryPoints?.ToJsonString(),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentLessons.Add(les);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "content_created",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new { title = les.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        var author = await _db.Users.FindAsync(CurrentUserId);
        return StatusCode(201, FormatLesson(les, author));
    }

    [HttpPatch("lessons/{lessonId}")]
    public async Task<IActionResult> UpdateLesson(string lessonId, [FromBody] UpdateLessonRequestDto req)
    {
        var les = await _db.ContentLessons
            .Include(l => l.Author)
            .FirstOrDefaultAsync(l => l.Id == lessonId);

        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        if (req.Title != null) les.Title = req.Title;
        if (req.Slug != null) les.Slug = req.Slug;
        if (req.Introduction != null) les.Introduction = req.Introduction;
        if (req.Definitions != null) les.DefinitionsJson = req.Definitions.ToJsonString();
        if (req.Formulas != null) les.FormulasJson = req.Formulas.ToJsonString();
        if (req.Examples != null) les.ExamplesJson = req.Examples.ToJsonString();
        if (req.ImportantNotes != null) les.ImportantNotesJson = req.ImportantNotes.ToJsonString();
        if (req.SummaryPoints != null) les.SummaryPointsJson = req.SummaryPoints.ToJsonString();

        les.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(FormatLesson(les, les.Author));
    }

    [HttpPost("lessons/{lessonId}/submit-review")]
    public async Task<IActionResult> SubmitReview(string lessonId)
    {
        var les = await _db.ContentLessons.Include(l => l.Author).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        if (les.Status != "draft")
            return BadRequest(new { detail = $"Chỉ có bài học trạng thái 'draft' mới có thể gửi duyệt. Trạng thái hiện tại: {les.Status}" });

        les.Status = "in-review";
        les.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "content_submitted",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new { title = les.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatLesson(les, les.Author));
    }

    [HttpPost("lessons/{lessonId}/approve")]
    public async Task<IActionResult> ApproveLesson(string lessonId)
    {
        var les = await _db.ContentLessons.Include(l => l.Author).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        if (les.Status != "in-review")
            return BadRequest(new { detail = $"Chỉ có bài học đang chờ duyệt ('in-review') mới có thể xuất bản. Trạng thái hiện tại: {les.Status}" });

        les.Status = "published";
        les.ReviewedBy = CurrentUserId;
        les.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "content_approved",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new { title = les.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatLesson(les, les.Author));
    }

    [HttpPost("lessons/{lessonId}/request-changes")]
    public async Task<IActionResult> RequestChanges(string lessonId, [FromBody] JsonObject? body = null)
    {
        var les = await _db.ContentLessons.Include(l => l.Author).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        if (les.Status != "in-review")
            return BadRequest(new { detail = $"Chỉ có bài học đang chờ duyệt ('in-review') mới có thể yêu cầu chỉnh sửa. Trạng thái hiện tại: {les.Status}" });

        les.Status = "draft";
        les.UpdatedAt = DateTimeOffset.UtcNow;

        string? feedback = body?["feedback"]?.ToString();
        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "content_changes_requested",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new { title = les.Title, feedback }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatLesson(les, les.Author));
    }

    private static ContentLessonDetailDto FormatLesson(ContentLesson lesson, User? author)
    {
        static JsonArray SafeJsonArray(string? val)
        {
            if (string.IsNullOrEmpty(val)) return new JsonArray();
            try { return JsonNode.Parse(val) as JsonArray ?? new JsonArray(); } catch { return new JsonArray(); }
        }

        return new ContentLessonDetailDto
        {
            Id = lesson.Id,
            ChapterId = lesson.ChapterId,
            Title = lesson.Title,
            Slug = lesson.Slug,
            OrderIndex = lesson.OrderIndex,
            Status = lesson.Status,
            AuthorId = lesson.AuthorId,
            AuthorName = author?.DisplayName ?? "",
            ReviewedBy = lesson.ReviewedBy,
            Introduction = lesson.Introduction ?? "",
            Definitions = SafeJsonArray(lesson.DefinitionsJson),
            Formulas = SafeJsonArray(lesson.FormulasJson),
            Examples = SafeJsonArray(lesson.ExamplesJson),
            ImportantNotes = SafeJsonArray(lesson.ImportantNotesJson),
            SummaryPoints = SafeJsonArray(lesson.SummaryPointsJson),
            CreatedAt = lesson.CreatedAt.ToString("o"),
            UpdatedAt = lesson.UpdatedAt.ToString("o")
        };
    }
}
