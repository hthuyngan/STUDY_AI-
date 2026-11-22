using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Learner.Profile;

public record CreateBookmarkRequest(string ItemId, string? SubjectId = null, string? Title = null);

public class LearnerBookmarkDto
{
    public string Id { get; set; } = string.Empty;
    public string? ItemId { get; set; }
    public string? SubjectId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? Payload { get; set; }
}

public interface ILearnerProfileService
{
    Task<BootstrapSyncResponseDto> BootstrapSyncAsync(string userId, BootstrapSyncRequestDto dto, CancellationToken cancellationToken = default);
    Task<List<LearnerBookmarkDto>> GetBookmarksAsync(string userId, CancellationToken cancellationToken = default);
    Task<bool> AddBookmarkAsync(string userId, CreateBookmarkRequest request, CancellationToken cancellationToken = default);
    Task<bool> RemoveBookmarkAsync(string userId, string itemId, CancellationToken cancellationToken = default);
}
