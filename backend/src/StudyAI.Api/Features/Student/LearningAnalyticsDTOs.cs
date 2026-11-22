namespace StudyAI.Features.Student;

/* -------------------------------------------------------------------------
 * 1. LEARNING ANALYTICS OVERVIEW DTOs
 * ------------------------------------------------------------------------- */

public class ChapterMasteryItemDto
{
    public string ChapterId { get; set; } = string.Empty;
    public string ChapterTitle { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public int TotalLessons { get; set; }
    public int CompletedLessons { get; set; }
    public double CompletionPercent => TotalLessons > 0 ? Math.Round((double)CompletedLessons / TotalLessons * 100.0, 1) : 0.0;
    public double AverageMasteryScore { get; set; }
    public string Status { get; set; } = "in_progress"; // not_started, in_progress, completed
}

public class TopicCompetencyItemDto
{
    public string TopicId { get; set; } = string.Empty;
    public string TopicName { get; set; } = string.Empty;
    public double MasteryScore { get; set; }
    public double AccuracyPercent { get; set; }
    public int AttemptCount { get; set; }
    public string Status { get; set; } = "needs_reinforcement";
    public string StatusLabel { get; set; } = "Chưa nắm vững";
}

public class ProgressionDataPointDto
{
    public string Date { get; set; } = string.Empty; // YYYY-MM-DD
    public double AccuracyPercent { get; set; }
    public int QuestionsAttempted { get; set; }
    public double CumulativeMasteryScore { get; set; }
}

public class ReviewFrequencyStatsDto
{
    public int SessionsLast7Days { get; set; }
    public int SessionsLast30Days { get; set; }
    public int ActiveStreakDays { get; set; }
    public DateTimeOffset? LastActiveAt { get; set; }
}

public class ExamPerformanceSummaryDto
{
    public int ExamsCompletedCount { get; set; }
    public double AverageExamScoreScaled { get; set; } // Scale 0-10
    public double HighestExamScoreScaled { get; set; }
    public double LatestExamScoreScaled { get; set; }
    public DateTimeOffset? LatestExamAt { get; set; }
}

public class LearningAnalyticsOverviewDto
{
    public string UserId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string SubjectName { get; set; } = "Toán 12";
    public string Timeframe { get; set; } = "all"; // 7d, 30d, all

    // High level metrics
    public int TotalQuestionsAttempted { get; set; }
    public int TotalCorrect { get; set; }
    public int TotalIncorrect { get; set; }
    public double OverallAccuracyPercent { get; set; }
    public int TotalTimeSpentSeconds { get; set; }
    public int TotalSessionsCompleted { get; set; }
    public double CurriculumProgressPercent { get; set; }
    public string CurrentMasteryTier { get; set; } = "insufficient_data";
    public string CurrentMasteryLabel { get; set; } = "Chưa đủ dữ liệu";
    public double OverallMasteryScore { get; set; }

    // Breakdown
    public Dictionary<string, DifficultyBreakdownDto> DifficultyAccuracy { get; set; } = new();
    public List<ChapterMasteryItemDto> ChapterMasteries { get; set; } = new();
    public List<TopicCompetencyItemDto> TopStrengths { get; set; } = new();
    public List<TopicCompetencyItemDto> TopWeaknesses { get; set; } = new();
    public List<ProgressionDataPointDto> ProgressionTimeline { get; set; } = new();
    public ReviewFrequencyStatsDto ReviewFrequency { get; set; } = new();
    public ExamPerformanceSummaryDto ExamSummary { get; set; } = new();
}

/* -------------------------------------------------------------------------
 * 2. LEARNING RISK DETECTION DTOs
 * ------------------------------------------------------------------------- */

public class LearningRiskDto
{
    public string Id { get; set; } = string.Empty;
    public string RiskType { get; set; } = "consecutive_mistakes";
    // Risk types: consecutive_mistakes, declining_mastery, unremediated_gap, decay_unreviewed, unstable_performance
    public string RiskLevel { get; set; } = "medium"; // high, medium, low
    public string Title { get; set; } = string.Empty;
    public string TopicName { get; set; } = string.Empty;
    public string? LessonId { get; set; }
    public string RootCauseEvidence { get; set; } = string.Empty;
    public string RecommendedAction { get; set; } = string.Empty;
    public DateTimeOffset DetectedAt { get; set; } = DateTimeOffset.UtcNow;
}

/* -------------------------------------------------------------------------
 * 3. INTELLIGENT EXAM ENGINE DTOs
 * ------------------------------------------------------------------------- */

public class ExamMatrixRequestDto
{
    public string? BlueprintId { get; set; } // e.g. "moet_thpt_2025_official", "moet_thpt_legacy_50q", "chapter_mastery_revision"
    public string SubjectId { get; set; } = string.Empty;
    public string Title { get; set; } = "Đề thi thử tốt nghiệp THPT";
    public int DurationMinutes { get; set; } = 90;
    public int TotalQuestions { get; set; } = 50;
    public string? ChapterId { get; set; } // Optional filter for chapter exam
    public Dictionary<string, int>? CognitiveDistribution { get; set; }
    // e.g. {"nhan_biet": 20, "thong_hieu": 15, "van_dung": 10, "van_dung_cao": 5}
}

public class ExamReviewAnalyticsDto
{
    public string SessionId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string ExamTitle { get; set; } = string.Empty;
    public double ScoreScaled { get; set; } // 0 - 10
    public double ScoreRaw { get; set; }
    public double ScoreMax { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public int IncorrectCount { get; set; }
    public int UnansweredCount { get; set; }
    public int TimeSpentSeconds { get; set; }
    public DateTimeOffset CompletedAt { get; set; }

    // Analytics Breakdown
    public Dictionary<string, DifficultyBreakdownDto> ByCognitiveBreakdown { get; set; } = new();
    public List<ChapterMasteryItemDto> ByChapterBreakdown { get; set; } = new();
    public List<string> MistakeTopics { get; set; } = new();
    public List<RecommendedReviewItemDto> RecommendedLessons { get; set; } = new();
}

public class RecommendedReviewItemDto
{
    public string LessonId { get; set; } = string.Empty;
    public string LessonTitle { get; set; } = string.Empty;
    public string ChapterTitle { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}

/* -------------------------------------------------------------------------
 * 4. AI LEARNING REPORT DTOs
 * ------------------------------------------------------------------------- */

public class AiLearningReportDto
{
    public string ReportId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public DateTimeOffset GeneratedAt { get; set; } = DateTimeOffset.UtcNow;

    // Computed Analytics
    public double OverallMasteryScore { get; set; }
    public string CurrentCompetencyTier { get; set; } = "Cần củng cố";
    public double AccuracyPercent { get; set; }
    public int TotalQuestionsAttempted { get; set; }
    public double CurriculumProgressPercent { get; set; }

    // Pedagogical Sections
    public string OverallEvaluation { get; set; } = string.Empty;
    public List<string> KeyStrengths { get; set; } = new();
    public List<string> CriticalGaps { get; set; } = new();
    public string RecentProgressSummary { get; set; } = string.Empty;
    public List<string> CommonMistakePatterns { get; set; } = new();
    public List<string> RecommendedGoals { get; set; } = new();
    public List<string> ShortTermStudyPlan { get; set; } = new();

    // Narrative & Fallback Tracking
    public string PedagogicalNarrative { get; set; } = string.Empty;
    public string Provider { get; set; } = "LocalPedagogicalEngine";
    public bool IsFallbackNarrative { get; set; } = true;
}
