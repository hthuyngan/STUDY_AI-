namespace StudyAI.Features.Content;

public interface ILessonResourcesService
{
    Task<object> ListLessonResourcesAsync(string lessonId, bool includeArchived = false, CancellationToken ct = default);
    Task<LessonResourceItemDto> AddLessonResourceAsync(string lessonId, CreateLessonResourceRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<LessonResourceItemDto> UpdateLessonResourceAsync(string resourceId, UpdateLessonResourceRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<IReadOnlyList<LessonResourceItemDto>> ReorderLessonResourcesAsync(ReorderLessonResourcesRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<LessonResourceItemDto> ArchiveLessonResourceAsync(string resourceId, LessonResourceActionRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<LessonResourceItemDto> VerifyLessonResourceAsync(string resourceId, LessonResourceActionRequestDto req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<LessonResourceItemDto> RejectLessonResourceAsync(string resourceId, LessonResourceActionRequestDto req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<LessonResourceItemDto> PublishLessonResourceAsync(string resourceId, LessonResourceActionRequestDto req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<LessonResourceItemDto> UnpublishLessonResourceAsync(string resourceId, LessonResourceActionRequestDto req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
}
