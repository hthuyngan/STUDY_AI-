namespace StudyAI.Application.DTOs;

public class SystemHealthReportDto
{
    public string OverallStatus { get; set; } = "healthy"; // healthy, degraded, unhealthy
    public DateTimeOffset CheckedAt { get; set; } = DateTimeOffset.UtcNow;
    public long UptimeSeconds { get; set; }
    public List<ComponentHealthDto> Components { get; set; } = new();
    public ApiMetricsDto ApiMetrics { get; set; } = new();
    public DatabaseHealthDto DatabaseHealth { get; set; } = new();
}

public class ComponentHealthDto
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "healthy"; // healthy, degraded, unhealthy
    public int LatencyMs { get; set; }
    public string? Details { get; set; }
    public DateTimeOffset LastChecked { get; set; } = DateTimeOffset.UtcNow;
}

public class ApiMetricsDto
{
    public int TotalRequests24h { get; set; }
    public int ErrorRequests24h { get; set; }
    public double? ErrorRatePercent { get; set; }
    public int? P95LatencyMs { get; set; }
    public int ActiveSessions { get; set; }
}

public class DatabaseHealthDto
{
    public bool CanConnect { get; set; }
    public int PingLatencyMs { get; set; }
    public int TotalUsers { get; set; }
    public int TotalLessons { get; set; }
    public int TotalQuestions { get; set; }
    public int TotalAssessmentAttempts { get; set; }
    public int TotalAiLogs { get; set; }
    public int TotalLearningEvents { get; set; }
}

public class AiQualityBenchmarkReportDto
{
    public string BenchmarkId { get; set; } = Guid.NewGuid().ToString();
    public DateTimeOffset ExecutedAt { get; set; } = DateTimeOffset.UtcNow;
    public string EvaluationMode { get; set; } = "automated_verified"; // mock_verification, automated_verified, gemini_live
    public double OverallPassRate { get; set; }
    public int TotalCases { get; set; }
    public int PassedCases { get; set; }
    public int FailedCases { get; set; }
    public int AverageLatencyMs { get; set; }
    public List<string> CategoriesTested { get; set; } = new();
    public List<AiQualityAuditItemDto> Items { get; set; } = new();
}

public class AiQualityAuditItemDto
{
    public string TestCaseId { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // calculus, trigonometry, spatial_geometry, probability, safety_exam_leak, socratic_pedagogy
    public string Prompt { get; set; } = string.Empty;
    public string ExpectedCharacteristics { get; set; } = string.Empty;
    public string ActualSnippet { get; set; } = string.Empty;
    public bool Passed { get; set; }
    public int LatencyMs { get; set; }
    public bool NoExamLeak { get; set; }
    public bool SocraticMethod { get; set; }
    public bool ValidKaTeX { get; set; }
    public bool Math12Accuracy { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class AiCostOptimizationDto
{
    public string Period { get; set; } = "last_30_days";
    public int TotalTokens { get; set; }
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public decimal EstimatedCostUsd { get; set; }
    public double? AverageLatencyMs { get; set; }
    public int TotalAiRequests { get; set; }
    public double? SuccessRate { get; set; }
    public List<FeatureUsageSummaryDto> UsageByFeature { get; set; } = new();
    public List<string> OptimizationRecommendations { get; set; } = new();
}

public class FeatureUsageSummaryDto
{
    public string Feature { get; set; } = string.Empty;
    public int RequestCount { get; set; }
    public int Tokens { get; set; }
    public decimal CostUsd { get; set; }
    public double AverageLatencyMs { get; set; }
    public double SharePercentage { get; set; }
}

public class ContentQualityAuditReportDto
{
    public DateTimeOffset AuditedAt { get; set; } = DateTimeOffset.UtcNow;
    public int TotalLessonsScanned { get; set; }
    public int TotalQuestionsScanned { get; set; }
    public int TotalVideosScanned { get; set; }
    public int IssuesFound { get; set; }
    public double HealthScore { get; set; } // 0.0 to 100.0
    public List<ContentIssueItemDto> Issues { get; set; } = new();
}

public class ContentIssueItemDto
{
    public string Severity { get; set; } = "warning"; // critical, warning, info
    public string Category { get; set; } = string.Empty; // lesson_structure, broken_video, question_options, katex_syntax, unapproved_content
    public string ContentId { get; set; } = string.Empty;
    public string ContentTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
}

public class DataConsistencyReportDto
{
    public DateTimeOffset AuditedAt { get; set; } = DateTimeOffset.UtcNow;
    public int TotalStudentsScanned { get; set; }
    public int TotalMasteryRecordsScanned { get; set; }
    public int TotalAttemptsScanned { get; set; }
    public int AnomaliesFound { get; set; }
    public double IntegrityScore { get; set; } // 0.0 to 100.0
    public List<ConsistencyAnomalyItemDto> Anomalies { get; set; } = new();
}

public class ConsistencyAnomalyItemDto
{
    public string AnomalyType { get; set; } = string.Empty; // mastery_score_mismatch, duplicate_submission, abnormal_progress_velocity, orphaned_record
    public string Severity { get; set; } = "medium"; // high, medium, low
    public string EntityId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool AutoRepairable { get; set; }
}

public class StaffAuditLogQueryDto
{
    public string? Action { get; set; }
    public string? TargetType { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class StaffAuditLogListDto
{
    public int TotalCount { get; set; }
    public List<StaffAuditLogItemDto> Logs { get; set; } = new();
}

public class StaffAuditLogItemDto
{
    public string Id { get; set; } = string.Empty;
    public string ActorUserId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public string TargetId { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class DataConsistencyRepairRequestDto
{
    public bool DryRun { get; set; } = true; // Safe by default
    public List<string>? AnomalyEntityIds { get; set; }
}

public class DataConsistencyRepairReportDto
{
    public string OperationId { get; set; } = Guid.NewGuid().ToString("N")[..12];
    public bool WasDryRun { get; set; }
    public string Status { get; set; } = "SUCCESS"; // DRY_RUN_PREVIEW, COMMITTED, ROLLED_BACK, FAILED
    public DateTimeOffset ExecutedAt { get; set; } = DateTimeOffset.UtcNow;
    public int AnomaliesScanned { get; set; }
    public int AnomaliesAddressed { get; set; }
    public List<RepairImpactItemDto> ImpactReport { get; set; } = new();
    public string? AuditLogId { get; set; }
}

public class RepairImpactItemDto
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string AnomalyType { get; set; } = string.Empty;
    public string FieldModified { get; set; } = string.Empty;
    public string OldValue { get; set; } = string.Empty;
    public string NewValue { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
}

