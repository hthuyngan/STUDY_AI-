using System.Text.Json.Nodes;

namespace StudyAI.Features.Content;

public interface IContentLessonsService
{
    Task<object> ListLessonsAsync(
        string? chapterId = null,
        string? topicId = null,
        string? status = null,
        string? search = null,
        bool includeDeleted = false,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);

    Task<ContentLessonDetailDto> GetLessonDetailAsync(string lessonId, CancellationToken ct = default);
    Task<ContentLessonDetailDto> CreateLessonAsync(CreateLessonRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<ContentLessonDetailDto> UpdateLessonAsync(string lessonId, UpdateLessonRequestDto req, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<bool> DeleteLessonAsync(string lessonId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<bool> ReorderLessonsAsync(ReorderLessonsRequestDto req, string currentUserId, CancellationToken ct = default);

    Task<ContentLessonDetailDto> SubmitReviewAsync(string lessonId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<ContentLessonDetailDto> ApproveLessonAsync(string lessonId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> PublishLessonAsync(string lessonId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> UnpublishLessonAsync(string lessonId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> RequestChangesAsync(string lessonId, JsonObject? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> RejectLessonAsync(string lessonId, JsonObject? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> RollbackLessonAsync(string lessonId, RollbackContentRequestDto? req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
}