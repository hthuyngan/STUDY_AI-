using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Infrastructure.Services;

public class RevisionPlannerService : IRevisionPlannerService
{
    private readonly StudyAIDbContext _context;
    private readonly ILogger<RevisionPlannerService> _logger;

    public RevisionPlannerService(
        StudyAIDbContext context,
        ILogger<RevisionPlannerService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<RevisionPlanDto> GetRevisionPlanAsync(
        string userId,
        string subjectId,
        CancellationToken cancellationToken = default)
    {
        var latestPlanEvent = await _context.LearningEvents.AsNoTracking()
            .Where(e => e.UserId == userId && e.SubjectId == subjectId && e.Type == "revision_plan")
            .OrderByDescending(e => e.Timestamp)
            .FirstOrDefaultAsync(cancellationToken);

        if (latestPlanEvent != null && !string.IsNullOrWhiteSpace(latestPlanEvent.PayloadJson))
        {
            try
            {
                var plan = JsonSerializer.Deserialize<RevisionPlanDto>(latestPlanEvent.PayloadJson);
                if (plan != null)
                {
                    plan.DaysRemaining = Math.Max(0, (int)(plan.ExamDate.Date - DateTimeOffset.UtcNow.Date).TotalDays);
                    return plan;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize revision plan for user {UserId}", userId);
            }
        }

        // Generate baseline plan if no prior plan exists
        var defaultExamDate = DateTimeOffset.UtcNow.AddDays(60);
        return await CreateOrUpdateRevisionPlanAsync(userId, new CreateRevisionPlanRequestDto
        {
            SubjectId = subjectId,
            TargetScore = 8.0,
            DailyStudyMinutes = 45,
            ExamDate = defaultExamDate
        }, cancellationToken);
    }

    public async Task<RevisionPlanDto> CreateOrUpdateRevisionPlanAsync(
        string userId,
        CreateRevisionPlanRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var daysRemaining = Math.Max(1, (int)(request.ExamDate.Date - now.Date).TotalDays);

        // Fetch user's current topic mastery to prioritize weak topics
        var masteries = await _context.StudentTopicMasteries.AsNoTracking()
            .Where(m => m.UserId == userId && m.SubjectId == request.SubjectId)
            .OrderBy(m => m.MasteryScore)
            .ToListAsync(cancellationToken);

        // Fetch curriculum topics if masteries are scarce
        var weakTopics = masteries.Where(m => m.MasteryScore < 65.0).Select(m => m.TopicName).ToList();
        if (weakTopics.Count == 0)
        {
            weakTopics = masteries.Select(m => m.TopicName).Take(5).ToList();
        }

        if (weakTopics.Count == 0)
        {
            weakTopics = new List<string>
            {
                "Tính đơn điệu của hàm số",
                "Cực trị của hàm số",
                "Giá trị lớn nhất và nhỏ nhất của hàm số",
                "Toạ độ của vectơ trong không gian",
                "Biểu thức toạ độ của các phép toán vectơ"
            };
        }

        // Build milestones (schedule out up to 14 active days or days remaining)
        int milestoneDays = Math.Min(daysRemaining, 14);
        var milestones = new List<RevisionPlanMilestoneDto>();

        for (int i = 1; i <= milestoneDays; i++)
        {
            var date = now.AddDays(i);
            var topic = weakTopics[(i - 1) % weakTopics.Count];

            string objective;
            if (i % 7 == 0)
            {
                objective = "Thi thử kiểm tra tiến độ theo cấu trúc đề thi chính thức Bộ GD&ĐT.";
            }
            else if (i % 3 == 0)
            {
                objective = $"Luyện tập nâng cao và giải bài toán vận dụng chuyên đề '{topic}'.";
            }
            else
            {
                objective = $"Ôn tập lý thuyết, phương pháp giải và hoàn thành 15 bài tập dạng trọng tâm '{topic}'.";
            }

            milestones.Add(new RevisionPlanMilestoneDto
            {
                DayIndex = i,
                Date = date,
                Title = i % 7 == 0 ? $"Ngày {i}: Thi thử khảo sát năng lực tuần" : $"Ngày {i}: Ôn luyện {topic}",
                AllocatedMinutes = request.DailyStudyMinutes,
                FocusTopic = topic,
                Objective = objective,
                IsCompleted = false
            });
        }

        // Retrieve existing history if any
        var existingHistory = new List<RevisionPlanAdjustmentLogDto>();
        var latestPlanEvent = await _context.LearningEvents.AsNoTracking()
            .Where(e => e.UserId == userId && e.SubjectId == request.SubjectId && e.Type == "revision_plan")
            .OrderByDescending(e => e.Timestamp)
            .FirstOrDefaultAsync(cancellationToken);

        double prevTarget = 8.0;
        if (latestPlanEvent != null && !string.IsNullOrWhiteSpace(latestPlanEvent.PayloadJson))
        {
            try
            {
                var prevPlan = JsonSerializer.Deserialize<RevisionPlanDto>(latestPlanEvent.PayloadJson);
                if (prevPlan != null)
                {
                    prevTarget = prevPlan.TargetScore;
                    existingHistory = prevPlan.AdjustmentHistory ?? new();
                }
            }
            catch { }
        }

        existingHistory.Add(new RevisionPlanAdjustmentLogDto
        {
            AdjustedAt = now,
            Reason = "Thiết lập kế hoạch ôn thi cá nhân hóa dựa trên năng lực hiện tại",
            PreviousTargetScore = prevTarget,
            NewTargetScore = request.TargetScore
        });

        var plan = new RevisionPlanDto
        {
            PlanId = $"plan_{Guid.NewGuid():N}",
            UserId = userId,
            SubjectId = request.SubjectId,
            TargetScore = request.TargetScore,
            DailyStudyMinutes = request.DailyStudyMinutes,
            ExamDate = request.ExamDate,
            DaysRemaining = daysRemaining,
            Status = "active",
            CreatedAt = now,
            LastUpdatedAt = now,
            Milestones = milestones,
            AdjustmentHistory = existingHistory
        };

        var planEvent = new LearningEvent
        {
            Id = $"ev_plan_{Guid.NewGuid():N}",
            UserId = userId,
            SubjectId = request.SubjectId,
            LessonId = string.Empty,
            Timestamp = now,
            Type = "revision_plan",
            PayloadJson = JsonSerializer.Serialize(plan),
            SchemaVersion = 1
        };

        _context.LearningEvents.Add(planEvent);
        await _context.SaveChangesAsync(cancellationToken);

        return plan;
    }

    public async Task<RevisionPlanDto> AutoAdjustPlanAfterExamAsync(
        string userId,
        string subjectId,
        string examSessionId,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _context.AssessmentAttempts.AsNoTracking()
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == examSessionId && a.UserId == userId, cancellationToken);

        if (attempt == null)
        {
            return await GetRevisionPlanAsync(userId, subjectId, cancellationToken);
        }

        // Get mistake questions
        var mistakeQuestionIds = attempt.Responses
            .Where(r => r.IsCorrect == false)
            .Select(r => r.QuestionId)
            .ToList();

        var mistakeTopics = new List<string>();
        if (mistakeQuestionIds.Count > 0)
        {
            mistakeTopics = await _context.ContentQuestions.AsNoTracking()
                .Where(q => mistakeQuestionIds.Contains(q.Id) && !string.IsNullOrWhiteSpace(q.Topic))
                .Select(q => q.Topic!)
                .Distinct()
                .ToListAsync(cancellationToken);
        }

        var currentPlan = await GetRevisionPlanAsync(userId, subjectId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        if (mistakeTopics.Count > 0)
        {
            // Insert or update front milestone with mistake topic reinforcement
            var firstIncomplete = currentPlan.Milestones.FirstOrDefault(m => !m.IsCompleted);
            if (firstIncomplete != null)
            {
                var topMistakeTopic = mistakeTopics.First();
                firstIncomplete.FocusTopic = topMistakeTopic;
                firstIncomplete.Title = $"Ngày {firstIncomplete.DayIndex}: Củng cố điểm yếu - {topMistakeTopic}";
                firstIncomplete.Objective = $"Ôn tập ngay lỗ hổng kiến thức phát hiện từ bài thi ({string.Join(", ", mistakeTopics.Take(2))}).";
            }

            currentPlan.AdjustmentHistory.Add(new RevisionPlanAdjustmentLogDto
            {
                AdjustedAt = now,
                Reason = $"Tự động điều chỉnh sau đề thi: Tăng cường củng cố chuyên đề còn yếu ({string.Join(", ", mistakeTopics.Take(3))})",
                PreviousTargetScore = currentPlan.TargetScore,
                NewTargetScore = currentPlan.TargetScore
            });

            currentPlan.LastUpdatedAt = now;

            var planEvent = new LearningEvent
            {
                Id = $"ev_plan_{Guid.NewGuid():N}",
                UserId = userId,
                SubjectId = subjectId,
                LessonId = string.Empty,
                Timestamp = now,
                Type = "revision_plan",
                PayloadJson = JsonSerializer.Serialize(currentPlan),
                SchemaVersion = 1
            };

            _context.LearningEvents.Add(planEvent);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return currentPlan;
    }
}
