using System.Diagnostics;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
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
    private readonly IPasswordHasher _passwordHasher;

    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "teacher", "content", "support", "learner"
    };

    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "active", "suspended", "disabled"
    };

    public AdminController(StudyAIDbContext db, IConfiguration configuration, IPasswordHasher passwordHasher)
    {
        _db = db;
        _configuration = configuration;
        _passwordHasher = passwordHasher;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var sevenDaysAgo = DateTimeOffset.UtcNow.AddDays(-7);

        var totalUsers = await _db.Users.CountAsync(u => !u.IsDeleted);
        var activeUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "active");
        var suspendedUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "suspended");
        var disabledUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "disabled");
        var learnersCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "learner");
        var teachersCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "teacher");
        var contentCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "content");
        var supportCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "support");
        var adminsCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "admin");
        var recentNewUsersCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.CreatedAt >= sevenDaysAgo);

        var recentLogs = await _db.StaffAuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(15)
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
                Payload = log.Payload,
                Timestamp = log.CreatedAt.ToString("o")
            });
        }

        return Ok(new AdminDashboardDto
        {
            Metrics = new AdminMetricsDto
            {
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                SuspendedUsers = suspendedUsers,
                DisabledUsers = disabledUsers,
                LearnersCount = learnersCount,
                TeachersCount = teachersCount,
                ContentCount = contentCount,
                SupportCount = supportCount,
                AdminsCount = adminsCount,
                RecentNewUsersCount = recentNewUsersCount,
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
        [FromQuery] bool includeDeleted = false,
        [FromQuery] string? sortBy = "createdAt",
        [FromQuery] string? sortOrder = "desc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _db.Users.AsQueryable();

        if (!includeDeleted)
        {
            query = query.Where(u => !u.IsDeleted);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(s)) ||
                (u.Email != null && u.Email.ToLower().Contains(s)) ||
                (u.Grade != null && u.Grade.ToLower().Contains(s)) ||
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

        // Sorting
        query = (sortBy?.ToLower(), sortOrder?.ToLower()) switch
        {
            ("displayname", "asc") => query.OrderBy(u => u.DisplayName),
            ("displayname", "desc") => query.OrderByDescending(u => u.DisplayName),
            ("email", "asc") => query.OrderBy(u => u.Email),
            ("email", "desc") => query.OrderByDescending(u => u.Email),
            ("role", "asc") => query.OrderBy(u => u.Role),
            ("role", "desc") => query.OrderByDescending(u => u.Role),
            ("status", "asc") => query.OrderBy(u => u.Status),
            ("status", "desc") => query.OrderByDescending(u => u.Status),
            ("createdat", "asc") => query.OrderBy(u => u.CreatedAt),
            _ => query.OrderByDescending(u => u.CreatedAt)
        };

        var total = await query.CountAsync();
        var users = await query
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
    public async Task<IActionResult> GetUserDetail(string userId, [FromQuery] bool includeDeleted = false)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || (!includeDeleted && user.IsDeleted))
            return NotFound(new { detail = "Người dùng không tồn tại." });

        return Ok(FormatUser(user));
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
        {
            return BadRequest(new { detail = "Định dạng email không hợp lệ." });
        }

        if (string.IsNullOrWhiteSpace(req.DisplayName))
        {
            return BadRequest(new { detail = "Vui lòng nhập họ và tên hiển thị." });
        }

        var normalizedRole = string.IsNullOrWhiteSpace(req.Role) ? "learner" : req.Role.Trim().ToLowerInvariant();
        if (!AllowedRoles.Contains(normalizedRole))
        {
            return BadRequest(new { detail = $"Vai trò không hợp lệ. Cho phép: {string.Join(", ", AllowedRoles)}" });
        }

        var normalizedStatus = string.IsNullOrWhiteSpace(req.Status) ? "active" : req.Status.Trim().ToLowerInvariant();
        if (!AllowedStatuses.Contains(normalizedStatus))
        {
            return BadRequest(new { detail = $"Trạng thái không hợp lệ. Cho phép: {string.Join(", ", AllowedStatuses)}" });
        }

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var existing = await _db.Users.AnyAsync(u => u.EmailNormalized == normalizedEmail && !u.IsDeleted);
        if (existing)
        {
            return Conflict(new { detail = "Email đã được sử dụng." });
        }

        string rawPassword;
        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            if (req.Password.Trim().Length < 8 || req.Password.Length > 128)
            {
                return BadRequest(new { detail = "Mật khẩu phải chứa ít nhất 8 ký tự và không vượt quá 128 ký tự." });
            }
            rawPassword = req.Password.Trim();
        }
        else
        {
            rawPassword = GenerateSecurePassword();
        }

        var newUser = new User
        {
            Id = $"usr_{Guid.NewGuid():N}",
            Email = req.Email.Trim(),
            EmailNormalized = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(rawPassword),
            DisplayName = req.DisplayName.Trim(),
            Grade = req.Grade?.Trim(),
            Role = normalizedRole,
            Status = normalizedStatus,
            IsDeleted = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.Users.Add(newUser);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "user_created",
            TargetType = "user",
            TargetId = newUser.Id,
            Payload = JsonSerializer.Serialize(new
            {
                email = newUser.Email,
                role = newUser.Role,
                status = newUser.Status,
                displayName = newUser.DisplayName
            }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return StatusCode(201, new CreateUserResponseDto
        {
            User = FormatUser(newUser),
            TemporaryPassword = rawPassword,
            Message = "Người dùng đã được tạo thành công."
        });
    }

    [HttpPatch("users/{userId}")]
    public async Task<IActionResult> UpdateUser(string userId, [FromBody] UpdateUserRequestDto req)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
            return NotFound(new { detail = "Người dùng không tồn tại." });

        var previousSnapshot = new
        {
            displayName = user.DisplayName,
            grade = user.Grade,
            role = user.Role,
            status = user.Status
        };

        if (req.DisplayName != null)
        {
            if (string.IsNullOrWhiteSpace(req.DisplayName))
            {
                return BadRequest(new { detail = "Tên hiển thị không được để trống." });
            }
            user.DisplayName = req.DisplayName.Trim();
        }

        if (req.Grade != null)
        {
            user.Grade = req.Grade.Trim();
        }

        if (!string.IsNullOrWhiteSpace(req.Role) && !string.Equals(req.Role, user.Role, StringComparison.OrdinalIgnoreCase))
        {
            var newRole = req.Role.Trim().ToLowerInvariant();
            if (!AllowedRoles.Contains(newRole))
            {
                return BadRequest(new { detail = $"Vai trò không hợp lệ. Cho phép: {string.Join(", ", AllowedRoles)}" });
            }

            // Last active admin protection
            if (user.Role == "admin" && newRole != "admin")
            {
                var activeAdmins = await _db.Users.CountAsync(u => u.Role == "admin" && u.Status == "active" && !u.IsDeleted);
                if (activeAdmins <= 1)
                {
                    return BadRequest(new { detail = "Không thể hủy quyền quản trị viên hoạt động duy nhất của hệ thống." });
                }
            }

            user.Role = newRole;
        }

        if (!string.IsNullOrWhiteSpace(req.Status) && !string.Equals(req.Status, user.Status, StringComparison.OrdinalIgnoreCase))
        {
            var newStatus = req.Status.Trim().ToLowerInvariant();
            if (!AllowedStatuses.Contains(newStatus))
            {
                return BadRequest(new { detail = $"Trạng thái không hợp lệ. Cho phép: {string.Join(", ", AllowedStatuses)}" });
            }

            // Last active admin protection
            if (user.Role == "admin" && newStatus is "suspended" or "disabled")
            {
                var activeAdmins = await _db.Users.CountAsync(u => u.Role == "admin" && u.Status == "active" && !u.IsDeleted);
                if (activeAdmins <= 1)
                {
                    return BadRequest(new { detail = "Không thể tạm khóa hoặc vô hiệu hóa quản trị viên hoạt động duy nhất của hệ thống." });
                }
            }

            user.Status = newStatus;

            if (newStatus is "suspended" or "disabled")
            {
                var sessions = await _db.RefreshSessions.Where(s => s.UserId == user.Id).ToListAsync();
                _db.RefreshSessions.RemoveRange(sessions);
            }
        }

        user.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "user_updated",
            TargetType = "user",
            TargetId = user.Id,
            Payload = JsonSerializer.Serialize(new
            {
                previous = previousSnapshot,
                updated = new
                {
                    displayName = user.DisplayName,
                    grade = user.Grade,
                    role = user.Role,
                    status = user.Status
                }
            }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatUser(user));
    }

    [HttpPatch("users/{userId}/role")]
    public async Task<IActionResult> UpdateUserRole(string userId, [FromBody] UpdateRoleRequestDto req)
    {
        var normalizedRole = req.Role?.Trim().ToLowerInvariant() ?? "";
        if (!AllowedRoles.Contains(normalizedRole))
        {
            return BadRequest(new { detail = $"Vai trò không hợp lệ. Cho phép: {string.Join(", ", AllowedRoles)}" });
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
            return NotFound(new { detail = "Người dùng không tồn tại." });

        var oldRole = user.Role;
        if (oldRole == normalizedRole)
            return Ok(FormatUser(user));

        // Last active admin protection
        if (oldRole == "admin" && normalizedRole != "admin")
        {
            var activeAdmins = await _db.Users.CountAsync(u => u.Role == "admin" && u.Status == "active" && !u.IsDeleted);
            if (activeAdmins <= 1)
            {
                return BadRequest(new { detail = "Không thể hủy quyền quản trị viên hoạt động duy nhất của hệ thống." });
            }
        }

        user.Role = normalizedRole;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "role_changed",
            TargetType = "user",
            TargetId = user.Id,
            Payload = JsonSerializer.Serialize(new { old_role = oldRole, new_role = normalizedRole }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatUser(user));
    }

    [HttpPatch("users/{userId}/status")]
    public async Task<IActionResult> UpdateUserStatus(string userId, [FromBody] UpdateStatusRequestDto req)
    {
        var normalizedStatus = req.Status?.Trim().ToLowerInvariant() ?? "";
        if (!AllowedStatuses.Contains(normalizedStatus))
        {
            return BadRequest(new { detail = $"Trạng thái không hợp lệ. Cho phép: {string.Join(", ", AllowedStatuses)}" });
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
            return NotFound(new { detail = "Người dùng không tồn tại." });

        var oldStatus = user.Status;
        if (oldStatus == normalizedStatus)
            return Ok(FormatUser(user));

        // Last active admin protection
        if (user.Role == "admin" && normalizedStatus is "suspended" or "disabled")
        {
            var activeAdmins = await _db.Users.CountAsync(u => u.Role == "admin" && u.Status == "active" && !u.IsDeleted);
            if (activeAdmins <= 1)
            {
                return BadRequest(new { detail = "Không thể tạm khóa hoặc vô hiệu hóa quản trị viên hoạt động duy nhất của hệ thống." });
            }
        }

        user.Status = normalizedStatus;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        if (normalizedStatus is "suspended" or "disabled")
        {
            var sessions = await _db.RefreshSessions.Where(s => s.UserId == user.Id).ToListAsync();
            _db.RefreshSessions.RemoveRange(sessions);
        }

        var actionName = normalizedStatus is "suspended" or "disabled" ? "user_suspended" : "user_activated";
        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = actionName,
            TargetType = "user",
            TargetId = user.Id,
            Payload = JsonSerializer.Serialize(new { old_status = oldStatus, new_status = normalizedStatus }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(FormatUser(user));
    }

    [HttpPost("users/{userId}/revoke-sessions")]
    public async Task<IActionResult> RevokeUserSessions(string userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
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

    [HttpPost("users/{userId}/reset-password")]
    public async Task<IActionResult> ResetUserPassword(string userId, [FromBody] ResetPasswordRequestDto? req)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
            return NotFound(new { detail = "Người dùng không tồn tại." });

        string rawPassword;
        if (!string.IsNullOrWhiteSpace(req?.NewPassword))
        {
            if (req.NewPassword.Trim().Length < 8 || req.NewPassword.Length > 128)
            {
                return BadRequest(new { detail = "Mật khẩu mới phải chứa ít nhất 8 ký tự và không vượt quá 128 ký tự." });
            }
            rawPassword = req.NewPassword.Trim();
        }
        else
        {
            rawPassword = GenerateSecurePassword();
        }

        user.PasswordHash = _passwordHasher.HashPassword(rawPassword);
        user.UpdatedAt = DateTimeOffset.UtcNow;

        // Revoke all existing sessions for safety
        var sessions = await _db.RefreshSessions.Where(s => s.UserId == userId).ToListAsync();
        _db.RefreshSessions.RemoveRange(sessions);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "password_reset_by_admin",
            TargetType = "user",
            TargetId = user.Id,
            Payload = JsonSerializer.Serialize(new { email = user.Email }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new ResetPasswordResponseDto
        {
            Success = true,
            UserId = user.Id,
            TemporaryPassword = rawPassword,
            Message = "Mật khẩu đã được đặt lại thành công. Tất cả phiên đăng nhập cũ đã được thu hồi."
        });
    }

    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(string userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
            return NotFound(new { detail = "Người dùng không tồn tại hoặc đã bị xóa." });

        // Last active admin protection
        if (user.Role == "admin" && user.Status == "active")
        {
            var activeAdmins = await _db.Users.CountAsync(u => u.Role == "admin" && u.Status == "active" && !u.IsDeleted);
            if (activeAdmins <= 1)
            {
                return BadRequest(new { detail = "Không thể xóa quản trị viên hoạt động duy nhất của hệ thống." });
            }
        }

        // Soft delete: keep learning history (AssessmentAttempts, LessonProgresses, LearningEvents, StaffAuditLogs)
        user.IsDeleted = true;
        user.DeletedAt = DateTimeOffset.UtcNow;
        user.Status = "disabled";
        user.UpdatedAt = DateTimeOffset.UtcNow;

        // Revoke all sessions
        var sessions = await _db.RefreshSessions.Where(s => s.UserId == userId).ToListAsync();
        _db.RefreshSessions.RemoveRange(sessions);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "user_soft_deleted",
            TargetType = "user",
            TargetId = user.Id,
            Payload = JsonSerializer.Serialize(new { email = user.Email, role = user.Role }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            userId = user.Id,
            message = "Đã xóa mềm người dùng thành công. Lịch sử học tập được bảo lưu toàn vẹn."
        });
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? action = null,
        [FromQuery] string? targetId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _db.StaffAuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(l => l.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(targetId))
        {
            query = query.Where(l => l.TargetId == targetId);
        }

        var total = await query.CountAsync();
        var logs = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<AdminActivityDto>();
        foreach (var log in logs)
        {
            var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == log.ActorUserId);
            items.Add(new AdminActivityDto
            {
                Id = log.Id,
                Action = log.Action,
                Actor = actor?.DisplayName ?? log.ActorUserId,
                TargetType = log.TargetType,
                TargetId = log.TargetId,
                Payload = log.Payload,
                Timestamp = log.CreatedAt.ToString("o")
            });
        }

        return Ok(new AdminAuditLogsResponseDto
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            Total = total
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
            IsDeleted = u.IsDeleted,
            DeletedAt = u.DeletedAt.HasValue ? u.DeletedAt.Value.ToString("o") : null,
            CreatedAt = u.CreatedAt.ToString("o"),
            LastLoginAt = u.LastLoginAt.HasValue ? u.LastLoginAt.Value.ToString("o") : null
        };
    }

    private static string GenerateSecurePassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        const string special = "!@#$%^&*";

        var chars = new char[12];
        chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        chars[3] = special[RandomNumberGenerator.GetInt32(special.Length)];

        const string all = upper + lower + digits + special;
        for (int i = 4; i < chars.Length; i++)
        {
            chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];
        }

        // Shuffle
        RandomNumberGenerator.Shuffle(chars.AsSpan());
        return new string(chars);
    }
}
