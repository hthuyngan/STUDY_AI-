namespace StudyAI.Domain.Entities;

public class Classroom
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
    public string Status { get; set; } = "active"; // "active", "archived"
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? Teacher { get; set; }
    public ICollection<ClassroomStudent> Students { get; set; } = new List<ClassroomStudent>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public class ClassroomStudent
{
    public string Id { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public DateTimeOffset EnrolledAt { get; set; } = DateTimeOffset.UtcNow;

    public Classroom? Classroom { get; set; }
    public User? Student { get; set; }
}

public class Assignment
{
    public string Id { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public DateTimeOffset DueDate { get; set; }
    public double MaxScore { get; set; } = 10.0;
    public string Status { get; set; } = "active"; // "active", "closed"
    public string CreatedByTeacherId { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Classroom? Classroom { get; set; }
    public User? CreatedByTeacher { get; set; }
    public ICollection<AssignmentSubmission> Submissions { get; set; } = new List<AssignmentSubmission>();
}

public class AssignmentSubmission
{
    public string Id { get; set; } = string.Empty;
    public string AssignmentId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
    public string Status { get; set; } = "submitted"; // "submitted", "graded", "late"
    public double? Score { get; set; }
    public string? Feedback { get; set; }
    public DateTimeOffset? GradedAt { get; set; }
    public string? GradedByTeacherId { get; set; }

    public Assignment? Assignment { get; set; }
    public User? Student { get; set; }
}

