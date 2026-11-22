
namespace StudyAI.Features.Student;

public interface IExamReadinessService
{
    Task<ExamReadinessDto> AssessReadinessAsync(
        string userId,
        string subjectId,
        CancellationToken cancellationToken = default);
}
