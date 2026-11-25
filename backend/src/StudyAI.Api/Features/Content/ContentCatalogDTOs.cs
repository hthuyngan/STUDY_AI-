using System.ComponentModel.DataAnnotations;

namespace StudyAI.Features.Content;

public record CatalogPagedResponseDto<T>(
    List<T> Items,
    int Total,
    int Page,
    int PageSize);

public record CatalogListQueryDto(
    string? Search = null,
    string? Status = null,
    string? Sort = null,
    string? Direction = "asc",
    int Page = 1,
    int PageSize = 20,
    string? GradeLevelId = null,
    string? SubjectId = null,
    string? CurriculumId = null,
    string? TextbookSeriesId = null,
    int? PublicationYear = null);

public class CatalogStatusActionDto
{
    public CatalogStatusActionDto() { }

    public CatalogStatusActionDto(string? rowVersion, string? reason = null)
    {
        RowVersion = rowVersion ?? string.Empty;
        Reason = reason;
    }

    public string RowVersion { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

// ─── GradeLevel ──────────────────────────────────────────────────────────────

public record GradeLevelDto(
    string Id,
    string Code,
    string Name,
    int OrderIndex,
    string Status,
    string RowVersion,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public class CreateGradeLevelRequestDto
{
    [Required, MaxLength(32)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    public int OrderIndex { get; set; } = 0;
}

public class UpdateGradeLevelRequestDto
{
    [MaxLength(32)]
    public string? Code { get; set; }

    [MaxLength(128)]
    public string? Name { get; set; }

    public int? OrderIndex { get; set; }

    [Required]
    public string RowVersion { get; set; } = string.Empty;
}

// ─── CatalogSubject ──────────────────────────────────────────────────────────

public record CatalogSubjectDto(
    string Id,
    string Code,
    string Name,
    string? Description,
    string Status,
    string RowVersion,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public class CreateCatalogSubjectRequestDto
{
    [Required, MaxLength(32)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }
}

public class UpdateCatalogSubjectRequestDto
{
    [MaxLength(32)]
    public string? Code { get; set; }

    [MaxLength(128)]
    public string? Name { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    public string RowVersion { get; set; } = string.Empty;
}

// ─── Curriculum ──────────────────────────────────────────────────────────────

public record CurriculumDto(
    string Id,
    string Code,
    string GradeLevelId,
    string GradeLevelName,
    string SubjectId,
    string SubjectName,
    string Name,
    string Framework,
    int? AcademicYearFrom,
    int? AcademicYearTo,
    string Status,
    string? SourceName,
    string? SourceUrl,
    string? SourceLicense,
    string RowVersion,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public class CreateCurriculumRequestDto
{
    [Required, MaxLength(64)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(64)]
    public string GradeLevelId { get; set; } = string.Empty;

    [Required, MaxLength(64)]
    public string SubjectId { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string Framework { get; set; } = string.Empty;

    public int? AcademicYearFrom { get; set; }
    public int? AcademicYearTo { get; set; }
    public bool ClearAcademicYearFrom { get; set; }
    public bool ClearAcademicYearTo { get; set; }

    [MaxLength(256)]
    public string? SourceName { get; set; }

    [MaxLength(512)]
    public string? SourceUrl { get; set; }

    [MaxLength(256)]
    public string? SourceLicense { get; set; }
}

public class UpdateCurriculumRequestDto
{
    [MaxLength(64)]
    public string? Code { get; set; }

    [MaxLength(64)]
    public string? GradeLevelId { get; set; }

    [MaxLength(64)]
    public string? SubjectId { get; set; }

    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(128)]
    public string? Framework { get; set; }

    public int? AcademicYearFrom { get; set; }
    public int? AcademicYearTo { get; set; }
    public bool ClearAcademicYearFrom { get; set; }
    public bool ClearAcademicYearTo { get; set; }

    [MaxLength(256)]
    public string? SourceName { get; set; }

    [MaxLength(512)]
    public string? SourceUrl { get; set; }

    [MaxLength(256)]
    public string? SourceLicense { get; set; }

    [Required]
    public string RowVersion { get; set; } = string.Empty;
}

// ─── TextbookSeries ──────────────────────────────────────────────────────────

public record TextbookSeriesDto(
    string Id,
    string Code,
    string Name,
    string Publisher,
    string? Description,
    string Status,
    string? SourceName,
    string? SourceUrl,
    string? SourceLicense,
    string RowVersion,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public class CreateTextbookSeriesRequestDto
{
    [Required, MaxLength(64)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Publisher { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(256)]
    public string? SourceName { get; set; }

    [MaxLength(512)]
    public string? SourceUrl { get; set; }

    [MaxLength(256)]
    public string? SourceLicense { get; set; }
}

public class UpdateTextbookSeriesRequestDto
{
    [MaxLength(64)]
    public string? Code { get; set; }

    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(200)]
    public string? Publisher { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(256)]
    public string? SourceName { get; set; }

    [MaxLength(512)]
    public string? SourceUrl { get; set; }

    [MaxLength(256)]
    public string? SourceLicense { get; set; }

    [Required]
    public string RowVersion { get; set; } = string.Empty;
}

// ─── CurriculumEdition ───────────────────────────────────────────────────────

public record CurriculumEditionDto(
    string Id,
    string Code,
    string CurriculumId,
    string CurriculumName,
    string? TextbookSeriesId,
    string? TextbookSeriesName,
    string EditionName,
    string? Volume,
    string? Version,
    int? PublicationYear,
    string Status,
    string? SourceName,
    string? SourceUrl,
    string? SourceLicense,
    string RowVersion,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public class CreateCurriculumEditionRequestDto
{
    [Required, MaxLength(64)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(64)]
    public string CurriculumId { get; set; } = string.Empty;

    [MaxLength(64)]
    public string? TextbookSeriesId { get; set; }

    [Required, MaxLength(200)]
    public string EditionName { get; set; } = string.Empty;

    [MaxLength(64)]
    public string? Volume { get; set; }

    [MaxLength(64)]
    public string? Version { get; set; }

    public int? PublicationYear { get; set; }

    [MaxLength(256)]
    public string? SourceName { get; set; }

    [MaxLength(512)]
    public string? SourceUrl { get; set; }

    [MaxLength(256)]
    public string? SourceLicense { get; set; }
}

public class UpdateCurriculumEditionRequestDto
{
    [MaxLength(64)]
    public string? Code { get; set; }

    [MaxLength(64)]
    public string? CurriculumId { get; set; }

    [MaxLength(64)]
    public string? TextbookSeriesId { get; set; }

    [MaxLength(200)]
    public string? EditionName { get; set; }

    [MaxLength(64)]
    public string? Volume { get; set; }

    [MaxLength(64)]
    public string? Version { get; set; }

    public int? PublicationYear { get; set; }
    public bool ClearPublicationYear { get; set; }

    [MaxLength(256)]
    public string? SourceName { get; set; }

    [MaxLength(512)]
    public string? SourceUrl { get; set; }

    [MaxLength(256)]
    public string? SourceLicense { get; set; }

    [Required]
    public string RowVersion { get; set; } = string.Empty;
}

// ─── Compatibility Mapping Report ────────────────────────────────────────────

public record LegacySubjectMappingCandidateDto(
    string LegacySubjectId,
    string LegacyCode,
    string LegacyName,
    string StoredGrade,
    string CandidateGradeCode,
    string CandidateSubjectCode,
    string CandidateSubjectName,
    string MappingStatus,
    string? ConflictReason,
    string? MatchedGradeLevelId,
    string? MatchedCatalogSubjectId,
    string? MatchedCurriculumId);

public record CompatibilityMappingReportDto(
    int LegacySubjectCount,
    int MappedCount,
    int UnmappedCount,
    int ConflictCount,
    List<LegacySubjectMappingCandidateDto> Candidates);
