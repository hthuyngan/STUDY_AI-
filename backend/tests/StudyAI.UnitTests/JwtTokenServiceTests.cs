using Microsoft.Extensions.Configuration;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Security;
using Xunit;

namespace StudyAI.UnitTests;

public class JwtTokenServiceTests
{
    private readonly JwtTokenService _tokenService;

    public JwtTokenServiceTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "test_super_secret_key_with_at_least_32_characters_long",
                ["Jwt:AccessTokenExpireMinutes"] = "15"
            })
            .Build();

        _tokenService = new JwtTokenService(config);
    }

    [Fact]
    public void GenerateAccessToken_ShouldReturnNonEmptyTokenAndCorrectExpiration()
    {
        var user = new User
        {
            Id = "usr_test123",
            Email = "test@example.com",
            DisplayName = "Test User",
            Role = "learner"
        };

        var (token, expiresIn) = _tokenService.GenerateAccessToken(user);

        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.Equal(15 * 60, expiresIn);
    }

    [Fact]
    public void GenerateRefreshToken_ShouldReturnUniqueOpaqueTokens()
    {
        var token1 = _tokenService.GenerateRefreshToken();
        var token2 = _tokenService.GenerateRefreshToken();

        Assert.False(string.IsNullOrWhiteSpace(token1));
        Assert.False(string.IsNullOrWhiteSpace(token2));
        Assert.NotEqual(token1, token2);
    }

    [Fact]
    public void HashRefreshToken_ShouldBeDeterministicSha256()
    {
        string raw = "my_custom_random_refresh_token_12345";
        string hash1 = _tokenService.HashRefreshToken(raw);
        string hash2 = _tokenService.HashRefreshToken(raw);

        Assert.Equal(hash1, hash2);
        Assert.Equal(64, hash1.Length); // 64 hex characters for SHA-256
    }
}
