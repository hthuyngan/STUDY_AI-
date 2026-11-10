namespace StudyAI.Domain.Entities;

public class AiConversation
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = "Cuộc trò chuyện mới";
    public string? Subject { get; set; }
    public string? LessonId { get; set; }
    public string AssistanceMode { get; set; } = "explain"; // explain, hint, step-by-step, practice, summarize
    public string? LearningContextJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
    public ContentLesson? Lesson { get; set; }
    public ICollection<AiMessage> Messages { get; set; } = new List<AiMessage>();
}

public class AiMessage
{
    public string Id { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
    public string Role { get; set; } = "user"; // user, assistant, system
    public string Content { get; set; } = string.Empty;
    public string? SuggestedActionsJson { get; set; }
    public string? LearningContextSnapshotJson { get; set; }
    public string? AssistanceMode { get; set; }
    public int? TokensUsed { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public AiConversation? Conversation { get; set; }
}
