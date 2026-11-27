using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Support;

[ApiController]
[Route("api/v1/support/tickets")]
[Authorize]
public class SupportTicketsController : ControllerBase
{
    private readonly ISupportService _supportService;

    public SupportTicketsController(ISupportService supportService)
    {
        _supportService = supportService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    [HttpGet]
    public async Task<IActionResult> ListMyTickets(
        [FromQuery] string? status = null,
        [FromQuery] string? category = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _supportService.ListUserTicketsAsync(CurrentUserId, status, category, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("{ticketId}")]
    public async Task<IActionResult> GetMyTicketDetail(string ticketId, CancellationToken ct = default)
    {
        var result = await _supportService.GetUserTicketDetailAsync(ticketId, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTicket([FromBody] CreateSupportTicketRequestDto req, CancellationToken ct = default)
    {
        var result = await _supportService.CreateTicketAsync(CurrentUserId, req, ct);
        return StatusCode(201, result);
    }

    [HttpPost("{ticketId}/messages")]
    public async Task<IActionResult> ReplyTicket(string ticketId, [FromBody] ReplySupportTicketRequestDto req, CancellationToken ct = default)
    {
        var result = await _supportService.AddUserMessageAsync(ticketId, CurrentUserId, req, ct);
        return Ok(result);
    }
}
