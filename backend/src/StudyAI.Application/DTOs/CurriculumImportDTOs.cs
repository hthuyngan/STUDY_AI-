namespace StudyAI.Application.DTOs;

public enum ImportFileFormat
{
    Json,
    Csv,
    Xlsx
}

public enum ImportActionType
{
    Insert,
    Update,
    Skip,
    Conflict
}

public enum ImportErrorSeverity
{
    Error,
    Warning
}

#region Parsed Content Hierarchy

public class ImportDefinitionDto
{
    public string Term { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class ImportFormulaDto
{
    public string Name { get; set; } = string.Empty;
    public string Latex { get; set; } = string.Empty;
}

public class ImportExampleDto
{
    public string Title { get; set; } = string.Empty;
    public string? Problem { get; set; }
    public string? Solution { get; set; }
}

public class ImportQuestionItemDto
{
    public string? Code { get; set; }
    public string SubjectCode { get; set; } = string.Empty;
    public string? ChapterCode { get; set; }
    public string? LessonCode { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? Topic { get; set; }
    public string Difficulty { get; set; } = "medium"; // easy, medium, hard
    public string Type { get; set; } = "multiple-choice"; // multiple-choice, true-false, short-answer
    public string Status { get; set; } = "draft";
    public int OrderIndex { get; set; } = 0;
    public string? OutcomeCode { get; set; }
    public string? SourceCitation { get; set; }
    public string? LicenseType { get; set; }
    public int RowNumber { get; set; } = 0;
    public string Fingerprint { get; set; } = string.Empty;
}

public class ImportLessonItemDto
{
    public string Code { get; set; } = string.Empty;
    public string ChapterCode { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string Status { get; set; } = "draft";
    public string? Introduction { get; set; }
    public List<ImportDefinitionDto> Definitions { get; set; } = new();
    public List<ImportFormulaDto> Formulas { get; set; } = new();
    public List<ImportExampleDto> Examples { get; set; } = new();
    public List<string> ImportantNotes { get; set; } = new();
    public List<string> SummaryPoints { get; set; } = new();
    public List<ImportQuestionItemDto> Questions { get; set; } = new();
    public int RowNumber { get; set; } = 0;
}

public class ImportChapterItemDto
{
    public string Code { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OrderIndex { get; set; } = 0;
    public List<ImportLessonItemDto> Lessons { get; set; } = new();
    public int RowNumber { get; set; } = 0;
}

public class ImportSubjectItemDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Grade { get; set; } = "12";
    public string? Description { get; set; }
    public int OrderIndex { get; set; } = 0;
    public List<ImportChapterItemDto> Chapters { get; set; } = new();
    public int RowNumber { get; set; } = 0;
}

public class CurriculumImportBatchDto
{
    public List<ImportSubjectItemDto> Subjects { get; set; } = new();
    public List<ImportQuestionItemDto> FlatQuestions { get; set; } = new();
    public ImportFileFormat SourceFormat { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileHashSha256 { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; } = 0;
    public int TotalEntitiesCount =>
        Subjects.Count +
        Subjects.Sum(s => s.Chapters.Count) +
        Subjects.Sum(s => s.Chapters.Sum(c => c.Lessons.Count)) +
        FlatQuestions.Count;
}

#endregion

#region Validation & Preview DTOs

public class ImportValidationErrorDto
{
    public int Row { get; set; }
    public string Field { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? RejectedValue { get; set; }
    public ImportErrorSeverity Severity { get; set; } = ImportErrorSeverity.Error;
}

public class ImportItemPreviewDto
{
    public string EntityType { get; set; } = string.Empty; // subject, chapter, lesson, question
    public string Identifier { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public ImportActionType Action { get; set; } = ImportActionType.Insert;
    public string? Reason { get; set; }
}

public class ImportPreviewSummaryDto
{
    public int TotalItems { get; set; }
    public int InsertCount { get; set; }
    public int UpdateCount { get; set; }
    public int SkipCount { get; set; }
    public int ConflictCount { get; set; }
    public int ErrorCount { get; set; }
    public int WarningCount { get; set; }
    public bool IsValid => ErrorCount == 0 && ConflictCount == 0;
}

public class CurriculumImportPreviewResponseDto
{
    public string PreviewToken { get; set; } = string.Empty;
    public string FileHashSha256 { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileFormat { get; set; } = string.Empty;
    public ImportPreviewSummaryDto Summary { get; set; } = new();
    public List<ImportValidationErrorDto> Errors { get; set; } = new();
    public List<ImportValidationErrorDto> Warnings { get; set; } = new();
    public List<ImportItemPreviewDto> PreviewItems { get; set; } = new();
    public DateTimeOffset ExpiresAt { get; set; }
}

public class CurriculumImportSessionDto
{
    public string PreviewToken { get; set; } = string.Empty;
    public string ActorId { get; set; } = string.Empty;
    public string ActorEmail { get; set; } = string.Empty;
    public string FileHashSha256 { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileFormat { get; set; } = string.Empty;
    public CurriculumImportBatchDto Batch { get; set; } = new();
    public CurriculumImportPreviewResponseDto PreviewResponse { get; set; } = new();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
}

#endregion

#region Confirm DTOs

public class CurriculumImportConfirmRequestDto
{
    public string PreviewToken { get; set; } = string.Empty;
    public string? AuditNote { get; set; }
    public bool DryRun { get; set; } = false;
}

public class CurriculumImportConfirmSummaryDto
{
    public int TotalProcessed { get; set; }
    public int Inserted { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public int Failed { get; set; }
}

public class CurriculumImportEntityCountsDto
{
    public int Subjects { get; set; }
    public int Chapters { get; set; }
    public int Lessons { get; set; }
    public int Questions { get; set; }
}

public class CurriculumImportConfirmResponseDto
{
    public bool Success { get; set; } = true;
    public string PreviewToken { get; set; } = string.Empty;
    public string ActorId { get; set; } = string.Empty;
    public DateTimeOffset ConfirmedAt { get; set; } = DateTimeOffset.UtcNow;
    public string AuditLogId { get; set; } = string.Empty;
    public CurriculumImportConfirmSummaryDto Summary { get; set; } = new();
    public CurriculumImportEntityCountsDto EntityCounts { get; set; } = new();
    public string Message { get; set; } = string.Empty;
    public bool IsDryRun { get; set; } = false;
    public string? Provenance { get; set; }
}

#endregion
