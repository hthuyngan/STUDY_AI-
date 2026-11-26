namespace StudyAI.Models;

/// <summary>Ordered, versioned content block belonging to a lesson.</summary>
public class LessonContentBlock
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string BlockType { get; set; } = "text";
    public int SchemaVersion { get; set; } = 1;
    public string PayloadJson { get; set; } = "{}";
    public int OrderIndex { get; set; } = 0;
    public string Status { get; set; } = "draft"; // draft, in-review, approved, published, archived
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ContentLesson? Lesson { get; set; }
}

/// <summary>Curriculum-scoped learning objective with stable business code.</summary>
public class LearningObjective
{
    public string Id { get; set; } = string.Empty;
    public string CurriculumId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CognitiveLevel { get; set; }
    public string Status { get; set; } = "draft";
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceLicense { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public Curriculum? Curriculum { get; set; }
    public ICollection<LessonObjective> LessonLinks { get; set; } = new List<LessonObjective>();
}

/// <summary>Curriculum-scoped knowledge unit with stable business code.</summary>
public class KnowledgeUnit
{
    public string Id { get; set; } = string.Empty;
    public string CurriculumId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "draft";
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceLicense { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public Curriculum? Curriculum { get; set; }
    public ICollection<LessonKnowledgeUnit> LessonLinks { get; set; } = new List<LessonKnowledgeUnit>();
}

/// <summary>Curriculum-scoped skill with stable business code.</summary>
public class Skill
{
    public string Id { get; set; } = string.Empty;
    public string CurriculumId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "draft";
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceLicense { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public Curriculum? Curriculum { get; set; }
    public ICollection<LessonSkill> LessonLinks { get; set; } = new List<LessonSkill>();
    public ICollection<QuestionSkill> QuestionLinks { get; set; } = new List<QuestionSkill>();
}

public class LessonObjective
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string ObjectiveId { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentLesson? Lesson { get; set; }
    public LearningObjective? Objective { get; set; }
}

public class LessonKnowledgeUnit
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string KnowledgeUnitId { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentLesson? Lesson { get; set; }
    public KnowledgeUnit? KnowledgeUnit { get; set; }
}

public class LessonSkill
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string SkillId { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentLesson? Lesson { get; set; }
    public Skill? Skill { get; set; }
}

public class LessonPrerequisite
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string PrerequisiteLessonId { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentLesson? Lesson { get; set; }
    public ContentLesson? PrerequisiteLesson { get; set; }
}

/// <summary>P03 schema foundation for question-to-skill relational mapping.</summary>
public class QuestionSkill
{
    public string Id { get; set; } = string.Empty;
    public string QuestionId { get; set; } = string.Empty;
    public string SkillId { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ContentQuestion? Question { get; set; }
    public Skill? Skill { get; set; }
}
