namespace StudyAI.Features.Content;

public interface IContentCatalogService
{
    // GradeLevels
    Task<CatalogPagedResponseDto<GradeLevelDto>> ListGradeLevelsAsync(CatalogListQueryDto query, CancellationToken ct = default);
    Task<GradeLevelDto> GetGradeLevelAsync(string id, CancellationToken ct = default);
    Task<GradeLevelDto> CreateGradeLevelAsync(CreateGradeLevelRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<GradeLevelDto> UpdateGradeLevelAsync(string id, UpdateGradeLevelRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<GradeLevelDto> ArchiveGradeLevelAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);
    Task<GradeLevelDto> ReactivateGradeLevelAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);

    // CatalogSubjects
    Task<CatalogPagedResponseDto<CatalogSubjectDto>> ListSubjectsAsync(CatalogListQueryDto query, CancellationToken ct = default);
    Task<CatalogSubjectDto> GetSubjectAsync(string id, CancellationToken ct = default);
    Task<CatalogSubjectDto> CreateSubjectAsync(CreateCatalogSubjectRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<CatalogSubjectDto> UpdateSubjectAsync(string id, UpdateCatalogSubjectRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<CatalogSubjectDto> ArchiveSubjectAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);
    Task<CatalogSubjectDto> ReactivateSubjectAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);

    // Curricula
    Task<CatalogPagedResponseDto<CurriculumDto>> ListCurriculaAsync(CatalogListQueryDto query, CancellationToken ct = default);
    Task<CurriculumDto> GetCurriculumAsync(string id, CancellationToken ct = default);
    Task<CurriculumDto> CreateCurriculumAsync(CreateCurriculumRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<CurriculumDto> UpdateCurriculumAsync(string id, UpdateCurriculumRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<CurriculumDto> ArchiveCurriculumAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);
    Task<CurriculumDto> ReactivateCurriculumAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);
    Task<CurriculumDto> PublishCurriculumAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);

    // TextbookSeries
    Task<CatalogPagedResponseDto<TextbookSeriesDto>> ListTextbookSeriesAsync(CatalogListQueryDto query, CancellationToken ct = default);
    Task<TextbookSeriesDto> GetTextbookSeriesAsync(string id, CancellationToken ct = default);
    Task<TextbookSeriesDto> CreateTextbookSeriesAsync(CreateTextbookSeriesRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<TextbookSeriesDto> UpdateTextbookSeriesAsync(string id, UpdateTextbookSeriesRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<TextbookSeriesDto> ArchiveTextbookSeriesAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);
    Task<TextbookSeriesDto> ReactivateTextbookSeriesAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);

    // CurriculumEditions
    Task<CatalogPagedResponseDto<CurriculumEditionDto>> ListEditionsAsync(CatalogListQueryDto query, CancellationToken ct = default);
    Task<CurriculumEditionDto> GetEditionAsync(string id, CancellationToken ct = default);
    Task<CurriculumEditionDto> CreateEditionAsync(CreateCurriculumEditionRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<CurriculumEditionDto> UpdateEditionAsync(string id, UpdateCurriculumEditionRequestDto req, string actorUserId, CancellationToken ct = default);
    Task<CurriculumEditionDto> ArchiveEditionAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);
    Task<CurriculumEditionDto> ReactivateEditionAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);
    Task<CurriculumEditionDto> PublishEditionAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default);

    // Read-only Compatibility Mapping Report
    Task<CompatibilityMappingReportDto> GetCompatibilityMappingReportAsync(CancellationToken ct = default);
}
