using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Admin;

public class AdminAuditService : IAdminAuditService
{
    private readonly IApplicationDbContext _db;

    public AdminAuditService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<AdminAuditLogsResponseDto> GetAuditLogsAsync(string? action = null, string? targetId = null, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _db.StaffAuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(l => l.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(targetId))
        {
            query = query.Where(l => l.TargetId == targetId);
        }

        var total = await query.CountAsync(ct);
        var logs = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = new List<AdminActivityDto>();
        foreach (var log in logs)
        {
            var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == log.ActorUserId, ct);
            items.Add(new AdminActivityDto
            {
                Id = log.Id,
                Action = log.Action,
                Actor = actor?.DisplayName ?? log.ActorUserId,
                TargetType = log.TargetType,
                TargetId = log.TargetId,
                Payload = log.Payload,
                Timestamp = log.CreatedAt.ToString("o")
            });
        }

        return new AdminAuditLogsResponseDto
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            Total = total
        };
    }
}