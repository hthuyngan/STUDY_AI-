namespace StudyAI.Models;

public class UserSectionBookmark
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string? SubjectId { get; set; }
    public string? LessonTitle { get; set; }
    public string? SubjectName { get; set; }
    public string SectionId { get; set; } = string.Empty;
    public string? SectionTitle { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
    public ContentLesson? Lesson { get; set; }
}
