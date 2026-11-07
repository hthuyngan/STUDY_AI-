namespace StudyAI.Domain.Entities;

public class AssessmentAttempt
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string AssessmentId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;

    public int AttemptNumber { get; set; } = 1;
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastActivityAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }

    public string CompletionStatus { get; set; } = "not-attempted";
    public string SuccessStatus { get; set; } = "unknown";
    public double ProgressMeasure { get; set; } = 0.0;

    public double? ScoreRaw { get; set; }
    public double ScoreMin { get; set; } = 0.0;
    public double ScoreMax { get; set; } = 1.0;
    public double? ScoreScaled { get; set; }

    public int SessionTimeMs { get; set; } = 0;
    public string? CurrentQuestionId { get; set; }
    public string? ExitReason { get; set; }
    public string? SuspendDataJson { get; set; }
    public int SchemaVersion { get; set; } = 1;

    public ICollection<AssessmentResponse> Responses { get; set; } = new List<AssessmentResponse>();
}
