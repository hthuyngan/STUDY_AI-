namespace StudyAI.Domain.Entities;

public class ContentSubject
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Grade { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ContentChapter> Chapters { get; set; } = new List<ContentChapter>();
}

public class ContentChapter
{
    public string Id { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OrderIndex { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentSubject? Subject { get; set; }
    public ICollection<ContentLesson> Lessons { get; set; } = new List<ContentLesson>();
}

public class ContentLesson
{
    public string Id { get; set; } = string.Empty;
    public string ChapterId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string Status { get; set; } = "draft"; // draft, in-review, approved, published, archived
    public string AuthorId { get; set; } = string.Empty;
    public string? ReviewedBy { get; set; }

    public string? Introduction { get; set; }
    public string? DefinitionsJson { get; set; }
    public string? FormulasJson { get; set; }
    public string? ExamplesJson { get; set; }
    public string? ImportantNotesJson { get; set; }
    public string? SummaryPointsJson { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentChapter? Chapter { get; set; }
    public User? Author { get; set; }
    public ICollection<ContentAssessment> Assessments { get; set; } = new List<ContentAssessment>();
    public ICollection<ContentQuestion> Questions { get; set; } = new List<ContentQuestion>();
}

public class ContentAssessment
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int PassScore { get; set; } = 80;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentLesson? Lesson { get; set; }
    public ICollection<ContentQuestion> Questions { get; set; } = new List<ContentQuestion>();
}

public class ContentQuestion
{
    public string Id { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? AssessmentId { get; set; }
    public string? LessonId { get; set; }
    public string? SubjectId { get; set; }
    public string? ChapterId { get; set; }
    public string? Grade { get; set; }

    public string Prompt { get; set; } = string.Empty;
    public string OptionsJson { get; set; } = "[]";
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? Topic { get; set; }
    public string Difficulty { get; set; } = "medium"; // easy, medium, hard, very-hard (nhan_biet, thong_hieu, van_dung, van_dung_cao)
    public string Type { get; set; } = "multiple-choice"; // multiple-choice, multiple-select, true-false, short-answer, essay
    public string Status { get; set; } = "published"; // draft, in-review, approved, rejected, published
    public int OrderIndex { get; set; } = 0;

    // Attachments & rich media
    public string? ImageUrl { get; set; }
    public string? MetadataJson { get; set; }

    // Soft delete
    public bool IsDeleted { get; set; } = false;
    public DateTimeOffset? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }

    // Workflow & provenance
    public string? AuthorId { get; set; }
    public string? ReviewedBy { get; set; }
    public string? RejectionReason { get; set; }
    public string SourceType { get; set; } = "manual"; // manual, csv, json, ai-generated, vnhsge, external_licensed
    public string? SourceBatchId { get; set; }
    public string? SourceUrl { get; set; }
    public string CopyrightStatus { get; set; } = "proprietary"; // verified, pending_proof, proprietary, public_domain
    public string? CopyrightProofRef { get; set; }
    public int Version { get; set; } = 1;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentAssessment? Assessment { get; set; }
    public ContentLesson? Lesson { get; set; }
    public User? Author { get; set; }
}
