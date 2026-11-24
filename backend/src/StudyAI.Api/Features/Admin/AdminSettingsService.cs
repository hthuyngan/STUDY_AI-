using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Exceptions;
using StudyAI.Models;

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
        var setting = await _db.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == "global", ct);

        if (setting != null && !string.IsNullOrWhiteSpace(setting.Payload))
        {
            try
            {
                var dto = JsonSerializer.Deserialize<OperationalSettingsDto>(setting.Payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (dto != null)
                {
                    dto.Version = setting.Version;
                    dto.UpdatedAt = setting.UpdatedAt.ToString("o");
                    dto.UpdatedBy = setting.UpdatedBy;
                    return dto;
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
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.Id == "global", ct);

        if (setting != null)
        {
            if (string.IsNullOrEmpty(req.Version) || req.Version != setting.Version)
            {
                throw new ConflictException("Phiên bản cấu hình hệ thống đã thay đổi. Vui lòng tải lại trang.");
            }
        }
        else
        {
            if (!string.IsNullOrEmpty(req.Version) && req.Version != "initial")
            {
                throw new ConflictException("Phiên bản cấu hình hệ thống đã thay đổi. Vui lòng tải lại trang.");
            }

            setting = new SystemSetting
            {
                Id = "global"
            };
            _db.SystemSettings.Add(setting);
        }

        var now = _clock.UtcNow;
        var newVersion = _idGenerator.NewId("set");

        req.UpdatedAt = now.ToString("o");
        req.UpdatedBy = currentUserId;
        req.Version = newVersion;

        setting.Payload = JsonSerializer.Serialize(req);
        setting.Version = newVersion;
        setting.UpdatedBy = currentUserId;
        setting.UpdatedAt = now;

        var log = new StaffAuditLog
        {
            Id = newVersion,
            ActorUserId = currentUserId,
            Action = "system_settings_updated",
            TargetType = "system_settings",
            TargetId = "global",
            Payload = setting.Payload,
            CreatedAt = now
        };
        _db.StaffAuditLogs.Add(log);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Phiên bản cấu hình hệ thống đã thay đổi do thao tác đồng thời. Vui lòng tải lại trang.");
        }

        return req;
    }
}
