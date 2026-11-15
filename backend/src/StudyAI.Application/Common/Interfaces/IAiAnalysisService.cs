using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IAiAnalysisService
{
    Task<AiErrorAnalysisResultDto> AnalyzeSessionErrorsAsync(
        string userId,
        string sessionId,
        CancellationToken cancellationToken = default);
}
