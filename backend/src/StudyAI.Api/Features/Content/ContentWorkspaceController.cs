using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Content;

[ApiController]
[Route("api/v1/content/workspace")]
[Authorize]
public class ContentWorkspaceController : ControllerBase
{
    private readonly IContentWorkspaceService _service;

    public ContentWorkspaceController(IContentWorkspaceService service)
    {
        _service = service;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    [HttpGet("dashboard")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<ContentWorkspaceDashboardDto>> GetDashboard(CancellationToken ct)
    {
        return Ok(await _service.GetDashboardAsync(ct));
    }

    [HttpGet("materials")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<List<ContentMaterialDto>>> GetMaterials(
        [FromQuery] string? category = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        return Ok(await _service.GetMaterialsAsync(category, status, search, ct));
    }

    [HttpPost("materials")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<ContentMaterialDto>> CreateMaterial(
        [FromBody] CreateContentMaterialRequestDto req, CancellationToken ct)
    {
        var created = await _service.CreateMaterialAsync(req, CurrentUserId, ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPost("materials/upload")]
    [Authorize(Policy = "ContentStaff")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(16 * 1024 * 1024)]
    public async Task<ActionResult<ContentMaterialDto>> UploadMaterial(
        [FromForm] IFormFile file,
        [FromForm] string title,
        [FromForm] string? category = "chapter_doc",
        [FromForm] string? chapterCode = null,
        [FromForm] string? chapterTitle = null,
        CancellationToken ct = default)
    {
        var created = await _service.UploadMaterialAsync(file, title, category ?? "chapter_doc", chapterCode, chapterTitle, CurrentUserId, ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpGet("materials/{id}/download")]
    [Authorize]
    public async Task<IActionResult> DownloadMaterial(string id, CancellationToken ct = default)
    {
        var isContentStaff = User.IsInRole("admin") || User.IsInRole("content");
        var (stream, mimeType, fileName) = await _service.DownloadMaterialAsync(id, CurrentUserId, isContentStaff, ct);
        return File(stream, mimeType, fileName);
    }

    [HttpPatch("materials/{id}/status")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<ContentMaterialDto>> UpdateMaterialStatus(
        string id, [FromBody] UpdateContentMaterialStatusRequestDto req, CancellationToken ct)
    {
        return Ok(await _service.UpdateMaterialStatusAsync(id, req.Status, CurrentUserId, ct));
    }

    [HttpGet("knowledge-sources")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<List<AiKnowledgeSourceDto>>> GetKnowledgeSources(CancellationToken ct)
    {
        return Ok(await _service.GetKnowledgeSourcesAsync(ct));
    }

    [HttpPost("knowledge-sources")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<AiKnowledgeSourceDto>> RegisterAndSyncKnowledgeSource(
        [FromBody] RegisterAiKnowledgeSourceRequestDto req, CancellationToken ct)
    {
        return Ok(await _service.RegisterAndSyncKnowledgeSourceAsync(req, CurrentUserId, ct));
    }

    [HttpPost("knowledge-sources/{id}/sync")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<AiKnowledgeSourceDto>> SyncKnowledgeSource(string id, CancellationToken ct)
    {
        return Ok(await _service.SyncKnowledgeSourceAsync(id, CurrentUserId, ct));
    }

    [HttpDelete("knowledge-sources/{id}")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<AiKnowledgeSourceDto>> RevokeKnowledgeSource(string id, CancellationToken ct)
    {
        return Ok(await _service.RevokeKnowledgeSourceAsync(id, CurrentUserId, ct));
    }

    [HttpPost("knowledge-sources/retrieve-test")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<List<RetrievedKnowledgeChunkDto>>> TestRetrieveKnowledge(
        [FromBody] RetrieveKnowledgeTestRequestDto req, CancellationToken ct)
    {
        return Ok(await _service.TestRetrieveKnowledgeAsync(req.Query, req.TopK, ct));
    }

    [HttpGet("error-reports")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<List<ContentErrorReportDto>>> GetErrorReports(
        [FromQuery] string? status = null,
        [FromQuery] string? classification = null,
        CancellationToken ct = default)
    {
        return Ok(await _service.GetErrorReportsAsync(status, classification, ct));
    }

    [HttpPost("error-reports")]
    [Authorize]
    public async Task<ActionResult<ContentErrorReportDto>> CreateErrorReport(
        [FromBody] CreateContentErrorReportRequestDto req, CancellationToken ct)
    {
        var created = await _service.CreateErrorReportAsync(req, CurrentUserId, ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPatch("error-reports/{id}")]
    [Authorize(Policy = "ContentStaff")]
    public async Task<ActionResult<ContentErrorReportDto>> UpdateErrorReport(
        string id, [FromBody] UpdateContentErrorReportRequestDto req, CancellationToken ct)
    {
        return Ok(await _service.UpdateErrorReportAsync(id, req, CurrentUserId, ct));
    }
}
