using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Admin.Dashboard;

public interface IAdminDashboardService
{
    Task<AdminDashboardDto> GetDashboardAsync(CancellationToken ct = default);
    Task<AdminAnalyticsResponseDto> GetAnalyticsAsync(string range = "7d", CancellationToken ct = default);
    Task<LearningReportsResponseDto> GetReportsAsync(string timeframe = "30d", string? subjectId = null, string? classId = null, CancellationToken ct = default);
}
