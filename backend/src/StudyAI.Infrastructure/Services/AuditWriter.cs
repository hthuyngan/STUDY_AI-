using System.Text.Json;
using StudyAI.Application.Common.Authorization;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Domain.Entities;

namespace StudyAI.Infrastructure.Services;

public class AuditWriter : IAuditWriter
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public AuditWriter(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _currentUser = currentUser;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    public async Task WriteStaffAuditAsync(
        string action,
        string targetType,
        string? targetId = null,
        string? beforeState = null,
        string? afterState = null,
        CancellationToken cancellationToken = default)
    {
        var payloadObj = new
        {
            before = beforeState,
            after = afterState,
            timestamp = _clock.UtcNow
        };

        var log = new StaffAuditLog
        {
            Id = _idGenerator.NewId("audit"),
            ActorUserId = _currentUser.UserId ?? "SYSTEM",
            Action = action,
            TargetType = targetType,
            TargetId = targetId ?? string.Empty,
            Payload = JsonSerializer.Serialize(payloadObj),
            CreatedAt = _clock.UtcNow
        };

        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
