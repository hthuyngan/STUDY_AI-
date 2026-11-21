using System.Text.Json.Nodes;

namespace StudyAI.Application.DTOs;

public class CreatePracticeSessionRequest
{
    public string SubjectId { get; set; } = string.Empty;
    public string? ChapterId { get; set; }
    public string? LessonId { get; set; }
    public string? Difficulty { get; set; } // "all", "easy", "medium", "hard", "very-hard"
    public int QuestionCount { get; set; } = 10;
    public string Mode { get; set; } = "practice"; // "practice", "exam", "lesson", "smart_review"
    public int? TimeLimitMinutes { get; set; } // e.g. 50, 60, 90
    public string? BlueprintId { get; set; }
    public string? SkillId { get; set; }
    public List<string>? SkillIds { get; set; }
    public string? QuestionType { get; set; }
    public string? Grade { get; set; }
}

public class PracticeQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string? ImageUrl { get; set; }
    public string Difficulty { get; set; } = "medium";
    public string Type { get; set; } = "multiple-choice";
    public string? Topic { get; set; }
    public string? SubjectId { get; set; }
}

public class PracticeSessionResponseDto
{
    public string SessionId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string? ChapterId { get; set; }
    public string? LessonId { get; set; }
    public string Mode { get; set; } = "practice";
    public int QuestionCount { get; set; }
    public int? TimeLimitMinutes { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public string Status { get; set; } = "in_progress"; // in_progress, completed, expired, abandoned
    public List<PracticeQuestionDto> Questions { get; set; } = new();
    public Dictionary<string, string> SavedAnswers { get; set; } = new();
}

public class SaveAnswerRequest
{
    public string QuestionId { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int TimeSpentMs { get; set; } = 0;
}

public class CheckQuestionRequest
{
    public string QuestionId { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
}

public class CheckQuestionResponse
{
    public string QuestionId { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
}

public class SubmitPracticeSessionRequest
{
    public Dictionary<string, string> Answers { get; set; } = new();
    public int SessionTimeMs { get; set; } = 0;
}

public class QuestionResultItemDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string StudentAnswer { get; set; } = string.Empty;
    public string CorrectAnswer { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public string? Explanation { get; set; }
    public string Difficulty { get; set; } = string.Empty;
}

public class PracticeResultDto
{
    public string ResultId { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string Mode { get; set; } = "practice";
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public int IncorrectCount { get; set; }
    public int UnansweredCount { get; set; }
    public double ScoreRaw { get; set; }
    public double ScoreScaled { get; set; } // Out of 10.0
    public bool Passed { get; set; }
    public int TimeSpentSeconds { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    public List<QuestionResultItemDto> Questions { get; set; } = new();
    public Dictionary<string, double> PerformanceByDifficulty { get; set; } = new();
}

public class MistakeItemDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string Difficulty { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public DateTimeOffset LastAttemptAt { get; set; }
    public int MistakeCount { get; set; }
    public int ReviewBox { get; set; } = 1; // Leitner box 1..5
    public string NextReviewDate { get; set; } = string.Empty; // YYYY-MM-DD
    public string Status { get; set; } = "due"; // due, overdue, upcoming, mastered
}

public class ReviewMistakeRequest
{
    public string Answer { get; set; } = string.Empty;
    public string? Rating { get; set; } // "again", "hard", "good", "easy"
}

public class ReviewMistakeResponse
{
    public string QuestionId { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public int OldBox { get; set; }
    public int NewBox { get; set; }
    public string NextReviewDate { get; set; } = string.Empty;
    public bool Mastered { get; set; }
}

public class LearnerDashboardStatsDto
{
    public int CompletedLessons { get; set; }
    public int TotalQuestionsPracticed { get; set; }
    public int TotalCorrectAnswers { get; set; }
    public double AccuracyRate { get; set; }
    public int StreakDays { get; set; }
    public int TotalMistakes { get; set; }
    public int DueReviewsCount { get; set; }
    public int TotalStudyMinutes { get; set; }
    public List<SubjectDashboardProgressDto> SubjectProgress { get; set; } = new();
    public List<RecentPracticeAttemptDto> RecentAttempts { get; set; } = new();
}

public class SubjectDashboardProgressDto
{
    public string SubjectId { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public int CompletedLessons { get; set; }
    public int TotalLessons { get; set; }
    public int QuestionsPracticed { get; set; }
    public double AccuracyRate { get; set; }
    public double ProgressPercent { get; set; }
}

public class RecentPracticeAttemptDto
{
    public string AttemptId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string Mode { get; set; } = string.Empty;
    public double ScoreScaled { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
}

