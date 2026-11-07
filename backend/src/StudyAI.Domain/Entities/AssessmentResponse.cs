namespace StudyAI.Domain.Entities;

public class AssessmentResponse
{
    public int Id { get; set; }
    public string AttemptId { get; set; } = string.Empty;
    public string QuestionId { get; set; } = string.Empty;
    public string SelectedOptionIdsJson { get; set; } = "[]";
    public DateTimeOffset? FirstAnsweredAt { get; set; }
    public DateTimeOffset? LastAnsweredAt { get; set; }
    public int ChangeCount { get; set; } = 0;
    public int TimeSpentMs { get; set; } = 0;
    public bool? IsCorrect { get; set; }

    public AssessmentAttempt? Attempt { get; set; }
}
