namespace StudyAI.Models;

/// <summary>
/// P01: Canonical grade level entity (e.g. Code = "10", "11", "12").
/// Grade is stored as explicit catalog data, never parsed from subject codes.
/// </summary>
public class GradeLevel
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string Status { get; set; } = "draft"; // draft, in-review, approved, published, archived, changes-requested
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Curriculum> Curricula { get; set; } = new List<Curriculum>();
}

/// <summary>
/// P01: Generic subject identity independent of grade level (e.g. MATH, HIST, BIO).
/// Coexists with legacy ContentSubject during the compatibility transition.
/// </summary>
public class CatalogSubject
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "draft";
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Curriculum> Curricula { get; set; } = new List<Curriculum>();
}

/// <summary>
/// P01: Binds a GradeLevel and a generic CatalogSubject to a curriculum framework and academic year range.
/// </summary>
public class Curriculum
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string GradeLevelId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Framework { get; set; } = string.Empty;
    public int? AcademicYearFrom { get; set; }
    public int? AcademicYearTo { get; set; }
    public string Status { get; set; } = "draft";
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceLicense { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public GradeLevel? GradeLevel { get; set; }
    public CatalogSubject? Subject { get; set; }
    public ICollection<CurriculumEdition> Editions { get; set; } = new List<CurriculumEdition>();
}

/// <summary>
/// P01: Publisher / textbook series catalog (e.g. Kết Nối Tri Thức, Chân Trời Sáng Tạo, Cánh Diều).
/// </summary>
public class TextbookSeries
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "draft";
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceLicense { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<CurriculumEdition> Editions { get; set; } = new List<CurriculumEdition>();
}

/// <summary>
/// P01: Binds a Curriculum to an optional TextbookSeries, volume, version, and publication year.
/// TextbookSeriesId is nullable so standards-only editions are valid.
/// </summary>
public class CurriculumEdition
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string CurriculumId { get; set; } = string.Empty;
    public string? TextbookSeriesId { get; set; }
    public string EditionName { get; set; } = string.Empty;
    public string? Volume { get; set; }
    public string? Version { get; set; }
    public int? PublicationYear { get; set; }
    public string Status { get; set; } = "draft";
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceLicense { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Curriculum? Curriculum { get; set; }
    public TextbookSeries? TextbookSeries { get; set; }
}
