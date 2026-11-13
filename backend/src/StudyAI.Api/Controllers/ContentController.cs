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

    private bool IsAuthorizedReviewer =>
        User.IsInRole("content") ||
        User.IsInRole("admin") ||
        User.IsInRole("reviewer") ||
        User.HasClaim("permission", "content.approve") ||
        User.HasClaim("reviewer", "true");

    #region Subject Endpoints

    [HttpGet("subjects")]
    public async Task<IActionResult> ListSubjects(
        [FromQuery] string? search = null,
        [FromQuery] string? grade = null,
        [FromQuery] bool? isActive = null)
    {
        var query = _db.ContentSubjects
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) || s.Code.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(grade) && grade != "all")
        {
            query = query.Where(s => s.Grade == grade);
        }

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        var subjects = await query
            .OrderBy(s => s.OrderIndex)
            .ThenBy(s => s.Name)
            .ToListAsync();

        var result = subjects.Select(s => new ContentSubjectItemDto
        {
            Id = s.Id,
            Name = s.Name,
            Code = s.Code,
            Grade = s.Grade,
            Description = s.Description ?? "",
            OrderIndex = s.OrderIndex,
            IsActive = s.IsActive,
            ChapterCount = s.Chapters.Count,
            LessonCount = s.Chapters.Sum(c => c.Lessons.Count),
            CreatedAt = s.CreatedAt.ToString("o"),
            UpdatedAt = s.UpdatedAt.ToString("o")
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
            description = ch.Description ?? "",
            orderIndex = ch.OrderIndex,
            isActive = ch.IsActive,
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
            orderIndex = s.OrderIndex,
            isActive = s.IsActive,
            createdAt = s.CreatedAt.ToString("o"),
            updatedAt = s.UpdatedAt.ToString("o"),
            chapters
        });
    }

    [HttpPost("subjects")]
    public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Code))
            return BadRequest(new { detail = "Tên môn học và mã môn học không được để trống." });

        var normalizedCode = req.Code.Trim().ToUpperInvariant();
        var existing = await _db.ContentSubjects.AnyAsync(s => s.Code == normalizedCode);
        if (existing)
            return Conflict(new { detail = $"Mã môn học '{normalizedCode}' đã tồn tại." });

        var subject = new ContentSubject
        {
            Id = $"sub_{normalizedCode.ToLowerInvariant()}",
            Name = req.Name.Trim(),
            Code = normalizedCode,
            Grade = string.IsNullOrWhiteSpace(req.Grade) ? "12" : req.Grade.Trim(),
            Description = req.Description?.Trim(),
            OrderIndex = req.OrderIndex,
            IsActive = req.IsActive,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentSubjects.Add(subject);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "subject_created",
            TargetType = "content_subject",
            TargetId = subject.Id,
            Payload = JsonSerializer.Serialize(new { name = subject.Name, code = subject.Code }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return StatusCode(201, new ContentSubjectItemDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Code = subject.Code,
            Grade = subject.Grade,
            Description = subject.Description ?? "",
            OrderIndex = subject.OrderIndex,
            IsActive = subject.IsActive,
            ChapterCount = 0,
            LessonCount = 0,
            CreatedAt = subject.CreatedAt.ToString("o"),
            UpdatedAt = subject.UpdatedAt.ToString("o")
        });
    }

    [HttpPatch("subjects/{subjectId}")]
    public async Task<IActionResult> UpdateSubject(string subjectId, [FromBody] UpdateSubjectRequestDto req)
    {
        var subject = await _db.ContentSubjects.FindAsync(subjectId);
        if (subject == null)
            return NotFound(new { detail = "Môn học không tồn tại." });

        if (!string.IsNullOrWhiteSpace(req.Code) && req.Code.Trim().ToUpperInvariant() != subject.Code)
        {
            var newCode = req.Code.Trim().ToUpperInvariant();
            var codeExists = await _db.ContentSubjects.AnyAsync(s => s.Code == newCode && s.Id != subjectId);
            if (codeExists)
                return Conflict(new { detail = $"Mã môn học '{newCode}' đã được sử dụng." });
            subject.Code = newCode;
        }

        if (!string.IsNullOrWhiteSpace(req.Name)) subject.Name = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.Grade)) subject.Grade = req.Grade.Trim();
        if (req.Description != null) subject.Description = req.Description.Trim();
        if (req.OrderIndex.HasValue) subject.OrderIndex = req.OrderIndex.Value;
        if (req.IsActive.HasValue) subject.IsActive = req.IsActive.Value;

        subject.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "subject_updated",
            TargetType = "content_subject",
            TargetId = subject.Id,
            Payload = JsonSerializer.Serialize(new { name = subject.Name, code = subject.Code }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new ContentSubjectItemDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Code = subject.Code,
            Grade = subject.Grade,
            Description = subject.Description ?? "",
            OrderIndex = subject.OrderIndex,
            IsActive = subject.IsActive,
            ChapterCount = await _db.ContentChapters.CountAsync(c => c.SubjectId == subject.Id),
            LessonCount = await _db.ContentLessons.CountAsync(l => l.Chapter!.SubjectId == subject.Id),
            CreatedAt = subject.CreatedAt.ToString("o"),
            UpdatedAt = subject.UpdatedAt.ToString("o")
        });
    }

    [HttpDelete("subjects/{subjectId}")]
    public async Task<IActionResult> DeleteSubject(string subjectId)
    {
        var subject = await _db.ContentSubjects
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
            .FirstOrDefaultAsync(s => s.Id == subjectId);

        if (subject == null)
            return NotFound(new { detail = "Môn học không tồn tại." });

        // Safety Invariant: Check if dependent chapters or learning progress exist
        var chapterCount = subject.Chapters.Count;
        var lessonCount = subject.Chapters.Sum(c => c.Lessons.Count);
        if (chapterCount > 0 || lessonCount > 0)
        {
            return BadRequest(new
            {
                detail = $"Không thể xóa môn học đang có {chapterCount} chương và {lessonCount} bài học. Vui lòng xóa hoặc chuyển các nội dung con trước."
            });
        }

        var progressExists = await _db.LessonProgresses.AnyAsync(p => p.SubjectId == subjectId);
        if (progressExists)
        {
            return BadRequest(new { detail = "Không thể xóa môn học đã có dữ liệu tiến độ học sinh." });
        }

        _db.ContentSubjects.Remove(subject);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "subject_deleted",
            TargetType = "content_subject",
            TargetId = subjectId,
            Payload = JsonSerializer.Serialize(new { name = subject.Name, code = subject.Code }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã xóa môn học '{subject.Name}' thành công." });
    }

    #endregion

    #region Chapter Endpoints

    [HttpGet("chapters")]
    public async Task<IActionResult> ListChapters([FromQuery] string? subjectId = null, [FromQuery] string? search = null)
    {
        var query = _db.ContentChapters
            .Include(c => c.Subject)
            .Include(c => c.Lessons)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            query = query.Where(c => c.SubjectId == subjectId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c => c.Title.ToLower().Contains(term));
        }

        var chapters = await query
            .OrderBy(c => c.OrderIndex)
            .ThenBy(c => c.CreatedAt)
            .ToListAsync();

        var result = chapters.Select(c => new ContentChapterItemDto
        {
            Id = c.Id,
            SubjectId = c.SubjectId,
            SubjectName = c.Subject?.Name ?? "",
            Title = c.Title,
            Description = c.Description ?? "",
            OrderIndex = c.OrderIndex,
            IsActive = c.IsActive,
            LessonCount = c.Lessons.Count,
            CreatedAt = c.CreatedAt.ToString("o"),
            UpdatedAt = c.UpdatedAt.ToString("o")
        }).ToList();

        return Ok(new { items = result, total = result.Count });
    }

    [HttpGet("chapters/{chapterId}")]
    public async Task<IActionResult> GetChapterDetail(string chapterId)
    {
        var chapter = await _db.ContentChapters
            .Include(c => c.Subject)
            .Include(c => c.Lessons)
            .FirstOrDefaultAsync(c => c.Id == chapterId);

        if (chapter == null)
            return NotFound(new { detail = "Chương học không tồn tại." });

        return Ok(new ContentChapterItemDto
        {
            Id = chapter.Id,
            SubjectId = chapter.SubjectId,
            SubjectName = chapter.Subject?.Name ?? "",
            Title = chapter.Title,
            Description = chapter.Description ?? "",
            OrderIndex = chapter.OrderIndex,
            IsActive = chapter.IsActive,
            LessonCount = chapter.Lessons.Count,
            CreatedAt = chapter.CreatedAt.ToString("o"),
            UpdatedAt = chapter.UpdatedAt.ToString("o")
        });
    }

    [HttpPost("chapters")]
    public async Task<IActionResult> CreateChapter([FromBody] CreateChapterRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.SubjectId) || string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { detail = "SubjectId và Tiêu đề chương không được để trống." });

        var subject = await _db.ContentSubjects.FindAsync(req.SubjectId);
        if (subject == null)
            return BadRequest(new { detail = "Môn học không tồn tại." });

        var chapter = new ContentChapter
        {
            Id = $"chp_{Guid.NewGuid():N}",
            SubjectId = req.SubjectId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            OrderIndex = req.OrderIndex,
            IsActive = req.IsActive,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentChapters.Add(chapter);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "chapter_created",
            TargetType = "content_chapter",
            TargetId = chapter.Id,
            Payload = JsonSerializer.Serialize(new { title = chapter.Title, subjectId = chapter.SubjectId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return StatusCode(201, new ContentChapterItemDto
        {
            Id = chapter.Id,
            SubjectId = chapter.SubjectId,
            SubjectName = subject.Name,
            Title = chapter.Title,
            Description = chapter.Description ?? "",
            OrderIndex = chapter.OrderIndex,
            IsActive = chapter.IsActive,
            LessonCount = 0,
            CreatedAt = chapter.CreatedAt.ToString("o"),
            UpdatedAt = chapter.UpdatedAt.ToString("o")
        });
    }

    [HttpPatch("chapters/{chapterId}")]
    public async Task<IActionResult> UpdateChapter(string chapterId, [FromBody] UpdateChapterRequestDto req)
    {
        var chapter = await _db.ContentChapters.Include(c => c.Subject).FirstOrDefaultAsync(c => c.Id == chapterId);
        if (chapter == null)
            return NotFound(new { detail = "Chương học không tồn tại." });

        if (!string.IsNullOrWhiteSpace(req.Title)) chapter.Title = req.Title.Trim();
        if (req.Description != null) chapter.Description = req.Description.Trim();
        if (req.OrderIndex.HasValue) chapter.OrderIndex = req.OrderIndex.Value;
        if (req.IsActive.HasValue) chapter.IsActive = req.IsActive.Value;

        chapter.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "chapter_updated",
            TargetType = "content_chapter",
            TargetId = chapter.Id,
            Payload = JsonSerializer.Serialize(new { title = chapter.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        var lessonCount = await _db.ContentLessons.CountAsync(l => l.ChapterId == chapter.Id);

        return Ok(new ContentChapterItemDto
        {
            Id = chapter.Id,
            SubjectId = chapter.SubjectId,
            SubjectName = chapter.Subject?.Name ?? "",
            Title = chapter.Title,
            Description = chapter.Description ?? "",
            OrderIndex = chapter.OrderIndex,
            IsActive = chapter.IsActive,
            LessonCount = lessonCount,
            CreatedAt = chapter.CreatedAt.ToString("o"),
            UpdatedAt = chapter.UpdatedAt.ToString("o")
        });
    }

    [HttpDelete("chapters/{chapterId}")]
    public async Task<IActionResult> DeleteChapter(string chapterId)
    {
        var chapter = await _db.ContentChapters.Include(c => c.Lessons).FirstOrDefaultAsync(c => c.Id == chapterId);
        if (chapter == null)
            return NotFound(new { detail = "Chương học không tồn tại." });

        if (chapter.Lessons.Count > 0)
        {
            return BadRequest(new
            {
                detail = $"Không thể xóa chương đang chứa {chapter.Lessons.Count} bài học. Vui lòng chuyển hoặc xóa bài học trước."
            });
        }

        _db.ContentChapters.Remove(chapter);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "chapter_deleted",
            TargetType = "content_chapter",
            TargetId = chapterId,
            Payload = JsonSerializer.Serialize(new { title = chapter.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã xóa chương '{chapter.Title}' thành công." });
    }

    #endregion

    #region Lesson Endpoints

    [HttpGet("lessons")]
    public async Task<IActionResult> ListLessons(
        [FromQuery] string? status = null,
        [FromQuery] string? subjectId = null,
        [FromQuery] string? chapterId = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.ContentLessons
            .Include(l => l.Author)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .Include(l => l.Questions)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(l => l.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            query = query.Where(l => l.Chapter!.SubjectId == subjectId);
        }

        if (!string.IsNullOrWhiteSpace(chapterId) && chapterId != "all")
        {
            query = query.Where(l => l.ChapterId == chapterId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(l => l.Title.ToLower().Contains(term) || l.Slug.ToLower().Contains(term));
        }

        var total = await query.CountAsync();
        var lessons = await query
            .OrderBy(l => l.OrderIndex)
            .ThenByDescending(l => l.CreatedAt)
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
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .Include(l => l.Questions)
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

        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Slug))
            return BadRequest(new { detail = "Tiêu đề và Slug của bài học không được để trống." });

        var lessonId = $"les_{Guid.NewGuid():N}";
        var les = new ContentLesson
        {
            Id = lessonId,
            ChapterId = req.ChapterId,
            Title = req.Title.Trim(),
            Slug = req.Slug.Trim().ToLowerInvariant(),
            OrderIndex = req.OrderIndex,
            Status = "draft",
            AuthorId = CurrentUserId,
            Introduction = req.Introduction,
            DefinitionsJson = req.Definitions?.ToJsonString() ?? "[]",
            FormulasJson = req.Formulas?.ToJsonString() ?? "[]",
            ExamplesJson = req.Examples?.ToJsonString() ?? "[]",
            ImportantNotesJson = req.ImportantNotes?.ToJsonString() ?? "[]",
            SummaryPointsJson = req.SummaryPoints?.ToJsonString() ?? "[]",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentLessons.Add(les);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_created",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new { title = les.Title, chapterId = les.ChapterId }),
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
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .Include(l => l.Questions)
            .FirstOrDefaultAsync(l => l.Id == lessonId);

        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        if (req.Title != null) les.Title = req.Title.Trim();
        if (req.Slug != null) les.Slug = req.Slug.Trim().ToLowerInvariant();
        if (req.OrderIndex.HasValue) les.OrderIndex = req.OrderIndex.Value;
        if (req.Introduction != null) les.Introduction = req.Introduction;
        if (req.Definitions != null) les.DefinitionsJson = req.Definitions.ToJsonString();
        if (req.Formulas != null) les.FormulasJson = req.Formulas.ToJsonString();
        if (req.Examples != null) les.ExamplesJson = req.Examples.ToJsonString();
        if (req.ImportantNotes != null) les.ImportantNotesJson = req.ImportantNotes.ToJsonString();
        if (req.SummaryPoints != null) les.SummaryPointsJson = req.SummaryPoints.ToJsonString();

        les.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_updated",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new { title = les.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(FormatLesson(les, les.Author));
    }

    [HttpDelete("lessons/{lessonId}")]
    public async Task<IActionResult> DeleteLesson(string lessonId)
    {
        var les = await _db.ContentLessons.FindAsync(lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        // Safety Invariant: Check if students have started or completed this lesson
        var progressExists = await _db.LessonProgresses.AnyAsync(p => p.LessonId == lessonId);
        if (progressExists)
        {
            return BadRequest(new
            {
                detail = "Không thể xóa bài học này vì đã có dữ liệu tiến độ học tập của học viên. Vui lòng chuyển trạng thái sang 'archived' thay vì xóa."
            });
        }

        _db.ContentLessons.Remove(les);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_deleted",
            TargetType = "content_lesson",
            TargetId = lessonId,
            Payload = JsonSerializer.Serialize(new { title = les.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã xóa bài học '{les.Title}' thành công." });
    }

    #endregion

    #region Lesson Moderation Workflow

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
            Action = "lesson_submitted",
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
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền phê duyệt bài học." });
        }

        var les = await _db.ContentLessons.Include(l => l.Author).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        if (les.Status != "in-review" && les.Status != "draft")
            return BadRequest(new { detail = $"Chỉ có bài học đang chờ duyệt ('in-review') hoặc bản nháp ('draft') mới có thể phê duyệt xuất bản. Trạng thái hiện tại: {les.Status}" });

        // VNHSGE Copyright Gate: Unlicensed VNHSGE items cannot be published
        if (les.Title.Contains("VNHSGE", StringComparison.OrdinalIgnoreCase) ||
            les.Introduction?.Contains("VNHSGE", StringComparison.OrdinalIgnoreCase) == true)
        {
            return StatusCode(403, new
            {
                detail = "Nội dung thuộc bộ khảo cứu VNHSGE đang chịu cơ chế khóa bản quyền học thuật (CC BY-NC-SA 4.0 / arXiv:2305.12199). Không thể xuất bản công khai khi chưa có giấy phép hợp lệ."
            });
        }

        les.Status = "published";
        les.ReviewedBy = CurrentUserId;
        les.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_approved",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new { title = les.Title, authorId = les.AuthorId, reviewerId = CurrentUserId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatLesson(les, les.Author));
    }

    [HttpPost("lessons/{lessonId}/publish")]
    public async Task<IActionResult> PublishLesson(string lessonId)
    {
        return await ApproveLesson(lessonId);
    }

    [HttpPost("lessons/{lessonId}/unpublish")]
    public async Task<IActionResult> UnpublishLesson(string lessonId)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền gỡ xuất bản bài học." });
        }

        var les = await _db.ContentLessons.Include(l => l.Author).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        les.Status = "draft";
        les.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_unpublished",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new { title = les.Title, unpublisherId = CurrentUserId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatLesson(les, les.Author));
    }

    [HttpPost("lessons/{lessonId}/request-changes")]
    public async Task<IActionResult> RequestChanges(string lessonId, [FromBody] JsonObject? body = null)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền yêu cầu chỉnh sửa/từ chối bài học." });
        }

        var les = await _db.ContentLessons.Include(l => l.Author).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        les.Status = "draft";
        les.UpdatedAt = DateTimeOffset.UtcNow;

        string? feedback = body?["feedback"]?.ToString();
        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_changes_requested",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new { title = les.Title, feedback, authorId = les.AuthorId, reviewerId = CurrentUserId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatLesson(les, les.Author));
    }

    [HttpPost("lessons/{lessonId}/reject")]
    public async Task<IActionResult> RejectLesson(string lessonId, [FromBody] JsonObject? body = null)
    {
        return await RequestChanges(lessonId, body);
    }

    #endregion

    #region Question Bank Endpoints

    [HttpGet("questions")]
    public async Task<IActionResult> ListQuestions(
        [FromQuery] string? lessonId = null,
        [FromQuery] string? subjectId = null,
        [FromQuery] string? chapterId = null,
        [FromQuery] string? grade = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? type = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sourceType = null,
        [FromQuery] string? search = null,
        [FromQuery] bool includeDeleted = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .AsQueryable();

        if (!includeDeleted)
        {
            query = query.Where(q => !q.IsDeleted);
        }

        if (!string.IsNullOrWhiteSpace(lessonId) && lessonId != "all")
            query = query.Where(q => q.LessonId == lessonId);

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
            query = query.Where(q => q.SubjectId == subjectId || (q.Lesson != null && q.Lesson.Chapter != null && q.Lesson.Chapter.SubjectId == subjectId));

        if (!string.IsNullOrWhiteSpace(chapterId) && chapterId != "all")
            query = query.Where(q => q.ChapterId == chapterId || (q.Lesson != null && q.Lesson.ChapterId == chapterId));

        if (!string.IsNullOrWhiteSpace(grade) && grade != "all")
            query = query.Where(q => q.Grade == grade || (q.Lesson != null && q.Lesson.Chapter != null && q.Lesson.Chapter.Subject != null && q.Lesson.Chapter.Subject.Grade == grade));

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

        var total = await query.CountAsync();
        var questions = await query
            .OrderBy(q => q.OrderIndex)
            .ThenByDescending(q => q.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(pageSize, 1, 100))
            .Take(Math.Clamp(pageSize, 1, 100))
            .ToListAsync();

        var result = questions.Select(FormatQuestion).ToList();
        return Ok(new { items = result, total, page, pageSize });
    }

    [HttpGet("questions/statistics")]
    public async Task<IActionResult> GetQuestionStatistics()
    {
        var allQuestions = await _db.ContentQuestions
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .ToListAsync();

        var nonDeleted = allQuestions.Where(q => !q.IsDeleted).ToList();

        var stats = new QuestionStatsDto
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
                .GroupBy(q => q.Lesson?.Chapter?.Subject?.Name ?? q.SubjectId ?? "Chưa phân loại")
                .ToDictionary(g => g.Key, g => g.Count()),
            BySource = nonDeleted
                .GroupBy(q => string.IsNullOrWhiteSpace(q.SourceType) ? "manual" : q.SourceType)
                .ToDictionary(g => g.Key, g => g.Count())
        };

        return Ok(stats);
    }

    [HttpGet("questions/{questionId}")]
    public async Task<IActionResult> GetQuestionDetail(string questionId)
    {
        var q = await _db.ContentQuestions
            .Include(x => x.Author)
            .Include(x => x.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(x => x.Id == questionId);

        if (q == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        return Ok(FormatQuestion(q));
    }

    [HttpPost("questions")]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateQuestionRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Prompt))
            return BadRequest(new { detail = "Nội dung câu hỏi không được để trống." });

        var qType = string.IsNullOrWhiteSpace(req.Type) ? "multiple-choice" : req.Type.ToLowerInvariant();

        if (qType == "multiple-choice" || qType == "single-choice")
        {
            if (string.IsNullOrWhiteSpace(req.CorrectAnswer))
                return BadRequest(new { detail = "Câu hỏi trắc nghiệm một đáp án yêu cầu phải có đáp án đúng." });
            if (req.Options == null || req.Options.Count < 2)
                return BadRequest(new { detail = "Câu hỏi trắc nghiệm phải có ít nhất 2 phương án lựa chọn." });
            if (!req.Options.Contains(req.CorrectAnswer))
                return BadRequest(new { detail = "Đáp án đúng phải nằm trong danh sách các phương án lựa chọn." });
        }
        else if (qType == "multiple-select")
        {
            if (string.IsNullOrWhiteSpace(req.CorrectAnswer))
                return BadRequest(new { detail = "Câu hỏi trắc nghiệm nhiều đáp án yêu cầu phải có đáp án đúng." });
            if (req.Options == null || req.Options.Count < 2)
                return BadRequest(new { detail = "Câu hỏi trắc nghiệm nhiều đáp án phải có ít nhất 2 phương án lựa chọn." });
        }
        else if (qType == "true-false")
        {
            if (string.IsNullOrWhiteSpace(req.CorrectAnswer) && string.IsNullOrWhiteSpace(req.MetadataJson))
                return BadRequest(new { detail = "Câu hỏi đúng/sai yêu cầu đáp án đúng (Đúng/Sai) hoặc danh sách mệnh đề." });
        }
        else if (qType == "short-answer")
        {
            if (string.IsNullOrWhiteSpace(req.CorrectAnswer))
                return BadRequest(new { detail = "Câu hỏi trả lời ngắn yêu cầu kết quả mẫu/đáp án chuẩn." });
        }

        string? resolvedSubjectId = req.SubjectId;
        string? resolvedChapterId = req.ChapterId;
        string? resolvedGrade = req.Grade;

        if (!string.IsNullOrWhiteSpace(req.LessonId))
        {
            var lesson = await _db.ContentLessons
                .Include(l => l.Chapter)
                    .ThenInclude(c => c!.Subject)
                .FirstOrDefaultAsync(l => l.Id == req.LessonId);

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

        var question = new ContentQuestion
        {
            Id = $"qst_{Guid.NewGuid():N}",
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
            Status = string.IsNullOrWhiteSpace(req.Status) ? "published" : req.Status,
            OrderIndex = req.OrderIndex,
            ImageUrl = req.ImageUrl,
            MetadataJson = req.MetadataJson,
            AuthorId = CurrentUserId,
            ReviewedBy = User.IsInRole("content") && req.Status == "published" ? CurrentUserId : null,
            SourceType = string.IsNullOrWhiteSpace(req.SourceType) ? "manual" : req.SourceType,
            SourceBatchId = req.SourceBatchId,
            SourceUrl = req.SourceUrl,
            CopyrightStatus = string.IsNullOrWhiteSpace(req.CopyrightStatus) ? "proprietary" : req.CopyrightStatus,
            CopyrightProofRef = req.CopyrightProofRef,
            Version = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentQuestions.Add(question);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_created",
            TargetType = "content_question",
            TargetId = question.Id,
            Payload = JsonSerializer.Serialize(new
            {
                code = question.Code,
                prompt = question.Prompt.Substring(0, Math.Min(60, question.Prompt.Length)),
                type = question.Type,
                status = question.Status
            }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return StatusCode(201, FormatQuestion(question));
    }

    [HttpPut("questions/{questionId}")]
    public async Task<IActionResult> PutQuestion(string questionId, [FromBody] UpdateQuestionRequestDto req)
    {
        return await HandleUpdateQuestion(questionId, req);
    }

    [HttpPatch("questions/{questionId}")]
    public async Task<IActionResult> UpdateQuestion(string questionId, [FromBody] UpdateQuestionRequestDto req)
    {
        return await HandleUpdateQuestion(questionId, req);
    }

    private async Task<IActionResult> HandleUpdateQuestion(string questionId, UpdateQuestionRequestDto req)
    {
        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        if (req.Code != null) question.Code = req.Code.Trim();
        if (req.Prompt != null) question.Prompt = req.Prompt.Trim();
        if (req.Options != null) question.OptionsJson = JsonSerializer.Serialize(req.Options);
        if (req.CorrectAnswer != null) question.CorrectAnswer = req.CorrectAnswer.Trim();
        if (req.Explanation != null) question.Explanation = req.Explanation.Trim();
        if (req.Topic != null) question.Topic = req.Topic.Trim();
        if (req.Difficulty != null) question.Difficulty = req.Difficulty.Trim();
        if (req.Type != null) question.Type = req.Type.Trim();
        if (req.Grade != null) question.Grade = req.Grade.Trim();
        if (req.Status != null) question.Status = req.Status.Trim();
        if (req.OrderIndex.HasValue) question.OrderIndex = req.OrderIndex.Value;
        if (req.LessonId != null) question.LessonId = req.LessonId;
        if (req.SubjectId != null) question.SubjectId = req.SubjectId;
        if (req.ChapterId != null) question.ChapterId = req.ChapterId;
        if (req.ImageUrl != null) question.ImageUrl = req.ImageUrl;
        if (req.MetadataJson != null) question.MetadataJson = req.MetadataJson;
        if (req.SourceType != null) question.SourceType = req.SourceType;
        if (req.CopyrightStatus != null) question.CopyrightStatus = req.CopyrightStatus;
        if (req.CopyrightProofRef != null) question.CopyrightProofRef = req.CopyrightProofRef;

        question.Version += 1;
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_updated",
            TargetType = "content_question",
            TargetId = question.Id,
            Payload = JsonSerializer.Serialize(new
            {
                code = question.Code,
                version = question.Version,
                prompt = question.Prompt.Substring(0, Math.Min(60, question.Prompt.Length))
            }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatQuestion(question));
    }

    [HttpDelete("questions/{questionId}")]
    public async Task<IActionResult> DeleteQuestion(string questionId)
    {
        var question = await _db.ContentQuestions.FindAsync(questionId);
        if (question == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        question.IsDeleted = true;
        question.DeletedAt = DateTimeOffset.UtcNow;
        question.DeletedBy = CurrentUserId;
        question.Status = "archived";
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_soft_deleted",
            TargetType = "content_question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new
            {
                prompt = question.Prompt.Substring(0, Math.Min(60, question.Prompt.Length)),
                code = question.Code
            }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã chuyển câu hỏi vào thùng rác (xóa mềm) thành công." });
    }

    [HttpPost("questions/{questionId}/restore")]
    public async Task<IActionResult> RestoreQuestion(string questionId)
    {
        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        if (!question.IsDeleted)
            return BadRequest(new { detail = "Câu hỏi này đang hoạt động, không ở trạng thái đã xóa." });

        question.IsDeleted = false;
        question.DeletedAt = null;
        question.DeletedBy = null;
        question.Status = "draft";
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_restored",
            TargetType = "content_question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new { code = question.Code }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatQuestion(question));
    }

    [HttpPost("questions/{questionId}/submit-review")]
    public async Task<IActionResult> SubmitQuestionReview(string questionId)
    {
        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        question.Status = "in-review";
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_submitted_review",
            TargetType = "content_question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new { code = question.Code }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatQuestion(question));
    }

    [HttpPost("questions/{questionId}/approve")]
    public async Task<IActionResult> ApproveQuestion(string questionId)
    {
        if (!User.IsInRole("content"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "QUYỀN PHÊ DUYỆT: Role 'content' là người có thẩm quyền phê duyệt nội dung giáo dục cuối cùng. Admin hoặc vai trò khác không được phép phê duyệt câu hỏi."
            });
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        question.Status = "approved";
        question.ReviewedBy = CurrentUserId;
        question.RejectionReason = null;
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_approved",
            TargetType = "content_question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new { code = question.Code }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatQuestion(question));
    }

    [HttpPost("questions/{questionId}/reject")]
    public async Task<IActionResult> RejectQuestion(string questionId, [FromBody] RejectQuestionRequestDto? body = null)
    {
        if (!User.IsInRole("content"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "QUYỀN PHÊ DUYỆT: Role 'content' là người có thẩm quyền từ chối nội dung giáo dục cuối cùng."
            });
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        var reason = !string.IsNullOrWhiteSpace(body?.Reason)
            ? body.Reason.Trim()
            : "Nội dung câu hỏi chưa đạt tiêu chuẩn kiểm duyệt chất lượng.";

        question.Status = "rejected";
        question.ReviewedBy = CurrentUserId;
        question.RejectionReason = reason;
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_rejected",
            TargetType = "content_question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new { code = question.Code, reason }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatQuestion(question));
    }

    [HttpPost("questions/{questionId}/publish")]
    public async Task<IActionResult> PublishQuestion(string questionId)
    {
        if (!User.IsInRole("content"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "QUYỀN PHÊ DUYỆT: Role 'content' là người có thẩm quyền xuất bản nội dung giáo dục cuối cùng."
            });
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        // Server-Side Copyright Gate: Unverified external/VNHSGE dataset items cannot be published to live learners
        if (question.SourceType == "vnhsge" && question.CopyrightStatus != "verified")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "BẢN QUYỀN: Bộ câu hỏi VNHSGE chưa được xác minh giấy phép thương mại/phát hành công khai từ phía máy chủ (CopyrightStatus != 'verified'). Không được phép xuất bản cho học viên làm bài thi."
            });
        }

        question.Status = "published";
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_published",
            TargetType = "content_question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new { code = question.Code }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatQuestion(question));
    }

    [HttpPost("questions/{questionId}/unpublish")]
    public async Task<IActionResult> UnpublishQuestion(string questionId)
    {
        if (!User.IsInRole("content"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "QUYỀN PHÊ DUYỆT: Role 'content' là người có thẩm quyền gỡ xuất bản nội dung giáo dục."
            });
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        question.Status = "draft";
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_unpublished",
            TargetType = "content_question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new { code = question.Code }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatQuestion(question));
    }

    #endregion

    #region Question Import Pipeline (Phase 5)

    [HttpPost("questions/import")]
    public async Task<IActionResult> ImportQuestions([FromBody] QuestionImportBatchRequestDto req)
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
            return Ok(result);
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
            .ToListAsync();

        var existingCodes = await _db.ContentQuestions
            .Where(q => !q.IsDeleted && q.Code != null && batchCodes.Contains(q.Code.ToLower()))
            .Select(q => q.Code!.Trim().ToLower())
            .ToListAsync();

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

            var question = new ContentQuestion
            {
                Id = $"qst_{Guid.NewGuid():N}",
                Code = code,
                Prompt = item.Prompt.Trim(),
                OptionsJson = JsonSerializer.Serialize(item.Options ?? new List<string>()),
                CorrectAnswer = item.CorrectAnswer?.Trim() ?? string.Empty,
                Explanation = item.Explanation?.Trim(),
                Topic = item.Topic?.Trim(),
                Difficulty = string.IsNullOrWhiteSpace(item.Difficulty) ? "medium" : item.Difficulty,
                Type = qType,
                Grade = item.Grade,
                SubjectId = item.SubjectId,
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
                AuthorId = CurrentUserId,
                Version = 1,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
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
            var strategy = _db.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync();
                try
                {
                    await _db.ContentQuestions.AddRangeAsync(validQuestions);

                    _db.StaffAuditLogs.Add(new StaffAuditLog
                    {
                        Id = $"log_{Guid.NewGuid():N}",
                        ActorUserId = CurrentUserId,
                        Action = "questions_batch_imported",
                        TargetType = "content_question_batch",
                        TargetId = batchId,
                        Payload = JsonSerializer.Serialize(new
                        {
                            batchId,
                            sourceType,
                            importedCount = validQuestions.Count,
                            licenseRef = copyrightProofRef
                        }),
                        CreatedAt = DateTimeOffset.UtcNow
                    });

                    await _db.SaveChangesAsync();
                    await tx.CommitAsync();

                    result.ImportedIds = validQuestions.Select(q => q.Id).ToList();
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            });
        }

        return Ok(result);
    }

    #endregion

    #region Helper Formatters

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
            ChapterTitle = lesson.Chapter?.Title ?? "",
            SubjectId = lesson.Chapter?.SubjectId ?? "",
            SubjectName = lesson.Chapter?.Subject?.Name ?? "",
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
            QuestionsCount = lesson.Questions?.Count ?? 0,
            CreatedAt = lesson.CreatedAt.ToString("o"),
            UpdatedAt = lesson.UpdatedAt.ToString("o")
        };
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
            SubjectName = q.Lesson?.Chapter?.Subject?.Name ?? "",
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

    #endregion
}
