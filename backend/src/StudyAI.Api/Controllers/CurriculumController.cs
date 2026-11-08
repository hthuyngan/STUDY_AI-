using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace StudyAI.Api.Controllers;

[ApiController]
[Route("api/v1/curriculum")]
public class CurriculumController : ControllerBase
{
    private readonly StudyAIDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CurriculumController> _logger;

    public CurriculumController(StudyAIDbContext db, IMemoryCache cache, ILogger<CurriculumController> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    private static JsonArray SafeJsonArray(string? val)
    {
        if (string.IsNullOrEmpty(val)) return new JsonArray();
        try { return JsonNode.Parse(val) as JsonArray ?? new JsonArray(); } catch { return new JsonArray(); }
    }

    /// <summary>
    /// GET /api/v1/curriculum/subjects
    /// Returns only active subjects with published content.
    /// </summary>
    [HttpGet("subjects")]
    public async Task<IActionResult> GetSubjects([FromQuery] string? grade = null, [FromQuery] string? search = null)
    {
        var query = _db.ContentSubjects
            .Where(s => s.IsActive)
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(grade) && grade != "all")
        {
            query = query.Where(s => s.Grade == grade);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) || s.Code.ToLower().Contains(term));
        }

        var subjects = await query
            .OrderBy(s => s.OrderIndex)
            .ThenBy(s => s.Code)
            .ToListAsync();

        var dtos = subjects.Select(s =>
        {
            var activeChapters = s.Chapters.Where(c => c.IsActive).ToList();
            var publishedLessonCount = activeChapters
                .SelectMany(c => c.Lessons)
                .Count(l => l.Status == "published");

            return new LearnerSubjectDto
            {
                Id = s.Id,
                Name = s.Name,
                Code = s.Code,
                Grade = s.Grade,
                Description = s.Description,
                OrderIndex = s.OrderIndex,
                ChapterCount = activeChapters.Count,
                LessonCount = publishedLessonCount
            };
        }).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// GET /api/v1/curriculum/subjects/{subjectId}/chapters
    /// Returns active chapters and their published lessons for a subject.
    /// </summary>
    [HttpGet("subjects/{subjectId}/chapters")]
    public async Task<IActionResult> GetSubjectChapters(string subjectId)
    {
        var subject = await _db.ContentSubjects
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == subjectId && s.IsActive);

        if (subject == null)
        {
            return NotFound(new { message = $"Môn học '{subjectId}' không tồn tại hoặc đã ngừng kích hoạt." });
        }

        var chapters = await _db.ContentChapters
            .Where(c => c.SubjectId == subjectId && c.IsActive)
            .Include(c => c.Lessons.Where(l => l.Status == "published"))
            .AsNoTracking()
            .OrderBy(c => c.OrderIndex)
            .ToListAsync();

        var response = chapters.Select(c => new LearnerChapterDto
        {
            Id = c.Id,
            Title = c.Title,
            Description = c.Description ?? string.Empty,
            OrderIndex = c.OrderIndex,
            Lessons = c.Lessons
                .OrderBy(l => l.OrderIndex)
                .Select(l => new LearnerLessonSummaryDto
                {
                    Id = l.Id,
                    Title = l.Title,
                    Slug = l.Slug,
                    OrderIndex = l.OrderIndex,
                    Status = l.Status
                })
                .ToList()
        }).ToList();

        return Ok(response);
    }

    /// <summary>
    /// GET /api/v1/curriculum/lessons/{lessonId}
    /// Returns lesson theory & KaTeX formulas.
    /// Returns HTTP 404 for Draft or In-Review lessons.
    /// </summary>
    [HttpGet("lessons/{lessonId}")]
    public async Task<IActionResult> GetLessonDetail(string lessonId)
    {
        var lesson = await _db.ContentLessons
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == lessonId);

        if (lesson == null || lesson.Status != "published" || lesson.Chapter == null || !lesson.Chapter.IsActive || lesson.Chapter.Subject == null || !lesson.Chapter.Subject.IsActive)
        {
            return NotFound(new { message = "Bài học không tồn tại hoặc chưa được xuất bản." });
        }

        var dto = new LearnerLessonDetailDto
        {
            Id = lesson.Id,
            ChapterId = lesson.ChapterId,
            ChapterTitle = lesson.Chapter.Title,
            SubjectId = lesson.Chapter.SubjectId,
            SubjectName = lesson.Chapter.Subject.Name,
            Title = lesson.Title,
            Slug = lesson.Slug,
            OrderIndex = lesson.OrderIndex,
            Introduction = lesson.Introduction ?? string.Empty,
            Definitions = SafeJsonArray(lesson.DefinitionsJson),
            Formulas = SafeJsonArray(lesson.FormulasJson),
            Examples = SafeJsonArray(lesson.ExamplesJson),
            ImportantNotes = SafeJsonArray(lesson.ImportantNotesJson),
            SummaryPoints = SafeJsonArray(lesson.SummaryPointsJson)
        };

        return Ok(dto);
    }

    /// <summary>
    /// GET /api/v1/curriculum/lessons/{lessonId}/questions
    /// STRICT ZERO-LEAK SECURITY: Returns published questions for the lesson WITHOUT CorrectAnswer and Explanation.
    /// Returns HTTP 404 for Draft/In-Review lessons.
    /// </summary>
    [HttpGet("lessons/{lessonId}/questions")]
    public async Task<IActionResult> GetLessonQuestions(string lessonId)
    {
        var lesson = await _db.ContentLessons
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.Status == "published");

        if (lesson == null || lesson.Chapter == null || !lesson.Chapter.IsActive || lesson.Chapter.Subject == null || !lesson.Chapter.Subject.IsActive)
        {
            return NotFound(new { message = "Bài học không tồn tại hoặc chưa được xuất bản." });
        }

        var questions = await _db.ContentQuestions
            .Where(q => q.LessonId == lessonId && q.Status == "published")
            .OrderBy(q => q.OrderIndex)
            .AsNoTracking()
            .ToListAsync();

        var dtos = questions.Select(q =>
        {
            List<string> options = new();
            try
            {
                options = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>();
            }
            catch
            {
                options = new List<string>();
            }

            return new LearnerQuestionDto
            {
                Id = q.Id,
                LessonId = q.LessonId ?? lessonId,
                Prompt = q.Prompt,
                Options = options,
                Topic = q.Topic,
                Difficulty = q.Difficulty,
                Type = q.Type,
                OrderIndex = q.OrderIndex
            };
        }).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// POST /api/v1/curriculum/lessons/{lessonId}/questions/{questionId}/check
    /// Server-side validation of student's answer.
    /// Returns grading result, correct answer, explanation, and earned score.
    /// </summary>
    [HttpPost("lessons/{lessonId}/questions/{questionId}/check")]
    public async Task<IActionResult> CheckQuestionAnswer(
        string lessonId,
        string questionId,
        [FromBody] CheckAnswerRequestDto req)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.SelectedOption))
        {
            return BadRequest(new { message = "Vui lòng chọn một đáp án." });
        }

        var clientKey = !string.IsNullOrEmpty(CurrentUserId)
            ? $"usr_{CurrentUserId}"
            : $"ip_{HttpContext.Connection.RemoteIpAddress?.ToString() ?? "anon"}";
        var rateLimitKey = $"check_rate_{clientKey}_{questionId}";

        if (_cache.TryGetValue<int>(rateLimitKey, out var failedCount) && failedCount >= 3)
        {
            return StatusCode(429, new
            {
                message = "Bạn đã thử sai quá 3 lần đối với câu hỏi này. Vui lòng ôn lại lý thuyết bài học và thử lại sau 2 phút.",
                retryAfterSeconds = 120
            });
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.LessonId == lessonId && q.Status == "published");

        if (question == null || question.Lesson == null || question.Lesson.Status != "published" ||
            question.Lesson.Chapter == null || !question.Lesson.Chapter.IsActive ||
            question.Lesson.Chapter.Subject == null || !question.Lesson.Chapter.Subject.IsActive)
        {
            return NotFound(new { message = "Câu hỏi hoặc bài học không tồn tại hoặc chưa xuất bản." });
        }

        var selected = req.SelectedOption.Trim();
        var correct = question.CorrectAnswer.Trim();

        bool isCorrect = string.Equals(selected, correct, StringComparison.OrdinalIgnoreCase);

        // Also check if selected is option index/letter (e.g. "A", "B", "C", "D") matching the index
        if (!isCorrect)
        {
            try
            {
                var options = JsonSerializer.Deserialize<List<string>>(question.OptionsJson) ?? new List<string>();
                int correctIdx = options.FindIndex(o => string.Equals(o.Trim(), correct, StringComparison.OrdinalIgnoreCase));
                if (correctIdx >= 0)
                {
                    string correctLetter = ((char)('A' + correctIdx)).ToString();
                    if (string.Equals(selected, correctLetter, StringComparison.OrdinalIgnoreCase))
                    {
                        isCorrect = true;
                    }
                }
            }
            catch
            {
                // ignore
            }
        }

        if (isCorrect)
        {
            _cache.Remove(rateLimitKey);
        }
        else
        {
            _cache.Set(rateLimitKey, failedCount + 1, TimeSpan.FromMinutes(2));
            _logger.LogWarning("Failed question check attempt {Attempts}/3 for question {QuestionId} from {ClientKey}", failedCount + 1, questionId, clientKey);
        }

        int scoreEarned = isCorrect ? (question.Difficulty switch
        {
            "hard" => 10,
            "medium" => 8,
            "easy" => 5,
            _ => 5
        }) : 0;

        try
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = !string.IsNullOrEmpty(CurrentUserId) ? CurrentUserId : $"anon:{clientKey}",
                Action = "question_attempt_checked",
                TargetType = "content_question",
                TargetId = question.Id,
                Payload = JsonSerializer.Serialize(new { lessonId, isCorrect, scoreEarned }),
                CreatedAt = DateTimeOffset.UtcNow
            });
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist audit log for question check.");
        }

        var response = new CheckAnswerResponseDto
        {
            QuestionId = question.Id,
            IsCorrect = isCorrect,
            CorrectAnswer = question.CorrectAnswer,
            Explanation = question.Explanation,
            ScoreEarned = scoreEarned,
            Feedback = isCorrect ? "Chính xác! Làm rất tốt." : "Chưa chính xác. Hãy xem kỹ lời giải chi tiết bên dưới."
        };

        return Ok(response);
    }
}
