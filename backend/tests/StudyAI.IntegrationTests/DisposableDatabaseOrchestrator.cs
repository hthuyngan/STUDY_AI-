using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.SqlClient;

namespace StudyAI.IntegrationTests;

public sealed class DisposableDbManifestEntry
{
    [JsonPropertyName("runId")]
    public string RunId { get; set; } = string.Empty;

    [JsonPropertyName("databaseName")]
    public string DatabaseName { get; set; } = string.Empty;

    [JsonPropertyName("ownershipToken")]
    public string OwnershipToken { get; set; } = string.Empty;

    [JsonPropertyName("pid")]
    public int Pid { get; set; }

    [JsonPropertyName("processStartTimeUtc")]
    public string ProcessStartTimeUtc { get; set; } = string.Empty;

    [JsonPropertyName("machineName")]
    public string MachineName { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("callerContext")]
    public string CallerContext { get; set; } = string.Empty;

    [JsonPropertyName("server")]
    public string Server { get; set; } = string.Empty;

    [JsonPropertyName("createdAtUtc")]
    public string CreatedAtUtc { get; set; } = string.Empty;

    [JsonPropertyName("updatedAtUtc")]
    public string UpdatedAtUtc { get; set; } = string.Empty;
}

public sealed record RecoveryExecutionResult(IReadOnlyList<string> Recovered, IReadOnlyList<string> Skipped);

