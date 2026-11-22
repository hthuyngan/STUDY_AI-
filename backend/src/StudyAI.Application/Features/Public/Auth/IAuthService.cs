using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Public.Auth;

public class AuthSessionResultDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "bearer";
    public int ExpiresIn { get; set; }
    public string RawRefreshToken { get; set; } = string.Empty;
    public UserResponseDto User { get; set; } = new();
}

public interface IAuthService
{
    Task<AuthSessionResultDto> RegisterAsync(UserRegisterRequestDto req, string? userAgent, CancellationToken ct = default);
    Task<AuthSessionResultDto> LoginAsync(UserLoginRequestDto req, string? userAgent, CancellationToken ct = default);
    Task<AuthSessionResultDto> RefreshAsync(string rawRefreshToken, string? userAgent, CancellationToken ct = default);
    Task LogoutAsync(string? rawRefreshToken, CancellationToken ct = default);
    Task<UserResponseDto> GetMeAsync(string userId, CancellationToken ct = default);
}
