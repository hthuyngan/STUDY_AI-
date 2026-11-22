using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Admin;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminDashboardController : ControllerBase
{
    private readonly IAdminDashboardService _dashboardService;

    public AdminDashboardController(IAdminDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken ct)
    {
        var data = await _dashboardService.GetDashboardAsync(ct);
        return Ok(data);
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics([FromQuery] string range = "7d", CancellationToken ct = default)
    {
        var data = await _dashboardService.GetAnalyticsAsync(range, ct);
        return Ok(data);
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports(
        [FromQuery] string timeframe = "30d",
        [FromQuery] string? subjectId = null,
        [FromQuery] string? classId = null,
        CancellationToken ct = default)
    {
        var data = await _dashboardService.GetReportsAsync(timeframe, subjectId, classId, ct);
        return Ok(data);
    }
}