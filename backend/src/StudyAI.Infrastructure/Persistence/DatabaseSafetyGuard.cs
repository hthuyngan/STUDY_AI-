using System;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

namespace StudyAI.Infrastructure.Persistence;

/// <summary>
/// Fail-closed database safety guard.
/// Ensures tests, migrations, and automated fixtures NEVER execute against or write to
/// the production/primary database "StudyAIDb".
/// </summary>
public static class DatabaseSafetyGuard
{
    private static bool _forcedTestExecution = false;

    /// <summary>
    /// Indicates whether the current runtime environment is considered a test execution context.
    /// Automatically detects test runners (e.g. testhost, xunit, vstest) or explicit flag.
    /// </summary>
    public static bool IsTestExecutionContext
    {
        get
        {
            if (_forcedTestExecution)
            {
                return true;
            }

            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (string.Equals(env, "Testing", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var appDomainName = AppDomain.CurrentDomain.FriendlyName;
            if (!string.IsNullOrEmpty(appDomainName) &&
                (appDomainName.Contains("testhost", StringComparison.OrdinalIgnoreCase) ||
                 appDomainName.Contains("xunit", StringComparison.OrdinalIgnoreCase) ||
                 appDomainName.Contains("vstest", StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }

            return false;
        }
        set => _forcedTestExecution = value;
    }

    /// <summary>
    /// Validates that a connection string points strictly to an authorized isolated test database
    /// and never to the production/primary database "StudyAIDb".
    /// Throws InvalidOperationException immediately if any violation or ambiguity is detected.
    /// </summary>
    /// <param name="connectionString">The connection string resolved by the host or context.</param>
    /// <param name="callerContext">Context or caller description for diagnostic logs.</param>
    /// <returns>The normalized, sanitized database name.</returns>
    public static string EnsureSafeTestDatabase(string? connectionString, string callerContext = "TestExecution")
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                "Connection string is null, empty, or unconfigured. " +
                "Integration tests and test fixtures require an explicitly designated test database (e.g., 'StudyAIDb_E2E').");
        }

        SqlConnectionStringBuilder builder;
        try
        {
            builder = new SqlConnectionStringBuilder(connectionString);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                $"Malformed or unparseable connection string: '{connectionString}'. Execution is blocked.", ex);
        }

        var rawDbName = builder.InitialCatalog;
        if (string.IsNullOrWhiteSpace(rawDbName))
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                "No database name (Initial Catalog) was specified in the connection string. Execution is blocked.");
        }

        var normalizedDb = rawDbName.Trim().Trim('[', ']');

        // 1. Explicit Fail-Closed Block: "StudyAIDb" in any casing or whitespace format
        if (string.Equals(normalizedDb, "StudyAIDb", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                $"Operation BLOCKED! Target database resolved to primary database '{normalizedDb}'. " +
                "Integration tests and test fixtures are strictly FORBIDDEN from connecting to or modifying 'StudyAIDb'.");
        }

        // 2. Strict Whitelist Check: Must match authorized test database patterns
        // Permitted patterns:
        // - Exactly StudyAIDb_E2E
        // - StudyAIDb_Clean_* (ephemeral databases created by migration integration tests)
        // - Any database explicitly containing 'test' or 'e2e' (case-insensitive)
        var isAuthorizedTestDb =
            string.Equals(normalizedDb, "StudyAIDb_E2E", StringComparison.OrdinalIgnoreCase) ||
            normalizedDb.StartsWith("StudyAIDb_Clean_", StringComparison.OrdinalIgnoreCase) ||
            Regex.IsMatch(normalizedDb, @"(^|[_\.-])(test|e2e)($|[_\.-])", RegexOptions.IgnoreCase) ||
            normalizedDb.Contains("test", StringComparison.OrdinalIgnoreCase) ||
            normalizedDb.Contains("e2e", StringComparison.OrdinalIgnoreCase);

        if (!isAuthorizedTestDb)
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                $"Database '{normalizedDb}' is NOT an authorized test database. " +
                "Test executions must explicitly target isolated test databases (e.g. 'StudyAIDb_E2E', 'StudyAIDb_Clean_*', or contain 'test'/'e2e').");
        }

        return normalizedDb;
    }
}
