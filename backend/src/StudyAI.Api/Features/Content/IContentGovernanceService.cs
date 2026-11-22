
namespace StudyAI.Features.Content;

public interface IContentGovernanceService
{
    Task<ContentWorkflowActionResultDto> ExecuteWorkflowActionAsync(
        string actorUserId,
        string actorRole,
        ContentWorkflowActionRequestDto request,
        CancellationToken cancellationToken = default);

    Task<AiContentQualityAuditResponseDto> AuditContentQualityWithAiAsync(
        string userId,
        AiContentQualityAuditRequestDto request,
        CancellationToken cancellationToken = default);

    Task FlagQuestionForModerationAsync(
        string actorUserId,
        string questionId,
        string reason,
        CancellationToken cancellationToken = default);
}
