namespace StudyAI.Features.Student;

public interface IStudentNotesService
{
    Task<List<StudyNoteDto>> GetNotesAsync(string userId, string? lessonId = null, string? subjectId = null, string? search = null, CancellationToken ct = default);
    Task<StudyNoteDto?> GetNoteByIdAsync(string userId, string noteId, CancellationToken ct = default);
    Task<StudyNoteDto> CreateNoteAsync(string userId, CreateStudyNoteRequestDto dto, CancellationToken ct = default);
    Task<StudyNoteDto?> UpdateNoteAsync(string userId, string noteId, UpdateStudyNoteRequestDto dto, CancellationToken ct = default);
    Task<bool> DeleteNoteAsync(string userId, string noteId, CancellationToken ct = default);

    Task<List<SectionBookmarkDto>> GetBookmarksAsync(string userId, string? lessonId = null, string? subjectId = null, string? search = null, CancellationToken ct = default);
    Task<ToggleBookmarkResponseDto> ToggleBookmarkAsync(string userId, ToggleBookmarkRequestDto dto, CancellationToken ct = default);
    Task<bool> RemoveBookmarkAsync(string userId, string bookmarkIdOrLessonId, string? sectionId = null, CancellationToken ct = default);
    Task<bool> IsSectionBookmarkedAsync(string userId, string lessonId, string sectionId, CancellationToken ct = default);
}
