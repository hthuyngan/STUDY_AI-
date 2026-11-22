using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Teacher.Analytics;

public class TeacherAlertItemDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("studentId")]
    public string StudentId { get; set; } = string.Empty;

    [JsonPropertyName("studentName")]
    public string StudentName { get; set; } = string.Empty;

    [JsonPropertyName("classId")]
    public string ClassId { get; set; } = string.Empty;

    [JsonPropertyName("className")]
    public string ClassName { get; set; } = string.Empty;

    [JsonPropertyName("severity")]
    public string Severity { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("resolutionNote")]
    public string? ResolutionNote { get; set; }
}

public class TeacherAlertUpdateResultDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("resolutionNote")]
    public string? ResolutionNote { get; set; }
}

public class TeacherAlertResolveAllResultDto
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("resolvedCount")]
    public int ResolvedCount { get; set; }
}

public class AcademicStudentSummaryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("classId")]
    public string ClassId { get; set; } = string.Empty;

    [JsonPropertyName("className")]
    public string ClassName { get; set; } = string.Empty;

    [JsonPropertyName("progress")]
    public double Progress { get; set; }

    [JsonPropertyName("averageScore")]
    public double AverageScore { get; set; }

    [JsonPropertyName("lastActive")]
    public string LastActive { get; set; } = string.Empty;
}

public class AcademicRecentLessonDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("progress")]
    public int Progress { get; set; }

    [JsonPropertyName("lastActive")]
    public string LastActive { get; set; } = string.Empty;
}

public class AcademicAssessmentAttemptDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("score")]
    public double Score { get; set; }

    [JsonPropertyName("passed")]
    public bool Passed { get; set; }

    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;
}

public class TeacherStudentAcademicDetailDto
{
    [JsonPropertyName("student")]
    public AcademicStudentSummaryDto Student { get; set; } = new();

    [JsonPropertyName("overallProgress")]
    public double OverallProgress { get; set; }

    [JsonPropertyName("averageAssessmentScore")]
    public double AverageAssessmentScore { get; set; }

    [JsonPropertyName("recentLessons")]
    public List<AcademicRecentLessonDto> RecentLessons { get; set; } = new();

    [JsonPropertyName("assessmentAttempts")]
    public List<AcademicAssessmentAttemptDto> AssessmentAttempts { get; set; } = new();

    [JsonPropertyName("weakAreas")]
    public List<string> WeakAreas { get; set; } = new();
}

public interface ITeacherAnalyticsService
{
    Task<List<TeacherClassroomSummaryDto>> GetClassroomsAsync(string userId, string userRole, CancellationToken cancellationToken = default);
    Task<ClassroomAnalyticsDto> GetClassroomAnalyticsAsync(string userId, string userRole, string classroomId, CancellationToken cancellationToken = default);
    Task<List<TeachingRecommendationDto>> GetRecommendationsAsync(string userId, string userRole, string classroomId, CancellationToken cancellationToken = default);
    Task<RemedialInterventionOutcomeDto> AssignInterventionAsync(string userId, string userRole, CreateRemedialInterventionRequestDto request, CancellationToken cancellationToken = default);
    Task<List<RemedialInterventionOutcomeDto>> GetInterventionsAsync(string userId, string userRole, string classroomId, CancellationToken cancellationToken = default);
    Task<List<TeacherAlertItemDto>> GetAlertsAsync(string userId, string userRole, CancellationToken cancellationToken = default);
    Task<TeacherAlertUpdateResultDto> UpdateAlertAsync(string userId, string userRole, string alertId, JsonObject payload, CancellationToken cancellationToken = default);
    Task<TeacherAlertResolveAllResultDto> ResolveAllAlertsAsync(string userId, string userRole, CancellationToken cancellationToken = default);
    Task<TeacherStudentAcademicDetailDto> GetStudentAcademicDetailAsync(string userId, string userRole, string studentId, CancellationToken cancellationToken = default);
}
