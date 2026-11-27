using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StudyAI.Models;

[Table("content_materials")]
public class ContentMaterial
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string Category { get; set; } = "chapter_doc"; // pdf, formula_sheet, chapter_doc, topic_doc, reference_exam, diagram

    [MaxLength(32)]
    public string? ChapterCode { get; set; } // M12-C1 .. M12-C6

    [MaxLength(200)]
    public string? ChapterTitle { get; set; }

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string MimeType { get; set; } = "application/pdf";

    public long FileSizeBytes { get; set; }

    [MaxLength(64)]
    public string? FileHashSha256 { get; set; }

    [Required]
    [MaxLength(500)]
    public string StoragePathOrUrl { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "draft"; // draft, pending_review, published, archived

    [Required]
    [MaxLength(64)]
    public string CreatedByUserId { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

[Table("ai_knowledge_sources")]
public class AiKnowledgeSource
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string SourceType { get; set; } = "lesson"; // lesson, material

    [Required]
    [MaxLength(64)]
    public string SourceRefId { get; set; } = string.Empty;

    [MaxLength(32)]
    public string? ChapterCode { get; set; }

    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "pending"; // pending, indexed, failed, revoked

    public int ChunkCount { get; set; }

    public DateTimeOffset? LastIndexedAt { get; set; }

    [MaxLength(500)]
    public string? LastError { get; set; }

    [Required]
    [MaxLength(64)]
    public string CreatedByUserId { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<AiKnowledgeChunk> Chunks { get; set; } = new();
}

[Table("ai_knowledge_chunks")]
public class AiKnowledgeChunk
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string SourceId { get; set; } = string.Empty;

    [ForeignKey(nameof(SourceId))]
    public AiKnowledgeSource? Source { get; set; }

    public int ChunkIndex { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string ContentText { get; set; } = string.Empty;

    public int TokenEstimate { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

[Table("content_error_reports")]
public class ContentErrorReport
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string ReportCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string TargetType { get; set; } = "question"; // question, answer, formula, solution, lesson, ai_response

    [MaxLength(64)]
    public string? TargetId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = "medium"; // low, medium, high

    [Required]
    [MaxLength(40)]
    public string Classification { get; set; } = "content_error"; // content_error, technical_escalation

    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "open"; // open, in_progress, resolved, escalated, closed

    [Required]
    [MaxLength(64)]
    public string ReportedByUserId { get; set; } = string.Empty;

    [MaxLength(64)]
    public string? AssignedToUserId { get; set; }

    [MaxLength(1000)]
    public string? ResolutionNote { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ResolvedAt { get; set; }
}
