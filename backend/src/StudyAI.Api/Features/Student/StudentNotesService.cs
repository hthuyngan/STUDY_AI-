using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Exceptions;
using StudyAI.Data;
using StudyAI.Models;

namespace StudyAI.Features.Student;

public class StudentNotesService : IStudentNotesService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public StudentNotesService(IApplicationDbContext db, IClock clock, IIdGenerator idGenerator)
    {
        _db = db;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    public async Task<List<StudyNoteDto>> GetNotesAsync(string userId, string? lessonId = null, string? subjectId = null, string? search = null, CancellationToken ct = default)
    {
        var query = _db.UserStudyNotes.AsNoTracking()
            .Where(n => n.UserId == userId);

        if (!string.IsNullOrWhiteSpace(lessonId))
        {
            query = query.Where(n => n.LessonId == lessonId);
        }

        if (!string.IsNullOrWhiteSpace(subjectId))
        {
            query = query.Where(n => n.SubjectId == subjectId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(n => n.Content.Contains(term) ||
                                     (n.LessonTitle != null && n.LessonTitle.Contains(term)) ||
                                     (n.SectionTitle != null && n.SectionTitle.Contains(term)));
        }

        var notes = await query
            .OrderByDescending(n => n.UpdatedAt)
            .ToListAsync(ct);

        return notes.Select(MapNoteDto).ToList();
    }

    public async Task<StudyNoteDto?> GetNoteByIdAsync(string userId, string noteId, CancellationToken ct = default)
    {
        var note = await _db.UserStudyNotes.AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId, ct);

        return note == null ? null : MapNoteDto(note);
    }

    public async Task<StudyNoteDto> CreateNoteAsync(string userId, CreateStudyNoteRequestDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
        {
            throw new ValidationException("Content", "Nội dung ghi chú không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(dto.LessonId))
        {
            throw new ValidationException("LessonId", "Mã bài học không được để trống.");
        }

        var now = _clock.UtcNow;
        var noteId = _idGenerator.NewId("note");

        string lessonTitle = dto.LessonTitle ?? string.Empty;
        string subjectName = dto.SubjectName ?? string.Empty;
        string? subjectId = dto.SubjectId;

        if (string.IsNullOrWhiteSpace(lessonTitle))
        {
            var lesson = await _db.ContentLessons.AsNoTracking()
                .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
                .FirstOrDefaultAsync(l => l.Id == dto.LessonId, ct);

            if (lesson != null)
            {
                lessonTitle = lesson.Title;
                if (string.IsNullOrWhiteSpace(subjectId))
                {
                    subjectId = lesson.Chapter?.SubjectId ?? string.Empty;
                }
                if (string.IsNullOrWhiteSpace(subjectName) && lesson.Chapter?.Subject != null)
                {
                    subjectName = lesson.Chapter.Subject.Name;
                }
            }
        }

        var note = new UserStudyNote
        {
            Id = noteId,
            UserId = userId,
            LessonId = dto.LessonId,
            SubjectId = subjectId ?? string.Empty,
            LessonTitle = string.IsNullOrWhiteSpace(lessonTitle) ? "Bài học" : lessonTitle,
            SubjectName = string.IsNullOrWhiteSpace(subjectName) ? "Môn học" : subjectName,
            SectionId = dto.SectionId,
            SectionTitle = dto.SectionTitle,
            Content = dto.Content.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.UserStudyNotes.Add(note);
        await _db.SaveChangesAsync(ct);

        return MapNoteDto(note);
    }

    public async Task<StudyNoteDto?> UpdateNoteAsync(string userId, string noteId, UpdateStudyNoteRequestDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
        {
            throw new ValidationException("Content", "Nội dung ghi chú không được để trống.");
        }

        var note = await _db.UserStudyNotes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId, ct);

        if (note == null)
        {
            return null;
        }

        note.Content = dto.Content.Trim();
        note.UpdatedAt = _clock.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapNoteDto(note);
    }

    public async Task<bool> DeleteNoteAsync(string userId, string noteId, CancellationToken ct = default)
    {
        var note = await _db.UserStudyNotes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId, ct);

        if (note == null)
        {
            return false;
        }

        _db.UserStudyNotes.Remove(note);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<SectionBookmarkDto>> GetBookmarksAsync(string userId, string? lessonId = null, string? subjectId = null, string? search = null, CancellationToken ct = default)
    {
        var query = _db.UserSectionBookmarks.AsNoTracking()
            .Where(b => b.UserId == userId);

        if (!string.IsNullOrWhiteSpace(lessonId))
        {
            query = query.Where(b => b.LessonId == lessonId);
        }

        if (!string.IsNullOrWhiteSpace(subjectId))
        {
            query = query.Where(b => b.SubjectId == subjectId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(b => (b.SectionTitle != null && b.SectionTitle.Contains(term)) ||
                                     (b.LessonTitle != null && b.LessonTitle.Contains(term)) ||
                                     (b.SubjectName != null && b.SubjectName.Contains(term)));
        }

        var bookmarks = await query
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(ct);

        return bookmarks.Select(MapBookmarkDto).ToList();
    }

    public async Task<ToggleBookmarkResponseDto> ToggleBookmarkAsync(string userId, ToggleBookmarkRequestDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.LessonId))
        {
            throw new ValidationException("LessonId", "Mã bài học không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(dto.SectionId))
        {
            throw new ValidationException("SectionId", "Mã phần bài học không được để trống.");
        }

        var existing = await _db.UserSectionBookmarks
            .FirstOrDefaultAsync(b => b.UserId == userId && b.LessonId == dto.LessonId && b.SectionId == dto.SectionId, ct);

        if (existing != null)
        {
            _db.UserSectionBookmarks.Remove(existing);
            await _db.SaveChangesAsync(ct);
            return new ToggleBookmarkResponseDto { Bookmarked = false, Bookmark = null };
        }

        var now = _clock.UtcNow;
        var bookmarkId = $"bm_{dto.LessonId}_{dto.SectionId}";

        string lessonTitle = dto.LessonTitle ?? string.Empty;
        string subjectName = dto.SubjectName ?? string.Empty;
        string? subjectId = dto.SubjectId;

        if (string.IsNullOrWhiteSpace(lessonTitle))
        {
            var lesson = await _db.ContentLessons.AsNoTracking()
                .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
                .FirstOrDefaultAsync(l => l.Id == dto.LessonId, ct);

            if (lesson != null)
            {
                lessonTitle = lesson.Title;
                if (string.IsNullOrWhiteSpace(subjectId))
                {
                    subjectId = lesson.Chapter?.SubjectId ?? string.Empty;
                }
                if (string.IsNullOrWhiteSpace(subjectName) && lesson.Chapter?.Subject != null)
                {
                    subjectName = lesson.Chapter.Subject.Name;
                }
            }
        }

        var newBookmark = new UserSectionBookmark
        {
            Id = bookmarkId,
            UserId = userId,
            LessonId = dto.LessonId,
            SubjectId = subjectId ?? string.Empty,
            LessonTitle = string.IsNullOrWhiteSpace(lessonTitle) ? "Bài học" : lessonTitle,
            SubjectName = string.IsNullOrWhiteSpace(subjectName) ? "Môn học" : subjectName,
            SectionId = dto.SectionId,
            SectionTitle = dto.SectionTitle ?? "Mục bài học",
            CreatedAt = now
        };

        _db.UserSectionBookmarks.Add(newBookmark);
        await _db.SaveChangesAsync(ct);

        return new ToggleBookmarkResponseDto
        {
            Bookmarked = true,
            Bookmark = MapBookmarkDto(newBookmark)
        };
    }

    public async Task<bool> RemoveBookmarkAsync(string userId, string bookmarkIdOrLessonId, string? sectionId = null, CancellationToken ct = default)
    {
        var query = _db.UserSectionBookmarks.Where(b => b.UserId == userId);

        if (!string.IsNullOrWhiteSpace(sectionId))
        {
            query = query.Where(b => b.LessonId == bookmarkIdOrLessonId && b.SectionId == sectionId);
        }
        else
        {
            query = query.Where(b => b.Id == bookmarkIdOrLessonId || b.LessonId == bookmarkIdOrLessonId);
        }

        var targets = await query.ToListAsync(ct);
        if (targets.Count == 0)
        {
            return false;
        }

        _db.UserSectionBookmarks.RemoveRange(targets);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> IsSectionBookmarkedAsync(string userId, string lessonId, string sectionId, CancellationToken ct = default)
    {
        return await _db.UserSectionBookmarks.AsNoTracking()
            .AnyAsync(b => b.UserId == userId && b.LessonId == lessonId && b.SectionId == sectionId, ct);
    }

    private static StudyNoteDto MapNoteDto(UserStudyNote n) => new()
    {
        Id = n.Id,
        LessonId = n.LessonId,
        SubjectId = n.SubjectId ?? string.Empty,
        LessonTitle = n.LessonTitle ?? "Bài học",
        SubjectName = n.SubjectName ?? "Môn học",
        SectionId = n.SectionId,
        SectionTitle = n.SectionTitle,
        Content = n.Content,
        CreatedAt = n.CreatedAt.ToString("o"),
        UpdatedAt = n.UpdatedAt.ToString("o")
    };

    private static SectionBookmarkDto MapBookmarkDto(UserSectionBookmark b) => new()
    {
        Id = b.Id,
        LessonId = b.LessonId,
        ItemId = b.LessonId,
        SubjectId = b.SubjectId ?? string.Empty,
        LessonTitle = b.LessonTitle ?? "Bài học",
        SubjectName = b.SubjectName ?? "Môn học",
        SectionId = b.SectionId,
        SectionTitle = b.SectionTitle ?? "Mục bài học",
        Title = b.SectionTitle ?? b.LessonTitle ?? "Bài học",
        BookmarkedAt = b.CreatedAt.ToString("o")
    };
}
