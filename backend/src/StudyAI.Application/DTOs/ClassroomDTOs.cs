namespace StudyAI.Application.DTOs;

public class ClassroomDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Grade { get; set; }
    public string? Subject { get; set; }
    public string TeacherId { get; set; } = string.Empty;
    public string? TeacherName { get; set; }
    public string? Description { get; set; }
    public string? Room { get; set; }
    public string? AcademicYear { get; set; }
    public string Status { get; set; } = "active";
    public int StudentCount { get; set; }
    public int AssignmentCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public class CreateClassroomRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Grade { get; set; }
    public string? Subject { get; set; }
    public string? Description { get; set; }
    public string? Room { get; set; }
    public string? AcademicYear { get; set; }
}

public class UpdateClassroomRequestDto
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Grade { get; set; }
    public string? Subject { get; set; }
    public string? Description { get; set; }
    public string? Room { get; set; }
    public string? AcademicYear { get; set; }
    public string? Status { get; set; }
}

public class ClassroomStudentDto
{
    public string Id { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string? StudentName { get; set; }
    public string? StudentEmail { get; set; }
    public string? StudentGrade { get; set; }
    public DateTimeOffset EnrolledAt { get; set; }
}

public class EnrollStudentRequestDto
{
    public string? StudentId { get; set; }
    public string? StudentEmail { get; set; }
}

public class AssignmentDto
{
    public string Id { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string? ClassroomName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public DateTimeOffset DueDate { get; set; }
    public double MaxScore { get; set; } = 10.0;
    public string Status { get; set; } = "active";
    public string CreatedByTeacherId { get; set; } = string.Empty;
    public string? CreatedByTeacherName { get; set; }
    public int SubmissionsCount { get; set; }
    public int TotalStudents { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public SubmissionDto? MySubmission { get; set; }
}

public class CreateAssignmentRequestDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public DateTimeOffset DueDate { get; set; }
    public double MaxScore { get; set; } = 10.0;
}

public class UpdateAssignmentRequestDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public DateTimeOffset? DueDate { get; set; }
    public double? MaxScore { get; set; }
    public string? Status { get; set; }
}

public class SubmissionDto
{
    public string Id { get; set; } = string.Empty;
    public string AssignmentId { get; set; } = string.Empty;
    public string? AssignmentTitle { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public string? StudentName { get; set; }
    public string? StudentEmail { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTimeOffset SubmittedAt { get; set; }
    public string Status { get; set; } = "submitted";
    public double? Score { get; set; }
    public string? Feedback { get; set; }
    public DateTimeOffset? GradedAt { get; set; }
    public string? GradedByTeacherId { get; set; }
}

public class CreateSubmissionRequestDto
{
    public string Content { get; set; } = string.Empty;
}

public class GradeSubmissionRequestDto
{
    public double Score { get; set; }
    public string? Feedback { get; set; }
}

