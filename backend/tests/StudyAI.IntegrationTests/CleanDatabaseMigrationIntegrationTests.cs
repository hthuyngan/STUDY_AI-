using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.IntegrationTests;

public class CleanDatabaseMigrationIntegrationTests
{
    private string GetMasterConnectionString()
    {
        // 1. Check CI environment variable
        var ciConn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (!string.IsNullOrWhiteSpace(ciConn))
        {
            var builder = new SqlConnectionStringBuilder(ciConn)
            {
                InitialCatalog = "master"
            };
            return builder.ConnectionString;
        }

        // 2. Local fallback
        return "Server=localhost\\SQLEXPRESS;Database=master;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";
    }

    [Fact]
    public async Task CleanDatabase_FullMigration_And_Seeding_Succeeds_Without_Error515()
    {
        var masterConnStr = GetMasterConnectionString();
        var cleanDbName = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var cleanDbConnStr = new SqlConnectionStringBuilder(masterConnStr)
        {
            InitialCatalog = cleanDbName
        }.ConnectionString;

        // 1. Create clean database on SQL Server
        await using (var masterConn = new SqlConnection(masterConnStr))
        {
            await masterConn.OpenAsync();
            await using var cmd = masterConn.CreateCommand();
            cmd.CommandText = $"CREATE DATABASE [{cleanDbName}];";
            await cmd.ExecuteNonQueryAsync();
        }

        try
        {
            // 2. Instantiate DbContext against clean database
            var options = new DbContextOptionsBuilder<StudyAIDbContext>()
                .UseSqlServer(cleanDbConnStr)
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                .Options;

            await using var db = new StudyAIDbContext(options);

            // 3. Migrate all migrations from scratch
            var pendingMigrations = (await db.Database.GetPendingMigrationsAsync()).ToList();
            Assert.NotEmpty(pendingMigrations);
            await db.Database.MigrateAsync();

            var appliedMigrations = (await db.Database.GetAppliedMigrationsAsync()).ToList();
            Assert.Contains(appliedMigrations, m => m.Contains("FixContentDefaultConstraints"));

            // 4. Seed Reference Data (Verifies sub_math12 with IsActive=true does not trigger Error 515)
            await DbInitializer.SeedReferenceDataAsync(db);

            var seededSubject = await db.ContentSubjects.FirstOrDefaultAsync(s => s.Code == "MATH12");
            Assert.NotNull(seededSubject);
            Assert.True(seededSubject.IsActive);
            Assert.Equal("sub_math12", seededSubject.Id);

            var seededChapter = await db.ContentChapters.FirstOrDefaultAsync(c => c.Id == "chp_math12_c1");
            Assert.NotNull(seededChapter);
            Assert.True(seededChapter.IsActive);

            var seededLesson = await db.ContentLessons.FirstOrDefaultAsync(l => l.Id == "les_math12_c1_b1");
            Assert.NotNull(seededLesson);
            Assert.Equal("published", seededLesson.Status);

            var seededQuestions = await db.ContentQuestions.Where(q => q.LessonId == "les_math12_c1_b1").ToListAsync();
            Assert.True(seededQuestions.Count >= 2);

            // 5. Test inserting new ContentSubject with default values
            var customSubject = new ContentSubject
            {
                Id = "sub_chem12_test",
                Name = "Hóa học 12 Test",
                Code = "CHEM12_TEST",
                Grade = "12",
                Description = "Môn học kiểm thử clean database",
                IsActive = true, // Default value in C# entity
                OrderIndex = 0,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.ContentSubjects.Add(customSubject);
            await db.SaveChangesAsync();

            // 6. Test inserting new ContentChapter with OrderIndex = 0
            var customChapter = new ContentChapter
            {
                Id = "chp_chem12_c1",
                SubjectId = customSubject.Id,
                Title = "Chương 1: Este - Lipit",
                OrderIndex = 0,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.ContentChapters.Add(customChapter);
            await db.SaveChangesAsync();

            // 7. Test inserting new ContentLesson with OrderIndex = 0
            var customLesson = new ContentLesson
            {
                Id = "les_chem12_c1_b1",
                ChapterId = customChapter.Id,
                Title = "Bài 1: Khái niệm về Este",
                Slug = "khai-niem-ve-este",
                OrderIndex = 0,
                Status = "draft",
                AuthorId = DbInitializer.SystemAuthorUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.ContentLessons.Add(customLesson);
            await db.SaveChangesAsync();

            // 8. Test inserting new ContentQuestion with OrderIndex = 0
            var customQuestion = new ContentQuestion
            {
                Id = "qst_chem12_c1_b1_q1",
                LessonId = customLesson.Id,
                ChapterId = customChapter.Id,
                SubjectId = customSubject.Id,
                Prompt = "Chất nào sau đây là este?",
                OptionsJson = "[\"CH3COOH\",\"CH3COOCH3\",\"C2H5OH\",\"HCHO\"]",
                CorrectAnswer = "CH3COOCH3",
                Explanation = "CH3COOCH3 là metyl axetat, thuộc loại este.",
                OrderIndex = 0,
                Difficulty = "easy",
                Type = "multiple-choice",
                Status = "published",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.ContentQuestions.Add(customQuestion);
            await db.SaveChangesAsync();

            // Verify clean database persistence
            var retrievedSubject = await db.ContentSubjects.AsNoTracking().FirstOrDefaultAsync(s => s.Id == "sub_chem12_test");
            Assert.NotNull(retrievedSubject);
            Assert.True(retrievedSubject.IsActive);
            Assert.Equal(0, retrievedSubject.OrderIndex);

            var retrievedQuestion = await db.ContentQuestions.AsNoTracking().FirstOrDefaultAsync(q => q.Id == "qst_chem12_c1_b1_q1");
            Assert.NotNull(retrievedQuestion);
            Assert.Equal("CH3COOCH3", retrievedQuestion.CorrectAnswer);
        }
        finally
        {
            // 9. Teardown clean test database
            try
            {
                await using var masterConn = new SqlConnection(masterConnStr);
                await masterConn.OpenAsync();
                await using var dropCmd = masterConn.CreateCommand();
                dropCmd.CommandText = $@"
ALTER DATABASE [{cleanDbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE [{cleanDbName}];
";
                await dropCmd.ExecuteNonQueryAsync();
            }
            catch
            {
                // Ignore teardown errors
            }
        }
    }
}
