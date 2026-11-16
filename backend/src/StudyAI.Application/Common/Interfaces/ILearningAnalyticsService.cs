using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface ILearningAnalyticsService
{
    Task<LearningAnalyticsOverviewDto> GetAnalyticsOverviewAsync(
        string userId,
        string? subjectId = null,
        string timeframe = "all",
        CancellationToken cancellationToken = default);

    Task<List<LearningRiskDto>> GetLearningRisksAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default);

    Task<AiLearningReportDto> GetAiLearningReportAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default);
}

