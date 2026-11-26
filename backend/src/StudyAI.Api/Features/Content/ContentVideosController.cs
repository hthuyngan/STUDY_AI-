using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Content;

[ApiController]
[Route("api/v1/content")]
[Authorize(Policy = "ContentAuthor")]
public class ContentVideosController : ControllerBase
{
    private readonly IContentVideosService _videosService;

    public ContentVideosController(IContentVideosService videosService)
    {
        _videosService = videosService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "staff";

    private bool IsAuthorizedReviewer =>
        User.IsInRole("admin") ||
        User.IsInRole("content_admin") ||
        User.IsInRole("reviewer") ||
        User.HasClaim("permission", "content.approve") ||
        User.HasClaim("reviewer", "true");

    [HttpGet("lessons/{lessonId}/videos")]
    public async Task<IActionResult> ListLessonVideos(string lessonId, CancellationToken ct = default)
    {
        var result = await _videosService.ListLessonVideosAsync(lessonId, ct);
        return Ok(result);
    }

    [HttpPost("lessons/{lessonId}/videos")]
    public async Task<IActionResult> AddLessonVideo(string lessonId, [FromBody] CreateLessonVideoRequestDto req, CancellationToken ct = default)
    {
        var result = await _videosService.AddLessonVideoAsync(lessonId, req, CurrentUserId, IsAuthorizedReviewer, ct);
        return StatusCode(201, result);
    }

    [HttpPatch("videos/{videoId}")]
    public async Task<IActionResult> UpdateLessonVideo(string videoId, [FromBody] UpdateLessonVideoRequestDto req, CancellationToken ct = default)
    {
        var result = await _videosService.UpdateLessonVideoAsync(videoId, req, CurrentUserId, IsAuthorizedReviewer, ct);
        return Ok(result);
    }

    [HttpPost("videos/{videoId}/verify")]
    public async Task<IActionResult> VerifyLessonVideo(string videoId, CancellationToken ct = default)
    {
        var result = await _videosService.VerifyLessonVideoAsync(videoId, CurrentUserId, IsAuthorizedReviewer, ct);
        return Ok(result);
    }

    [HttpPost("videos/{videoId}/reject")]
    public async Task<IActionResult> RejectLessonVideo(string videoId, CancellationToken ct = default)
    {
        var result = await _videosService.RejectLessonVideoAsync(videoId, CurrentUserId, IsAuthorizedReviewer, ct);
        return Ok(result);
    }

    [HttpPost("videos/{videoId}/publish")]
    public async Task<IActionResult> PublishLessonVideo(string videoId, CancellationToken ct = default)
    {
        var result = await _videosService.PublishLessonVideoAsync(videoId, CurrentUserId, IsAuthorizedReviewer, ct);
        return Ok(result);
    }

    [HttpPost("videos/{videoId}/unpublish")]
    public async Task<IActionResult> UnpublishLessonVideo(string videoId, CancellationToken ct = default)
    {
        var result = await _videosService.UnpublishLessonVideoAsync(videoId, CurrentUserId, IsAuthorizedReviewer, ct);
        return Ok(result);
    }

    [HttpDelete("videos/{videoId}")]
    public async Task<IActionResult> DeleteLessonVideo(string videoId, CancellationToken ct = default)
    {
        await _videosService.DeleteLessonVideoAsync(videoId, CurrentUserId, ct);
        return Ok(new { success = true, message = $"Đã xóa liên kết video '{videoId}' thành công." });
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("videos/reorder")]
    public async Task<IActionResult> ReorderVideos([FromBody] ReorderVideosRequestDto req, CancellationToken ct = default)
    {
        await _videosService.ReorderVideosAsync(req, CurrentUserId, ct);
        return Ok(new { success = true, message = $"Đã cập nhật thứ tự {req.VideoIds?.Count ?? 0} video thành công." });
    }

    [HttpPost("videos/preview-metadata")]
    public async Task<IActionResult> PreviewVideoMetadata([FromBody] VideoPreviewRequestDto req, CancellationToken ct = default)
    {
        var result = await _videosService.PreviewVideoMetadataAsync(req, ct);
        return Ok(result);
    }
}