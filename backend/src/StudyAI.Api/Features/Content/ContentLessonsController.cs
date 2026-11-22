using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Content.Lessons;

namespace StudyAI.Api.Features.Content;

[ApiController]
[Route("api/v1/content/lessons")]
[Authorize(Policy = "ContentAuthor")]
public class ContentLessonsController : ControllerBase
{
    private readonly IContentLessonsService _lessonsService;

    public ContentLessonsController(IContentLessonsService lessonsService)
    {
        _lessonsService = lessonsService;
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

    [HttpGet]
    public async Task<IActionResult> ListLessons(
        [FromQuery] string? chapterId = null,
        [FromQuery] string? topicId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] bool includeDeleted = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _lessonsService.ListLessonsAsync(chapterId, topicId, status, search, includeDeleted, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("{lessonId}")]
    public async Task<IActionResult> GetLessonDetail(string lessonId, CancellationToken ct = default)
    {
        try
        {
            var result = await _lessonsService.GetLessonDetailAsync(lessonId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPost]
    public async Task<IActionResult> CreateLesson([FromBody] CreateLessonRequestDto req, CancellationToken ct = default)
    {
        try
        {
            var result = await _lessonsService.CreateLessonAsync(req, CurrentUserId, ct);
            return StatusCode(201, result);
        }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPatch("{lessonId}")]
    public async Task<IActionResult> UpdateLesson(string lessonId, [FromBody] UpdateLessonRequestDto req, CancellationToken ct = default)
    {
        try
        {
            var result = await _lessonsService.UpdateLessonAsync(lessonId, req, CurrentUserId, IsContentStaffOrAdmin, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpDelete("{lessonId}")]
    public async Task<IActionResult> DeleteLesson(string lessonId, CancellationToken ct = default)
    {
        try
        {
            await _lessonsService.DeleteLessonAsync(lessonId, CurrentUserId, IsContentStaffOrAdmin, ct);
            return Ok(new { success = true, message = $"Đã xóa bài học '{lessonId}' thành công." });
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderLessons([FromBody] ReorderLessonsRequestDto req, CancellationToken ct = default)
    {
        try
        {
            await _lessonsService.ReorderLessonsAsync(req, CurrentUserId, ct);
            return Ok(new { success = true, message = $"Đã cập nhật thứ tự {req.LessonIds?.Count ?? 0} bài học thành công." });
        }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("{lessonId}/submit-review")]
    public async Task<IActionResult> SubmitReview(string lessonId, CancellationToken ct = default)
    {
        try
        {
            var result = await _lessonsService.SubmitReviewAsync(lessonId, CurrentUserId, IsContentStaffOrAdmin, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("{lessonId}/approve")]
    public async Task<IActionResult> ApproveLesson(string lessonId, CancellationToken ct = default)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền phê duyệt bài học." });
        }
        try
        {
            var result = await _lessonsService.ApproveLessonAsync(lessonId, CurrentUserId, IsAuthorizedReviewer, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("{lessonId}/publish")]
    public async Task<IActionResult> PublishLesson(string lessonId, CancellationToken ct = default)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền xuất bản bài học." });
        }
        try
        {
            var result = await _lessonsService.PublishLessonAsync(lessonId, CurrentUserId, IsAuthorizedReviewer, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("{lessonId}/unpublish")]
    public async Task<IActionResult> UnpublishLesson(string lessonId, CancellationToken ct = default)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền hủy xuất bản bài học." });
        }
        try
        {
            var result = await _lessonsService.UnpublishLessonAsync(lessonId, CurrentUserId, IsAuthorizedReviewer, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("{lessonId}/request-changes")]
    public async Task<IActionResult> RequestChanges(string lessonId, [FromBody] JsonObject? body = null, CancellationToken ct = default)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền yêu cầu chỉnh sửa bài học." });
        }
        try
        {
            var result = await _lessonsService.RequestChangesAsync(lessonId, body, CurrentUserId, IsAuthorizedReviewer, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("{lessonId}/reject")]
    public async Task<IActionResult> RejectLesson(string lessonId, [FromBody] JsonObject? body = null, CancellationToken ct = default)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền từ chối bài học." });
        }
        try
        {
            var result = await _lessonsService.RejectLessonAsync(lessonId, body, CurrentUserId, IsAuthorizedReviewer, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("{lessonId}/rollback")]
    public async Task<IActionResult> RollbackLesson(string lessonId, [FromBody] RollbackContentRequestDto? req = null, CancellationToken ct = default)
    {
        if (!IsAuthorizedReviewer)
        {
            return StatusCode(403, new { detail = "Chỉ Người kiểm duyệt nội dung (Content) hoặc Quản trị viên mới có quyền khôi phục/rollback bài học." });
        }
        try
        {
            var result = await _lessonsService.RollbackLessonAsync(lessonId, req, CurrentUserId, IsAuthorizedReviewer, ct);
            return Ok(result);
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
    }
}
