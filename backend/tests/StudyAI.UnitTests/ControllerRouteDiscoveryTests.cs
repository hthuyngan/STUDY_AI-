using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
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
/// Prevents compatibility types from being registered as duplicate HTTP endpoints
/// and strictly guards against API contract regression by verifying all 236 baseline endpoints.
/// </summary>
public class ControllerRouteDiscoveryTests
{
    private static string FindRepositoryRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "docs", "refactor", "route-contract-map.md")))
            {
                return dir.FullName;
            }
            if (Directory.Exists(Path.Combine(dir.FullName, ".git")))
            {
                return dir.FullName;
            }
            dir = dir.Parent;
        }

        throw new InvalidOperationException("Could not find repository root containing docs/refactor/route-contract-map.md or .git");
    }

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
            var normalizedTemplate = Regex.Replace(rawTemplate, @"\{[a-zA-Z0-9_?]+\}", "{param}");

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
    public void BaselineRouteContract_All236EndpointsMustBePresentAndMatchExactly()
    {
        var repoRoot = FindRepositoryRoot();
        var routeContractPath = Path.Combine(repoRoot, "docs", "refactor", "route-contract-map.md");
        Assert.True(File.Exists(routeContractPath), $"Route contract baseline file not found at: {routeContractPath}");

        var contractLines = File.ReadAllLines(routeContractPath);
        var baselineEndpoints = new Dictionary<string, string>(); // Key: "METHOD normalized_route", Value: raw route

        var tableRowRegex = new Regex(@"^\|\s*\d+\s*\|\s*`([A-Z]+)`\s*\|\s*`([^`]+)`", RegexOptions.Compiled);

        foreach (var line in contractLines)
        {
            var match = tableRowRegex.Match(line);
            if (match.Success)
            {
                var method = match.Groups[1].Value.ToUpperInvariant();
                var rawRoute = match.Groups[2].Value.Trim('/');
                var normalizedRoute = Regex.Replace(rawRoute, @"\{[a-zA-Z0-9_?]+\}", "{param}").ToLowerInvariant();
                var key = $"{method} {normalizedRoute}";
                baselineEndpoints[key] = match.Groups[2].Value;
            }
        }

        Assert.Equal(236, baselineEndpoints.Count);

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddControllers().AddApplicationPart(typeof(StudentPracticeController).Assembly);

        using var provider = services.BuildServiceProvider();
        var actionDescriptors = provider.GetRequiredService<IActionDescriptorCollectionProvider>()
            .ActionDescriptors.Items
            .OfType<ControllerActionDescriptor>()
            .ToList();

        var registeredEndpoints = new HashSet<string>();

        foreach (var action in actionDescriptors)
        {
            var rawTemplate = action.AttributeRouteInfo?.Template?.Trim('/') ?? "";
            var normalizedTemplate = Regex.Replace(rawTemplate, @"\{[a-zA-Z0-9_?]+\}", "{param}").ToLowerInvariant();

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
                registeredEndpoints.Add($"{method.ToUpperInvariant()} {normalizedTemplate}");
            }
        }

        // Verify no baseline endpoints are missing from registered descriptors
        var missingEndpoints = baselineEndpoints
            .Where(b => !registeredEndpoints.Contains(b.Key))
            .Select(b => $"Missing: [{b.Key}] (from baseline: {b.Value})")
            .ToList();

        Assert.True(missingEndpoints.Count == 0,
            $"API Contract Regression! {missingEndpoints.Count} baseline endpoint(s) missing from assembly:\n" +
            string.Join("\n", missingEndpoints));

        // Approved feature extensions (Workstream 6: Authenticated learner notes persistence + P01: Multi-subject catalog)
        var approvedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "GET api/v1/me/notes",
            "GET api/v1/me/notes/{param}",
            "POST api/v1/me/notes",
            "PUT api/v1/me/notes/{param}",
            "DELETE api/v1/me/notes/{param}",
            "GET api/v1/content/catalog/grades",
            "GET api/v1/content/catalog/grades/{param}",
            "POST api/v1/content/catalog/grades",
            "PUT api/v1/content/catalog/grades/{param}",
            "PATCH api/v1/content/catalog/grades/{param}",
            "POST api/v1/content/catalog/grades/{param}/archive",
            "POST api/v1/content/catalog/grades/{param}/reactivate",
            "GET api/v1/content/catalog/subjects",
            "GET api/v1/content/catalog/subjects/{param}",
            "POST api/v1/content/catalog/subjects",
            "PUT api/v1/content/catalog/subjects/{param}",
            "PATCH api/v1/content/catalog/subjects/{param}",
            "POST api/v1/content/catalog/subjects/{param}/archive",
            "POST api/v1/content/catalog/subjects/{param}/reactivate",
            "GET api/v1/content/catalog/curricula",
            "GET api/v1/content/catalog/curricula/{param}",
            "POST api/v1/content/catalog/curricula",
            "PUT api/v1/content/catalog/curricula/{param}",
            "PATCH api/v1/content/catalog/curricula/{param}",
            "POST api/v1/content/catalog/curricula/{param}/archive",
            "POST api/v1/content/catalog/curricula/{param}/reactivate",
            "POST api/v1/content/catalog/curricula/{param}/publish",
            "GET api/v1/content/catalog/textbook-series",
            "GET api/v1/content/catalog/textbook-series/{param}",
            "POST api/v1/content/catalog/textbook-series",
            "PUT api/v1/content/catalog/textbook-series/{param}",
            "PATCH api/v1/content/catalog/textbook-series/{param}",
            "POST api/v1/content/catalog/textbook-series/{param}/archive",
            "POST api/v1/content/catalog/textbook-series/{param}/reactivate",
            "GET api/v1/content/catalog/editions",
            "GET api/v1/content/catalog/editions/{param}",
            "POST api/v1/content/catalog/editions",
            "PUT api/v1/content/catalog/editions/{param}",
            "PATCH api/v1/content/catalog/editions/{param}",
            "POST api/v1/content/catalog/editions/{param}/archive",
            "POST api/v1/content/catalog/editions/{param}/reactivate",
            "POST api/v1/content/catalog/editions/{param}/publish",
            "POST api/v1/content/chapters/{param}/submit-review",
            "POST api/v1/content/chapters/{param}/approve",
            "POST api/v1/content/chapters/{param}/publish",
            "POST api/v1/content/chapters/{param}/unpublish",
            "POST api/v1/content/chapters/{param}/request-changes",
            "POST api/v1/content/chapters/{param}/archive",
            "POST api/v1/content/chapters/{param}/reactivate",
            "POST api/v1/content/lessons/{param}/archive",
            "POST api/v1/content/lessons/{param}/reactivate",
            "GET api/v1/curriculum/editions",
            "GET api/v1/curriculum/editions/{param}/chapters",
            "GET api/v1/content/catalog/compatibility-mapping",
            "GET api/v1/content/lessons/{param}/composition",
            "PUT api/v1/content/lessons/{param}/composition",
            "GET api/v1/content/lessons/{param}/revisions",
            "POST api/v1/content/lessons/{param}/revisions/{param}/rollback",
            "GET api/v1/content/curricula/{param}/objectives",
            "POST api/v1/content/curricula/{param}/objectives",
            "GET api/v1/content/curricula/{param}/knowledge-units",
            "POST api/v1/content/curricula/{param}/knowledge-units",
            "GET api/v1/content/curricula/{param}/skills",
            "POST api/v1/content/curricula/{param}/skills",
            "POST api/v1/content/curricula/{param}/{param}/{param}/publish",
            "GET api/v1/content/curricula/{param}/lessons",
            "GET api/v1/content/lessons/{param}/resources",
            "POST api/v1/content/lessons/{param}/resources",
            "PATCH api/v1/content/resources/{param}",
            "POST api/v1/content/resources/reorder",
            "POST api/v1/content/resources/{param}/archive",
            "POST api/v1/content/resources/{param}/verify",
            "POST api/v1/content/resources/{param}/reject",
            "POST api/v1/content/resources/{param}/publish",
            "POST api/v1/content/resources/{param}/unpublish",
            "GET api/v1/support/tickets",
            "GET api/v1/support/tickets/{param}",
            "POST api/v1/support/tickets",
            "POST api/v1/support/tickets/{param}/messages",
            "GET api/v1/admin/support/tickets",
            "GET api/v1/admin/support/tickets/{param}",
            "PATCH api/v1/admin/support/tickets/{param}",
            "POST api/v1/admin/support/tickets/{param}/messages",
            "GET api/v1/content/workspace/dashboard",
            "GET api/v1/content/workspace/materials",
            "POST api/v1/content/workspace/materials",
            "PATCH api/v1/content/workspace/materials/{param}/status",
            "GET api/v1/content/workspace/knowledge-sources",
            "POST api/v1/content/workspace/knowledge-sources",
            "POST api/v1/content/workspace/knowledge-sources/{param}/sync",
            "DELETE api/v1/content/workspace/knowledge-sources/{param}",
            "POST api/v1/content/workspace/knowledge-sources/retrieve-test",
            "GET api/v1/content/workspace/error-reports",
            "POST api/v1/content/workspace/error-reports",
            "PATCH api/v1/content/workspace/error-reports/{param}",
            "GET api/v1/teacher/workspace/exams",
            "POST api/v1/teacher/workspace/exams",
            "PATCH api/v1/teacher/workspace/exams/{param}/status",
            "GET api/v1/teacher/workspace/materials",
            "POST api/v1/teacher/workspace/materials",
            "DELETE api/v1/teacher/workspace/materials/{param}",
            "GET api/v1/teacher/workspace/announcements",
            "POST api/v1/teacher/workspace/announcements",
            "GET api/v1/teacher/workspace/schedule",
            "POST api/v1/teacher/workspace/ai-assistant",
            "GET api/v1/learner/workspace/mistakes",
            "PATCH api/v1/learner/workspace/mistakes/{param}/resolve",
            "GET api/v1/learner/workspace/classrooms",
            "POST api/v1/learner/workspace/classrooms/join",
            "POST api/v1/content/workspace/materials/upload",
            "GET api/v1/content/workspace/materials/{param}/download",
            "POST api/v1/teacher/workspace/materials/upload",
            "GET api/v1/teacher/workspace/materials/{param}/download"
        };

        // Verify total registered count is exactly 236 baseline + 5 approved extensions
        Assert.Equal(236 + approvedExtensions.Count, actionDescriptors.Count);

        // Verify no unexpected extra endpoints outside baseline and approved extensions
        var extraEndpoints = registeredEndpoints
            .Where(r => !baselineEndpoints.ContainsKey(r) && !approvedExtensions.Contains(r))
            .Select(r => $"Extra: [{r}]")
            .ToList();

        Assert.True(extraEndpoints.Count == 0,
            $"API Contract Regression! {extraEndpoints.Count} unexpected extra endpoint(s) detected in assembly:\n" +
            string.Join("\n", extraEndpoints));
    }
}
