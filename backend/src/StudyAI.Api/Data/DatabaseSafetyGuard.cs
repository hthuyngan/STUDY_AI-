using System;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

namespace StudyAI.Data;

/// <summary>
/// Safe non-secret metadata parsed from a SQL Server connection string for diagnostics.
/// </summary>
public sealed record SafeDatabaseMetadata(string DatabaseName, string DataSource);

/// <summary>
/// Hardened fail-closed database safety guard.
/// Enforces single-persistent-database + disposable-test-database separation:
///   - Persistent DB ("StudyAIDb"): used by Production and Development website runtime; strictly forbidden in Testing,
///     automated tests, test fixtures, Playwright, automated startup migrations, or runtime test-account bootstrap.
///   - Disposable Test DB ("StudyAIDb_Clean_{GUID}" where GUID is strictly Guid:N or Guid:D):
///     the ONLY authorized target for Testing, integration tests, and Playwright E2E.
/// All malformed connection strings produce constant error messages without reflecting input or attaching InnerExceptions,
/// preventing any secret, credential, or token leakage.
/// </summary>
public static class DatabaseSafetyGuard
{
    public const string ProductionDatabaseName = "StudyAIDb";

    private static bool _forcedTestExecution = false;
    private const string CleanPrefix = "StudyAIDb_Clean_";

    private static readonly Regex GuidNDRegex = new(
        @"^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
        RegexOptions.Compiled);

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
    /// Checks whether a given database name strictly matches the authorized disposable test whitelist:
    ///   - Exactly "StudyAIDb_Clean_{GUID}" where GUID strictly matches Guid:N (32 hex) or Guid:D (36 chars)
    /// Static databases ("StudyAIDb", "StudyAIDb_Dev", "StudyAIDb_E2E") and formats B/P/X are strictly rejected.
    /// </summary>
    public static bool IsAuthorizedTestDatabase(string? databaseName)
    {
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            return false;
        }

        var normalized = databaseName.Trim().Trim('[', ']');

