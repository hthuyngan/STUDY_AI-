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

[Authorize(Policy = "ContentAuthor")]
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

    private bool IsAdminOrContentAdmin => User.IsInRole("admin") || User.IsInRole("content_admin");

    private bool IsAuthorizedReviewer =>
        !User.HasClaim("reviewer", "false") &&
        (User.IsInRole("content") ||
         User.IsInRole("admin") ||
         User.IsInRole("content_admin") ||
         User.IsInRole("reviewer") ||
         User.HasClaim("permission", "content.approve") ||
         User.HasClaim("reviewer", "true"));

    private bool CanManageContent(string? authorId)
    {
        if (IsAdminOrContentAdmin) return true;
        if (string.IsNullOrEmpty(CurrentUserId)) return false;
        return !string.IsNullOrEmpty(authorId) && authorId == CurrentUserId;
    }

    private async Task<ContentRevision> CreateLessonRevisionAsync(ContentLesson les, string reason, string? sourceRevisionId = null)
    {
        var count = await _db.ContentRevisions.CountAsync(r => r.ContentId == les.Id);
        var snapshot = new
        {
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
            Id = $"rev_l_{Guid.NewGuid():N}",
            ContentId = les.Id,
            ContentType = "lesson",
            Version = count + 1,
            Status = les.Status,
            Title = les.Title,
            SnapshotJson = JsonSerializer.Serialize(snapshot),
            AuthorId = les.AuthorId,
            CreatedBy = CurrentUserId,
            Reason = reason,
            SourceRevisionId = sourceRevisionId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentRevisions.Add(revision);
        return revision;
    }

    private async Task<ContentRevision> CreateQuestionRevisionAsync(ContentQuestion q, string reason, string? sourceRevisionId = null)
    {
        var count = await _db.ContentRevisions.CountAsync(r => r.ContentId == q.Id);
        var snapshot = new
        {
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
            Id = $"rev_q_{Guid.NewGuid():N}",
            ContentId = q.Id,
            ContentType = "question",
            Version = count + 1,
            Status = q.Status,
            Title = q.Prompt.Length > 80 ? q.Prompt[..80] : q.Prompt,
            SnapshotJson = JsonSerializer.Serialize(snapshot),
            AuthorId = q.AuthorId,
            CreatedBy = CurrentUserId,
            Reason = reason,
            SourceRevisionId = sourceRevisionId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentRevisions.Add(revision);
        return revision;
    }

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

    [Authorize(Policy = "ContentAdminOnly")]
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

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPut("subjects/{subjectId}")]
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

    [Authorize(Policy = "ContentAdminOnly")]
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

    [Authorize(Policy = "ContentAdminOnly")]
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

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPut("chapters/{chapterId}")]
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

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("chapters/reorder")]
    public async Task<IActionResult> ReorderChapters([FromBody] ReorderChaptersRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.SubjectId))
            return BadRequest(new { detail = "SubjectId không được để trống khi sắp xếp chương học." });

        if (req.ChapterIds == null || req.ChapterIds.Count == 0)
            return BadRequest(new { detail = "Danh sách chapterIds không được rỗng." });

        // 1. Kiểm tra ID trùng lặp
        if (req.ChapterIds.Distinct().Count() != req.ChapterIds.Count)
            return BadRequest(new { detail = "Danh sách chapterIds chứa mã chương trùng lặp." });

        // 2. Kiểm tra môn học tồn tại
        var subject = await _db.ContentSubjects.FindAsync(req.SubjectId);
        if (subject == null)
            return BadRequest(new { detail = "Môn học đã chỉ định không tồn tại." });

        // 3. Lấy tất cả chương thuộc môn học này
        var subjectChapters = await _db.ContentChapters
            .Where(c => c.SubjectId == req.SubjectId)
            .ToListAsync();

        if (subjectChapters.Count != req.ChapterIds.Count)
        {
            return BadRequest(new
            {
                detail = $"Số lượng chương gửi lên ({req.ChapterIds.Count}) không khớp với tổng số chương của môn học ({subjectChapters.Count}). Phải sắp xếp toàn bộ chương trong môn."
            });
        }

        var existingChapterMap = subjectChapters.ToDictionary(c => c.Id);
        foreach (var id in req.ChapterIds)
        {
            if (!existingChapterMap.ContainsKey(id))
            {
                return BadRequest(new
                {
                    detail = $"Mã chương '{id}' không tồn tại hoặc không thuộc môn học '{subject.Name}'."
                });
            }
        }

        // 4. Cập nhật thứ tự trong transaction nguyên tử
        using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            for (int i = 0; i < req.ChapterIds.Count; i++)
            {
                var id = req.ChapterIds[i];
                var ch = existingChapterMap[id];
                ch.OrderIndex = i + 1;
                ch.UpdatedAt = DateTimeOffset.UtcNow;
            }

            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "chapters_reordered",
                TargetType = "content_chapter",
                TargetId = req.SubjectId,
                Payload = JsonSerializer.Serialize(new { subjectId = req.SubjectId, count = req.ChapterIds.Count }),
                CreatedAt = DateTimeOffset.UtcNow
            });

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { success = true, message = $"Đã cập nhật thứ tự {req.ChapterIds.Count} chương thành công." });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    [Authorize(Policy = "ContentAdminOnly")]
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

    #region Topic Endpoints

    [HttpGet("topics")]
    public async Task<IActionResult> ListTopics([FromQuery] string? chapterId = null, [FromQuery] string? search = null)
    {
        var query = _db.ContentTopics
            .Include(t => t.Chapter)
            .Include(t => t.Lessons)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(chapterId) && chapterId != "all")
        {
            query = query.Where(t => t.ChapterId == chapterId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(term));
        }

        var topics = await query
            .OrderBy(t => t.OrderIndex)
            .ThenBy(t => t.CreatedAt)
            .ToListAsync();

        var result = topics.Select(t => new ContentTopicItemDto
        {
            Id = t.Id,
            ChapterId = t.ChapterId,
            ChapterTitle = t.Chapter?.Title ?? "",
            Title = t.Title,
            Description = t.Description ?? "",
            OrderIndex = t.OrderIndex,
            IsActive = t.IsActive,
            LessonCount = t.Lessons.Count,
            CreatedAt = t.CreatedAt.ToString("o"),
            UpdatedAt = t.UpdatedAt.ToString("o")
        }).ToList();

        return Ok(new { items = result, total = result.Count });
    }

    [HttpGet("topics/{topicId}")]
    public async Task<IActionResult> GetTopicDetail(string topicId)
    {
        var topic = await _db.ContentTopics
            .Include(t => t.Chapter)
            .Include(t => t.Lessons)
            .FirstOrDefaultAsync(t => t.Id == topicId);

        if (topic == null)
            return NotFound(new { detail = "Chủ đề không tồn tại." });

        return Ok(new ContentTopicItemDto
        {
            Id = topic.Id,
            ChapterId = topic.ChapterId,
            ChapterTitle = topic.Chapter?.Title ?? "",
            Title = topic.Title,
            Description = topic.Description ?? "",
            OrderIndex = topic.OrderIndex,
            IsActive = topic.IsActive,
            LessonCount = topic.Lessons.Count,
            CreatedAt = topic.CreatedAt.ToString("o"),
            UpdatedAt = topic.UpdatedAt.ToString("o")
        });
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("topics")]
    public async Task<IActionResult> CreateTopic([FromBody] CreateTopicRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.ChapterId) || string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { detail = "ChapterId và Tiêu đề chủ đề không được để trống." });

        var chapter = await _db.ContentChapters.FindAsync(req.ChapterId);
        if (chapter == null)
            return BadRequest(new { detail = "Chương học không tồn tại." });

        var topic = new ContentTopic
        {
            Id = $"top_{Guid.NewGuid():N}",
            ChapterId = req.ChapterId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            OrderIndex = req.OrderIndex,
            IsActive = req.IsActive,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentTopics.Add(topic);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "topic_created",
            TargetType = "content_topic",
            TargetId = topic.Id,
            Payload = JsonSerializer.Serialize(new { title = topic.Title, chapterId = topic.ChapterId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return StatusCode(201, new ContentTopicItemDto
        {
            Id = topic.Id,
            ChapterId = topic.ChapterId,
            ChapterTitle = chapter.Title,
            Title = topic.Title,
            Description = topic.Description ?? "",
            OrderIndex = topic.OrderIndex,
            IsActive = topic.IsActive,
            LessonCount = 0,
            CreatedAt = topic.CreatedAt.ToString("o"),
            UpdatedAt = topic.UpdatedAt.ToString("o")
        });
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPatch("topics/{topicId}")]
    public async Task<IActionResult> UpdateTopic(string topicId, [FromBody] UpdateTopicRequestDto req)
    {
        var topic = await _db.ContentTopics.Include(t => t.Chapter).FirstOrDefaultAsync(t => t.Id == topicId);
        if (topic == null)
            return NotFound(new { detail = "Chủ đề không tồn tại." });

        if (!string.IsNullOrWhiteSpace(req.Title)) topic.Title = req.Title.Trim();
        if (req.Description != null) topic.Description = req.Description.Trim();
        if (req.OrderIndex.HasValue) topic.OrderIndex = req.OrderIndex.Value;
        if (req.IsActive.HasValue) topic.IsActive = req.IsActive.Value;

        topic.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "topic_updated",
            TargetType = "content_topic",
            TargetId = topic.Id,
            Payload = JsonSerializer.Serialize(new { title = topic.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        var lessonCount = await _db.ContentLessons.CountAsync(l => l.TopicId == topic.Id);

        return Ok(new ContentTopicItemDto
        {
            Id = topic.Id,
            ChapterId = topic.ChapterId,
            ChapterTitle = topic.Chapter?.Title ?? "",
            Title = topic.Title,
            Description = topic.Description ?? "",
            OrderIndex = topic.OrderIndex,
            IsActive = topic.IsActive,
            LessonCount = lessonCount,
            CreatedAt = topic.CreatedAt.ToString("o"),
            UpdatedAt = topic.UpdatedAt.ToString("o")
        });
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpDelete("topics/{topicId}")]
    public async Task<IActionResult> DeleteTopic(string topicId)
    {
        var topic = await _db.ContentTopics.Include(t => t.Lessons).FirstOrDefaultAsync(t => t.Id == topicId);
        if (topic == null)
            return NotFound(new { detail = "Chủ đề không tồn tại." });

        if (topic.Lessons.Count > 0)
        {
            return BadRequest(new
            {
                detail = $"Không thể xóa chủ đề đang chứa {topic.Lessons.Count} bài học. Vui lòng chuyển hoặc xóa bài học trước."
            });
        }

        _db.ContentTopics.Remove(topic);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "topic_deleted",
            TargetType = "content_topic",
            TargetId = topicId,
            Payload = JsonSerializer.Serialize(new { title = topic.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã xóa chủ đề '{topic.Title}' thành công." });
    }

    #endregion

    #region Lesson Video Endpoints

    private static ContentLessonVideoItemDto MapToVideoDto(ContentLessonVideo v, string lessonTitle)
    {
        return new ContentLessonVideoItemDto
        {
            Id = v.Id,
            LessonId = v.LessonId,
            LessonTitle = lessonTitle,
            Title = v.Title,
            Description = v.Description ?? "",
            Provider = v.Provider,
            SourceUrl = v.SourceUrl,
            EmbedUrl = v.EmbedUrl,
            YouTubeVideoId = v.YouTubeVideoId,
            Language = v.Language,
            DurationSeconds = v.DurationSeconds,
            ThumbnailUrl = v.ThumbnailUrl,
            SortOrder = v.SortOrder,
            EmbedAllowed = v.EmbedAllowed,
            VerificationStatus = v.VerificationStatus,
            VerifiedAt = v.VerifiedAt?.ToString("o"),
            IsPublished = v.IsPublished,
            CreatedAt = v.CreatedAt.ToString("o"),
            UpdatedAt = v.UpdatedAt.ToString("o")
        };
    }

    [HttpGet("lessons/{lessonId}/videos")]
    public async Task<IActionResult> ListLessonVideos(string lessonId)
    {
        var les = await _db.ContentLessons.FindAsync(lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        var videos = await _db.ContentLessonVideos
            .Where(v => v.LessonId == lessonId)
            .OrderBy(v => v.SortOrder)
            .ThenBy(v => v.CreatedAt)
            .ToListAsync();

        var result = videos.Select(v => MapToVideoDto(v, les.Title)).ToList();
        return Ok(new { items = result, total = result.Count });
    }

    [HttpPost("lessons/{lessonId}/videos")]
    public async Task<IActionResult> AddLessonVideo(string lessonId, [FromBody] CreateLessonVideoRequestDto req)
    {
        var les = await _db.ContentLessons.FindAsync(lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        if (string.IsNullOrWhiteSpace(req.SourceUrl) || string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { detail = "Tiêu đề và Đường dẫn URL video không được để trống." });

        var vStatus = !string.IsNullOrWhiteSpace(req.VerificationStatus)
            ? req.VerificationStatus.Trim().ToLowerInvariant()
            : "pending";

        if (vStatus != "pending" && vStatus != "verified" && vStatus != "rejected")
        {
            return BadRequest(new { detail = "Trạng thái xác minh không hợp lệ. Chỉ chấp nhận: pending, verified, rejected." });
        }

        // Independent review gate: only authorized reviewers can mark video verified
        if (vStatus == "verified" && !IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ người kiểm duyệt có thẩm quyền mới có quyền xác minh video." });
        }

        // Publishing invariant: only verified video can be published, and must be authorized reviewer
        if (req.IsPublished)
        {
            if (!IsAuthorizedReviewer)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ người kiểm duyệt có thẩm quyền mới có quyền xuất bản video." });
            }
            if (vStatus != "verified")
            {
                return BadRequest(new { detail = "Không thể xuất bản video chưa được xác minh (VerificationStatus phải là 'verified')." });
            }
        }

        var (detectedProvider, ytId, embedUrl) = ParseVideoUrl(req.SourceUrl);
        var provider = !string.IsNullOrWhiteSpace(req.Provider) ? req.Provider : detectedProvider;
        var finalEmbedUrl = !string.IsNullOrWhiteSpace(req.EmbedUrl) ? req.EmbedUrl : embedUrl;
        var finalYtId = !string.IsNullOrWhiteSpace(req.YouTubeVideoId) ? req.YouTubeVideoId : ytId;
        var thumb = !string.IsNullOrWhiteSpace(req.ThumbnailUrl)
            ? req.ThumbnailUrl
            : (finalYtId != null ? $"https://i.ytimg.com/vi/{finalYtId}/hqdefault.jpg" : null);

        DateTimeOffset? vAt = (vStatus == "verified") ? DateTimeOffset.UtcNow : null;

        var video = new ContentLessonVideo
        {
            Id = $"vid_{Guid.NewGuid():N}",
            LessonId = lessonId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            Provider = provider ?? "youtube",
            SourceUrl = req.SourceUrl.Trim(),
            EmbedUrl = finalEmbedUrl,
            YouTubeVideoId = finalYtId,
            Language = !string.IsNullOrWhiteSpace(req.Language) ? req.Language : "vi",
            DurationSeconds = req.DurationSeconds,
            ThumbnailUrl = thumb,
            SortOrder = req.SortOrder,
            EmbedAllowed = req.EmbedAllowed,
            VerificationStatus = vStatus,
            VerifiedAt = vAt,
            IsPublished = req.IsPublished,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentLessonVideos.Add(video);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_video_added",
            TargetType = "content_lesson_video",
            TargetId = video.Id,
            Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, provider = video.Provider, status = video.VerificationStatus }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        if (video.VerificationStatus == "verified")
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "lesson_video_verified",
                TargetType = "content_lesson_video",
                TargetId = video.Id,
                Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, verifiedBy = CurrentUserId }),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        if (video.IsPublished)
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "lesson_video_published",
                TargetType = "content_lesson_video",
                TargetId = video.Id,
                Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, publishedBy = CurrentUserId }),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        return StatusCode(201, MapToVideoDto(video, les.Title));
    }

    [HttpPatch("videos/{videoId}")]
    public async Task<IActionResult> UpdateLessonVideo(string videoId, [FromBody] UpdateLessonVideoRequestDto req)
    {
        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
            return NotFound(new { detail = "Video không tồn tại." });

        string previousVerificationStatus = video.VerificationStatus;
        bool previousIsPublished = video.IsPublished;

        // VerificationStatus validation & authorization
        if (!string.IsNullOrWhiteSpace(req.VerificationStatus))
        {
            var st = req.VerificationStatus.Trim().ToLowerInvariant();
            if (st != "pending" && st != "verified" && st != "rejected")
            {
                return BadRequest(new { detail = "Trạng thái xác minh không hợp lệ. Chỉ chấp nhận: pending, verified, rejected." });
            }

            if (st != video.VerificationStatus)
            {
                if (!IsAuthorizedReviewer)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ người kiểm duyệt có thẩm quyền mới có quyền thay đổi trạng thái xác minh video." });
                }
                video.VerificationStatus = st;
                video.VerifiedAt = (st == "verified") ? DateTimeOffset.UtcNow : null;
            }
        }

        // IsPublished authorization
        if (req.IsPublished.HasValue && req.IsPublished.Value != video.IsPublished)
        {
            if (!IsAuthorizedReviewer)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ người kiểm duyệt có thẩm quyền mới có quyền thay đổi trạng thái xuất bản video." });
            }
            video.IsPublished = req.IsPublished.Value;
        }

        // Invariant: cannot publish unverified video
        if (video.IsPublished && video.VerificationStatus != "verified")
        {
            return BadRequest(new { detail = "Không thể xuất bản video chưa được xác minh (VerificationStatus phải là 'verified')." });
        }

        // If status moved away from verified, unpublish automatically
        if (video.VerificationStatus != "verified" && video.IsPublished)
        {
            video.IsPublished = false;
        }

        if (!string.IsNullOrWhiteSpace(req.Title)) video.Title = req.Title.Trim();
        if (req.Description != null) video.Description = req.Description.Trim();
        if (req.Provider != null) video.Provider = req.Provider;
        if (!string.IsNullOrWhiteSpace(req.SourceUrl))
        {
            video.SourceUrl = req.SourceUrl.Trim();
            var (_, ytId, embedUrl) = ParseVideoUrl(req.SourceUrl);
            if (ytId != null) video.YouTubeVideoId = ytId;
            if (embedUrl != null) video.EmbedUrl = embedUrl;
        }
        if (req.EmbedUrl != null) video.EmbedUrl = req.EmbedUrl;
        if (req.YouTubeVideoId != null) video.YouTubeVideoId = req.YouTubeVideoId;
        if (req.Language != null) video.Language = req.Language;
        if (req.DurationSeconds.HasValue) video.DurationSeconds = req.DurationSeconds.Value;
        if (req.ThumbnailUrl != null) video.ThumbnailUrl = req.ThumbnailUrl;
        if (req.SortOrder.HasValue) video.SortOrder = req.SortOrder.Value;
        if (req.EmbedAllowed.HasValue) video.EmbedAllowed = req.EmbedAllowed.Value;

        video.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_video_updated",
            TargetType = "content_lesson_video",
            TargetId = video.Id,
            Payload = JsonSerializer.Serialize(new { title = video.Title, previousStatus = previousVerificationStatus, currentStatus = video.VerificationStatus }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        // Dedicated audit logs for state transitions
        if (previousVerificationStatus != "verified" && video.VerificationStatus == "verified")
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "lesson_video_verified",
                TargetType = "content_lesson_video",
                TargetId = video.Id,
                Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, verifiedBy = CurrentUserId }),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }
        else if (previousVerificationStatus != "rejected" && video.VerificationStatus == "rejected")
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "lesson_video_rejected",
                TargetType = "content_lesson_video",
                TargetId = video.Id,
                Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, rejectedBy = CurrentUserId }),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        if (!previousIsPublished && video.IsPublished)
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "lesson_video_published",
                TargetType = "content_lesson_video",
                TargetId = video.Id,
                Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, publishedBy = CurrentUserId }),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }
        else if (previousIsPublished && !video.IsPublished)
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "lesson_video_unpublished",
                TargetType = "content_lesson_video",
                TargetId = video.Id,
                Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, unpublishedBy = CurrentUserId }),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        return Ok(MapToVideoDto(video, video.Lesson?.Title ?? ""));
    }

    [HttpPost("videos/{videoId}/verify")]
    public async Task<IActionResult> VerifyLessonVideo(string videoId)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ người kiểm duyệt có thẩm quyền mới có quyền xác minh video." });
        }

        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
            return NotFound(new { detail = "Video không tồn tại." });

        video.VerificationStatus = "verified";
        video.VerifiedAt = DateTimeOffset.UtcNow;
        video.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_video_verified",
            TargetType = "content_lesson_video",
            TargetId = video.Id,
            Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, verifiedBy = CurrentUserId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(MapToVideoDto(video, video.Lesson?.Title ?? ""));
    }

    [HttpPost("videos/{videoId}/reject")]
    public async Task<IActionResult> RejectLessonVideo(string videoId)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ người kiểm duyệt có thẩm quyền mới có quyền từ chối video." });
        }

        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
            return NotFound(new { detail = "Video không tồn tại." });

        bool wasPublished = video.IsPublished;
        video.VerificationStatus = "rejected";
        video.VerifiedAt = null;
        video.IsPublished = false;
        video.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_video_rejected",
            TargetType = "content_lesson_video",
            TargetId = video.Id,
            Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, rejectedBy = CurrentUserId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        if (wasPublished)
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "lesson_video_unpublished",
                TargetType = "content_lesson_video",
                TargetId = video.Id,
                Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, reason = "rejected" }),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(MapToVideoDto(video, video.Lesson?.Title ?? ""));
    }

    [HttpPost("videos/{videoId}/publish")]
    public async Task<IActionResult> PublishLessonVideo(string videoId)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ người kiểm duyệt có thẩm quyền mới có quyền xuất bản video." });
        }

        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
            return NotFound(new { detail = "Video không tồn tại." });

        if (video.VerificationStatus != "verified")
        {
            return BadRequest(new { detail = "Không thể xuất bản video chưa được xác minh (VerificationStatus phải là 'verified')." });
        }

        video.IsPublished = true;
        video.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_video_published",
            TargetType = "content_lesson_video",
            TargetId = video.Id,
            Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, publishedBy = CurrentUserId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(MapToVideoDto(video, video.Lesson?.Title ?? ""));
    }

    [HttpPost("videos/{videoId}/unpublish")]
    public async Task<IActionResult> UnpublishLessonVideo(string videoId)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ người kiểm duyệt có thẩm quyền mới có quyền gỡ xuất bản video." });
        }

        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
            return NotFound(new { detail = "Video không tồn tại." });

        video.IsPublished = false;
        video.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_video_unpublished",
            TargetType = "content_lesson_video",
            TargetId = video.Id,
            Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, unpublishedBy = CurrentUserId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(MapToVideoDto(video, video.Lesson?.Title ?? ""));
    }

    [HttpDelete("videos/{videoId}")]
    public async Task<IActionResult> DeleteLessonVideo(string videoId)
    {
        var video = await _db.ContentLessonVideos.FindAsync(videoId);
        if (video == null)
            return NotFound(new { detail = "Video không tồn tại." });

        _db.ContentLessonVideos.Remove(video);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_video_deleted",
            TargetType = "content_lesson_video",
            TargetId = videoId,
            Payload = JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã xóa liên kết video '{video.Title}' thành công." });
    }

    #endregion

    #region Lesson Endpoints

    [HttpGet("lessons")]
    public async Task<IActionResult> ListLessons(
        [FromQuery] string? status = null,
        [FromQuery] string? subjectId = null,
        [FromQuery] string? chapterId = null,
        [FromQuery] string? topicId = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.ContentLessons
            .Include(l => l.Author)
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .Include(l => l.Topic)
            .Include(l => l.Videos)
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

        if (!string.IsNullOrWhiteSpace(topicId) && topicId != "all")
        {
            query = query.Where(l => l.TopicId == topicId);
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
            .Include(l => l.Topic)
            .Include(l => l.Videos)
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
            TopicId = string.IsNullOrWhiteSpace(req.TopicId) ? null : req.TopicId,
            Title = req.Title.Trim(),
            Slug = req.Slug.Trim().ToLowerInvariant(),
            OrderIndex = req.OrderIndex,
            Status = "draft",
            AuthorId = CurrentUserId,
            LearningObjectivesJson = req.LearningObjectives?.ToJsonString() ?? "[]",
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
            .Include(l => l.Topic)
            .Include(l => l.Videos)
            .Include(l => l.Questions)
            .FirstOrDefaultAsync(l => l.Id == lessonId);

        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        if (!CanManageContent(les.AuthorId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền chỉnh sửa bài học của tác giả khác." });
        }

        if (req.ChapterId != null) les.ChapterId = req.ChapterId;
        if (req.TopicId != null) les.TopicId = string.IsNullOrWhiteSpace(req.TopicId) ? null : req.TopicId;
        if (req.Title != null) les.Title = req.Title.Trim();
        if (req.Slug != null) les.Slug = req.Slug.Trim().ToLowerInvariant();
        if (req.OrderIndex.HasValue) les.OrderIndex = req.OrderIndex.Value;
        if (req.Introduction != null) les.Introduction = req.Introduction;
        if (req.LearningObjectives != null) les.LearningObjectivesJson = req.LearningObjectives.ToJsonString();
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

        if (!CanManageContent(les.AuthorId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền xóa bài học của tác giả khác." });
        }

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

        if (!CanManageContent(les.AuthorId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền gửi duyệt bài học của tác giả khác." });
        }

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

        if (!IsAdminOrContentAdmin && les.AuthorId == CurrentUserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không được tự phê duyệt bài học của chính mình." });
        }

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

        await CreateLessonRevisionAsync(les, "Phê duyệt xuất bản bài học");

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

        if (!IsAdminOrContentAdmin && les.AuthorId == CurrentUserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không thể tự từ chối bài học của chính mình." });
        }

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

    [HttpPost("lessons/{lessonId}/rollback")]
    public async Task<IActionResult> RollbackLesson(string lessonId, [FromBody] RollbackContentRequestDto? req = null)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền khôi phục/rollback bài học." });
        }

        var les = await _db.ContentLessons.Include(l => l.Author).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (les == null)
            return NotFound(new { detail = "Bài học không tồn tại." });

        if (les.Status == "draft")
            return StatusCode(409, new { detail = "Bài học đang ở trạng thái bản nháp ('draft'), không thể rollback." });

        ContentRevision? targetRev = null;
        if (!string.IsNullOrWhiteSpace(req?.RevisionId))
        {
            targetRev = await _db.ContentRevisions.FirstOrDefaultAsync(r => r.Id == req.RevisionId && r.ContentId == lessonId);
            if (targetRev == null)
            {
                return NotFound(new { detail = $"Không tìm thấy phiên bản revision '{req.RevisionId}' cho bài học này." });
            }
        }
        else if (req?.TargetVersion.HasValue == true)
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == lessonId && r.Version == req.TargetVersion.Value)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();
            if (targetRev == null)
            {
                return NotFound(new { detail = $"Không tìm thấy phiên bản v{req.TargetVersion.Value} cho bài học này." });
            }
        }
        else
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == lessonId)
                .OrderByDescending(r => r.CreatedAt)
                .Skip(1)
                .FirstOrDefaultAsync();
        }

        var previousStatus = les.Status;

        if (targetRev != null && !string.IsNullOrWhiteSpace(targetRev.SnapshotJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(targetRev.SnapshotJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("Title", out var titleProp) && titleProp.GetString() is string title && !string.IsNullOrWhiteSpace(title))
                    les.Title = title;
                if (root.TryGetProperty("Introduction", out var introProp))
                    les.Introduction = introProp.GetString();
                if (root.TryGetProperty("DefinitionsJson", out var defProp))
                    les.DefinitionsJson = defProp.GetString();
                if (root.TryGetProperty("FormulasJson", out var formProp))
                    les.FormulasJson = formProp.GetString();
                if (root.TryGetProperty("ExamplesJson", out var exProp))
                    les.ExamplesJson = exProp.GetString();
                if (root.TryGetProperty("ImportantNotesJson", out var notesProp))
                    les.ImportantNotesJson = notesProp.GetString();
                if (root.TryGetProperty("SummaryPointsJson", out var sumProp))
                    les.SummaryPointsJson = sumProp.GetString();
            }
            catch (JsonException)
            {
            }
        }

        les.Status = "draft";
        les.UpdatedAt = DateTimeOffset.UtcNow;

        var rollbackRev = await CreateLessonRevisionAsync(les, req?.Reason ?? $"Rollback từ trạng thái {previousStatus} về bản nháp", targetRev?.Id);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_rollback",
            TargetType = "content_lesson",
            TargetId = les.Id,
            Payload = JsonSerializer.Serialize(new
            {
                title = les.Title,
                previousStatus,
                newStatus = les.Status,
                targetRevisionId = targetRev?.Id,
                targetVersion = targetRev?.Version,
                rollbackRevisionId = rollbackRev.Id,
                actorId = CurrentUserId
            }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatLesson(les, les.Author));
    }

    [HttpGet("approvals")]
    public async Task<IActionResult> GetApprovals(
        [FromQuery] string? status = "all",
        [FromQuery] string? type = "all",
        [FromQuery] string? search = null)
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
            var lessons = await lessonQuery.OrderByDescending(l => l.UpdatedAt).Take(100).ToListAsync();
            var lessonIds = lessons.Select(l => l.Id).ToList();
            var auditLogs = await _db.StaffAuditLogs
                .AsNoTracking()
                .Where(a => a.TargetType == "content_lesson" && lessonIds.Contains(a.TargetId))
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

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
            var questions = await questionQuery.OrderByDescending(q => q.UpdatedAt).Take(100).ToListAsync();
            var qIds = questions.Select(q => q.Id).ToList();
            var auditLogs = await _db.StaffAuditLogs
                .AsNoTracking()
                .Where(a => a.TargetType == "content_question" && qIds.Contains(a.TargetId))
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

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

        return Ok(results);
    }

    [HttpGet("publications")]
    public async Task<IActionResult> GetPublications(
        [FromQuery] string? search = null,
        [FromQuery] string? type = "all")
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
            var lessons = await lessonQuery.OrderByDescending(l => l.UpdatedAt).Take(100).ToListAsync();
            foreach (var l in lessons)
            {
                var pubBy = !string.IsNullOrWhiteSpace(l.ReviewedBy) ? l.ReviewedBy : (l.Author?.DisplayName ?? "Quản trị viên");
                results.Add(new
                {
                    id = $"pub_{l.Id}",
                    contentId = l.Id,
                    contentType = "lesson",
                    title = l.Title,
                    subjectId = l.Chapter?.SubjectId ?? "",
                    subjectName = l.Chapter?.Subject?.Name ?? "",
                    version = "v1.0",
                    publishedAt = l.UpdatedAt.ToString("o"),
                    publisherName = pubBy,
                    publishedBy = pubBy,
                    status = "active",
                    changelog = "Phiên bản chuẩn GDPT 2018",
                    views = 120,
                    rating = 4.9,
                    activeUsers = 45
                });
            }
        }

        if (type == "all" || type == "assessment" || type == "question")
        {
            var questions = await questionQuery.OrderByDescending(q => q.UpdatedAt).Take(100).ToListAsync();
            foreach (var q in questions)
            {
                var pubBy = !string.IsNullOrWhiteSpace(q.ReviewedBy) ? q.ReviewedBy : "Quản trị viên";
                results.Add(new
                {
                    id = $"pub_{q.Id}",
                    contentId = q.Id,
                    contentType = "assessment",
                    title = q.Prompt.Length > 80 ? q.Prompt[..80] + "..." : q.Prompt,
                    subjectId = q.Lesson?.Chapter?.SubjectId ?? q.SubjectId ?? "",
                    subjectName = q.Lesson?.Chapter?.Subject?.Name ?? "Toán học",
                    version = "v1.0",
                    publishedAt = q.UpdatedAt.ToString("o"),
                    publisherName = pubBy,
                    publishedBy = pubBy,
                    status = "active",
                    changelog = "Ngân hàng câu hỏi kiểm chứng",
                    views = 85,
                    rating = 4.8,
                    activeUsers = 30
                });
            }
        }

        return Ok(results);
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
        {
            var sLower = subjectId.Trim().ToLowerInvariant();
            query = query.Where(q =>
                q.SubjectId == subjectId ||
                (q.Lesson != null && q.Lesson.Chapter != null && (
                    q.Lesson.Chapter.SubjectId == subjectId ||
                    (q.Lesson.Chapter.Subject != null && (
                        q.Lesson.Chapter.Subject.Id.ToLower() == sLower ||
                        q.Lesson.Chapter.Subject.Code.ToLower() == sLower ||
                        (sLower == "math" && (q.Lesson.Chapter.Subject.Code.ToLower().StartsWith("math") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("toán"))) ||
                        (sLower == "physics" && (q.Lesson.Chapter.Subject.Code.ToLower().StartsWith("phys") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("vật lý") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("vật lí"))) ||
                        (sLower == "chemistry" && (q.Lesson.Chapter.Subject.Code.ToLower().StartsWith("chem") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("hóa"))) ||
                        (sLower == "english" && (q.Lesson.Chapter.Subject.Code.ToLower().StartsWith("eng") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("tiếng anh"))) ||
                        (sLower == "history" && (q.Lesson.Chapter.Subject.Code.ToLower().StartsWith("hist") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("lịch sử"))) ||
                        (sLower == "geography" && (q.Lesson.Chapter.Subject.Code.ToLower().StartsWith("geo") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("địa"))) ||
                        (sLower == "biology" && (q.Lesson.Chapter.Subject.Code.ToLower().StartsWith("bio") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("sinh"))) ||
                        (sLower == "civic" && (q.Lesson.Chapter.Subject.Code.ToLower().StartsWith("civ") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("công dân"))) ||
                        (sLower == "literature" && (q.Lesson.Chapter.Subject.Code.ToLower().StartsWith("lit") || q.Lesson.Chapter.Subject.Name.ToLower().Contains("văn")))
                    ))
                )) ||
                (q.Topic != null && (
                    q.Topic.ToLower() == sLower ||
                    (sLower == "math" && q.Topic.ToLower() == "mathematics") ||
                    (sLower == "physics" && q.Topic.ToLower() == "physics") ||
                    (sLower == "chemistry" && q.Topic.ToLower() == "chemistry") ||
                    (sLower == "english" && q.Topic.ToLower() == "english") ||
                    (sLower == "history" && q.Topic.ToLower() == "history") ||
                    (sLower == "geography" && q.Topic.ToLower() == "geography") ||
                    (sLower == "biology" && q.Topic.ToLower() == "biology") ||
                    (sLower == "civic" && q.Topic.ToLower() == "civiceducation") ||
                    (sLower == "literature" && (q.Topic.ToLower() == "ngữ văn" || q.Topic.ToLower() == "literature"))
                ))
            );
        }

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
                .GroupBy(q => ResolveSubjectName(q))
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

        var defaultStatus = IsAdminOrContentAdmin
            ? (string.IsNullOrWhiteSpace(req.Status) ? "published" : req.Status)
            : "draft";

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
            Status = defaultStatus,
            OrderIndex = req.OrderIndex,
            ImageUrl = req.ImageUrl,
            MetadataJson = req.MetadataJson,
            AuthorId = CurrentUserId,
            ReviewedBy = IsAdminOrContentAdmin && defaultStatus == "published" ? CurrentUserId : null,
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

        if (!CanManageContent(question.AuthorId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền chỉnh sửa câu hỏi của tác giả khác." });
        }

        if (req.Code != null) question.Code = req.Code.Trim();
        if (req.Prompt != null) question.Prompt = req.Prompt.Trim();
        if (req.Options != null) question.OptionsJson = JsonSerializer.Serialize(req.Options);
        if (req.CorrectAnswer != null) question.CorrectAnswer = req.CorrectAnswer.Trim();
        if (req.Explanation != null) question.Explanation = req.Explanation.Trim();
        if (req.Topic != null) question.Topic = req.Topic.Trim();
        if (req.Difficulty != null) question.Difficulty = req.Difficulty.Trim();
        if (req.Type != null) question.Type = req.Type.Trim();
        if (req.Grade != null) question.Grade = req.Grade.Trim();
        if (req.Status != null)
        {
            var targetStatus = req.Status.Trim().ToLowerInvariant();
            if (targetStatus == "published" || targetStatus == "approved")
            {
                return BadRequest(new
                {
                    detail = "Không thể trực tiếp thay đổi trạng thái sang 'published' hoặc 'approved' qua cập nhật thông thường. Vui lòng sử dụng quy trình phê duyệt (/approve) hoặc xuất bản (/publish) của vai trò Content."
                });
            }
            else
            {
                question.Status = targetStatus;
            }
        }
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

        if (!CanManageContent(question.AuthorId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền xóa câu hỏi của tác giả khác." });
        }

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

        if (!CanManageContent(question.AuthorId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền khôi phục câu hỏi của tác giả khác." });
        }

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

        if (!CanManageContent(question.AuthorId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền gửi duyệt câu hỏi của tác giả khác." });
        }

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
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền phê duyệt câu hỏi."
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

        if (!IsAdminOrContentAdmin && question.AuthorId == CurrentUserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không được tự phê duyệt câu hỏi của chính mình." });
        }

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
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền từ chối câu hỏi."
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

        if (!IsAdminOrContentAdmin && question.AuthorId == CurrentUserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không thể tự từ chối câu hỏi của chính mình." });
        }

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
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền xuất bản câu hỏi."
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

        if (!IsAdminOrContentAdmin && question.AuthorId == CurrentUserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không được tự xuất bản câu hỏi của chính mình." });
        }

        question.Status = "published";
        question.UpdatedAt = DateTimeOffset.UtcNow;

        await CreateQuestionRevisionAsync(question, "Xuất bản câu hỏi");

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
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền gỡ xuất bản câu hỏi."
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

    [HttpPost("questions/{questionId}/rollback")]
    public async Task<IActionResult> RollbackQuestion(string questionId, [FromBody] RollbackContentRequestDto? req = null)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền khôi phục/rollback câu hỏi." });
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Author)
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId && !q.IsDeleted);

        if (question == null)
            return NotFound(new { detail = "Câu hỏi không tồn tại." });

        if (question.Status == "draft")
            return StatusCode(409, new { detail = "Câu hỏi đang ở trạng thái bản nháp ('draft'), không thể rollback." });

        ContentRevision? targetRev = null;
        if (!string.IsNullOrWhiteSpace(req?.RevisionId))
        {
            targetRev = await _db.ContentRevisions.FirstOrDefaultAsync(r => r.Id == req.RevisionId && r.ContentId == questionId);
            if (targetRev == null)
            {
                return NotFound(new { detail = $"Không tìm thấy phiên bản revision '{req.RevisionId}' cho câu hỏi này." });
            }
        }
        else if (req?.TargetVersion.HasValue == true)
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == questionId && r.Version == req.TargetVersion.Value)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();
            if (targetRev == null)
            {
                return NotFound(new { detail = $"Không tìm thấy phiên bản v{req.TargetVersion.Value} cho câu hỏi này." });
            }
        }
        else
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == questionId)
                .OrderByDescending(r => r.CreatedAt)
                .Skip(1)
                .FirstOrDefaultAsync();
        }

        var previousStatus = question.Status;

        if (targetRev != null && !string.IsNullOrWhiteSpace(targetRev.SnapshotJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(targetRev.SnapshotJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("Prompt", out var promptProp) && promptProp.GetString() is string p && !string.IsNullOrWhiteSpace(p))
                    question.Prompt = p;
                if (root.TryGetProperty("OptionsJson", out var optProp))
                    question.OptionsJson = optProp.GetString() ?? "[]";
                if (root.TryGetProperty("CorrectAnswer", out var ansProp))
                    question.CorrectAnswer = ansProp.GetString() ?? string.Empty;
                if (root.TryGetProperty("Explanation", out var expProp))
                    question.Explanation = expProp.GetString();
                if (root.TryGetProperty("Difficulty", out var diffProp))
                    question.Difficulty = diffProp.GetString() ?? "medium";
            }
            catch (JsonException)
            {
            }
        }

        question.Status = "draft";
        question.UpdatedAt = DateTimeOffset.UtcNow;

        var rollbackRev = await CreateQuestionRevisionAsync(question, req?.Reason ?? $"Rollback từ trạng thái {previousStatus} về bản nháp", targetRev?.Id);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_rollback",
            TargetType = "content_question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new
            {
                code = question.Code,
                previousStatus,
                newStatus = question.Status,
                targetRevisionId = targetRev?.Id,
                targetVersion = targetRev?.Version,
                rollbackRevisionId = rollbackRev.Id,
                actorId = CurrentUserId
            }),
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

            var resolvedSubjectId = item.SubjectId;
            if (string.IsNullOrWhiteSpace(resolvedSubjectId))
            {
                var combined = $"{item.Topic} {item.Code}".ToLowerInvariant();
                if (combined.Contains("math") || combined.Contains("toan")) resolvedSubjectId = "sub_math12";
                else if (combined.Contains("phys") || combined.Contains("vatly")) resolvedSubjectId = "sub_phys12";
                else if (combined.Contains("chem") || combined.Contains("hoahoc")) resolvedSubjectId = "sub_chem12";
                else if (combined.Contains("bio") || combined.Contains("sinhhoc")) resolvedSubjectId = "sub_bio12";
                else if (combined.Contains("lit") || combined.Contains("nguvan") || combined.Contains("văn")) resolvedSubjectId = "sub_lit12";
                else if (combined.Contains("eng") || combined.Contains("tienganh")) resolvedSubjectId = "sub_eng12";
                else if (combined.Contains("hist") || combined.Contains("lichsu")) resolvedSubjectId = "sub_hist12";
                else if (combined.Contains("geo") || combined.Contains("dialy")) resolvedSubjectId = "sub_geo12";
                else if (combined.Contains("civic") || combined.Contains("gdcd")) resolvedSubjectId = "sub_civic12";
            }

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

    private static (string? provider, string? videoId, string? embedUrl) ParseVideoUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return ("external", null, null);
        url = url.Trim();
        var ytMatch = System.Text.RegularExpressions.Regex.Match(url, @"(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})");
        if (ytMatch.Success)
        {
            var id = ytMatch.Groups[1].Value;
            return ("youtube", id, $"https://www.youtube-nocookie.com/embed/{id}");
        }
        if (url.Contains("khanacademy.org"))
        {
            return ("khan_academy", null, url);
        }
        return ("external", null, url);
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
                Language = v.Language,
                DurationSeconds = v.DurationSeconds,
                ThumbnailUrl = v.ThumbnailUrl,
                SortOrder = v.SortOrder,
                EmbedAllowed = v.EmbedAllowed,
                VerificationStatus = v.VerificationStatus,
                VerifiedAt = v.VerifiedAt?.ToString("o"),
                IsPublished = v.IsPublished,
                CreatedAt = v.CreatedAt.ToString("o"),
                UpdatedAt = v.UpdatedAt.ToString("o")
            }).ToList() ?? new List<ContentLessonVideoItemDto>();

        return new ContentLessonDetailDto
        {
            Id = lesson.Id,
            ChapterId = lesson.ChapterId,
            ChapterTitle = lesson.Chapter?.Title ?? "",
            TopicId = lesson.TopicId,
            TopicTitle = lesson.Topic?.Title ?? "",
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
        };
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

    #endregion
}
