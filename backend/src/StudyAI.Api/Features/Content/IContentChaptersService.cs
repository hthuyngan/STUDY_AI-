
namespace StudyAI.Features.Content;

public interface IContentChaptersService
{
    Task<ContentChapterListResponseDto> ListChaptersAsync(string? subjectId = null, string? curriculumEditionId = null,
        string? status = null, string? search = null, string sort = "orderIndex", string direction = "asc",
        int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<ContentChapterItemDto> GetChapterDetailAsync(string chapterId, CancellationToken ct = default);
    Task<ContentChapterItemDto> CreateChapterAsync(CreateChapterRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<ContentChapterItemDto> UpdateChapterAsync(string chapterId, UpdateChapterRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<ContentChapterItemDto> SubmitReviewAsync(string id, ContentStatusActionDto? action, string userId, CancellationToken ct = default);
    Task<ContentChapterItemDto> ApproveAsync(string id, ContentStatusActionDto? action, string userId, CancellationToken ct = default);
    Task<ContentChapterItemDto> PublishAsync(string id, ContentStatusActionDto? action, string userId, CancellationToken ct = default);
    Task<ContentChapterItemDto> UnpublishAsync(string id, ContentStatusActionDto? action, string userId, CancellationToken ct = default);
    Task<ContentChapterItemDto> RequestChangesAsync(string id, ContentStatusActionDto? action, string userId, CancellationToken ct = default);
    Task<ContentChapterItemDto> ArchiveAsync(string id, ContentStatusActionDto? action, string userId, CancellationToken ct = default);
    Task<ContentChapterItemDto> ReactivateAsync(string id, ContentStatusActionDto? action, string userId, CancellationToken ct = default);
    Task<bool> ReorderChaptersAsync(ReorderChaptersRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<bool> DeleteChapterAsync(string chapterId, string currentUserId, CancellationToken ct = default);
}
