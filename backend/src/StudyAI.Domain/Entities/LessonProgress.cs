namespace StudyAI.Domain.Entities;

public class LessonProgress
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public int ContentProgress { get; set; } = 0;
    public int OverallProgress { get; set; } = 0;
    public string AssessmentStatus { get; set; } = "not-attempted";
    public string? AssessmentAttemptId { get; set; }
    public double? AssessmentScore { get; set; }
    public string CompletedSectionIdsJson { get; set; } = "[]";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
