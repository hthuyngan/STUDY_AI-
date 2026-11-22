
namespace StudyAI.Features.Content;

public interface IContentTopicsService
{
    Task<object> ListTopicsAsync(string? chapterId = null, string? search = null, CancellationToken ct = default);
    Task<ContentTopicItemDto> GetTopicDetailAsync(string topicId, CancellationToken ct = default);
    Task<ContentTopicItemDto> CreateTopicAsync(CreateTopicRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<ContentTopicItemDto> UpdateTopicAsync(string topicId, UpdateTopicRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<bool> DeleteTopicAsync(string topicId, string currentUserId, CancellationToken ct = default);
    Task<bool> ReorderTopicsAsync(ReorderTopicsRequestDto req, string currentUserId, CancellationToken ct = default);
}