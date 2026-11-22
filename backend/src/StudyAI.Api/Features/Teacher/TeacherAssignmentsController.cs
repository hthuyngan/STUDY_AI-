using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Teacher;

[Authorize]
[ApiController]
public class TeacherAssignmentsController : ControllerBase
{
    private readonly ITeacherAssignmentsService _assignmentsService;

    public TeacherAssignmentsController(ITeacherAssignmentsService assignmentsService)
    {
        _assignmentsService = assignmentsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "learner";

    [HttpGet("api/v1/assignments")]
    public async Task<IActionResult> ListAssignments([FromQuery] string? classroomId = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _assignmentsService.ListAssignmentsAsync(CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
    }

    [HttpGet("api/v1/assignments/{id}")]
    public async Task<IActionResult> GetAssignment(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _assignmentsService.GetAssignmentAsync(CurrentUserId, CurrentUserRole, id, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpPut("api/v1/assignments/{id}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> UpdateAssignment(string id, [FromBody] UpdateAssignmentRequestDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _assignmentsService.UpdateAssignmentAsync(CurrentUserId, CurrentUserRole, id, dto, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpDelete("api/v1/assignments/{id}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> DeleteAssignment(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _assignmentsService.DeleteAssignmentAsync(CurrentUserId, CurrentUserRole, id, cancellationToken);
            if (result.IsArchived)
            {
                return Ok(new { message = result.Message, archived = true });
            }
            return NoContent();
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpGet("api/v1/classrooms/{id}/assignments")]
    public async Task<IActionResult> GetClassroomAssignments(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _assignmentsService.GetClassroomAssignmentsAsync(CurrentUserId, CurrentUserRole, id, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpPost("api/v1/classrooms/{id}/assignments")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> CreateClassroomAssignment(string id, [FromBody] CreateAssignmentRequestDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _assignmentsService.CreateClassroomAssignmentAsync(CurrentUserId, CurrentUserRole, id, dto, cancellationToken);
            return CreatedAtAction(nameof(GetAssignment), new { id = result.Id }, result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}