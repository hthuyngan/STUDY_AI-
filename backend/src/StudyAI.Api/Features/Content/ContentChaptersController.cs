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
    public async Task<IActionResult> ListChapters([FromQuery] string? subjectId = null, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        var result = await _chaptersService.ListChaptersAsync(subjectId, search, ct);
        return Ok(result);
    }

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