
namespace StudyAI.Features.AI;

public interface IAiUsageService
{
    Task LogUsageAsync(
        string userId,
        string feature,
        string provider,
        string model,
        int inputTokens,
        int outputTokens,
        int latencyMs,
        string status,
        string? errorMessage = null,
        CancellationToken cancellationToken = default);

    Task<AiUsageStatsDto> GetUsageStatsAsync(
        string? userId = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        CancellationToken cancellationToken = default);

    Task<List<AiUsageLogItemDto>> GetRecentLogsAsync(
        int limit = 50,
        CancellationToken cancellationToken = default);

    Task<string?> TryReserveQuotaAsync(
        string userId,
        string feature,
        string provider,
        string model,
        int dailyLimit,
        int monthlyLimit,
        CancellationToken cancellationToken = default);

    Task FinalizeUsageReservationAsync(
        string? reservationId,
        int inputTokens,
        int outputTokens,
        int latencyMs,
        string status,
        string? errorMessage = null,
        CancellationToken cancellationToken = default);

    Task ReleaseUsageReservationAsync(
        string? reservationId,
        CancellationToken cancellationToken = default);

    AiFeatureConfigDto GetFeatureConfig();
    void SetFeatureToggle(string feature, bool enabled);
}
