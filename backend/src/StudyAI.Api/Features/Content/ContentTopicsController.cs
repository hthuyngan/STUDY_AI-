using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Content;

[ApiController]
[Route("api/v1/content/topics")]
[Authorize(Policy = "ContentAuthor")]
public class ContentTopicsController : ControllerBase
{
    private readonly IContentTopicsService _topicsService;

    public ContentTopicsController(IContentTopicsService topicsService)
    {
        _topicsService = topicsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "staff";

    [HttpGet]
    public async Task<IActionResult> ListTopics([FromQuery] string? chapterId = null, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        var result = await _topicsService.ListTopicsAsync(chapterId, search, ct);
        return Ok(result);
    }

    [HttpGet("{topicId}")]
    public async Task<IActionResult> GetTopicDetail(string topicId, CancellationToken ct = default)
    {
        var result = await _topicsService.GetTopicDetailAsync(topicId, ct);
        return Ok(result);
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost]
    public async Task<IActionResult> CreateTopic([FromBody] CreateTopicRequestDto req, CancellationToken ct = default)
    {
        var result = await _topicsService.CreateTopicAsync(req, CurrentUserId, ct);
        return StatusCode(201, result);
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPatch("{topicId}")]
    public async Task<IActionResult> UpdateTopic(string topicId, [FromBody] UpdateTopicRequestDto req, CancellationToken ct = default)
    {
        var result = await _topicsService.UpdateTopicAsync(topicId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpDelete("{topicId}")]
    public async Task<IActionResult> DeleteTopic(string topicId, CancellationToken ct = default)
    {
        await _topicsService.DeleteTopicAsync(topicId, CurrentUserId, ct);
        return Ok(new { success = true, message = "Đã xóa chủ đề thành công." });
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderTopics([FromBody] ReorderTopicsRequestDto req, CancellationToken ct = default)
    {
        await _topicsService.ReorderTopicsAsync(req, CurrentUserId, ct);
        return Ok(new { success = true, message = $"Đã cập nhật thứ tự {req.TopicIds?.Count ?? 0} chủ đề thành công." });
    }
}