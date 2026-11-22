namespace StudyAI.Common.Security;

public interface IJwtTokenService
{
    (string Token, int ExpiresInSeconds) GenerateAccessToken(User user);
    string GenerateRefreshToken();
    string HashRefreshToken(string rawToken);
}
