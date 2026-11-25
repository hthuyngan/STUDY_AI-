using System.Text.Json.Nodes;

namespace StudyAI.Features.Content;

public interface IContentLessonsService
{
    Task<ContentLessonListResponseDto> ListLessonsAsync(
        string? subjectId = null,
        string? curriculumEditionId = null,
        string? chapterId = null,
        string? topicId = null,
        string? status = null,
        string? search = null,
        bool includeDeleted = false,
        int page = 1,
        int pageSize = 20,
        string sort = "orderIndex",
        string direction = "asc",
        CancellationToken ct = default);

    Task<ContentLessonDetailDto> GetLessonDetailAsync(string lessonId, CancellationToken ct = default);
    Task<ContentLessonDetailDto> CreateLessonAsync(CreateLessonRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<ContentLessonDetailDto> UpdateLessonAsync(string lessonId, UpdateLessonRequestDto req, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<bool> DeleteLessonAsync(string lessonId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<bool> ReorderLessonsAsync(ReorderLessonsRequestDto req, string currentUserId, CancellationToken ct = default);

    Task<ContentLessonDetailDto> SubmitReviewAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<ContentLessonDetailDto> ApproveLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> PublishLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> UnpublishLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> RequestChangesAsync(string lessonId, JsonObject? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> RejectLessonAsync(string lessonId, JsonObject? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> ArchiveLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> ReactivateLessonAsync(string lessonId, ContentStatusActionDto? action, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentLessonDetailDto> RollbackLessonAsync(string lessonId, RollbackContentRequestDto? req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
}
