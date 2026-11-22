
namespace StudyAI.Features.Student;

public interface IStudentEventsService
{
    Task<LearningEventBatchResponseDto> PostEventsBatchAsync(string requestingUserId, string targetUserId, bool isAdmin, LearningEventBatchRequestDto dto, CancellationToken cancellationToken = default);
    Task<List<LearningEventItemDto>> GetEventsAsync(string requestingUserId, string targetUserId, bool isAdmin, int limit = 100, DateTimeOffset? before = null, string? lessonId = null, string? subjectId = null, CancellationToken cancellationToken = default);
}