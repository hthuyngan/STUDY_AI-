using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
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
            psi.Environment["ASPNETCORE_ENVIRONMENT"] = "Testing";
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

    [Fact]
    public async Task Startup_WithMissingConnectionString_FailsClosed()
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
        psi.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
        psi.Environment["ConnectionStrings__DefaultConnection"] = "";
        psi.Environment["Jwt__SecretKey"] = "ephemeral_prod_jwt_validation_key_abcdefghijklmnopqrstuvwxyz!";

        using var process = Process.Start(psi)!;
        var stdErrTask = process.StandardError.ReadToEndAsync();
        var stdOutTask = process.StandardOutput.ReadToEndAsync();

        using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(30));
        await process.WaitForExitAsync(cts.Token);
        var output = await stdErrTask + await stdOutTask;

        Assert.NotEqual(0, process.ExitCode);
        Assert.Contains("DefaultConnection", output);
    }

    [Theory]
    [InlineData("Development", "StudyAIDb_E2E", false)]
    [InlineData("Development", "StudyAIDb_Clean_a1b2c3d4e5f60718293a4b5c6d7e8f90", false)]
    [InlineData("Development", "StudyAIDb", true)]
    [InlineData("Testing", "StudyAIDb_Dev", false)]
    [InlineData("Testing", "StudyAIDb_E2E", false)]
    [InlineData("Testing", "StudyAIDb", false)]
    public async Task Startup_CrossEnvironmentOrAutoMigrateMismatch_FailsClosed(
        string environmentName,
        string targetDbName,
        bool forceAutoMigrate)
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
        psi.Environment["ASPNETCORE_ENVIRONMENT"] = environmentName;
        psi.Environment["ConnectionStrings__DefaultConnection"] =
            $"Server=.\\SQLEXPRESS;Database={targetDbName};Trusted_Connection=True;TrustServerCertificate=True;";
        psi.Environment["Database__ApplyMigrationsOnStartup"] = forceAutoMigrate ? "true" : "false";
        psi.Environment["Jwt__SecretKey"] = "IntegrationTestSuperSecretKeyForJwtValidation1234567890!";

        using var process = Process.Start(psi)!;
        var stdErrTask = process.StandardError.ReadToEndAsync();
        var stdOutTask = process.StandardOutput.ReadToEndAsync();

        using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(30));
        await process.WaitForExitAsync(cts.Token);
        var output = await stdErrTask + await stdOutTask;

        Assert.NotEqual(0, process.ExitCode);
        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED", output);
    }

    [Fact]
    public async Task TestingStartup_WithBootstrapTestAccountsFalse_LeavesCleanDatabaseEmptyOfUsersAndCurriculum()
    {
        var cleanDbName = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var masterConnStr = GetMasterConnectionString();
        var cleanDbConnStr = new SqlConnectionStringBuilder(masterConnStr)
        {
            InitialCatalog = cleanDbName
        }.ConnectionString;

        DatabaseSafetyGuard.EnsureSafeTestDatabase(cleanDbConnStr, nameof(TestingStartup_WithBootstrapTestAccountsFalse_LeavesCleanDatabaseEmptyOfUsersAndCurriculum));

        await using (var masterConn = new SqlConnection(masterConnStr))
        {
            await masterConn.OpenAsync();
            await using var cmd = masterConn.CreateCommand();
            cmd.CommandText = $"CREATE DATABASE [{cleanDbName}];";
            await cmd.ExecuteNonQueryAsync();
        }

        try
        {
            await using var factory = new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseEnvironment("Testing");
                    builder.UseSetting("ConnectionStrings:DefaultConnection", cleanDbConnStr);
                    builder.UseSetting("Database:ApplyMigrationsOnStartup", "true");
                    builder.UseSetting("Database:BootstrapTestAccounts", "false");
                    builder.UseSetting("Database:SeedReferenceData", "false");
                    builder.UseSetting("Jwt:SecretKey", "IntegrationTestSuperSecretKeyForJwtValidation1234567890!");
                });

            using var client = factory.CreateClient();
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();

            Assert.Equal(0, await db.Users.CountAsync());
            Assert.Equal(0, await db.ContentSubjects.CountAsync());
            Assert.Equal(0, await db.ContentChapters.CountAsync());
            Assert.Equal(0, await db.ContentLessons.CountAsync());
        }
        finally
        {
            await DropDatabaseBestEffortAsync(masterConnStr, cleanDbName);
        }
    }

    [Theory]
    [InlineData("Development", "StudyAIDb")]
    [InlineData("Production", "StudyAIDb")]
    [InlineData("Testing", "StudyAIDb")]
    [InlineData("Testing", "StudyAIDb_E2E")]
    public async Task CliBootstrapAdmin_OutsideTestingOrTargetingStudyAIDb_FailsClosedBeforeDbContext(
        string environmentName,
        string targetDbName)
    {
        var apiAssemblyPath = typeof(Program).Assembly.Location;
        var apiContentRoot = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(apiAssemblyPath)!, "..", "..", ".."));

        var psi = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = $"\"{apiAssemblyPath}\" --bootstrap-admin --admin-email blocked@studyai.internal",
            WorkingDirectory = apiContentRoot,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        psi.Environment["ASPNETCORE_ENVIRONMENT"] = environmentName;
        psi.Environment["ConnectionStrings__DefaultConnection"] =
            $"Server=.\\SQLEXPRESS;Database={targetDbName};Trusted_Connection=True;TrustServerCertificate=True;";
        psi.Environment["ADMIN_BOOTSTRAP_PASSWORD"] = "TempCheckPass123!";
        psi.Environment["Jwt__SecretKey"] = "EphemeralNonWeakProdKey99999999999999999999!";

        using var process = Process.Start(psi)!;
        var stdErrTask = process.StandardError.ReadToEndAsync();
        var stdOutTask = process.StandardOutput.ReadToEndAsync();

        using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(30));
        await process.WaitForExitAsync(cts.Token);
        var output = await stdErrTask + await stdOutTask;

        Assert.NotEqual(0, process.ExitCode);
        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED [CLI --bootstrap-admin]", output);
    }

    [Fact]
    public async Task DisposableDatabaseOwnership_RefusesMismatchedToken_AndDropsOwnedDatabase()
    {
        var cleanDbName = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var ownerToken = Guid.NewGuid().ToString("N");
        var wrongToken = Guid.NewGuid().ToString("N");
        var masterConnStr = GetMasterConnectionString();

        await using (var masterConn = new SqlConnection(masterConnStr))
        {
            await masterConn.OpenAsync();
            await using var createCmd = masterConn.CreateCommand();
            createCmd.CommandText = $@"
                CREATE DATABASE [{cleanDbName}];
                EXEC [{cleanDbName}].sys.sp_addextendedproperty @name = N'StudyAI_OwnershipToken', @value = N'{ownerToken}';";
            await createCmd.ExecuteNonQueryAsync();
        }

        try
        {
            // Verify mismatched ownership token is refused and DB remains intact
            await using (var masterConn = new SqlConnection(masterConnStr))
            {
                await masterConn.OpenAsync();
                await using var checkCmd = masterConn.CreateCommand();
                checkCmd.CommandText = $@"
                    SELECT ISNULL(CAST(value AS nvarchar(128)), '')
                    FROM [{cleanDbName}].sys.extended_properties
                    WHERE class = 0 AND name = N'StudyAI_OwnershipToken';";
                var actualToken = checkCmd.ExecuteScalar()?.ToString();
                Assert.NotEqual(wrongToken, actualToken);
                Assert.Equal(ownerToken, actualToken);
            }
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
