using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Infrastructure.Services;

public class LearningRecommendationService : ILearningRecommendationService
{
    private readonly IApplicationDbContext _context;
    private readonly IStudentMasteryService _masteryService;
    private readonly IAiUsageService _usageService;
    private readonly ILogger<LearningRecommendationService> _logger;

    public LearningRecommendationService(
        IApplicationDbContext context,
        IStudentMasteryService masteryService,
        IAiUsageService usageService,
        ILogger<LearningRecommendationService> logger)
    {
        _context = context;
        _masteryService = masteryService;
        _usageService = usageService;
        _logger = logger;
    }

    public async Task<List<AiLearningRecommendationDto>> GetRecommendationsAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveSubjectId = string.IsNullOrWhiteSpace(subjectId) || subjectId == "all"
            ? "sub_math12"
            : subjectId;

        // 1. Fetch all published lessons in database for this subject
        var allLessons = await _context.ContentLessons
            .AsNoTracking()
            .Include(l => l.Chapter)
            .Include(l => l.Topic)
            .Where(l => l.Chapter != null && l.Chapter.SubjectId == effectiveSubjectId && l.Status == "published")
            .OrderBy(l => l.Chapter!.OrderIndex)
            .ThenBy(l => l.OrderIndex)
            .ToListAsync(cancellationToken);

        if (allLessons.Count == 0) return new List<AiLearningRecommendationDto>();

