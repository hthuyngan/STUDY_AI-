using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Content;

[ApiController]
[Route("api/v1/content")]
[Authorize(Policy = "ContentAuthor")]
public class LessonResourcesController : ControllerBase
{
    private readonly ILessonResourcesService _resourcesService;

    public LessonResourcesController(ILessonResourcesService resourcesService)
    {
        _resourcesService = resourcesService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "staff";

    private bool IsAuthorizedReviewer =>
        !User.HasClaim("reviewer", "false") &&
        (User.IsInRole("content") ||
         User.IsInRole("admin") ||
         User.IsInRole("content_admin") ||
         User.IsInRole("reviewer") ||
         User.HasClaim("permission", "content.approve") ||
         User.HasClaim("reviewer", "true"));

    [HttpGet("lessons/{lessonId}/resources")]
    public async Task<IActionResult> ListLessonResources(string lessonId, [FromQuery] bool includeArchived = false, CancellationToken ct = default)
    {
        var result = await _resourcesService.ListLessonResourcesAsync(lessonId, includeArchived, ct);
        return Ok(result);
    }

    [HttpPost("lessons/{lessonId}/resources")]
    public async Task<IActionResult> AddLessonResource(string lessonId, [FromBody] CreateLessonResourceRequestDto req, CancellationToken ct = default)
    {
        var result = await _resourcesService.AddLessonResourceAsync(lessonId, req, CurrentUserId, ct);
        return StatusCode(201, result);
    }

    [HttpPatch("resources/{resourceId}")]
    public async Task<IActionResult> UpdateLessonResource(string resourceId, [FromBody] UpdateLessonResourceRequestDto req, CancellationToken ct = default)
    {
        var result = await _resourcesService.UpdateLessonResourceAsync(resourceId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPost("resources/reorder")]
    public async Task<IActionResult> ReorderLessonResources([FromBody] ReorderLessonResourcesRequestDto req, CancellationToken ct = default)
    {
        var items = await _resourcesService.ReorderLessonResourcesAsync(req, CurrentUserId, ct);
        return Ok(new { success = true, items, total = items.Count });
    }

    [HttpPost("resources/{resourceId}/archive")]
    public async Task<IActionResult> ArchiveLessonResource(string resourceId, [FromBody] LessonResourceActionRequestDto req, CancellationToken ct = default)
    {
        var result = await _resourcesService.ArchiveLessonResourceAsync(resourceId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPost("resources/{resourceId}/verify")]
    public async Task<IActionResult> VerifyLessonResource(string resourceId, [FromBody] LessonResourceActionRequestDto req, CancellationToken ct = default)
    {
        var result = await _resourcesService.VerifyLessonResourceAsync(resourceId, req, CurrentUserId, IsAuthorizedReviewer, ct);
        return Ok(result);
    }

    [HttpPost("resources/{resourceId}/reject")]
    public async Task<IActionResult> RejectLessonResource(string resourceId, [FromBody] LessonResourceActionRequestDto req, CancellationToken ct = default)
    {
        var result = await _resourcesService.RejectLessonResourceAsync(resourceId, req, CurrentUserId, IsAuthorizedReviewer, ct);
        return Ok(result);
    }

    [HttpPost("resources/{resourceId}/publish")]
    public async Task<IActionResult> PublishLessonResource(string resourceId, [FromBody] LessonResourceActionRequestDto req, CancellationToken ct = default)
    {
        var result = await _resourcesService.PublishLessonResourceAsync(resourceId, req, CurrentUserId, IsAuthorizedReviewer, ct);
        return Ok(result);
    }

    [HttpPost("resources/{resourceId}/unpublish")]
    public async Task<IActionResult> UnpublishLessonResource(string resourceId, [FromBody] LessonResourceActionRequestDto req, CancellationToken ct = default)
    {
        var result = await _resourcesService.UnpublishLessonResourceAsync(resourceId, req, CurrentUserId, IsAuthorizedReviewer, ct);
        return Ok(result);
    }
}
