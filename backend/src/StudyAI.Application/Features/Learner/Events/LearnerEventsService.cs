using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Learner.Events;

public class LearnerEventsService : ILearnerEventsService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;

    public LearnerEventsService(IApplicationDbContext db, IClock clock)
    {
        _db = db;
        _clock = clock;
    }

    private static bool CanAccess(string requestingUserId, string targetUserId, bool isAdmin) =>
        isAdmin || string.Equals(requestingUserId, targetUserId, StringComparison.OrdinalIgnoreCase);

    public async Task<LearningEventBatchResponseDto> PostEventsBatchAsync(
        string requestingUserId,
        string targetUserId,
        bool isAdmin,
        LearningEventBatchRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!CanAccess(requestingUserId, targetUserId, isAdmin))
            throw new ForbiddenException("Bạn không có quyền gửi sự kiện học tập cho người dùng này.");

        int inserted = 0;
        int duplicates = 0;
        var now = _clock.UtcNow;

        foreach (var ev in dto.Events ?? new List<LearningEventItemDto>())
        {
            var id = string.IsNullOrEmpty(ev.Id) ? $"evt_{Guid.NewGuid():N}" : ev.Id;
            if (await _db.LearningEvents.AnyAsync(e => e.Id == id, cancellationToken))
            {
                duplicates++;
                continue;
            }

            var model = new LearningEvent
            {
                Id = id,
                UserId = targetUserId,
                AttemptId = ev.AttemptId,
                LessonId = ev.LessonId,
                SubjectId = ev.SubjectId,
                Timestamp = ev.Timestamp == default ? now : ev.Timestamp,
                Type = ev.Type,
                PayloadJson = ev.Payload?.ToJsonString(),
                SchemaVersion = ev.SchemaVersion
            };
            _db.LearningEvents.Add(model);
            inserted++;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new LearningEventBatchResponseDto
        {
            Inserted = inserted,
            Duplicates = duplicates,
            Failed = 0
        };
    }

    public async Task<List<LearningEventItemDto>> GetEventsAsync(
        string requestingUserId,
        string targetUserId,
        bool isAdmin,
        int limit = 100,
        DateTimeOffset? before = null,
        string? lessonId = null,
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        if (!CanAccess(requestingUserId, targetUserId, isAdmin))
            throw new ForbiddenException("Bạn không có quyền truy cập sự kiện học tập của người dùng này.");

        var query = _db.LearningEvents.Where(e => e.UserId == targetUserId);

        if (before.HasValue)
        {
            query = query.Where(e => e.Timestamp < before.Value);
        }
        if (!string.IsNullOrEmpty(lessonId))
        {
            query = query.Where(e => e.LessonId == lessonId);
        }
        if (!string.IsNullOrEmpty(subjectId))
        {
            query = query.Where(e => e.SubjectId == subjectId);
        }

        var items = await query.OrderByDescending(e => e.Timestamp).Take(limit).ToListAsync(cancellationToken);

        return items.Select(e => new LearningEventItemDto
        {
            Id = e.Id,
            AttemptId = e.AttemptId,
            LessonId = e.LessonId,
            SubjectId = e.SubjectId,
            Timestamp = e.Timestamp,
            Type = e.Type,
            Payload = string.IsNullOrEmpty(e.PayloadJson) ? null : JsonNode.Parse(e.PayloadJson),
            SchemaVersion = e.SchemaVersion
        }).ToList();
    }
}
