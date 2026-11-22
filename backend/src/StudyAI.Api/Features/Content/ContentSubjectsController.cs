using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Content.Subjects;

namespace StudyAI.Api.Features.Content;

[ApiController]
[Route("api/v1/content/subjects")]
[Authorize(Policy = "ContentAuthor")]
public class ContentSubjectsController : ControllerBase
{
    private readonly IContentSubjectsService _subjectsService;

    public ContentSubjectsController(IContentSubjectsService subjectsService)
    {
        _subjectsService = subjectsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "staff";

    [HttpGet]
    public async Task<IActionResult> ListSubjects(
        [FromQuery] string? search = null,
        [FromQuery] string? grade = null,
        [FromQuery] bool? isActive = null,
        CancellationToken ct = default)
    {
        var result = await _subjectsService.ListSubjectsAsync(search, grade, isActive, ct);
        return Ok(result);
    }

    [HttpGet("{subjectId}")]
    public async Task<IActionResult> GetSubjectDetail(string subjectId, CancellationToken ct = default)
    {
        var result = await _subjectsService.GetSubjectDetailAsync(subjectId, ct);
        return Ok(result);
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost]
    public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectRequestDto req, CancellationToken ct = default)
    {
        var result = await _subjectsService.CreateSubjectAsync(req, CurrentUserId, ct);
        return StatusCode(201, result);
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPut("{subjectId}")]
    [HttpPatch("{subjectId}")]
    public async Task<IActionResult> UpdateSubject(string subjectId, [FromBody] UpdateSubjectRequestDto req, CancellationToken ct = default)
    {
        var result = await _subjectsService.UpdateSubjectAsync(subjectId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpDelete("{subjectId}")]
    public async Task<IActionResult> DeleteSubject(string subjectId, CancellationToken ct = default)
    {
        await _subjectsService.DeleteSubjectAsync(subjectId, CurrentUserId, ct);
        return Ok(new { success = true, message = $"Đã xóa môn học '{subjectId}' thành công." });
    }
}
