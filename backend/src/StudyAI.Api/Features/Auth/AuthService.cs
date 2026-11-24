using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace StudyAI.Features.Auth;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;
    private readonly IConfiguration _configuration;

    private static readonly ConcurrentDictionary<string, (int Failures, DateTimeOffset LockoutUntil)> _loginAttempts = new();

    public AuthService(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IClock clock,
        IIdGenerator idGenerator,
        IConfiguration configuration)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _clock = clock;
        _idGenerator = idGenerator;
        _configuration = configuration;
    }

    public async Task<AuthSessionResultDto> RegisterAsync(UserRegisterRequestDto req, string? userAgent, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
        {
            throw new ValidationException("Email", "Định dạng email không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(req.DisplayName))
        {
            throw new ValidationException("DisplayName", "Vui lòng nhập tên hiển thị.");
        }

        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Trim().Length < 8 || req.Password.Length > 128)
        {
            throw new ValidationException("Password", "Mật khẩu phải chứa ít nhất 8 ký tự và không vượt quá 128 ký tự.");
        }

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var existing = await _db.Users.AnyAsync(u => u.EmailNormalized == normalizedEmail, ct);
        if (existing)
        {
            throw new ConflictException("Email đã được sử dụng.");
        }

        var userId = _idGenerator.NewId("usr");
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
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        };

        _db.Users.Add(user);

        var (accessToken, expiresIn) = _jwtTokenService.GenerateAccessToken(user);
        var rawRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var tokenHash = _jwtTokenService.HashRefreshToken(rawRefreshToken);

        int refreshDays = int.TryParse(_configuration["Jwt:RefreshTokenExpireDays"], out int rd) ? rd : 7;
        var session = new RefreshSession
        {
            Id = _idGenerator.NewId("sess"),
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAt = _clock.UtcNow,
            ExpiresAt = _clock.UtcNow.AddDays(refreshDays),
            UserAgent = userAgent ?? string.Empty
        };
        _db.RefreshSessions.Add(session);

        await _db.SaveChangesAsync(ct);

        return new AuthSessionResultDto
        {
            AccessToken = accessToken,
            TokenType = "bearer",
            ExpiresIn = expiresIn,
            RawRefreshToken = rawRefreshToken,
            User = FormatUser(user)
        };
    }

    public async Task<AuthSessionResultDto> LoginAsync(UserLoginRequestDto req, string? userAgent, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không chính xác.");
        }

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();

        if (_loginAttempts.TryGetValue(normalizedEmail, out var attempt) && attempt.LockoutUntil > _clock.UtcNow)
        {
            var waitSecs = (int)Math.Ceiling((attempt.LockoutUntil - _clock.UtcNow).TotalSeconds);
            throw new TooManyRequestsException($"Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau {waitSecs} giây.");
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == normalizedEmail, ct);

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !_passwordHasher.VerifyPassword(req.Password, user.PasswordHash))
        {
            _loginAttempts.AddOrUpdate(
                normalizedEmail,
                _ => (1, DateTimeOffset.MinValue),
                (_, cur) =>
                {
                    var newFailures = cur.Failures + 1;
                    var lockout = newFailures >= 5 ? _clock.UtcNow.AddMinutes(5) : DateTimeOffset.MinValue;
                    return (newFailures, lockout);
                });

            throw new UnauthorizedAccessException("Email hoặc mật khẩu không chính xác.");
        }

        _loginAttempts.TryRemove(normalizedEmail, out _);

        if (user.IsDeleted)
        {
            throw new ForbiddenException("Tài khoản của bạn đã bị xóa khỏi hệ thống. Vui lòng liên hệ quản trị viên.");
        }

        if (user.Status is "suspended" or "disabled")
        {
            throw new ForbiddenException("Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ hỗ trợ.");
        }

        user.LastLoginAt = _clock.UtcNow;
        user.UpdatedAt = _clock.UtcNow;

        var (accessToken, expiresIn) = _jwtTokenService.GenerateAccessToken(user);
        var rawRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var tokenHash = _jwtTokenService.HashRefreshToken(rawRefreshToken);

        int refreshDays = int.TryParse(_configuration["Jwt:RefreshTokenExpireDays"], out int rd) ? rd : 7;
        var session = new RefreshSession
        {
            Id = _idGenerator.NewId("sess"),
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAt = _clock.UtcNow,
            ExpiresAt = _clock.UtcNow.AddDays(refreshDays),
            UserAgent = userAgent ?? string.Empty
        };
        _db.RefreshSessions.Add(session);

        if (user.Role != "learner")
        {
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = _idGenerator.NewId("log"),
                ActorUserId = user.Id,
                Action = "staff_login",
                TargetType = "user",
                TargetId = user.Id,
                Payload = JsonSerializer.Serialize(new { email = user.Email, role = user.Role }),
                CreatedAt = _clock.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);

        return new AuthSessionResultDto
        {
            AccessToken = accessToken,
            TokenType = "bearer",
            ExpiresIn = expiresIn,
            RawRefreshToken = rawRefreshToken,
            User = FormatUser(user)
        };
    }

    public async Task<AuthSessionResultDto> RefreshAsync(string rawRefreshToken, string? userAgent, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
        {
            throw new UnauthorizedAccessException("Thiếu refresh token cookie hoặc phiên đã hết hạn.");
        }

        var tokenHash = _jwtTokenService.HashRefreshToken(rawRefreshToken);
        var session = await _db.RefreshSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TokenHash == tokenHash, ct);

        if (session == null)
        {
            throw new UnauthorizedAccessException("Phiên làm việc không tồn tại hoặc đã bị hủy.");
        }

        if (session.RevokedAt != null)
        {
            var activeSessions = await _db.RefreshSessions
                .Where(s => s.UserId == session.UserId && s.RevokedAt == null)
                .ToListAsync(ct);

            foreach (var s in activeSessions)
            {
                s.RevokedAt = _clock.UtcNow;
            }
            await _db.SaveChangesAsync(ct);

            throw new UnauthorizedAccessException("Cảnh báo bảo mật: Phát hiện sử dụng lại refresh token đã thu hồi. Mọi phiên hoạt động đã bị hủy.");
        }

        if (session.ExpiresAt <= _clock.UtcNow)
        {
            throw new UnauthorizedAccessException("Phiên làm việc đã hết hạn.");
        }

        var user = session.User;
        if (user == null || user.IsDeleted || user.Status is "suspended" or "disabled")
        {
            throw new UnauthorizedAccessException("Tài khoản không hợp lệ hoặc đã bị khóa.");
        }

        session.RevokedAt = _clock.UtcNow;
        session.LastUsedAt = _clock.UtcNow;

        var newRawToken = _jwtTokenService.GenerateRefreshToken();
        var newTokenHash = _jwtTokenService.HashRefreshToken(newRawToken);

        int refreshDays = int.TryParse(_configuration["Jwt:RefreshTokenExpireDays"], out int rd) ? rd : 7;
        var newSession = new RefreshSession
        {
            Id = _idGenerator.NewId("sess"),
            UserId = user.Id,
            TokenHash = newTokenHash,
            CreatedAt = _clock.UtcNow,
            ExpiresAt = _clock.UtcNow.AddDays(refreshDays),
            UserAgent = userAgent ?? string.Empty
        };
        _db.RefreshSessions.Add(newSession);

        var (accessToken, expiresIn) = _jwtTokenService.GenerateAccessToken(user);

        await _db.SaveChangesAsync(ct);

        return new AuthSessionResultDto
        {
            AccessToken = accessToken,
            TokenType = "bearer",
            ExpiresIn = expiresIn,
            RawRefreshToken = newRawToken,
            User = FormatUser(user)
        };
    }

    public async Task LogoutAsync(string? rawRefreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken)) return;

        var tokenHash = _jwtTokenService.HashRefreshToken(rawRefreshToken);
        var session = await _db.RefreshSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TokenHash == tokenHash, ct);

        if (session != null)
        {
            session.RevokedAt = _clock.UtcNow;

            if (session.User != null && session.User.Role != "learner")
            {
                _db.StaffAuditLogs.Add(new StaffAuditLog
                {
                    Id = _idGenerator.NewId("log"),
                    ActorUserId = session.User.Id,
                    Action = "staff_logout",
                    TargetType = "user",
                    TargetId = session.User.Id,
                    CreatedAt = _clock.UtcNow
                });
            }

            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<UserResponseDto> GetMeAsync(string userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync(new object[] { userId }, ct);
        if (user == null || user.IsDeleted)
        {
            throw new NotFoundException("Người dùng không tồn tại.");
        }

        return FormatUser(user);
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
}