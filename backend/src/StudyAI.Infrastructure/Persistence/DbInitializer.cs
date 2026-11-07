using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Domain.Entities;

namespace StudyAI.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(StudyAIDbContext context, IPasswordHasher passwordHasher)
    {
        // Ensure database tables exist
        await context.Database.EnsureCreatedAsync();

        // 1. Seed Admin User
        var adminEmail = "admin@studyai.internal";
        var existingAdmin = await context.Users.FirstOrDefaultAsync(u => u.EmailNormalized == adminEmail);
        if (existingAdmin == null)
        {
            var adminUser = new User
            {
                Id = "usr_admin_default",
                Email = adminEmail,
                EmailNormalized = adminEmail,
                PasswordHash = passwordHasher.HashPassword("Admin@123456"),
                DisplayName = "Quản trị viên Hệ thống",
                Grade = "12",
                Role = "admin",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            context.Users.Add(adminUser);
        }

        // 2. Seed Learner User
        var learnerEmail = "learner@studyai.internal";
        var existingLearner = await context.Users.FirstOrDefaultAsync(u => u.EmailNormalized == learnerEmail);
        if (existingLearner == null)
        {
            var learnerUser = new User
            {
                Id = "usr_learner_default",
                Email = learnerEmail,
                EmailNormalized = learnerEmail,
                PasswordHash = passwordHasher.HashPassword("Learner@123456"),
                DisplayName = "Học sinh Mẫu",
                Grade = "12",
                Role = "learner",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            context.Users.Add(learnerUser);
        }

        // 3. Seed Content Subject (Toán 12)
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
                AuthorId = "usr_admin_default",
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
        }

        await context.SaveChangesAsync();
    }
}
