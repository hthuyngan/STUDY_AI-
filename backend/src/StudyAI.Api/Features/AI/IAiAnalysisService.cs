
namespace StudyAI.Features.AI;

public interface IAiAnalysisService
{
    Task<AiErrorAnalysisResultDto> AnalyzeSessionErrorsAsync(
        string userId,
        string sessionId,
        CancellationToken cancellationToken = default);
}
