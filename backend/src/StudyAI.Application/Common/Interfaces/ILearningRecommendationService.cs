using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

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

    Task<AdaptiveLearningPathDto> UpdateLearningPlanAsync(
        string userId,
        UpdateLearningPlanRequestDto dto,
        string? subjectId = null,
        CancellationToken cancellationToken = default);
}

