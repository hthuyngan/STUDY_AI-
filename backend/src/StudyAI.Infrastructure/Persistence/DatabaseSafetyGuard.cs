using System;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

namespace StudyAI.Infrastructure.Persistence;

/// <summary>
/// Hardened fail-closed database safety guard.
/// Ensures tests, migrations, and automated fixtures NEVER connect to or modify
/// the primary database "StudyAIDb", and strictly restricts test targets to an exact whitelist:
///   1. "StudyAIDb_E2E"
///   2. "StudyAIDb_Clean_{GUID}" (with a cryptographically valid 32-hex or 36-char GUID format).
/// All credentials and sensitive connection parameters are masked to prevent leakages in logs and exceptions.
/// </summary>
public static class DatabaseSafetyGuard
{
    private static bool _forcedTestExecution = false;
    private const string CleanPrefix = "StudyAIDb_Clean_";

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
    /// Sanitizes a connection string to strip passwords, user IDs, or sensitive tokens
    /// before inclusion in any exception message or log output.
    /// </summary>
    public static string SanitizeConnectionString(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return "<empty>";
        }

        try
        {
            var builder = new SqlConnectionStringBuilder(connectionString);
            var server = string.IsNullOrWhiteSpace(builder.DataSource) ? "<unspecified>" : builder.DataSource;
            var db = string.IsNullOrWhiteSpace(builder.InitialCatalog) ? "<unspecified>" : builder.InitialCatalog;
            var auth = builder.IntegratedSecurity ? "Integrated" : "CredentialsProvided(Masked)";
            return $"Server={server};Database={db};Auth={auth}";
        }
        catch
        {
            // If the connection string is malformed and cannot be parsed by SqlConnectionStringBuilder,
            // regex-scrub any passwords, secrets, or user ids to guarantee zero credentials leak.
            var scrubbed = Regex.Replace(connectionString, @"(?i)(password|pwd)\s*=\s*[^;]*", "$1=***");
            scrubbed = Regex.Replace(scrubbed, @"(?i)(user\s*id|uid)\s*=\s*[^;]*", "$1=***");
            return scrubbed;
        }
    }

    /// <summary>
    /// Checks whether a given database name strictly matches the authorized test whitelist:
    ///   - Exactly "StudyAIDb_E2E" (case-insensitive)
    ///   - Exactly "StudyAIDb_Clean_{GUID}" where GUID is a valid GUID
    /// Any database that merely contains "test" or "e2e" as a substring is strictly rejected.
    /// </summary>
    public static bool IsAuthorizedTestDatabase(string? databaseName)
    {
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            return false;
        }

        var normalized = databaseName.Trim().Trim('[', ']');

        // 1. Explicit Fail-Closed Block: "StudyAIDb" in any casing or format is never authorized
        if (string.Equals(normalized, "StudyAIDb", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // 2. Exactly StudyAIDb_E2E
        if (string.Equals(normalized, "StudyAIDb_E2E", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // 3. Exactly StudyAIDb_Clean_{GUID} with valid GUID format
        if (normalized.StartsWith(CleanPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var guidPart = normalized[CleanPrefix.Length..];
            if (Guid.TryParse(guidPart, out _))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Validates that a connection string points strictly to an authorized isolated test database
    /// and never to the production/primary database "StudyAIDb".
    /// Throws InvalidOperationException immediately if any violation or ambiguity is detected.
    /// Never leaks raw connection strings, passwords, or credentials in exception messages.
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
                "Integration tests and test fixtures require an explicitly designated test database ('StudyAIDb_E2E').");
        }

        SqlConnectionStringBuilder builder;
        try
        {
            builder = new SqlConnectionStringBuilder(connectionString);
        }
        catch (Exception ex)
        {
            var safeDiagnostic = SanitizeConnectionString(connectionString);
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                $"Malformed or unparseable connection string [{safeDiagnostic}]. Execution is blocked.", ex);
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

        // 2. Strict Exact Whitelist Check
        if (!IsAuthorizedTestDatabase(normalizedDb))
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                $"Database '{normalizedDb}' is NOT an authorized test database. " +
                "Test executions must target strictly authorized test databases: 'StudyAIDb_E2E' or 'StudyAIDb_Clean_{GUID}'. " +
                "Databases containing generic 'test' or 'e2e' substrings are rejected.");
        }

        return normalizedDb;
    }
}
