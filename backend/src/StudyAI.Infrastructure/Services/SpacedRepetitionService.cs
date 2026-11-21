using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Infrastructure.Services;

public class SpacedRepetitionService : ISpacedRepetitionService
{
    private readonly StudyAIDbContext _context;
    private readonly ILogger<SpacedRepetitionService> _logger;

    public SpacedRepetitionService(
        StudyAIDbContext context,
        ILogger<SpacedRepetitionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public (double newEasinessFactor, int newIntervalDays) CalculateSm2NextInterval(
        int repetitionNumber,
        double currentEasinessFactor,
        int qualityScore)
    {
        // Quality score clamp [0, 5]
        int q = Math.Clamp(qualityScore, 0, 5);
        double ef = currentEasinessFactor > 0 ? currentEasinessFactor : 2.5;

        // Calculate new EF using SuperMemo SM-2 formula:
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        double newEf = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        if (newEf < 1.3)
        {
            newEf = 1.3;
        }

        int newIntervalDays;
        if (q < 3)
        {
            // Failure: reset interval
            newIntervalDays = 1;
        }
        else
        {
            // Success: progression
            if (repetitionNumber <= 0)
            {
                newIntervalDays = 1;
            }
            else if (repetitionNumber == 1)
            {
                newIntervalDays = 6;
            }
            else
            {
                // Recursive interval step
                int baseInterval = repetitionNumber == 2 ? 6 : Math.Max(6, (int)Math.Round(6 * Math.Pow(newEf, repetitionNumber - 2)));
                newIntervalDays = Math.Max(1, (int)Math.Round(baseInterval * newEf));
            }
        }

        return (Math.Round(newEf, 2), newIntervalDays);
    }

    public async Task<SpacedRepetitionQueueDto> GetUserSpacedRepetitionQueueAsync(
        string userId,
        string subjectId,
        CancellationToken cancellationToken = default)
    {
        var masteries = await _context.StudentTopicMasteries.AsNoTracking()
            .Where(m => m.UserId == userId && m.SubjectId == subjectId)
            .ToListAsync(cancellationToken);

        // Fetch recent review events
        var reviewEvents = await _context.LearningEvents.AsNoTracking()
            .Where(e => e.UserId == userId && e.SubjectId == subjectId && e.Type == "spaced_repetition_review")
            .OrderByDescending(e => e.Timestamp)
            .ToListAsync(cancellationToken);

        var latestEventByItem = new Dictionary<string, (int rep, double ef, int interval, DateTimeOffset nextDate, DateTimeOffset lastDate, int q)>();

        foreach (var ev in reviewEvents)
        {
            if (string.IsNullOrWhiteSpace(ev.PayloadJson)) continue;
            try
            {
                using var doc = JsonDocument.Parse(ev.PayloadJson);
                var root = doc.RootElement;
                var itemId = root.GetProperty("itemId").GetString();
                if (!string.IsNullOrEmpty(itemId) && !latestEventByItem.ContainsKey(itemId))
                {
                    int rep = root.TryGetProperty("repetitionNumber", out var repEl) ? repEl.GetInt32() : 1;
                    double ef = root.TryGetProperty("easinessFactor", out var efEl) ? efEl.GetDouble() : 2.5;
                    int interval = root.TryGetProperty("intervalDays", out var intEl) ? intEl.GetInt32() : 1;
                    DateTimeOffset nextDate = root.TryGetProperty("nextReviewDate", out var nDateEl) && nDateEl.TryGetDateTimeOffset(out var nd)
                        ? nd
                        : ev.Timestamp.AddDays(interval);
                    int q = root.TryGetProperty("qualityScore", out var qEl) ? qEl.GetInt32() : 3;

                    latestEventByItem[itemId] = (rep, ef, interval, nextDate, ev.Timestamp, q);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse spaced repetition event {EventId}", ev.Id);
            }
        }

        var now = DateTimeOffset.UtcNow;
        var today = now.Date;

        var dueToday = new List<SpacedRepetitionItemDto>();
        var upcoming = new List<SpacedRepetitionItemDto>();
        var completedToday = new List<SpacedRepetitionItemDto>();
        var needsReinforcement = new List<SpacedRepetitionItemDto>();

        foreach (var m in masteries)
        {
            var itemId = !string.IsNullOrEmpty(m.TopicId) ? m.TopicId : m.TopicName;

            int rep = 0;
            double ef = 2.5;
            int interval = 1;
            DateTimeOffset nextDate;
            DateTimeOffset? lastReviewed = null;
            int lastQuality = 3;

            if (latestEventByItem.TryGetValue(itemId, out var recorded))
            {
                rep = recorded.rep;
                ef = recorded.ef;
                interval = recorded.interval;
                nextDate = recorded.nextDate;
                lastReviewed = recorded.lastDate;
                lastQuality = recorded.q;
            }
            else
            {
                // Initial baseline schedule based on mastery
                var baseDate = m.LastAttemptAt ?? m.UpdatedAt;
                if (m.MasteryScore < 50.0)
                {
                    interval = 1;
                    nextDate = baseDate.AddDays(1);
                }
                else if (m.MasteryScore < 80.0)
                {
                    interval = 2;
                    nextDate = baseDate.AddDays(2);
                }
                else
                {
                    interval = 4;
                    nextDate = baseDate.AddDays(4);
                }
            }

            var item = new SpacedRepetitionItemDto
            {
                ItemId = itemId,
                TopicName = m.TopicName,
                SubjectId = subjectId,
                RepetitionNumber = rep,
                EasinessFactor = ef,
                IntervalDays = interval,
                LastReviewedAt = lastReviewed,
                NextReviewDate = nextDate,
                MasteryScore = m.MasteryScore
            };

            // Bucket item into queue
            if (lastReviewed.HasValue && lastReviewed.Value.Date == today && lastQuality >= 3)
            {
                item.QueueStatus = "completed";
                completedToday.Add(item);
            }
            else if (lastQuality < 3 || m.MasteryScore < 45.0)
            {
                item.QueueStatus = "needs_reinforcement";
                needsReinforcement.Add(item);
            }
            else if (nextDate.Date <= today)
            {
                item.QueueStatus = "due_today";
                dueToday.Add(item);
            }
            else if (nextDate.Date <= today.AddDays(7))
            {
                item.QueueStatus = "upcoming";
                upcoming.Add(item);
            }
            else
            {
                item.QueueStatus = "upcoming";
                upcoming.Add(item);
            }
        }

        int total = dueToday.Count + upcoming.Count + completedToday.Count + needsReinforcement.Count;
        double retention = total > 0
            ? Math.Round(((double)(completedToday.Count + upcoming.Count) / total) * 100.0, 1)
            : 100.0;

        return new SpacedRepetitionQueueDto
        {
            SubjectId = subjectId,
            DueToday = dueToday.OrderBy(i => i.NextReviewDate).ToList(),
            Upcoming = upcoming.OrderBy(i => i.NextReviewDate).ToList(),
            CompletedToday = completedToday,
            NeedsReinforcement = needsReinforcement.OrderBy(i => i.MasteryScore).ToList(),
            TotalItems = total,
            RetentionRateEstimatePercent = retention
        };
    }

    public async Task<SpacedRepetitionReviewResultDto> RecordReviewOutcomeAsync(
        string userId,
        SpacedRepetitionReviewRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ItemId))
        {
            throw new ArgumentException("ItemId không được để trống.", nameof(request));
        }

        // Idempotency check: prevent rapid duplicate submission within 30 seconds
        var recentDuplicate = await _context.LearningEvents.AsNoTracking()
            .Where(e => e.UserId == userId && e.SubjectId == request.SubjectId && e.Type == "spaced_repetition_review" &&
                        e.Timestamp > DateTimeOffset.UtcNow.AddSeconds(-30))
            .OrderByDescending(e => e.Timestamp)
            .FirstOrDefaultAsync(cancellationToken);

        if (recentDuplicate != null && !string.IsNullOrWhiteSpace(recentDuplicate.PayloadJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(recentDuplicate.PayloadJson);
                if (doc.RootElement.TryGetProperty("itemId", out var itm) && itm.GetString() == request.ItemId)
                {
                    return new SpacedRepetitionReviewResultDto
                    {
                        ItemId = request.ItemId,
                        NewEasinessFactor = doc.RootElement.GetProperty("easinessFactor").GetDouble(),
                        NewIntervalDays = doc.RootElement.GetProperty("intervalDays").GetInt32(),
                        NextReviewDate = doc.RootElement.GetProperty("nextReviewDate").GetDateTimeOffset(),
                        Message = "Ghi nhận thành thạo (Kết quả ôn tập đã được lưu trữ an toàn)."
                    };
                }
            }
            catch { }
        }

        var queue = await GetUserSpacedRepetitionQueueAsync(userId, request.SubjectId, cancellationToken);
        var existingItem = queue.DueToday.Concat(queue.Upcoming).Concat(queue.NeedsReinforcement).Concat(queue.CompletedToday)
            .FirstOrDefault(i => i.ItemId == request.ItemId || i.TopicName == request.TopicName);

        int currentRep = existingItem?.RepetitionNumber ?? 0;
        double currentEf = existingItem?.EasinessFactor ?? 2.5;

        var (newEf, newInterval) = CalculateSm2NextInterval(currentRep, currentEf, request.QualityScore);
        int nextRep = request.QualityScore >= 3 ? currentRep + 1 : 0;
        var nextDate = DateTimeOffset.UtcNow.AddDays(newInterval);

        var payload = new
        {
            itemId = request.ItemId,
            topicName = request.TopicName,
            subjectId = request.SubjectId,
            qualityScore = request.QualityScore,
            repetitionNumber = nextRep,
            easinessFactor = newEf,
            intervalDays = newInterval,
            nextReviewDate = nextDate.ToString("o")
        };

        var reviewEvent = new LearningEvent
        {
            Id = $"sr_rev_{Guid.NewGuid():N}",
            UserId = userId,
            SubjectId = request.SubjectId,
            LessonId = string.Empty,
            Timestamp = DateTimeOffset.UtcNow,
            Type = "spaced_repetition_review",
            PayloadJson = JsonSerializer.Serialize(payload),
            SchemaVersion = 1
        };

        _context.LearningEvents.Add(reviewEvent);

        // Also update topic mastery if present
        var mastery = await _context.StudentTopicMasteries
            .FirstOrDefaultAsync(m => m.UserId == userId && m.SubjectId == request.SubjectId &&
                (m.TopicId == request.ItemId || m.TopicName == request.TopicName), cancellationToken);

        if (mastery != null)
        {
            mastery.LastAttemptAt = DateTimeOffset.UtcNow;
            mastery.UpdatedAt = DateTimeOffset.UtcNow;
            if (request.QualityScore >= 4 && mastery.MasteryScore < 95.0)
            {
                mastery.MasteryScore = Math.Min(100.0, mastery.MasteryScore + 5.0);
            }
            else if (request.QualityScore < 3 && mastery.MasteryScore > 20.0)
            {
                mastery.MasteryScore = Math.Max(0.0, mastery.MasteryScore - 5.0);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        string feedback = request.QualityScore switch
        {
            >= 4 => $"Ghi nhận thành thạo! Ôn tập tiếp theo sau {newInterval} ngày.",
            3 => $"Đạt yêu cầu. Chu kỳ ôn tập tiếp theo: {newInterval} ngày.",
            _ => $"Cần củng cố thêm. Đã lên lịch ôn lại vào ngày mai ({newInterval} ngày)."
        };

        return new SpacedRepetitionReviewResultDto
        {
            ItemId = request.ItemId,
            NewEasinessFactor = newEf,
            NewIntervalDays = newInterval,
            NextReviewDate = nextDate,
            Message = feedback
        };
    }
}

