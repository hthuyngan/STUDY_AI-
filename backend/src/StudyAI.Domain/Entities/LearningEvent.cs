namespace StudyAI.Domain.Entities;

public class LearningEvent
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? AttemptId { get; set; }
    public string LessonId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    public string Type { get; set; } = string.Empty;
    public string? PayloadJson { get; set; }
    public int SchemaVersion { get; set; } = 1;
}
