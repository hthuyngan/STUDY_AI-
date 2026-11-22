using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Learner.Assessments;

namespace StudyAI.Api.Features.Learner;

[Authorize]
[ApiController]
public class LearnerAssessmentAttemptsController : ControllerBase
{
    private readonly ILearnerAssessmentService _assessmentService;

    public LearnerAssessmentAttemptsController(ILearnerAssessmentService assessmentService)
    {
        _assessmentService = assessmentService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        string.Empty;

    private bool IsAdmin => User.IsInRole("admin");

    [HttpGet("api/v1/users/{userId}/assessment-attempts")]
    [HttpGet("api/v1/me/assessment-attempts")]
    public async Task<IActionResult> ListAttempts(
        [FromQuery] string? lessonId = null,
        string? userId = null,
        CancellationToken ct = default)
    {
        try
        {
            var targetId = userId ?? CurrentUserId;
            var result = await _assessmentService.ListAttemptsAsync(CurrentUserId, targetId, IsAdmin, lessonId, ct);
            return Ok(result);
        }
        catch (ForbiddenException) { return Forbid(); }
    }

    [HttpGet("api/v1/users/{userId}/assessment-attempts/{attemptId}")]
    [HttpGet("api/v1/me/assessment-attempts/{attemptId}")]
    public async Task<IActionResult> GetAttempt(
        string attemptId,
        string? userId = null,
        CancellationToken ct = default)
    {
        try
        {
            var targetId = userId ?? CurrentUserId;
            var result = await _assessmentService.GetSingleAttemptAsync(CurrentUserId, targetId, IsAdmin, attemptId, ct);
            return Ok(result);
        }
        catch (ForbiddenException) { return Forbid(); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPost("api/v1/users/{userId}/assessment-attempts")]
    [HttpPost("api/v1/me/assessment-attempts")]
    public async Task<IActionResult> CreateAttempt(
        [FromBody] AssessmentAttemptCreateDto dto,
        string? userId = null,
        CancellationToken ct = default)
    {
        try
        {
            var targetId = userId ?? CurrentUserId;
            var result = await _assessmentService.CreateAttemptAsync(CurrentUserId, targetId, IsAdmin, dto, ct);
            return StatusCode(201, result);
        }
        catch (ForbiddenException) { return Forbid(); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPut("api/v1/users/{userId}/assessment-attempts/{attemptId}")]
    [HttpPut("api/v1/me/assessment-attempts/{attemptId}")]
    [HttpPatch("api/v1/me/assessment-attempts/{attemptId}")]
    public async Task<IActionResult> UpdateAttempt(
        string attemptId,
        [FromBody] AssessmentAttemptCreateDto dto,
        string? userId = null,
        CancellationToken ct = default)
    {
        try
        {
            var targetId = userId ?? CurrentUserId;
            var result = await _assessmentService.UpdateAttemptAsync(CurrentUserId, targetId, IsAdmin, attemptId, dto, ct);
            return Ok(result);
        }
        catch (ForbiddenException) { return Forbid(); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }
}
