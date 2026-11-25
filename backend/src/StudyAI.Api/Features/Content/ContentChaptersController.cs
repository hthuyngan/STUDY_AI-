using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Content;

[ApiController]
[Route("api/v1/content/chapters")]
[Authorize(Policy = "ContentAuthor")]
public class ContentChaptersController : ControllerBase
{
    private readonly IContentChaptersService _chaptersService;

    public ContentChaptersController(IContentChaptersService chaptersService)
    {
        _chaptersService = chaptersService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "staff";

    [HttpGet]
    public async Task<IActionResult> ListChapters([FromQuery] string? subjectId = null, [FromQuery] string? curriculumEditionId = null,
        [FromQuery] string? status = null, [FromQuery] string? search = null, [FromQuery] string sort = "orderIndex",
        [FromQuery] string direction = "asc", [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await _chaptersService.ListChaptersAsync(subjectId, curriculumEditionId, status, search, sort, direction, page, pageSize, ct);
        return Ok(result);
    }

    [HttpPost("{chapterId}/submit-review")]
    public async Task<IActionResult> SubmitReview(string chapterId, [FromBody] ContentStatusActionDto? action, CancellationToken ct) => Ok(await _chaptersService.SubmitReviewAsync(chapterId, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("{chapterId}/approve")]
    public async Task<IActionResult> Approve(string chapterId, [FromBody] ContentStatusActionDto? action, CancellationToken ct) => Ok(await _chaptersService.ApproveAsync(chapterId, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("{chapterId}/publish")]
    public async Task<IActionResult> Publish(string chapterId, [FromBody] ContentStatusActionDto? action, CancellationToken ct) => Ok(await _chaptersService.PublishAsync(chapterId, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("{chapterId}/unpublish")]
    public async Task<IActionResult> Unpublish(string chapterId, [FromBody] ContentStatusActionDto? action, CancellationToken ct) => Ok(await _chaptersService.UnpublishAsync(chapterId, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("{chapterId}/request-changes")]
    public async Task<IActionResult> RequestChanges(string chapterId, [FromBody] ContentStatusActionDto? action, CancellationToken ct) => Ok(await _chaptersService.RequestChangesAsync(chapterId, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("{chapterId}/archive")]
    public async Task<IActionResult> Archive(string chapterId, [FromBody] ContentStatusActionDto? action, CancellationToken ct) => Ok(await _chaptersService.ArchiveAsync(chapterId, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("{chapterId}/reactivate")]
    public async Task<IActionResult> Reactivate(string chapterId, [FromBody] ContentStatusActionDto? action, CancellationToken ct) => Ok(await _chaptersService.ReactivateAsync(chapterId, action, CurrentUserId, ct));

    [HttpGet("{chapterId}")]
    public async Task<IActionResult> GetChapterDetail(string chapterId, CancellationToken ct = default)
    {
        var result = await _chaptersService.GetChapterDetailAsync(chapterId, ct);
        return Ok(result);
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost]
    public async Task<IActionResult> CreateChapter([FromBody] CreateChapterRequestDto req, CancellationToken ct = default)
    {
        var result = await _chaptersService.CreateChapterAsync(req, CurrentUserId, ct);
        return StatusCode(201, result);
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPut("{chapterId}")]
    [HttpPatch("{chapterId}")]
    public async Task<IActionResult> UpdateChapter(string chapterId, [FromBody] UpdateChapterRequestDto req, CancellationToken ct = default)
    {
        var result = await _chaptersService.UpdateChapterAsync(chapterId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderChapters([FromBody] ReorderChaptersRequestDto req, CancellationToken ct = default)
    {
        await _chaptersService.ReorderChaptersAsync(req, CurrentUserId, ct);
        return Ok(new { success = true, message = $"Đã cập nhật thứ tự {req.ChapterIds?.Count ?? 0} chương thành công." });
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpDelete("{chapterId}")]
    public async Task<IActionResult> DeleteChapter(string chapterId, CancellationToken ct = default)
    {
        await _chaptersService.DeleteChapterAsync(chapterId, CurrentUserId, ct);
        return Ok(new { success = true, message = "Đã xóa chương thành công." });
    }
}
