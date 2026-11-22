using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Learner.Events;

namespace StudyAI.Api.Features.Learner;

[Authorize]
[ApiController]
public class LearnerEventsController : ControllerBase
{
    private readonly ILearnerEventsService _eventsService;

    public LearnerEventsController(ILearnerEventsService eventsService)
    {
        _eventsService = eventsService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        string.Empty;

    private bool IsAdmin => User.IsInRole("admin");

    [HttpPost("api/v1/users/{userId}/learning-events/batch")]
    [HttpPost("api/v1/me/learning-events/batch")]
    public async Task<IActionResult> PostEventsBatch(
        [FromBody] LearningEventBatchRequestDto dto,
        string? userId = null,
        CancellationToken ct = default)
    {
        try
        {
            var targetId = userId ?? CurrentUserId;
            var result = await _eventsService.PostEventsBatchAsync(CurrentUserId, targetId, IsAdmin, dto, ct);
            return StatusCode(201, result);
        }
        catch (ForbiddenException) { return Forbid(); }
    }

    [HttpGet("api/v1/users/{userId}/learning-events")]
    [HttpGet("api/v1/me/learning-events")]
    public async Task<IActionResult> GetEvents(
        [FromQuery] int limit = 100,
        [FromQuery] DateTimeOffset? before = null,
        [FromQuery] string? lessonId = null,
        [FromQuery] string? subjectId = null,
        string? userId = null,
        CancellationToken ct = default)
    {
        try
        {
            var targetId = userId ?? CurrentUserId;
            var result = await _eventsService.GetEventsAsync(CurrentUserId, targetId, IsAdmin, limit, before, lessonId, subjectId, ct);
            return Ok(result);
        }
        catch (ForbiddenException) { return Forbid(); }
    }
}
