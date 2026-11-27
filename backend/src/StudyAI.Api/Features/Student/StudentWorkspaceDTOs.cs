namespace StudyAI.Features.Student;

public class StudentMistakeItemDto
{
    public string ResponseId { get; set; } = string.Empty;
    public string QuestionId { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string? StudentAnswer { get; set; }
    public string? CorrectAnswer { get; set; }
    public string? Explanation { get; set; }
    public string? ChapterTitle { get; set; }
    public int WrongCount { get; set; }
    public string LastAttemptAt { get; set; } = string.Empty;
}

public class JoinClassroomRequestDto
{
    public string Code { get; set; } = string.Empty;
}

public class LearnerClassroomSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? TeacherName { get; set; }
    public string EnrolledAt { get; set; } = string.Empty;
    public List<LearnerClassAnnouncementDto> Announcements { get; set; } = new();
    public List<LearnerClassMaterialDto> Materials { get; set; } = new();
}

public class LearnerClassAnnouncementDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsPinned { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}

public class LearnerClassMaterialDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string StoragePathOrUrl { get; set; } = string.Empty;
}
