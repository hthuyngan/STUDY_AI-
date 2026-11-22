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
    public void FeatureControllers_MustNotInjectStudyAIDbContextDirectly()
    {
        var apiAssembly = typeof(StudyAI.Api.Features.Public.HealthController).Assembly;
        var featureControllers = apiAssembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
            .Where(t => t.Namespace != null && t.Namespace.StartsWith("StudyAI.Api.Features"))
            .ToList();

        var violations = new List<string>();

        foreach (var controller in featureControllers)
        {
            // Check constructors
            var constructors = controller.GetConstructors();
            foreach (var ctor in constructors)
            {
                foreach (var param in ctor.GetParameters())
                {
                    if (param.ParameterType.Name == "StudyAIDbContext" || param.ParameterType.FullName?.Contains("StudyAIDbContext") == true)
                    {
                        violations.Add($"{controller.FullName} constructor parameter '{param.Name}' injects StudyAIDbContext.");
                    }
                }
            }

            // Check fields
            var fields = controller.GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
            foreach (var field in fields)
            {
                if (field.FieldType.Name == "StudyAIDbContext" || field.FieldType.FullName?.Contains("StudyAIDbContext") == true)
                {
                    violations.Add($"{controller.FullName} field '{field.Name}' has type StudyAIDbContext.");
                }
            }
        }

        Assert.True(violations.Count == 0, $"Architecture violations detected:\n{string.Join("\n", violations)}");
    }
}
