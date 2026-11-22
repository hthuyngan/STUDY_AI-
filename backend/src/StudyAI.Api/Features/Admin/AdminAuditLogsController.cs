using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Admin;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminAuditLogsController : ControllerBase
{
    private readonly IAdminAuditService _auditService;

    public AdminAuditLogsController(IAdminAuditService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? action = null,
        [FromQuery] string? targetId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _auditService.GetAuditLogsAsync(action, targetId, page, pageSize, ct);
        return Ok(result);
    }
}