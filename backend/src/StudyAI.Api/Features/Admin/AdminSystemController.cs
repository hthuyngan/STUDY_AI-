using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Admin;

[ApiController]
[Route("api/v1/admin/system")]
[Authorize(Policy = "AdminOnly")]
public class AdminSystemController : ControllerBase
{
    private readonly IAdminSystemService _systemService;

    public AdminSystemController(IAdminSystemService systemService)
    {
        _systemService = systemService;
    }

    [HttpGet("health")]
    public async Task<IActionResult> GetSystemHealth(CancellationToken ct = default)
    {
        var result = await _systemService.GetSystemStatusAsync(ct);
        return Ok(result);
    }
}