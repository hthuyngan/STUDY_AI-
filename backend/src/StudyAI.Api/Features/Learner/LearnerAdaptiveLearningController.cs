using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Api.Features.Learner;

[Authorize]
[ApiController]
[Route("api/v1/ai")]
public class AdaptiveLearningController : ControllerBase
{
    private readonly IAiHintService _hintService;
    private readonly IAiAnalysisService _analysisService;
    private readonly IStudentMasteryService _masteryService;
    private readonly ILearningRecommendationService _recommendationService;

    public AdaptiveLearningController(
        IAiHintService hintService,
        IAiAnalysisService analysisService,
        IStudentMasteryService masteryService,
        ILearningRecommendationService recommendationService)
    {
        _hintService = hintService;
        _analysisService = analysisService;
        _masteryService = masteryService;
        _recommendationService = recommendationService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        "guest_student";

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. MULTI-LEVEL HINT LADDER (3 CẤP ĐỘ GỢI Ý SOCRATIC)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpPost("hints")]
    public async Task<IActionResult> GetHint(
        [FromBody] HintRequestDto request,
        [FromQuery] string? sessionId = null,
        [FromQuery] string? mode = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var hint = await _hintService.GetHintAsync(
                CurrentUserId,
                request.QuestionId,
                request.HintLevel,
                sessionId,
                mode,
                cancellationToken);

            return Ok(hint);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { detail = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { detail = ex.Message });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. AI ERROR ANALYSIS (PHÂN TÍCH LỖI SAI BÀI LÀM)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpPost("error-analysis")]
    public async Task<IActionResult> AnalyzeErrors(
        [FromBody] AiErrorAnalysisRequestDto request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _analysisService.AnalyzeSessionErrorsAsync(
                CurrentUserId,
                request.SessionId,
                cancellationToken);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { detail = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { detail = ex.Message });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. SKILL MASTERY ENGINE (ĐÁNH GIÁ NĂNG LỰC GDPT 2018)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("mastery")]
    public async Task<IActionResult> GetSkillMastery(
        [FromQuery] string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _masteryService.GetStudentMasteryAsync(CurrentUserId, subjectId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("knowledge-profile")]
    public async Task<IActionResult> GetKnowledgeProfile(
        [FromQuery] string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _masteryService.GetStudentKnowledgeProfileAsync(CurrentUserId, subjectId, cancellationToken);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. ADAPTIVE LEARNING PATH (LỘ TRÌNH HỌC THÍCH ỨNG)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("learning-path")]
    public async Task<IActionResult> GetAdaptiveLearningPath(
        [FromQuery] string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _recommendationService.GetLearningPathAsync(CurrentUserId, subjectId, cancellationToken);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. RECOMMENDED LESSONS (ĐỀ XUẤT BÀI HỌC TIẾP THEO & ÔN TẬP)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("recommendations")]
    public async Task<IActionResult> GetRecommendations(
        [FromQuery] string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _recommendationService.GetRecommendationsAsync(CurrentUserId, subjectId, cancellationToken);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. KNOWLEDGE GAPS DETECTION (PHÁT HIỆN LỖ HỔNG KIẾN THỨC BẰNG BẰNG CHỨNG)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("knowledge-gaps")]
    public async Task<IActionResult> GetKnowledgeGaps(
        [FromQuery] string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _recommendationService.GetKnowledgeGapsAsync(CurrentUserId, subjectId, cancellationToken);
        return Ok(result);
    }
}
