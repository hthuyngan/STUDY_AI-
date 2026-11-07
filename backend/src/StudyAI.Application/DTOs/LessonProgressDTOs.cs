namespace StudyAI.Application.DTOs;

public class LessonProgressCreateOrUpdateDto
{
    public string SubjectId { get; set; } = string.Empty;
    public int ContentProgress { get; set; } = 0;
    public int OverallProgress { get; set; } = 0;
    public string AssessmentStatus { get; set; } = "not-attempted";
    public string? AssessmentAttemptId { get; set; }
    public double? AssessmentScore { get; set; }
    public List<string> CompletedSectionIds { get; set; } = new();
}

public class LessonProgressResponseDto
{
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public int ContentProgress { get; set; }
    public int OverallProgress { get; set; }
    public string AssessmentStatus { get; set; } = "not-attempted";
    public string? AssessmentAttemptId { get; set; }
    public double? AssessmentScore { get; set; }
    public List<string> CompletedSectionIds { get; set; } = new();
    public DateTimeOffset UpdatedAt { get; set; }
}
