using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Learner.Events;

public interface ILearnerEventsService
{
    Task<LearningEventBatchResponseDto> PostEventsBatchAsync(string requestingUserId, string targetUserId, bool isAdmin, LearningEventBatchRequestDto dto, CancellationToken cancellationToken = default);
    Task<List<LearningEventItemDto>> GetEventsAsync(string requestingUserId, string targetUserId, bool isAdmin, int limit = 100, DateTimeOffset? before = null, string? lessonId = null, string? subjectId = null, CancellationToken cancellationToken = default);
}
