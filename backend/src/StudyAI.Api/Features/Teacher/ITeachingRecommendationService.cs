
namespace StudyAI.Features.Teacher;

public interface ITeachingRecommendationService
{
    Task<List<TeachingRecommendationDto>> GetCohortTeachingRecommendationsAsync(
        string teacherId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default);
}
