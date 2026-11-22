using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Features.Content.CurriculumImport;

namespace StudyAI.Api.Features.Content;

[ApiController]
[Route("api/v1/content/curriculum")]
[Authorize(Policy = "ContentAdminOnly")]
public class ContentCurriculumImportController : ControllerBase
{
    private readonly IContentImportService _importService;

    public ContentCurriculumImportController(IContentImportService importService)
    {
        _importService = importService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "admin";

    [HttpPost("dry-run")]
    public async Task<IActionResult> DryRunCurriculumImport([FromBody] JsonObject? body = null, CancellationToken ct = default)
    {
        var result = await _importService.DryRunCurriculumImportAsync(body, ct);
        return Ok(result);
    }

    [HttpPost("apply")]
    public async Task<IActionResult> ApplyCurriculumImport([FromBody] JsonObject? body = null, CancellationToken ct = default)
    {
        var result = await _importService.ApplyCurriculumImportAsync(body, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPost("audit-cleanup")]
    public async Task<IActionResult> AuditAndCleanupTestCurriculum([FromQuery] bool dryRun = true, CancellationToken ct = default)
    {
        var result = await _importService.AuditAndCleanupTestCurriculumAsync(dryRun, CurrentUserId, ct);
        return Ok(result);
    }
}
