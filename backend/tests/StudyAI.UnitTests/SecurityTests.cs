using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Security;
using Xunit;

namespace StudyAI.UnitTests;

public class SecurityTests
{
    private readonly Argon2PasswordHasher _hasher = new();

    [Fact]
    public void HashPassword_ShouldReturnValidArgon2String()
    {
        string plain = "SuperSecret123!";
        string hash = _hasher.HashPassword(plain);

        Assert.NotNull(hash);
        Assert.StartsWith("$argon2id$", hash);
    }

    [Fact]
    public void VerifyPassword_WithCorrectPassword_ShouldReturnTrue()
    {
        string plain = "CorrectPassword@2026";
        string hash = _hasher.HashPassword(plain);

        bool result = _hasher.VerifyPassword(plain, hash);
        Assert.True(result);
    }

    [Fact]
    public void VerifyPassword_WithWrongPassword_ShouldReturnFalse()
    {
        string plain = "CorrectPassword@2026";
        string hash = _hasher.HashPassword(plain);

        bool result = _hasher.VerifyPassword("WrongPassword!", hash);
        Assert.False(result);
    }

    [Fact]
    public void VerifyPassword_WithEmptyOrNull_ShouldReturnFalse()
    {
        Assert.False(_hasher.VerifyPassword("", "hash"));
        Assert.False(_hasher.VerifyPassword("password", ""));
    }
}
