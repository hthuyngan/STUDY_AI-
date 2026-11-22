using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace StudyAI.UnitTests;

/// <summary>
/// Architecture validation tests enforcing the Feature-Based Modular Monolith design principles.
/// Verifies proper feature isolation, controller organization, and absence of anti-patterns.
/// </summary>
public class ArchitectureTests
{
    private static readonly Assembly ApiAssembly = typeof(StudyAI.Features.Public.HealthController).Assembly;

    [Fact]
    public void AllControllers_MustBeOrganizedUnderFeaturesNamespace()
    {
        var allControllers = ApiAssembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
            .ToList();

        Assert.NotEmpty(allControllers);

        var misplaced = allControllers
            .Where(t => t.Namespace == null || !t.Namespace.StartsWith("StudyAI.Features."))
            .Select(t => t.FullName)
            .ToList();

        Assert.True(misplaced.Count == 0, $"Controllers must be organized under StudyAI.Features.*, but found outside:\n{string.Join("\n", misplaced)}");
    }

    [Fact]
    public void FeatureControllers_MustNotInjectAnyDbContextDirectly()
    {
        var featureControllers = ApiAssembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
            .Where(t => t.Namespace != null && t.Namespace.StartsWith("StudyAI.Features"))
            .ToList();

        Assert.NotEmpty(featureControllers);

        var violations = new List<string>();

        foreach (var controller in featureControllers)
        {
            var constructors = controller.GetConstructors();
            foreach (var ctor in constructors)
            {
                foreach (var param in ctor.GetParameters())
                {
                    if (param.ParameterType.Name.Contains("DbContext") ||
                        param.ParameterType.FullName?.Contains("DbContext") == true)
                    {
                        violations.Add($"{controller.FullName} constructor parameter '{param.Name}' injects DbContext ({param.ParameterType.Name}).");
                    }
                }
            }

            var fields = controller.GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
            foreach (var field in fields)
            {
                if (field.FieldType.Name.Contains("DbContext") ||
                    field.FieldType.FullName?.Contains("DbContext") == true)
                {
                    violations.Add($"{controller.FullName} field '{field.Name}' has DbContext type ({field.FieldType.Name}).");
                }
            }
        }

        Assert.True(violations.Count == 0, $"Architecture violations detected (Controllers must NOT inject DbContext directly):\n{string.Join("\n", violations)}");
    }

    [Fact]
    public void ModularMonolith_HasExpectedCoreFeatureModules()
    {
        var expectedModules = new[]
        {
            "StudyAI.Features.Auth",
            "StudyAI.Features.Admin",
            "StudyAI.Features.Student",
            "StudyAI.Features.Teacher",
            "StudyAI.Features.Content",
            "StudyAI.Features.AI"
        };

        var allNamespaces = ApiAssembly.GetTypes()
            .Where(t => t.Namespace != null)
            .Select(t => t.Namespace!)
            .Distinct()
            .ToList();

        foreach (var expected in expectedModules)
        {
            Assert.Contains(allNamespaces, ns => ns == expected || ns.StartsWith(expected + "."));
        }
    }

    [Fact]
    public void SingleProjectArchitecture_SharedLayersProperlySegregated()
    {
        var expectedSharedNamespaces = new[]
        {
            "StudyAI.Models",
            "StudyAI.Data",
            "StudyAI.Common.Authorization",
            "StudyAI.Common.Exceptions",
            "StudyAI.Common.Security",
            "StudyAI.Common.Utilities"
        };

        var allNamespaces = ApiAssembly.GetTypes()
            .Where(t => t.Namespace != null)
            .Select(t => t.Namespace!)
            .Distinct()
            .ToList();

        foreach (var expected in expectedSharedNamespaces)
        {
            Assert.Contains(allNamespaces, ns => ns == expected || ns.StartsWith(expected + "."));
        }
    }
}
