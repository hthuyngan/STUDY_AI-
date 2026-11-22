using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Teacher;

[Authorize]
[ApiController]
[Route("api/v1/classrooms")]
public class TeacherClassroomsController : ControllerBase
{
    private readonly ITeacherClassroomsService _classroomsService;

    public TeacherClassroomsController(ITeacherClassroomsService classroomsService)
    {
        _classroomsService = classroomsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "learner";

    [HttpGet]
    public async Task<IActionResult> ListClassrooms([FromQuery] string? teacherId = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _classroomsService.ListClassroomsAsync(CurrentUserId, CurrentUserRole, teacherId, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
    }

    [HttpPost]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> CreateClassroom([FromBody] CreateClassroomRequestDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _classroomsService.CreateClassroomAsync(CurrentUserId, dto, cancellationToken);
            return CreatedAtAction(nameof(GetClassroom), new { id = result.Id }, result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (ValidationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetClassroom(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _classroomsService.GetClassroomAsync(CurrentUserId, CurrentUserRole, id, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> UpdateClassroom(string id, [FromBody] UpdateClassroomRequestDto dto, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _classroomsService.UpdateClassroomAsync(CurrentUserId, CurrentUserRole, id, dto, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> DeleteClassroom(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _classroomsService.DeleteClassroomAsync(CurrentUserId, CurrentUserRole, id, cancellationToken);
            if (result.IsArchived)
            {
                return Ok(new { message = result.Message, archived = true });
            }
            return NoContent();
        }
        catch (UnauthorizedException) { return Unauthorized(); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{id}/activities")]
    public async Task<IActionResult> GetClassActivities(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _classroomsService.GetClassActivitiesAsync(CurrentUserId, CurrentUserRole, id, cancellationToken);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpPost("{id}/activities")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> AddClassActivity(string id, [FromBody] JsonObject payload, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _classroomsService.AddClassActivityAsync(CurrentUserId, CurrentUserRole, id, payload, cancellationToken);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }
}