using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace StudyAI.Features.Admin;

public class AdminSystemService : IAdminSystemService
{
    private readonly IApplicationDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly IClock _clock;

    public AdminSystemService(IApplicationDbContext db, IConfiguration configuration, IClock clock)
    {
        _db = db;
        _configuration = configuration;
        _clock = clock;
    }

    public async Task<AdminSystemStatusDto> GetSystemStatusAsync(CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        bool dbConnected = false;
        try
        {
            dbConnected = await _db.Database.CanConnectAsync(ct);
            sw.Stop();
        }
        catch
        {
            sw.Stop();
        }

        int usersCount = await _db.Users.CountAsync(u => !u.IsDeleted, ct);
        int auditCount = await _db.StaffAuditLogs.CountAsync(ct);

        return new AdminSystemStatusDto
        {
            ApiStatus = "operational",
            Database = new AdminSystemDatabaseStatusDto
            {
                Status = dbConnected ? "connected" : "disconnected",
                LatencyMs = dbConnected ? Math.Round(sw.Elapsed.TotalMilliseconds, 2) : -1
            },
            Environment = _configuration["APP_ENV"] ?? "development",
            BackendVersion = "1.0.0",
            CheckedAt = _clock.UtcNow.ToString("o"),
            StorageStats = new AdminSystemStorageStatsDto
            {
                UsersCount = usersCount,
                ActivitiesCount = auditCount,
                AttentionCount = 0,
                IsLocalStoragePersisted = false
            }
        };
    }
}