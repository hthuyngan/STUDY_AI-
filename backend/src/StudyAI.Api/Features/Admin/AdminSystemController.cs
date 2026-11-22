using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using StudyAI.Application.Common.Interfaces;

namespace StudyAI.Api.Features.Admin;

[ApiController]
[Route("api/v1/admin/system")]
[Authorize(Policy = "AdminOnly")]
public class AdminSystemController : ControllerBase
{
    private readonly IApplicationDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly IClock _clock;

    public AdminSystemController(IApplicationDbContext db, IConfiguration configuration, IClock clock)
    {
        _db = db;
        _configuration = configuration;
        _clock = clock;
    }

    [HttpGet("health")]
    public async Task<IActionResult> GetSystemHealth(CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        bool dbConnected = false;
        try
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT 1", ct);
            dbConnected = true;
            sw.Stop();
        }
        catch
        {
            sw.Stop();
        }

        int usersCount = await _db.Users.CountAsync(u => !u.IsDeleted, ct);
        int auditCount = await _db.StaffAuditLogs.CountAsync(ct);

        return Ok(new
        {
            apiStatus = "operational",
            database = new
            {
                status = dbConnected ? "connected" : "disconnected",
                latencyMs = dbConnected ? Math.Round(sw.Elapsed.TotalMilliseconds, 2) : -1
            },
            environment = _configuration["APP_ENV"] ?? "development",
            backendVersion = "1.0.0",
            checkedAt = _clock.UtcNow.ToString("o"),
            storageStats = new
            {
                usersCount = usersCount,
                activitiesCount = auditCount,
                attentionCount = 0,
                isLocalStoragePersisted = false
            }
        });
    }
}
