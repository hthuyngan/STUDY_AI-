namespace StudyAI.Domain.Entities;

public class AiUsageLog
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Feature { get; set; } = string.Empty; // tutor_chat, hint_level_1, hint_level_2, hint_level_3, error_analysis, recommendation
    public string Provider { get; set; } = string.Empty; // OpenAI, FakeLlmProvider
    public string Model { get; set; } = string.Empty;
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public decimal EstimatedCostUsd { get; set; }
    public int LatencyMs { get; set; }
    public string Status { get; set; } = "success"; // success, timeout, error
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
}

public class StudentTopicMastery
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string? TopicId { get; set; }
    public string TopicName { get; set; } = string.Empty;
    public int AttemptCount { get; set; }
    public int CorrectCount { get; set; }
    public int HintCount { get; set; }
    public double MasteryScore { get; set; } // 0.0 - 100.0
    public string Status { get; set; } = "insufficient_data"; // insufficient_data, needs_reinforcement, progressing, proficient, mastered
    public DateTimeOffset? LastAttemptAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
    public ContentSubject? Subject { get; set; }
    public ContentTopic? Topic { get; set; }
}

public class AiHintUsage
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string QuestionId { get; set; } = string.Empty;
    public string? SessionId { get; set; }
    public int HintLevel { get; set; } // 1, 2, 3
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
    public ContentQuestion? Question { get; set; }
}

public class AiLearningRecommendation
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string? TopicId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Priority { get; set; } = "standard"; // high, medium, standard
    public string Status { get; set; } = "pending"; // pending, accepted, completed, dismissed
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
    public ContentLesson? Lesson { get; set; }
}

