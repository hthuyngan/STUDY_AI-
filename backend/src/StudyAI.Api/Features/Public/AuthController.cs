using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Public.Auth;

namespace StudyAI.Api.Features.Public;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;
    public const string RefreshCookieName = "study_ai_refresh_token";

    public AuthController(IAuthService authService, IConfiguration configuration)
    {
        _authService = authService;
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

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] UserRegisterRequestDto req, CancellationToken ct)
    {
        var result = await _authService.RegisterAsync(req, Request.Headers.UserAgent.ToString(), ct);
        SetRefreshCookie(result.RawRefreshToken);
        return StatusCode(201, new AuthResponseDto
        {
            AccessToken = result.AccessToken,
            TokenType = result.TokenType,
            ExpiresIn = result.ExpiresIn,
            User = result.User
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UserLoginRequestDto req, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(req, Request.Headers.UserAgent.ToString(), ct);
        SetRefreshCookie(result.RawRefreshToken);
        return Ok(new AuthResponseDto
        {
            AccessToken = result.AccessToken,
            TokenType = result.TokenType,
            ExpiresIn = result.ExpiresIn,
            User = result.User
        });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        if (!Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) || string.IsNullOrWhiteSpace(rawToken))
        {
            return Unauthorized(new { detail = "Thiếu refresh token cookie hoặc phiên đã hết hạn." });
        }

        try
        {
            var result = await _authService.RefreshAsync(rawToken, Request.Headers.UserAgent.ToString(), ct);
            SetRefreshCookie(result.RawRefreshToken);
            return Ok(new TokenRefreshResponseDto
            {
                AccessToken = result.AccessToken,
                TokenType = result.TokenType,
                ExpiresIn = result.ExpiresIn,
                User = result.User
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            ClearRefreshCookie();
            return Unauthorized(new { detail = ex.Message });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken);
        await _authService.LogoutAsync(rawToken, ct);
        ClearRefreshCookie();
        return Ok(new { message = "Logged out successfully" });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var user = await _authService.GetMeAsync(userId, ct);
        return Ok(user);
    }
}
