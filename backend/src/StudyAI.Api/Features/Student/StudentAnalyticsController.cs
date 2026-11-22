using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Student;

[Authorize]
[ApiController]
[Route("api/v1/ai")]
public class LearningAnalyticsController : ControllerBase
{
    private readonly ILearningAnalyticsService _analyticsService;
    private readonly IIntelligentExamService _examService;

    public LearningAnalyticsController(
        ILearningAnalyticsService analyticsService,
        IIntelligentExamService examService)
    {
        _analyticsService = analyticsService;
        _examService = examService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        "guest_student";

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. LEARNING ANALYTICS OVERVIEW
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("analytics/overview")]
    public async Task<IActionResult> GetAnalyticsOverview(
        [FromQuery] string? subjectId = null,
        [FromQuery] string timeframe = "all",
        CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetAnalyticsOverviewAsync(CurrentUserId, subjectId, timeframe, cancellationToken);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. LEARNING RISKS DETECTION
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("analytics/risks")]
    public async Task<IActionResult> GetLearningRisks(
        [FromQuery] string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetLearningRisksAsync(CurrentUserId, subjectId, cancellationToken);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. AI LEARNING REPORT
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("analytics/report")]
    public async Task<IActionResult> GetAiLearningReport(
        [FromQuery] string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetAiLearningReportAsync(CurrentUserId, subjectId, cancellationToken);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. INTELLIGENT EXAM ENGINE (MATRIX GENERATION & POST-EXAM REVIEW)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpPost("exams/matrix")]
    public async Task<IActionResult> GenerateMatrixExam(
        [FromBody] ExamMatrixRequestDto request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _examService.GenerateMatrixExamAsync(CurrentUserId, request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
    }

    [HttpGet("exams/{sessionId}/review-analytics")]
    public async Task<IActionResult> GetExamReviewAnalytics(
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _examService.GetExamReviewAnalyticsAsync(CurrentUserId, sessionId, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { detail = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message });
        }
    }
}