        // 1. Explicit Fail-Closed Block: "StudyAIDb" (and legacy persistent names) are never authorized for tests
        if (string.Equals(normalized, ProductionDatabaseName, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // 2. Strictly StudyAIDb_Clean_{GUID} with Guid:N (32 hex) or Guid:D (36 chars)
        if (normalized.StartsWith(CleanPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var guidPart = normalized[CleanPrefix.Length..];
            if (GuidNDRegex.IsMatch(guidPart) &&
                (Guid.TryParseExact(guidPart, "N", out _) || Guid.TryParseExact(guidPart, "D", out _)))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Extracts safe non-secret database metadata (DatabaseName, DataSource) without throwing or exposing credentials.
    /// </summary>
    public static SafeDatabaseMetadata GetSafeDatabaseMetadata(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return new SafeDatabaseMetadata("unconfigured", "unconfigured");
        }

        try
        {
            var builder = new SqlConnectionStringBuilder(connectionString);
            var db = string.IsNullOrWhiteSpace(builder.InitialCatalog)
                ? "unconfigured"
                : builder.InitialCatalog.Trim().Trim('[', ']');
            var ds = string.IsNullOrWhiteSpace(builder.DataSource)
                ? "unknown"
                : builder.DataSource.Trim();
            return new SafeDatabaseMetadata(db, ds);
        }
        catch
        {
            return new SafeDatabaseMetadata("invalid", "invalid");
        }
    }

    /// <summary>
    /// Enforces strict environment-to-database separation:
    ///   - Testing: strictly ONLY "StudyAIDb_Clean_{GUID}" (blocks StudyAIDb, StudyAIDb_E2E, StudyAIDb_Dev).
    ///   - Development / Production: allows explicit "StudyAIDb" at runtime; blocks automated Seed/Import/Bootstrap,
    ///     and blocks legacy "StudyAIDb_E2E" / "StudyAIDb_Dev" or disposable test DBs in Development/Production.
    ///   - Automated Migration/Seed/Import on "StudyAIDb" is blocked unless executed explicitly via controlled EF CLI (not app startup).
    /// </summary>
    public static string EnsureSafeDatabaseForEnvironment(
        string? connectionString,
        string environmentName,
        string callerContext = "Runtime")
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                "Connection string is null, empty, or unconfigured.");
        }

        SqlConnectionStringBuilder builder;
        try
        {
            builder = new SqlConnectionStringBuilder(connectionString);
        }
        catch
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                "Malformed or unparseable connection string syntax. Execution is blocked for security reasons.");
        }

        var rawDbName = builder.InitialCatalog;
        if (string.IsNullOrWhiteSpace(rawDbName))
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                "No database name (Initial Catalog) was specified in the connection string. Execution is blocked.");
        }

        var normalizedDb = rawDbName.Trim().Trim('[', ']');

        if (string.IsNullOrWhiteSpace(environmentName))
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                "Host environment name is missing or empty. Execution is blocked (fail-closed).");
        }

        bool isDevelopment = string.Equals(environmentName, "Development", StringComparison.OrdinalIgnoreCase);
        bool isProduction = string.Equals(environmentName, "Production", StringComparison.OrdinalIgnoreCase);
        bool isTesting = string.Equals(environmentName, "Testing", StringComparison.OrdinalIgnoreCase);

        if (!isDevelopment && !isProduction && !isTesting)
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                $"Unrecognized or unconfigured environment '{environmentName}'. " +
                "Only 'Development', 'Production' (targeting StudyAIDb), and 'Testing' (targeting StudyAIDb_Clean_{GUID}) are permitted.");
        }

        bool isAutoMutationContext =
            callerContext.Contains("Startup Migration", StringComparison.OrdinalIgnoreCase) ||
            callerContext.Contains("Migration", StringComparison.OrdinalIgnoreCase) ||
            callerContext.Contains("Seed", StringComparison.OrdinalIgnoreCase) ||
            callerContext.Contains("Import", StringComparison.OrdinalIgnoreCase) ||
            callerContext.Contains("Bootstrap", StringComparison.OrdinalIgnoreCase);

        if (isTesting)
        {
            if (!IsAuthorizedTestDatabase(normalizedDb))
            {
                throw new InvalidOperationException(
                    $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                    $"Testing environment resolved to '{normalizedDb}', which is NOT an authorized disposable test database. " +
                    "Testing is strictly forbidden from targeting 'StudyAIDb', 'StudyAIDb_Dev', or 'StudyAIDb_E2E', " +
                    "and must strictly target 'StudyAIDb_Clean_{GUID}' (Guid:N or Guid:D).");
            }

            return normalizedDb;
        }

        // Development & Production MUST strictly target StudyAIDb only (never fallback to StudyAIDb_E2E, StudyAIDb_Dev, or arbitrary DBs)
        if (!string.Equals(normalizedDb, ProductionDatabaseName, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                $"{environmentName} environment resolved to '{normalizedDb}', which is NOT authorized. " +
                $"{environmentName} must strictly target 'StudyAIDb' and is forbidden from connecting to '{normalizedDb}'.");
        }

        if (isAutoMutationContext)
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                $"Operation BLOCKED! Target database resolved to primary database '{normalizedDb}'. " +
                "Automatic migrations, reference seeding, CLI bootstrap, and automated import scripts are strictly FORBIDDEN on 'StudyAIDb'.");
        }

        return normalizedDb;
    }

    /// <summary>
    /// Validates database target for development server startups, migrations, reference data seeding, and import scripts.
    /// Delegates to <see cref="EnsureSafeDatabaseForEnvironment"/> for fail-closed environment isolation.
    /// </summary>
    public static string EnsureSafeDatabaseForDevelopmentOrMigration(
        string? connectionString,
        string environmentName,
        string callerContext = "DevelopmentOrMigration")
    {
        return EnsureSafeDatabaseForEnvironment(connectionString, environmentName, callerContext);
    }

    /// <summary>
    /// Validates that a connection string points strictly to an authorized isolated test database
    /// and never to the production/primary database "StudyAIDb".
    /// Throws InvalidOperationException immediately if any violation or ambiguity is detected.
    /// Uses fixed error messages and never reflects raw connection strings, credentials, or inner exceptions.
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
        catch
        {
            // Security hardening: Fixed constant message without echoing input connection string,
            // and without attaching raw InnerException which could contain cleartext credentials.
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                "Malformed or unparseable connection string syntax. Execution is blocked for security reasons.");
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

        // 2. Strict Exact Whitelist Check (StudyAIDb_Clean_{Guid:N|Guid:D} ONLY)
        if (!IsAuthorizedTestDatabase(normalizedDb))
        {
            throw new InvalidOperationException(
                $"CRITICAL DATABASE SAFETY GUARD TRIGGERED [{callerContext}]: " +
                $"Database '{normalizedDb}' is NOT an authorized test database. " +
                "Test executions must target strictly authorized disposable databases: 'StudyAIDb_Clean_{GUID}' (Guid:N or Guid:D). " +
                "Static databases ('StudyAIDb', 'StudyAIDb_Dev', 'StudyAIDb_E2E'), generic substrings, or non-N/D GUID formats are rejected.");
        }

        return normalizedDb;
    }
}
