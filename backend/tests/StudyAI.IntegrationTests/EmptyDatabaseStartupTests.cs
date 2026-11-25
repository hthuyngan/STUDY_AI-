using System;
using System.Diagnostics;
using System.IO;
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
            await DropDatabaseBestEffortAsync(masterConnStr, cleanDbName);
        }
    }

    [Fact]
    public async Task Startup_WithSeedReferenceDataTrue_FailsClosedBeforeMigration_WithZeroSchemaOrDataWrite()
    {
        var cleanDbName = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var masterConnStr = GetMasterConnectionString();
        var cleanBuilder = new SqlConnectionStringBuilder(masterConnStr)
        {
            InitialCatalog = cleanDbName
        };
        var cleanDbConnStr = cleanBuilder.ConnectionString;

        DatabaseSafetyGuard.EnsureSafeTestDatabase(cleanDbConnStr, nameof(Startup_WithSeedReferenceDataTrue_FailsClosedBeforeMigration_WithZeroSchemaOrDataWrite));

        await using (var masterConn = new SqlConnection(masterConnStr))
        {
            await masterConn.OpenAsync();
            await using var cmd = masterConn.CreateCommand();
            cmd.CommandText = $"CREATE DATABASE [{cleanDbName}];";
            await cmd.ExecuteNonQueryAsync();
        }

        try
        {
            var apiAssemblyPath = typeof(Program).Assembly.Location;
            var apiContentRoot = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(apiAssemblyPath)!, "..", "..", ".."));

            var psi = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = $"\"{apiAssemblyPath}\"",
                WorkingDirectory = apiContentRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            psi.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
            psi.Environment["ConnectionStrings__DefaultConnection"] = cleanDbConnStr;
            psi.Environment["Database__ApplyMigrationsOnStartup"] = "true";
            psi.Environment["Database__SeedReferenceData"] = "true";
            psi.Environment["Jwt__SecretKey"] = "IntegrationTestSuperSecretKeyForJwtValidation1234567890!";

            using var process = Process.Start(psi)!;
            var stdErrTask = process.StandardError.ReadToEndAsync();
            var stdOutTask = process.StandardOutput.ReadToEndAsync();

            using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(30));
            await process.WaitForExitAsync(cts.Token);
            var stdErr = await stdErrTask;
            var stdOut = await stdOutTask;

            Assert.NotEqual(0, process.ExitCode);
            Assert.Contains("Database:SeedReferenceData is disabled in runtime StudyAI.Api", stdErr + stdOut);

            // Prove zero schema or data writes occurred (no __EFMigrationsHistory or domain tables created)
            await using var cleanConn = new SqlConnection(cleanDbConnStr);
            await cleanConn.OpenAsync();
            await using var countCmd = cleanConn.CreateCommand();
            countCmd.CommandText = "SELECT COUNT(*) FROM sys.tables;";
            var tableCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());
            Assert.Equal(0, tableCount);
        }
        finally
        {
            await DropDatabaseBestEffortAsync(masterConnStr, cleanDbName);
        }
    }

    private static async Task DropDatabaseBestEffortAsync(string masterConnStr, string dbName)
    {
        try
        {
            SqlConnection.ClearAllPools();
            await using var masterConn = new SqlConnection(masterConnStr);
            await masterConn.OpenAsync();
            await using var dropCmd = masterConn.CreateCommand();
            dropCmd.CommandText = $@"
                IF DB_ID('{dbName}') IS NOT NULL
                BEGIN
                    ALTER DATABASE [{dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                    DROP DATABASE [{dbName}];
                END";
            await dropCmd.ExecuteNonQueryAsync();
        }
        catch
        {
            // Best-effort cleanup of disposable test DB
        }
    }
}
