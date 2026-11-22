namespace StudyAI.Models;

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
    public string Status { get; set; } = "published"; // draft, published, archived
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentSubject? Subject { get; set; }
    public ICollection<ContentTopic> Topics { get; set; } = new List<ContentTopic>();
    public ICollection<ContentLesson> Lessons { get; set; } = new List<ContentLesson>();
}

public class ContentTopic
{
    public string Id { get; set; } = string.Empty;
    public string ChapterId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OrderIndex { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentChapter? Chapter { get; set; }
    public ICollection<ContentLesson> Lessons { get; set; } = new List<ContentLesson>();
}

public class ContentLesson
{
    public string Id { get; set; } = string.Empty;
    public string ChapterId { get; set; } = string.Empty;
    public string? TopicId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string Status { get; set; } = "draft"; // draft, in-review, approved, published, archived
    public string AuthorId { get; set; } = string.Empty;
    public string? ReviewedBy { get; set; }
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceLicense { get; set; }

    public string? LearningObjectivesJson { get; set; }
    public string? Introduction { get; set; }
    public string? DefinitionsJson { get; set; }
    public string? FormulasJson { get; set; }
    public string? ExamplesJson { get; set; }
    public string? ImportantNotesJson { get; set; }
    public string? SummaryPointsJson { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentChapter? Chapter { get; set; }
    public ContentTopic? Topic { get; set; }
    public User? Author { get; set; }
    public ICollection<ContentAssessment> Assessments { get; set; } = new List<ContentAssessment>();
    public ICollection<ContentQuestion> Questions { get; set; } = new List<ContentQuestion>();
    public ICollection<ContentLessonVideo> Videos { get; set; } = new List<ContentLessonVideo>();
}

public class ContentLessonVideo
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Provider { get; set; } = "youtube"; // youtube, khan_academy, html5, external
    public string SourceUrl { get; set; } = string.Empty;
    public string? EmbedUrl { get; set; }
    public string? YouTubeVideoId { get; set; }
    public string? ChannelName { get; set; }
    public bool IsPrimary { get; set; } = false;
    public string? AttributionText { get; set; }
    public string Language { get; set; } = "vi";
    public int DurationSeconds { get; set; } = 0;
    public string? ThumbnailUrl { get; set; }
    public int SortOrder { get; set; } = 1;
    public bool EmbedAllowed { get; set; } = true;
    public string VerificationStatus { get; set; } = "verified"; // verified, pending_verification, missing
    public DateTimeOffset? VerifiedAt { get; set; }
    public DateTimeOffset? LastVerifiedAt { get; set; }
    public bool IsPublished { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentLesson? Lesson { get; set; }
}

public class ContentAssessment
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int PassScore { get; set; } = 80;
    public string Status { get; set; } = "draft"; // draft, in-review, published, archived
    public int DurationMinutes { get; set; } = 15;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

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
