using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Content.Chapters;

public class ContentChaptersService : IContentChaptersService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public ContentChaptersService(
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

    public async Task<object> ListChaptersAsync(string? subjectId = null, string? search = null, CancellationToken ct = default)
    {
        var query = _db.ContentChapters
            .Include(c => c.Subject)
            .Include(c => c.Lessons)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            query = query.Where(c => c.SubjectId == subjectId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c => c.Title.ToLower().Contains(term));
        }

        var chapters = await query
            .OrderBy(c => c.OrderIndex)
            .ThenBy(c => c.CreatedAt)
            .ToListAsync(ct);

        var result = chapters.Select(c => new ContentChapterItemDto
        {
            Id = c.Id,
            SubjectId = c.SubjectId,
            SubjectName = c.Subject?.Name ?? "",
            Title = c.Title,
            Description = c.Description ?? "",
            OrderIndex = c.OrderIndex,
            IsActive = c.IsActive,
            LessonCount = c.Lessons.Count,
            CreatedAt = c.CreatedAt.ToString("o"),
            UpdatedAt = c.UpdatedAt.ToString("o")
        }).ToList();

        return new { items = result, total = result.Count };
    }

    public async Task<ContentChapterItemDto> GetChapterDetailAsync(string chapterId, CancellationToken ct = default)
    {
        var chapter = await _db.ContentChapters
            .Include(c => c.Subject)
            .Include(c => c.Lessons)
            .FirstOrDefaultAsync(c => c.Id == chapterId, ct);

        if (chapter == null)
            throw new NotFoundException("Chương học không tồn tại.");

        return new ContentChapterItemDto
        {
            Id = chapter.Id,
            SubjectId = chapter.SubjectId,
            SubjectName = chapter.Subject?.Name ?? "",
            Title = chapter.Title,
            Description = chapter.Description ?? "",
            OrderIndex = chapter.OrderIndex,
            IsActive = chapter.IsActive,
            LessonCount = chapter.Lessons.Count,
            CreatedAt = chapter.CreatedAt.ToString("o"),
            UpdatedAt = chapter.UpdatedAt.ToString("o")
        };
    }

    public async Task<ContentChapterItemDto> CreateChapterAsync(CreateChapterRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.SubjectId) || string.IsNullOrWhiteSpace(req.Title))
            throw new ValidationException("SubjectId/Title", "SubjectId và Tiêu đề chương không được để trống.");

        var subject = await _db.ContentSubjects.FindAsync(new object[] { req.SubjectId }, ct);
        if (subject == null)
            throw new ValidationException("SubjectId", "Môn học không tồn tại.");

        var now = _clock.UtcNow;
        var chapter = new ContentChapter
        {
            Id = _idGenerator.NewId("chp"),
            SubjectId = req.SubjectId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            OrderIndex = req.OrderIndex,
            IsActive = req.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentChapters.Add(chapter);

        await _auditWriter.WriteStaffAuditAsync(
            "chapter_created",
            "content_chapter",
            chapter.Id,
            null,
            JsonSerializer.Serialize(new { title = chapter.Title, subjectId = chapter.SubjectId }),
            ct);

        await _db.SaveChangesAsync(ct);

        return new ContentChapterItemDto
        {
            Id = chapter.Id,
            SubjectId = chapter.SubjectId,
            SubjectName = subject.Name,
            Title = chapter.Title,
            Description = chapter.Description ?? "",
            OrderIndex = chapter.OrderIndex,
            IsActive = chapter.IsActive,
            LessonCount = 0,
            CreatedAt = chapter.CreatedAt.ToString("o"),
            UpdatedAt = chapter.UpdatedAt.ToString("o")
        };
    }

    public async Task<ContentChapterItemDto> UpdateChapterAsync(string chapterId, UpdateChapterRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var chapter = await _db.ContentChapters.Include(c => c.Subject).FirstOrDefaultAsync(c => c.Id == chapterId, ct);
        if (chapter == null)
            throw new NotFoundException("Chương học không tồn tại.");

        if (!string.IsNullOrWhiteSpace(req.Title)) chapter.Title = req.Title.Trim();
        if (req.Description != null) chapter.Description = req.Description.Trim();
        if (req.OrderIndex.HasValue) chapter.OrderIndex = req.OrderIndex.Value;
        if (req.IsActive.HasValue) chapter.IsActive = req.IsActive.Value;

        chapter.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "chapter_updated",
            "content_chapter",
            chapter.Id,
            null,
            JsonSerializer.Serialize(new { title = chapter.Title }),
            ct);

        await _db.SaveChangesAsync(ct);

        var lessonCount = await _db.ContentLessons.CountAsync(l => l.ChapterId == chapter.Id, ct);

        return new ContentChapterItemDto
        {
            Id = chapter.Id,
            SubjectId = chapter.SubjectId,
            SubjectName = chapter.Subject?.Name ?? "",
            Title = chapter.Title,
            Description = chapter.Description ?? "",
            OrderIndex = chapter.OrderIndex,
            IsActive = chapter.IsActive,
            LessonCount = lessonCount,
            CreatedAt = chapter.CreatedAt.ToString("o"),
            UpdatedAt = chapter.UpdatedAt.ToString("o")
        };
    }

    public async Task<bool> ReorderChaptersAsync(ReorderChaptersRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.SubjectId))
            throw new ValidationException("SubjectId", "SubjectId không được để trống khi sắp xếp chương học.");

        if (req.ChapterIds == null || req.ChapterIds.Count == 0)
            throw new ValidationException("ChapterIds", "Danh sách chapterIds không được rỗng.");

        if (req.ChapterIds.Distinct().Count() != req.ChapterIds.Count)
            throw new ValidationException("ChapterIds", "Danh sách chapterIds chứa mã chương trùng lặp.");

        var subject = await _db.ContentSubjects.FindAsync(new object[] { req.SubjectId }, ct);
        if (subject == null)
            throw new ValidationException("SubjectId", "Môn học đã chỉ định không tồn tại.");

        var subjectChapters = await _db.ContentChapters
            .Where(c => c.SubjectId == req.SubjectId)
            .ToListAsync(ct);

        if (subjectChapters.Count != req.ChapterIds.Count)
        {
            throw new ValidationException("ChapterIds", $"Số lượng chương gửi lên ({req.ChapterIds.Count}) không khớp với tổng số chương của môn học ({subjectChapters.Count}). Phải sắp xếp toàn bộ chương trong môn.");
        }

        var existingChapterMap = subjectChapters.ToDictionary(c => c.Id);
        foreach (var id in req.ChapterIds)
        {
            if (!existingChapterMap.ContainsKey(id))
            {
                throw new ValidationException("ChapterIds", $"Mã chương '{id}' không tồn tại hoặc không thuộc môn học '{subject.Name}'.");
            }
        }

        for (int i = 0; i < req.ChapterIds.Count; i++)
        {
            var id = req.ChapterIds[i];
            var ch = existingChapterMap[id];
            ch.OrderIndex = i + 1;
            ch.UpdatedAt = _clock.UtcNow;
        }

        await _auditWriter.WriteStaffAuditAsync(
            "chapters_reordered",
            "content_chapter",
            req.SubjectId,
            null,
            JsonSerializer.Serialize(new { subjectId = req.SubjectId, count = req.ChapterIds.Count }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteChapterAsync(string chapterId, string currentUserId, CancellationToken ct = default)
    {
        var chapter = await _db.ContentChapters.Include(c => c.Lessons).FirstOrDefaultAsync(c => c.Id == chapterId, ct);
        if (chapter == null)
            throw new NotFoundException("Chương học không tồn tại.");

        if (chapter.Lessons.Count > 0)
        {
            throw new ValidationException("Chapter", $"Không thể xóa chương đang chứa {chapter.Lessons.Count} bài học. Vui lòng chuyển hoặc xóa bài học trước.");
        }

        _db.ContentChapters.Remove(chapter);

        await _auditWriter.WriteStaffAuditAsync(
            "chapter_deleted",
            "content_chapter",
            chapterId,
            null,
            JsonSerializer.Serialize(new { title = chapter.Title, subjectId = chapter.SubjectId }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
