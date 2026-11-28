using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Student;

[ApiController]
[Route("api/v1/learner/workspace")]
[Authorize(Roles = "learner,admin")]
public class StudentWorkspaceController : ControllerBase
{
    private readonly IStudentWorkspaceService _service;

    public StudentWorkspaceController(IStudentWorkspaceService service)
    {
        _service = service;
    }

    private string RequireUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedException();
        return userId;
    }

    [HttpGet("mistakes")]
    public async Task<ActionResult<List<StudentMistakeItemDto>>> GetMistakes(CancellationToken ct)
        => Ok(await _service.GetMistakesAsync(RequireUserId(), ct));

    [HttpPatch("mistakes/{responseId}/resolve")]
    public async Task<IActionResult> ResolveMistake(string responseId, CancellationToken ct)
    {
        if (!int.TryParse(responseId, out var id))
            throw new ValidationException("ResponseId", "Mã câu sai không hợp lệ.");
        await _service.ResolveMistakeAsync(RequireUserId(), id, ct);
        return NoContent();
    }

    [HttpGet("classrooms")]
    public async Task<ActionResult<List<LearnerClassroomSummaryDto>>> GetMyClassrooms(CancellationToken ct)
        => Ok(await _service.GetMyClassroomsAsync(RequireUserId(), ct));

    [HttpPost("classrooms/join")]
    public async Task<ActionResult<LearnerClassroomSummaryDto>> JoinClassroom([FromBody] JoinClassroomRequestDto req, CancellationToken ct)
        => Ok(await _service.JoinClassroomByCodeAsync(RequireUserId(), req.Code, ct));
}
