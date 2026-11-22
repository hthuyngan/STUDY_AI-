using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Api.Features.Content;

[ApiController]
[Route("api/v1/content/governance")]
[Authorize(Roles = "admin,content,teacher")]
public class ContentGovernanceController : ControllerBase
{
    private readonly IContentGovernanceService _contentGovernanceService;
    private readonly IAiLessonAuthoringService _lessonAuthoringService;
    private readonly ILogger<ContentGovernanceController> _logger;

    public ContentGovernanceController(
        IContentGovernanceService contentGovernanceService,
        IAiLessonAuthoringService lessonAuthoringService,
        ILogger<ContentGovernanceController> logger)
    {
        _contentGovernanceService = contentGovernanceService;
        _lessonAuthoringService = lessonAuthoringService;
        _logger = logger;
    }

    private string CurrentUserId =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");

    private string CurrentUserRole =>
        User.FindFirst(ClaimTypes.Role)?.Value ?? "teacher";

    [HttpPost("workflow")]
    public async Task<ActionResult<ContentWorkflowActionResultDto>> ExecuteWorkflowAction(
        [FromBody] ContentWorkflowActionRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contentGovernanceService.ExecuteWorkflowActionAsync(
                CurrentUserId, CurrentUserRole, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("ai-audit")]
    public async Task<ActionResult<AiContentQualityAuditResponseDto>> AuditContentWithAi(
        [FromBody] AiContentQualityAuditRequestDto request,
        CancellationToken cancellationToken)
    {
        var audit = await _contentGovernanceService.AuditContentQualityWithAiAsync(
            CurrentUserId, request, cancellationToken);
        return Ok(audit);
    }

    [HttpPost("ai-authoring/outline")]
    public async Task<ActionResult<LessonAuthoringOutlineResponseDto>> GenerateLessonOutline(
        [FromBody] LessonAuthoringOutlineRequestDto request,
        CancellationToken cancellationToken)
    {
        var outline = await _lessonAuthoringService.GenerateLessonOutlineDraftAsync(
            CurrentUserId, request, cancellationToken);
        return Ok(outline);
    }

    [HttpPost("ai-authoring/questions")]
    public async Task<ActionResult<List<CheckpointQuestionDraftDto>>> GenerateCheckpointQuestions(
        [FromBody] GenerateCheckpointQuestionsRequestDto request,
        CancellationToken cancellationToken)
    {
        var questions = await _lessonAuthoringService.GenerateCheckpointQuestionsAsync(
            CurrentUserId, request, cancellationToken);
        return Ok(questions);
    }

    [HttpPost("questions/{questionId}/flag")]
    public async Task<IActionResult> FlagQuestion(
        string questionId,
        [FromBody] string reason,
        CancellationToken cancellationToken)
    {
        try
        {
            await _contentGovernanceService.FlagQuestionForModerationAsync(
                CurrentUserId, questionId, reason, cancellationToken);
            return Ok(new { message = "Đã đánh dấu câu hỏi cần chỉnh sửa vào danh sách kiểm duyệt." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

