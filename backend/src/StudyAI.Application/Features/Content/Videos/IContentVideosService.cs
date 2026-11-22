using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Content.Videos;

public interface IContentVideosService
{
    Task<object> ListLessonVideosAsync(string lessonId, CancellationToken ct = default);
    Task<ContentLessonVideoItemDto> AddLessonVideoAsync(string lessonId, CreateLessonVideoRequestDto req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonVideoItemDto> UpdateLessonVideoAsync(string videoId, UpdateLessonVideoRequestDto req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonVideoItemDto> VerifyLessonVideoAsync(string videoId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonVideoItemDto> RejectLessonVideoAsync(string videoId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonVideoItemDto> PublishLessonVideoAsync(string videoId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonVideoItemDto> UnpublishLessonVideoAsync(string videoId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<bool> DeleteLessonVideoAsync(string videoId, string currentUserId, CancellationToken ct = default);
    Task<bool> ReorderVideosAsync(ReorderVideosRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<VideoPreviewResponseDto> PreviewVideoMetadataAsync(VideoPreviewRequestDto req, CancellationToken ct = default);
}
