using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
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
    private readonly StudyAI.Application.Common.Interfaces.IVideoVerificationService? _videoVerificationService;
    private readonly ILogger<ContentController>? _logger;

    public ContentController(
        StudyAIDbContext db,
        StudyAI.Application.Common.Interfaces.IVideoVerificationService? videoVerificationService = null,
        ILogger<ContentController>? logger = null)
    {
        _db = db;
        _videoVerificationService = videoVerificationService;
        _logger = logger;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    private bool IsAdminOrContentAdmin => User.IsInRole("admin") || User.IsInRole("content_admin");

    private bool IsContentStaffOrAdmin => IsAdminOrContentAdmin || User.IsInRole("content");

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
        if (IsContentStaffOrAdmin) return true;
        if (string.IsNullOrEmpty(CurrentUserId)) return false;
        return !string.IsNullOrEmpty(authorId) && authorId == CurrentUserId;
    }

    private async Task<bool> IsFourEyesRestrictedAsync(string? authorId)
    {
        if (string.IsNullOrEmpty(authorId)) return false;
        if (CurrentUserId == authorId)
        {
            // Strictly forbid self-approval, self-publishing, or self-rejection under four-eyes principle, regardless of role (no bypass for role content or admin)
            return true;
        }

        return false;
    }

    private async Task<ContentRevision> CreateLessonRevisionAsync(ContentLesson les, string reason, string? sourceRevisionId = null)
    {
        var maxVersion = await _db.ContentRevisions
            .Where(r => r.ContentId == les.Id)
            .Select(r => (int?)r.Version)
            .MaxAsync() ?? 0;
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
            Id = $"rev_l_{Guid.NewGuid():N}",
            ContentId = les.Id,
            ContentType = "lesson",
            Version = nextVersion,
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
        var maxVersion = await _db.ContentRevisions
            .Where(r => r.ContentId == q.Id)
            .Select(r => (int?)r.Version)
            .MaxAsync() ?? 0;
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
            Id = $"rev_q_{Guid.NewGuid():N}",
            ContentId = q.Id,
            ContentType = "question",
            Version = nextVersion,
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

    private static bool IsRevisionVersionConflict(DbUpdateException ex)
    {
        return ex.InnerException is SqlException sqlException &&
               sqlException.Number is 2601 or 2627 &&
               sqlException.Message.Contains("IX_content_revisions_ContentId_Version", StringComparison.OrdinalIgnoreCase);
    }

    private async Task SaveChangesWithRevisionRetryAsync(ContentRevision revision)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await _db.SaveChangesAsync();
                return;
            }
            catch (DbUpdateException ex) when (attempt < maxAttempts && IsRevisionVersionConflict(ex))
            {
                _db.Entry(revision).State = EntityState.Detached;
                revision.Version = (await _db.ContentRevisions
                    .Where(r => r.ContentId == revision.ContentId)
                    .Select(r => (int?)r.Version)
                    .MaxAsync() ?? 0) + 1;
                _db.ContentRevisions.Add(revision);
            }
        }
    }

    private static bool IsValidAssessmentStatus(string? status)
    {
        return status is "draft" or "in-review" or "approved" or "published" or "archived";
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

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("topics/reorder")]
    public async Task<IActionResult> ReorderTopics([FromBody] ReorderTopicsRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.ChapterId))
            return BadRequest(new { detail = "ChapterId không được để trống khi sắp xếp chủ đề." });

        if (req.TopicIds == null || req.TopicIds.Count == 0)
            return BadRequest(new { detail = "Danh sách topicIds không được rỗng." });

        if (req.TopicIds.Distinct().Count() != req.TopicIds.Count)
            return BadRequest(new { detail = "Danh sách topicIds chứa mã chủ đề trùng lặp." });

        var chapter = await _db.ContentChapters.FindAsync(req.ChapterId);
        if (chapter == null)
            return BadRequest(new { detail = "Chương học đã chỉ định không tồn tại." });

        var topics = await _db.ContentTopics
            .Where(t => t.ChapterId == req.ChapterId)
            .ToListAsync();

        if (topics.Count != req.TopicIds.Count)
        {
            return BadRequest(new
            {
                detail = $"Số lượng chủ đề gửi lên ({req.TopicIds.Count}) không khớp với tổng số chủ đề trong chương ({topics.Count})."
            });
        }

        var map = topics.ToDictionary(t => t.Id);
        foreach (var id in req.TopicIds)
        {
            if (!map.ContainsKey(id))
                return BadRequest(new { detail = $"Mã chủ đề '{id}' không thuộc chương học này." });
        }

        for (int i = 0; i < req.TopicIds.Count; i++)
        {
            var t = map[req.TopicIds[i]];
            t.OrderIndex = i + 1;
            t.UpdatedAt = DateTimeOffset.UtcNow;
        }

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "topics_reordered",
            TargetType = "content_topic",
            TargetId = req.ChapterId,
            Payload = JsonSerializer.Serialize(new { chapterId = req.ChapterId, count = req.TopicIds.Count }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã cập nhật thứ tự {req.TopicIds.Count} chủ đề thành công." });
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
            ChannelName = req.ChannelName,
            IsPrimary = req.IsPrimary,
            AttributionText = req.AttributionText,
            Language = !string.IsNullOrWhiteSpace(req.Language) ? req.Language : "vi",
            DurationSeconds = req.DurationSeconds,
            ThumbnailUrl = thumb,
            SortOrder = req.SortOrder,
            EmbedAllowed = req.EmbedAllowed,
            VerificationStatus = vStatus,
            VerifiedAt = vAt,
            LastVerifiedAt = vAt,
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
        if (req.ChannelName != null) video.ChannelName = req.ChannelName.Trim();
        if (req.IsPrimary.HasValue) video.IsPrimary = req.IsPrimary.Value;
        if (req.AttributionText != null) video.AttributionText = req.AttributionText.Trim();
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

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("videos/reorder")]
    public async Task<IActionResult> ReorderVideos([FromBody] ReorderVideosRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.LessonId))
            return BadRequest(new { detail = "LessonId không được để trống khi sắp xếp video." });

        if (req.VideoIds == null || req.VideoIds.Count == 0)
            return BadRequest(new { detail = "Danh sách videoIds không được rỗng." });

        if (req.VideoIds.Distinct().Count() != req.VideoIds.Count)
            return BadRequest(new { detail = "Danh sách videoIds chứa mã video trùng lặp." });

        var videos = await _db.ContentLessonVideos
            .Where(v => v.LessonId == req.LessonId)
            .ToListAsync();

        if (videos.Count != req.VideoIds.Count)
        {
            return BadRequest(new
            {
                detail = $"Số lượng video gửi lên ({req.VideoIds.Count}) không khớp với tổng số video của bài học ({videos.Count})."
            });
        }

        var map = videos.ToDictionary(v => v.Id);
        foreach (var id in req.VideoIds)
        {
            if (!map.ContainsKey(id))
                return BadRequest(new { detail = $"Mã video '{id}' không thuộc bài học này." });
        }

        for (int i = 0; i < req.VideoIds.Count; i++)
        {
            var v = map[req.VideoIds[i]];
            v.SortOrder = i + 1;
            v.UpdatedAt = DateTimeOffset.UtcNow;
        }

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lesson_videos_reordered",
            TargetType = "content_lesson_video",
            TargetId = req.LessonId,
            Payload = JsonSerializer.Serialize(new { lessonId = req.LessonId, count = req.VideoIds.Count }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã cập nhật thứ tự {req.VideoIds.Count} video thành công." });
    }

    [HttpPost("videos/preview-metadata")]
    public async Task<IActionResult> PreviewVideoMetadata([FromBody] VideoPreviewRequestDto req, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(req.Url))
            return BadRequest(new { detail = "URL video không được để trống." });

        if (_videoVerificationService != null)
        {
            var res = await _videoVerificationService.VerifyVideoUrlAsync(req.Url, cancellationToken);
            if (!res.IsValid)
            {
                return BadRequest(new
                {
                    detail = res.ErrorMessage ?? "URL video không hợp lệ hoặc bị từ chối bởi cơ chế an toàn SSRF."
                });
            }
            return Ok(res);
        }

        var (provider, ytId, embedUrl) = ParseVideoUrl(req.Url);
        return Ok(new VideoPreviewResponseDto
        {
            IsValid = !string.IsNullOrEmpty(ytId),
            Provider = provider ?? "youtube",
            VideoId = ytId,
            Title = !string.IsNullOrEmpty(ytId) ? $"Video {ytId}" : "Video bài giảng",
            EmbedUrl = embedUrl,
            EmbedAllowed = true,
            ThumbnailUrl = ytId != null ? $"https://i.ytimg.com/vi/{ytId}/hqdefault.jpg" : null,
            AttributionText = "Nguồn: YouTube"
        });
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

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("lessons/reorder")]
    public async Task<IActionResult> ReorderLessons([FromBody] ReorderLessonsRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.ChapterId))
            return BadRequest(new { detail = "ChapterId không được để trống khi sắp xếp bài học." });

        if (req.LessonIds == null || req.LessonIds.Count == 0)
            return BadRequest(new { detail = "Danh sách lessonIds không được rỗng." });

        if (req.LessonIds.Distinct().Count() != req.LessonIds.Count)
            return BadRequest(new { detail = "Danh sách lessonIds chứa mã bài học trùng lặp." });

        var lessonsQuery = _db.ContentLessons.Where(l => l.ChapterId == req.ChapterId);
        if (!string.IsNullOrWhiteSpace(req.TopicId))
        {
            lessonsQuery = lessonsQuery.Where(l => l.TopicId == req.TopicId);
        }

        var lessons = await lessonsQuery.ToListAsync();
        if (lessons.Count != req.LessonIds.Count)
        {
            return BadRequest(new
            {
                detail = $"Số lượng bài học gửi lên ({req.LessonIds.Count}) không khớp với tổng số bài học trong phạm vi sắp xếp ({lessons.Count})."
            });
        }

        var map = lessons.ToDictionary(l => l.Id);
        foreach (var id in req.LessonIds)
        {
            if (!map.ContainsKey(id))
                return BadRequest(new { detail = $"Mã bài học '{id}' không thuộc phạm vi sắp xếp đã chọn." });
        }

        for (int i = 0; i < req.LessonIds.Count; i++)
        {
            var l = map[req.LessonIds[i]];
            l.OrderIndex = i + 1;
            l.UpdatedAt = DateTimeOffset.UtcNow;
        }

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "lessons_reordered",
            TargetType = "content_lesson",
            TargetId = req.ChapterId,
            Payload = JsonSerializer.Serialize(new { chapterId = req.ChapterId, topicId = req.TopicId, count = req.LessonIds.Count }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = $"Đã cập nhật thứ tự {req.LessonIds.Count} bài học thành công." });
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

        if (await IsFourEyesRestrictedAsync(les.AuthorId))
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

        var approvalRevision = await CreateLessonRevisionAsync(les, "Phê duyệt xuất bản bài học");

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

        await SaveChangesWithRevisionRetryAsync(approvalRevision);
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

        if (await IsFourEyesRestrictedAsync(les.AuthorId))
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
            targetRev = await _db.ContentRevisions.FirstOrDefaultAsync(r => r.Id == req.RevisionId && r.ContentId == lessonId && r.ContentType == "lesson");
            if (targetRev == null)
            {
                return NotFound(new { detail = $"Không tìm thấy phiên bản revision '{req.RevisionId}' cho bài học này." });
            }
        }
        else if (req?.TargetVersion.HasValue == true)
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == lessonId && r.ContentType == "lesson" && r.Version == req.TargetVersion.Value)
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
                .Where(r => r.ContentId == lessonId && r.ContentType == "lesson")
                .OrderByDescending(r => r.CreatedAt)
                .Skip(1)
                .FirstOrDefaultAsync();
        }

        if (targetRev == null)
            return Conflict(new { detail = "Không có phiên bản trước đó để khôi phục bài học." });
        if (string.IsNullOrWhiteSpace(targetRev.SnapshotJson))
            return Conflict(new { detail = "Phiên bản được chọn không có snapshot hợp lệ." });

        var previousStatus = les.Status;

        try
        {
            using var doc = JsonDocument.Parse(targetRev.SnapshotJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("schemaVersion", out var schemaVersion) &&
                (schemaVersion.ValueKind != JsonValueKind.Number || !schemaVersion.TryGetInt32(out var version) || version != 1))
                return Conflict(new { detail = "Schema snapshot của phiên bản không được hỗ trợ." });

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
            return Conflict(new { detail = "Snapshot của phiên bản bị hỏng và không thể khôi phục an toàn." });
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

        await SaveChangesWithRevisionRetryAsync(rollbackRev);
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
            var lessonIds = lessons.Select(l => l.Id).ToList();
            var lessonRevs = await _db.ContentRevisions
                .AsNoTracking()
                .Where(r => lessonIds.Contains(r.ContentId))
                .OrderByDescending(r => r.Version)
                .ToListAsync();

            var revByLesson = lessonRevs.GroupBy(r => r.ContentId).ToDictionary(g => g.Key, g => g.First());

            var reviewerIds = lessons.Select(l => l.ReviewedBy).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            var reviewerMap = await _db.Users.AsNoTracking().Where(u => reviewerIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.DisplayName);

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
            var questions = await questionQuery.OrderByDescending(q => q.UpdatedAt).Take(100).ToListAsync();
            var questionIds = questions.Select(q => q.Id).ToList();
            var questionRevs = await _db.ContentRevisions
                .AsNoTracking()
                .Where(r => questionIds.Contains(r.ContentId))
                .OrderByDescending(r => r.Version)
                .ToListAsync();

            var revByQuestion = questionRevs.GroupBy(r => r.ContentId).ToDictionary(g => g.Key, g => g.First());

            var reviewerIds = questions.Select(q => q.ReviewedBy).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            var reviewerMap = await _db.Users.AsNoTracking().Where(u => reviewerIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.DisplayName);

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

        return Ok(results);
    }

    #endregion

    #region Assessment Endpoints

    [HttpGet("assessments")]
    public async Task<IActionResult> ListAssessments(
        [FromQuery] string? subjectId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] string? lessonId = null)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được quản lý bài đánh giá." });

        var query = _db.ContentAssessments
            .AsNoTracking()
            .Include(a => a.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(a => a.Questions.Where(q => !q.IsDeleted))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(lessonId))
        {
            query = query.Where(a => a.LessonId == lessonId);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(a => a.Status == status);
        }
        else
        {
            query = query.Where(a => a.Status != "archived");
        }

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            query = query.Where(a => a.Lesson != null && a.Lesson.Chapter != null && a.Lesson.Chapter.SubjectId == subjectId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(a => a.Title.ToLower().Contains(q) || (a.Lesson != null && a.Lesson.Title.ToLower().Contains(q)));
        }

        var list = await query.OrderByDescending(a => a.UpdatedAt).ToListAsync();
        var dtos = list.Select(FormatAssessmentSummary).ToList();
        return Ok(dtos);
    }

    [HttpGet("assessments/{id}")]
    public async Task<IActionResult> GetAssessmentDetail(string id)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được quản lý bài đánh giá." });

        var a = await _db.ContentAssessments
            .AsNoTracking()
            .Include(x => x.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(x => x.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(x => x.Id == id);

        if (a == null)
            return NotFound(new { detail = "Bài kiểm tra / đánh giá không tồn tại." });

        return Ok(FormatAssessmentDetail(a));
    }

    [HttpPost("assessments")]
    public async Task<IActionResult> CreateAssessment([FromBody] CreateAssessmentRequestDto req)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được tạo bài đánh giá." });
        if (string.IsNullOrWhiteSpace(req.LessonId))
            return BadRequest(new { detail = "Bài học (LessonId) không được để trống." });
        if (req.PassingScore is < 0 or > 100)
            return BadRequest(new { detail = "Điểm đạt phải nằm trong khoảng 0 đến 100." });
        if (req.DurationMinutes is <= 0 or > 480)
            return BadRequest(new { detail = "Thời lượng phải nằm trong khoảng 1 đến 480 phút." });
        if (!string.IsNullOrWhiteSpace(req.Status) && !IsValidAssessmentStatus(req.Status))
            return BadRequest(new { detail = "Trạng thái bài đánh giá không hợp lệ." });

        var lesson = await _db.ContentLessons
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(l => l.Id == req.LessonId);

        if (lesson == null)
            return NotFound(new { detail = "Bài học được liên kết không tồn tại." });

        var existing = await _db.ContentAssessments.FirstOrDefaultAsync(a => a.LessonId == req.LessonId);
        if (existing != null)
            return Conflict(new { detail = "Bài học này đã có bài đánh giá. Vui lòng cập nhật bài đánh giá hiện có." });

        var title = !string.IsNullOrWhiteSpace(req.Title) ? req.Title.Trim() : $"Bài kiểm tra: {lesson.Title}";
        var assessment = new ContentAssessment
        {
            Id = $"asm_{Guid.NewGuid():N}",
            LessonId = req.LessonId,
            Title = title,
            PassScore = req.PassingScore ?? 80,
            DurationMinutes = req.DurationMinutes ?? 15,
            Status = !string.IsNullOrWhiteSpace(req.Status) ? req.Status : "draft",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentAssessments.Add(assessment);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "assessment_created",
            TargetType = "content_assessment",
            TargetId = assessment.Id,
            Payload = JsonSerializer.Serialize(new { assessment.Id, assessment.LessonId, assessment.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        assessment.Lesson = lesson;
        return StatusCode(StatusCodes.Status201Created, FormatAssessmentDetail(assessment));
    }

    [HttpPut("assessments/{id}")]
    public async Task<IActionResult> UpdateAssessment(string id, [FromBody] UpdateAssessmentRequestDto req)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được cập nhật bài đánh giá." });
        if (req.PassingScore is < 0 or > 100)
            return BadRequest(new { detail = "Điểm đạt phải nằm trong khoảng 0 đến 100." });
        if (req.DurationMinutes is <= 0 or > 480)
            return BadRequest(new { detail = "Thời lượng phải nằm trong khoảng 1 đến 480 phút." });
        if (!string.IsNullOrWhiteSpace(req.Status) && !IsValidAssessmentStatus(req.Status))
            return BadRequest(new { detail = "Trạng thái bài đánh giá không hợp lệ." });

        var assessment = await _db.ContentAssessments
            .Include(a => a.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(a => a.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assessment == null)
            return NotFound(new { detail = "Bài kiểm tra / đánh giá không tồn tại." });

        if (!string.IsNullOrWhiteSpace(req.Title))
            assessment.Title = req.Title.Trim();

        if (req.PassingScore.HasValue)
            assessment.PassScore = req.PassingScore.Value;

        if (req.DurationMinutes.HasValue)
            assessment.DurationMinutes = req.DurationMinutes.Value;

        if (!string.IsNullOrWhiteSpace(req.Status))
            assessment.Status = req.Status.Trim();

        assessment.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "assessment_updated",
            TargetType = "content_assessment",
            TargetId = assessment.Id,
            Payload = JsonSerializer.Serialize(new { assessment.Id, assessment.Title, assessment.Status }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatAssessmentDetail(assessment));
    }

    [HttpDelete("assessments/{id}")]
    public async Task<IActionResult> DeleteAssessment(string id)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được lưu trữ bài đánh giá." });

        var assessment = await _db.ContentAssessments.FirstOrDefaultAsync(a => a.Id == id);
        if (assessment == null)
            return NotFound(new { detail = "Bài kiểm tra / đánh giá không tồn tại." });

        assessment.Status = "archived";
        assessment.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "assessment_archived",
            TargetType = "content_assessment",
            TargetId = id,
            Payload = JsonSerializer.Serialize(new { assessment.Id, assessment.Title }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { success = true, detail = "Đã lưu trữ bài đánh giá thành công." });
    }

    [HttpPut("assessments/{id}/status")]
    public async Task<IActionResult> UpdateAssessmentStatus(string id, [FromBody] JsonObject body)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được đổi trạng thái bài đánh giá." });
        var status = body?["status"]?.ToString();
        if (string.IsNullOrWhiteSpace(status))
            return BadRequest(new { detail = "Trạng thái mới không được để trống." });
        if (!IsValidAssessmentStatus(status))
            return BadRequest(new { detail = "Trạng thái bài đánh giá không hợp lệ." });

        var assessment = await _db.ContentAssessments
            .Include(a => a.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(a => a.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assessment == null)
            return NotFound(new { detail = "Bài kiểm tra / đánh giá không tồn tại." });

        assessment.Status = status.Trim();
        assessment.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "assessment_status_changed",
            TargetType = "content_assessment",
            TargetId = assessment.Id,
            Payload = JsonSerializer.Serialize(new { assessment.Id, status = assessment.Status }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatAssessmentDetail(assessment));
    }

    [HttpPost("assessments/{id}/questions")]
    public async Task<IActionResult> AddAssessmentQuestion(string id, [FromBody] AddAssessmentQuestionRequestDto req)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được thêm câu hỏi." });
        if (string.IsNullOrWhiteSpace(req.Prompt))
            return BadRequest(new { detail = "Nội dung câu hỏi không được để trống." });

        var assessment = await _db.ContentAssessments
            .Include(a => a.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Include(a => a.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assessment == null)
            return NotFound(new { detail = "Bài kiểm tra / đánh giá không tồn tại." });

        var optStrings = req.Options?.Select(o => o.Text).ToList() ?? new List<string>();
        var optJson = req.Options != null ? JsonSerializer.Serialize(req.Options) : JsonSerializer.Serialize(optStrings);

        var q = new ContentQuestion
        {
            Id = $"q_{Guid.NewGuid():N}",
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
            AuthorId = CurrentUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.ContentQuestions.Add(q);
        assessment.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "assessment_question_added",
            TargetType = "content_question",
            TargetId = q.Id,
            Payload = JsonSerializer.Serialize(new { assessmentId = id, questionId = q.Id }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        assessment.Questions.Add(q);
        return StatusCode(StatusCodes.Status201Created, FormatAssessmentDetail(assessment));
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

        var defaultStatus = IsContentStaffOrAdmin
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
            ReviewedBy = IsContentStaffOrAdmin && defaultStatus == "published" ? CurrentUserId : null,
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
        if (!User.IsInRole("content") && !User.IsInRole("content_admin") && !User.HasClaim("permission", "content.approve"))
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

        if (await IsFourEyesRestrictedAsync(question.AuthorId))
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
                detail = "QUYỀN PHÊ DUYỆT: Role 'content' hoặc 'admin' là người có thẩm quyền từ chối nội dung giáo dục cuối cùng."
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

        if (await IsFourEyesRestrictedAsync(question.AuthorId))
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

    [HttpPost("questions/{questionId}/request-changes")]
    public async Task<IActionResult> RequestChangesQuestion(string questionId, [FromBody] JsonObject? body = null)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền yêu cầu chỉnh sửa câu hỏi."
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

        if (await IsFourEyesRestrictedAsync(question.AuthorId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không thể tự yêu cầu chỉnh sửa câu hỏi của chính mình." });
        }

        var feedback = body?["feedback"]?.ToString() ?? body?["reason"]?.ToString();
        var reason = !string.IsNullOrWhiteSpace(feedback)
            ? feedback.Trim()
            : "Nội dung câu hỏi cần chỉnh sửa trước khi phê duyệt.";

        question.Status = "draft";
        question.ReviewedBy = CurrentUserId;
        question.RejectionReason = reason;
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "question_changes_requested",
            TargetType = "content_question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new { code = question.Code, feedback = reason, authorId = question.AuthorId, reviewerId = CurrentUserId }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatQuestion(question));
    }

    [HttpPost("questions/{questionId}/publish")]
    public async Task<IActionResult> PublishQuestion(string questionId)
    {
        if (!User.IsInRole("content") && !User.IsInRole("content_admin") && !User.HasClaim("permission", "content.publish"))
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

        if (await IsFourEyesRestrictedAsync(question.AuthorId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Quy tắc kiểm duyệt độc lập (four-eyes): Người biên soạn không được tự xuất bản câu hỏi của chính mình." });
        }

        question.Status = "published";
        question.UpdatedAt = DateTimeOffset.UtcNow;

        var publicationRevision = await CreateQuestionRevisionAsync(question, "Xuất bản câu hỏi");

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

        await SaveChangesWithRevisionRetryAsync(publicationRevision);
        return Ok(FormatQuestion(question));
    }

    [HttpPost("questions/{questionId}/unpublish")]
    public async Task<IActionResult> UnpublishQuestion(string questionId)
    {
        if (!User.IsInRole("content") && !User.IsInRole("content_admin") && !User.HasClaim("permission", "content.publish"))
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
            targetRev = await _db.ContentRevisions.FirstOrDefaultAsync(r => r.Id == req.RevisionId && r.ContentId == questionId && r.ContentType == "question");
            if (targetRev == null)
            {
                return NotFound(new { detail = $"Không tìm thấy phiên bản revision '{req.RevisionId}' cho câu hỏi này." });
            }
        }
        else if (req?.TargetVersion.HasValue == true)
        {
            targetRev = await _db.ContentRevisions
                .Where(r => r.ContentId == questionId && r.ContentType == "question" && r.Version == req.TargetVersion.Value)
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
                .Where(r => r.ContentId == questionId && r.ContentType == "question")
                .OrderByDescending(r => r.CreatedAt)
                .Skip(1)
                .FirstOrDefaultAsync();
        }

        if (targetRev == null)
            return Conflict(new { detail = "Không có phiên bản trước đó để khôi phục câu hỏi." });
        if (string.IsNullOrWhiteSpace(targetRev.SnapshotJson))
            return Conflict(new { detail = "Phiên bản được chọn không có snapshot hợp lệ." });

        var previousStatus = question.Status;

        try
        {
            using var doc = JsonDocument.Parse(targetRev.SnapshotJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("schemaVersion", out var schemaVersion) &&
                (schemaVersion.ValueKind != JsonValueKind.Number || !schemaVersion.TryGetInt32(out var version) || version != 1))
                return Conflict(new { detail = "Schema snapshot của phiên bản không được hỗ trợ." });

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
            return Conflict(new { detail = "Snapshot của phiên bản bị hỏng và không thể khôi phục an toàn." });
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

        await SaveChangesWithRevisionRetryAsync(rollbackRev);
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

    #endregion

    #region Curriculum Management Endpoints

    private static string? FindCatalogFilePath()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "data", "curriculum", "math-vietnam-catalog.v1.json"),
            "D:\\TN\\backend\\data\\curriculum\\math-vietnam-catalog.v1.json"
        };

        foreach (var path in candidates)
        {
            if (System.IO.File.Exists(path))
            {
                return Path.GetFullPath(path);
            }
        }
        return null;
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("curriculum/dry-run")]
    public async Task<IActionResult> DryRunCurriculumImport([FromBody] JsonObject? body = null)
    {
        var filePath = FindCatalogFilePath();
        if (filePath == null)
        {
            return NotFound(new { detail = "Không tìm thấy tệp danh mục 'math-vietnam-catalog.v1.json' trên máy chủ." });
        }

        var jsonText = await System.IO.File.ReadAllTextAsync(filePath);
        using var doc = JsonDocument.Parse(jsonText);
        var root = doc.RootElement;

        var subjects = root.GetProperty("subjects");
        int subjectCount = subjects.GetArrayLength();
        int chapterCount = 0;
        int topicCount = 0;
        int lessonCount = 0;
        int videoCount = 0;

        var preservedLessonIds = new List<string>();

        foreach (var sub in subjects.EnumerateArray())
        {
            if (sub.TryGetProperty("chapters", out var chaps))
            {
                chapterCount += chaps.GetArrayLength();
                foreach (var ch in chaps.EnumerateArray())
                {
                    if (ch.TryGetProperty("topics", out var tops))
                    {
                        topicCount += tops.GetArrayLength();
                        foreach (var top in tops.EnumerateArray())
                        {
                            if (top.TryGetProperty("lessons", out var lesList))
                            {
                                lessonCount += lesList.GetArrayLength();
                                foreach (var les in lesList.EnumerateArray())
                                {
                                    var lId = les.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
                                    if (!string.IsNullOrEmpty(lId))
                                    {
                                        var hasProgress = await _db.LessonProgresses.AnyAsync(lp => lp.LessonId == lId);
                                        if (hasProgress) preservedLessonIds.Add(lId);
                                    }

                                    if (les.TryGetProperty("videos", out var vids))
                                    {
                                        videoCount += vids.GetArrayLength();
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return Ok(new
        {
            success = true,
            mode = "dry-run",
            catalogPath = filePath,
            summary = new
            {
                subjects = subjectCount,
                chapters = chapterCount,
                topics = topicCount,
                lessons = lessonCount,
                videos = videoCount,
                preservedLessonsWithUserData = preservedLessonIds
            },
            message = $"Bản dùng thử (Dry-Run) hoàn tất: Nhận diện {subjectCount} môn học, {chapterCount} chương, {topicCount} chủ đề, {lessonCount} bài học và {videoCount} video bài giảng kiểm chứng. Không có dữ liệu nào bị ghi đè hay thay đổi."
        });
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("curriculum/apply")]
    public async Task<IActionResult> ApplyCurriculumImport([FromBody] JsonObject? body = null)
    {
        var filePath = FindCatalogFilePath();
        if (filePath == null)
        {
            return NotFound(new { detail = "Không tìm thấy tệp danh mục 'math-vietnam-catalog.v1.json' trên máy chủ." });
        }

        var jsonText = await System.IO.File.ReadAllTextAsync(filePath);
        using var doc = JsonDocument.Parse(jsonText);
        var root = doc.RootElement;

        var subjects = root.GetProperty("subjects");

        int upsertedSubjects = 0;
        int upsertedChapters = 0;
        int upsertedTopics = 0;
        int upsertedLessons = 0;
        int upsertedVideos = 0;

        using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            foreach (var subElem in subjects.EnumerateArray())
            {
                var sId = subElem.GetProperty("id").GetString()!;
                var sCode = subElem.GetProperty("code").GetString()!;
                var sName = subElem.GetProperty("name").GetString()!;
                var sGrade = subElem.GetProperty("grade").GetString()!;
                var sDesc = subElem.TryGetProperty("description", out var sd) ? sd.GetString() : null;
                var sOrder = subElem.TryGetProperty("orderIndex", out var so) ? so.GetInt32() : 0;

                var existingSub = await _db.ContentSubjects.FirstOrDefaultAsync(s => s.Id == sId || s.Code == sCode);
                if (existingSub == null)
                {
                    existingSub = new ContentSubject
                    {
                        Id = sId,
                        Code = sCode,
                        Name = sName,
                        Grade = sGrade,
                        Description = sDesc,
                        OrderIndex = sOrder,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _db.ContentSubjects.Add(existingSub);
                }
                else
                {
                    existingSub.Name = sName;
                    existingSub.Grade = sGrade;
                    existingSub.Description = sDesc;
                    existingSub.OrderIndex = sOrder;
                    existingSub.IsActive = true;
                    existingSub.UpdatedAt = DateTimeOffset.UtcNow;
                }
                upsertedSubjects++;

                if (subElem.TryGetProperty("chapters", out var chapsElem))
                {
                    foreach (var chElem in chapsElem.EnumerateArray())
                    {
                        var cId = chElem.GetProperty("id").GetString()!;
                        var cCode = chElem.GetProperty("code").GetString()!;
                        var cTitle = chElem.GetProperty("title").GetString()!;
                        var cDesc = chElem.TryGetProperty("description", out var cd) ? cd.GetString() : null;
                        var cOrder = chElem.TryGetProperty("orderIndex", out var co) ? co.GetInt32() : 0;
                        var cSrcName = chElem.TryGetProperty("sourceName", out var csn) ? csn.GetString() : "Khan Academy Vietnam";
                        var cSrcUrl = chElem.TryGetProperty("sourceUrl", out var csu) ? csu.GetString() : null;

                        var existingCh = await _db.ContentChapters.FirstOrDefaultAsync(c => c.Id == cId || (c.SubjectId == existingSub.Id && c.Title == cTitle));
                        if (existingCh == null)
                        {
                            existingCh = new ContentChapter
                            {
                                Id = cId,
                                SubjectId = existingSub.Id,
                                Title = cTitle,
                                Description = cDesc,
                                OrderIndex = cOrder,
                                IsActive = true,
                                Status = "published",
                                SourceName = cSrcName,
                                SourceUrl = cSrcUrl,
                                CreatedAt = DateTimeOffset.UtcNow,
                                UpdatedAt = DateTimeOffset.UtcNow
                            };
                            _db.ContentChapters.Add(existingCh);
                        }
                        else
                        {
                            existingCh.Title = cTitle;
                            existingCh.Description = cDesc;
                            existingCh.OrderIndex = cOrder;
                            existingCh.IsActive = true;
                            existingCh.Status = "published";
                            existingCh.SourceName = cSrcName;
                            existingCh.SourceUrl = cSrcUrl;
                            existingCh.UpdatedAt = DateTimeOffset.UtcNow;
                        }
                        upsertedChapters++;

                        if (chElem.TryGetProperty("topics", out var topsElem))
                        {
                            foreach (var topElem in topsElem.EnumerateArray())
                            {
                                var tId = topElem.GetProperty("id").GetString()!;
                                var tTitle = topElem.GetProperty("title").GetString()!;
                                var tDesc = topElem.TryGetProperty("description", out var td) ? td.GetString() : null;
                                var tOrder = topElem.TryGetProperty("orderIndex", out var to) ? to.GetInt32() : 0;

                                var existingTop = await _db.ContentTopics.FirstOrDefaultAsync(t => t.Id == tId || (t.ChapterId == existingCh.Id && t.Title == tTitle));
                                if (existingTop == null)
                                {
                                    existingTop = new ContentTopic
                                    {
                                        Id = tId,
                                        ChapterId = existingCh.Id,
                                        Title = tTitle,
                                        Description = tDesc,
                                        OrderIndex = tOrder,
                                        IsActive = true,
                                        CreatedAt = DateTimeOffset.UtcNow,
                                        UpdatedAt = DateTimeOffset.UtcNow
                                    };
                                    _db.ContentTopics.Add(existingTop);
                                }
                                else
                                {
                                    existingTop.Title = tTitle;
                                    existingTop.Description = tDesc;
                                    existingTop.OrderIndex = tOrder;
                                    existingTop.IsActive = true;
                                    existingTop.UpdatedAt = DateTimeOffset.UtcNow;
                                }
                                upsertedTopics++;

                                if (topElem.TryGetProperty("lessons", out var lesElemList))
                                {
                                    foreach (var lesElem in lesElemList.EnumerateArray())
                                    {
                                        var lId = lesElem.GetProperty("id").GetString()!;
                                        var lTitle = lesElem.GetProperty("title").GetString()!;
                                        var lSlug = lesElem.GetProperty("slug").GetString()!;
                                        var lOrder = lesElem.TryGetProperty("orderIndex", out var lo) ? lo.GetInt32() : 0;
                                        var lIntro = lesElem.TryGetProperty("introduction", out var li) ? li.GetString() : null;
                                        var lSrcName = lesElem.TryGetProperty("sourceName", out var lsn) ? lsn.GetString() : "Khan Academy Vietnam";
                                        var lSrcUrl = lesElem.TryGetProperty("sourceUrl", out var lsu) ? lsu.GetString() : null;
                                        var lSrcLic = lesElem.TryGetProperty("sourceLicense", out var lsl) ? lsl.GetString() : "CC BY-NC-SA 4.0";

                                        var lObjectives = lesElem.TryGetProperty("learningObjectives", out var obj) ? obj.GetRawText() : "[]";
                                        var lDefs = lesElem.TryGetProperty("definitions", out var def) ? def.GetRawText() : "[]";
                                        var lForms = lesElem.TryGetProperty("formulas", out var frm) ? frm.GetRawText() : "[]";
                                        var lExs = lesElem.TryGetProperty("examples", out var exm) ? exm.GetRawText() : "[]";
                                        var lNotes = lesElem.TryGetProperty("importantNotes", out var nts) ? nts.GetRawText() : "[]";
                                        var lSums = lesElem.TryGetProperty("summaryPoints", out var smp) ? smp.GetRawText() : "[]";

                                        var existingLes = await _db.ContentLessons.FirstOrDefaultAsync(l => l.Id == lId || (l.ChapterId == existingCh.Id && l.Slug == lSlug));
                                        if (existingLes == null)
                                        {
                                            existingLes = new ContentLesson
                                            {
                                                Id = lId,
                                                ChapterId = existingCh.Id,
                                                TopicId = existingTop.Id,
                                                Title = lTitle,
                                                Slug = lSlug,
                                                OrderIndex = lOrder,
                                                Status = "published",
                                                AuthorId = CurrentUserId,
                                                SourceName = lSrcName,
                                                SourceUrl = lSrcUrl,
                                                SourceLicense = lSrcLic,
                                                Introduction = lIntro,
                                                LearningObjectivesJson = lObjectives,
                                                DefinitionsJson = lDefs,
                                                FormulasJson = lForms,
                                                ExamplesJson = lExs,
                                                ImportantNotesJson = lNotes,
                                                SummaryPointsJson = lSums,
                                                CreatedAt = DateTimeOffset.UtcNow,
                                                UpdatedAt = DateTimeOffset.UtcNow
                                            };
                                            _db.ContentLessons.Add(existingLes);
                                        }
                                        else
                                        {
                                            existingLes.ChapterId = existingCh.Id;
                                            existingLes.TopicId = existingTop.Id;
                                            existingLes.Title = lTitle;
                                            existingLes.Slug = lSlug;
                                            existingLes.OrderIndex = lOrder;
                                            existingLes.Status = "published";
                                            existingLes.SourceName = lSrcName;
                                            existingLes.SourceUrl = lSrcUrl;
                                            existingLes.SourceLicense = lSrcLic;
                                            existingLes.Introduction = lIntro;
                                            existingLes.LearningObjectivesJson = lObjectives;
                                            existingLes.DefinitionsJson = lDefs;
                                            existingLes.FormulasJson = lForms;
                                            existingLes.ExamplesJson = lExs;
                                            existingLes.ImportantNotesJson = lNotes;
                                            existingLes.SummaryPointsJson = lSums;
                                            existingLes.UpdatedAt = DateTimeOffset.UtcNow;
                                        }
                                        upsertedLessons++;

                                        if (lesElem.TryGetProperty("videos", out var vidsElem))
                                        {
                                            foreach (var vidElem in vidsElem.EnumerateArray())
                                            {
                                                var vId = vidElem.GetProperty("id").GetString()!;
                                                var vTitle = vidElem.GetProperty("title").GetString()!;
                                                var vDesc = vidElem.TryGetProperty("description", out var vd) ? vd.GetString() : null;
                                                var vProv = vidElem.TryGetProperty("provider", out var vp) ? vp.GetString() ?? "youtube" : "youtube";
                                                var vSrc = vidElem.GetProperty("sourceUrl").GetString()!;
                                                var vEmbed = vidElem.TryGetProperty("embedUrl", out var ve) ? ve.GetString() : null;
                                                var vYtId = vidElem.TryGetProperty("youtubeVideoId", out var vy) ? vy.GetString() : null;
                                                var vChan = vidElem.TryGetProperty("channelName", out var vc) ? vc.GetString() : null;
                                                var vPri = vidElem.TryGetProperty("isPrimary", out var vpr) && vpr.GetBoolean();
                                                var vAttr = vidElem.TryGetProperty("attributionText", out var va) ? va.GetString() : null;
                                                var vDur = vidElem.TryGetProperty("durationSeconds", out var vdu) ? vdu.GetInt32() : 0;
                                                var vThumb = vidElem.TryGetProperty("thumbnailUrl", out var vt) ? vt.GetString() : null;
                                                var vSort = vidElem.TryGetProperty("sortOrder", out var vs) ? vs.GetInt32() : 1;
                                                var vAllowed = !vidElem.TryGetProperty("embedAllowed", out var vaa) || vaa.GetBoolean();

                                                var existingVid = await _db.ContentLessonVideos.FirstOrDefaultAsync(v => v.Id == vId || (v.LessonId == existingLes.Id && v.SourceUrl == vSrc));
                                                if (existingVid == null)
                                                {
                                                    existingVid = new ContentLessonVideo
                                                    {
                                                        Id = vId,
                                                        LessonId = existingLes.Id,
                                                        Title = vTitle,
                                                        Description = vDesc,
                                                        Provider = vProv,
                                                        SourceUrl = vSrc,
                                                        EmbedUrl = vEmbed,
                                                        YouTubeVideoId = vYtId,
                                                        ChannelName = vChan,
                                                        IsPrimary = vPri,
                                                        AttributionText = vAttr,
                                                        Language = "vi",
                                                        DurationSeconds = vDur,
                                                        ThumbnailUrl = vThumb,
                                                        SortOrder = vSort,
                                                        EmbedAllowed = vAllowed,
                                                        VerificationStatus = "verified",
                                                        VerifiedAt = DateTimeOffset.UtcNow,
                                                        LastVerifiedAt = DateTimeOffset.UtcNow,
                                                        IsPublished = true,
                                                        CreatedAt = DateTimeOffset.UtcNow,
                                                        UpdatedAt = DateTimeOffset.UtcNow
                                                    };
                                                    _db.ContentLessonVideos.Add(existingVid);
                                                }
                                                else
                                                {
                                                    existingVid.Title = vTitle;
                                                    existingVid.Description = vDesc;
                                                    existingVid.Provider = vProv;
                                                    existingVid.EmbedUrl = vEmbed;
                                                    existingVid.YouTubeVideoId = vYtId;
                                                    existingVid.ChannelName = vChan;
                                                    existingVid.IsPrimary = vPri;
                                                    existingVid.AttributionText = vAttr;
                                                    existingVid.DurationSeconds = vDur;
                                                    existingVid.ThumbnailUrl = vThumb;
                                                    existingVid.SortOrder = vSort;
                                                    existingVid.EmbedAllowed = vAllowed;
                                                    existingVid.VerificationStatus = "verified";
                                                    existingVid.VerifiedAt = DateTimeOffset.UtcNow;
                                                    existingVid.LastVerifiedAt = DateTimeOffset.UtcNow;
                                                    existingVid.IsPublished = true;
                                                    existingVid.UpdatedAt = DateTimeOffset.UtcNow;
                                                }
                                                upsertedVideos++;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "curriculum_imported",
                TargetType = "curriculum_catalog",
                TargetId = "math-vietnam-catalog.v1",
                Payload = JsonSerializer.Serialize(new
                {
                    subjects = upsertedSubjects,
                    chapters = upsertedChapters,
                    topics = upsertedTopics,
                    lessons = upsertedLessons,
                    videos = upsertedVideos,
                    importedBy = CurrentUserId
                }),
                CreatedAt = DateTimeOffset.UtcNow
            });

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                success = true,
                mode = "applied",
                message = "Đã áp dụng toàn bộ danh mục Toán 10, 11, 12 và video bài học kiểm chứng thành công vào cơ sở dữ liệu.",
                counts = new
                {
                    subjects = upsertedSubjects,
                    chapters = upsertedChapters,
                    topics = upsertedTopics,
                    lessons = upsertedLessons,
                    videos = upsertedVideos
                }
            });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger?.LogError(ex, "Lỗi khi áp dụng danh mục chương trình học.");
            return StatusCode(500, new { detail = $"Lỗi khi áp dụng danh mục: {ex.Message}" });
        }
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("curriculum/audit-cleanup")]
    public async Task<IActionResult> AuditAndCleanupTestCurriculum([FromQuery] bool dryRun = true)
    {
        // 1. Identify test/dummy fixtures that are not part of official curriculum
        var testSubjects = await _db.ContentSubjects
            .Where(s => s.Code.StartsWith("TEST_") || s.Code.StartsWith("SEC_") || s.Code.StartsWith("PHYS12_") || s.Name.Contains("kiểm thử"))
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
            .ToListAsync();

        var preservedLessonIds = new HashSet<string>();
        var candidateLessons = testSubjects.SelectMany(s => s.Chapters).SelectMany(c => c.Lessons).ToList();

        foreach (var l in candidateLessons)
        {
            var hasProgress = await _db.LessonProgresses.AnyAsync(lp => lp.LessonId == l.Id);
            var hasAttempts = await _db.AssessmentAttempts.AnyAsync(aa => aa.LessonId == l.Id);
            var hasAssessments = await _db.ContentAssessments.AnyAsync(ca => ca.LessonId == l.Id);

            if (hasProgress || hasAttempts || hasAssessments)
            {
                preservedLessonIds.Add(l.Id);
            }
        }

        if (dryRun)
        {
            return Ok(new
            {
                success = true,
                dryRun = true,
                testSubjectsCount = testSubjects.Count,
                candidateLessonsCount = candidateLessons.Count,
                preservedLessonsCount = preservedLessonIds.Count,
                preservedLessons = preservedLessonIds.ToList(),
                message = $"Báo cáo kiểm toán: Phát hiện {testSubjects.Count} môn học kiểm thử/fixture ({candidateLessons.Count} bài học). Có {preservedLessonIds.Count} bài học có dữ liệu người học nên được bảo vệ an toàn."
            });
        }

        // Soft-deactivate test subjects that do NOT have preserved lessons
        int deactivatedCount = 0;
        foreach (var s in testSubjects)
        {
            bool hasPreservedInSubject = s.Chapters.SelectMany(c => c.Lessons).Any(l => preservedLessonIds.Contains(l.Id));
            if (!hasPreservedInSubject)
            {
                s.IsActive = false;
                s.UpdatedAt = DateTimeOffset.UtcNow;
                deactivatedCount++;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            dryRun = false,
            deactivatedSubjectsCount = deactivatedCount,
            preservedLessonsCount = preservedLessonIds.Count,
            message = $"Đã lưu trữ an toàn (IsActive = false) {deactivatedCount} môn học kiểm thử; bảo toàn toàn vẹn {preservedLessonIds.Count} bài học có lịch sử học tập."
        });
    }

    #endregion
}
