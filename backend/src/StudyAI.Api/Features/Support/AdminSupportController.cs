using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Support;

[ApiController]
[Route("api/v1/admin/support/tickets")]
[Authorize(Policy = "AdminOnly")]
public class AdminSupportController : ControllerBase
{
    private readonly ISupportService _supportService;

    public AdminSupportController(ISupportService supportService)
    {
        _supportService = supportService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? "admin";

    [HttpGet]
    public async Task<IActionResult> ListTickets(
        [FromQuery] string? status = null,
        [FromQuery] string? category = null,
        [FromQuery] string? priority = null,
        [FromQuery] string? search = null,
        [FromQuery] string? assignedTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _supportService.ListAdminTicketsAsync(status, category, priority, search, assignedTo, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("{ticketId}")]
    public async Task<IActionResult> GetTicketDetail(string ticketId, CancellationToken ct = default)
    {
        var result = await _supportService.GetAdminTicketDetailAsync(ticketId, ct);
        return Ok(result);
    }

    [HttpPatch("{ticketId}")]
    public async Task<IActionResult> UpdateTicket(string ticketId, [FromBody] AdminUpdateSupportTicketRequestDto req, CancellationToken ct = default)
    {
        var result = await _supportService.UpdateTicketAdminAsync(ticketId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPost("{ticketId}/messages")]
    public async Task<IActionResult> ReplyTicket(string ticketId, [FromBody] ReplySupportTicketRequestDto req, CancellationToken ct = default)
    {
        var result = await _supportService.AddAdminMessageAsync(ticketId, CurrentUserId, CurrentUserRole, req, ct);
        return Ok(result);
    }
}
