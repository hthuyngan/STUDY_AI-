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
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_test;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=MyTestProdDb;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=contest_prod;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=testament_db;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=e2e_live_production;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_e2e_fake;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_IntegrationTests;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=ProductionDb;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=CustomerDb;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=Accounting;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_12345;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_not_a_valid_guid;Trusted_Connection=True;")]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ;Trusted_Connection=True;")]
    public void Guard_Strictly_Blocks_Spoofed_And_Non_Whitelist_Databases(string spoofedConnStr)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DatabaseSafetyGuard.EnsureSafeTestDatabase(spoofedConnStr, "UnitTest_SpoofedDb"));

        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED", ex.Message);
        Assert.Contains("NOT an authorized test database", ex.Message);
    }

    [Theory]
    // Format B: braces around GUID
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_{a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90};Trusted_Connection=True;")]
    // Format P: parentheses around GUID
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_(a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90);Trusted_Connection=True;")]
    // Format X: hexadecimal array structure
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_{0x12345678,0x1234,0x1234,{0x12,0x34,0x56,0x78,0x90,0xab,0xcd,0xef}};Trusted_Connection=True;")]
    public void Guard_Strictly_Blocks_Non_ND_Guid_Formats_B_P_X(string nonNDGuidConnStr)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DatabaseSafetyGuard.EnsureSafeTestDatabase(nonNDGuidConnStr, "UnitTest_GuidFormatsBPX"));

        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED", ex.Message);
        Assert.Contains("NOT an authorized test database", ex.Message);
    }

    [Theory]
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;", "StudyAIDb_E2E")]
    [InlineData("Server=.\\SQLEXPRESS;Database=studyaidb_e2e;Trusted_Connection=True;", "studyaidb_e2e")]
    [InlineData("Server=.\\SQLEXPRESS;Initial Catalog=[StudyAIDb_E2E];Trusted_Connection=True;", "StudyAIDb_E2E")]
    // Guid:N (32 hex characters)
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_a1b2c3d4e5f60718293a4b5c6d7e8f90;Trusted_Connection=True;", "StudyAIDb_Clean_a1b2c3d4e5f60718293a4b5c6d7e8f90")]
    // Guid:D (36 characters 8-4-4-4-12)
    [InlineData("Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_12345678-1234-1234-1234-1234567890ab;Trusted_Connection=True;", "StudyAIDb_Clean_12345678-1234-1234-1234-1234567890ab")]
    public void Guard_Allows_Only_Exact_Authorized_Test_Databases(string validConnStr, string expectedDbName)
    {
        var resolved = DatabaseSafetyGuard.EnsureSafeTestDatabase(validConnStr, "UnitTest_ValidTestDb");
        Assert.Equal(expectedDbName, resolved);
    }

    [Fact]
    public void Guard_Never_Leaks_Secrets_In_Message_ToString_Or_InnerException_When_Malformed()
    {
        const string rawPassword = "SensitiveSuperSecretPassword_P@ssw0rd999!";
        const string rawAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sometokenpayload.secretSignature";
        const string rawApiKey = "dummy_test_api_key_sample_1234567890";
        const string rawClientSecret = "top_secret_client_secret_value_xyz";

        var malformedConn =
            $"Server=localhost;Database=StudyAIDb_E2E;User Id=sa;Password={rawPassword};" +
            $"AccessToken={rawAccessToken};ApiKey={rawApiKey};ClientSecret={rawClientSecret};" +
            "MalformedKeyWithoutEquals;==InvalidChars==";

        var ex = Assert.Throws<InvalidOperationException>(() =>
            DatabaseSafetyGuard.EnsureSafeTestDatabase(malformedConn, "UnitTest_ZeroLeakSecurity"));

        // 1. Must NOT have any InnerException attached (InnerExceptions can contain cleartext connection strings)
        Assert.Null(ex.InnerException);

        // 2. Full dump of exception (including ToString, Message, StackTrace)
        var fullDump = ex.ToString();

        // 3. Verify zero credentials or secrets leak anywhere in exception dump
        Assert.DoesNotContain(rawPassword, fullDump);
        Assert.DoesNotContain(rawAccessToken, fullDump);
        Assert.DoesNotContain(rawApiKey, fullDump);
        Assert.DoesNotContain(rawClientSecret, fullDump);

        // 4. Verify fixed constant error message is emitted
        Assert.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED", ex.Message);
        Assert.Contains("Malformed or unparseable connection string syntax. Execution is blocked for security reasons.", ex.Message);
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

    [Fact]
    public void WebApplicationFactory_Throws_And_Blocks_When_Configured_With_Spoofed_Database()
    {
        using var factory = new StudyAIApiFixture
        {
            TestConnectionStringOverride =
                "Server=.\\SQLEXPRESS;Database=MyTestProdDb;Trusted_Connection=True;TrustServerCertificate=True;"
        };

        var ex = Assert.ThrowsAny<Exception>(() =>
        {
            using var client = factory.CreateClient();
        });

        var guardExceptionFound = false;
        var current = ex;
        while (current != null)
        {
            if (current is InvalidOperationException &&
                current.Message.Contains("CRITICAL DATABASE SAFETY GUARD TRIGGERED") &&
                current.Message.Contains("NOT an authorized test database"))
            {
                guardExceptionFound = true;
                break;
            }
            current = current.InnerException;
        }

        Assert.True(guardExceptionFound, $"Expected DatabaseSafetyGuard exception but got: {ex}");
    }
}