        // 2. Fetch completed lessons by student
        var completedLessonIds = await _context.LessonProgresses
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.SubjectId == effectiveSubjectId && (p.OverallProgress >= 100 || p.ContentProgress >= 100))
            .Select(p => p.LessonId)
            .ToListAsync(cancellationToken);

        // 3. Fetch mastery items
        var masteryResult = await _masteryService.GetStudentMasteryAsync(userId, effectiveSubjectId, cancellationToken);
        var weakSkills = masteryResult.Skills
            .Where(s => s.Status == "needs_reinforcement" || (s.Status == "developing" && s.MasteryScore < 60))
            .OrderBy(s => s.MasteryScore)
            .ToList();

        var recommendations = new List<AiLearningRecommendationDto>();

        // High priority: review lessons matching weak skills
        foreach (var weak in weakSkills)
        {
            var matchingLesson = allLessons.FirstOrDefault(l =>
                l.Title.Contains(weak.SkillName, StringComparison.OrdinalIgnoreCase) ||
                (l.Topic != null && l.Topic.Title.Contains(weak.SkillName, StringComparison.OrdinalIgnoreCase)));

            if (matchingLesson != null && !recommendations.Any(r => r.LessonId == matchingLesson.Id))
            {
                recommendations.Add(new AiLearningRecommendationDto
                {
                    Id = $"rec_{Guid.NewGuid():N}",
                    UserId = userId,
                    LessonId = matchingLesson.Id,
                    LessonTitle = matchingLesson.Title,
                    ChapterTitle = matchingLesson.Chapter?.Title,
                    TopicName = matchingLesson.Topic?.Title ?? weak.SkillName,
                    Reason = $"Ôn tập ưu tiên vì độ chính xác dạng bài \"{weak.SkillName}\" hiện đạt {weak.MasteryScore}%, cần củng cố lại phương pháp giải.",
                    Priority = "high",
                    Status = "pending",
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }
        }

        // Standard priority: next uncompleted lesson in curriculum sequence
        var nextLesson = allLessons.FirstOrDefault(l => !completedLessonIds.Contains(l.Id));
        if (nextLesson != null && !recommendations.Any(r => r.LessonId == nextLesson.Id))
        {
            recommendations.Add(new AiLearningRecommendationDto
            {
                Id = $"rec_{Guid.NewGuid():N}",
                UserId = userId,
                LessonId = nextLesson.Id,
                LessonTitle = nextLesson.Title,
                ChapterTitle = nextLesson.Chapter?.Title,
                TopicName = nextLesson.Topic?.Title,
                Reason = "Bài học tiếp theo theo phân phối chương trình chuẩn GDPT 2018.",
                Priority = "medium",
                Status = "pending",
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        // If still fewer than 3 recommendations, add subsequent lesson
        if (recommendations.Count < 3)
        {
            var remainingLessons = allLessons
                .Where(l => !completedLessonIds.Contains(l.Id) && !recommendations.Any(r => r.LessonId == l.Id))
                .Take(3 - recommendations.Count);

            foreach (var rem in remainingLessons)
            {
                recommendations.Add(new AiLearningRecommendationDto
                {
                    Id = $"rec_{Guid.NewGuid():N}",
                    UserId = userId,
                    LessonId = rem.Id,
                    LessonTitle = rem.Title,
                    ChapterTitle = rem.Chapter?.Title,
                    TopicName = rem.Topic?.Title,
                    Reason = "Học bài mới để mở rộng vốn kiến thức và chuẩn bị cho các kỳ thi khảo sát.",
                    Priority = "standard",
                    Status = "pending",
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }
        }

        return recommendations;
    }

    public async Task<AdaptiveLearningPathDto> GetLearningPathAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveSubjectId = string.IsNullOrWhiteSpace(subjectId) || subjectId == "all"
            ? "sub_math12"
            : subjectId;

        var recommendations = await GetRecommendationsAsync(userId, effectiveSubjectId, cancellationToken);

        var masteryResult = await _masteryService.GetStudentMasteryAsync(userId, effectiveSubjectId, cancellationToken);
        bool hasInsufficientData = masteryResult.Skills.Count == 0 || masteryResult.Skills.All(s => s.Status == "insufficient_data");

        var steps = new List<AdaptiveStepDto>();
        int stepNum = 1;
        string currentStage = hasInsufficientData ? "standard_curriculum" : "progressing";
        string stageDesc = hasInsufficientData
            ? "Chưa đủ dữ liệu bài làm để cá nhân hóa chuyên sâu. Hãy hoàn thành các bài học và bài luyện tập tiếp theo theo phân phối chương trình chuẩn GDPT 2018."
            : "Đang tiến bước trong lộ trình học tập Toán 12 chuẩn GDPT 2018.";

        var highPriority = recommendations.Where(r => r.Priority == "high").ToList();
        if (highPriority.Count > 0)
        {
            currentStage = "remediation";
            stageDesc = $"Phát hiện {highPriority.Count} chủ đề cần củng cố ưu tiên để lấy lại điểm số mục tiêu.";

            foreach (var hp in highPriority)
            {
                steps.Add(new AdaptiveStepDto
                {
                    StepNumber = stepNum++,
                    Title = $"Ôn tập củng cố: {hp.LessonTitle}",
                    Objective = hp.Reason,
                    ActionType = "review_lesson",
                    TargetRoute = $"/subjects/{effectiveSubjectId}/lessons/{hp.LessonId}",
                    LessonId = hp.LessonId,
                    Priority = hp.Priority,
                    IsCompleted = false
                });

                steps.Add(new AdaptiveStepDto
                {
                    StepNumber = stepNum++,
                    Title = $"Luyện tập khắc phục lỗi sai: {hp.TopicName ?? hp.LessonTitle}",
                    Objective = "Làm 5 câu hỏi trắc nghiệm rèn luyện có hỗ trợ AI Hint 3 cấp độ.",
                    ActionType = "practice_skill",
                    TargetRoute = $"/practice/hub?subjectId={effectiveSubjectId}&limit=5",
                    LessonId = hp.LessonId,
                    Priority = hp.Priority,
                    IsCompleted = false
                });
            }
        }

        // Add next lessons
        foreach (var norm in recommendations.Where(r => r.Priority != "high"))
        {
            steps.Add(new AdaptiveStepDto
            {
                StepNumber = stepNum++,
                Title = $"Bài học mới: {norm.LessonTitle}",
                Objective = norm.Reason,
                ActionType = "next_lesson",
                TargetRoute = $"/subjects/{effectiveSubjectId}/lessons/{norm.LessonId}",
                LessonId = norm.LessonId,
                Priority = norm.Priority,
                IsCompleted = false
            });
        }

        // Add exam challenge step
        steps.Add(new AdaptiveStepDto
        {
            StepNumber = stepNum++,
            Title = "Thi thử THPT Quốc Gia định kỳ",
            Objective = "Làm đề thi thử 50 câu chuẩn cấu trúc để đánh giá toàn diện các kỹ năng.",
            ActionType = "diagnostic_practice",
            TargetRoute = $"/practice/hub?subjectId={effectiveSubjectId}&mode=exam",
            Priority = "standard",
            IsCompleted = false
        });

        return new AdaptiveLearningPathDto
        {
            Id = $"alp_{userId}_{effectiveSubjectId}",
            UserId = userId,
            SubjectId = effectiveSubjectId,
            CurrentStage = currentStage,
            StageDescription = stageDesc,
            Steps = steps,
            GeneratedAt = DateTimeOffset.UtcNow
        };
    }
}

