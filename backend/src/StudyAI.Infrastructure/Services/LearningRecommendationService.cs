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

    private async Task<string> ResolveEffectiveSubjectIdAsync(string userId, string? subjectId, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            return subjectId;
        }

        if (!string.IsNullOrWhiteSpace(userId) && userId != "guest")
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            var g = user?.Grade?.Trim();
            if (g == "10" || g?.Contains("10") == true) return "sub_math10";
            if (g == "11" || g?.Contains("11") == true) return "sub_math11";
        }

        return "sub_math12";
    }

    public async Task<List<AiLearningRecommendationDto>> GetRecommendationsAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveSubjectId = await ResolveEffectiveSubjectIdAsync(userId, subjectId, cancellationToken);

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
        var effectiveSubjectId = await ResolveEffectiveSubjectIdAsync(userId, subjectId, cancellationToken);

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

        // Short term learning goals
        var shortTermGoals = new List<string>();
        if (highPriority.Count > 0)
        {
            shortTermGoals.Add($"Khắc phục dứt điểm {highPriority.Count} chủ đề yếu: {string.Join(", ", highPriority.Take(2).Select(h => h.TopicName ?? h.LessonTitle))}.");
            shortTermGoals.Add("Nâng tỷ lệ làm đúng dạng bài nhận biết & thông hiểu lên trên 80%.");
            shortTermGoals.Add("Hoàn thành bài đánh giá thu hoạch để cập nhật trạng thái thành Đạt yêu cầu.");
        }
        else
        {
            shortTermGoals.Add("Nắm vững lý thuyết và các bài toán mẫu của bài học tiếp theo.");
            shortTermGoals.Add("Chinh phục các câu hỏi vận dụng và vận dụng cao để nâng band điểm lên 8.5+.");
            shortTermGoals.Add("Duy trì tốc độ làm bài trung bình dưới 1.5 phút/câu trắc nghiệm.");
        }

        return new AdaptiveLearningPathDto
        {
            Id = $"alp_{userId}_{effectiveSubjectId}",
            UserId = userId,
            SubjectId = effectiveSubjectId,
            CurrentStage = currentStage,
            StageDescription = stageDesc,
            ShortTermGoals = shortTermGoals,
            Steps = steps,
            GeneratedAt = DateTimeOffset.UtcNow
        };
    }

    public async Task<List<KnowledgeGapDto>> GetKnowledgeGapsAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveSubjectId = await ResolveEffectiveSubjectIdAsync(userId, subjectId, cancellationToken);

        if (string.IsNullOrWhiteSpace(userId) || userId == "guest")
        {
            return new List<KnowledgeGapDto>();
        }

        // 1. Fetch persistent topic masteries
        var masteries = await _context.StudentTopicMasteries.AsNoTracking()
            .Where(m => m.UserId == userId && m.SubjectId == effectiveSubjectId)
            .ToListAsync(cancellationToken);

        if (masteries.Count == 0)
        {
            var masteryResult = await _masteryService.GetStudentMasteryAsync(userId, effectiveSubjectId, cancellationToken);
            masteries = await _context.StudentTopicMasteries.AsNoTracking()
                .Where(m => m.UserId == userId && m.SubjectId == effectiveSubjectId)
                .ToListAsync(cancellationToken);
        }

        // 2. Fetch all published lessons to map prerequisite knowledge and lesson IDs
        var allLessons = await _context.ContentLessons.AsNoTracking()
            .Include(l => l.Chapter)
            .Include(l => l.Topic)
            .Where(l => l.Chapter != null && l.Chapter.SubjectId == effectiveSubjectId && l.Status == "published")
            .ToListAsync(cancellationToken);

        // 3. Filter weak topics with authentic practice evidence
        var weakMasteries = masteries
            .Where(m => m.AttemptCount > 0 && (m.Status == "needs_reinforcement" || (m.Status == "progressing" && m.MasteryScore < 60.0) || (m.AttemptCount >= 2 && m.CorrectCount < m.AttemptCount)))
            .OrderBy(m => m.MasteryScore)
            .ToList();

        var gaps = new List<KnowledgeGapDto>();

        foreach (var wm in weakMasteries)
        {
            int mistakes = Math.Max(0, wm.AttemptCount - wm.CorrectCount);
            if (mistakes == 0 && wm.MasteryScore >= 70.0) continue;

            string severity = wm.MasteryScore >= 70.0
                ? "minor"
                : (wm.MasteryScore < 35.0 || (mistakes >= 3 && wm.MasteryScore < 50.0))
                    ? "critical"
                    : wm.MasteryScore < 55.0
                        ? "moderate"
                        : "minor";

            var matchedLesson = allLessons.FirstOrDefault(l =>
                l.Title.Contains(wm.TopicName, StringComparison.OrdinalIgnoreCase) ||
                (l.Topic != null && l.Topic.Title.Contains(wm.TopicName, StringComparison.OrdinalIgnoreCase)));

            var prerequisites = DerivePrerequisitesForTopic(wm.TopicName);
            var actionSteps = new List<string>
            {
                matchedLesson != null
                    ? $"Xem lại phần lý thuyết và ví dụ mẫu trong bài \"{matchedLesson.Title}\"."
                    : "Xem lại lý thuyết và ghi nhớ các công thức trọng tâm.",
                "Củng cố kiến thức nền: " + string.Join(", ", prerequisites),
                "Luyện tập bộ 5 câu hỏi thích ứng (Nhận biết & Thông hiểu) để phục hồi kỹ năng.",
                "Làm bài kiểm tra thu hoạch để xác nhận lấp đầy lỗ hổng."
            };

            string status = wm.MasteryScore >= 70.0 ? "resolved" : wm.AttemptCount >= 3 ? "reviewing" : "open";

            gaps.Add(new KnowledgeGapDto
            {
                Id = $"gap_{wm.Id}",
                SkillId = wm.Id,
                SkillName = wm.TopicName,
                SubjectId = effectiveSubjectId,
                Severity = severity,
                AccuracyPercent = wm.AttemptCount > 0 ? Math.Round((double)wm.CorrectCount / wm.AttemptCount * 100.0, 1) : 0.0,
                MistakeCount = mistakes,
                EvidenceSummary = $"Làm chưa chính xác {mistakes}/{wm.AttemptCount} lượt câu hỏi liên quan đến \"{wm.TopicName}\" (Điểm năng lực: {wm.MasteryScore}%).",
                RecommendedLessonId = matchedLesson?.Id,
                RecommendedLessonTitle = matchedLesson?.Title,
                PrerequisiteConcepts = prerequisites,
                ActionSteps = actionSteps,
                RecommendedPracticeCount = 5,
                Status = status,
                PostReviewAccuracyPercent = status == "resolved" ? wm.MasteryScore : null,
                DetectedAt = wm.LastAttemptAt ?? wm.UpdatedAt
            });
        }

        return gaps;
    }

    private static List<string> DerivePrerequisitesForTopic(string topicName)
    {
        var lower = topicName.ToLowerInvariant();
        if (lower.Contains("đơn điệu") || lower.Contains("xét dấu"))
        {
            return new List<string> { "Đạo hàm của hàm đa thức", "Định lý về dấu của tam thức bậc hai $ax^2 + bx + c$" };
        }
        if (lower.Contains("cực trị"))
        {
            return new List<string> { "Điều kiện cần và đủ để hàm số đạt cực trị", "Giải phương trình đạo hàm $y' = 0$" };
        }
        if (lower.Contains("lớn nhất") || lower.Contains("nhỏ nhất") || lower.Contains("glnn") || lower.Contains("gtln"))
        {
            return new List<string> { "Tìm nghiệm đạo hàm thuộc đoạn $[a; b]$", "So sánh giá trị tại các điểm tới hạn và 2 đầu mút" };
        }
        if (lower.Contains("tiệm cận"))
        {
            return new List<string> { "Giới hạn tại vô cực $\\lim_{x \\to \\pm\\infty} f(x)$", "Giới hạn một bên tại điểm gián đoạn $\\lim_{x \\to x_0^\\pm} f(x)$" };
        }
        if (lower.Contains("đồ thị") || lower.Contains("biến thiên"))
        {
            return new List<string> { "Xác định dấu hệ số $a$", "Giao điểm với trục tung và trục hoành" };
        }
        if (lower.Contains("tích phân") || lower.Contains("nguyên hàm"))
        {
            return new List<string> { "Bảng nguyên hàm cơ bản", "Phương pháp từng phần $\\int u dv = uv - \\int v du$" };
        }
        if (lower.Contains("oxyz") || lower.Contains("vectơ") || lower.Contains("mặt phẳng"))
        {
            return new List<string> { "Toạ độ vectơ $\\vec{u}$, tích vô hướng và tích có hướng", "Phương trình mặt phẳng đi qua 1 điểm có VTPT" };
        }

        return new List<string> { "Khái niệm và định nghĩa cơ bản", "Các công thức và phương pháp giải chuẩn SGK" };
    }
}

