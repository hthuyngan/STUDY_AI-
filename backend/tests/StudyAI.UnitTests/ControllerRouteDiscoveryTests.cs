using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.ActionConstraints;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.Routing;
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

    [Fact]
    public void EntireApiAssembly_HasZeroDuplicateRouteAndMethodCollisions()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddControllers().AddApplicationPart(typeof(StudentPracticeController).Assembly);

        using var provider = services.BuildServiceProvider();
        var actionDescriptors = provider.GetRequiredService<IActionDescriptorCollectionProvider>()
            .ActionDescriptors.Items
            .OfType<ControllerActionDescriptor>()
            .ToList();

        Assert.NotEmpty(actionDescriptors);

        var endpoints = new List<(string HttpMethod, string Route, ControllerActionDescriptor Action)>();

        foreach (var action in actionDescriptors)
        {
            var rawTemplate = action.AttributeRouteInfo?.Template?.Trim('/') ?? "";
            var normalizedTemplate = System.Text.RegularExpressions.Regex.Replace(rawTemplate, @"\{[a-zA-Z0-9_?]+\}", "{param}");

            var httpMethods = action.ActionConstraints?.OfType<HttpMethodActionConstraint>()
                .SelectMany(c => c.HttpMethods)
                .Distinct()
                .ToList();

            if (httpMethods == null || !httpMethods.Any())
            {
                var methodAttr = action.MethodInfo.GetCustomAttributes(true).OfType<HttpMethodAttribute>().FirstOrDefault();
                if (methodAttr != null && methodAttr.HttpMethods.Any())
                {
                    httpMethods = methodAttr.HttpMethods.ToList();
                }
                else
                {
                    httpMethods = new List<string> { "ANY" };
                }
            }

            foreach (var method in httpMethods)
            {
                endpoints.Add((method.ToUpperInvariant(), normalizedTemplate.ToLowerInvariant(), action));
            }
        }

        var duplicates = endpoints
            .GroupBy(e => (e.HttpMethod, e.Route))
            .Where(g => g.Count() > 1 && !string.IsNullOrEmpty(g.Key.Route))
            .ToList();

        var collisionMessages = duplicates.Select(g =>
            $"Collision on [{g.Key.HttpMethod}] {g.Key.Route}:\n" +
            string.Join("\n", g.Select(x => $"  - {x.Action.ControllerTypeInfo.FullName}.{x.Action.MethodInfo.Name}"))
        ).ToList();

        Assert.True(collisionMessages.Count == 0, $"Duplicate API endpoints detected across assembly ({collisionMessages.Count} collisions):\n\n{string.Join("\n\n", collisionMessages)}");
    }

    [Fact]
    public void GenerateAndVerifyEndpointInventory()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddControllers().AddApplicationPart(typeof(StudentPracticeController).Assembly);

        using var provider = services.BuildServiceProvider();
        var actionDescriptors = provider.GetRequiredService<IActionDescriptorCollectionProvider>()
            .ActionDescriptors.Items
            .OfType<ControllerActionDescriptor>()
            .OrderBy(a => a.ControllerTypeInfo.Namespace)
            .ThenBy(a => a.ControllerName)
            .ThenBy(a => a.AttributeRouteInfo?.Template)
            .ToList();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("# Endpoint Inventory (Generated automatically from ASP.NET Core ActionDescriptors)");
        sb.AppendLine();
        sb.AppendLine($"Total registered action descriptors: **{actionDescriptors.Count}**");
        sb.AppendLine();
        sb.AppendLine("| # | Module | Controller | Action | Method | Route Template | Auth |");
        sb.AppendLine("|---|---|---|---|---|---|---|");

        int index = 1;
        foreach (var action in actionDescriptors)
        {
            var module = action.ControllerTypeInfo.Namespace?.Replace("StudyAI.Features.", "") ?? "Unknown";
            var controller = action.ControllerName;
            var actionName = action.MethodInfo.Name;
            var route = action.AttributeRouteInfo?.Template ?? "(none)";

            var httpMethod = action.ActionConstraints?.OfType<HttpMethodActionConstraint>()
                .SelectMany(c => c.HttpMethods)
                .FirstOrDefault() ??
                action.MethodInfo.GetCustomAttributes(true).OfType<HttpMethodAttribute>().FirstOrDefault()?.HttpMethods.FirstOrDefault() ??
                "ANY";

            var isAllowAnon = action.MethodInfo.GetCustomAttributes(true).OfType<AllowAnonymousAttribute>().Any() ||
                              action.ControllerTypeInfo.GetCustomAttributes(true).OfType<AllowAnonymousAttribute>().Any();
            var authAttr = action.MethodInfo.GetCustomAttributes(true).OfType<AuthorizeAttribute>().FirstOrDefault() ??
                           action.ControllerTypeInfo.GetCustomAttributes(true).OfType<AuthorizeAttribute>().FirstOrDefault();

            string authInfo = isAllowAnon ? "AllowAnonymous" :
                (authAttr != null ? (string.IsNullOrEmpty(authAttr.Roles) && string.IsNullOrEmpty(authAttr.Policy) ? "Authorize" : $"Auth({authAttr.Roles ?? authAttr.Policy})") : "Implicit");

            sb.AppendLine($"| {index++} | `{module}` | `{controller}` | `{actionName}` | `{httpMethod.ToUpperInvariant()}` | `{route}` | {authInfo} |");
        }

        var dir = @"D:\TN\docs\audit";
        if (!System.IO.Directory.Exists(dir)) System.IO.Directory.CreateDirectory(dir);
        System.IO.File.WriteAllText(System.IO.Path.Combine(dir, "endpoint_inventory.md"), sb.ToString(), System.Text.Encoding.UTF8);

        Assert.True(actionDescriptors.Count > 100, $"Expected > 100 endpoints, but found {actionDescriptors.Count}");
    }
}
