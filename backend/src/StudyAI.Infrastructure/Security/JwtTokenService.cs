using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Domain.Entities;

namespace StudyAI.Infrastructure.Security;

public class JwtTokenService : IJwtTokenService
{
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _accessTokenExpireMinutes;

    public const string DefaultIssuer = "StudyAI.Api";
    public const string DefaultAudience = "StudyAI.Client";

    public JwtTokenService(IConfiguration configuration)
    {
        var secret = configuration["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
        {
            throw new InvalidOperationException("Jwt:SecretKey configuration is missing or fewer than 32 characters.");
        }
        _secretKey = secret;
        _issuer = configuration["Jwt:Issuer"] ?? DefaultIssuer;
        _audience = configuration["Jwt:Audience"] ?? DefaultAudience;
        _accessTokenExpireMinutes = int.TryParse(configuration["Jwt:AccessTokenExpireMinutes"], out int exp) ? exp : 30;
    }

    public (string Token, int ExpiresInSeconds) GenerateAccessToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_secretKey);
        int expiresInSeconds = _accessTokenExpireMinutes * 60;
        var now = DateTime.UtcNow;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Role, user.Role),
            new("role", user.Role),
            new("type", "access")
        };

        if (!string.IsNullOrEmpty(user.Email))
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Email, user.Email));
            claims.Add(new Claim(ClaimTypes.Email, user.Email));
        }

        if (!string.IsNullOrEmpty(user.DisplayName))
        {
            claims.Add(new Claim("name", user.DisplayName));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = _issuer,
            Audience = _audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddSeconds(expiresInSeconds),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return (tokenHandler.WriteToken(token), expiresInSeconds);
    }

    public string GenerateRefreshToken()
    {
        byte[] randomBytes = RandomNumberGenerator.GetBytes(48);
        return Convert.ToBase64String(randomBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    public string HashRefreshToken(string rawToken)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(rawToken);
        byte[] hash = SHA256.HashData(bytes);
        return Convert.ToHexStringLower(hash);
    }
}
