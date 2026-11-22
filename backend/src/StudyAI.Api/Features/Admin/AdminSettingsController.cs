using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Admin;

[ApiController]
[Route("api/v1/admin/settings")]
[Authorize(Policy = "AdminOnly")]
public class AdminSettingsController : ControllerBase
{
    private readonly IAdminSettingsService _settingsService;

    public AdminSettingsController(IAdminSettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "admin";

    [HttpGet]
    public async Task<IActionResult> GetSettings(CancellationToken ct = default)
    {
        var result = await _settingsService.GetSettingsAsync(ct);
        return Ok(result);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] OperationalSettingsDto req, CancellationToken ct = default)
    {
        var result = await _settingsService.UpdateSettingsAsync(req, CurrentUserId, ct);
        return Ok(result);
    }
}