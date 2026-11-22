using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Admin.Announcements;

public class AdminAnnouncementsService : IAdminAnnouncementsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public AdminAnnouncementsService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    public async Task<List<AnnouncementDto>> GetAnnouncementsAsync(string status = "all", string audience = "all", string? search = null, CancellationToken ct = default)
    {
        var logs = await _db.StaffAuditLogs
            .Where(l => l.TargetType == "announcement")
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(ct);

        var announcementsMap = new Dictionary<string, AnnouncementDto>();
        foreach (var log in logs)
        {
            if (string.IsNullOrWhiteSpace(log.Payload)) continue;
            try
            {
                var anc = JsonSerializer.Deserialize<AnnouncementDto>(log.Payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (anc != null && !announcementsMap.ContainsKey(anc.Id))
                {
                    if (log.Action == "announcement_deleted")
                    {
                        announcementsMap[anc.Id] = new AnnouncementDto { Id = anc.Id, Status = "deleted" };
                    }
                    else
                    {
                        announcementsMap[anc.Id] = anc;
                    }
                }
            }
            catch { }
        }

        var list = announcementsMap.Values.Where(a => a.Status != "deleted").ToList();
        if (status != "all") list = list.Where(a => a.Status == status).ToList();
        if (audience != "all") list = list.Where(a => a.Audience == audience).ToList();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            list = list.Where(a => a.Title.ToLower().Contains(s) || a.Content.ToLower().Contains(s)).ToList();
        }

        return list;
    }

    public async Task<AnnouncementDto> CreateAnnouncementAsync(SaveAnnouncementRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
        {
            throw new ValidationException("Title", "Tiêu đề thông báo không được để trống.");
        }

        var newAnc = new AnnouncementDto
        {
            Id = _idGenerator.NewId("anc"),
            Title = req.Title.Trim(),
            Content = req.Content?.Trim() ?? string.Empty,
            Audience = string.IsNullOrWhiteSpace(req.Audience) ? "all" : req.Audience.Trim(),
            TargetClassId = req.TargetClassId,
            TargetClassName = req.TargetClassName,
            Severity = string.IsNullOrWhiteSpace(req.Severity) ? "info" : req.Severity.Trim(),
            Status = string.IsNullOrWhiteSpace(req.Status) ? "published" : req.Status.Trim(),
            CreatedAt = _clock.UtcNow.ToString("o"),
            CreatedBy = "Quản trị viên"
        };

        var log = new StaffAuditLog
        {
            Id = _idGenerator.NewId("log"),
            ActorUserId = currentUserId,
            Action = "announcement_created",
            TargetType = "announcement",
            TargetId = newAnc.Id,
            Payload = JsonSerializer.Serialize(newAnc),
            CreatedAt = _clock.UtcNow
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(ct);

        return newAnc;
    }

    public async Task<AnnouncementDto> UpdateAnnouncementAsync(string id, SaveAnnouncementRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var existing = (await GetAnnouncementsAsync(ct: ct)).FirstOrDefault(a => a.Id == id);
        if (existing == null) throw new NotFoundException("Thông báo", id);

        existing.Title = string.IsNullOrWhiteSpace(req.Title) ? existing.Title : req.Title.Trim();
        existing.Content = req.Content != null ? req.Content.Trim() : existing.Content;
        existing.Audience = string.IsNullOrWhiteSpace(req.Audience) ? existing.Audience : req.Audience.Trim();
        existing.TargetClassId = req.TargetClassId ?? existing.TargetClassId;
        existing.TargetClassName = req.TargetClassName ?? existing.TargetClassName;
        existing.Severity = string.IsNullOrWhiteSpace(req.Severity) ? existing.Severity : req.Severity.Trim();
        existing.Status = string.IsNullOrWhiteSpace(req.Status) ? existing.Status : req.Status.Trim();
        existing.UpdatedAt = _clock.UtcNow.ToString("o");

        var log = new StaffAuditLog
        {
            Id = _idGenerator.NewId("log"),
            ActorUserId = currentUserId,
            Action = "announcement_updated",
            TargetType = "announcement",
            TargetId = existing.Id,
            Payload = JsonSerializer.Serialize(existing),
            CreatedAt = _clock.UtcNow
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(ct);

        return existing;
    }

    public async Task<bool> DeleteAnnouncementAsync(string id, string currentUserId, CancellationToken ct = default)
    {
        var existing = (await GetAnnouncementsAsync(ct: ct)).FirstOrDefault(a => a.Id == id);
        if (existing == null) throw new NotFoundException("Thông báo", id);

        var log = new StaffAuditLog
        {
            Id = _idGenerator.NewId("log"),
            ActorUserId = currentUserId,
            Action = "announcement_deleted",
            TargetType = "announcement",
            TargetId = id,
            Payload = JsonSerializer.Serialize(new { Id = id, Status = "deleted" }),
            CreatedAt = _clock.UtcNow
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(ct);

        return true;
    }
}
