using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Content.Assessments;

namespace StudyAI.Api.Features.Content;

[ApiController]
[Route("api/v1/content/assessments")]
[Authorize(Policy = "ContentAuthor")]
public class ContentAssessmentsController : ControllerBase
{
    private readonly IContentAssessmentsService _assessmentsService;

    public ContentAssessmentsController(IContentAssessmentsService assessmentsService)
    {
        _assessmentsService = assessmentsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "staff";

    private bool IsAdminOrContentAdmin => User.IsInRole("admin") || User.IsInRole("content_admin");
    private bool IsContentStaffOrAdmin => IsAdminOrContentAdmin || User.IsInRole("content");

    [HttpGet]
    public async Task<IActionResult> ListAssessments(
        [FromQuery] string? lessonId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await _assessmentsService.ListAssessmentsAsync(lessonId, status, search, ct);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAssessmentDetail(string id, CancellationToken ct = default)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được quản lý bài đánh giá." });

        var result = await _assessmentsService.GetAssessmentDetailAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAssessment([FromBody] CreateAssessmentRequestDto req, CancellationToken ct = default)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được tạo bài đánh giá." });

        var result = await _assessmentsService.CreateAssessmentAsync(req, CurrentUserId, ct);
        return StatusCode(201, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAssessment(string id, [FromBody] UpdateAssessmentRequestDto req, CancellationToken ct = default)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được cập nhật bài đánh giá." });

        var result = await _assessmentsService.UpdateAssessmentAsync(id, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAssessment(string id, CancellationToken ct = default)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được lưu trữ bài đánh giá." });

        await _assessmentsService.DeleteAssessmentAsync(id, CurrentUserId, ct);
        return Ok(new { success = true, detail = "Đã lưu trữ bài đánh giá thành công." });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateAssessmentStatus(string id, [FromBody] JsonObject body, CancellationToken ct = default)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được đổi trạng thái bài đánh giá." });

        var result = await _assessmentsService.UpdateAssessmentStatusAsync(id, body, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPost("{id}/questions")]
    public async Task<IActionResult> AddAssessmentQuestion(string id, [FromBody] AddAssessmentQuestionRequestDto req, CancellationToken ct = default)
    {
        if (!IsContentStaffOrAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Chỉ Content staff hoặc quản trị viên được thêm câu hỏi." });

        var result = await _assessmentsService.AddAssessmentQuestionAsync(id, req, CurrentUserId, ct);
        return StatusCode(201, result);
    }
}
