using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Teacher;

[ApiController]
[Route("api/v1/teacher/workspace")]
[Authorize]
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
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<List<TeacherExamDto>>> GetExams([FromQuery] string? classroomId = null, CancellationToken ct = default)
        => Ok(await _service.GetExamsAsync(CurrentUserId, IsAdmin, classroomId, ct));

    [HttpPost("exams")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<TeacherExamDto>> CreateExam([FromBody] CreateTeacherExamRequestDto req, CancellationToken ct)
    {
        var created = await _service.CreateExamAsync(req, CurrentUserId, IsAdmin, ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPatch("exams/{examId}/status")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<TeacherExamDto>> UpdateExamStatus(string examId, [FromBody] UpdateTeacherExamStatusRequestDto req, CancellationToken ct)
        => Ok(await _service.UpdateExamStatusAsync(examId, req, CurrentUserId, IsAdmin, ct));

    [HttpGet("materials")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<List<ClassroomMaterialDto>>> GetMaterials([FromQuery] string? classroomId = null, CancellationToken ct = default)
        => Ok(await _service.GetMaterialsAsync(CurrentUserId, IsAdmin, classroomId, ct));

    [HttpPost("materials")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<ClassroomMaterialDto>> CreateMaterial([FromBody] CreateClassroomMaterialRequestDto req, CancellationToken ct)
    {
        var created = await _service.CreateMaterialAsync(req, CurrentUserId, IsAdmin, ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPost("materials/upload")]
    [Authorize(Roles = "teacher,admin")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(16 * 1024 * 1024)]
    public async Task<ActionResult<ClassroomMaterialDto>> UploadMaterial(
        [FromForm] IFormFile file,
        [FromForm] string classroomId,
        [FromForm] string title,
        [FromForm] string? category = "lecture_note",
        CancellationToken ct = default)
    {
        var created = await _service.UploadMaterialAsync(file, classroomId, title, category ?? "lecture_note", CurrentUserId, IsAdmin, ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpGet("materials/{materialId}/download")]
    [Authorize(Roles = "teacher,admin,learner")]
    public async Task<IActionResult> DownloadMaterial(string materialId, CancellationToken ct = default)
    {
        var (stream, mimeType, fileName) = await _service.DownloadMaterialAsync(materialId, CurrentUserId, IsAdmin, ct);
        return File(stream, mimeType, fileName);
    }

    [HttpDelete("materials/{materialId}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<ClassroomMaterialDto>> RevokeMaterial(string materialId, CancellationToken ct)
        => Ok(await _service.RevokeMaterialAsync(materialId, CurrentUserId, IsAdmin, ct));

    [HttpGet("announcements")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<List<ClassroomAnnouncementDto>>> GetAnnouncements([FromQuery] string? classroomId = null, CancellationToken ct = default)
        => Ok(await _service.GetAnnouncementsAsync(CurrentUserId, IsAdmin, classroomId, ct));

    [HttpPost("announcements")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<ClassroomAnnouncementDto>> CreateAnnouncement([FromBody] CreateClassroomAnnouncementRequestDto req, CancellationToken ct)
    {
        var created = await _service.CreateAnnouncementAsync(req, CurrentUserId, IsAdmin, ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpGet("schedule")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<List<TeacherScheduleItemDto>>> GetSchedule(CancellationToken ct)
        => Ok(await _service.GetScheduleAsync(CurrentUserId, IsAdmin, ct));

    [HttpPost("ai-assistant")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<ActionResult<TeacherAiAssistantResponseDto>> RunAiAssistant([FromBody] TeacherAiAssistantRequestDto req, CancellationToken ct)
        => Ok(await _service.RunAiAssistantAsync(req, CurrentUserId, IsAdmin, ct));
}
