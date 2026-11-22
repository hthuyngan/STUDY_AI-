using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Teacher.Students;

namespace StudyAI.Api.Features.Teacher;

[Authorize]
[ApiController]
[Route("api/v1/classrooms/{id}")]
public class TeacherStudentsController : ControllerBase
{
    private readonly ITeacherStudentsService _studentsService;

    public TeacherStudentsController(ITeacherStudentsService studentsService)
    {
        _studentsService = studentsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "learner";

    [HttpGet("students")]
    public async Task<IActionResult> GetClassroomStudents(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _studentsService.GetClassroomStudentsAsync(CurrentUserId, CurrentUserRole, id, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpPost("students")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> EnrollStudent(string id, [FromBody] EnrollStudentRequestDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _studentsService.EnrollStudentAsync(CurrentUserId, CurrentUserRole, id, dto, cancellationToken);
            return CreatedAtAction(nameof(GetClassroomStudents), new { id }, result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpDelete("students/{studentId}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> RemoveStudent(string id, string studentId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _studentsService.RemoveStudentAsync(CurrentUserId, CurrentUserRole, id, studentId, cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpPost("transfer-student")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> TransferStudent(string id, [FromBody] TransferStudentRequestDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _studentsService.TransferStudentAsync(CurrentUserId, CurrentUserRole, id, dto, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
