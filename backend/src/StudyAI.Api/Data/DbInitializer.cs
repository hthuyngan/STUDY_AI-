using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Security;
using StudyAI.Models;

namespace StudyAI.Data;

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

        // 2. Seed Content Subjects (Toán 10, Toán 11, Toán 12 theo chuẩn GDPT 2018)
        var math10 = await context.ContentSubjects.FirstOrDefaultAsync(s => s.Id == "sub_math10" || s.Code == "MATH10");
        if (math10 == null)
        {
            context.ContentSubjects.Add(new ContentSubject
            {
                Id = "sub_math10",
                Name = "Toán 10",
                Code = "MATH10",
                Grade = "10",
                Description = "Chương trình Toán học Lớp 10 theo chuẩn GDPT 2018",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            });
            await context.SaveChangesAsync();
        }

        // Seed Math 10 Chapter & Lesson & Questions if not existing
        var math10Chapter = await context.ContentChapters.FirstOrDefaultAsync(c => c.Id == "chp_math10_c1" || (c.SubjectId == "sub_math10" && c.OrderIndex == 1));
        if (math10Chapter == null)
        {
            math10Chapter = new ContentChapter
            {
                Id = "chp_math10_c1",
                SubjectId = "sub_math10",
                Title = "Chương 1: Mệnh đề và tập hợp",
                OrderIndex = 1,
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.ContentChapters.Add(math10Chapter);
            await context.SaveChangesAsync();
        }

        var math10Lesson = await context.ContentLessons.FirstOrDefaultAsync(l => l.Id == "les_math10_c1_b1");
        if (math10Lesson == null)
        {
            math10Lesson = new ContentLesson
            {
                Id = "les_math10_c1_b1",
                ChapterId = math10Chapter.Id,
                Title = "Bài 1: Mệnh đề toán học",
                Slug = "menh-de-toan-hoc",
                OrderIndex = 1,
                Status = "published",
                AuthorId = SystemAuthorUserId,
                Introduction = "Khái niệm mệnh đề, mệnh đề phủ định, mệnh đề kéo theo và mệnh đề tương đương trong toán học.",
                DefinitionsJson = "[\"Mệnh đề là một khẳng định đúng hoặc một khẳng định sai. Một khẳng định không thể vừa đúng vừa sai.\"]",
                FormulasJson = "[\"P \\\\Rightarrow Q\"]",
                ExamplesJson = "[\"Ví dụ 1: 'Số 12 chia hết cho 3' là một mệnh đề đúng.\"]",
                ImportantNotesJson = "[\"Câu cảm thán, câu hỏi không phải là mệnh đề.\"]",
                SummaryPointsJson = "[\"Phân biệt mệnh đề với câu nói thông thường và xác định tính đúng sai.\"]",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            context.ContentLessons.Add(math10Lesson);
            await context.SaveChangesAsync();
        }

        var math10Questions = await context.ContentQuestions.AnyAsync(q => q.LessonId == math10Lesson.Id);
        if (!math10Questions)
        {
            context.ContentQuestions.AddRange(
                new ContentQuestion
                {
                    Id = "qst_math10_c1_b1_q1",
                    LessonId = math10Lesson.Id,
                    ChapterId = math10Chapter.Id,
                    SubjectId = "sub_math10",
                    Grade = "10",
                    Prompt = "Trong các câu sau, câu nào là mệnh đề toán học?",
                    OptionsJson = "[\"Hôm nay trời đẹp quá!\",\"Số 17 là số nguyên tố.\",\"Bạn có thích học Toán không?\",\"x + 1 > 0.\"]",
                    CorrectAnswer = "Số 17 là số nguyên tố.",
                    Explanation = "\"Số 17 là số nguyên tố\" là một khẳng định chắc chắn đúng, do đó là mệnh đề toán học.",
                    Topic = "Mệnh đề toán học",
                    Difficulty = "easy",
                    Type = "multiple-choice",
                    Status = "published",
                    AuthorId = SystemAuthorUserId,
                    ReviewedBy = SystemAuthorUserId,
                    SourceType = "manual",
                    CopyrightStatus = "proprietary",
                    OrderIndex = 1,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                new ContentQuestion
                {
                    Id = "qst_math10_c1_b1_q2",
                    LessonId = math10Lesson.Id,
                    ChapterId = math10Chapter.Id,
                    SubjectId = "sub_math10",
                    Grade = "10",
                    Prompt = "Mệnh đề phủ định của mệnh đề $P: \"\\forall x \\in \\mathbb{R}, x^2 + 1 > 0\"$ là:",
                    OptionsJson = "[\"\\\\overline{P}: \\\"\\\\exists x \\\\in \\\\mathbb{R}, x^2 + 1 \\\\le 0\\\"\",\"\\\\overline{P}: \\\"\\\\forall x \\\\in \\\\mathbb{R}, x^2 + 1 \\\\le 0\\\"\",\"\\\\overline{P}: \\\"\\\\exists x \\\\in \\\\mathbb{R}, x^2 + 1 < 0\\\"\",\"\\\\overline{P}: \\\"\\\\forall x \\\\in \\\\mathbb{R}, x^2 + 1 < 0\\\"\"]",
                    CorrectAnswer = "\\overline{P}: \"\\exists x \\in \\mathbb{R}, x^2 + 1 \\le 0\"",
                    Explanation = "Phủ định của mệnh đề chứa ký hiệu $\\forall$ là mệnh đề chứa ký hiệu $\\exists$, và phủ định của dấu $>$ là dấu $\\le$.",
                    Topic = "Mệnh đề phủ định",
                    Difficulty = "medium",
                    Type = "multiple-choice",
                    Status = "published",
                    AuthorId = SystemAuthorUserId,
                    ReviewedBy = SystemAuthorUserId,
                    SourceType = "manual",
                    CopyrightStatus = "proprietary",
                    OrderIndex = 2,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        var math11 = await context.ContentSubjects.FirstOrDefaultAsync(s => s.Id == "sub_math11" || s.Code == "MATH11");
        if (math11 == null)
        {
            context.ContentSubjects.Add(new ContentSubject
            {
                Id = "sub_math11",
                Name = "Toán 11",
                Code = "MATH11",
                Grade = "11",
                Description = "Chương trình Toán học Lớp 11 theo chuẩn GDPT 2018",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            });
            await context.SaveChangesAsync();
        }

        // Seed Math 11 Chapter & Lesson & Questions if not existing
        var math11Chapter = await context.ContentChapters.FirstOrDefaultAsync(c => c.Id == "chp_math11_c1" || (c.SubjectId == "sub_math11" && c.OrderIndex == 1));
        if (math11Chapter == null)
        {
            math11Chapter = new ContentChapter
            {
                Id = "chp_math11_c1",
                SubjectId = "sub_math11",
                Title = "Chương 1: Hàm số lượng giác và phương trình lượng giác",
                OrderIndex = 1,
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.ContentChapters.Add(math11Chapter);
            await context.SaveChangesAsync();
        }

        var math11Lesson = await context.ContentLessons.FirstOrDefaultAsync(l => l.Id == "les_math11_c1_b1");
        if (math11Lesson == null)
        {
            math11Lesson = new ContentLesson
            {
                Id = "les_math11_c1_b1",
                ChapterId = math11Chapter.Id,
                Title = "Bài 1: Giá trị lượng giác của góc lượng giác",
                Slug = "gia-tri-luong-giac-cua-goc-luong-giac",
                OrderIndex = 1,
                Status = "published",
                AuthorId = SystemAuthorUserId,
                Introduction = "Góc lượng giác, đơn vị radian và các giá trị lượng giác của góc lượng giác trên đường tròn lượng giác.",
                DefinitionsJson = "[\"Trên đường tròn lượng giác, điểm biểu diễn góc $\\\\alpha$ có tọa độ $(x; y)$. Khi đó $\\\\cos \\\\alpha = x, \\\\sin \\\\alpha = y$.\"]",
                FormulasJson = "[\"\\\\sin^2 \\\\alpha + \\\\cos^2 \\\\alpha = 1\"]",
                ExamplesJson = "[\"Ví dụ 1: Tính các giá trị lượng giác của góc $\\\\alpha = \\\\frac{\\\\pi}{3}$.\"]",
                ImportantNotesJson = "[\"Xác định đúng cung phần tư để xét dấu của các giá trị lượng giác.\"]",
                SummaryPointsJson = "[\"Nắm vững hệ thức cơ bản giữa các giá trị lượng giác của cùng một góc.\"]",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            context.ContentLessons.Add(math11Lesson);
            await context.SaveChangesAsync();
        }

        var math11Questions = await context.ContentQuestions.AnyAsync(q => q.LessonId == math11Lesson.Id);
        if (!math11Questions)
        {
            context.ContentQuestions.AddRange(
                new ContentQuestion
                {
                    Id = "qst_math11_c1_b1_q1",
                    LessonId = math11Lesson.Id,
                    ChapterId = math11Chapter.Id,
                    SubjectId = "sub_math11",
                    Grade = "11",
                    Prompt = "Đổi số đo góc $60^\\circ$ sang đơn vị radian ta được:",
                    OptionsJson = "[\"\\\\frac{\\\\pi}{3}\",\"\\\\frac{\\\\pi}{6}\",\"\\\\frac{\\\\pi}{4}\",\"\\\\frac{\\\\pi}{2}\"]",
                    CorrectAnswer = "\\frac{\\pi}{3}",
                    Explanation = "Công thức đổi: $\\alpha = a^\\circ \\cdot \\frac{\\pi}{180^\\circ} = 60 \\cdot \\frac{\\pi}{180} = \\frac{\\pi}{3}$ rad.",
                    Topic = "Đổi đơn vị đo góc",
                    Difficulty = "easy",
                    Type = "multiple-choice",
                    Status = "published",
                    AuthorId = SystemAuthorUserId,
                    ReviewedBy = SystemAuthorUserId,
                    SourceType = "manual",
                    CopyrightStatus = "proprietary",
                    OrderIndex = 1,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                new ContentQuestion
                {
                    Id = "qst_math11_c1_b1_q2",
                    LessonId = math11Lesson.Id,
                    ChapterId = math11Chapter.Id,
                    SubjectId = "sub_math11",
                    Grade = "11",
                    Prompt = "Cho góc $\\alpha$ thỏa mãn $\\frac{\\pi}{2} < \\alpha < \\pi$. Khẳng định nào sau đây là đúng?",
                    OptionsJson = "[\"\\\\sin \\\\alpha > 0, \\\\cos \\\\alpha < 0\",\"\\\\sin \\\\alpha < 0, \\\\cos \\\\alpha < 0\",\"\\\\sin \\\\alpha > 0, \\\\cos \\\\alpha > 0\",\"\\\\sin \\\\alpha < 0, \\\\cos \\\\alpha > 0\"]",
                    CorrectAnswer = "\\sin \\alpha > 0, \\cos \\alpha < 0",
                    Explanation = "Góc $\\alpha$ thuộc góc phần tư thứ II nên $\\sin \\alpha > 0$ và $\\cos \\alpha < 0$.",
                    Topic = "Dấu của giá trị lượng giác",
                    Difficulty = "medium",
                    Type = "multiple-choice",
                    Status = "published",
                    AuthorId = SystemAuthorUserId,
                    ReviewedBy = SystemAuthorUserId,
                    SourceType = "manual",
                    CopyrightStatus = "proprietary",
                    OrderIndex = 2,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        var subjectCode = "MATH12";
        var existingSubject = await context.ContentSubjects.FirstOrDefaultAsync(s => s.Code == subjectCode || s.Id == "sub_math12");
        if (existingSubject == null)
        {
            existingSubject = new ContentSubject
            {
                Id = "sub_math12",
                Name = "Toán 12",
                Code = subjectCode,
                Grade = "12",
                Description = "Chương trình Toán học Lớp 12 - Bộ sách Kết nối tri thức với cuộc sống",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.ContentSubjects.Add(existingSubject);
            await context.SaveChangesAsync();
        }

        var chapter12 = await context.ContentChapters.FirstOrDefaultAsync(c => c.Id == "chp_math12_c1" || (c.SubjectId == "sub_math12" && c.OrderIndex == 1));
        if (chapter12 == null)
        {
            chapter12 = new ContentChapter
            {
                Id = "chp_math12_c1",
                SubjectId = "sub_math12",
                Title = "Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số",
                OrderIndex = 1,
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.ContentChapters.Add(chapter12);
            await context.SaveChangesAsync();
        }

        var lesson12 = await context.ContentLessons.FirstOrDefaultAsync(l => l.Id == "les_math12_c1_b1");
        if (lesson12 == null)
        {
            lesson12 = new ContentLesson
            {
                Id = "les_math12_c1_b1",
                ChapterId = chapter12.Id,
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
            context.ContentLessons.Add(lesson12);
            await context.SaveChangesAsync();
        }

        // 2b. Seed standard THPT 12 subjects if not already existing
        var standardSubjects = new (string Id, string Code, string Name, string Desc, int Order)[]
        {
            ("sub_phys12", "PHYS12", "Vật lý 12", "Chương trình Vật lý Lớp 12", 2),
            ("sub_chem12", "CHEM12", "Hóa học 12", "Chương trình Hóa học Lớp 12", 3),
            ("sub_bio12", "BIO12", "Sinh học 12", "Chương trình Sinh học Lớp 12", 4),
            ("sub_lit12", "LIT12", "Ngữ văn 12", "Chương trình Ngữ văn Lớp 12", 5),
            ("sub_eng12", "ENG12", "Tiếng Anh 12", "Chương trình Tiếng Anh Lớp 12", 6),
            ("sub_hist12", "HIST12", "Lịch sử 12", "Chương trình Lịch sử Lớp 12", 7),
            ("sub_geo12", "GEO12", "Địa lý 12", "Chương trình Địa lý Lớp 12", 8),
            ("sub_civic12", "CIVIC12", "Giáo dục kinh tế và pháp luật 12", "Chương trình Giáo dục kinh tế và pháp luật 12", 9),
        };

        foreach (var s in standardSubjects)
        {
            var exists = await context.ContentSubjects.AnyAsync(x => x.Code == s.Code || x.Id == s.Id);
            if (!exists)
            {
                context.ContentSubjects.Add(new ContentSubject
                {
                    Id = s.Id,
                    Code = s.Code,
                    Name = s.Name,
                    Grade = "12",
                    Description = s.Desc,
                    OrderIndex = s.Order,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }
        }
        await context.SaveChangesAsync();

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
                Grade = "12",
                Prompt = "Cho hàm số $y = f(x)$ có bảng biến thiên với đạo hàm $f'(x) < 0$ trên $(-1; 1)$ và $f'(x) > 0$ trên $(1; +\\infty)$. Mệnh đề nào dưới đây đúng?",
                OptionsJson = "[\"Hàm số đồng biến trên khoảng $(-\\infty; 1)$\",\"Hàm số nghịch biến trên khoảng $(-1; 1)$\",\"Hàm số đồng biến trên khoảng $(-1; 3)$\",\"Hàm số nghịch biến trên khoảng $(1; +\\infty)$\"]",
                CorrectAnswer = "Hàm số nghịch biến trên khoảng (-1; 1)",
                Explanation = "Dựa vào dấu của đạo hàm, $f'(x) < 0$ với mọi $x \\in (-1; 1)$ nên hàm số nghịch biến trên khoảng $(-1; 1)$.",
                Topic = "Tính đơn điệu",
                Difficulty = "easy",
                Type = "multiple-choice",
                Status = "published",
                AuthorId = SystemAuthorUserId,
                ReviewedBy = SystemAuthorUserId,
                SourceType = "manual",
                CopyrightStatus = "proprietary",
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
                Grade = "12",
                Prompt = "Tìm tất cả các giá trị thực của tham số $m$ để hàm số $y = x^3 - 3mx^2 + 3(m^2 - 1)x$ đạt cực tiểu tại $x = 2$.",
                OptionsJson = "[\"m = 1\",\"m = 3\",\"m = 1 \\\\text{ hoặc } m = 3\",\"Không tồn tại m\"]",
                CorrectAnswer = "m = 1",
                Explanation = "Đạo hàm: $y' = 3(x^2 - 2mx + m^2 - 1)$. $y'(2) = 0 \\Leftrightarrow m^2 - 4m + 3 = 0 \\Leftrightarrow m = 1$ hoặc $m = 3$. Đạo hàm cấp hai $y'' = 6x - 6m$. Với $m = 1$, $y''(2) = 12 - 6 = 6 > 0$ (thỏa mãn cực tiểu). Với $m = 3$, $y''(2) = -6 < 0$ (cực đại). Do đó chọn $m = 1$.",
                Topic = "Cực trị hàm số",
                Difficulty = "medium",
                Type = "multiple-choice",
                Status = "published",
                AuthorId = SystemAuthorUserId,
                ReviewedBy = SystemAuthorUserId,
                SourceType = "manual",
                CopyrightStatus = "proprietary",
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
