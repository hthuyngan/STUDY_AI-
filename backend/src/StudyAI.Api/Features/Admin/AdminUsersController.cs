using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Admin;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUsersService _usersService;

    public AdminUsersController(IAdminUsersService usersService)
    {
        _usersService = usersService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers(
        [FromQuery] string? role = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool includeDeleted = false,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null,
        CancellationToken ct = default)
    {
        var result = await _usersService.ListUsersAsync(role, status, search, page, pageSize, includeDeleted, sortBy, sortOrder, ct);
        return Ok(result);
    }

    [HttpGet("users/{userId}")]
    public async Task<IActionResult> GetUserDetail(string userId, [FromQuery] bool includeDeleted = false, CancellationToken ct = default)
    {
        var result = await _usersService.GetUserDetailAsync(userId, includeDeleted, ct);
        return Ok(result);
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequestDto req, CancellationToken ct = default)
    {
        var result = await _usersService.CreateUserAsync(req, CurrentUserId, ct);
        return StatusCode(201, result);
    }

    [HttpPatch("users/{userId}")]
    [HttpPut("users/{userId}")]
    public async Task<IActionResult> UpdateUser(string userId, [FromBody] UpdateUserRequestDto req, CancellationToken ct = default)
    {
        var result = await _usersService.UpdateUserAsync(userId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPatch("users/{userId}/role")]
    public async Task<IActionResult> UpdateUserRole(string userId, [FromBody] UpdateRoleRequestDto req, CancellationToken ct = default)
    {
        var result = await _usersService.UpdateUserRoleAsync(userId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPatch("users/{userId}/status")]
    public async Task<IActionResult> UpdateUserStatus(string userId, [FromBody] UpdateStatusRequestDto req, CancellationToken ct = default)
    {
        var result = await _usersService.UpdateUserStatusAsync(userId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPost("users/{userId}/revoke-sessions")]
    public async Task<IActionResult> RevokeUserSessions(string userId, CancellationToken ct = default)
    {
        var revokedCount = await _usersService.RevokeUserSessionsAsync(userId, CurrentUserId, ct);
        return Ok(new
        {
            userId,
            revokedSessionsCount = revokedCount,
            message = "Đã thu hồi tất cả phiên làm việc đang hoạt động của người dùng."
        });
    }

    [HttpPost("users/{userId}/reset-password")]
    public async Task<IActionResult> ResetUserPassword(string userId, [FromBody] ResetPasswordRequestDto? req, CancellationToken ct = default)
    {
        var result = await _usersService.ResetUserPasswordAsync(userId, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(string userId, CancellationToken ct = default)
    {
        await _usersService.DeleteUserAsync(userId, CurrentUserId, ct);
        return Ok(new { message = $"Đã xóa người dùng '{userId}' thành công." });
    }

    [HttpGet("roles")]
    public IActionResult GetRoles()
    {
        return Ok(_usersService.GetRoles());
    }
}