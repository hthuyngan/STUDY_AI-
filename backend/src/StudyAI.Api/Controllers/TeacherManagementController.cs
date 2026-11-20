using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Api.Controllers;

[ApiController]
[Route("api/v1/teacher")]
[Authorize(Roles = "teacher,admin")]
public class TeacherManagementController : ControllerBase
{
    private readonly ITeacherManagementService _teacherManagementService;
    private readonly ITeachingRecommendationService _recommendationService;
    private readonly ILogger<TeacherManagementController> _logger;

    public TeacherManagementController(
        ITeacherManagementService teacherManagementService,
        ITeachingRecommendationService recommendationService,
        ILogger<TeacherManagementController> logger)
    {
        _teacherManagementService = teacherManagementService;
        _recommendationService = recommendationService;
        _logger = logger;
    }

    private string CurrentUserId =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");

    private string CurrentUserRole =>
        User.FindFirst(ClaimTypes.Role)?.Value ?? "teacher";

    [HttpGet("classrooms")]
    public async Task<ActionResult<List<TeacherClassroomSummaryDto>>> GetClassrooms(
        CancellationToken cancellationToken)
    {
        var classrooms = await _teacherManagementService.GetTeacherClassroomsAsync(
            CurrentUserId, CurrentUserRole, cancellationToken);
        return Ok(classrooms);
    }

    [HttpGet("classrooms/{classroomId}/analytics")]
    public async Task<ActionResult<ClassroomAnalyticsDto>> GetClassroomAnalytics(
        string classroomId,
        CancellationToken cancellationToken)
    {
        try
        {
            var analytics = await _teacherManagementService.GetClassroomAnalyticsAsync(
                CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(analytics);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpGet("classrooms/{classroomId}/recommendations")]
    public async Task<ActionResult<List<TeachingRecommendationDto>>> GetRecommendations(
        string classroomId,
        CancellationToken cancellationToken)
    {
        try
        {
            var recs = await _recommendationService.GetCohortTeachingRecommendationsAsync(
                CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(recs);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpPost("interventions")]
    public async Task<ActionResult<RemedialInterventionOutcomeDto>> AssignIntervention(
        [FromBody] CreateRemedialInterventionRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var outcome = await _teacherManagementService.AssignRemedialInterventionAsync(
                CurrentUserId, CurrentUserRole, request, cancellationToken);
            return Ok(outcome);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("classrooms/{classroomId}/interventions")]
    public async Task<ActionResult<List<RemedialInterventionOutcomeDto>>> GetInterventions(
        string classroomId,
        CancellationToken cancellationToken)
    {
        try
        {
            var list = await _teacherManagementService.GetClassroomInterventionsAsync(
                CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(list);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }
}

