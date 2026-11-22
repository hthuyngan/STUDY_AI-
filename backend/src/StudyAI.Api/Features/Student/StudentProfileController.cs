using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Student;

[Authorize]
[ApiController]
[Route("api/v1/me")]
public class StudentProfileController : ControllerBase
{
    private readonly ILearnerProfileService _profileService;

    public StudentProfileController(ILearnerProfileService profileService)
    {
        _profileService = profileService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");

    [HttpPost("sync/bootstrap")]
    public async Task<IActionResult> BootstrapSync([FromBody] BootstrapSyncRequestDto dto, CancellationToken ct = default)
    {
        var result = await _profileService.BootstrapSyncAsync(CurrentUserId, dto, ct);
        return Ok(result);
    }

    [HttpGet("bookmarks")]
    public async Task<IActionResult> GetBookmarks(CancellationToken ct = default)
    {
        var result = await _profileService.GetBookmarksAsync(CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPost("bookmarks")]
    public async Task<IActionResult> AddBookmark([FromBody] CreateBookmarkRequest request, CancellationToken ct = default)
    {
        var result = await _profileService.AddBookmarkAsync(CurrentUserId, request, ct);
        return Ok(new { success = result, itemId = request.ItemId });
    }

    [HttpDelete("bookmarks/{itemId}")]
    public async Task<IActionResult> RemoveBookmark(string itemId, CancellationToken ct = default)
    {
        var result = await _profileService.RemoveBookmarkAsync(CurrentUserId, itemId, ct);
        return Ok(new { success = result, itemId });
    }
}