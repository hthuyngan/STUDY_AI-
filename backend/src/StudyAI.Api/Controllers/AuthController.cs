using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly StudyAIDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IConfiguration _configuration;
    public const string RefreshCookieName = "study_ai_refresh_token";

    // In-memory brute force lockout tracker: email -> (Failures, LockoutUntil)
    private static readonly ConcurrentDictionary<string, (int Failures, DateTimeOffset LockoutUntil)> _loginAttempts = new();

    public AuthController(
        StudyAIDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IConfiguration configuration)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _configuration = configuration;
    }

    private void SetRefreshCookie(string rawRefreshToken)
    {
        int days = int.TryParse(_configuration["Jwt:RefreshTokenExpireDays"], out int d) ? d : 7;
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(days)
        };
        Response.Cookies.Append(RefreshCookieName, rawRefreshToken, cookieOptions);
    }

    private void ClearRefreshCookie()
    {
        Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            Path = "/",
            SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Secure = Request.IsHttps
        });
    }

    private static UserResponseDto FormatUser(User user)
    {
        return new UserResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            Grade = user.Grade,
            Role = user.Role ?? "learner",
            Status = user.Status ?? "active",
            IsDeleted = user.IsDeleted,
            CreatedAt = user.CreatedAt
        };
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] UserRegisterRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
        {
            return BadRequest(new { detail = "Định dạng email không hợp lệ." });
        }

        if (string.IsNullOrWhiteSpace(req.DisplayName))
        {
            return BadRequest(new { detail = "Vui lòng nhập tên hiển thị." });
        }

        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Trim().Length < 8 || req.Password.Length > 128)
        {
            return BadRequest(new { detail = "Mật khẩu phải chứa ít nhất 8 ký tự và không vượt quá 128 ký tự." });
        }

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var existing = await _db.Users.AnyAsync(u => u.EmailNormalized == normalizedEmail);
        if (existing)
        {
            return Conflict(new { detail = "Email đã được sử dụng." });
        }

        var userId = $"usr_{Guid.NewGuid():N}";
        var user = new User
        {
            Id = userId,
            Email = req.Email.Trim(),
            EmailNormalized = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(req.Password),
            DisplayName = req.DisplayName.Trim(),
            Grade = req.Grade,
            Role = "learner", // Strict learner role enforcement on self-registration
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.Users.Add(user);

        // Generate tokens
        var (accessToken, expiresIn) = _jwtTokenService.GenerateAccessToken(user);
        var rawRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var tokenHash = _jwtTokenService.HashRefreshToken(rawRefreshToken);

        int refreshDays = int.TryParse(_configuration["Jwt:RefreshTokenExpireDays"], out int rd) ? rd : 7;
        var session = new RefreshSession
        {
            Id = $"sess_{Guid.NewGuid():N}",
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(refreshDays),
            UserAgent = Request.Headers.UserAgent.ToString()
        };
        _db.RefreshSessions.Add(session);

        await _db.SaveChangesAsync();

        SetRefreshCookie(rawRefreshToken);

        return StatusCode(201, new AuthResponseDto
        {
            AccessToken = accessToken,
            TokenType = "bearer",
            ExpiresIn = expiresIn,
            User = FormatUser(user)
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UserLoginRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return Unauthorized(new { detail = "Email hoặc mật khẩu không chính xác." });
        }

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();

        // 1. Check brute force lockout
        if (_loginAttempts.TryGetValue(normalizedEmail, out var attempt) && attempt.LockoutUntil > DateTimeOffset.UtcNow)
        {
            var waitSecs = (int)Math.Ceiling((attempt.LockoutUntil - DateTimeOffset.UtcNow).TotalSeconds);
            return StatusCode(429, new { detail = $"Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau {waitSecs} giây." });
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == normalizedEmail);

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !_passwordHasher.VerifyPassword(req.Password, user.PasswordHash))
        {
            // Record failure
            _loginAttempts.AddOrUpdate(
                normalizedEmail,
                _ => (1, DateTimeOffset.MinValue),
                (_, cur) =>
                {
                    var newFailures = cur.Failures + 1;
                    var lockout = newFailures >= 5 ? DateTimeOffset.UtcNow.AddMinutes(5) : DateTimeOffset.MinValue;
                    return (newFailures, lockout);
                });

            return Unauthorized(new { detail = "Email hoặc mật khẩu không chính xác." });
        }

        // Clear failures on successful credential verification
        _loginAttempts.TryRemove(normalizedEmail, out _);

        // 2. Check account status & soft delete
        if (user.IsDeleted)
        {
            return StatusCode(403, new { detail = "Tài khoản của bạn đã bị xóa khỏi hệ thống. Vui lòng liên hệ quản trị viên." });
        }

        if (user.Status is "suspended" or "disabled")
        {
            return StatusCode(403, new { detail = "Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ hỗ trợ." });
        }

        user.LastLoginAt = DateTimeOffset.UtcNow;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        var (accessToken, expiresIn) = _jwtTokenService.GenerateAccessToken(user);
        var rawRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var tokenHash = _jwtTokenService.HashRefreshToken(rawRefreshToken);

        int refreshDays = int.TryParse(_configuration["Jwt:RefreshTokenExpireDays"], out int rd) ? rd : 7;
        var session = new RefreshSession
        {
            Id = $"sess_{Guid.NewGuid():N}",
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(refreshDays),
            UserAgent = Request.Headers.UserAgent.ToString()
        };
        _db.RefreshSessions.Add(session);

        // Audit logging for privileged accounts
        if (user.Role != "learner")
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = $"log_{Guid.NewGuid():N}",
                ActorUserId = user.Id,
                Action = "staff_login",
                TargetType = "user",
                TargetId = user.Id,
                Payload = JsonSerializer.Serialize(new { email = user.Email, role = user.Role }),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        SetRefreshCookie(rawRefreshToken);

        return Ok(new AuthResponseDto
        {
            AccessToken = accessToken,
            TokenType = "bearer",
            ExpiresIn = expiresIn,
            User = FormatUser(user)
        });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        if (!Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) || string.IsNullOrWhiteSpace(rawToken))
        {
            return Unauthorized(new { detail = "Thiếu refresh token cookie hoặc phiên đã hết hạn." });
        }

        var tokenHash = _jwtTokenService.HashRefreshToken(rawToken);
        var session = await _db.RefreshSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TokenHash == tokenHash);

        if (session == null)
        {
            ClearRefreshCookie();
            return Unauthorized(new { detail = "Phiên làm việc không tồn tại hoặc đã bị hủy." });
        }

        // RFC 6819: Refresh Token Reuse Detection
        if (session.RevokedAt != null)
        {
            // A revoked token was presented! Revoke all sessions for this user as a safeguard.
            var activeSessions = await _db.RefreshSessions
                .Where(s => s.UserId == session.UserId && s.RevokedAt == null)
                .ToListAsync();

            foreach (var s in activeSessions)
            {
                s.RevokedAt = DateTimeOffset.UtcNow;
            }
            await _db.SaveChangesAsync();
            ClearRefreshCookie();

            return Unauthorized(new { detail = "Cảnh báo bảo mật: Phát hiện sử dụng lại refresh token đã thu hồi. Mọi phiên hoạt động đã bị hủy." });
        }

        if (session.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            ClearRefreshCookie();
            return Unauthorized(new { detail = "Phiên làm việc đã hết hạn." });
        }

        var user = session.User;
        if (user == null || user.IsDeleted || user.Status is "suspended" or "disabled")
        {
            ClearRefreshCookie();
            return Unauthorized(new { detail = "Tài khoản không hợp lệ hoặc đã bị khóa." });
        }

        // Revoke current session (Rotation)
        session.RevokedAt = DateTimeOffset.UtcNow;
        session.LastUsedAt = DateTimeOffset.UtcNow;

        // Create new session
        var newRawToken = _jwtTokenService.GenerateRefreshToken();
        var newTokenHash = _jwtTokenService.HashRefreshToken(newRawToken);

        int refreshDays = int.TryParse(_configuration["Jwt:RefreshTokenExpireDays"], out int rd) ? rd : 7;
        var newSession = new RefreshSession
        {
            Id = $"sess_{Guid.NewGuid():N}",
            UserId = user.Id,
            TokenHash = newTokenHash,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(refreshDays),
            UserAgent = Request.Headers.UserAgent.ToString()
        };
        _db.RefreshSessions.Add(newSession);

        var (accessToken, expiresIn) = _jwtTokenService.GenerateAccessToken(user);

        await _db.SaveChangesAsync();

        SetRefreshCookie(newRawToken);

        return Ok(new TokenRefreshResponseDto
        {
            AccessToken = accessToken,
            TokenType = "bearer",
            ExpiresIn = expiresIn,
            User = FormatUser(user)
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) && !string.IsNullOrWhiteSpace(rawToken))
        {
            var tokenHash = _jwtTokenService.HashRefreshToken(rawToken);
            var session = await _db.RefreshSessions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.TokenHash == tokenHash);

            if (session != null)
            {
                session.RevokedAt = DateTimeOffset.UtcNow;

                if (session.User != null && session.User.Role != "learner")
                {
                    _db.StaffAuditLogs.Add(new StaffAuditLog
                    {
                        Id = $"log_{Guid.NewGuid():N}",
                        ActorUserId = session.User.Id,
                        Action = "staff_logout",
                        TargetType = "user",
                        TargetId = session.User.Id,
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                }

                await _db.SaveChangesAsync();
            }
        }

        ClearRefreshCookie();
        return Ok(new { message = "Logged out successfully" });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
        {
            return NotFound(new { detail = "Người dùng không tồn tại." });
        }

        return Ok(FormatUser(user));
    }
}
