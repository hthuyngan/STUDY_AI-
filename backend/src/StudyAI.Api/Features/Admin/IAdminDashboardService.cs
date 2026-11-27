
namespace StudyAI.Features.Admin;

public interface IAdminDashboardService
{
    Task<AdminDashboardDto> GetDashboardAsync(string range = "7d", DateTimeOffset? from = null, DateTimeOffset? to = null, CancellationToken ct = default);
    Task<AdminAnalyticsResponseDto> GetAnalyticsAsync(string range = "7d", DateTimeOffset? from = null, DateTimeOffset? to = null, CancellationToken ct = default);
    Task<LearningReportsResponseDto> GetReportsAsync(string timeframe = "30d", string? subjectId = null, string? classId = null, CancellationToken ct = default);
}