namespace StudyAI.Application.DTOs;

public class BootstrapSyncRequestDto
{
    public Dictionary<string, LessonProgressCreateOrUpdateDto> LessonProgress { get; set; } = new();
    public List<AssessmentAttemptCreateDto> AssessmentAttempts { get; set; } = new();
    public List<LearningEventItemDto> LearningEvents { get; set; } = new();
}

public class BootstrapSyncResponseDto
{
    public string Status { get; set; } = "ok";
    public int ProgressSynced { get; set; } = 0;
    public int AttemptsSynced { get; set; } = 0;
    public int EventsSynced { get; set; } = 0;
}
