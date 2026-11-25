using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Xunit;

namespace StudyAI.IntegrationTests;

public class DisposableDatabaseLifecycleIntegrationTests
{
    private static string GetMasterConnectionString()
    {
        var ciConn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (!string.IsNullOrWhiteSpace(ciConn))
        {
            return new SqlConnectionStringBuilder(ciConn) { InitialCatalog = "master" }.ConnectionString;
        }

        return "Server=.\\SQLEXPRESS;Database=master;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";
    }

    private static string NewTempManifestDir() =>
        Path.Combine(Path.GetTempPath(), $"studyai-lifecycle-test-{Guid.NewGuid():N}");

    private static void CleanupDir(string dir)
    {
        if (Directory.Exists(dir))
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    [Fact]
    public void SafeDrop_Succeeds_ForOwnedDatabase_And_FailsLoudly_OnTokenMismatch_WithoutDropping()
    {
        var masterConn = GetMasterConnectionString();
        var manifestDir = NewTempManifestDir();
        var dbName = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var entry = DisposableDatabaseOrchestrator.CreateOwnedDatabase(masterConn, dbName, "UnitOwnedDrop", manifestDir);

        try
        {
            // Ownership mismatch must throw and keep DB intact
            var ex = Assert.Throws<InvalidOperationException>(() =>
                DisposableDatabaseOrchestrator.SafeDropOwnedDatabase(masterConn, dbName, entry.RunId, "wrong_token", manifestDir));
            Assert.Contains("CRITICAL CLEANUP GUARD", ex.Message);

            using (var conn = new SqlConnection(masterConn))
            {
                conn.Open();
                Assert.True(DisposableDatabaseOrchestrator.DatabaseExists(conn, dbName));
            }

            // Valid ownership drops cleanly and deletes manifest
            DisposableDatabaseOrchestrator.SafeDropOwnedDatabase(masterConn, dbName, entry.RunId, entry.OwnershipToken, manifestDir);
            Assert.False(File.Exists(DisposableDatabaseOrchestrator.GetManifestPath(manifestDir, entry.RunId)));
        }
        finally
        {
            SqlConnection.ClearAllPools();
            using var conn = new SqlConnection(masterConn);
            conn.Open();
            if (DisposableDatabaseOrchestrator.DatabaseExists(conn, dbName))
            {
                using var drop = conn.CreateCommand();
                drop.CommandText = $"DROP DATABASE [{dbName}];";
                drop.ExecuteNonQuery();
            }
            CleanupDir(manifestDir);
        }
    }

    [Fact]
    public void SafeDrop_FailsClosed_WhenActiveSqlSessionIsOpen()
    {
        var masterConn = GetMasterConnectionString();
        var manifestDir = NewTempManifestDir();
        var dbName = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var entry = DisposableDatabaseOrchestrator.CreateOwnedDatabase(masterConn, dbName, "ActiveSessionGuard", manifestDir);
        var dbConnStr = new SqlConnectionStringBuilder(masterConn) { InitialCatalog = dbName }.ConnectionString;

        try
        {
            using (var activeConn = new SqlConnection(dbConnStr))
            {
                activeConn.Open();
                var ex = Assert.Throws<InvalidOperationException>(() =>
                    DisposableDatabaseOrchestrator.SafeDropOwnedDatabase(masterConn, dbName, entry.RunId, entry.OwnershipToken, manifestDir));
                Assert.Contains("active SQL session", ex.Message);
            }

            // Once active session closes, cleanup succeeds cleanly without SINGLE_USER
            DisposableDatabaseOrchestrator.SafeDropOwnedDatabase(masterConn, dbName, entry.RunId, entry.OwnershipToken, manifestDir);
        }
        finally
        {
            SqlConnection.ClearAllPools();
            using var conn = new SqlConnection(masterConn);
            conn.Open();
            if (DisposableDatabaseOrchestrator.DatabaseExists(conn, dbName))
            {
                using var drop = conn.CreateCommand();
                drop.CommandText = $"DROP DATABASE [{dbName}];";
                drop.ExecuteNonQuery();
            }
            CleanupDir(manifestDir);
        }
    }

    [Fact]
    public void Recovery_DetectsPidReuse_And_SkipsLiveProcess()
    {
        var masterConn = GetMasterConnectionString();
        var manifestDir = NewTempManifestDir();
        var deadPidReuseDb = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var liveDb = $"StudyAIDb_Clean_{Guid.NewGuid():N}";

        var reuseEntry = DisposableDatabaseOrchestrator.CreateOwnedDatabase(masterConn, deadPidReuseDb, "PidReuse", manifestDir);
        // Simulate PID reuse: same PID as current process, but original start time 1 hour earlier
        reuseEntry.ProcessStartTimeUtc = DateTimeOffset.UtcNow.AddHours(-1).ToString("O");
        DisposableDatabaseOrchestrator.WriteManifestAtomic(manifestDir, reuseEntry);

        var liveEntry = DisposableDatabaseOrchestrator.CreateOwnedDatabase(masterConn, liveDb, "LiveProcess", manifestDir);

        try
        {
            var result = DisposableDatabaseOrchestrator.RecoverInterruptedOwnedDatabases(masterConn, manifestDir);
            Assert.Contains(deadPidReuseDb, result.Recovered);
            Assert.Contains(liveDb, result.Skipped);

            using var conn = new SqlConnection(masterConn);
            conn.Open();
            Assert.False(DisposableDatabaseOrchestrator.DatabaseExists(conn, deadPidReuseDb));
            Assert.True(DisposableDatabaseOrchestrator.DatabaseExists(conn, liveDb));
        }
        finally
        {
            SqlConnection.ClearAllPools();
            using var conn = new SqlConnection(masterConn);
            conn.Open();
            if (DisposableDatabaseOrchestrator.DatabaseExists(conn, liveDb))
            {
                DisposableDatabaseOrchestrator.SafeDropOwnedDatabase(masterConn, liveDb, liveEntry.RunId, liveEntry.OwnershipToken, manifestDir);
            }
            CleanupDir(manifestDir);
        }
    }

    [Fact]
    public async Task ProcessKill_Recovery_DropsKilledChildRunDb_And_PreservesLiveRunDb()
    {
        var masterConn = GetMasterConnectionString();
        var manifestDir = NewTempManifestDir();

        // Spawn a real child process, record its real PID & start time as owner of a disposable DB, then kill it
        var psi = new ProcessStartInfo
        {
            FileName = OperatingSystem.IsWindows() ? "cmd.exe" : "sleep",
            Arguments = OperatingSystem.IsWindows() ? "/c ping -n 30 127.0.0.1 >nul" : "30",
            CreateNoWindow = true,
            UseShellExecute = false
        };

        using var child = Process.Start(psi)!;
        var killedDb = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var liveDb = $"StudyAIDb_Clean_{Guid.NewGuid():N}";

        var killedEntry = DisposableDatabaseOrchestrator.CreateOwnedDatabase(masterConn, killedDb, "KilledProcessTest", manifestDir);
        killedEntry.Pid = child.Id;
        killedEntry.ProcessStartTimeUtc = child.StartTime.ToUniversalTime().ToString("O");
        DisposableDatabaseOrchestrator.WriteManifestAtomic(manifestDir, killedEntry);

        var liveEntry = DisposableDatabaseOrchestrator.CreateOwnedDatabase(masterConn, liveDb, "LiveRunnerTest", manifestDir);

        try
        {
            child.Kill(entireProcessTree: true);
            await child.WaitForExitAsync();

            var recovery = DisposableDatabaseOrchestrator.RecoverInterruptedOwnedDatabases(masterConn, manifestDir);
            Assert.Contains(killedDb, recovery.Recovered);
            Assert.Contains(liveDb, recovery.Skipped);

            using var conn = new SqlConnection(masterConn);
            conn.Open();
            Assert.False(DisposableDatabaseOrchestrator.DatabaseExists(conn, killedDb));
            Assert.True(DisposableDatabaseOrchestrator.DatabaseExists(conn, liveDb));
        }
        finally
        {
            if (!child.HasExited)
            {
                child.Kill(entireProcessTree: true);
            }
            SqlConnection.ClearAllPools();
            using var conn = new SqlConnection(masterConn);
            conn.Open();
            if (DisposableDatabaseOrchestrator.DatabaseExists(conn, liveDb))
            {
                DisposableDatabaseOrchestrator.SafeDropOwnedDatabase(masterConn, liveDb, liveEntry.RunId, liveEntry.OwnershipToken, manifestDir);
            }
            CleanupDir(manifestDir);
        }
    }

    [Fact]
    public async Task ConcurrentRunners_PerRunManifests_CreateAndDropWithoutRace()
    {
        var masterConn = GetMasterConnectionString();
        var manifestDir = NewTempManifestDir();

        try
        {
            var tasks = Enumerable.Range(0, 3).Select(i => Task.Run(() =>
            {
                var dbName = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
                var entry = DisposableDatabaseOrchestrator.CreateOwnedDatabase(masterConn, dbName, $"Concurrent_{i}", manifestDir);
                DisposableDatabaseOrchestrator.SafeDropOwnedDatabase(masterConn, dbName, entry.RunId, entry.OwnershipToken, manifestDir);
                return dbName;
            })).ToArray();

            var created = await Task.WhenAll(tasks);
            Assert.Equal(3, created.Distinct().Count());
            Assert.Empty(Directory.GetFiles(manifestDir, "*.json"));
        }
        finally
        {
            CleanupDir(manifestDir);
        }
    }
}
