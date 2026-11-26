using System.Text.Json;

namespace StudyAI.Features.Content;

public record LessonContentBlockDto(
    string Id,
    string LessonId,
    string BlockType,
    int SchemaVersion,
    JsonElement Payload,
    int OrderIndex,
    string Status,
    string RowVersion,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record LessonContentBlockInputDto(
    string? Id,
    string BlockType,
    int SchemaVersion,
    JsonElement Payload,
    int? OrderIndex);

public record CurriculumNodeRefDto(
    string Id,
    string CurriculumId,
    string Code,
    string Title,
    string? Description,
    string? CognitiveLevel,
    string Status);

public record PrerequisiteLessonDto(
    string LessonId,
    string? Code,
    string Title,
    string ChapterId,
    string Status);

public record LessonCompositionDto(
    string LessonId,
    string Title,
    string Status,
    string? CurriculumId,
    string RowVersion,
    List<LessonContentBlockDto> Blocks,
    List<CurriculumNodeRefDto> Objectives,
    List<CurriculumNodeRefDto> KnowledgeUnits,
    List<CurriculumNodeRefDto> Skills,
    List<PrerequisiteLessonDto> Prerequisites);

public record ReplaceLessonCompositionRequestDto(
    string? RowVersion,
    List<LessonContentBlockInputDto> Blocks,
    List<string> ObjectiveIds,
    List<string> KnowledgeUnitIds,
    List<string> SkillIds,
    List<string> PrerequisiteLessonIds,
    string? Reason);

public record CreateCurriculumNodeRequestDto(
    string Code,
    string Title,
    string? Description,
    string? CognitiveLevel,
    string? SourceName,
    string? SourceUrl,
    string? SourceLicense);

public record LessonRevisionDto(
    string Id,
    string ContentId,
    int Version,
    string Status,
    string Title,
    int SnapshotSchemaVersion,
    string? AuthorId,
    string? CreatedBy,
    string? Reason,
    string? SourceRevisionId,
    DateTimeOffset CreatedAt);

public record LessonRevisionPageDto(
    List<LessonRevisionDto> Items,
    int Page,
    int PageSize,
    int TotalCount);

public record RollbackLessonRevisionRequestDto(
    string? RowVersion,
    string? Reason);
