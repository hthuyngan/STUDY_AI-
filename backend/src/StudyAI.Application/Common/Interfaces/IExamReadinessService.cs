using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IExamReadinessService
{
    Task<ExamReadinessDto> AssessReadinessAsync(
        string userId,
        string subjectId,
        CancellationToken cancellationToken = default);
}

