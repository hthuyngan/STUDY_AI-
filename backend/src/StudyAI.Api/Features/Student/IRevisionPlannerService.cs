
namespace StudyAI.Features.Student;

public interface IRevisionPlannerService
{
    Task<RevisionPlanDto> GetRevisionPlanAsync(
        string userId,
        string subjectId,
        CancellationToken cancellationToken = default);

    Task<RevisionPlanDto> CreateOrUpdateRevisionPlanAsync(
        string userId,
        CreateRevisionPlanRequestDto request,
        CancellationToken cancellationToken = default);

    Task<RevisionPlanDto> AutoAdjustPlanAfterExamAsync(
        string userId,
        string subjectId,
        string examSessionId,
        CancellationToken cancellationToken = default);
}
