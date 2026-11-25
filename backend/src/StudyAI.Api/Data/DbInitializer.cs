using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Security;
using StudyAI.Models;

namespace StudyAI.Data;

public static class DbInitializer
{
    public const string SystemAuthorUserId = "usr_system";

    /// <summary>
    /// Bootstraps an initial Admin user account with strict password validation.
    /// Idempotent: If an admin or a user with the given email already exists, no duplicate is created.
    /// Never logs or exposes the plaintext password.
    /// </summary>
    public static async Task<(bool Created, string Message)> BootstrapAdminAsync(
        StudyAIDbContext context,
        IPasswordHasher passwordHasher,
        string email,
        string password,
        string displayName = "Quản trị viên Hệ thống")
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return (false, "Invalid admin email address.");
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 10)
        {
            return (false, "Admin password must be at least 10 characters long.");
        }

        bool hasUpper = password.Any(char.IsUpper);
        bool hasLower = password.Any(char.IsLower);
        bool hasDigit = password.Any(char.IsDigit);
        if (!hasUpper || !hasLower || !hasDigit)
        {
            return (false, "Admin password must contain at least one uppercase letter, one lowercase letter, and one digit.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existingUser = await context.Users.FirstOrDefaultAsync(u => u.EmailNormalized == normalizedEmail);
        if (existingUser != null)
        {
            if (existingUser.Role == "admin")
            {
                return (false, $"Admin account for '{normalizedEmail}' already exists.");
            }
            return (false, $"User with email '{normalizedEmail}' already exists with role '{existingUser.Role}'.");
        }

        var adminUser = new User
        {
            Id = $"usr_admin_{Guid.NewGuid():N}",
            Email = email.Trim(),
            EmailNormalized = normalizedEmail,
            PasswordHash = passwordHasher.HashPassword(password),
            DisplayName = displayName.Trim(),
            Grade = "12",
            Role = "admin",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        context.Users.Add(adminUser);
        await context.SaveChangesAsync();
        return (true, $"Admin user '{normalizedEmail}' successfully bootstrapped.");
    }

    /// <summary>
    /// Bootstraps a learner user account for dev/testing fixtures.
    /// Idempotent: If user already exists, returns false.
    /// </summary>
    public static async Task<(bool Created, string Message)> BootstrapLearnerAsync(
        StudyAIDbContext context,
        IPasswordHasher passwordHasher,
        string email,
        string password,
        string displayName = "Học sinh Mẫu",
        string grade = "12")
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return (false, "Invalid learner email address.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existingUser = await context.Users.FirstOrDefaultAsync(u => u.EmailNormalized == normalizedEmail);
        if (existingUser != null)
        {
            return (false, $"User '{normalizedEmail}' already exists.");
        }

        var learnerUser = new User
        {
            Id = $"usr_learner_{Guid.NewGuid():N}",
            Email = email.Trim(),
            EmailNormalized = normalizedEmail,
            PasswordHash = passwordHasher.HashPassword(password),
            DisplayName = displayName.Trim(),
            Grade = grade,
            Role = "learner",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        context.Users.Add(learnerUser);
        await context.SaveChangesAsync();
        return (true, $"Learner user '{normalizedEmail}' bootstrapped.");
    }

    /// <summary>
    /// Bootstraps a staff / reviewer user account for dev/testing fixtures.
    /// Idempotent: If user already exists, returns false.
    /// </summary>
    public static async Task<(bool Created, string Message)> BootstrapStaffAsync(
        StudyAIDbContext context,
        IPasswordHasher passwordHasher,
        string email,
        string password,
        string role = "content",
        string displayName = "Biên tập viên Nội dung")
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return (false, "Invalid staff email address.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existingUser = await context.Users.FirstOrDefaultAsync(u => u.EmailNormalized == normalizedEmail);
        if (existingUser != null)
        {
            return (false, $"User '{normalizedEmail}' already exists.");
        }

        var staffUser = new User
        {
            Id = $"usr_{role}_{Guid.NewGuid():N}",
            Email = email.Trim(),
            EmailNormalized = normalizedEmail,
            PasswordHash = passwordHasher.HashPassword(password),
            DisplayName = displayName.Trim(),
            Grade = "12",
            Role = role,
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        context.Users.Add(staffUser);
        await context.SaveChangesAsync();
        return (true, $"Staff user '{normalizedEmail}' bootstrapped with role '{role}'.");
    }
}
