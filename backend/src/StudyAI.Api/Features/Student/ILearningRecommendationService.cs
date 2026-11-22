
namespace StudyAI.Features.Student;

public interface ILearningRecommendationService
{
    Task<AdaptiveLearningPathDto> GetLearningPathAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default);

    Task<List<AiLearningRecommendationDto>> GetRecommendationsAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default);

    Task<List<KnowledgeGapDto>> GetKnowledgeGapsAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default);
}
