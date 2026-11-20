namespace StudyAI.Application.DTOs;

public class QuestionQualityIssueDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string IssueType { get; set; } = string.Empty;
    public string Severity { get; set; } = "warning"; // "error" or "warning"
    public string Description { get; set; } = string.Empty;
    public string? DetailSnippet { get; set; }
}

public class QuestionQualityAuditReportDto
{
    public string SubjectId { get; set; } = "sub_math12";
    public DateTimeOffset AuditedAt { get; set; } = DateTimeOffset.UtcNow;
    public int TotalQuestions { get; set; }
    public int ValidCount { get; set; }
    public int NeedsReviewCount { get; set; }
    public int BrokenLatexCount { get; set; }
    public int DuplicateCount { get; set; }
    public int MissingAnswerCount { get; set; }
    public double QualityScorePercent { get; set; }
    public List<QuestionQualityIssueDto> Issues { get; set; } = new();
}

public class SpacedRepetitionItemDto
{
    public string ItemId { get; set; } = string.Empty;
    public string TopicName { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public int RepetitionNumber { get; set; }
    public double EasinessFactor { get; set; } = 2.5;
    public int IntervalDays { get; set; } = 1;
    public DateTimeOffset? LastReviewedAt { get; set; }
    public DateTimeOffset NextReviewDate { get; set; }
    public string QueueStatus { get; set; } = "due_today"; // due_today, upcoming, completed, needs_reinforcement
    public double MasteryScore { get; set; }
}

public class SpacedRepetitionQueueDto
{
    public string SubjectId { get; set; } = "sub_math12";
    public List<SpacedRepetitionItemDto> DueToday { get; set; } = new();
    public List<SpacedRepetitionItemDto> Upcoming { get; set; } = new();
    public List<SpacedRepetitionItemDto> CompletedToday { get; set; } = new();
    public List<SpacedRepetitionItemDto> NeedsReinforcement { get; set; } = new();
    public int TotalItems { get; set; }
    public double RetentionRateEstimatePercent { get; set; }
}

public class SpacedRepetitionReviewRequestDto
{
    public string ItemId { get; set; } = string.Empty;
    public string TopicName { get; set; } = string.Empty;
    public string SubjectId { get; set; } = "sub_math12";
    public int QualityScore { get; set; } // 0 to 5
}

public class SpacedRepetitionReviewResultDto
{
    public string ItemId { get; set; } = string.Empty;
    public double NewEasinessFactor { get; set; }
    public int NewIntervalDays { get; set; }
    public DateTimeOffset NextReviewDate { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class RevisionPlanMilestoneDto
{
    public int DayIndex { get; set; }
    public DateTimeOffset Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public int AllocatedMinutes { get; set; }
    public string FocusTopic { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
}

public class RevisionPlanAdjustmentLogDto
{
    public DateTimeOffset AdjustedAt { get; set; } = DateTimeOffset.UtcNow;
    public string Reason { get; set; } = string.Empty;
    public double PreviousTargetScore { get; set; }
    public double NewTargetScore { get; set; }
}

public class RevisionPlanDto
{
    public string PlanId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = "sub_math12";
    public double TargetScore { get; set; } = 8.0;
    public int DailyStudyMinutes { get; set; } = 45;
    public DateTimeOffset ExamDate { get; set; }
    public int DaysRemaining { get; set; }
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastUpdatedAt { get; set; }
    public List<RevisionPlanMilestoneDto> Milestones { get; set; } = new();
    public List<RevisionPlanAdjustmentLogDto> AdjustmentHistory { get; set; } = new();
}

public class CreateRevisionPlanRequestDto
{
    public string SubjectId { get; set; } = "sub_math12";
    public double TargetScore { get; set; } = 8.0;
    public int DailyStudyMinutes { get; set; } = 45;
    public DateTimeOffset ExamDate { get; set; }
}

public class ExamReadinessDto
{
    public string UserId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = "sub_math12";
    public DateTimeOffset AssessedAt { get; set; } = DateTimeOffset.UtcNow;
    public double ReadinessScorePercent { get; set; }
    public string ReadinessTier { get; set; } = "insufficient_data"; // insufficient_data, needs_reinforcement, progressing, exam_ready
    public double CurriculumCoveragePercent { get; set; }
    public double ExamScoreStabilityPercent { get; set; }
    public double PredictedScoreMin { get; set; }
    public double PredictedScoreMax { get; set; }
    public Dictionary<string, double> CriticalTopicsMastery { get; set; } = new();
    public string Disclaimer { get; set; } = "Dự đoán mang tính chất tham khảo dựa trên mô hình năng lực học tập, không đảm bảo điểm thi thực tế.";
    public string RecommendedAction { get; set; } = string.Empty;
}

