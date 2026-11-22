
namespace StudyAI.Features.AI;

public interface IAiHintService
{
    Task<HintResponseDto> GetHintAsync(
        string userId,
        string questionId,
        int hintLevel,
        string? sessionId = null,
        string? mode = null,
        CancellationToken cancellationToken = default);
}
