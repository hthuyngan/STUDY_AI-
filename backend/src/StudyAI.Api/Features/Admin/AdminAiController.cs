using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Admin;

[Authorize(Roles = "admin")]
[ApiController]
[Route("api/v1/admin/ai")]
public class AiAdminController : ControllerBase
{
    private readonly IAiUsageService _usageService;

    public AiAdminController(IAiUsageService usageService)
    {
        _usageService = usageService;
    }

    /// <summary>
    /// Lấy cấu hình trạng thái và các tính năng AI hiện tại
    /// </summary>
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var config = _usageService.GetFeatureConfig();
        return Ok(config);
    }

    /// <summary>
    /// Thống kê lượng token tiêu thụ, chi phí ước tính và số lượng request theo thời gian
    /// </summary>
    [HttpGet("usage-stats")]
    public async Task<IActionResult> GetUsageStats(
        [FromQuery] string? userId = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        CancellationToken cancellationToken = default)
    {
        var stats = await _usageService.GetUsageStatsAsync(userId, from, to, cancellationToken);
        return Ok(stats);
    }

    /// <summary>
    /// Lấy nhật ký các lượt gọi AI gần đây nhất để phục vụ kiểm toán
    /// </summary>
    [HttpGet("logs")]
    public async Task<IActionResult> GetRecentLogs(
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var logs = await _usageService.GetRecentLogsAsync(limit, cancellationToken);
        return Ok(logs);
    }

    /// <summary>
    /// Bật hoặc tắt từng tính năng AI cụ thể (Tutor, Hints, Error Analysis, Learning Path)
    /// </summary>
    [HttpPost("feature-toggle")]
    public IActionResult ToggleFeature([FromBody] AiFeatureToggleRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Feature))
        {
            return BadRequest(new { detail = "Tên tính năng (Feature) không được để trống." });
        }

        _usageService.SetFeatureToggle(request.Feature, request.Enabled);
        var updated = _usageService.GetFeatureConfig();
        return Ok(new
        {
            message = $"Đã cập nhật trạng thái tính năng '{request.Feature}' thành {(request.Enabled ? "Bật" : "Tắt")}.",
            config = updated
        });
    }
}
