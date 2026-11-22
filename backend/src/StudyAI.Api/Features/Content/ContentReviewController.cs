using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Content;

[ApiController]
[Route("api/v1/content")]
[Authorize(Policy = "ContentAuthor")]
public class ContentReviewController : ControllerBase
{
    private readonly IContentReviewService _reviewService;

    public ContentReviewController(IContentReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpGet("approvals")]
    public async Task<IActionResult> GetApprovals(
        [FromQuery] string? status = "all",
        [FromQuery] string? type = "all",
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var results = await _reviewService.GetApprovalsAsync(status, type, search, ct);
        return Ok(results);
    }

    [HttpGet("publications")]
    public async Task<IActionResult> GetPublications(
        [FromQuery] string? search = null,
        [FromQuery] string? type = "all",
        CancellationToken ct = default)
    {
        var results = await _reviewService.GetPublicationsAsync(search, type, ct);
        return Ok(results);
    }
}