namespace StudyAI.Features.Student;

public class StudyNoteDto
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string LessonTitle { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string? SectionId { get; set; }
    public string? SectionTitle { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class CreateStudyNoteRequestDto
{
    public string LessonId { get; set; } = string.Empty;
    public string? SubjectId { get; set; }
    public string? LessonTitle { get; set; }
    public string? SubjectName { get; set; }
    public string? SectionId { get; set; }
    public string? SectionTitle { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class UpdateStudyNoteRequestDto
{
    public string Content { get; set; } = string.Empty;
}

public class SectionBookmarkDto
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string ItemId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string LessonTitle { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string SectionId { get; set; } = string.Empty;
    public string SectionTitle { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string BookmarkedAt { get; set; } = string.Empty;
}

public class ToggleBookmarkRequestDto
{
    public string LessonId { get; set; } = string.Empty;
    public string? SubjectId { get; set; }
    public string? LessonTitle { get; set; }
    public string? SubjectName { get; set; }
    public string SectionId { get; set; } = string.Empty;
    public string? SectionTitle { get; set; }
}

public class ToggleBookmarkResponseDto
{
    public bool Bookmarked { get; set; }
    public SectionBookmarkDto? Bookmark { get; set; }
}
