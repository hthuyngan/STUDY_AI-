using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Teacher.Submissions;

namespace StudyAI.Api.Features.Teacher;

[Authorize(Roles = "teacher,admin")]
[ApiController]
public class TeacherGradingController : ControllerBase
{
    private readonly ITeacherSubmissionsService _submissionsService;

    public TeacherGradingController(ITeacherSubmissionsService submissionsService)
    {
        _submissionsService = submissionsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "teacher";

    [HttpPost("api/v1/assignments/{id}/submissions/{submissionId}/grade")]
    public async Task<IActionResult> GradeSubmission(
        string id,
        string submissionId,
        [FromBody] GradeSubmissionRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _submissionsService.GradeSubmissionAsync(CurrentUserId, CurrentUserRole, id, submissionId, dto, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("api/v1/teacher/grades")]
    public async Task<IActionResult> GetGrades(
        [FromQuery] string? classId = null,
        [FromQuery] string? assignmentId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _submissionsService.GetGradesAsync(CurrentUserId, CurrentUserRole, classId, assignmentId, cancellationToken);
            return Ok(result);
        }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }
}
