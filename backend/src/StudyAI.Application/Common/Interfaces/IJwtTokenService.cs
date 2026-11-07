using StudyAI.Domain.Entities;

namespace StudyAI.Application.Common.Interfaces;

public interface IJwtTokenService
{
    (string Token, int ExpiresInSeconds) GenerateAccessToken(User user);
    string GenerateRefreshToken();
    string HashRefreshToken(string rawToken);
}
