using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StudyAI.Models;

[Table("teacher_exams")]
public class TeacherExam
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string ClassroomId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string TeacherId { get; set; } = string.Empty;

    [MaxLength(64)]
    public string? SourceAssessmentId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public int DurationMinutes { get; set; } = 45;
    public bool ShuffleQuestions { get; set; } = true;
    public DateTimeOffset? OpenAt { get; set; }
    public DateTimeOffset? CloseAt { get; set; }
    public bool PublishResults { get; set; } = false;

    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "draft"; // draft, published, closed

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

[Table("classroom_materials")]
public class ClassroomMaterial
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string ClassroomId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string TeacherId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string Category { get; set; } = "lecture_note";

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string MimeType { get; set; } = "application/pdf";

    public long FileSizeBytes { get; set; }

    [Required]
    [MaxLength(500)]
    public string StoragePathOrUrl { get; set; } = string.Empty;

    public bool IsRevoked { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

[Table("classroom_announcements")]
public class ClassroomAnnouncement
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string ClassroomId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string TeacherId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Body { get; set; } = string.Empty;

    public bool IsPinned { get; set; } = false;

    [MaxLength(500)]
    public string? AttachmentUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
