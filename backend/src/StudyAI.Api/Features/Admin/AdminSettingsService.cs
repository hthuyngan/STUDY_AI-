using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Admin;

public class AdminSettingsService : IAdminSettingsService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public AdminSettingsService(
        IApplicationDbContext db,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    public async Task<OperationalSettingsDto> GetSettingsAsync(CancellationToken ct = default)
    {
        var log = await _db.StaffAuditLogs
            .Where(l => l.TargetType == "system_settings" && l.Action == "system_settings_updated")
            .OrderByDescending(l => l.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (log != null && !string.IsNullOrWhiteSpace(log.Payload))
        {
            try
            {
                var settings = JsonSerializer.Deserialize<OperationalSettingsDto>(log.Payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (settings != null)
                {
                    settings.Version = log.Id;
                    return settings;
                }
            }
            catch { }
        }

        return new OperationalSettingsDto
        {
            UpdatedAt = _clock.UtcNow.ToString("o"),
            UpdatedBy = "System",
            Version = "initial"
        };
    }

    public async Task<OperationalSettingsDto> UpdateSettingsAsync(OperationalSettingsDto req, string currentUserId, CancellationToken ct = default)
    {
        req.UpdatedAt = _clock.UtcNow.ToString("o");
        req.UpdatedBy = currentUserId;
        var newVersion = _idGenerator.NewId("set");
        req.Version = newVersion;

        var log = new StaffAuditLog
        {
            Id = newVersion,
            ActorUserId = currentUserId,
            Action = "system_settings_updated",
            TargetType = "system_settings",
            TargetId = "global",
            Payload = JsonSerializer.Serialize(req),
            CreatedAt = _clock.UtcNow
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(ct);

        return req;
    }
}