/// <summary>
/// Cross-process safe disposable database lifecycle orchestrator.
/// Uses per-run atomic manifest files compatible with scripts/utils/disposableDb.ts,
/// verifies SQL StudyAI_OwnershipToken + PID/StartTime + active SQL sessions,
/// and never uses SINGLE_USER WITH ROLLBACK IMMEDIATE.
/// </summary>
public static class DisposableDatabaseOrchestrator
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public static string DefaultManifestDirectory =>
        Path.Combine(Path.GetTempPath(), "studyai-disposable-runs");

    public static string GetCurrentProcessStartTimeUtcIso()
    {
        using var current = Process.GetCurrentProcess();
        return current.StartTime.ToUniversalTime().ToString("O");
    }

    public static bool IsOwnerProcessAlive(int pid, string? expectedStartTimeUtcIso, string? machineName)
    {
        if (!string.IsNullOrWhiteSpace(machineName) &&
            !string.Equals(machineName, Environment.MachineName, StringComparison.OrdinalIgnoreCase))
        {
            // Do not assume local PID validity for another machine
            return true;
        }

        if (pid <= 0)
        {
            return false;
        }

        try
        {
            using var proc = Process.GetProcessById(pid);
            if (proc.HasExited)
            {
                return false;
            }

            if (DateTimeOffset.TryParse(expectedStartTimeUtcIso, out var expectedStart))
            {
                var actualStart = new DateTimeOffset(proc.StartTime.ToUniversalTime(), TimeSpan.Zero);
                // If PID was reused, start times differ by > 2 seconds -> original owner is dead
                if (Math.Abs((actualStart - expectedStart).TotalSeconds) > 2.0)
                {
                    return false;
                }
            }

            return true;
        }
        catch (ArgumentException)
        {
            return false;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }

    public static string GetManifestPath(string manifestDir, string runId) =>
        Path.Combine(manifestDir, $"{runId}.json");

    public static void WriteManifestAtomic(string manifestDir, DisposableDbManifestEntry entry)
    {
        Directory.CreateDirectory(manifestDir);
        entry.UpdatedAtUtc = DateTimeOffset.UtcNow.ToString("O");
        var targetPath = GetManifestPath(manifestDir, entry.RunId);
        var tempPath = $"{targetPath}.tmp.{Environment.ProcessId}.{Guid.NewGuid():N}";
        var json = JsonSerializer.Serialize(entry, JsonOptions);
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, targetPath, overwrite: true);
    }

    public static DisposableDbManifestEntry? ReadManifest(string manifestPath)
    {
        if (!File.Exists(manifestPath))
        {
            return null;
        }

        var json = File.ReadAllText(manifestPath);
        return JsonSerializer.Deserialize<DisposableDbManifestEntry>(json, JsonOptions);
    }

    public static DisposableDbManifestEntry CreateOwnedDatabase(
        string masterConnStr,
        string dbName,
        string callerContext,
        string? manifestDir = null)
    {
        var dir = manifestDir ?? DefaultManifestDirectory;
        var cleanConn = new SqlConnectionStringBuilder(masterConnStr) { InitialCatalog = dbName }.ConnectionString;
        DatabaseSafetyGuard.EnsureSafeTestDatabase(cleanConn, callerContext);

        var runId = Guid.NewGuid().ToString("N");
        var ownershipToken = Guid.NewGuid().ToString("N");
        var builder = new SqlConnectionStringBuilder(masterConnStr);

        var entry = new DisposableDbManifestEntry
        {
            RunId = runId,
            DatabaseName = dbName,
            OwnershipToken = ownershipToken,
            Pid = Environment.ProcessId,
            ProcessStartTimeUtc = GetCurrentProcessStartTimeUtcIso(),
            MachineName = Environment.MachineName,
            Status = "provisioning",
            CallerContext = callerContext,
            Server = builder.DataSource,
            CreatedAtUtc = DateTimeOffset.UtcNow.ToString("O"),
            UpdatedAtUtc = DateTimeOffset.UtcNow.ToString("O")
        };

        WriteManifestAtomic(dir, entry);

        using (var conn = new SqlConnection(masterConnStr))
        {
            conn.Open();
            using var cmd = conn.CreateCommand();
            // Strict CREATE DATABASE (no IF DB_ID IS NULL) guarantees fresh creation & exclusive ownership
            cmd.CommandText = $@"
                CREATE DATABASE [{dbName}];
                EXEC [{dbName}].sys.sp_addextendedproperty @name = N'StudyAI_OwnershipToken', @value = N'{ownershipToken}';
                EXEC [{dbName}].sys.sp_addextendedproperty @name = N'StudyAI_RunId', @value = N'{runId}';";
            cmd.ExecuteNonQuery();
        }

        entry.Status = "active";
        WriteManifestAtomic(dir, entry);
        return entry;
    }

    public static bool DatabaseExists(SqlConnection masterConn, string dbName)
    {
        using var cmd = masterConn.CreateCommand();
        cmd.CommandText = "SELECT CASE WHEN DB_ID(@dbName) IS NULL THEN 0 ELSE 1 END;";
        cmd.Parameters.AddWithValue("@dbName", dbName);
        return Convert.ToInt32(cmd.ExecuteScalar()) == 1;
    }

    public static int CountActiveSqlSessions(SqlConnection masterConn, string dbName)
    {
        using var cmd = masterConn.CreateCommand();
        cmd.CommandText = @"
            SELECT COUNT(*)
            FROM sys.dm_exec_sessions
            WHERE database_id = DB_ID(@dbName)
              AND session_id <> @@SPID;";
        cmd.Parameters.AddWithValue("@dbName", dbName);
        return Convert.ToInt32(cmd.ExecuteScalar());
    }

    public static string? ReadSqlOwnershipToken(SqlConnection masterConn, string dbName)
    {
        using var cmd = masterConn.CreateCommand();
        cmd.CommandText = $@"
            SELECT ISNULL(CAST(value AS nvarchar(128)), '')
            FROM [{dbName}].sys.extended_properties
            WHERE class = 0 AND name = N'StudyAI_OwnershipToken';";
        return cmd.ExecuteScalar()?.ToString();
    }

    public static void SafeDropOwnedDatabase(
        string masterConnStr,
        string dbName,
        string runId,
        string expectedOwnershipToken,
        string? manifestDir = null)
    {
        var dir = manifestDir ?? DefaultManifestDirectory;
        var manifestPath = GetManifestPath(dir, runId);
        var entry = ReadManifest(manifestPath);

        if (entry == null ||
            !string.Equals(entry.DatabaseName, dbName, StringComparison.Ordinal) ||
            !string.Equals(entry.OwnershipToken, expectedOwnershipToken, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"CRITICAL CLEANUP GUARD: Refusing to drop '{dbName}' because manifest ownership for run '{runId}' could not be verified.");
        }

        DatabaseSafetyGuard.EnsureSafeTestDatabase(
            new SqlConnectionStringBuilder(masterConnStr) { InitialCatalog = dbName }.ConnectionString,
            "DisposableDatabaseOrchestrator.SafeDrop");

        entry.Status = "cleaning";
        WriteManifestAtomic(dir, entry);

        try
        {
            SqlConnection.ClearAllPools();
            using var conn = new SqlConnection(masterConnStr);
            conn.Open();

            if (!DatabaseExists(conn, dbName))
            {
                throw new InvalidOperationException(
                    $"CRITICAL CLEANUP GUARD: Owned disposable database '{dbName}' does not exist on server.");
            }

            var actualToken = ReadSqlOwnershipToken(conn, dbName);
            if (!string.Equals(actualToken, expectedOwnershipToken, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"CRITICAL CLEANUP GUARD: Refusing to drop '{dbName}' because SQL StudyAI_OwnershipToken did not match run '{runId}'.");
            }

            // Wait briefly for recently closed client pools before failing closed on active sessions
            var activeSessions = CountActiveSqlSessions(conn, dbName);
            for (int attempt = 0; attempt < 5 && activeSessions > 0; attempt++)
            {
                Thread.Sleep(200);
                SqlConnection.ClearAllPools();
                activeSessions = CountActiveSqlSessions(conn, dbName);
            }

            if (activeSessions > 0)
            {
                throw new InvalidOperationException(
                    $"CRITICAL CLEANUP GUARD: Refusing to drop '{dbName}' while {activeSessions} active SQL session(s) remain open (SINGLE_USER WITH ROLLBACK IMMEDIATE is forbidden).");
            }

            // Safe exclusive drop without terminating external sessions
            using var dropCmd = conn.CreateCommand();
            dropCmd.CommandText = $@"
                SET LOCK_TIMEOUT 3000;
                DROP DATABASE [{dbName}];";
            dropCmd.ExecuteNonQuery();

            if (File.Exists(manifestPath))
            {
                File.Delete(manifestPath);
            }
        }
        catch
        {
            entry.Status = "failed_cleanup";
            WriteManifestAtomic(dir, entry);
            throw;
        }
    }

    public static RecoveryExecutionResult RecoverInterruptedOwnedDatabases(
        string masterConnStr,
        string? manifestDir = null,
        Func<int, string?, string?, bool>? processAliveCheck = null)
    {
        var dir = manifestDir ?? DefaultManifestDirectory;
        if (!Directory.Exists(dir))
        {
            return new RecoveryExecutionResult(Array.Empty<string>(), Array.Empty<string>());
        }

        var isAlive = processAliveCheck ?? IsOwnerProcessAlive;
        var recovered = new List<string>();
        var skipped = new List<string>();

        foreach (var file in Directory.GetFiles(dir, "*.json"))
        {
            if (file.Contains(".tmp.", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            DisposableDbManifestEntry? entry;
            try
            {
                entry = ReadManifest(file);
            }
            catch
            {
                continue;
            }

            if (entry == null || string.IsNullOrWhiteSpace(entry.DatabaseName) || string.IsNullOrWhiteSpace(entry.OwnershipToken))
            {
                continue;
            }

            if (!DatabaseSafetyGuard.IsAuthorizedTestDatabase(entry.DatabaseName))
            {
                skipped.Add(entry.DatabaseName);
                continue;
            }

            if (isAlive(entry.Pid, entry.ProcessStartTimeUtc, entry.MachineName))
            {
                skipped.Add(entry.DatabaseName);
                continue;
            }

            using var conn = new SqlConnection(masterConnStr);
            conn.Open();

            if (!DatabaseExists(conn, entry.DatabaseName))
            {
                // Already gone; remove stale manifest entry
                File.Delete(file);
                continue;
            }

            var sqlToken = ReadSqlOwnershipToken(conn, entry.DatabaseName);
            if (!string.Equals(sqlToken, entry.OwnershipToken, StringComparison.Ordinal))
            {
                skipped.Add(entry.DatabaseName);
                continue;
            }

            if (CountActiveSqlSessions(conn, entry.DatabaseName) > 0)
            {
                skipped.Add(entry.DatabaseName);
                continue;
            }

            SafeDropOwnedDatabase(masterConnStr, entry.DatabaseName, entry.RunId, entry.OwnershipToken, dir);
            recovered.Add(entry.DatabaseName);
        }

        return new RecoveryExecutionResult(recovered, skipped);
    }
}
