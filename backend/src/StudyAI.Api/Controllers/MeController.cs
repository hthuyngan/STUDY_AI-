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

[Authorize]
[ApiController]
[Route("api/v1/me")]
public class MeController : ControllerBase
{
    private readonly StudyAIDbContext _db;

    public MeController(StudyAIDbContext db)
    {
        _db = db;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    // ── Lesson Progress ──────────────────────────────────────────────────────────

    [HttpGet("lesson-progress")]
    public async Task<IActionResult> GetMyLessonProgressList()
    {
        var items = await _db.LessonProgresses
            .Where(p => p.UserId == CurrentUserId)
            .OrderByDescending(p => p.UpdatedAt)
            .ToListAsync();

        var dtos = items.Select(FormatLessonProgress).ToList();
        return Ok(dtos);
    }

    [HttpGet("lesson-progress/{lessonId}")]
    public async Task<IActionResult> GetMySingleLessonProgress(string lessonId)
    {
        var progress = await _db.LessonProgresses
            .FirstOrDefaultAsync(p => p.UserId == CurrentUserId && p.LessonId == lessonId);

        if (progress == null)
        {
            return NotFound(new { detail = $"Lesson progress for '{lessonId}' not found" });
        }

        return Ok(FormatLessonProgress(progress));
    }

    [HttpPut("lesson-progress/{lessonId}")]
    public async Task<IActionResult> PutMyLessonProgress(string lessonId, [FromBody] LessonProgressCreateOrUpdateDto dto)
    {
        var progress = await _db.LessonProgresses
            .FirstOrDefaultAsync(p => p.UserId == CurrentUserId && p.LessonId == lessonId);

        if (progress == null)
        {
            progress = new LessonProgress
            {
                UserId = CurrentUserId,
                LessonId = lessonId,
                SubjectId = dto.SubjectId,
                ContentProgress = dto.ContentProgress,
                OverallProgress = dto.OverallProgress,
                AssessmentStatus = dto.AssessmentStatus,
                AssessmentAttemptId = dto.AssessmentAttemptId,
                AssessmentScore = dto.AssessmentScore,
                CompletedSectionIdsJson = JsonSerializer.Serialize(dto.CompletedSectionIds ?? new List<string>()),
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.LessonProgresses.Add(progress);
        }
        else
        {
            progress.SubjectId = string.IsNullOrEmpty(dto.SubjectId) ? progress.SubjectId : dto.SubjectId;
            progress.ContentProgress = dto.ContentProgress;
            progress.OverallProgress = dto.OverallProgress;
            progress.AssessmentStatus = dto.AssessmentStatus;
            progress.AssessmentAttemptId = dto.AssessmentAttemptId;
            progress.AssessmentScore = dto.AssessmentScore;
            progress.CompletedSectionIdsJson = JsonSerializer.Serialize(dto.CompletedSectionIds ?? new List<string>());
            progress.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(FormatLessonProgress(progress));
    }

    // ── Assessment Attempts ──────────────────────────────────────────────────────

    [HttpGet("assessment-attempts")]
    public async Task<IActionResult> ListMyAssessmentAttempts([FromQuery] string? lessonId = null)
    {
        var query = _db.AssessmentAttempts
            .Include(a => a.Responses)
            .Where(a => a.UserId == CurrentUserId);

        if (!string.IsNullOrEmpty(lessonId))
        {
            query = query.Where(a => a.LessonId == lessonId);
        }

        var list = await query.OrderByDescending(a => a.StartedAt).ToListAsync();
        return Ok(list.Select(FormatAttempt).ToList());
    }

    [HttpGet("assessment-attempts/{attemptId}")]
    public async Task<IActionResult> GetMySingleAssessmentAttempt(string attemptId)
    {
        var attempt = await _db.AssessmentAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.UserId == CurrentUserId && a.Id == attemptId);

        if (attempt == null)
        {
            return NotFound(new { detail = $"Assessment attempt '{attemptId}' not found" });
        }

        return Ok(FormatAttempt(attempt));
    }

    [HttpPost("assessment-attempts")]
    public async Task<IActionResult> CreateMyAssessmentAttempt([FromBody] AssessmentAttemptCreateDto dto)
    {
        var attempt = await SaveAttemptInternal(dto);
        return StatusCode(201, FormatAttempt(attempt));
    }

    [HttpPut("assessment-attempts/{attemptId}")]
    [HttpPatch("assessment-attempts/{attemptId}")]
    public async Task<IActionResult> UpdateMyAssessmentAttempt(string attemptId, [FromBody] AssessmentAttemptCreateDto dto)
    {
        dto.Id = attemptId;
        var attempt = await SaveAttemptInternal(dto);
        return Ok(FormatAttempt(attempt));
    }

    // ── Learning Events ──────────────────────────────────────────────────────────

    [HttpPost("learning-events/batch")]
    public async Task<IActionResult> PostMyEventsBatch([FromBody] LearningEventBatchRequestDto dto)
    {
        int inserted = 0;
        int duplicates = 0;

        foreach (var ev in dto.Events ?? new List<LearningEventItemDto>())
        {
            var id = string.IsNullOrEmpty(ev.Id) ? $"evt_{Guid.NewGuid():N}" : ev.Id;
            var exists = await _db.LearningEvents.AnyAsync(e => e.Id == id);
            if (exists)
            {
                duplicates++;
                continue;
            }

            var model = new LearningEvent
            {
                Id = id,
                UserId = CurrentUserId,
                AttemptId = ev.AttemptId,
                LessonId = ev.LessonId,
                SubjectId = ev.SubjectId,
                Timestamp = ev.Timestamp == default ? DateTimeOffset.UtcNow : ev.Timestamp,
                Type = ev.Type,
                PayloadJson = ev.Payload?.ToJsonString(),
                SchemaVersion = ev.SchemaVersion
            };
            _db.LearningEvents.Add(model);
            inserted++;
        }

        await _db.SaveChangesAsync();

        return StatusCode(201, new LearningEventBatchResponseDto
        {
            Inserted = inserted,
            Duplicates = duplicates,
            Failed = 0
        });
    }

    [HttpGet("learning-events")]
    public async Task<IActionResult> GetMyLearningEvents(
        [FromQuery] int limit = 100,
        [FromQuery] DateTimeOffset? before = null,
        [FromQuery] string? lessonId = null,
        [FromQuery] string? subjectId = null)
    {
        var query = _db.LearningEvents.Where(e => e.UserId == CurrentUserId);

        if (before.HasValue)
        {
            query = query.Where(e => e.Timestamp < before.Value);
        }
        if (!string.IsNullOrEmpty(lessonId))
        {
            query = query.Where(e => e.LessonId == lessonId);
        }
        if (!string.IsNullOrEmpty(subjectId))
        {
            query = query.Where(e => e.SubjectId == subjectId);
        }

        var items = await query.OrderByDescending(e => e.Timestamp).Take(limit).ToListAsync();

        var dtos = items.Select(e => new LearningEventItemDto
        {
            Id = e.Id,
            AttemptId = e.AttemptId,
            LessonId = e.LessonId,
            SubjectId = e.SubjectId,
            Timestamp = e.Timestamp,
            Type = e.Type,
            Payload = string.IsNullOrEmpty(e.PayloadJson) ? null : JsonNode.Parse(e.PayloadJson),
            SchemaVersion = e.SchemaVersion
        }).ToList();

        return Ok(dtos);
    }

    // ── Sync Bootstrap ───────────────────────────────────────────────────────────

    [HttpPost("sync/bootstrap")]
    public async Task<IActionResult> BootstrapSync([FromBody] BootstrapSyncRequestDto dto)
    {
        int progressCount = 0;
        int attemptsCount = 0;
        int eventsCount = 0;

        // 1. Sync Progress
        if (dto.LessonProgress != null)
        {
            foreach (var (lessonId, prog) in dto.LessonProgress)
            {
                var existing = await _db.LessonProgresses
                    .FirstOrDefaultAsync(p => p.UserId == CurrentUserId && p.LessonId == lessonId);

                if (existing == null)
                {
                    _db.LessonProgresses.Add(new LessonProgress
                    {
                        UserId = CurrentUserId,
                        LessonId = lessonId,
                        SubjectId = prog.SubjectId,
                        ContentProgress = prog.ContentProgress,
                        OverallProgress = prog.OverallProgress,
                        AssessmentStatus = prog.AssessmentStatus,
                        AssessmentAttemptId = prog.AssessmentAttemptId,
                        AssessmentScore = prog.AssessmentScore,
                        CompletedSectionIdsJson = JsonSerializer.Serialize(prog.CompletedSectionIds ?? new List<string>()),
                        UpdatedAt = DateTimeOffset.UtcNow
                    });
                }
                else
                {
                    existing.ContentProgress = Math.Max(existing.ContentProgress, prog.ContentProgress);
                    existing.OverallProgress = Math.Max(existing.OverallProgress, prog.OverallProgress);
                    if (prog.AssessmentScore.HasValue)
                    {
                        existing.AssessmentScore = Math.Max(existing.AssessmentScore ?? 0, prog.AssessmentScore.Value);
                    }
                    existing.UpdatedAt = DateTimeOffset.UtcNow;
                }
                progressCount++;
            }
        }

        // 2. Sync Attempts
        if (dto.AssessmentAttempts != null)
        {
            foreach (var att in dto.AssessmentAttempts)
            {
                await SaveAttemptInternal(att);
                attemptsCount++;
            }
        }

        // 3. Sync Events
        if (dto.LearningEvents != null)
        {
            foreach (var ev in dto.LearningEvents)
            {
                var id = string.IsNullOrEmpty(ev.Id) ? $"evt_{Guid.NewGuid():N}" : ev.Id;
                if (!await _db.LearningEvents.AnyAsync(e => e.Id == id))
                {
                    _db.LearningEvents.Add(new LearningEvent
                    {
                        Id = id,
                        UserId = CurrentUserId,
                        AttemptId = ev.AttemptId,
                        LessonId = ev.LessonId,
                        SubjectId = ev.SubjectId,
                        Timestamp = ev.Timestamp == default ? DateTimeOffset.UtcNow : ev.Timestamp,
                        Type = ev.Type,
                        PayloadJson = ev.Payload?.ToJsonString(),
                        SchemaVersion = ev.SchemaVersion
                    });
                    eventsCount++;
                }
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new BootstrapSyncResponseDto
        {
            Status = "ok",
            ProgressSynced = progressCount,
            AttemptsSynced = attemptsCount,
            EventsSynced = eventsCount
        });
    }

    // ── Helper Formats ───────────────────────────────────────────────────────────

    private async Task<AssessmentAttempt> SaveAttemptInternal(AssessmentAttemptCreateDto dto)
    {
        var id = string.IsNullOrEmpty(dto.Id) ? $"att_{Guid.NewGuid():N}" : dto.Id;
        var attempt = await _db.AssessmentAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.UserId == CurrentUserId && a.Id == id);

        if (attempt == null)
        {
            attempt = new AssessmentAttempt
            {
                Id = id,
                UserId = CurrentUserId,
                AssessmentId = dto.AssessmentId,
                LessonId = dto.LessonId,
                SubjectId = dto.SubjectId,
                AttemptNumber = dto.AttemptNumber,
                StartedAt = dto.StartedAt == default ? DateTimeOffset.UtcNow : dto.StartedAt,
                LastActivityAt = dto.LastActivityAt == default ? DateTimeOffset.UtcNow : dto.LastActivityAt,
                CompletedAt = dto.CompletedAt,
                CompletionStatus = dto.CompletionStatus ?? "incomplete",
                SuccessStatus = dto.SuccessStatus ?? "unknown",
                ProgressMeasure = dto.ProgressMeasure,
                ScoreRaw = dto.ScoreRaw,
                ScoreMin = dto.ScoreMin,
                ScoreMax = dto.ScoreMax,
                ScoreScaled = dto.ScoreScaled,
                SessionTimeMs = dto.SessionTimeMs,
                CurrentQuestionId = dto.CurrentQuestionId,
                ExitReason = dto.ExitReason,
                SuspendDataJson = dto.SuspendData?.ToJsonString(),
                SchemaVersion = dto.SchemaVersion
            };
            _db.AssessmentAttempts.Add(attempt);
        }
        else
        {
            attempt.LastActivityAt = dto.LastActivityAt == default ? DateTimeOffset.UtcNow : dto.LastActivityAt;
            attempt.CompletedAt = dto.CompletedAt ?? attempt.CompletedAt;
            attempt.CompletionStatus = dto.CompletionStatus ?? attempt.CompletionStatus;
            attempt.SuccessStatus = dto.SuccessStatus ?? attempt.SuccessStatus;
            attempt.ProgressMeasure = dto.ProgressMeasure;
            attempt.ScoreRaw = dto.ScoreRaw ?? attempt.ScoreRaw;
            attempt.ScoreMin = dto.ScoreMin;
            attempt.ScoreMax = dto.ScoreMax;
            attempt.ScoreScaled = dto.ScoreScaled ?? attempt.ScoreScaled;
            attempt.SessionTimeMs = dto.SessionTimeMs;
            attempt.CurrentQuestionId = dto.CurrentQuestionId ?? attempt.CurrentQuestionId;
            attempt.ExitReason = dto.ExitReason ?? attempt.ExitReason;
            attempt.SuspendDataJson = dto.SuspendData?.ToJsonString() ?? attempt.SuspendDataJson;
        }

        if (dto.Responses != null)
        {
            foreach (var (qId, rDto) in dto.Responses)
            {
                var resp = attempt.Responses.FirstOrDefault(r => r.QuestionId == qId);
                if (resp == null)
                {
                    resp = new AssessmentResponse
                    {
                        AttemptId = attempt.Id,
                        QuestionId = qId,
                        SelectedOptionIdsJson = JsonSerializer.Serialize(rDto.SelectedOptionIds ?? new List<string>()),
                        FirstAnsweredAt = rDto.FirstAnsweredAt,
                        LastAnsweredAt = rDto.LastAnsweredAt,
                        ChangeCount = rDto.ChangeCount,
                        TimeSpentMs = rDto.TimeSpentMs,
                        IsCorrect = rDto.IsCorrect
                    };
                    attempt.Responses.Add(resp);
                }
                else
                {
                    resp.SelectedOptionIdsJson = JsonSerializer.Serialize(rDto.SelectedOptionIds ?? new List<string>());
                    resp.FirstAnsweredAt = rDto.FirstAnsweredAt ?? resp.FirstAnsweredAt;
                    resp.LastAnsweredAt = rDto.LastAnsweredAt ?? resp.LastAnsweredAt;
                    resp.ChangeCount = rDto.ChangeCount;
                    resp.TimeSpentMs = rDto.TimeSpentMs;
                    resp.IsCorrect = rDto.IsCorrect ?? resp.IsCorrect;
                }
            }
        }

        await _db.SaveChangesAsync();
        return attempt;
    }

    private static LessonProgressResponseDto FormatLessonProgress(LessonProgress p)
    {
        List<string> completedSectionIds;
        try
        {
            completedSectionIds = JsonSerializer.Deserialize<List<string>>(p.CompletedSectionIdsJson) ?? new List<string>();
        }
        catch
        {
            completedSectionIds = new List<string>();
        }

        return new LessonProgressResponseDto
        {
            UserId = p.UserId,
            LessonId = p.LessonId,
            SubjectId = p.SubjectId,
            ContentProgress = p.ContentProgress,
            OverallProgress = p.OverallProgress,
            AssessmentStatus = p.AssessmentStatus,
            AssessmentAttemptId = p.AssessmentAttemptId,
            AssessmentScore = p.AssessmentScore,
            CompletedSectionIds = completedSectionIds,
            UpdatedAt = p.UpdatedAt
        };
    }

    private static AssessmentAttemptResponseDto FormatAttempt(AssessmentAttempt a)
    {
        var respDict = new Dictionary<string, AssessmentResponseItemDto>();
        foreach (var r in a.Responses ?? new List<AssessmentResponse>())
        {
            List<string> options;
            try
            {
                options = JsonSerializer.Deserialize<List<string>>(r.SelectedOptionIdsJson) ?? new List<string>();
            }
            catch
            {
                options = new List<string>();
            }

            respDict[r.QuestionId] = new AssessmentResponseItemDto
            {
                QuestionId = r.QuestionId,
                SelectedOptionIds = options,
                FirstAnsweredAt = r.FirstAnsweredAt,
                LastAnsweredAt = r.LastAnsweredAt,
                ChangeCount = r.ChangeCount,
                TimeSpentMs = r.TimeSpentMs,
                IsCorrect = r.IsCorrect
            };
        }

        JsonNode? suspendNode = null;
        if (!string.IsNullOrEmpty(a.SuspendDataJson))
        {
            try { suspendNode = JsonNode.Parse(a.SuspendDataJson); } catch { }
        }

        return new AssessmentAttemptResponseDto
        {
            Id = a.Id,
            UserId = a.UserId,
            AssessmentId = a.AssessmentId,
            LessonId = a.LessonId,
            SubjectId = a.SubjectId,
            AttemptNumber = a.AttemptNumber,
            StartedAt = a.StartedAt,
            LastActivityAt = a.LastActivityAt,
            CompletedAt = a.CompletedAt,
            CompletionStatus = a.CompletionStatus,
            SuccessStatus = a.SuccessStatus,
            ProgressMeasure = a.ProgressMeasure,
            ScoreRaw = a.ScoreRaw,
            ScoreMin = a.ScoreMin,
            ScoreMax = a.ScoreMax,
            ScoreScaled = a.ScoreScaled,
            SessionTimeMs = a.SessionTimeMs,
            CurrentQuestionId = a.CurrentQuestionId,
            ExitReason = a.ExitReason,
            SuspendData = suspendNode,
            SchemaVersion = a.SchemaVersion,
            Responses = respDict
        };
    }
}
