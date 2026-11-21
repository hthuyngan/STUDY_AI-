namespace StudyAI.Domain.Entities;

public class ContentRevision
{
    public string Id { get; set; } = string.Empty;
    public string ContentId { get; set; } = string.Empty;
    public string ContentType { get; set; } = "lesson"; // lesson, question, assessment
    public int Version { get; set; } = 1;
    public string Status { get; set; } = "published";
    public string Title { get; set; } = string.Empty;
    public string SnapshotJson { get; set; } = "{}";
    public string? AuthorId { get; set; }
    public string? CreatedBy { get; set; }
    public string? Reason { get; set; }
    public string? SourceRevisionId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? Author { get; set; }
}
