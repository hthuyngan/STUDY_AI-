using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Infrastructure.Persistence;
using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace StudyAI.IntegrationTests;

public class StudyAIApiFixture : WebApplicationFactory<Program>
{
    public const string DefaultTestConnectionString =
        "Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

    /// <summary>
    /// Explicit override for testing the database safety guard.
    /// When null, defaults to environment variable ConnectionStrings__DefaultConnection or DefaultTestConnectionString.
    /// </summary>
    public string? TestConnectionStringOverride { get; set; }

    static StudyAIApiFixture()
    {
        // Enforce test execution mode across all DbContext instances in test domain
        DatabaseSafetyGuard.IsTestExecutionContext = true;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        var effectiveConn = TestConnectionStringOverride
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? DefaultTestConnectionString;

        // 1. Fail-closed configuration: Inject the explicit test connection string into configuration
        builder.ConfigureAppConfiguration((context, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = effectiveConn
            });
        });

        // 2. Pre-flight Guard and Service Re-configuration in ConfigureServices
        builder.ConfigureServices((context, services) =>
        {
            var resolvedConn = context.Configuration.GetConnectionString("DefaultConnection")
                ?? effectiveConn;

            // Fail-closed validation BEFORE any service is resolved or created
            DatabaseSafetyGuard.EnsureSafeTestDatabase(resolvedConn, "StudyAIApiFixture.ConfigureServices");

            // Replace DbContextOptions with the validated test connection string to override Program.cs default
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<StudyAIDbContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<StudyAIDbContext>(options =>
            {
                options.UseSqlServer(resolvedConn, sqlOptions =>
                {
                    sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
                });
                options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
                options.AddInterceptors(new TestDatabaseSafetySaveChangesInterceptor());
            });

            // 3. Register SaveChanges Interceptor for defense-in-depth on all write operations
            services.AddSingleton<ISaveChangesInterceptor, TestDatabaseSafetySaveChangesInterceptor>();
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);

        // 4. Post-build pre-execution Guard: verify actual resolved IConfiguration & DbContext connection
        using var scope = host.Services.CreateScope();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var resolvedConn = configuration.GetConnectionString("DefaultConnection");
        DatabaseSafetyGuard.EnsureSafeTestDatabase(resolvedConn, "StudyAIApiFixture.CreateHost (IConfiguration)");

        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var dbConnStr = db.Database.GetDbConnection().ConnectionString;
        DatabaseSafetyGuard.EnsureSafeTestDatabase(dbConnStr, "StudyAIApiFixture.CreateHost (DbContext)");

        // 5. Ensure dedicated deterministic test users for integration tests on test database
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        var admin = db.Users.FirstOrDefault(u => u.EmailNormalized == "admin@studyai.internal");
        if (admin != null)
        {
            admin.Role = "admin";
            admin.Status = "active";
            admin.PasswordHash = hasher.HashPassword("Admin@123456");
        }
        else
        {
            DbInitializer.BootstrapAdminAsync(db, hasher, "admin@studyai.internal", "Admin@123456", "Integration Test Admin").GetAwaiter().GetResult();
        }

        // Clean up any lingering temporary test admins so admin@studyai.internal and admin@gmail.com remain active admins
        var otherAdmins = db.Users.Where(u => u.Role == "admin" 
            && u.EmailNormalized != "ADMIN@STUDYAI.INTERNAL" 
            && u.EmailNormalized != "admin@studyai.internal"
            && u.EmailNormalized != "ADMIN@GMAIL.COM"
            && u.EmailNormalized != "admin@gmail.com").ToList();
        foreach (var oa in otherAdmins)
        {
            oa.Role = "learner";
        }

        var adminGmail = db.Users.FirstOrDefault(u => u.EmailNormalized == "ADMIN@GMAIL.COM" || u.EmailNormalized == "admin@gmail.com");
        if (adminGmail != null)
        {
            adminGmail.Role = "admin";
            adminGmail.Status = "active";
            adminGmail.PasswordHash = hasher.HashPassword("admin");
        }

        var contentGmail = db.Users.FirstOrDefault(u => u.EmailNormalized == "CONTENT@GMAIL.COM" || u.EmailNormalized == "content@gmail.com");
        if (contentGmail != null)
        {
            contentGmail.Role = "content";
            contentGmail.Status = "active";
            contentGmail.PasswordHash = hasher.HashPassword("Vinh123!@#");
        }

        var learner = db.Users.FirstOrDefault(u => u.EmailNormalized == "learner@studyai.internal");
        if (learner != null)
        {
            learner.Role = "learner";
            learner.Status = "active";
            learner.PasswordHash = hasher.HashPassword("Learner@123456");
        }
        else
        {
            DbInitializer.BootstrapLearnerAsync(db, hasher, "learner@studyai.internal", "Learner@123456", "Integration Test Learner", "12").GetAwaiter().GetResult();
        }

        var contentStaff = db.Users.FirstOrDefault(u => u.EmailNormalized == "content@studyai.internal");
        if (contentStaff != null)
        {
            contentStaff.Role = "content";
            contentStaff.Status = "active";
            contentStaff.PasswordHash = hasher.HashPassword("Content@123456");
        }
        else
        {
            DbInitializer.BootstrapStaffAsync(db, hasher, "content@studyai.internal", "Content@123456", "content", "Integration Test Content Staff").GetAwaiter().GetResult();
        }

        db.SaveChanges();

        return host;
    }
}

/// <summary>
/// EF Core interceptor that executes right before any SaveChanges / SaveChangesAsync call,
/// blocking any write if the underlying connection targets StudyAIDb or a non-test database.
/// </summary>
public class TestDatabaseSafetySaveChangesInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        ValidateConnection(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        ValidateConnection(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void ValidateConnection(DbContext? context)
    {
        if (context == null) return;
        var connStr = context.Database.GetDbConnection().ConnectionString;
        DatabaseSafetyGuard.EnsureSafeTestDatabase(connStr, "TestDatabaseSafetySaveChangesInterceptor");
    }
}
