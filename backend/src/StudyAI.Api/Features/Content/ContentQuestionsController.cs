using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Content;

[ApiController]
[Route("api/v1/content/questions")]
[Authorize(Policy = "ContentAuthor")]
public class ContentQuestionsController : ControllerBase
{
    private readonly IContentQuestionsService _questionsService;

    public ContentQuestionsController(IContentQuestionsService questionsService)
    {
        _questionsService = questionsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "staff";

    private bool IsAdminOrContentAdmin => User.IsInRole("admin") || User.IsInRole("content_admin");
    private bool IsContentStaffOrAdmin => IsAdminOrContentAdmin || User.IsInRole("content");

    private bool IsAuthorizedReviewer =>
        !User.HasClaim("reviewer", "false") &&
        (User.IsInRole("content") ||
         User.IsInRole("admin") ||
         User.IsInRole("content_admin") ||
         User.IsInRole("reviewer") ||
         User.HasClaim("permission", "content.approve") ||
         User.HasClaim("reviewer", "true"));

    private bool CanApprove => User.IsInRole("content") || User.IsInRole("content_admin") || User.HasClaim("permission", "content.approve");
    private bool CanPublish => User.IsInRole("content") || User.IsInRole("content_admin") || User.HasClaim("permission", "content.publish");

    [HttpGet]
    public async Task<IActionResult> ListQuestions(
        [FromQuery] string? grade = null,
        [FromQuery] string? subjectId = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? type = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sourceType = null,
        [FromQuery] string? search = null,
        [FromQuery] bool includeDeleted = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _questionsService.ListQuestionsAsync(grade, subjectId, difficulty, type, status, sourceType, search, includeDeleted, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetQuestionStatistics(CancellationToken ct = default)
    {
        var result = await _questionsService.GetQuestionStatisticsAsync(ct);
        return Ok(result);
    }

    [HttpGet("{questionId}")]
    public async Task<IActionResult> GetQuestionDetail(string questionId, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.GetQuestionDetailAsync(questionId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateQuestionRequestDto req, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.CreateQuestionAsync(req, CurrentUserId, IsContentStaffOrAdmin, ct);
            return StatusCode(201, result);
        }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPut("{questionId}")]
    [HttpPatch("{questionId}")]
    public async Task<IActionResult> UpdateQuestion(string questionId, [FromBody] UpdateQuestionRequestDto req, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.UpdateQuestionAsync(questionId, req, CurrentUserId, IsContentStaffOrAdmin, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpDelete("{questionId}")]
    public async Task<IActionResult> DeleteQuestion(string questionId, CancellationToken ct = default)
    {
        try
        {
            await _questionsService.DeleteQuestionAsync(questionId, CurrentUserId, IsContentStaffOrAdmin, ct);
            return Ok(new { success = true, message = "Đã chuyển câu hỏi vào thùng rác (xóa mềm) thành công." });
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }

    [HttpPost("{questionId}/restore")]
    public async Task<IActionResult> RestoreQuestion(string questionId, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.RestoreQuestionAsync(questionId, CurrentUserId, IsContentStaffOrAdmin, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("{questionId}/submit-review")]
    public async Task<IActionResult> SubmitQuestionReview(string questionId, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.SubmitQuestionReviewAsync(questionId, CurrentUserId, IsContentStaffOrAdmin, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }

    [HttpPost("{questionId}/approve")]
    public async Task<IActionResult> ApproveQuestion(string questionId, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.ApproveQuestionAsync(questionId, CurrentUserId, CanApprove, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }

    [HttpPost("{questionId}/reject")]
    public async Task<IActionResult> RejectQuestion(string questionId, [FromBody] RejectQuestionRequestDto? body = null, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.RejectQuestionAsync(questionId, body, CurrentUserId, IsAuthorizedReviewer, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }

    [HttpPost("{questionId}/request-changes")]
    public async Task<IActionResult> RequestChangesQuestion(string questionId, [FromBody] JsonObject? body = null, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.RequestChangesQuestionAsync(questionId, body, CurrentUserId, IsAuthorizedReviewer, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }

    [HttpPost("{questionId}/publish")]
    public async Task<IActionResult> PublishQuestion(string questionId, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.PublishQuestionAsync(questionId, CurrentUserId, CanPublish, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }

    [HttpPost("{questionId}/unpublish")]
    public async Task<IActionResult> UnpublishQuestion(string questionId, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.UnpublishQuestionAsync(questionId, CurrentUserId, CanPublish, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
    }

    [HttpPost("{questionId}/rollback")]
    public async Task<IActionResult> RollbackQuestion(string questionId, [FromBody] RollbackContentRequestDto? req = null, CancellationToken ct = default)
    {
        try
        {
            var result = await _questionsService.RollbackQuestionAsync(questionId, req, CurrentUserId, IsAuthorizedReviewer, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { detail = ex.Message }); }
    }

    [HttpPost("import")]
    public async Task<IActionResult> ImportQuestions([FromBody] QuestionImportBatchRequestDto req, CancellationToken ct = default)
    {
        var result = await _questionsService.ImportQuestionsAsync(req, CurrentUserId, ct);
        return Ok(result);
    }
}