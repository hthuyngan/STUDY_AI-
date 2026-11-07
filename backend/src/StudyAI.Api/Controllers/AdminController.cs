using System.Diagnostics;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Api.Controllers;

[Authorize(Roles = "admin")]
[ApiController]
[Route("api/v1/admin")]
public class AdminController : ControllerBase
{
    private readonly StudyAIDbContext _db;
    private readonly IConfiguration _configuration;

    public AdminController(StudyAIDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var totalUsers = await _db.Users.CountAsync();
        var activeUsers = await _db.Users.CountAsync(u => u.Status == "active");
        var learnersCount = await _db.Users.CountAsync(u => u.Role == "learner");
        var staffCount = await _db.Users.CountAsync(u => u.Role != "learner");

        var recentLogs = await _db.StaffAuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(10)
            .ToListAsync();

        var activities = new List<AdminActivityDto>();
        foreach (var log in recentLogs)
        {
            var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == log.ActorUserId);
            activities.Add(new AdminActivityDto
            {
                Id = log.Id,
                Action = log.Action,
                Actor = actor?.DisplayName ?? log.ActorUserId,
                TargetType = log.TargetType,
                TargetId = log.TargetId,
                Timestamp = log.CreatedAt.ToString("o")
            });
        }

        return Ok(new AdminDashboardDto
        {
            Metrics = new AdminMetricsDto
            {
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                LearnersCount = learnersCount,
                StaffCount = staffCount,
                SystemStatus = "healthy"
            },
            RecentActivities = activities
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers(
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(s)) ||
                (u.Email != null && u.Email.ToLower().Contains(s)) ||
                u.Id.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(role) && role != "all")
        {
            query = query.Where(u => u.Role == role);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(u => u.Status == status);
        }

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new AdminUsersResponseDto
        {
            Items = users.Select(FormatUser).ToList(),
            Page = page,
            PageSize = pageSize,
            Total = total
        });
    }

    [HttpGet("users/{userId}")]
    public async Task<IActionResult> GetUserDetail(string userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { detail = "Người dùng không tồn tại." });

        return Ok(FormatUser(user));
    }

    [HttpPatch("users/{userId}/role")]
    public async Task<IActionResult> UpdateUserRole(string userId, [FromBody] UpdateRoleRequestDto req)
    {
        var allowedRoles = new HashSet<string> { "admin", "teacher", "content", "support", "learner" };
        if (!allowedRoles.Contains(req.Role))
        {
            return BadRequest(new { detail = $"Vai trò không hợp lệ. Cho phép: {string.Join(", ", allowedRoles)}" });
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { detail = "Người dùng không tồn tại." });

        var oldRole = user.Role;
        if (oldRole == req.Role)
            return Ok(FormatUser(user));

        // Last active admin protection
        if (oldRole == "admin" && req.Role != "admin")
        {
            var activeAdmins = await _db.Users.CountAsync(u => u.Role == "admin" && u.Status == "active");
            if (activeAdmins <= 1)
            {
                return BadRequest(new { detail = "Không thể hủy quyền quản trị viên hoạt động duy nhất của hệ thống." });
            }
        }

        user.Role = req.Role;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "role_changed",
            TargetType = "user",
            TargetId = user.Id,
            Payload = JsonSerializer.Serialize(new { old_role = oldRole, new_role = req.Role }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatUser(user));
    }

    [HttpPatch("users/{userId}/status")]
    public async Task<IActionResult> UpdateUserStatus(string userId, [FromBody] UpdateStatusRequestDto req)
    {
        var allowedStatuses = new HashSet<string> { "active", "suspended", "disabled" };
        if (!allowedStatuses.Contains(req.Status))
        {
            return BadRequest(new { detail = $"Trạng thái không hợp lệ. Cho phép: {string.Join(", ", allowedStatuses)}" });
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { detail = "Người dùng không tồn tại." });

        var oldStatus = user.Status;
        if (oldStatus == req.Status)
            return Ok(FormatUser(user));

        // Last active admin protection
        if (user.Role == "admin" && req.Status is "suspended" or "disabled")
        {
            var activeAdmins = await _db.Users.CountAsync(u => u.Role == "admin" && u.Status == "active");
            if (activeAdmins <= 1)
            {
                return BadRequest(new { detail = "Không thể tạm khóa hoặc vô hiệu hóa quản trị viên hoạt động duy nhất của hệ thống." });
            }
        }

        user.Status = req.Status;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        if (req.Status is "suspended" or "disabled")
        {
            var sessions = await _db.RefreshSessions.Where(s => s.UserId == user.Id).ToListAsync();
            _db.RefreshSessions.RemoveRange(sessions);
        }

        var actionName = req.Status is "suspended" or "disabled" ? "user_suspended" : "user_activated";
        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = actionName,
            TargetType = "user",
            TargetId = user.Id,
            Payload = JsonSerializer.Serialize(new { old_status = oldStatus, new_status = req.Status }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatUser(user));
    }

    [HttpPost("users/{userId}/revoke-sessions")]
    public async Task<IActionResult> RevokeUserSessions(string userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { detail = "Người dùng không tồn tại." });

        var sessions = await _db.RefreshSessions.Where(s => s.UserId == userId).ToListAsync();
        int deletedCount = sessions.Count;
        _db.RefreshSessions.RemoveRange(sessions);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "sessions_revoked",
            TargetType = "user",
            TargetId = user.Id,
            Payload = JsonSerializer.Serialize(new { revoked_count = deletedCount }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            userId,
            revokedSessionsCount = deletedCount,
            message = $"Đã thu hồi {deletedCount} phiên đăng nhập của người dùng."
        });
    }

    [HttpGet("system/health")]
    public async Task<IActionResult> GetSystemHealth()
    {
        var sw = Stopwatch.StartNew();
        bool dbConnected = false;
        try
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT 1");
            dbConnected = true;
            sw.Stop();
        }
        catch
        {
            sw.Stop();
        }

        return Ok(new
        {
            apiStatus = "operational",
            database = new
            {
                status = dbConnected ? "connected" : "disconnected",
                latencyMs = dbConnected ? Math.Round(sw.Elapsed.TotalMilliseconds, 2) : -1
            },
            environment = _configuration["APP_ENV"] ?? "development",
            backendVersion = "1.0.0",
            checkedAt = DateTimeOffset.UtcNow.ToString("o")
        });
    }

    private static AdminUserDto FormatUser(User u)
    {
        return new AdminUserDto
        {
            Id = u.Id,
            Email = u.Email ?? "",
            DisplayName = u.DisplayName ?? "",
            Grade = u.Grade ?? "",
            Role = u.Role ?? "learner",
            Status = u.Status ?? "active",
            CreatedAt = u.CreatedAt.ToString("o"),
            LastLoginAt = u.LastLoginAt.HasValue ? u.LastLoginAt.Value.ToString("o") : null
        };
    }
}
