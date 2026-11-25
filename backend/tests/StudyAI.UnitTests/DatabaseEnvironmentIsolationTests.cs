using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using StudyAI.Common.Utilities;
using StudyAI.Data;
using StudyAI.Features.Admin;

namespace StudyAI.UnitTests;

public class DatabaseEnvironmentIsolationTests
{
    [Fact]
    public void Appsettings_Base_Has_Empty_DefaultConnection_No_StudyAIDb_E2E_Fallback()
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .Build();

        var conn = config.GetConnectionString("DefaultConnection");
        Assert.True(string.IsNullOrWhiteSpace(conn));
    }

    [Fact]
    public void Appsettings_Precedence_Resolves_Correct_Database_Per_Environment()
    {
        var devConfig = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: false)
            .Build();

        Assert.Equal(
            "StudyAIDb",
            DatabaseSafetyGuard.GetSafeDatabaseMetadata(devConfig.GetConnectionString("DefaultConnection")).DatabaseName);
        Assert.False(devConfig.GetValue<bool>("Database:ApplyMigrationsOnStartup"));
        Assert.False(devConfig.GetValue<bool>("Database:BootstrapTestAccounts"));
        Assert.False(devConfig.GetValue<bool>("Database:SeedReferenceData"));

        var testConfig = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Testing.json", optional: false)
            .Build();

        // Testing config leaves DefaultConnection empty so tests MUST supply StudyAIDb_Clean_{GUID}
        Assert.True(string.IsNullOrWhiteSpace(testConfig.GetConnectionString("DefaultConnection")));

        // Environment variable & CLI override appsettings.{Environment}.json
        var cleanOverride = $"Server=127.0.0.1,1433;Database=StudyAIDb_Clean_{Guid.NewGuid():N};User Id=sa;Password=TempSecret!;TrustServerCertificate=True";
        var ciOverrideConfig = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Testing.json", optional: false)
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = cleanOverride
            })
            .Build();

        var resolvedDb = DatabaseSafetyGuard.GetSafeDatabaseMetadata(ciOverrideConfig.GetConnectionString("DefaultConnection")).DatabaseName;
        Assert.StartsWith("StudyAIDb_Clean_", resolvedDb);
        Assert.True(DatabaseSafetyGuard.IsAuthorizedTestDatabase(resolvedDb));
    }

    [Theory]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;", "Development")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Dev;Trusted_Connection=True;", "Development")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_a1b2c3d4e5f60718293a4b5c6d7e8f90;Trusted_Connection=True;", "Development")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;", "Testing")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Dev;Trusted_Connection=True;", "Testing")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;", "Testing")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;", "Staging")]
    public void Guard_Blocks_CrossEnvironment_And_Legacy_Database_Access(string connStr, string envName)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DatabaseSafetyGuard.EnsureSafeDatabaseForEnvironment(connStr, envName, "PrecedenceTest"));

        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED", ex.Message);
    }

    [Fact]
    public void GetSafeDatabaseMetadata_Strips_All_Credentials_And_Handles_Invalid_Syntax()
    {
        var meta = DatabaseSafetyGuard.GetSafeDatabaseMetadata(
            "Server=db.example.local,1433;Database=StudyAIDb_Dev;User Id=sa;Password=UltraSecret123!;TrustServerCertificate=True;");

        Assert.Equal("StudyAIDb_Dev", meta.DatabaseName);
        Assert.Equal("db.example.local,1433", meta.DataSource);
        Assert.DoesNotContain("UltraSecret123!", $"{meta.DatabaseName}{meta.DataSource}");
        Assert.DoesNotContain("sa", meta.DatabaseName, StringComparison.OrdinalIgnoreCase);

        var badMeta = DatabaseSafetyGuard.GetSafeDatabaseMetadata("Invalid;;;Password=LeakCheck!");
        Assert.Equal("invalid", badMeta.DatabaseName);
        Assert.Equal("invalid", badMeta.DataSource);
    }

    [Fact]
    public async Task AdminSystemService_Exposes_Safe_Diagnostics_In_Testing_And_Hides_DbName_In_Production()
    {
        var dbOpts = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase($"SysHealthEnv_{Guid.NewGuid():N}")
            .Options;
        await using var db = new StudyAIDbContext(dbOpts);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] =
                    "Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;User Id=sa;Password=SecretPass!;TrustServerCertificate=True;"
            })
            .Build();

        var testingSvc = new AdminSystemService(db, config, new SystemClock(), new StubHostEnvironment("Testing"));
        var testingStatus = await testingSvc.GetSystemStatusAsync();
        Assert.Equal("Testing", testingStatus.Environment);
        Assert.Equal("StudyAIDb_E2E", testingStatus.Database.DatabaseName);
        Assert.Equal(".\\SQLEXPRESS", testingStatus.Database.DataSource);

        var prodSvc = new AdminSystemService(db, config, new SystemClock(), new StubHostEnvironment("Production"));
        var prodStatus = await prodSvc.GetSystemStatusAsync();
        Assert.Equal("Production", prodStatus.Environment);
        Assert.Null(prodStatus.Database.DatabaseName);
        Assert.Null(prodStatus.Database.DataSource);
    }

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "StudyAI.Api";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
