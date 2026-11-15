namespace StudyAI.Application.DTOs;

// --- AI Error Analysis DTOs ---
public class AiErrorAnalysisRequestDto
{
    public string SessionId { get; set; } = string.Empty;
    public string? SubjectId { get; set; }
}

public class QuestionErrorDetailDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string Stem { get; set; } = string.Empty;
    public string QuestionType { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string? StudentAnswerDisplay { get; set; }
    public string? CorrectAnswerDisplay { get; set; }
    public string ErrorClassification { get; set; } = "deducible"; // deducible (suy ra được), hypothesized (giả định), verified (đã xác nhận)
    public string LikelyCause { get; set; } = string.Empty;
    public string PrerequisiteConcept { get; set; } = string.Empty;
    public string CorrectMethod { get; set; } = string.Empty;
    public string? RecommendedLessonId { get; set; }
    public string? RecommendedLessonTitle { get; set; }
}

public class AiErrorAnalysisResultDto
{
    public string SessionId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public int IncorrectCount { get; set; }
    public double Score { get; set; }
    public string OverallAssessment { get; set; } = string.Empty;
    public List<QuestionErrorDetailDto> AnalyzedErrors { get; set; } = new();
    public List<string> KeyConceptsToReview { get; set; } = new();
    public List<string> NextPracticeSuggestions { get; set; } = new();
    public DateTimeOffset AnalyzedAt { get; set; } = DateTimeOffset.UtcNow;
}

// --- AI Usage & Admin DTOs ---
public class AiUsageStatsDto
{
    public int TotalRequests { get; set; }
    public int TotalInputTokens { get; set; }
    public int TotalOutputTokens { get; set; }
    public decimal EstimatedTotalCostUsd { get; set; }
    public double AverageLatencyMs { get; set; }
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public int FallbackCount { get; set; }
    public int RateLimitCount { get; set; }
    public int TimeoutCount { get; set; }
    public decimal DailyBudgetUsd { get; set; } = 5.0m;
    public bool BudgetWarning { get; set; }
    public Dictionary<string, int> FeatureBreakdown { get; set; } = new();
    public Dictionary<string, int> ModelBreakdown { get; set; } = new();
    public Dictionary<string, decimal> DailyCostBreakdown { get; set; } = new();
}

public class AiUsageLogItemDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Feature { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public decimal EstimatedCostUsd { get; set; }
    public int LatencyMs { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class AiFeatureConfigDto
{
    public bool EnableTutor { get; set; } = true;
    public bool EnableHints { get; set; } = true;
    public bool EnableErrorAnalysis { get; set; } = true;
    public bool EnableLearningPath { get; set; } = true;
    public string ProviderName { get; set; } = "OpenAI";
    public string ModelName { get; set; } = "gpt-4o-mini";
    public string? ReasoningModelName { get; set; }
    public string FallbackModelName { get; set; } = "gpt-4o-mini";
    public bool IsConfigured { get; set; }
    public int MaxDailyTokensPerUser { get; set; } = 50000;
    public int DailyTokensUsedToday { get; set; }
    public decimal DailyCostToday { get; set; }
}

public class AiFeatureToggleRequestDto
{
    public string Feature { get; set; } = string.Empty; // tutor, hints, error_analysis, learning_path
    public bool Enabled { get; set; }
}

// --- AI Recommendation DTOs ---
public class AiLearningRecommendationDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string LessonTitle { get; set; } = string.Empty;
    public string? ChapterTitle { get; set; }
    public string? TopicName { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Priority { get; set; } = "standard";
    public string Status { get; set; } = "pending";
    public DateTimeOffset CreatedAt { get; set; }
}

