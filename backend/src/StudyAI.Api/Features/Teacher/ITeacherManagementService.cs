
namespace StudyAI.Features.Teacher;

public interface ITeacherManagementService
{
    Task<List<TeacherClassroomSummaryDto>> GetTeacherClassroomsAsync(
        string teacherId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<ClassroomAnalyticsDto> GetClassroomAnalyticsAsync(
        string teacherId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default);

    Task<RemedialInterventionOutcomeDto> AssignRemedialInterventionAsync(
        string teacherId,
        string userRole,
        CreateRemedialInterventionRequestDto request,
        CancellationToken cancellationToken = default);

    Task<List<RemedialInterventionOutcomeDto>> GetClassroomInterventionsAsync(
        string teacherId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default);
}
