using System.Text.Json.Nodes;

namespace StudyAI.Features.Content;

public interface IContentQuestionsService
{
    Task<object> ListQuestionsAsync(
        string? grade = null,
        string? subjectId = null,
        string? difficulty = null,
        string? type = null,
        string? status = null,
        string? sourceType = null,
        string? search = null,
        bool includeDeleted = false,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);

    Task<QuestionStatsDto> GetQuestionStatisticsAsync(CancellationToken ct = default);
    Task<ContentQuestionItemDto> GetQuestionDetailAsync(string questionId, CancellationToken ct = default);
    Task<ContentQuestionItemDto> CreateQuestionAsync(CreateQuestionRequestDto req, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<ContentQuestionItemDto> UpdateQuestionAsync(string questionId, UpdateQuestionRequestDto req, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<bool> DeleteQuestionAsync(string questionId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<ContentQuestionItemDto> RestoreQuestionAsync(string questionId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<ContentQuestionItemDto> SubmitQuestionReviewAsync(string questionId, string currentUserId, bool isContentStaffOrAdmin, CancellationToken ct = default);
    Task<ContentQuestionItemDto> ApproveQuestionAsync(string questionId, string currentUserId, bool canApprove, CancellationToken ct = default);
    Task<ContentQuestionItemDto> RejectQuestionAsync(string questionId, RejectQuestionRequestDto? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentQuestionItemDto> RequestChangesQuestionAsync(string questionId, JsonObject? body, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<ContentQuestionItemDto> PublishQuestionAsync(string questionId, string currentUserId, bool canPublish, CancellationToken ct = default);
    Task<ContentQuestionItemDto> UnpublishQuestionAsync(string questionId, string currentUserId, bool canPublish, CancellationToken ct = default);
    Task<ContentQuestionItemDto> RollbackQuestionAsync(string questionId, RollbackContentRequestDto? req, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default);
    Task<QuestionImportResultDto> ImportQuestionsAsync(QuestionImportBatchRequestDto req, string currentUserId, CancellationToken ct = default);
}