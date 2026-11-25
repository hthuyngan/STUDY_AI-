using System;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using Xunit;

namespace StudyAI.IntegrationTests;

/// <summary>
/// Phase P00 (CURR-002): Verifies that starting StudyAI.Api against an empty authorized database
/// creates zero sample curriculum subjects, chapters, lessons, questions, videos, or progress.
/// </summary>
public class EmptyDatabaseStartupTests
{
    private static string GetMasterConnectionString()
    {
        var ciConn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (!string.IsNullOrWhiteSpace(ciConn))
        {
            var builder = new SqlConnectionStringBuilder(ciConn)
            {
                InitialCatalog = "master"
            };
            return builder.ConnectionString;
        }

        return "Server=.\\SQLEXPRESS;Database=master;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";
    }

    [Fact]
    public async Task EmptyDatabaseStartup_CreatesZeroCurriculumOrLearningData()
    {
        var cleanDbName = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var masterConnStr = GetMasterConnectionString();
        var cleanBuilder = new SqlConnectionStringBuilder(masterConnStr)
        {
            InitialCatalog = cleanDbName
        };
        var cleanDbConnStr = cleanBuilder.ConnectionString;

        DatabaseSafetyGuard.EnsureSafeTestDatabase(cleanDbConnStr, nameof(EmptyDatabaseStartupTests));

        await using (var masterConn = new SqlConnection(masterConnStr))
        {
            await masterConn.OpenAsync();
            await using var cmd = masterConn.CreateCommand();
            cmd.CommandText = $"CREATE DATABASE [{cleanDbName}];";
            await cmd.ExecuteNonQueryAsync();
        }

        try
        {
            var options = new DbContextOptionsBuilder<StudyAIDbContext>()
                .UseSqlServer(cleanDbConnStr)
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                .Options;

            await using (var migrateDb = new StudyAIDbContext(options))
            {
                await migrateDb.Database.MigrateAsync();
            }

            await using var factory = new StudyAIApiFixture
            {
                TestConnectionStringOverride = cleanDbConnStr
            };

            using var client = factory.CreateClient();
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();

            Assert.Equal(0, await db.ContentSubjects.CountAsync());
            Assert.Equal(0, await db.ContentChapters.CountAsync());
            Assert.Equal(0, await db.ContentLessons.CountAsync());
            Assert.Equal(0, await db.ContentQuestions.CountAsync());
            Assert.Equal(0, await db.ContentLessonVideos.CountAsync());
            Assert.Equal(0, await db.LessonProgresses.CountAsync());
        }
        finally
        {
            try
            {
                SqlConnection.ClearAllPools();
                await using var masterConn = new SqlConnection(masterConnStr);
                await masterConn.OpenAsync();
                await using var dropCmd = masterConn.CreateCommand();
                dropCmd.CommandText = $@"
                    IF DB_ID('{cleanDbName}') IS NOT NULL
                    BEGIN
                        ALTER DATABASE [{cleanDbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                        DROP DATABASE [{cleanDbName}];
                    END";
                await dropCmd.ExecuteNonQueryAsync();
            }
            catch
            {
                // Best-effort cleanup of disposable test DB
            }
        }
    }
}
