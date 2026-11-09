using System;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.IntegrationTests;

public class DatabaseSafetyGuardTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Guard_Throws_When_ConnectionString_Is_Null_Or_Empty(string? connStr)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DatabaseSafetyGuard.EnsureSafeTestDatabase(connStr, "UnitTest_NullOrEmpty"));

        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED", ex.Message);
        Assert.Contains("null, empty, or unconfigured", ex.Message);
    }

    [Fact]
    public void Guard_Throws_When_Database_Is_Missing()
    {
        const string connStr = "Server=.\\SQLEXPRESS;Trusted_Connection=True;TrustServerCertificate=True;";

        var ex = Assert.Throws<InvalidOperationException>(() =>
            DatabaseSafetyGuard.EnsureSafeTestDatabase(connStr, "UnitTest_MissingDb"));

        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED", ex.Message);
        Assert.Contains("No database name", ex.Message);
    }

    [Theory]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=studyaidb;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=STUDYAIDB;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Initial Catalog=StudyAIDb;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=[StudyAIDb];Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=  StudyAIDb  ;Trusted_Connection=True;")]
    public void Guard_Strictly_Blocks_Primary_Database_StudyAIDb(string forbiddenConnStr)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DatabaseSafetyGuard.EnsureSafeTestDatabase(forbiddenConnStr, "UnitTest_ForbiddenDb"));

        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED", ex.Message);
        Assert.Contains("Operation BLOCKED!", ex.Message);
        Assert.Contains("strictly FORBIDDEN", ex.Message);
        Assert.Contains("StudyAIDb", ex.Message);
    }

    [Theory]
    [InlineData("Server=.\\SQLEXPRESS;Database=ProductionDb;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=CustomerDb;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=Accounting;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=MainStore;Trusted_Connection=True;")]
    public void Guard_Blocks_Non_Test_Databases(string nonTestConnStr)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DatabaseSafetyGuard.EnsureSafeTestDatabase(nonTestConnStr, "UnitTest_NonTestDb"));

        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED", ex.Message);
        Assert.Contains("NOT an authorized test database", ex.Message);
    }

    [Theory]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;", "StudyAIDb_E2E")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_a1b2c3d4;Trusted_Connection=True;", "StudyAIDb_Clean_a1b2c3d4")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_IntegrationTests;Trusted_Connection=True;", "StudyAIDb_IntegrationTests")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_e2e_ci;Trusted_Connection=True;", "StudyAIDb_e2e_ci")]
    [InlineData("Server=.\\SQLEXPRESS;Initial Catalog=[StudyAIDb_E2E];Trusted_Connection=True;", "StudyAIDb_E2E")]
    public void Guard_Allows_Authorized_Test_Databases(string validConnStr, string expectedDbName)
    {
        var resolved = DatabaseSafetyGuard.EnsureSafeTestDatabase(validConnStr, "UnitTest_ValidTestDb");
        Assert.Equal(expectedDbName, resolved);
    }

    [Fact]
    public void WebApplicationFactory_Throws_And_Blocks_When_Configured_With_Primary_StudyAIDb()
    {
        using var factory = new StudyAIApiFixture
        {
            TestConnectionStringOverride =
                "Server=.\\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;TrustServerCertificate=True;"
        };

        // Attempting to create client or access Services must trigger fail-closed guard
        var ex = Assert.ThrowsAny<Exception>(() =>
        {
            using var client = factory.CreateClient();
        });

        // The inner or root exception must be InvalidOperationException from DatabaseSafetyGuard
        var guardExceptionFound = false;
        var current = ex;
        while (current != null)
        {
            if (current is InvalidOperationException &&
                current.Message.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED") &&
                current.Message.Contains("StudyAIDb"))
            {
                guardExceptionFound = true;
                break;
            }
            current = current.InnerException;
        }

        Assert.True(guardExceptionFound, $"Expected DatabaseSafetyGuard exception but got: {ex}");
    }
}
