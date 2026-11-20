using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Api.Controllers;

[ApiController]
[Route("api/v1/ai/exam-prep")]
[Authorize]
public class ExamPreparationController : ControllerBase
{
    private readonly IExamBlueprintService _blueprintService;
    private readonly IQuestionQualityService _qualityService;
    private readonly ISpacedRepetitionService _spacedRepetitionService;
    private readonly IRevisionPlannerService _revisionPlannerService;
    private readonly IExamReadinessService _readinessService;
    private readonly ILogger<ExamPreparationController> _logger;

    public ExamPreparationController(
        IExamBlueprintService blueprintService,
        IQuestionQualityService qualityService,
        ISpacedRepetitionService spacedRepetitionService,
        IRevisionPlannerService revisionPlannerService,
        IExamReadinessService readinessService,
        ILogger<ExamPreparationController> logger)
    {
        _blueprintService = blueprintService;
        _qualityService = qualityService;
        _spacedRepetitionService = spacedRepetitionService;
        _revisionPlannerService = revisionPlannerService;
        _readinessService = readinessService;
        _logger = logger;
    }

    private string GetCurrentUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException("Không xác định được danh tính người dùng.");
    }

    [HttpGet("blueprints")]
    public async Task<ActionResult<List<ExamBlueprintDto>>> GetBlueprints(
        [FromQuery] string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var blueprints = await _blueprintService.GetAvailableBlueprintsAsync(subjectId, cancellationToken);
        return Ok(blueprints);
    }

    [HttpGet("blueprints/{blueprintId}")]
    public async Task<ActionResult<ExamBlueprintDto>> GetBlueprintById(
        string blueprintId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var blueprint = await _blueprintService.GetBlueprintByIdAsync(blueprintId, cancellationToken);
            return Ok(blueprint);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("readiness")]
    public async Task<ActionResult<ExamReadinessDto>> GetReadiness(
        [FromQuery] string subjectId = "sub_math12",
        CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        var readiness = await _readinessService.AssessReadinessAsync(userId, subjectId, cancellationToken);
        return Ok(readiness);
    }

    [HttpGet("revision-plan")]
    public async Task<ActionResult<RevisionPlanDto>> GetRevisionPlan(
        [FromQuery] string subjectId = "sub_math12",
        CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        var plan = await _revisionPlannerService.GetRevisionPlanAsync(userId, subjectId, cancellationToken);
        return Ok(plan);
    }

    [HttpPost("revision-plan")]
    public async Task<ActionResult<RevisionPlanDto>> CreateOrUpdateRevisionPlan(
        [FromBody] CreateRevisionPlanRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.TargetScore < 1.0 || request.TargetScore > 10.0)
        {
            return BadRequest(new { message = "Điểm mục tiêu phải nằm trong khoảng từ 1.0 đến 10.0." });
        }

        if (request.DailyStudyMinutes < 15 || request.DailyStudyMinutes > 300)
        {
            return BadRequest(new { message = "Thời gian học mỗi ngày phải từ 15 đến 300 phút." });
        }

        var userId = GetCurrentUserId();
        var plan = await _revisionPlannerService.CreateOrUpdateRevisionPlanAsync(userId, request, cancellationToken);
        return Ok(plan);
    }

    [HttpGet("spaced-repetition")]
    public async Task<ActionResult<SpacedRepetitionQueueDto>> GetSpacedRepetitionQueue(
        [FromQuery] string subjectId = "sub_math12",
        CancellationToken cancellationToken = default)
    {
        var userId = GetCurrentUserId();
        var queue = await _spacedRepetitionService.GetUserSpacedRepetitionQueueAsync(userId, subjectId, cancellationToken);
        return Ok(queue);
    }

    [HttpPost("spaced-repetition/review")]
    public async Task<ActionResult<SpacedRepetitionReviewResultDto>> RecordReview(
        [FromBody] SpacedRepetitionReviewRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.QualityScore < 0 || request.QualityScore > 5)
        {
            return BadRequest(new { message = "Chỉ số đánh giá độ hiểu (QualityScore) phải từ 0 đến 5." });
        }

        var userId = GetCurrentUserId();
        var result = await _spacedRepetitionService.RecordReviewOutcomeAsync(userId, request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("question-quality")]
    public async Task<ActionResult<QuestionQualityAuditReportDto>> AuditQuestionQuality(
        [FromQuery] string subjectId = "sub_math12",
        CancellationToken cancellationToken = default)
    {
        var report = await _qualityService.AuditQuestionsQualityAsync(subjectId, cancellationToken);
        return Ok(report);
    }
}

