using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface ITeachingRecommendationService
{
    Task<List<TeachingRecommendationDto>> GetCohortTeachingRecommendationsAsync(
        string teacherId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default);
}

