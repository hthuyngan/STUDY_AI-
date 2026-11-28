namespace StudyAI.Features.Content;

public class ContentChapterQuestionStatDto
{
    public string ChapterCode { get; set; } = string.Empty;
    public string ChapterTitle { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    public int LessonCount { get; set; }
}

public class ContentRecentEditDto
{
    public string Id { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
}

public class ContentWorkspaceDashboardDto
{
    public int TotalLessons { get; set; }
    public int TotalQuestions { get; set; }
    public int TotalExams { get; set; }
    public int TotalMaterials { get; set; }
    public int PublishedCount { get; set; }
    public int DraftCount { get; set; }
    public int PendingReviewCount { get; set; }
    public int OpenErrorReportsCount { get; set; }
    public int AiSourcesIndexedCount { get; set; }
    public int AiSourcesFailedCount { get; set; }
    public List<ContentChapterQuestionStatDto> QuestionsByChapter { get; set; } = new();
    public List<ContentRecentEditDto> RecentEdits { get; set; } = new();
}

public class ContentMaterialDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? ChapterCode { get; set; }
    public string? ChapterTitle { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? FileHashSha256 { get; set; }
    public string StoragePathOrUrl { get; set; } = string.Empty;
    public bool HasExtractedText { get; set; }
    public string Status { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class CreateContentMaterialRequestDto
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "chapter_doc";
    public string? ChapterCode { get; set; }
    public string? ChapterTitle { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = "application/pdf";
    public long FileSizeBytes { get; set; }
    public string? Base64Header { get; set; }
    public string? Base64Content { get; set; }
    public string StoragePathOrUrl { get; set; } = string.Empty;
}

public class UpdateContentMaterialStatusRequestDto
{
    public string Status { get; set; } = string.Empty;
}

public class AiKnowledgeSourceDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public string SourceRefId { get; set; } = string.Empty;
    public string? ChapterCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public int ChunkCount { get; set; }
    public string? LastIndexedAt { get; set; }
    public string? LastError { get; set; }
    public string UpdatedAt { get; set; } = string.Empty;
}

public class RegisterAiKnowledgeSourceRequestDto
{
    public string SourceType { get; set; } = "lesson";
    public string SourceRefId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? ChapterCode { get; set; }
    public string? ExtractedText { get; set; }
}

public class RetrieveKnowledgeTestRequestDto
{
    public string Query { get; set; } = string.Empty;
    public int TopK { get; set; } = 5;
}

public class RetrievedKnowledgeChunkDto
{
    public string ChunkId { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public string SourceTitle { get; set; } = string.Empty;
    public string ContentText { get; set; } = string.Empty;
    public int Score { get; set; }
}

public class ContentErrorReportDto
{
    public string Id { get; set; } = string.Empty;
    public string ReportCode { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public string? TargetId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ReportedByUserId { get; set; } = string.Empty;
    public string? ResolutionNote { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class CreateContentErrorReportRequestDto
{
    public string TargetType { get; set; } = "question";
    public string? TargetId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = "medium";
}

public class UpdateContentErrorReportRequestDto
{
    public string? Status { get; set; }
    public string? Classification { get; set; }
    public string? ResolutionNote { get; set; }
}
