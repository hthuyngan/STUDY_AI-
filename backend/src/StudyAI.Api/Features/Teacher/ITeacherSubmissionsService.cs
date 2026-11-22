
namespace StudyAI.Features.Teacher;

public class TeacherSubmissionListItemDto
{
    public string Id { get; set; } = string.Empty;
    public string AssignmentId { get; set; } = string.Empty;
    public string AssignmentTitle { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public string SubmittedAt { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public double? Score { get; set; }
    public double MaxScore { get; set; } = 10.0;
    public string? Feedback { get; set; }
    public string? GradedBy { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class TeacherGradeListItemDto
{
    public string Id { get; set; } = string.Empty;
    public string SubmissionId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string StudentCode { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string ActivityTitle { get; set; } = string.Empty;
    public string ActivityType { get; set; } = "assignment";
    public double Score { get; set; }
    public double MaxScore { get; set; } = 10.0;
    public bool Passed { get; set; }
    public string Date { get; set; } = string.Empty;
    public string? Feedback { get; set; }
}

public interface ITeacherSubmissionsService
{
    Task<SubmissionDto> SubmitAssignmentAsync(string userId, string userRole, string assignmentId, CreateSubmissionRequestDto dto, CancellationToken cancellationToken = default);
    Task<SubmissionDto> GetMySubmissionAsync(string userId, string assignmentId, CancellationToken cancellationToken = default);
    Task<List<SubmissionDto>> GetAssignmentSubmissionsAsync(string userId, string userRole, string assignmentId, CancellationToken cancellationToken = default);
    Task<SubmissionDto> GradeSubmissionAsync(string userId, string userRole, string assignmentId, string submissionId, GradeSubmissionRequestDto dto, CancellationToken cancellationToken = default);
    Task<List<TeacherSubmissionListItemDto>> GetTeacherSubmissionsAsync(string userId, string userRole, string? classId = null, string? assignmentId = null, string? status = null, CancellationToken cancellationToken = default);
    Task<List<TeacherGradeListItemDto>> GetGradesAsync(string userId, string userRole, string? classId = null, string? assignmentId = null, CancellationToken cancellationToken = default);
}