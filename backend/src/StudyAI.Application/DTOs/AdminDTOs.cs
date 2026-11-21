namespace StudyAI.Application.DTOs;

public class CreateUserRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "learner";
    public string Status { get; set; } = "active";
    public string? Grade { get; set; }
    public string? Password { get; set; }
}

public class CreateUserResponseDto
{
    public AdminUserDto User { get; set; } = new();
    public string? TemporaryPassword { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class UpdateUserRequestDto
{
    public string? DisplayName { get; set; }
    public string? Grade { get; set; }
    public string? Role { get; set; }
    public string? Status { get; set; }
}

public class UpdateRoleRequestDto
{
    public string Role { get; set; } = string.Empty;
}

public class UpdateStatusRequestDto
{
    public string Status { get; set; } = string.Empty;
}

public class ResetPasswordRequestDto
{
    public string? NewPassword { get; set; }
}

public class ResetPasswordResponseDto
{
    public bool Success { get; set; } = true;
    public string UserId { get; set; } = string.Empty;
    public string? TemporaryPassword { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class AdminUserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public bool IsDeleted { get; set; } = false;
    public string? DeletedAt { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string? LastLoginAt { get; set; }
}

public class AdminUsersResponseDto
{
    public List<AdminUserDto> Items { get; set; } = new();
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int Total { get; set; } = 0;
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)Total / PageSize) : 0;
}

public class AdminActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public string TargetId { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public string Timestamp { get; set; } = string.Empty;
}

public class AdminAuditLogsResponseDto
{
    public List<AdminActivityDto> Items { get; set; } = new();
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int Total { get; set; } = 0;
}

public class AdminMetricsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int SuspendedUsers { get; set; }
    public int DisabledUsers { get; set; }
    public int LearnersCount { get; set; }
    public int TeachersCount { get; set; }
    public int ContentCount { get; set; }
    public int SupportCount { get; set; }
    public int AdminsCount { get; set; }
    public int RecentNewUsersCount { get; set; }
    public int CompletedLessonsTotal { get; set; }
    public int StaffAccounts { get; set; }
    public string SystemStatus { get; set; } = "healthy";
}

public class AdminAttentionItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = "info"; // warning, danger, info
    public string Timestamp { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
}

public class AdminDashboardDto
{
    public AdminMetricsDto Metrics { get; set; } = new();
    public List<AdminActivityDto> RecentActivities { get; set; } = new();
    public List<AdminAttentionItemDto> AttentionItems { get; set; } = new();
}

public class AnalyticsTrendPointDto
{
    public string Date { get; set; } = string.Empty;
    public int ActiveUsers { get; set; }
    public int NewUsers { get; set; }
    public int CompletedLessons { get; set; }
    public int LessonsCompleted { get; set; }
}

public class UserDistributionItemDto
{
    public string Name { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public int Count { get; set; }
    public int Percentage { get; set; }
    public string Color { get; set; } = string.Empty;
}

public class AdminAnalyticsResponseDto
{
    public List<AnalyticsTrendPointDto> Trends { get; set; } = new();
    public List<UserDistributionItemDto> RoleDistribution { get; set; } = new();
    public List<UserDistributionItemDto> StatusDistribution { get; set; } = new();
}

public class AdminTeacherDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public List<string> Classes { get; set; } = new();
    public int StudentCount { get; set; }
    public string Status { get; set; } = "active";
    public string JoinedAt { get; set; } = string.Empty;
    public double Rating { get; set; } = 5.0;
    public string Qualifications { get; set; } = string.Empty;
    public int ExperienceYears { get; set; } = 0;
    public string Bio { get; set; } = string.Empty;
    public string AccountStatus { get; set; } = "ACTIVE";
    public string? TemporaryPassword { get; set; }
}

public class TeacherKpisDto
{
    public int TotalTeachers { get; set; }
    public int ActiveTeaching { get; set; }
    public int PendingOrLeave { get; set; }
    public int NewTeachers { get; set; }
}

public class SaveTeacherRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Password { get; set; }
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public List<string>? Classes { get; set; }
    public string? Status { get; set; }
    public string? AccountStatus { get; set; }
    public string? Qualifications { get; set; }
    public int? ExperienceYears { get; set; }
    public string? Bio { get; set; }
}

public class TeacherProfileMetadataDto
{
    public string? Phone { get; set; }
    public string? Qualifications { get; set; }
    public int? ExperienceYears { get; set; }
    public string? Bio { get; set; }
}

public class SubjectProgressReportDto
{
    public string Subject { get; set; } = string.Empty;
    public double Progress { get; set; }
    public int LearnersCount { get; set; }
}

public class ScoreDistributionDto
{
    public string Range { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percent { get; set; }
}

public class LearningReportsResponseDto
{
    public int TotalLearners { get; set; }
    public int ActiveLearners { get; set; }
    public int CompletedLessons { get; set; }
    public double CompletionRatePercent { get; set; }
    public double AverageAssessmentScore { get; set; }
    public List<AnalyticsTrendPointDto> ActivityTrend { get; set; } = new();
    public List<SubjectProgressReportDto> SubjectProgress { get; set; } = new();
    public List<ScoreDistributionDto> ScoreDistribution { get; set; } = new();
}

public class AnnouncementDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Audience { get; set; } = "all";
    public string? TargetClassId { get; set; }
    public string? TargetClassName { get; set; }
    public string Severity { get; set; } = "info";
    public string Status { get; set; } = "published";
    public string CreatedAt { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
    public string? UpdatedAt { get; set; }
}

public class SaveAnnouncementRequestDto
{
    public string? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Audience { get; set; } = "all";
    public string? TargetClassId { get; set; }
    public string? TargetClassName { get; set; }
    public string Severity { get; set; } = "info";
    public string Status { get; set; } = "published";
}

public class OperationalSettingsDto
{
    public string SystemName { get; set; } = "STUDY_AI Educational Platform";
    public string SystemDescription { get; set; } = "Hệ sinh thái học tập và gia sư thông minh ứng dụng AI";
    public string Language { get; set; } = "vi-VN";
    public double PassingScoreThreshold { get; set; } = 5.0;
    public double LowScoreAlertThreshold { get; set; } = 5.0;
    public int AttentionProgressThreshold { get; set; } = 60;
    public bool RequireApprovalBeforePublish { get; set; } = true;
    public bool AllowRevisionRequests { get; set; } = true;
    public bool ShowArchivedContent { get; set; } = false;
    public int NotificationDisplayDays { get; set; } = 7;
    public bool EnableDemoAlerts { get; set; } = false;
    public string UpdatedAt { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;
    public string? Version { get; set; }
}

public class AdminUserDetailDto : AdminUserDto
{
    public int TotalCompletedLessons { get; set; }
    public double AverageScore { get; set; }
    public UserLearningProgressDto? LearningProgress { get; set; }
    public List<UserAssessmentDto> Assessments { get; set; } = new();
    public List<AdminActivityDto> Activities { get; set; } = new();
}

public class UserLearningProgressDto
{
    public int CompletedLessons { get; set; }
    public int TotalLessons { get; set; }
    public int StreakDays { get; set; }
    public List<UserRecentSubjectDto> RecentSubjects { get; set; } = new();
}

public class UserRecentSubjectDto
{
    public string Name { get; set; } = string.Empty;
    public double Progress { get; set; }
    public string LastStudied { get; set; } = string.Empty;
}

public class UserAssessmentDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public double? Score { get; set; }
    public double MaxScore { get; set; } = 10.0;
    public string Status { get; set; } = "completed";
    public string CompletedAt { get; set; } = string.Empty;
}
