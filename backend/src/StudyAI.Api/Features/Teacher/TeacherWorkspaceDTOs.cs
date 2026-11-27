namespace StudyAI.Features.Teacher;

public class TeacherExamDto
{
    public string Id { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string? SourceAssessmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public bool ShuffleQuestions { get; set; }
    public string? OpenAt { get; set; }
    public string? CloseAt { get; set; }
    public bool PublishResults { get; set; }
    public string Status { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

public class CreateTeacherExamRequestDto
{
    public string ClassroomId { get; set; } = string.Empty;
    public string? SourceAssessmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int DurationMinutes { get; set; } = 45;
    public bool ShuffleQuestions { get; set; } = true;
    public DateTimeOffset? OpenAt { get; set; }
    public DateTimeOffset? CloseAt { get; set; }
}

public class UpdateTeacherExamStatusRequestDto
{
    public string Status { get; set; } = string.Empty;
    public bool? PublishResults { get; set; }
}

public class ClassroomMaterialDto
{
    public string Id { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string StoragePathOrUrl { get; set; } = string.Empty;
    public bool IsRevoked { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}

public class CreateClassroomMaterialRequestDto
{
    public string ClassroomId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "lecture_note";
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = "application/pdf";
    public long FileSizeBytes { get; set; }
    public string StoragePathOrUrl { get; set; } = string.Empty;
}

public class ClassroomAnnouncementDto
{
    public string Id { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public string? AttachmentUrl { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}

public class CreateClassroomAnnouncementRequestDto
{
    public string ClassroomId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public string? AttachmentUrl { get; set; }
}

public class TeacherScheduleItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty; // assignment_due, exam_window, pending_grading
    public string Title { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public string ScheduledAt { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class TeacherAiAssistantRequestDto
{
    public string ClassroomId { get; set; } = string.Empty;
    public string Mode { get; set; } = "lesson_plan"; // lesson_plan, generate_exercises, exam_matrix, feedback_draft
    public string Prompt { get; set; } = string.Empty;
}

public class TeacherAiAssistantResponseDto
{
    public string Content { get; set; } = string.Empty;
    public bool RequiresTeacherConfirmation { get; set; } = true;
    public string ClassroomName { get; set; } = string.Empty;
    public int StudentCount { get; set; }
    public string Provider { get; set; } = string.Empty;
}
