using System.Text.Json.Serialization;

namespace StudyAI.Application.DTOs;

public class UserRegisterRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Grade { get; set; }
}

public class UserLoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class UserResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? Grade { get; set; }
    public string Role { get; set; } = "learner";
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; }
}

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "bearer";
    public int ExpiresIn { get; set; }
    public UserResponseDto User { get; set; } = new();
}

public class TokenRefreshResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "bearer";
    public int ExpiresIn { get; set; }
    public UserResponseDto? User { get; set; }
}
