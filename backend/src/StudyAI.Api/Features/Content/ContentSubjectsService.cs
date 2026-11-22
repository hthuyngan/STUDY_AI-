using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Content;

public class ContentSubjectsService : IContentSubjectsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public ContentSubjectsService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<ContentSubjectListResponseDto> ListSubjectsAsync(
        string? search = null,
        string? grade = null,
        bool? isActive = null,
        CancellationToken ct = default)
    {
        var query = _db.ContentSubjects
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) || s.Code.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(grade) && grade != "all")
        {
            query = query.Where(s => s.Grade == grade);
        }

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        var subjects = await query
            .OrderBy(s => s.OrderIndex)
            .ThenBy(s => s.Name)
            .ToListAsync(ct);

        var result = subjects.Select(s => new ContentSubjectItemDto
        {
            Id = s.Id,
            Name = s.Name,
            Code = s.Code,
            Grade = s.Grade,
            Description = s.Description ?? "",
            OrderIndex = s.OrderIndex,
            IsActive = s.IsActive,
            ChapterCount = s.Chapters.Count,
            LessonCount = s.Chapters.Sum(c => c.Lessons.Count),
            CreatedAt = s.CreatedAt.ToString("o"),
            UpdatedAt = s.UpdatedAt.ToString("o")
        }).ToList();

        return new ContentSubjectListResponseDto
        {
            Items = result,
            Total = result.Count
        };
    }

    public async Task<object> GetSubjectDetailAsync(string subjectId, CancellationToken ct = default)
    {
        var s = await _db.ContentSubjects
            .Include(sub => sub.Chapters)
                .ThenInclude(ch => ch.Lessons)
            .FirstOrDefaultAsync(sub => sub.Id == subjectId, ct);

        if (s == null)
            throw new NotFoundException("Môn học không tồn tại.");

        var chapters = s.Chapters.OrderBy(c => c.OrderIndex).Select(ch => new
        {
            id = ch.Id,
            title = ch.Title,
            description = ch.Description ?? "",
            orderIndex = ch.OrderIndex,
            isActive = ch.IsActive,
            lessons = ch.Lessons.OrderBy(l => l.OrderIndex).Select(les => new
            {
                id = les.Id,
                title = les.Title,
                slug = les.Slug,
                status = les.Status,
                orderIndex = les.OrderIndex
            }).ToList()
        }).ToList();

        return new
        {
            id = s.Id,
            name = s.Name,
            code = s.Code,
            grade = s.Grade,
            description = s.Description ?? "",
            orderIndex = s.OrderIndex,
            isActive = s.IsActive,
            createdAt = s.CreatedAt.ToString("o"),
            updatedAt = s.UpdatedAt.ToString("o"),
            chapters
        };
    }

    public async Task<ContentSubjectItemDto> CreateSubjectAsync(CreateSubjectRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Code))
            throw new ValidationException("Name/Code", "Tên môn học và mã môn học không được để trống.");

        var normalizedCode = req.Code.Trim().ToUpperInvariant();
        var existing = await _db.ContentSubjects.AnyAsync(s => s.Code == normalizedCode, ct);
        if (existing)
            throw new ConflictException($"Mã môn học '{normalizedCode}' đã tồn tại.");

        var now = _clock.UtcNow;
        var subject = new ContentSubject
        {
            Id = $"sub_{normalizedCode.ToLowerInvariant()}",
            Name = req.Name.Trim(),
            Code = normalizedCode,
            Grade = string.IsNullOrWhiteSpace(req.Grade) ? "12" : req.Grade.Trim(),
            Description = req.Description?.Trim(),
            OrderIndex = req.OrderIndex,
            IsActive = req.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentSubjects.Add(subject);

        await _auditWriter.WriteStaffAuditAsync(
            "subject_created",
            "content_subject",
            subject.Id,
            null,
            JsonSerializer.Serialize(new { name = subject.Name, code = subject.Code }),
            ct);

        await _db.SaveChangesAsync(ct);

        return new ContentSubjectItemDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Code = subject.Code,
            Grade = subject.Grade,
            Description = subject.Description ?? "",
            OrderIndex = subject.OrderIndex,
            IsActive = subject.IsActive,
            ChapterCount = 0,
            LessonCount = 0,
            CreatedAt = subject.CreatedAt.ToString("o"),
            UpdatedAt = subject.UpdatedAt.ToString("o")
        };
    }

    public async Task<ContentSubjectItemDto> UpdateSubjectAsync(string subjectId, UpdateSubjectRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        var subject = await _db.ContentSubjects.FindAsync(new object[] { subjectId }, ct);
        if (subject == null)
            throw new NotFoundException("Môn học không tồn tại.");

        if (!string.IsNullOrWhiteSpace(req.Code) && req.Code.Trim().ToUpperInvariant() != subject.Code)
        {
            var newCode = req.Code.Trim().ToUpperInvariant();
            var codeExists = await _db.ContentSubjects.AnyAsync(s => s.Code == newCode && s.Id != subjectId, ct);
            if (codeExists)
                throw new ConflictException($"Mã môn học '{newCode}' đã được sử dụng.");
            subject.Code = newCode;
        }

        if (!string.IsNullOrWhiteSpace(req.Name)) subject.Name = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.Grade)) subject.Grade = req.Grade.Trim();
        if (req.Description != null) subject.Description = req.Description.Trim();
        if (req.OrderIndex.HasValue) subject.OrderIndex = req.OrderIndex.Value;
        if (req.IsActive.HasValue) subject.IsActive = req.IsActive.Value;

        subject.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "subject_updated",
            "content_subject",
            subject.Id,
            null,
            JsonSerializer.Serialize(new { name = subject.Name, code = subject.Code }),
            ct);

        await _db.SaveChangesAsync(ct);

        return new ContentSubjectItemDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Code = subject.Code,
            Grade = subject.Grade,
            Description = subject.Description ?? "",
            OrderIndex = subject.OrderIndex,
            IsActive = subject.IsActive,
            ChapterCount = await _db.ContentChapters.CountAsync(c => c.SubjectId == subject.Id, ct),
            LessonCount = await _db.ContentLessons.CountAsync(l => l.Chapter!.SubjectId == subject.Id, ct),
            CreatedAt = subject.CreatedAt.ToString("o"),
            UpdatedAt = subject.UpdatedAt.ToString("o")
        };
    }

    public async Task<bool> DeleteSubjectAsync(string subjectId, string currentUserId, CancellationToken ct = default)
    {
        var subject = await _db.ContentSubjects
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
            .FirstOrDefaultAsync(s => s.Id == subjectId, ct);

        if (subject == null)
            throw new NotFoundException("Môn học không tồn tại.");

        var chapterCount = subject.Chapters.Count;
        var lessonCount = subject.Chapters.Sum(c => c.Lessons.Count);
        if (chapterCount > 0 || lessonCount > 0)
        {
            throw new ValidationException("Subject", $"Không thể xóa môn học đang có {chapterCount} chương và {lessonCount} bài học. Vui lòng xóa hoặc chuyển các nội dung con trước.");
        }

        var progressExists = await _db.LessonProgresses.AnyAsync(p => p.SubjectId == subjectId, ct);
        if (progressExists)
        {
            throw new ValidationException("Subject", "Không thể xóa môn học đã có dữ liệu tiến độ học sinh.");
        }

        _db.ContentSubjects.Remove(subject);

        await _auditWriter.WriteStaffAuditAsync(
            "subject_deleted",
            "content_subject",
            subjectId,
            null,
            JsonSerializer.Serialize(new { name = subject.Name, code = subject.Code }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }
}