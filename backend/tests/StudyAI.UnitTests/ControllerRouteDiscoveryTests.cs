using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Features.Student;
using Xunit;

namespace StudyAI.UnitTests;

/// <summary>
/// Prevents compatibility types from being registered as duplicate HTTP endpoints.
/// They remain available to existing code and tests, but only canonical controllers
/// should participate in MVC controller discovery.
/// </summary>
public class ControllerRouteDiscoveryTests
{
    [Fact]
    public void LegacyControllerAliases_MustNotBeDiscoveredByMvc()
    {
        var manager = new ApplicationPartManager();
        manager.ApplicationParts.Add(new AssemblyPart(typeof(StudentPracticeController).Assembly));
        manager.FeatureProviders.Add(new ControllerFeatureProvider());

        var feature = new ControllerFeature();
        manager.PopulateFeature(feature);
        var discoveredControllers = feature.Controllers.Select(type => type.AsType()).ToHashSet();

        Assert.Contains(typeof(StudentPracticeController), discoveredControllers);
        Assert.Contains(typeof(ExamPreparationController), discoveredControllers);

        var compatibilityAliases = new[]
        {
            typeof(LearnerCurriculumController),
            typeof(LearnerProgressController),
            typeof(LearnerAssessmentAttemptsController),
            typeof(LearnerEventsController),
            typeof(StudentExamPreparationController),
            typeof(LearnerExamPreparationController),
            typeof(LearnerPracticeController),
            typeof(LearnerProfileController),
            typeof(StudentAdaptiveLearningController),
            typeof(LearnerAdaptiveLearningController),
            typeof(StudentAnalyticsController),
            typeof(LearnerAnalyticsController),
            typeof(LearnerAiChatController)
        };

        foreach (var alias in compatibilityAliases)
        {
            Assert.DoesNotContain(alias, discoveredControllers);
        }
    }

    [Fact]
    public void PracticeDashboardStatsRoute_MustMapToExactlyOneAction()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddControllers().AddApplicationPart(typeof(StudentPracticeController).Assembly);

        using var provider = services.BuildServiceProvider();
        var routes = provider.GetRequiredService<IActionDescriptorCollectionProvider>()
            .ActionDescriptors.Items
            .OfType<ControllerActionDescriptor>()
            .Where(action => string.Equals(
                action.AttributeRouteInfo?.Template?.Trim('/'),
                "api/v1/practice/dashboard-stats",
                StringComparison.OrdinalIgnoreCase))
            .ToArray();

        var route = Assert.Single(routes);
        Assert.Equal(typeof(StudentPracticeController), route.ControllerTypeInfo.AsType());
    }
}
