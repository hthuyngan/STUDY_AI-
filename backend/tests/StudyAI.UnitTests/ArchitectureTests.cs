using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace StudyAI.UnitTests;

public class ArchitectureTests
{
    [Fact]
    public void DomainAssembly_ShouldNotReferenceOtherProjectAssemblies()
    {
        var domainAssembly = typeof(StudyAI.Domain.Entities.User).Assembly;
        var referencedAssemblies = domainAssembly.GetReferencedAssemblies();

        var disallowedNames = new[] { "StudyAI.Application", "StudyAI.Infrastructure", "StudyAI.Api" };
        foreach (var referenced in referencedAssemblies)
        {
            Assert.DoesNotContain(referenced.Name, disallowedNames);
        }
    }

    [Fact]
    public void ApplicationAssembly_ShouldNotReferenceInfrastructureOrApi()
    {
        var applicationAssembly = typeof(StudyAI.Application.DTOs.LearnerSubjectDto).Assembly;
        var referencedAssemblies = applicationAssembly.GetReferencedAssemblies();

        var disallowedNames = new[] { "StudyAI.Infrastructure", "StudyAI.Api" };
        foreach (var referenced in referencedAssemblies)
        {
            Assert.DoesNotContain(referenced.Name, disallowedNames);
        }
    }

    [Fact]
    public void AllControllers_MustBeOrganizedUnderFeaturesNamespace()
    {
        var apiAssembly = typeof(StudyAI.Api.Features.Public.HealthController).Assembly;
        var allControllers = apiAssembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
            .ToList();

        Assert.NotEmpty(allControllers);

        var misplaced = allControllers
            .Where(t => t.Namespace == null || !t.Namespace.StartsWith("StudyAI.Api.Features."))
            .Select(t => t.FullName)
            .ToList();

        Assert.True(misplaced.Count == 0, $"Controllers must be organized under StudyAI.Api.Features.*, but found outside:\n{string.Join("\n", misplaced)}");
    }

    [Fact]
    public void FeatureControllers_MustNotInjectAnyDbContextDirectly()
    {
        var apiAssembly = typeof(StudyAI.Api.Features.Public.HealthController).Assembly;
        var featureControllers = apiAssembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
            .Where(t => t.Namespace != null && t.Namespace.StartsWith("StudyAI.Api.Features"))
            .ToList();

        Assert.NotEmpty(featureControllers);

        var violations = new List<string>();

        foreach (var controller in featureControllers)
        {
            // Check constructors for DbContext or IApplicationDbContext
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

            // Check fields for DbContext or IApplicationDbContext
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

        Assert.True(violations.Count == 0, $"Architecture violations detected (Controllers must NOT inject DbContext):\n{string.Join("\n", violations)}");
    }
}
