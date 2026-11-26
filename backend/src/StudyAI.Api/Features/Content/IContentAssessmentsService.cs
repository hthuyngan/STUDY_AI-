using System.Text.Json.Nodes;

namespace StudyAI.Features.Content;

public interface IContentAssessmentsService
{
    Task<List<ContentAssessmentItemDto>> ListAssessmentsAsync(
        string? lessonId = null,
        string? status = null,
        string? search = null,
        CancellationToken ct = default);

    Task<ContentAssessmentItemDto> GetAssessmentDetailAsync(string id, CancellationToken ct = default);
    Task<ContentAssessmentItemDto> CreateAssessmentAsync(CreateAssessmentRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<ContentAssessmentItemDto> UpdateAssessmentAsync(string id, UpdateAssessmentRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<bool> DeleteAssessmentAsync(string id, string currentUserId, CancellationToken ct = default);
    Task<ContentAssessmentItemDto> UpdateAssessmentStatusAsync(string id, JsonObject body, string currentUserId, CancellationToken ct = default);
    Task<ContentAssessmentItemDto> AddAssessmentQuestionAsync(string id, AddAssessmentQuestionRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<ContentAssessmentItemDto> ComposeAssessmentQuestionsAsync(string id, ComposeAssessmentQuestionsRequestDto req, string currentUserId, CancellationToken ct = default);
}