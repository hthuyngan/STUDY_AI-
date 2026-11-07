using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Domain.Entities;

namespace StudyAI.Infrastructure.Persistence;

public static class DbInitializer
{
    public const string SystemAuthorUserId = "usr_system";

    /// <summary>
    /// Seeds core curriculum reference data (Subjects, Chapters, Lessons).
    /// Does NOT seed any user accounts or credentials.
    /// Creates an unauthenticated service identity for FK integrity.
    /// </summary>
    public static async Task SeedReferenceDataAsync(StudyAIDbContext context)
    {
        // 1. Ensure an unauthenticated system identity exists for FK constraint on reference curriculum
        var systemUser = await context.Users.FirstOrDefaultAsync(u => u.Id == SystemAuthorUserId);
        if (systemUser == null)
        {
            systemUser = new User
            {
                Id = SystemAuthorUserId,
                Email = "system@studyai.internal",
                EmailNormalized = "system@studyai.internal",
                DisplayName = "Hệ thống STUDY_AI",
                Role = "admin",
                Status = "system",
                PasswordHash = null, // Null password prevents any authentication
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            context.Users.Add(systemUser);
            await context.SaveChangesAsync();
        }

        // 2. Seed Content Subject (Toán 12)
        var subjectCode = "MATH12";
        var existingSubject = await context.ContentSubjects.FirstOrDefaultAsync(s => s.Code == subjectCode);
        if (existingSubject == null)
        {
            var subject = new ContentSubject
            {
                Id = "sub_math12",
                Name = "Toán 12",
                Code = subjectCode,
                Grade = "12",
                Description = "Chương trình Toán học Lớp 12 - Bộ sách Kết nối tri thức với cuộc sống",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.ContentSubjects.Add(subject);

            // Seed Chapter 1
            var chapter1 = new ContentChapter
            {
                Id = "chp_math12_c1",
                SubjectId = subject.Id,
                Title = "Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số",
                OrderIndex = 1,
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.ContentChapters.Add(chapter1);

            // Seed Lesson 1
            var lesson1 = new ContentLesson
            {
                Id = "les_math12_c1_b1",
                ChapterId = chapter1.Id,
                Title = "Bài 1: Tính đơn điệu và cực trị của hàm số",
                Slug = "tinh-don-dieu-va-cuc-tri",
                OrderIndex = 1,
                Status = "published",
                AuthorId = SystemAuthorUserId,
                Introduction = "Tổng quan về điều kiện đủ để hàm số đồng biến, nghịch biến và các điểm cực trị trên tập xác định.",
                DefinitionsJson = "[\"Định lý 1: Cho hàm số f có đạo hàm trên K. Nếu f'(x) > 0 thì hàm số đồng biến trên K.\"]",
                FormulasJson = "[\"f'(x) \\\\ge 0 \\\\forall x \\\\in K\"]",
                ExamplesJson = "[\"Ví dụ 1: Xét tính đơn điệu của hàm số y = x^3 - 3x^2 + 2\"]",
                ImportantNotesJson = "[\"Dấu của đạo hàm chỉ đổi khi đi qua nghiệm bội lẻ.\"]",
                SummaryPointsJson = "[\"Nắm vững các bước lập bảng biến thiên và tìm cực trị.\"]",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            context.ContentLessons.Add(lesson1);

            await context.SaveChangesAsync();
        }
    }

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
}
