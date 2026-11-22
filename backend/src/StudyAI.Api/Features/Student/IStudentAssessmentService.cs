
namespace StudyAI.Features.Student;

public interface IStudentAssessmentService
{
    Task<List<AssessmentAttemptResponseDto>> ListAttemptsAsync(string requestingUserId, string targetUserId, bool isAdmin, string? lessonId = null, CancellationToken cancellationToken = default);
    Task<AssessmentAttemptResponseDto> GetSingleAttemptAsync(string requestingUserId, string targetUserId, bool isAdmin, string attemptId, CancellationToken cancellationToken = default);
    Task<AssessmentAttemptResponseDto> CreateAttemptAsync(string requestingUserId, string targetUserId, bool isAdmin, AssessmentAttemptCreateDto dto, CancellationToken cancellationToken = default);
    Task<AssessmentAttemptResponseDto> UpdateAttemptAsync(string requestingUserId, string targetUserId, bool isAdmin, string attemptId, AssessmentAttemptCreateDto dto, CancellationToken cancellationToken = default);
}