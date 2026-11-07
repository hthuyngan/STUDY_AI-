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

        // Bootstrap dedicated test users for integration tests safely
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        DbInitializer.BootstrapAdminAsync(db, hasher, "admin@studyai.internal", "Admin@123456", "Integration Test Admin").GetAwaiter().GetResult();
        DbInitializer.BootstrapLearnerAsync(db, hasher, "learner@studyai.internal", "Learner@123456", "Integration Test Learner", "12").GetAwaiter().GetResult();

        return host;
    }
}
