using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Student;

[Authorize]
[ApiController]
[Route("api/v1/practice")]
public class StudentPracticeController : ControllerBase
{
    private readonly ILearnerPracticeService _practiceService;

    public StudentPracticeController(ILearnerPracticeService practiceService)
    {
        _practiceService = practiceService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");

    private string CurrentUserGrade =>
        User.FindFirstValue("grade") ?? string.Empty;

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? "student";

    [HttpGet("question-count")]
    public async Task<IActionResult> GetQuestionCount(
        [FromQuery] string subjectId,
        [FromQuery] string? chapterId = null,
        [FromQuery] string? lessonId = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? mode = null,
        [FromQuery] string? grade = null,
        [FromQuery] string? skillId = null,
        [FromQuery] string? type = null,
        [FromQuery] string? questionType = null,
        CancellationToken ct = default)
    {
        try
        {
            var effectiveType = questionType ?? type;
            var result = await _practiceService.GetQuestionCountAsync(
                subjectId,
                chapterId,
                lessonId,
                difficulty,
                mode,
                grade,
                CurrentUserGrade,
                skillId,
                effectiveType,
                ct);

            return Ok(result);
        }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession(
        [FromBody] CreatePracticeSessionRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _practiceService.CreateSessionAsync(CurrentUserId, CurrentUserGrade, request, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }

    [HttpGet("sessions/{sessionId}")]
    public async Task<IActionResult> GetSession(string sessionId, CancellationToken ct = default)
    {
        try
        {
            var result = await _practiceService.GetSessionAsync(CurrentUserId, CurrentUserRole, sessionId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }

    [HttpPost("sessions/{sessionId}/answer")]
    public async Task<IActionResult> SaveAnswer(
        string sessionId,
        [FromBody] SaveAnswerRequest request,
        CancellationToken ct = default)
    {
        try
        {
            await _practiceService.SaveAnswerAsync(CurrentUserId, CurrentUserRole, sessionId, request, ct);
            return Ok(new { success = true });
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("sessions/{sessionId}/check-question")]
    public async Task<IActionResult> CheckQuestion(
        string sessionId,
        [FromBody] CheckQuestionRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _practiceService.CheckSingleQuestionAsync(CurrentUserId, CurrentUserRole, sessionId, request, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("sessions/{sessionId}/submit")]
    public async Task<IActionResult> SubmitSession(
        string sessionId,
        [FromBody] SubmitPracticeSessionRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _practiceService.SubmitSessionAsync(CurrentUserId, CurrentUserRole, sessionId, request, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpGet("sessions/{sessionId}/result")]
    public async Task<IActionResult> GetSessionResult(string sessionId, CancellationToken ct = default)
    {
        try
        {
            var result = await _practiceService.GetSessionResultAsync(CurrentUserId, CurrentUserRole, sessionId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpGet("results/{resultId}")]
    public async Task<IActionResult> GetResultById(string resultId, CancellationToken ct = default)
    {
        try
        {
            var result = await _practiceService.GetResultByIdAsync(CurrentUserId, CurrentUserRole, resultId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpGet("mistakes")]
    public async Task<IActionResult> GetMistakes([FromQuery] string? subjectId = null, CancellationToken ct = default)
    {
        var result = await _practiceService.GetMistakesAsync(CurrentUserId, subjectId, ct);
        return Ok(result);
    }

    [HttpPost("mistakes/{questionId}/review")]
    public async Task<IActionResult> ReviewMistake(
        string questionId,
        [FromBody] ReviewMistakeRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _practiceService.ReviewMistakeAsync(CurrentUserId, questionId, request, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpGet("dashboard-stats")]
    public async Task<IActionResult> GetDashboardStats(CancellationToken ct = default)
    {
        var result = await _practiceService.GetDashboardStatsAsync(CurrentUserId, ct);
        return Ok(result);
    }

    [HttpGet("leaderboard")]
    public async Task<IActionResult> GetLeaderboard([FromQuery] int limit = 10, CancellationToken ct = default)
    {
        var result = await _practiceService.GetLeaderboardAsync(CurrentUserId, limit, ct);
        return Ok(result);
    }
}