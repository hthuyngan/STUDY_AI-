using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.IntegrationTests;

public class StudyAIApiFixture : WebApplicationFactory<Program>
{
    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        var host = base.CreateHost(builder);

        // Ensure dedicated deterministic test users for integration tests
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
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

        // Clean up any lingering temporary test admins so admin@studyai.internal is the sole active admin
        var otherAdmins = db.Users.Where(u => u.Role == "admin" && u.EmailNormalized != "admin@studyai.internal").ToList();
        foreach (var oa in otherAdmins)
        {
            oa.Role = "learner";
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

        db.SaveChanges();

        return host;
    }
}
