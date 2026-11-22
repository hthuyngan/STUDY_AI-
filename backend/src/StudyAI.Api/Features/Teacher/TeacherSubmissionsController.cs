using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Teacher;

[Authorize]
[ApiController]
public class TeacherSubmissionsController : ControllerBase
{
    private readonly ITeacherSubmissionsService _submissionsService;

    public TeacherSubmissionsController(ITeacherSubmissionsService submissionsService)
    {
        _submissionsService = submissionsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "learner";

    [HttpPost("api/v1/assignments/{id}/submissions")]
    [Authorize(Roles = "learner,admin")]
    public async Task<IActionResult> SubmitAssignment(string id, [FromBody] CreateSubmissionRequestDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _submissionsService.SubmitAssignmentAsync(CurrentUserId, CurrentUserRole, id, dto, cancellationToken);
            return CreatedAtAction(nameof(GetMySubmission), new { id }, result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpGet("api/v1/assignments/{id}/my-submission")]
    [Authorize]
    public async Task<IActionResult> GetMySubmission(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _submissionsService.GetMySubmissionAsync(CurrentUserId, id, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("api/v1/assignments/{id}/submissions")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GetAssignmentSubmissions(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _submissionsService.GetAssignmentSubmissionsAsync(CurrentUserId, CurrentUserRole, id, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpGet("api/v1/teacher/submissions")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GetTeacherSubmissions(
        [FromQuery] string? classId = null,
        [FromQuery] string? assignmentId = null,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _submissionsService.GetTeacherSubmissionsAsync(CurrentUserId, CurrentUserRole, classId, assignmentId, status, cancellationToken);
            return Ok(result);
        }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }
}