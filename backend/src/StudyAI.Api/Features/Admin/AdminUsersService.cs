using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Admin;

public class AdminUsersService : IAdminUsersService
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "teacher", "content", "learner", "support"
    };

    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "active", "suspended", "disabled"
    };

    public AdminUsersService(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    public async Task<AdminUsersResponseDto> ListUsersAsync(
        string? role,
        string? status,
        string? search,
        int page,
        int pageSize,
        bool includeDeleted,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _db.Users.AsQueryable();

        if (!includeDeleted)
        {
            query = query.Where(u => !u.IsDeleted);
        }

        if (!string.IsNullOrWhiteSpace(role) && role != "all")
        {
            var r = role.Trim().ToLower();
            query = query.Where(u => u.Role == r);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            var s = status.Trim().ToLower();
            query = query.Where(u => u.Status == s);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(term)) ||
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(term)) ||
                u.Id.ToLower().Contains(term));
        }

        var total = await query.CountAsync(ct);
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new AdminUsersResponseDto
        {
            Items = users.Select(FormatUser).ToList(),
            Page = page,
            PageSize = pageSize,
            Total = total
        };
    }

    public async Task<AdminUserDetailDto> GetUserDetailAsync(string userId, bool includeDeleted, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || (!includeDeleted && user.IsDeleted))
        {
            throw new NotFoundException("Người dùng", userId);
        }

        var attempts = await _db.AssessmentAttempts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CompletedAt ?? a.StartedAt)
            .Take(10)
            .ToListAsync(ct);

        var lessons = await _db.LessonProgresses
            .Where(lp => lp.UserId == userId)
            .OrderByDescending(lp => lp.UpdatedAt)
            .Take(10)
            .ToListAsync(ct);

        var normalizedScores = attempts
            .Select(GetNormalizedScore)
            .Where(s => s.HasValue)
            .Select(s => s!.Value)
            .ToList();

        var averageScore = normalizedScores.Count > 0 ? Math.Round(normalizedScores.Average(), 1) : 0.0;
        var completedLessonsCount = lessons.Count(l => l.OverallProgress >= 100);

        var assessments = attempts.Select(a => new UserAssessmentDto
        {
            Id = a.Id,
            Title = $"Bài kiểm tra {a.SubjectId ?? "Toán"}",
            SubjectName = a.SubjectId ?? "Toán học",
            Score = GetNormalizedScore(a),
            MaxScore = a.ScoreMax > 0 ? a.ScoreMax : 10.0,
            Status = a.SuccessStatus == "passed" ? "completed" : "failed",
            CompletedAt = (a.CompletedAt ?? a.StartedAt).ToString("o")
        }).ToList();

        var activities = lessons.Select(l => new AdminActivityDto
        {
            Id = l.Id.ToString(),
            Action = "lesson_progress_updated",
            Actor = user.DisplayName ?? user.Email ?? user.Id,
            TargetType = "lesson",
            TargetId = l.LessonId,
            Payload = JsonSerializer.Serialize(new { progress = l.OverallProgress }),
            Timestamp = l.UpdatedAt.ToString("o")
        }).ToList();

        int streakDays = 0;
        if (attempts.Count > 0 || lessons.Count > 0)
        {
            var activeDates = attempts.Select(a => (a.CompletedAt ?? a.StartedAt).Date)
                .Concat(lessons.Select(l => l.UpdatedAt.Date))
                .Distinct()
                .OrderByDescending(d => d)
                .ToList();

            var today = _clock.UtcNow.Date;
            if (activeDates.Contains(today) || activeDates.Contains(today.AddDays(-1)))
            {
                var checkDate = activeDates.Contains(today) ? today : today.AddDays(-1);
                while (activeDates.Contains(checkDate))
                {
                    streakDays++;
                    checkDate = checkDate.AddDays(-1);
                }
            }
        }

        var formatted = FormatUser(user);
        return new AdminUserDetailDto
        {
            Id = formatted.Id,
            Email = formatted.Email,
            DisplayName = formatted.DisplayName,
            Grade = formatted.Grade,
            Role = formatted.Role,
            Status = formatted.Status,
            IsDeleted = formatted.IsDeleted,
            DeletedAt = formatted.DeletedAt,
            CreatedAt = formatted.CreatedAt,
            LastLoginAt = formatted.LastLoginAt,
            TotalCompletedLessons = completedLessonsCount,
            AverageScore = averageScore,
            LearningProgress = new UserLearningProgressDto
            {
                CompletedLessons = completedLessonsCount,
                TotalLessons = lessons.Count,
                StreakDays = streakDays,
                RecentSubjects = new List<UserRecentSubjectDto>()
            },
            Assessments = assessments,
            Activities = activities
        };
    }

    public async Task<CreateUserResponseDto> CreateUserAsync(CreateUserRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
        {
            throw new ValidationException("Email", "Định dạng email không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(req.DisplayName))
        {
            throw new ValidationException("DisplayName", "Tên hiển thị không được để trống.");
        }

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AnyAsync(u => u.EmailNormalized == normalizedEmail, ct);
        if (exists)
        {
            throw new ConflictException("Email đã được sử dụng trong hệ thống.");
        }

        var role = (req.Role ?? "learner").Trim().ToLowerInvariant();
        if (!AllowedRoles.Contains(role))
        {
            throw new ValidationException("Role", $"Vai trò '{req.Role}' không hợp lệ.");
        }

        var status = (req.Status ?? "active").Trim().ToLowerInvariant();
        if (!AllowedStatuses.Contains(status))
        {
            throw new ValidationException("Status", $"Trạng thái '{req.Status}' không hợp lệ.");
        }

        string rawPassword = string.IsNullOrWhiteSpace(req.Password) ? GenerateSecurePassword() : req.Password.Trim();
        if (rawPassword.Length < 8)
        {
            throw new ValidationException("Password", "Mật khẩu phải có ít nhất 8 ký tự.");
        }

        var userId = _idGenerator.NewId("usr");
        var user = new User
        {
            Id = userId,
            Email = req.Email.Trim(),
            EmailNormalized = normalizedEmail,
            DisplayName = req.DisplayName.Trim(),
            PasswordHash = _passwordHasher.HashPassword(rawPassword),
            Role = role,
            Status = status,
            Grade = req.Grade,
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync(
            "user_created",
            "user",
            user.Id,
            null,
            JsonSerializer.Serialize(new { email = user.Email, role = user.Role, status = user.Status }),
            ct);

        return new CreateUserResponseDto
        {
            User = FormatUser(user),
            TemporaryPassword = rawPassword,
            Message = "Người dùng đã được tạo thành công."
        };
    }

    public async Task<AdminUserDetailDto> UpdateUserAsync(string userId, UpdateUserRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || user.IsDeleted)
        {
            throw new NotFoundException("Người dùng", userId);
        }

        var beforeState = JsonSerializer.Serialize(new { email = user.Email, displayName = user.DisplayName, grade = user.Grade, role = user.Role, status = user.Status });

        if (user.Role == "admin")
        {
            bool demoting = !string.IsNullOrWhiteSpace(req.Role) && req.Role.Trim().ToLowerInvariant() != "admin";
            bool deactivating = !string.IsNullOrWhiteSpace(req.Status) && req.Status.Trim().ToLowerInvariant() != "active";
            if (demoting || deactivating)
            {
                var activeAdminCount = await _db.Users.CountAsync(u => u.Role == "admin" && !u.IsDeleted && u.Status == "active", ct);
                if (activeAdminCount <= 1)
                {
                    if (demoting)
                        throw new ValidationException("Role", "Không thể hủy quyền quản trị viên hoạt động duy nhất trong hệ thống.");
                    if (deactivating)
                        throw new ValidationException("Status", "Không thể tạm khóa hoặc vô hiệu hóa quản trị viên hoạt động duy nhất.");
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(req.DisplayName))
        {
            user.DisplayName = req.DisplayName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(req.Grade))
        {
            user.Grade = req.Grade.Trim();
        }

        if (!string.IsNullOrWhiteSpace(req.Role) && AllowedRoles.Contains(req.Role.Trim().ToLowerInvariant()))
        {
            user.Role = req.Role.Trim().ToLowerInvariant();
        }

        if (!string.IsNullOrWhiteSpace(req.Status) && AllowedStatuses.Contains(req.Status.Trim().ToLowerInvariant()))
        {
            user.Status = req.Status.Trim().ToLowerInvariant();
        }

        user.UpdatedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);

        var afterState = JsonSerializer.Serialize(new { email = user.Email, displayName = user.DisplayName, grade = user.Grade, role = user.Role, status = user.Status });
        await _auditWriter.WriteStaffAuditAsync("admin_update_user", "user", user.Id, beforeState, afterState, ct);

        return await GetUserDetailAsync(user.Id, false, ct);
    }

    public async Task<AdminUserDto> UpdateUserRoleAsync(string userId, UpdateRoleRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || user.IsDeleted) throw new NotFoundException("Người dùng", userId);

        var newRole = (req.Role ?? "").Trim().ToLowerInvariant();
        if (!AllowedRoles.Contains(newRole)) throw new ValidationException("Role", $"Vai trò '{req.Role}' không hợp lệ.");

        if (user.Role == "admin" && newRole != "admin")
        {
            var activeAdminCount = await _db.Users.CountAsync(u => u.Role == "admin" && !u.IsDeleted && u.Status == "active", ct);
            if (activeAdminCount <= 1)
            {
                throw new ValidationException("Role", "Không thể hủy quyền quản trị viên hoạt động duy nhất trong hệ thống.");
            }
        }

        if (user.Id == currentUserId && newRole != "admin")
        {
            throw new ForbiddenException("Không thể tự hạ quyền quản trị viên của chính mình.");
        }

        var oldRole = user.Role;
        user.Role = newRole;
        user.UpdatedAt = _clock.UtcNow;

        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync(
            "admin_change_role",
            "user",
            user.Id,
            JsonSerializer.Serialize(new { role = oldRole }),
            JsonSerializer.Serialize(new { role = newRole }),
            ct);

        return FormatUser(user);
    }

    public async Task<AdminUserDto> UpdateUserStatusAsync(string userId, UpdateStatusRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || user.IsDeleted) throw new NotFoundException("Người dùng", userId);

        var newStatus = (req.Status ?? "").Trim().ToLowerInvariant();
        if (!AllowedStatuses.Contains(newStatus)) throw new ValidationException("Status", $"Trạng thái '{req.Status}' không hợp lệ.");

        if (user.Role == "admin" && newStatus != "active")
        {
            var activeAdminCount = await _db.Users.CountAsync(u => u.Role == "admin" && !u.IsDeleted && u.Status == "active", ct);
            if (activeAdminCount <= 1)
            {
                throw new ValidationException("Status", "Không thể tạm khóa hoặc vô hiệu hóa quản trị viên hoạt động duy nhất.");
            }
        }

        if (user.Id == currentUserId && newStatus != "active")
        {
            throw new ForbiddenException("Không thể tự khóa tài khoản của chính mình.");
        }

        var oldStatus = user.Status;
        user.Status = newStatus;
        user.UpdatedAt = _clock.UtcNow;

        if (newStatus is "suspended" or "disabled")
        {
            await RevokeUserSessionsAsync(userId, currentUserId, ct);
        }

        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync(
            "admin_change_status",
            "user",
            user.Id,
            JsonSerializer.Serialize(new { status = oldStatus }),
            JsonSerializer.Serialize(new { status = newStatus }),
            ct);

        return FormatUser(user);
    }

    public async Task<int> RevokeUserSessionsAsync(string userId, string currentUserId, CancellationToken ct = default)
    {
        var sessions = await _db.RefreshSessions
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        int count = sessions.Count;
        _db.RefreshSessions.RemoveRange(sessions);
        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync(
            "admin_revoke_sessions",
            "user",
            userId,
            null,
            JsonSerializer.Serialize(new { revokedCount = count }),
            ct);

        return count;
    }

    public async Task<ResetPasswordResponseDto> ResetUserPasswordAsync(string userId, ResetPasswordRequestDto? req, string currentUserId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || user.IsDeleted) throw new NotFoundException("Người dùng", userId);

        string newPassword = string.IsNullOrWhiteSpace(req?.NewPassword) ? GenerateSecurePassword() : req.NewPassword.Trim();
        if (newPassword.Length < 8) throw new ValidationException("Password", "Mật khẩu mới phải có ít nhất 8 ký tự.");

        user.PasswordHash = _passwordHasher.HashPassword(newPassword);
        user.UpdatedAt = _clock.UtcNow;

        await RevokeUserSessionsAsync(userId, currentUserId, ct);
        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync("admin_reset_password", "user", user.Id, null, null, ct);

        return new ResetPasswordResponseDto
        {
            UserId = user.Id,
            TemporaryPassword = newPassword,
            Message = "Đặt lại mật khẩu thành công. Các phiên đăng nhập cũ đã bị hủy."
        };
    }

    public async Task<bool> DeleteUserAsync(string userId, string currentUserId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null) throw new NotFoundException("Người dùng", userId);

        if (user.Role == "admin")
        {
            var activeAdminCount = await _db.Users.CountAsync(u => u.Role == "admin" && !u.IsDeleted && u.Status == "active", ct);
            if (activeAdminCount <= 1)
            {
                throw new ValidationException("User", "Không thể xóa quản trị viên hoạt động duy nhất trong hệ thống.");
            }
        }

        if (userId == currentUserId)
        {
            throw new ForbiddenException("Không thể tự xóa tài khoản của chính mình.");
        }

        user.IsDeleted = true;
        user.DeletedAt = _clock.UtcNow;
        user.Status = "disabled";
        user.UpdatedAt = _clock.UtcNow;

        await RevokeUserSessionsAsync(userId, currentUserId, ct);
        await _db.SaveChangesAsync(ct);

        await _auditWriter.WriteStaffAuditAsync("admin_delete_user", "user", user.Id, null, null, ct);
        return true;
    }

    public object GetRoles()
    {
        return new
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
        };
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

        RandomNumberGenerator.Shuffle(chars.AsSpan());
        return new string(chars);
    }
}