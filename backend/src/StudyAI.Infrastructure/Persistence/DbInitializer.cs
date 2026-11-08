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

        // 3. Seed initial questions for Lesson 1 if none exist
        var existingQuestions = await context.ContentQuestions.AnyAsync(q => q.LessonId == "les_math12_c1_b1");
        if (!existingQuestions)
        {
            var q1 = new ContentQuestion
            {
                Id = "qst_math12_c1_b1_q1",
                LessonId = "les_math12_c1_b1",
                ChapterId = "chp_math12_c1",
                SubjectId = "sub_math12",
                Prompt = "Cho hàm số $y = f(x)$ có bảng biến thiên với đạo hàm $f'(x) < 0$ trên $(-1; 1)$ và $f'(x) > 0$ trên $(1; +\\infty)$. Mệnh đề nào dưới đây đúng?",
                OptionsJson = "[\"Hàm số đồng biến trên khoảng $(-\\infty; 1)$\",\"Hàm số nghịch biến trên khoảng $(-1; 1)$\",\"Hàm số đồng biến trên khoảng $(-1; 3)$\",\"Hàm số nghịch biến trên khoảng $(1; +\\infty)$\"]",
                CorrectAnswer = "Hàm số nghịch biến trên khoảng (-1; 1)",
                Explanation = "Dựa vào dấu của đạo hàm, $f'(x) < 0$ với mọi $x \\in (-1; 1)$ nên hàm số nghịch biến trên khoảng $(-1; 1)$.",
                Topic = "Tính đơn điệu",
                Difficulty = "easy",
                Type = "multiple-choice",
                Status = "published",
                OrderIndex = 1,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            var q2 = new ContentQuestion
            {
                Id = "qst_math12_c1_b1_q2",
                LessonId = "les_math12_c1_b1",
                ChapterId = "chp_math12_c1",
                SubjectId = "sub_math12",
                Prompt = "Tìm tất cả các giá trị thực của tham số $m$ để hàm số $y = x^3 - 3mx^2 + 3(m^2 - 1)x$ đạt cực tiểu tại $x = 2$.",
                OptionsJson = "[\"m = 1\",\"m = 3\",\"m = 1 \\\\text{ hoặc } m = 3\",\"Không tồn tại m\"]",
                CorrectAnswer = "m = 1",
                Explanation = "Đạo hàm: $y' = 3(x^2 - 2mx + m^2 - 1)$. $y'(2) = 0 \\Leftrightarrow m^2 - 4m + 3 = 0 \\Leftrightarrow m = 1$ hoặc $m = 3$. Đạo hàm cấp hai $y'' = 6x - 6m$. Với $m = 1$, $y''(2) = 12 - 6 = 6 > 0$ (thỏa mãn cực tiểu). Với $m = 3$, $y''(2) = -6 < 0$ (cực đại). Do đó chọn $m = 1$.",
                Topic = "Cực trị hàm số",
                Difficulty = "medium",
                Type = "multiple-choice",
                Status = "published",
                OrderIndex = 2,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            context.ContentQuestions.AddRange(q1, q2);
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
