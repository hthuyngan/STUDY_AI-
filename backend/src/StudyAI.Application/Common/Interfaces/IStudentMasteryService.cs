using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IStudentMasteryService
{
    Task<SkillMasteryResponseDto> GetStudentMasteryAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default);

    Task UpdateMasteryFromAttemptAsync(
        string userId,
        string attemptId,
        CancellationToken cancellationToken = default);
}
