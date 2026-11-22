using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Content.Topics;

public class ContentTopicsService : IContentTopicsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public ContentTopicsService(
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

    public async Task<object> ListTopicsAsync(string? chapterId = null, string? search = null, CancellationToken ct = default)
    {
        var query = _db.ContentTopics
            .Include(t => t.Chapter)
            .Include(t => t.Lessons)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(chapterId) && chapterId != "all")
        {
            query = query.Where(t => t.ChapterId == chapterId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(term));
        }

        var topics = await query
            .OrderBy(t => t.OrderIndex)
            .ThenBy(t => t.CreatedAt)
            .ToListAsync(ct);

        var result = topics.Select(t => new ContentTopicItemDto
        {
            Id = t.Id,
            ChapterId = t.ChapterId,
            ChapterTitle = t.Chapter?.Title ?? "",
            Title = t.Title,
            Description = t.Description ?? "",
            OrderIndex = t.OrderIndex,
            IsActive = t.IsActive,
            LessonCount = t.Lessons.Count,
            CreatedAt = t.CreatedAt.ToString("o"),
            UpdatedAt = t.UpdatedAt.ToString("o")
        }).ToList();

        return new { items = result, total = result.Count };
    }

    public async Task<ContentTopicItemDto> GetTopicDetailAsync(string topicId, CancellationToken ct = default)
    {
        var topic = await _db.ContentTopics
            .Include(t => t.Chapter)
            .Include(t => t.Lessons)
            .FirstOrDefaultAsync(t => t.Id == topicId, ct);

        if (topic == null)
            throw new NotFoundException("Chủ đề không tồn tại.");

        return new ContentTopicItemDto
        {
            Id = topic.Id,
            ChapterId = topic.ChapterId,
            ChapterTitle = topic.Chapter?.Title ?? "",
            Title = topic.Title,
            Description = topic.Description ?? "",
            OrderIndex = topic.OrderIndex,
            IsActive = topic.IsActive,
            LessonCount = topic.Lessons.Count,
            CreatedAt = topic.CreatedAt.ToString("o"),
            UpdatedAt = topic.UpdatedAt.ToString("o")
        };
    }

    public async Task<ContentTopicItemDto> CreateTopicAsync(CreateTopicRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.ChapterId) || string.IsNullOrWhiteSpace(req.Title))
            throw new ValidationException("ChapterId/Title", "ChapterId và Tiêu đề chủ đề không được để trống.");

        var chapter = await _db.ContentChapters.FindAsync(new object[] { req.ChapterId }, ct);
        if (chapter == null)
            throw new ValidationException("ChapterId", "Chương học không tồn tại.");

        var now = _clock.UtcNow;
        var topic = new ContentTopic
        {
            Id = _idGenerator.NewId("top"),
            ChapterId = req.ChapterId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            OrderIndex = req.OrderIndex,
            IsActive = req.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentTopics.Add(topic);

        await _auditWriter.WriteStaffAuditAsync(
            "topic_created",
            "content_topic",
            topic.Id,
            null,
            JsonSerializer.Serialize(new { title = topic.Title, chapterId = topic.ChapterId }),
            ct);

        await _db.SaveChangesAsync(ct);

        return new ContentTopicItemDto
        {
            Id = topic.Id,
            ChapterId = topic.ChapterId,
            ChapterTitle = chapter.Title,
            Title = topic.Title,
            Description = topic.Description ?? "",
            OrderIndex = topic.OrderIndex,
            IsActive = topic.IsActive,
            LessonCount = 0,
            CreatedAt = topic.CreatedAt.ToString("o"),
            UpdatedAt = topic.UpdatedAt.ToString("o")
        };
    }

    public async Task<ContentTopicItemDto> UpdateTopicAsync(string topicId, UpdateTopicRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var topic = await _db.ContentTopics.Include(t => t.Chapter).FirstOrDefaultAsync(t => t.Id == topicId, ct);
        if (topic == null)
            throw new NotFoundException("Chủ đề không tồn tại.");

        if (!string.IsNullOrWhiteSpace(req.Title)) topic.Title = req.Title.Trim();
        if (req.Description != null) topic.Description = req.Description.Trim();
        if (req.OrderIndex.HasValue) topic.OrderIndex = req.OrderIndex.Value;
        if (req.IsActive.HasValue) topic.IsActive = req.IsActive.Value;

        topic.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "topic_updated",
            "content_topic",
            topic.Id,
            null,
            JsonSerializer.Serialize(new { title = topic.Title }),
            ct);

        await _db.SaveChangesAsync(ct);

        var lessonCount = await _db.ContentLessons.CountAsync(l => l.TopicId == topic.Id, ct);

        return new ContentTopicItemDto
        {
            Id = topic.Id,
            ChapterId = topic.ChapterId,
            ChapterTitle = topic.Chapter?.Title ?? "",
            Title = topic.Title,
            Description = topic.Description ?? "",
            OrderIndex = topic.OrderIndex,
            IsActive = topic.IsActive,
            LessonCount = lessonCount,
            CreatedAt = topic.CreatedAt.ToString("o"),
            UpdatedAt = topic.UpdatedAt.ToString("o")
        };
    }

    public async Task<bool> DeleteTopicAsync(string topicId, string currentUserId, CancellationToken ct = default)
    {
        var topic = await _db.ContentTopics.Include(t => t.Lessons).FirstOrDefaultAsync(t => t.Id == topicId, ct);
        if (topic == null)
            throw new NotFoundException("Chủ đề không tồn tại.");

        if (topic.Lessons.Count > 0)
        {
            throw new ValidationException("Topic", $"Không thể xóa chủ đề đang chứa {topic.Lessons.Count} bài học. Vui lòng chuyển hoặc xóa bài học trước.");
        }

        _db.ContentTopics.Remove(topic);

        await _auditWriter.WriteStaffAuditAsync(
            "topic_deleted",
            "content_topic",
            topicId,
            null,
            JsonSerializer.Serialize(new { title = topic.Title }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ReorderTopicsAsync(ReorderTopicsRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.ChapterId))
            throw new ValidationException("ChapterId", "ChapterId không được để trống khi sắp xếp chủ đề.");

        if (req.TopicIds == null || req.TopicIds.Count == 0)
            throw new ValidationException("TopicIds", "Danh sách topicIds không được rỗng.");

        if (req.TopicIds.Distinct().Count() != req.TopicIds.Count)
            throw new ValidationException("TopicIds", "Danh sách topicIds chứa mã chủ đề trùng lặp.");

        var chapter = await _db.ContentChapters.FindAsync(new object[] { req.ChapterId }, ct);
        if (chapter == null)
            throw new ValidationException("ChapterId", "Chương học đã chỉ định không tồn tại.");

        var topics = await _db.ContentTopics
            .Where(t => t.ChapterId == req.ChapterId)
            .ToListAsync(ct);

        if (topics.Count != req.TopicIds.Count)
        {
            throw new ValidationException("TopicIds", $"Số lượng chủ đề gửi lên ({req.TopicIds.Count}) không khớp với tổng số chủ đề trong chương ({topics.Count}).");
        }

        var map = topics.ToDictionary(t => t.Id);
        foreach (var id in req.TopicIds)
        {
            if (!map.ContainsKey(id))
                throw new ValidationException("TopicIds", $"Mã chủ đề '{id}' không thuộc chương học này.");
        }

        for (int i = 0; i < req.TopicIds.Count; i++)
        {
            var t = map[req.TopicIds[i]];
            t.OrderIndex = i + 1;
            t.UpdatedAt = _clock.UtcNow;
        }

        await _auditWriter.WriteStaffAuditAsync(
            "topics_reordered",
            "content_topic",
            req.ChapterId,
            null,
            JsonSerializer.Serialize(new { chapterId = req.ChapterId, count = req.TopicIds.Count }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
