namespace StudyAI.Application.DTOs;

public class HintRequestDto
{
    public string QuestionId { get; set; } = string.Empty;
    public int HintLevel { get; set; } = 1; // 1: Conceptual, 2: Methodological, 3: Key Step
    public string? StudentAnswer { get; set; }
}

public class HintResponseDto
{
    public string QuestionId { get; set; } = string.Empty;
    public int HintLevel { get; set; }
    public string HintLevelName { get; set; } = string.Empty; // "Gợi ý định hướng", "Gợi ý phương pháp", "Gợi ý bước then chốt"
    public string HintText { get; set; } = string.Empty;
    public List<string> MathFormulas { get; set; } = new();
    public List<string> SuggestedNextSteps { get; set; } = new();
    public string Provider { get; set; } = "RuleBasedSocraticFallback";
    public bool IsFallback { get; set; } = true;
}

public class CognitiveBreakdownDto
{
    public int Total { get; set; }
    public int Correct { get; set; }
    public double AccuracyPercent { get; set; }
}

public class SkillMasteryItemDto
{
    public string SkillId { get; set; } = string.Empty;
    public string SkillName { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public double MasteryScore { get; set; } // 0 - 100
    public string Status { get; set; } = "novice"; // novice (<40), developing (40-69), proficient (70-89), mastered (>=90)
    public int TotalAttempted { get; set; }
    public int TotalCorrect { get; set; }
    public Dictionary<string, CognitiveBreakdownDto> CognitiveBreakdown { get; set; } = new();
    public DateTimeOffset? LastAttemptAt { get; set; }
}

public class SkillMasteryResponseDto
{
    public string UserId { get; set; } = string.Empty;
    public double OverallMasteryScore { get; set; }
    public int SkillsEvaluated { get; set; }
    public int SkillsMastered { get; set; }
    public List<SkillMasteryItemDto> Skills { get; set; } = new();
}

public class KnowledgeGapDto
{
    public string Id { get; set; } = string.Empty;
    public string SkillId { get; set; } = string.Empty;
    public string SkillName { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string Severity { get; set; } = "moderate"; // critical (<30% or >=3 wrong), moderate (30-50%), minor
    public double AccuracyPercent { get; set; }
    public int MistakeCount { get; set; }
    public string EvidenceSummary { get; set; } = string.Empty;
    public string? RecommendedLessonId { get; set; }
    public string? RecommendedLessonTitle { get; set; }
    public List<string> ActionSteps { get; set; } = new();
    public DateTimeOffset DetectedAt { get; set; }
}

public class AdaptiveStepDto
{
    public int StepNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public string ActionType { get; set; } = "review_lesson"; // review_lesson, practice_skill, diagnostic_practice, next_lesson
    public string TargetRoute { get; set; } = string.Empty;
    public string? LessonId { get; set; }
    public string? SkillId { get; set; }
    public string Priority { get; set; } = "high"; // high, medium, standard
    public bool IsCompleted { get; set; }
}

public class AdaptiveLearningPathDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string CurrentStage { get; set; } = "remediation"; // remediation, progressing, mastery
    public string StageDescription { get; set; } = string.Empty;
    public List<AdaptiveStepDto> Steps { get; set; } = new();
    public DateTimeOffset GeneratedAt { get; set; }
}

