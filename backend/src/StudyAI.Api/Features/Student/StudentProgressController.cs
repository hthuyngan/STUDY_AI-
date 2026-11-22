using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Student;

[Authorize]
[ApiController]
public class StudentProgressController : ControllerBase
{
    private readonly ILearnerProgressService _progressService;

    public StudentProgressController(ILearnerProgressService progressService)
    {
        _progressService = progressService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        string.Empty;

    private bool IsAdmin => User.IsInRole("admin");

    [HttpGet("api/v1/users/{userId}/lesson-progress")]
    [HttpGet("api/v1/me/lesson-progress")]
    public async Task<IActionResult> ListProgress(string? userId = null, CancellationToken ct = default)
    {
        try
        {
            var targetId = userId ?? CurrentUserId;
            var result = await _progressService.ListUserProgressAsync(CurrentUserId, targetId, IsAdmin, ct);
            return Ok(result);
        }
        catch (ForbiddenException) { return Forbid(); }
    }

    [HttpGet("api/v1/users/{userId}/lesson-progress/{lessonId}")]
    [HttpGet("api/v1/me/lesson-progress/{lessonId}")]
    public async Task<IActionResult> GetProgress(string lessonId, string? userId = null, CancellationToken ct = default)
    {
        try
        {
            var targetId = userId ?? CurrentUserId;
            var result = await _progressService.GetSingleProgressAsync(CurrentUserId, targetId, IsAdmin, lessonId, ct);
            return Ok(result);
        }
        catch (ForbiddenException) { return Forbid(); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPut("api/v1/users/{userId}/lesson-progress/{lessonId}")]
    [HttpPut("api/v1/me/lesson-progress/{lessonId}")]
    public async Task<IActionResult> PutProgress(string lessonId, [FromBody] LessonProgressCreateOrUpdateDto dto, string? userId = null, CancellationToken ct = default)
    {
        try
        {
            var targetId = userId ?? CurrentUserId;
            var result = await _progressService.PutLessonProgressAsync(CurrentUserId, targetId, IsAdmin, lessonId, dto, ct);
            return Ok(result);
        }
        catch (ForbiddenException) { return Forbid(); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }
}