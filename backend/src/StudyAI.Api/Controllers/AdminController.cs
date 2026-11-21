using System.Diagnostics;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
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
        "admin", "teacher", "content", "learner"
    };

    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "active", "suspended", "disabled"
    };

    private static bool TryMapTeacherStatus(string rawStatus, out string userStatus)
    {
        userStatus = rawStatus.Trim().ToLowerInvariant() switch
        {
            "active" => "active",
            "inactive" => "disabled",
            "pending" => "suspended",
            "suspended" => "suspended",
            "disabled" => "disabled",
            _ => string.Empty
        };
        return !string.IsNullOrEmpty(userStatus);
    }

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
        var supportCount = 0;
        var adminsCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "admin");
        var recentNewUsersCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.CreatedAt >= sevenDaysAgo);
        var completedLessonsTotal = await _db.LessonProgresses.CountAsync(lp => lp.OverallProgress >= 100);

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

        var attentionItems = new List<AdminAttentionItemDto>();
        var suspendedList = await _db.Users
            .Where(u => !u.IsDeleted && (u.Status == "suspended" || u.Status == "disabled"))
            .Take(5)
            .ToListAsync();
        foreach (var sUser in suspendedList)
        {
            attentionItems.Add(new AdminAttentionItemDto
            {
                Id = $"att_user_{sUser.Id}",
                Title = $"Tài khoản {sUser.DisplayName ?? sUser.Email} đang bị {(sUser.Status == "suspended" ? "tạm khóa" : "vô hiệu hóa")}",
                Description = $"Trạng thái tài khoản: {sUser.Status}, vai trò: {sUser.Role}. Cần quản trị viên kiểm tra và xử lý.",
                Severity = "warning",
                Timestamp = sUser.UpdatedAt.ToString("o"),
                ActionUrl = $"/admin/users/{sUser.Id}"
            });
        }

        var pendingLessons = await _db.ContentLessons
            .Where(l => l.Status == "in_review" || l.Status == "draft")
            .Take(5)
            .ToListAsync();
        foreach (var pLesson in pendingLessons)
        {
            attentionItems.Add(new AdminAttentionItemDto
            {
                Id = $"att_les_{pLesson.Id}",
                Title = $"Bài học '{pLesson.Title}' đang ở trạng thái {pLesson.Status}",
                Description = "Học liệu cần kiểm duyệt chuyên môn trước khi xuất bản chính thức.",
                Severity = "info",
                Timestamp = pLesson.UpdatedAt.ToString("o"),
                ActionUrl = "/content/review"
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
                CompletedLessonsTotal = completedLessonsTotal,
                StaffAccounts = totalUsers - learnersCount,
                SystemStatus = "healthy"
            },
            RecentActivities = activities,
            AttentionItems = attentionItems
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
            var raw = status.Trim().ToLowerInvariant();
            if (raw == "inactive")
            {
                query = query.Where(u => u.Status == "disabled");
            }
            else if (raw == "pending")
            {
                query = query.Where(u => u.Status == "suspended" || u.Status == "pending");
            }
            else if (raw == "active")
            {
                query = query.Where(u => u.Status == "active");
            }
            else if (TryMapTeacherStatus(raw, out var mappedStatus))
            {
                query = query.Where(u => u.Status == mappedStatus);
            }
            else
            {
                query = query.Where(u => u.Status == status);
            }
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

    private static double? GetNormalizedScore(AssessmentAttempt attempt)
    {
        if (attempt.ScoreScaled.HasValue)
        {
            var scaled = attempt.ScoreScaled.Value;
            if (scaled <= 1.0 && attempt.ScoreMax <= 1.0)
            {
                return Math.Round(scaled * 10.0, 2);
            }
            return Math.Round(scaled, 2);
        }

        if (attempt.ScoreRaw.HasValue)
        {
            var raw = attempt.ScoreRaw.Value;
            var max = attempt.ScoreMax > 0 ? attempt.ScoreMax : 10.0;
            return Math.Round((raw / max) * 10.0, 2);
        }

        return null;
    }

    [HttpGet("users/{userId}")]
    public async Task<IActionResult> GetUserDetail(string userId, [FromQuery] bool includeDeleted = false)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || (!includeDeleted && user.IsDeleted))
            return NotFound(new { detail = "Người dùng không tồn tại." });

        var baseDto = FormatUser(user);
        var userProgresses = await _db.LessonProgresses.Where(lp => lp.UserId == userId).ToListAsync();
        var completedCount = userProgresses.Count(lp => lp.OverallProgress >= 100);
        var attempts = await _db.AssessmentAttempts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartedAt)
            .Take(10)
            .ToListAsync();

        double avgScore = 0;
        var completedWithScores = attempts.Where(a => a.CompletedAt.HasValue && (a.ScoreScaled.HasValue || a.ScoreRaw.HasValue)).ToList();
        if (completedWithScores.Count > 0)
        {
            var normalizedList = completedWithScores
                .Select(GetNormalizedScore)
                .Where(s => s.HasValue)
                .Select(s => s!.Value)
                .ToList();

            if (normalizedList.Count > 0)
            {
                avgScore = Math.Round(normalizedList.Average(), 1);
            }
        }

        var assessments = attempts.Select(a => new UserAssessmentDto
        {
            Id = a.Id,
            Title = a.AssessmentId ?? "Bài thu hoạch",
            SubjectName = !string.IsNullOrWhiteSpace(a.SubjectId)
                ? (a.SubjectId == "sub_math10" ? "Toán học 10" : a.SubjectId == "sub_math11" ? "Toán học 11" : a.SubjectId == "sub_math12" ? "Toán học 12" : a.SubjectId)
                : "Toán học",
            Score = GetNormalizedScore(a),
            MaxScore = 10.0,
            Status = a.CompletedAt.HasValue ? "completed" : "in_progress",
            CompletedAt = a.CompletedAt.HasValue ? a.CompletedAt.Value.ToString("o") : a.StartedAt.ToString("o")
        }).ToList();

        var logs = await _db.StaffAuditLogs
            .Where(l => l.TargetId == userId || l.ActorUserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(20)
            .ToListAsync();

        var activities = logs.Select(l => new AdminActivityDto
        {
            Id = l.Id,
            Action = l.Action,
            Actor = l.ActorUserId,
            TargetType = l.TargetType,
            TargetId = l.TargetId,
            Payload = l.Payload,
            Timestamp = l.CreatedAt.ToString("o")
        }).ToList();

        int streakDays = 0;
        var recentSubjects = new List<UserRecentSubjectDto>();

        if (user.Role == "learner")
        {
            var activeDates = new HashSet<DateTime>();
            foreach (var p in userProgresses)
            {
                activeDates.Add(p.UpdatedAt.UtcDateTime.Date);
            }
            foreach (var a in attempts)
            {
                if (a.CompletedAt.HasValue) activeDates.Add(a.CompletedAt.Value.UtcDateTime.Date);
                else activeDates.Add(a.StartedAt.UtcDateTime.Date);
            }
            var recentEventTimestamps = await _db.LearningEvents
                .Where(e => e.UserId == userId)
                .OrderByDescending(e => e.Timestamp)
                .Select(e => e.Timestamp)
                .Take(50)
                .ToListAsync();
            foreach (var t in recentEventTimestamps)
            {
                activeDates.Add(t.UtcDateTime.Date);
            }

            var today = DateTimeOffset.UtcNow.UtcDateTime.Date;
            var checkDate = activeDates.Contains(today) ? today : today.AddDays(-1);
            while (activeDates.Contains(checkDate))
            {
                streakDays++;
                checkDate = checkDate.AddDays(-1);
            }

            var userSubjectIds = userProgresses
                .Where(lp => !string.IsNullOrWhiteSpace(lp.SubjectId))
                .Select(lp => lp.SubjectId!)
                .Distinct()
                .ToList();

            var contentSubjects = await _db.ContentSubjects.ToListAsync();
            foreach (var sId in userSubjectIds)
            {
                var subj = contentSubjects.FirstOrDefault(s => s.Id == sId);
                var subjName = subj?.Name ?? (sId == "sub_math10" ? "Toán học 10" : sId == "sub_math11" ? "Toán học 11" : sId == "sub_math12" ? "Toán học 12" : sId);

                var totalSubjLessons = await _db.ContentLessons.CountAsync(l => l.Chapter!.SubjectId == sId && l.Status == "published");
                var completedInSubj = userProgresses.Count(lp => lp.SubjectId == sId && lp.OverallProgress >= 100);
                double progress = totalSubjLessons > 0
                    ? Math.Min(100.0, Math.Round((double)completedInSubj * 100.0 / totalSubjLessons, 1))
                    : (completedInSubj > 0 ? 100.0 : 0.0);

                var lastStudiedDate = userProgresses
                    .Where(lp => lp.SubjectId == sId)
                    .Max(lp => lp.UpdatedAt);

                recentSubjects.Add(new UserRecentSubjectDto
                {
                    Name = subjName,
                    Progress = progress,
                    LastStudied = lastStudiedDate.ToString("o")
                });
            }
        }

        var totalLessonsPublished = await _db.ContentLessons.CountAsync(l => l.Status == "published");
        var detailDto = new AdminUserDetailDto
        {
            Id = baseDto.Id,
            Email = baseDto.Email,
            DisplayName = baseDto.DisplayName,
            Grade = baseDto.Grade,
            Role = baseDto.Role,
            Status = baseDto.Status,
            IsDeleted = baseDto.IsDeleted,
            DeletedAt = baseDto.DeletedAt,
            CreatedAt = baseDto.CreatedAt,
            LastLoginAt = baseDto.LastLoginAt,
            TotalCompletedLessons = completedCount,
            AverageScore = avgScore,
            LearningProgress = user.Role == "learner" ? new UserLearningProgressDto
            {
                CompletedLessons = completedCount,
                TotalLessons = totalLessonsPublished > 0 ? totalLessonsPublished : 0,
                StreakDays = streakDays,
                RecentSubjects = recentSubjects
            } : null,
            Assessments = assessments,
            Activities = activities
        };

        return Ok(detailDto);
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
    [HttpPut("users/{userId}")]
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

        int usersCount = await _db.Users.CountAsync(u => !u.IsDeleted);
        int auditCount = await _db.StaffAuditLogs.CountAsync();

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
            checkedAt = DateTimeOffset.UtcNow.ToString("o"),
            storageStats = new
            {
                usersCount = usersCount,
                activitiesCount = auditCount,
                attentionCount = 0,
                isLocalStoragePersisted = false
            }
        });
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics([FromQuery] string range = "7d")
    {
        int days = range switch
        {
            "30d" => 30,
            "month" => 30,
            "all" => 90,
            _ => 7
        };
        var startDate = DateTimeOffset.UtcNow.Date.AddDays(-days + 1);

        var total = await _db.Users.CountAsync(u => !u.IsDeleted);
        var totalSafe = Math.Max(total, 1);
        var learnerCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "learner");
        var teacherCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "teacher");
        var contentCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "content");
        var supportCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "support");
        var adminCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "admin");

        var roleDistribution = new List<UserDistributionItemDto>
        {
            new() { Name = "Học viên (Learner)", Key = "learner", Count = learnerCount, Percentage = (int)Math.Round((double)learnerCount * 100 / totalSafe), Color = "#0284c7" },
            new() { Name = "Giáo viên (Teacher)", Key = "teacher", Count = teacherCount, Percentage = (int)Math.Round((double)teacherCount * 100 / totalSafe), Color = "#8b5cf6" },
            new() { Name = "Nội dung (Content)", Key = "content", Count = contentCount, Percentage = (int)Math.Round((double)contentCount * 100 / totalSafe), Color = "#f59e0b" },
            new() { Name = "Hỗ trợ (Support)", Key = "support", Count = supportCount, Percentage = (int)Math.Round((double)supportCount * 100 / totalSafe), Color = "#10b981" },
            new() { Name = "Quản trị (Admin)", Key = "admin", Count = adminCount, Percentage = (int)Math.Round((double)adminCount * 100 / totalSafe), Color = "#ef4444" },
        };

        var activeCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "active");
        var suspendedCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "suspended");
        var disabledCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "disabled");
        var pendingCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "pending");

        var statusDistribution = new List<UserDistributionItemDto>
        {
            new() { Name = "Đang hoạt động", Key = "active", Count = activeCount, Percentage = (int)Math.Round((double)activeCount * 100 / totalSafe), Color = "#16a34a" },
            new() { Name = "Chờ duyệt", Key = "pending", Count = pendingCount, Percentage = (int)Math.Round((double)pendingCount * 100 / totalSafe), Color = "#eab308" },
            new() { Name = "Tạm khóa", Key = "suspended", Count = suspendedCount, Percentage = (int)Math.Round((double)suspendedCount * 100 / totalSafe), Color = "#f97316" },
            new() { Name = "Vô hiệu hóa", Key = "disabled", Count = disabledCount, Percentage = (int)Math.Round((double)disabledCount * 100 / totalSafe), Color = "#dc2626" },
        };

        var trends = new List<AnalyticsTrendPointDto>();
        for (int i = 0; i < days; i++)
        {
            var day = startDate.AddDays(i);
            var nextDay = day.AddDays(1);
            var newUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.CreatedAt >= day && u.CreatedAt < nextDay);
            var completedLessons = await _db.LessonProgresses.CountAsync(lp => lp.OverallProgress >= 100 && lp.UpdatedAt >= day && lp.UpdatedAt < nextDay);
            var activeUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.LastLoginAt.HasValue && u.LastLoginAt.Value >= day && u.LastLoginAt.Value < nextDay);

            trends.Add(new AnalyticsTrendPointDto
            {
                Date = day.ToString("dd/MM"),
                ActiveUsers = activeUsers,
                NewUsers = newUsers,
                CompletedLessons = completedLessons,
                LessonsCompleted = completedLessons
            });
        }

        return Ok(new AdminAnalyticsResponseDto
        {
            Trends = trends,
            RoleDistribution = roleDistribution,
            StatusDistribution = statusDistribution
        });
    }

    [HttpGet("teachers")]
    public async Task<IActionResult> GetTeachers(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? subject = null)
    {
        var query = _db.Users.Where(u => u.Role == "teacher" && !u.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(s)) ||
                (u.Email != null && u.Email.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            var raw = status.Trim().ToLowerInvariant();
            if (raw == "inactive")
            {
                query = query.Where(u => u.Status == "disabled");
            }
            else if (raw == "pending")
            {
                query = query.Where(u => u.Status == "suspended" || u.Status == "pending");
            }
            else if (raw == "active")
            {
                query = query.Where(u => u.Status == "active");
            }
            else if (TryMapTeacherStatus(raw, out var mappedStatus))
            {
                query = query.Where(u => u.Status == mappedStatus);
            }
            else
            {
                query = query.Where(u => u.Status == status);
            }
        }

        var teachers = await query.OrderBy(u => u.DisplayName).ToListAsync();
        var teacherIds = teachers.Select(t => t.Id).ToList();

        // Load teacher profile metadata from dedicated TeacherProfiles table
        var dbProfiles = await _db.TeacherProfiles
            .Where(p => teacherIds.Contains(p.TeacherId))
            .ToDictionaryAsync(p => p.TeacherId);

        // Fallback for legacy audit logs if not yet migrated to TeacherProfiles
        var profileLogs = await _db.StaffAuditLogs
            .Where(l => l.TargetType == "teacher_profile" && teacherIds.Contains(l.TargetId))
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var legacyProfilesByTeacher = profileLogs
            .GroupBy(l => l.TargetId)
            .ToDictionary(g => g.Key, g =>
            {
                var payload = g.First().Payload;
                if (string.IsNullOrWhiteSpace(payload)) return null;
                try
                {
                    return JsonSerializer.Deserialize<TeacherProfileMetadataDto>(payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }
                catch { return null; }
            });

        var classrooms = await _db.Classrooms
            .Where(c => teacherIds.Contains(c.TeacherId) && c.Status != "archived")
            .ToListAsync();

        var classroomIds = classrooms.Select(c => c.Id).ToList();
        var studentCounts = await _db.ClassroomStudents
            .Where(cs => classroomIds.Contains(cs.ClassroomId))
            .GroupBy(cs => cs.ClassroomId)
            .Select(g => new { ClassroomId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ClassroomId, x => x.Count);

        var result = new List<AdminTeacherDto>();
        foreach (var t in teachers)
        {
            var teacherClasses = classrooms.Where(c => c.TeacherId == t.Id).ToList();
            var classNames = teacherClasses.Select(c => c.Name).ToList();
            var totalStudents = teacherClasses.Sum(c => studentCounts.GetValueOrDefault(c.Id, 0));

            dbProfiles.TryGetValue(t.Id, out var profile);
            legacyProfilesByTeacher.TryGetValue(t.Id, out var legacyProfile);

            var phone = profile?.Phone ?? legacyProfile?.Phone ?? "";
            var qualifications = profile?.Qualifications ?? legacyProfile?.Qualifications ?? "";
            var experienceYears = profile?.ExperienceYears ?? legacyProfile?.ExperienceYears ?? 0;
            var bio = profile?.Bio ?? legacyProfile?.Bio ?? "";

            result.Add(new AdminTeacherDto
            {
                Id = t.Id,
                Name = t.DisplayName ?? (t.Email != null ? t.Email.Split('@')[0] : "Giáo viên"),
                Email = t.Email ?? "",
                Phone = phone,
                Subject = !string.IsNullOrWhiteSpace(t.Grade) ? $"Toán học {t.Grade}" : "Toán học 12",
                Classes = classNames,
                StudentCount = totalStudents,
                Status = t.Status == "active" ? "active" : t.Status == "disabled" ? "inactive" : "pending",
                JoinedAt = t.CreatedAt.ToString("o"),
                Rating = 5.0,
                Qualifications = qualifications,
                ExperienceYears = experienceYears,
                Bio = bio,
                AccountStatus = (t.Status == "suspended" || t.Status == "disabled") ? "LOCKED" : "ACTIVE"
            });
        }

        if (!string.IsNullOrWhiteSpace(subject) && subject != "all")
        {
            result = result.Where(t => t.Subject.ToLower().Contains(subject.ToLower())).ToList();
        }

        return Ok(result);
    }

    [HttpGet("teachers/kpis")]
    public async Task<IActionResult> GetTeacherKpis()
    {
        var teachers = await _db.Users.Where(u => u.Role == "teacher" && !u.IsDeleted).ToListAsync();
        var thirtyDaysAgo = DateTimeOffset.UtcNow.AddDays(-30);

        return Ok(new TeacherKpisDto
        {
            TotalTeachers = teachers.Count,
            ActiveTeaching = teachers.Count(t => t.Status == "active"),
            PendingOrLeave = teachers.Count(t => t.Status != "active"),
            NewTeachers = teachers.Count(t => t.CreatedAt >= thirtyDaysAgo)
        });
    }

    [HttpPost("teachers")]
    public async Task<IActionResult> CreateTeacher([FromBody] SaveTeacherRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return BadRequest(new { detail = "Định dạng email giáo viên không hợp lệ." });
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { detail = "Vui lòng nhập họ tên giáo viên." });

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var existing = await _db.Users.AnyAsync(u => u.EmailNormalized == normalizedEmail && !u.IsDeleted);
        if (existing)
            return Conflict(new { detail = "Email đã được sử dụng." });

        string rawPassword;
        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            if (req.Password.Trim().Length < 8 || req.Password.Length > 128)
                return BadRequest(new { detail = "Mật khẩu phải chứa ít nhất 8 ký tự và không vượt quá 128 ký tự." });
            rawPassword = req.Password.Trim();
        }
        else
        {
            rawPassword = GenerateSecurePassword();
        }

        string initialStatus = "active";
        if (!string.IsNullOrWhiteSpace(req.AccountStatus) && req.AccountStatus.Trim().Equals("LOCKED", StringComparison.OrdinalIgnoreCase))
        {
            initialStatus = "suspended";
        }
        else if (!string.IsNullOrWhiteSpace(req.Status))
        {
            if (!TryMapTeacherStatus(req.Status, out initialStatus))
            {
                return BadRequest(new { detail = $"Trạng thái giáo viên không hợp lệ: '{req.Status}'. Cho phép: active, pending, inactive, suspended, disabled." });
            }
        }

        var newTeacher = new User
        {
            Id = $"tch_{Guid.NewGuid():N}",
            Email = req.Email.Trim(),
            EmailNormalized = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(rawPassword),
            DisplayName = req.Name.Trim(),
            Role = "teacher",
            Grade = req.Subject.Replace("Toán học", "").Trim(),
            Status = initialStatus,
            IsDeleted = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Users.Add(newTeacher);

        var newProfile = new TeacherProfile
        {
            Id = $"tp_{Guid.NewGuid():N}",
            TeacherId = newTeacher.Id,
            Phone = req.Phone?.Trim(),
            Qualifications = req.Qualifications?.Trim(),
            ExperienceYears = req.ExperienceYears ?? 0,
            Bio = req.Bio?.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.TeacherProfiles.Add(newProfile);

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "teacher_created",
            TargetType = "teacher",
            TargetId = newTeacher.Id,
            Payload = JsonSerializer.Serialize(new { email = newTeacher.Email, name = newTeacher.DisplayName, subject = req.Subject }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();

        return StatusCode(201, new AdminTeacherDto
        {
            Id = newTeacher.Id,
            Name = newTeacher.DisplayName,
            Email = newTeacher.Email,
            Phone = newProfile.Phone ?? string.Empty,
            Subject = req.Subject,
            Classes = req.Classes ?? new List<string>(),
            StudentCount = 0,
            Status = newTeacher.Status,
            JoinedAt = newTeacher.CreatedAt.ToString("o"),
            Rating = 5.0,
            Qualifications = newProfile.Qualifications ?? string.Empty,
            ExperienceYears = newProfile.ExperienceYears,
            Bio = newProfile.Bio ?? string.Empty,
            AccountStatus = (newTeacher.Status == "suspended" || newTeacher.Status == "disabled") ? "LOCKED" : "ACTIVE",
            TemporaryPassword = rawPassword
        });
    }

    [HttpPatch("teachers/{id}")]
    [HttpPut("teachers/{id}")]
    public async Task<IActionResult> UpdateTeacher(string id, [FromBody] SaveTeacherRequestDto req)
    {
        var teacher = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "teacher" && !u.IsDeleted);
        if (teacher == null) return NotFound(new { detail = "Không tìm thấy giáo viên." });

        if (!string.IsNullOrWhiteSpace(req.Email))
        {
            var newEmail = req.Email.Trim().ToLowerInvariant();
            if (!newEmail.Contains('@'))
            {
                return BadRequest(new { detail = "Định dạng email giáo viên không hợp lệ." });
            }

            var duplicate = await _db.Users.AnyAsync(u => u.EmailNormalized == newEmail && u.Id != teacher.Id && !u.IsDeleted);
            if (duplicate)
            {
                return BadRequest(new { detail = "Email đã được sử dụng bởi tài khoản khác." });
            }

            teacher.Email = req.Email.Trim();
            teacher.EmailNormalized = newEmail;
        }

        // Cập nhật trạng thái khóa/mở khóa hoặc trạng thái giảng dạy
        if (!string.IsNullOrWhiteSpace(req.AccountStatus))
        {
            var accStatus = req.AccountStatus.Trim().ToUpperInvariant();
            if (accStatus == "LOCKED")
            {
                teacher.Status = "suspended";
            }
            else if (accStatus == "ACTIVE")
            {
                teacher.Status = "active";
            }
            else
            {
                return BadRequest(new { detail = $"AccountStatus không hợp lệ: '{req.AccountStatus}'. Cho phép: ACTIVE, LOCKED." });
            }
        }
        else if (!string.IsNullOrWhiteSpace(req.Status))
        {
            if (!TryMapTeacherStatus(req.Status, out var mappedStatus))
            {
                return BadRequest(new { detail = $"Trạng thái giảng dạy không hợp lệ: '{req.Status}'. Cho phép: active, pending, inactive, suspended, disabled." });
            }
            teacher.Status = mappedStatus;
        }

        if (!string.IsNullOrWhiteSpace(req.Name)) teacher.DisplayName = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.Subject)) teacher.Grade = req.Subject.Replace("Toán học", "").Trim();
        teacher.UpdatedAt = DateTimeOffset.UtcNow;

        // Bảng TeacherProfiles riêng biệt: cập nhật từng trường không làm mất dữ liệu cũ
        var profile = await _db.TeacherProfiles.FirstOrDefaultAsync(p => p.TeacherId == teacher.Id);
        if (profile == null)
        {
            profile = new TeacherProfile
            {
                Id = $"tp_{Guid.NewGuid():N}",
                TeacherId = teacher.Id,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.TeacherProfiles.Add(profile);
        }

        bool profileChanged = false;
        if (req.Phone != null)
        {
            profile.Phone = req.Phone.Trim();
            profileChanged = true;
        }
        if (req.Qualifications != null)
        {
            profile.Qualifications = req.Qualifications.Trim();
            profileChanged = true;
        }
        if (req.ExperienceYears.HasValue)
        {
            profile.ExperienceYears = req.ExperienceYears.Value;
            profileChanged = true;
        }
        if (req.Bio != null)
        {
            profile.Bio = req.Bio.Trim();
            profileChanged = true;
        }
        if (profileChanged)
        {
            profile.UpdatedAt = DateTimeOffset.UtcNow;
        }

        // StaffAuditLogs chỉ dùng làm nhật ký kiểm toán thay đổi
        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "teacher_updated",
            TargetType = "teacher",
            TargetId = teacher.Id,
            Payload = JsonSerializer.Serialize(new { email = teacher.Email, name = teacher.DisplayName, status = teacher.Status }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        if (profileChanged)
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = CurrentUserId,
                Action = "teacher_profile_updated",
                TargetType = "teacher_profile",
                TargetId = teacher.Id,
                Payload = JsonSerializer.Serialize(new
                {
                    phone = profile.Phone,
                    qualifications = profile.Qualifications,
                    experienceYears = profile.ExperienceYears,
                    bio = profile.Bio
                }),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        var teacherClasses = await _db.Classrooms
            .Where(c => c.TeacherId == teacher.Id && c.Status != "archived")
            .ToListAsync();
        var classNames = teacherClasses.Select(c => c.Name).ToList();
        var teacherClassIds = teacherClasses.Select(c => c.Id).ToList();
        var totalStudents = await _db.ClassroomStudents
            .CountAsync(cs => teacherClassIds.Contains(cs.ClassroomId));

        return Ok(new AdminTeacherDto
        {
            Id = teacher.Id,
            Name = teacher.DisplayName ?? teacher.Email ?? "",
            Email = teacher.Email ?? "",
            Phone = profile.Phone ?? "",
            Subject = !string.IsNullOrWhiteSpace(teacher.Grade) ? $"Toán học {teacher.Grade}" : "Toán học 12",
            Classes = classNames,
            StudentCount = totalStudents,
            Status = teacher.Status == "active" ? "active" : teacher.Status == "disabled" ? "inactive" : "pending",
            JoinedAt = teacher.CreatedAt.ToString("o"),
            Rating = 5.0,
            Qualifications = profile.Qualifications ?? "",
            ExperienceYears = profile.ExperienceYears,
            Bio = profile.Bio ?? "",
            AccountStatus = (teacher.Status == "suspended" || teacher.Status == "disabled") ? "LOCKED" : "ACTIVE"
        });
    }

    [HttpDelete("teachers/{id}")]
    public async Task<IActionResult> DeleteTeacher(string id)
    {
        var teacher = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "teacher" && !u.IsDeleted);
        if (teacher == null) return NotFound(new { detail = "Không tìm thấy giáo viên." });

        teacher.IsDeleted = true;
        teacher.DeletedAt = DateTimeOffset.UtcNow;
        teacher.Status = "disabled";
        teacher.UpdatedAt = DateTimeOffset.UtcNow;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "teacher_deleted",
            TargetType = "teacher",
            TargetId = teacher.Id,
            Payload = JsonSerializer.Serialize(new { email = teacher.Email }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports(
        [FromQuery] string timeframe = "30d",
        [FromQuery] string? subjectId = null,
        [FromQuery] string? classId = null)
    {
        int days = timeframe switch
        {
            "7d" => 7,
            "term" => 90,
            _ => 30
        };
        var startDate = DateTimeOffset.UtcNow.Date.AddDays(-days + 1);

        List<string>? classLearnerIds = null;
        if (!string.IsNullOrWhiteSpace(classId) && classId != "all")
        {
            classLearnerIds = await _db.ClassroomStudents
                .Where(cs => cs.ClassroomId == classId)
                .Select(cs => cs.StudentId)
                .ToListAsync();
        }

        var learnersQuery = _db.Users.Where(u => u.Role == "learner" && !u.IsDeleted);
        if (classLearnerIds != null)
        {
            learnersQuery = learnersQuery.Where(u => classLearnerIds.Contains(u.Id));
        }

        var totalLearners = await learnersQuery.CountAsync();
        var activeLearners = await learnersQuery.CountAsync(u => u.Status == "active");

        var lessonProgressQuery = _db.LessonProgresses.AsQueryable();
        if (classLearnerIds != null)
        {
            lessonProgressQuery = lessonProgressQuery.Where(lp => classLearnerIds.Contains(lp.UserId));
        }
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            lessonProgressQuery = lessonProgressQuery.Where(lp => lp.SubjectId == subjectId || (lp.SubjectId != null && lp.SubjectId.ToLower().Contains(subjectId.ToLower())));
        }

        var completedLessons = await lessonProgressQuery.CountAsync(lp => lp.OverallProgress >= 100);

        var lessonsQuery = _db.ContentLessons.Where(l => l.Status == "published");
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            lessonsQuery = lessonsQuery.Where(l => l.Chapter!.SubjectId == subjectId || (l.Chapter!.Subject != null && l.Chapter.Subject.Name.ToLower().Contains(subjectId.ToLower())));
        }
        var totalPublishedLessons = await lessonsQuery.CountAsync();
        var completionRatePercent = totalPublishedLessons > 0 && totalLearners > 0
            ? Math.Round((double)completedLessons * 100 / (totalPublishedLessons * totalLearners), 1)
            : 0.0;

        var attemptsQuery = _db.AssessmentAttempts
            .Where(a => a.CompletedAt.HasValue && a.CompletedAt.Value >= startDate && (a.ScoreScaled.HasValue || a.ScoreRaw.HasValue));

        if (classLearnerIds != null)
        {
            attemptsQuery = attemptsQuery.Where(a => classLearnerIds.Contains(a.UserId));
        }
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            attemptsQuery = attemptsQuery.Where(a => a.SubjectId == subjectId || (a.SubjectId != null && a.SubjectId.ToLower().Contains(subjectId.ToLower())));
        }

        var attempts = await attemptsQuery.ToListAsync();

        var normalizedScores = attempts
            .Select(GetNormalizedScore)
            .Where(s => s.HasValue)
            .Select(s => s!.Value)
            .ToList();

        double avgScore = normalizedScores.Count > 0
            ? Math.Round(normalizedScores.Average(), 1)
            : 0.0;

        var excellentCount = normalizedScores.Count(s => s >= 9.0);
        var goodCount = normalizedScores.Count(s => s >= 8.0 && s < 9.0);
        var fairCount = normalizedScores.Count(s => s >= 6.5 && s < 8.0);
        var averageCount = normalizedScores.Count(s => s < 6.5);
        int attemptsTotal = normalizedScores.Count;

        var scoreDistribution = new List<ScoreDistributionDto>
        {
            new() { Range = "Xuất sắc (9.0 - 10)", Count = excellentCount, Percent = attemptsTotal > 0 ? Math.Round((double)excellentCount * 100 / attemptsTotal, 1) : 0.0 },
            new() { Range = "Giỏi (8.0 - 8.9)", Count = goodCount, Percent = attemptsTotal > 0 ? Math.Round((double)goodCount * 100 / attemptsTotal, 1) : 0.0 },
            new() { Range = "Khá (6.5 - 7.9)", Count = fairCount, Percent = attemptsTotal > 0 ? Math.Round((double)fairCount * 100 / attemptsTotal, 1) : 0.0 },
            new() { Range = "Trung bình (< 6.5)", Count = averageCount, Percent = attemptsTotal > 0 ? Math.Round((double)averageCount * 100 / attemptsTotal, 1) : 0.0 },
        };

        var activityTrend = new List<AnalyticsTrendPointDto>();
        for (int i = 0; i < days; i++)
        {
            var day = startDate.AddDays(i);
            var nextDay = day.AddDays(1);

            var activeUsersQuery = _db.Users.Where(u => !u.IsDeleted && u.Role == "learner" && u.LastLoginAt.HasValue && u.LastLoginAt.Value >= day && u.LastLoginAt.Value < nextDay);
            if (classLearnerIds != null)
            {
                activeUsersQuery = activeUsersQuery.Where(u => classLearnerIds.Contains(u.Id));
            }
            var active = await activeUsersQuery.CountAsync();

            var completedDayQuery = lessonProgressQuery.Where(lp => lp.OverallProgress >= 100 && lp.UpdatedAt >= day && lp.UpdatedAt < nextDay);
            var completed = await completedDayQuery.CountAsync();

            activityTrend.Add(new AnalyticsTrendPointDto
            {
                Date = day.ToString("dd/MM"),
                ActiveUsers = active,
                CompletedLessons = completed,
                LessonsCompleted = completed
            });
        }

        var subjects = await _db.ContentSubjects.Where(s => s.IsActive).ToListAsync();
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            subjects = subjects.Where(s => s.Id == subjectId || s.Name.ToLower().Contains(subjectId.ToLower())).ToList();
        }

        var subjectProgress = new List<SubjectProgressReportDto>();
        foreach (var s in subjects)
        {
            var subjectLessons = await _db.ContentLessons.CountAsync(l => l.Chapter!.SubjectId == s.Id && l.Status == "published");
            var subjectCompletedQuery = _db.LessonProgresses.Where(lp => lp.SubjectId == s.Id && lp.OverallProgress >= 100);
            if (classLearnerIds != null)
            {
                subjectCompletedQuery = subjectCompletedQuery.Where(lp => classLearnerIds.Contains(lp.UserId));
            }
            var subjectCompleted = await subjectCompletedQuery.CountAsync();

            var prog = subjectLessons > 0 && totalLearners > 0
                ? Math.Round((double)subjectCompleted * 100 / (subjectLessons * totalLearners), 1)
                : 0.0;

            subjectProgress.Add(new SubjectProgressReportDto
            {
                Subject = s.Name,
                Progress = prog,
                LearnersCount = totalLearners
            });
        }

        return Ok(new LearningReportsResponseDto
        {
            TotalLearners = totalLearners,
            ActiveLearners = activeLearners,
            CompletedLessons = completedLessons,
            CompletionRatePercent = completionRatePercent,
            AverageAssessmentScore = avgScore,
            ActivityTrend = activityTrend,
            SubjectProgress = subjectProgress,
            ScoreDistribution = scoreDistribution
        });
    }

    [HttpGet("announcements")]
    public async Task<IActionResult> GetAnnouncements(
        [FromQuery] string status = "all",
        [FromQuery] string audience = "all",
        [FromQuery] string? search = null)
    {
        var logs = await _db.StaffAuditLogs
            .Where(l => l.TargetType == "announcement")
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var announcementsMap = new Dictionary<string, AnnouncementDto>();
        foreach (var log in logs)
        {
            if (string.IsNullOrWhiteSpace(log.Payload)) continue;
            try
            {
                var anc = JsonSerializer.Deserialize<AnnouncementDto>(log.Payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (anc != null && !announcementsMap.ContainsKey(anc.Id))
                {
                    if (log.Action == "announcement_deleted")
                    {
                        announcementsMap[anc.Id] = new AnnouncementDto { Id = anc.Id, Status = "deleted" };
                    }
                    else
                    {
                        announcementsMap[anc.Id] = anc;
                    }
                }
            }
            catch { }
        }

        var list = announcementsMap.Values.Where(a => a.Status != "deleted").ToList();
        if (status != "all") list = list.Where(a => a.Status == status).ToList();
        if (audience != "all") list = list.Where(a => a.Audience == audience).ToList();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            list = list.Where(a => a.Title.ToLower().Contains(s) || a.Content.ToLower().Contains(s)).ToList();
        }

        return Ok(list);
    }

    [HttpPost("announcements")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] SaveAnnouncementRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Title)) return BadRequest(new { detail = "Tiêu đề thông báo không được để trống." });

        var newAnc = new AnnouncementDto
        {
            Id = $"anc_{Guid.NewGuid():N}",
            Title = req.Title.Trim(),
            Content = req.Content?.Trim() ?? "",
            Audience = req.Audience ?? "all",
            TargetClassId = req.TargetClassId,
            TargetClassName = req.TargetClassName,
            Severity = req.Severity ?? "info",
            Status = req.Status ?? "published",
            CreatedAt = DateTimeOffset.UtcNow.ToString("o"),
            CreatedBy = CurrentUserId
        };

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "announcement_created",
            TargetType = "announcement",
            TargetId = newAnc.Id,
            Payload = JsonSerializer.Serialize(newAnc),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        return StatusCode(201, newAnc);
    }

    [HttpPut("announcements/{id}")]
    public async Task<IActionResult> UpdateAnnouncement(string id, [FromBody] SaveAnnouncementRequestDto req, CancellationToken cancellationToken = default)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        IActionResult result = Ok();

        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken);

                    var logs = await _db.StaffAuditLogs
                        .Where(l => l.TargetType == "announcement" && l.TargetId == id)
                        .OrderByDescending(l => l.CreatedAt)
                        .ToListAsync(cancellationToken);

                    var latestLog = logs.FirstOrDefault();
                    if (latestLog == null || latestLog.Action == "announcement_deleted" || string.IsNullOrWhiteSpace(latestLog.Payload))
                    {
                        result = NotFound(new { detail = "Không tìm thấy thông báo." });
                        return;
                    }

                    AnnouncementDto? existing = null;
                    try
                    {
                        existing = JsonSerializer.Deserialize<AnnouncementDto>(latestLog.Payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    }
                    catch { }

                    if (existing == null || existing.Status == "deleted")
                    {
                        result = NotFound(new { detail = "Không tìm thấy thông báo." });
                        return;
                    }

                    var updated = new AnnouncementDto
                    {
                        Id = id,
                        Title = !string.IsNullOrWhiteSpace(req.Title) ? req.Title.Trim() : existing.Title,
                        Content = req.Content != null ? req.Content.Trim() : existing.Content,
                        Audience = !string.IsNullOrWhiteSpace(req.Audience) ? req.Audience : existing.Audience,
                        TargetClassId = req.TargetClassId ?? existing.TargetClassId,
                        TargetClassName = req.TargetClassName ?? existing.TargetClassName,
                        Severity = !string.IsNullOrWhiteSpace(req.Severity) ? req.Severity : existing.Severity,
                        Status = !string.IsNullOrWhiteSpace(req.Status) ? req.Status : existing.Status,
                        CreatedAt = string.IsNullOrWhiteSpace(existing.CreatedAt) ? DateTimeOffset.UtcNow.ToString("o") : existing.CreatedAt,
                        CreatedBy = string.IsNullOrWhiteSpace(existing.CreatedBy) ? CurrentUserId : existing.CreatedBy,
                        UpdatedAt = DateTimeOffset.UtcNow.ToString("o")
                    };

                    _db.StaffAuditLogs.Add(new StaffAuditLog
                    {
                        Id = $"log_{Guid.NewGuid():N}",
                        ActorUserId = CurrentUserId,
                        Action = "announcement_updated",
                        TargetType = "announcement",
                        TargetId = id,
                        Payload = JsonSerializer.Serialize(updated),
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                    await _db.SaveChangesAsync(cancellationToken);
                    await tx.CommitAsync(cancellationToken);

                    result = Ok(updated);
                });
                break;
            }
            catch (Exception ex) when (attempt < maxRetries && IsDeadlockException(ex))
            {
                await Task.Delay(50 * attempt, cancellationToken);
            }
        }

        return result;
    }

    [HttpDelete("announcements/{id}")]
    public async Task<IActionResult> DeleteAnnouncement(string id, CancellationToken cancellationToken = default)
    {
        var logs = await _db.StaffAuditLogs
            .Where(l => l.TargetType == "announcement" && l.TargetId == id)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

        var latestLog = logs.FirstOrDefault();
        if (latestLog == null || latestLog.Action == "announcement_deleted")
        {
            return NotFound(new { detail = "Không tìm thấy thông báo." });
        }

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "announcement_deleted",
            TargetType = "announcement",
            TargetId = id,
            Payload = JsonSerializer.Serialize(new { Id = id }),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var log = await _db.StaffAuditLogs
            .Where(l => l.TargetType == "system_settings" && l.Action == "system_settings_updated")
            .OrderByDescending(l => l.CreatedAt)
            .FirstOrDefaultAsync();

        if (log != null && !string.IsNullOrWhiteSpace(log.Payload))
        {
            try
            {
                var settings = JsonSerializer.Deserialize<OperationalSettingsDto>(log.Payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (settings != null)
                {
                    settings.Version = log.Id;
                    return Ok(settings);
                }
            }
            catch { }
        }

        return Ok(new OperationalSettingsDto
        {
            UpdatedAt = DateTimeOffset.UtcNow.ToString("o"),
            UpdatedBy = "System",
            Version = "initial"
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] OperationalSettingsDto req, CancellationToken cancellationToken = default)
    {
        var incomingVersion = req.Version;
        var strategy = _db.Database.CreateExecutionStrategy();
        IActionResult result = Ok(req);

        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken);

                    // Acquire application lock to serialize settings mutations without broad table locking
                    if (_db.Database.IsSqlServer())
                    {
                        var returnCodeParam = new SqlParameter
                        {
                            ParameterName = "@ReturnValue",
                            SqlDbType = System.Data.SqlDbType.Int,
                            Direction = System.Data.ParameterDirection.Output
                        };
                        await _db.Database.ExecuteSqlRawAsync(
                            "EXEC @ReturnValue = sp_getapplock @Resource = 'system_settings_lock', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 5000",
                            new object[] { returnCodeParam },
                            cancellationToken);

                        int lockResult = (int)(returnCodeParam.Value ?? -999);
                        if (lockResult < 0)
                        {
                            throw new InvalidOperationException($"Không thể xác lập khóa quản trị hệ thống (sp_getapplock result: {lockResult}).");
                        }
                    }

                    var latestLog = await _db.StaffAuditLogs
                        .Where(l => l.TargetType == "system_settings" && l.Action == "system_settings_updated")
                        .OrderByDescending(l => l.CreatedAt)
                        .FirstOrDefaultAsync(cancellationToken);

                    // Cơ chế chống ghi đè khi nhiều Admin cùng chỉnh sửa (Concurrency Token)
                    if (latestLog == null)
                    {
                        // Bản ghi đầu tiên trong hệ thống: chấp nhận "initial" hoặc rỗng
                    }
                    else
                    {
                        // Đã tồn tại cấu hình: bắt buộc req.Version phải khớp chính xác version hiện tại (latestLog.Id)
                        // Phiên bản "initial", null/rỗng hoặc bất kỳ version cũ nào đều bị từ chối 409 Conflict
                        if (string.IsNullOrWhiteSpace(incomingVersion) || incomingVersion != latestLog.Id)
                        {
                            result = Conflict(new { detail = "Cấu hình hệ thống đã được cập nhật bởi một phiên quản trị khác. Vui lòng tải lại trang để xem dữ liệu mới nhất trước khi chỉnh sửa." });
                            return;
                        }
                    }

                    var newLogId = $"log_{Guid.NewGuid():N}";
                    req.UpdatedAt = DateTimeOffset.UtcNow.ToString("o");
                    req.UpdatedBy = CurrentUserId;
                    req.Version = newLogId;

                    _db.StaffAuditLogs.Add(new StaffAuditLog
                    {
                        Id = newLogId,
                        ActorUserId = CurrentUserId,
                        Action = "system_settings_updated",
                        TargetType = "system_settings",
                        TargetId = "global",
                        Payload = JsonSerializer.Serialize(req),
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                    await _db.SaveChangesAsync(cancellationToken);
                    await tx.CommitAsync(cancellationToken);

                    result = Ok(req);
                });
                break;
            }
            catch (Exception ex) when (attempt < maxRetries && IsDeadlockException(ex))
            {
                await Task.Delay(50 * attempt, cancellationToken);
            }
        }

        return result;
    }

    private static bool IsDeadlockException(Exception ex)
    {
        if (ex is SqlException sqlEx && sqlEx.Number == 1205) return true;
        if (ex.InnerException is SqlException innerSqlEx && innerSqlEx.Number == 1205) return true;
        if (ex is DbUpdateException dbEx && dbEx.InnerException is SqlException dbSqlEx && dbSqlEx.Number == 1205) return true;
        return false;
    }

    [HttpGet("roles")]
    public IActionResult GetRoles()
    {
        return Ok(new
        {
            roles = new[]
            {
                new { role = "admin", name = "Quản trị viên", policy = "AdminOnly", description = "Toàn quyền quản trị hệ thống, người dùng, hạ tầng, báo cáo." },
                new { role = "teacher", name = "Giáo viên", policy = "StaffOnly", description = "Quản lý lớp học, phân công bài tập, chấm điểm và can thiệp sư phạm." },
                new { role = "content", name = "Biên tập viên", policy = "ContentStaff", description = "Biên soạn chương trình, bài giảng, video, duyệt và xuất bản học liệu." },
                new { role = "learner", name = "Học viên", policy = "LearnerOnly", description = "Tham gia học tập theo lộ trình, làm bài trắc nghiệm và tương tác gia sư AI." }
            },
            isDynamicConfigEnabled = false,
            message = "Hệ thống STUDY_AI áp dụng kiến trúc phân quyền tĩnh dựa trên chính sách Backend (RBAC). Mọi ma trận quyền được hiển thị chỉ đọc."
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
