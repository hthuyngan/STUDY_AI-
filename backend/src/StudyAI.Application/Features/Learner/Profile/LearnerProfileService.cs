using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Learner.Profile;

public class LearnerProfileService : ILearnerProfileService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;

    public LearnerProfileService(IApplicationDbContext db, IClock clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<BootstrapSyncResponseDto> BootstrapSyncAsync(
        string userId,
        BootstrapSyncRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        int progressCount = 0;
        int attemptsCount = 0;
        int eventsCount = 0;
        var now = _clock.UtcNow;

        // 1. Sync Progress
        if (dto.LessonProgress != null)
        {
            foreach (var (lessonId, prog) in dto.LessonProgress)
            {
                var existing = await _db.LessonProgresses
                    .FirstOrDefaultAsync(p => p.UserId == userId && p.LessonId == lessonId, cancellationToken);

                if (existing == null)
                {
                    _db.LessonProgresses.Add(new LessonProgress
                    {
                        UserId = userId,
                        LessonId = lessonId,
                        SubjectId = prog.SubjectId,
                        ContentProgress = prog.ContentProgress,
                        OverallProgress = prog.OverallProgress,
                        AssessmentStatus = prog.AssessmentStatus,
                        AssessmentAttemptId = prog.AssessmentAttemptId,
                        AssessmentScore = prog.AssessmentScore,
                        CompletedSectionIdsJson = JsonSerializer.Serialize(prog.CompletedSectionIds ?? new List<string>()),
                        UpdatedAt = now
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
                    existing.UpdatedAt = now;
                }
                progressCount++;
            }
        }

        // 2. Sync Attempts
        if (dto.AssessmentAttempts != null)
        {
            foreach (var att in dto.AssessmentAttempts)
            {
                var id = string.IsNullOrEmpty(att.Id) ? $"att_{Guid.NewGuid():N}" : att.Id;
                var existing = await _db.AssessmentAttempts
                    .Include(a => a.Responses)
                    .FirstOrDefaultAsync(a => a.UserId == userId && a.Id == id, cancellationToken);

                if (existing == null)
                {
                    existing = new AssessmentAttempt
                    {
                        Id = id,
                        UserId = userId,
                        AssessmentId = att.AssessmentId,
                        LessonId = att.LessonId,
                        SubjectId = att.SubjectId,
                        AttemptNumber = att.AttemptNumber,
                        StartedAt = att.StartedAt == default ? now : att.StartedAt,
                        LastActivityAt = att.LastActivityAt == default ? now : att.LastActivityAt,
                        CompletedAt = att.CompletedAt,
                        CompletionStatus = att.CompletionStatus ?? "incomplete",
                        SuccessStatus = att.SuccessStatus ?? "unknown",
                        ProgressMeasure = att.ProgressMeasure,
                        ScoreRaw = att.ScoreRaw,
                        ScoreMin = att.ScoreMin,
                        ScoreMax = att.ScoreMax,
                        ScoreScaled = att.ScoreScaled,
                        SessionTimeMs = att.SessionTimeMs,
                        CurrentQuestionId = att.CurrentQuestionId,
                        ExitReason = att.ExitReason,
                        SuspendDataJson = att.SuspendData?.ToJsonString(),
                        SchemaVersion = att.SchemaVersion
                    };
                    _db.AssessmentAttempts.Add(existing);
                }
                else
                {
                    if (existing.CompletionStatus != "completed")
                    {
                        existing.LastActivityAt = att.LastActivityAt == default ? now : att.LastActivityAt;
                        existing.CompletedAt = att.CompletedAt ?? existing.CompletedAt;
                        existing.CompletionStatus = att.CompletionStatus ?? existing.CompletionStatus;
                        existing.SuccessStatus = att.SuccessStatus ?? existing.SuccessStatus;
                        existing.ProgressMeasure = att.ProgressMeasure;
                        existing.ScoreRaw = att.ScoreRaw ?? existing.ScoreRaw;
                        existing.ScoreScaled = att.ScoreScaled ?? existing.ScoreScaled;
                        existing.SessionTimeMs = att.SessionTimeMs;
                        existing.CurrentQuestionId = att.CurrentQuestionId ?? existing.CurrentQuestionId;
                        existing.ExitReason = att.ExitReason ?? existing.ExitReason;
                        existing.SuspendDataJson = att.SuspendData?.ToJsonString() ?? existing.SuspendDataJson;
                    }
                }

                if (att.Responses != null)
                {
                    foreach (var (qId, rDto) in att.Responses)
                    {
                        var resp = existing.Responses.FirstOrDefault(r => r.QuestionId == qId);
                        if (resp == null)
                        {
                            resp = new AssessmentResponse
                            {
                                AttemptId = existing.Id,
                                QuestionId = qId,
                                SelectedOptionIdsJson = JsonSerializer.Serialize(rDto.SelectedOptionIds ?? new List<string>()),
                                FirstAnsweredAt = rDto.FirstAnsweredAt,
                                LastAnsweredAt = rDto.LastAnsweredAt,
                                ChangeCount = rDto.ChangeCount,
                                TimeSpentMs = rDto.TimeSpentMs,
                                IsCorrect = rDto.IsCorrect
                            };
                            existing.Responses.Add(resp);
                        }
                    }
                }
                attemptsCount++;
            }
        }

        // 3. Sync Events
        if (dto.LearningEvents != null)
        {
            foreach (var ev in dto.LearningEvents)
            {
                var id = string.IsNullOrEmpty(ev.Id) ? $"evt_{Guid.NewGuid():N}" : ev.Id;
                if (!await _db.LearningEvents.AnyAsync(e => e.Id == id, cancellationToken))
                {
                    _db.LearningEvents.Add(new LearningEvent
                    {
                        Id = id,
                        UserId = userId,
                        AttemptId = ev.AttemptId,
                        LessonId = ev.LessonId,
                        SubjectId = ev.SubjectId,
                        Timestamp = ev.Timestamp == default ? now : ev.Timestamp,
                        Type = ev.Type,
                        PayloadJson = ev.Payload?.ToJsonString(),
                        SchemaVersion = ev.SchemaVersion
                    });
                    eventsCount++;
                }
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new BootstrapSyncResponseDto
        {
            Status = "ok",
            ProgressSynced = progressCount,
            AttemptsSynced = attemptsCount,
            EventsSynced = eventsCount
        };
    }

    public async Task<List<LearnerBookmarkDto>> GetBookmarksAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var bookmarks = await _db.LearningEvents.AsNoTracking()
            .Where(e => e.UserId == userId && e.Type == "library_bookmark")
            .OrderByDescending(e => e.Timestamp)
            .Select(e => new LearnerBookmarkDto
            {
                Id = e.Id,
                ItemId = e.LessonId,
                SubjectId = e.SubjectId,
                CreatedAt = e.Timestamp,
                Payload = e.PayloadJson
            })
            .ToListAsync(cancellationToken);

        return bookmarks;
    }

    public async Task<bool> AddBookmarkAsync(string userId, CreateBookmarkRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        if (string.IsNullOrWhiteSpace(request.ItemId))
        {
            throw new ValidationException("ItemId không được để trống.");
        }

        var existing = await _db.LearningEvents
            .FirstOrDefaultAsync(e => e.UserId == userId && e.Type == "library_bookmark" && e.LessonId == request.ItemId, cancellationToken);

        if (existing != null)
        {
            return true;
        }

        var bookmarkEvent = new LearningEvent
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = userId,
            Type = "library_bookmark",
            LessonId = request.ItemId,
            SubjectId = request.SubjectId ?? string.Empty,
            Timestamp = _clock.UtcNow,
            PayloadJson = JsonSerializer.Serialize(new { title = request.Title ?? string.Empty }),
            SchemaVersion = 1
        };

        _db.LearningEvents.Add(bookmarkEvent);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RemoveBookmarkAsync(string userId, string itemId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        if (string.IsNullOrWhiteSpace(itemId))
        {
            throw new ValidationException("ItemId không được để trống.");
        }

        var existing = await _db.LearningEvents
            .Where(e => e.UserId == userId && e.Type == "library_bookmark" && e.LessonId == itemId)
            .ToListAsync(cancellationToken);

        if (existing.Count > 0)
        {
            _db.LearningEvents.RemoveRange(existing);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}
