
namespace StudyAI.Features.Student;

public interface IStudentMasteryService
{
    Task<SkillMasteryResponseDto> GetStudentMasteryAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default);

    Task<StudentKnowledgeProfileDto> GetStudentKnowledgeProfileAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default);

    Task UpdateMasteryFromAttemptAsync(
        string userId,
        string attemptId,
        CancellationToken cancellationToken = default);
}
