using System.Text.Json.Nodes;

namespace StudyAI.Application.DTOs;

public class AssessmentResponseItemDto
{
    public string QuestionId { get; set; } = string.Empty;
    public List<string> SelectedOptionIds { get; set; } = new();
    public DateTimeOffset? FirstAnsweredAt { get; set; }
    public DateTimeOffset? LastAnsweredAt { get; set; }
    public int ChangeCount { get; set; } = 0;
    public int TimeSpentMs { get; set; } = 0;
    public bool? IsCorrect { get; set; }
}

public class AssessmentAttemptCreateDto
{
    public string Id { get; set; } = string.Empty;
    public string AssessmentId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public int AttemptNumber { get; set; } = 1;
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset LastActivityAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string CompletionStatus { get; set; } = "incomplete";
    public string SuccessStatus { get; set; } = "unknown";
    public double ProgressMeasure { get; set; } = 0.0;
    public double? ScoreRaw { get; set; }
    public double ScoreMin { get; set; } = 0.0;
    public double ScoreMax { get; set; } = 1.0;
    public double? ScoreScaled { get; set; }
    public int SessionTimeMs { get; set; } = 0;
    public string? CurrentQuestionId { get; set; }
    public string? ExitReason { get; set; }
    public JsonNode? SuspendData { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public Dictionary<string, AssessmentResponseItemDto>? Responses { get; set; }
}

public class AssessmentAttemptResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string AssessmentId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public int AttemptNumber { get; set; } = 1;
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset LastActivityAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string CompletionStatus { get; set; } = "not-attempted";
    public string SuccessStatus { get; set; } = "unknown";
    public double ProgressMeasure { get; set; }
    public double? ScoreRaw { get; set; }
    public double ScoreMin { get; set; }
    public double ScoreMax { get; set; }
    public double? ScoreScaled { get; set; }
    public int SessionTimeMs { get; set; }
    public string? CurrentQuestionId { get; set; }
    public string? ExitReason { get; set; }
    public JsonNode? SuspendData { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public Dictionary<string, AssessmentResponseItemDto> Responses { get; set; } = new();
}
