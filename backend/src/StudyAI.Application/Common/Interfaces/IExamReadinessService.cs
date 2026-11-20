using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IExamReadinessService
{
    Task<ExamReadinessDto> AssessReadinessAsync(
        string userId,
        string subjectId = "sub_math12",
        CancellationToken cancellationToken = default);
}

