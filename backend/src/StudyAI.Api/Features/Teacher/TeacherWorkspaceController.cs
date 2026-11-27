using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Teacher;

[ApiController]
[Route("api/v1/teacher/workspace")]
[Authorize(Roles = "teacher,admin")]
public class TeacherWorkspaceController : ControllerBase
{
    private readonly ITeacherWorkspaceService _service;

    public TeacherWorkspaceController(ITeacherWorkspaceService service)
    {
        _service = service;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    private bool IsAdmin => User.IsInRole("admin");

    [HttpGet("exams")]
    public async Task<ActionResult<List<TeacherExamDto>>> GetExams([FromQuery] string? classroomId = null, CancellationToken ct = default)
        => Ok(await _service.GetExamsAsync(CurrentUserId, IsAdmin, classroomId, ct));

    [HttpPost("exams")]
    public async Task<ActionResult<TeacherExamDto>> CreateExam([FromBody] CreateTeacherExamRequestDto req, CancellationToken ct)
    {
        var created = await _service.CreateExamAsync(req, CurrentUserId, IsAdmin, ct);
        return CreatedAtAction(nameof(GetExams), new { id = created.Id }, created);
    }

    [HttpPatch("exams/{examId}/status")]
    public async Task<ActionResult<TeacherExamDto>> UpdateExamStatus(string examId, [FromBody] UpdateTeacherExamStatusRequestDto req, CancellationToken ct)
        => Ok(await _service.UpdateExamStatusAsync(examId, req, CurrentUserId, IsAdmin, ct));

    [HttpGet("materials")]
    public async Task<ActionResult<List<ClassroomMaterialDto>>> GetMaterials([FromQuery] string? classroomId = null, CancellationToken ct = default)
        => Ok(await _service.GetMaterialsAsync(CurrentUserId, IsAdmin, classroomId, ct));

    [HttpPost("materials")]
    public async Task<ActionResult<ClassroomMaterialDto>> CreateMaterial([FromBody] CreateClassroomMaterialRequestDto req, CancellationToken ct)
    {
        var created = await _service.CreateMaterialAsync(req, CurrentUserId, IsAdmin, ct);
        return CreatedAtAction(nameof(GetMaterials), new { id = created.Id }, created);
    }

    [HttpDelete("materials/{materialId}")]
    public async Task<ActionResult<ClassroomMaterialDto>> RevokeMaterial(string materialId, CancellationToken ct)
        => Ok(await _service.RevokeMaterialAsync(materialId, CurrentUserId, IsAdmin, ct));

    [HttpGet("announcements")]
    public async Task<ActionResult<List<ClassroomAnnouncementDto>>> GetAnnouncements([FromQuery] string? classroomId = null, CancellationToken ct = default)
        => Ok(await _service.GetAnnouncementsAsync(CurrentUserId, IsAdmin, classroomId, ct));

    [HttpPost("announcements")]
    public async Task<ActionResult<ClassroomAnnouncementDto>> CreateAnnouncement([FromBody] CreateClassroomAnnouncementRequestDto req, CancellationToken ct)
    {
        var created = await _service.CreateAnnouncementAsync(req, CurrentUserId, IsAdmin, ct);
        return CreatedAtAction(nameof(GetAnnouncements), new { id = created.Id }, created);
    }

    [HttpGet("schedule")]
    public async Task<ActionResult<List<TeacherScheduleItemDto>>> GetSchedule(CancellationToken ct)
        => Ok(await _service.GetScheduleAsync(CurrentUserId, IsAdmin, ct));

    [HttpPost("ai-assistant")]
    public async Task<ActionResult<TeacherAiAssistantResponseDto>> RunAiAssistant([FromBody] TeacherAiAssistantRequestDto req, CancellationToken ct)
        => Ok(await _service.RunAiAssistantAsync(req, CurrentUserId, IsAdmin, ct));
}
