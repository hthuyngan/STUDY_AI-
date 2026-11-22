using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Admin.Announcements;

namespace StudyAI.Api.Features.Admin;

[ApiController]
[Route("api/v1/admin/announcements")]
[Authorize(Policy = "AdminOnly")]
public class AdminAnnouncementsController : ControllerBase
{
    private readonly IAdminAnnouncementsService _announcementsService;

    public AdminAnnouncementsController(IAdminAnnouncementsService announcementsService)
    {
        _announcementsService = announcementsService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    [HttpGet]
    public async Task<IActionResult> GetAnnouncements(
        [FromQuery] string status = "all",
        [FromQuery] string audience = "all",
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await _announcementsService.GetAnnouncementsAsync(status, audience, search, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAnnouncement([FromBody] SaveAnnouncementRequestDto req, CancellationToken ct = default)
    {
        var result = await _announcementsService.CreateAnnouncementAsync(req, CurrentUserId, ct);
        return StatusCode(201, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAnnouncement(string id, [FromBody] SaveAnnouncementRequestDto req, CancellationToken ct = default)
    {
        var result = await _announcementsService.UpdateAnnouncementAsync(id, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAnnouncement(string id, CancellationToken ct = default)
    {
        await _announcementsService.DeleteAnnouncementAsync(id, CurrentUserId, ct);
        return Ok(new { message = "Đã xóa thông báo thành công." });
    }
}
