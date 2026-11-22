using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Teacher;

[ApiController]
[Route("api/v1/teacher")]
[Authorize(Roles = "teacher,admin")]
public class TeacherAnalyticsController : ControllerBase
{
    private readonly ITeacherAnalyticsService _analyticsService;

    public TeacherAnalyticsController(ITeacherAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? "teacher";

    [HttpGet("classrooms")]
    public async Task<ActionResult<List<TeacherClassroomSummaryDto>>> GetClassrooms(CancellationToken cancellationToken)
    {
        var classrooms = await _analyticsService.GetClassroomsAsync(CurrentUserId, CurrentUserRole, cancellationToken);
        return Ok(classrooms);
    }

    [HttpGet("classrooms/{classroomId}/analytics")]
    public async Task<ActionResult<ClassroomAnalyticsDto>> GetClassroomAnalytics(string classroomId, CancellationToken cancellationToken)
    {
        try
        {
            var analytics = await _analyticsService.GetClassroomAnalyticsAsync(CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(analytics);
        }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpGet("classrooms/{classroomId}/recommendations")]
    public async Task<ActionResult<List<TeachingRecommendationDto>>> GetRecommendations(string classroomId, CancellationToken cancellationToken)
    {
        try
        {
            var recs = await _analyticsService.GetRecommendationsAsync(CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(recs);
        }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpPost("interventions")]
    public async Task<ActionResult<RemedialInterventionOutcomeDto>> AssignIntervention(
        [FromBody] CreateRemedialInterventionRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var outcome = await _analyticsService.AssignInterventionAsync(CurrentUserId, CurrentUserRole, request, cancellationToken);
            return Ok(outcome);
        }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("classrooms/{classroomId}/interventions")]
    public async Task<ActionResult<List<RemedialInterventionOutcomeDto>>> GetInterventions(string classroomId, CancellationToken cancellationToken)
    {
        try
        {
            var list = await _analyticsService.GetInterventionsAsync(CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(list);
        }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts(CancellationToken cancellationToken)
    {
        var result = await _analyticsService.GetAlertsAsync(CurrentUserId, CurrentUserRole, cancellationToken);
        return Ok(result);
    }

    [HttpPut("alerts/{alertId}")]
    public async Task<IActionResult> UpdateAlert(string alertId, [FromBody] JsonObject payload, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _analyticsService.UpdateAlertAsync(CurrentUserId, CurrentUserRole, alertId, payload, cancellationToken);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("alerts/resolve-all")]
    public async Task<IActionResult> ResolveAllAlerts(CancellationToken cancellationToken)
    {
        var result = await _analyticsService.ResolveAllAlertsAsync(CurrentUserId, CurrentUserRole, cancellationToken);
        return Ok(result);
    }

    [HttpGet("students/{studentId}/academic-detail")]
    public async Task<IActionResult> GetStudentAcademicDetail(string studentId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _analyticsService.GetStudentAcademicDetailAsync(CurrentUserId, CurrentUserRole, studentId, cancellationToken);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }
}