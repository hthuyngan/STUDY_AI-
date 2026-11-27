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

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    [HttpGet("mistakes")]
    public async Task<ActionResult<List<StudentMistakeItemDto>>> GetMistakes(CancellationToken ct)
        => Ok(await _service.GetMistakesAsync(CurrentUserId, ct));

    [HttpGet("classrooms")]
    public async Task<ActionResult<List<LearnerClassroomSummaryDto>>> GetMyClassrooms(CancellationToken ct)
        => Ok(await _service.GetMyClassroomsAsync(CurrentUserId, ct));

    [HttpPost("classrooms/join")]
    public async Task<ActionResult<LearnerClassroomSummaryDto>> JoinClassroom([FromBody] JoinClassroomRequestDto req, CancellationToken ct)
        => Ok(await _service.JoinClassroomByCodeAsync(CurrentUserId, req.Code, ct));
}
