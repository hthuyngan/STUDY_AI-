using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Infrastructure.Services;

public class TeachingRecommendationService : ITeachingRecommendationService
{
    private readonly ITeacherManagementService _teacherManagementService;
    private readonly ILogger<TeachingRecommendationService> _logger;

    public TeachingRecommendationService(
        ITeacherManagementService teacherManagementService,
        ILogger<TeachingRecommendationService> logger)
    {
        _teacherManagementService = teacherManagementService;
        _logger = logger;
    }

    public async Task<List<TeachingRecommendationDto>> GetCohortTeachingRecommendationsAsync(
        string teacherId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default)
    {
        var analytics = await _teacherManagementService.GetClassroomAnalyticsAsync(
            teacherId, userRole, classroomId, cancellationToken);

        var list = new List<TeachingRecommendationDto>();

        // 1. Topic-level recommendations from difficult topics
        foreach (var topic in analytics.DifficultTopics)
        {
            var recId = $"rec_topic_{Guid.NewGuid():N}";
            string priority = topic.CohortAccuracyPercent < 45.0 ? "high" : "medium";

            list.Add(new TeachingRecommendationDto
            {
                RecommendationId = recId,
                ClassroomId = classroomId,
                Title = $"Củng cố chuyên đề: {topic.TopicName}",
                DetectionNarrative = $"Phát hiện {topic.AffectedStudentsCount} học sinh trong lớp gặp khó khăn (Độ chính xác trung bình cả lớp chỉ đạt {topic.CohortAccuracyPercent}%).",
                DataEvidence = $"Dữ liệu tổng hợp từ {topic.TotalAttemptsCount} lượt làm bài kiểm tra và luyện tập của lớp.",
                Priority = priority,
                ActionType = "assign_remedial",
                SuggestedTopic = topic.TopicName,
                ActionableDescription = $"Giao nhiệm vụ can thiệp bổ trợ 10 câu hỏi dạng {topic.CognitiveLevel} về '{topic.TopicName}' trước tiết học tiếp theo.",
                IsActioned = false
            });
        }

        // 2. Cohort-level at-risk student intervention alert
        if (analytics.AtRiskStudents.Count > 0)
        {
            var topNames = string.Join(", ", analytics.AtRiskStudents.Take(3).Select(s => s.FullName));
            var primaryTopic = analytics.AtRiskStudents.First().PrimaryWeakTopic;

            list.Add(new TeachingRecommendationDto
            {
                RecommendationId = $"rec_risk_{Guid.NewGuid():N}",
                ClassroomId = classroomId,
                Title = $"Nhóm {analytics.AtRiskStudents.Count} học sinh cần can thiệp hỗ trợ cá nhân hóa",
                DetectionNarrative = $"Lớp có {analytics.AtRiskStudents.Count} học sinh có năng lực dưới 50% hoặc liên tiếp sai ở các kiến thức nền tảng ({topNames}...).",
                DataEvidence = $"Điểm thành thạo trung bình của nhóm này dưới ngưỡng an toàn, chủ yếu hổng kiến thức ở '{primaryTopic}'.",
                Priority = "high",
                ActionType = "assign_remedial",
                SuggestedTopic = primaryTopic,
                ActionableDescription = "Thiết lập kế hoạch phụ đạo hoặc giao bài tập củng cố cá nhân hóa cho nhóm học sinh này.",
                IsActioned = false
            });
        }

        // 3. Curriculum pacing recommendation if completion rate is low
        if (analytics.TotalStudents > 0 && analytics.CurriculumCompletionRatePercent < 40.0)
        {
            list.Add(new TeachingRecommendationDto
            {
                RecommendationId = $"rec_pacing_{Guid.NewGuid():N}",
                ClassroomId = classroomId,
                Title = "Tiến độ học tập giáo trình của lớp đang chậm hơn kế hoạch",
                DetectionNarrative = $"Tỷ lệ hoàn thành các bài học của lớp hiện mới đạt {analytics.CurriculumCompletionRatePercent}%.",
                DataEvidence = $"Nhiều học sinh chưa hoàn thành xem video bài giảng và bài tập ví dụ mẫu.",
                Priority = "standard",
                ActionType = "review_lesson",
                SuggestedTopic = "Kế hoạch tiến độ tuần",
                ActionableDescription = "Nhắc nhở học sinh hoàn thành các bài học lý thuyết cơ bản trong tuần này.",
                IsActioned = false
            });
        }

        return list;
    }
}

