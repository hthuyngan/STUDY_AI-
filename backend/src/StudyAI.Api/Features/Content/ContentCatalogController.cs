using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Content;

[ApiController]
[Route("api/v1/content/catalog")]
[Authorize(Policy = "ContentAuthor")]
public class ContentCatalogController : ControllerBase
{
    private readonly IContentCatalogService _catalog;

    public ContentCatalogController(IContentCatalogService catalog)
    {
        _catalog = catalog;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "staff";

    // ─── GradeLevels ─────────────────────────────────────────────────────────

    [HttpGet("grades")]
    public async Task<IActionResult> ListGrades(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sort = null,
        [FromQuery] string? direction = "asc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await _catalog.ListGradeLevelsAsync(new CatalogListQueryDto(search, status, sort, direction, page, pageSize), ct));

    [HttpGet("grades/{id}")]
    public async Task<IActionResult> GetGrade(string id, CancellationToken ct = default)
        => Ok(await _catalog.GetGradeLevelAsync(id, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("grades")]
    public async Task<IActionResult> CreateGrade([FromBody] CreateGradeLevelRequestDto req, CancellationToken ct = default)
        => StatusCode(201, await _catalog.CreateGradeLevelAsync(req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPut("grades/{id}")]
    [HttpPatch("grades/{id}")]
    public async Task<IActionResult> UpdateGrade(string id, [FromBody] UpdateGradeLevelRequestDto req, CancellationToken ct = default)
        => Ok(await _catalog.UpdateGradeLevelAsync(id, req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("grades/{id}/archive")]
    public async Task<IActionResult> ArchiveGrade(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ArchiveGradeLevelAsync(id, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("grades/{id}/reactivate")]
    public async Task<IActionResult> ReactivateGrade(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ReactivateGradeLevelAsync(id, action, CurrentUserId, ct));

    // ─── Subjects ────────────────────────────────────────────────────────────

    [HttpGet("subjects")]
    public async Task<IActionResult> ListSubjects(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sort = null,
        [FromQuery] string? direction = "asc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await _catalog.ListSubjectsAsync(new CatalogListQueryDto(search, status, sort, direction, page, pageSize), ct));

    [HttpGet("subjects/{id}")]
    public async Task<IActionResult> GetSubject(string id, CancellationToken ct = default)
        => Ok(await _catalog.GetSubjectAsync(id, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("subjects")]
    public async Task<IActionResult> CreateSubject([FromBody] CreateCatalogSubjectRequestDto req, CancellationToken ct = default)
        => StatusCode(201, await _catalog.CreateSubjectAsync(req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPut("subjects/{id}")]
    [HttpPatch("subjects/{id}")]
    public async Task<IActionResult> UpdateSubject(string id, [FromBody] UpdateCatalogSubjectRequestDto req, CancellationToken ct = default)
        => Ok(await _catalog.UpdateSubjectAsync(id, req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("subjects/{id}/archive")]
    public async Task<IActionResult> ArchiveSubject(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ArchiveSubjectAsync(id, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("subjects/{id}/reactivate")]
    public async Task<IActionResult> ReactivateSubject(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ReactivateSubjectAsync(id, action, CurrentUserId, ct));

    // ─── Curricula ───────────────────────────────────────────────────────────

    [HttpGet("curricula")]
    public async Task<IActionResult> ListCurricula(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sort = null,
        [FromQuery] string? direction = "asc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? gradeLevelId = null,
        [FromQuery] string? subjectId = null,
        CancellationToken ct = default)
        => Ok(await _catalog.ListCurriculaAsync(new CatalogListQueryDto(search, status, sort, direction, page, pageSize, gradeLevelId, subjectId), ct));

    [HttpGet("curricula/{id}")]
    public async Task<IActionResult> GetCurriculum(string id, CancellationToken ct = default)
        => Ok(await _catalog.GetCurriculumAsync(id, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("curricula")]
    public async Task<IActionResult> CreateCurriculum([FromBody] CreateCurriculumRequestDto req, CancellationToken ct = default)
        => StatusCode(201, await _catalog.CreateCurriculumAsync(req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPut("curricula/{id}")]
    [HttpPatch("curricula/{id}")]
    public async Task<IActionResult> UpdateCurriculum(string id, [FromBody] UpdateCurriculumRequestDto req, CancellationToken ct = default)
        => Ok(await _catalog.UpdateCurriculumAsync(id, req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("curricula/{id}/archive")]
    public async Task<IActionResult> ArchiveCurriculum(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ArchiveCurriculumAsync(id, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("curricula/{id}/reactivate")]
    public async Task<IActionResult> ReactivateCurriculum(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ReactivateCurriculumAsync(id, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("curricula/{id}/publish")]
    public async Task<IActionResult> PublishCurriculum(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.PublishCurriculumAsync(id, action, CurrentUserId, ct));

    // ─── TextbookSeries ──────────────────────────────────────────────────────

    [HttpGet("textbook-series")]
    public async Task<IActionResult> ListTextbookSeries(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sort = null,
        [FromQuery] string? direction = "asc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await _catalog.ListTextbookSeriesAsync(new CatalogListQueryDto(search, status, sort, direction, page, pageSize), ct));

    [HttpGet("textbook-series/{id}")]
    public async Task<IActionResult> GetTextbookSeries(string id, CancellationToken ct = default)
        => Ok(await _catalog.GetTextbookSeriesAsync(id, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("textbook-series")]
    public async Task<IActionResult> CreateTextbookSeries([FromBody] CreateTextbookSeriesRequestDto req, CancellationToken ct = default)
        => StatusCode(201, await _catalog.CreateTextbookSeriesAsync(req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPut("textbook-series/{id}")]
    [HttpPatch("textbook-series/{id}")]
    public async Task<IActionResult> UpdateTextbookSeries(string id, [FromBody] UpdateTextbookSeriesRequestDto req, CancellationToken ct = default)
        => Ok(await _catalog.UpdateTextbookSeriesAsync(id, req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("textbook-series/{id}/archive")]
    public async Task<IActionResult> ArchiveTextbookSeries(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ArchiveTextbookSeriesAsync(id, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("textbook-series/{id}/reactivate")]
    public async Task<IActionResult> ReactivateTextbookSeries(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ReactivateTextbookSeriesAsync(id, action, CurrentUserId, ct));

    // ─── CurriculumEditions ──────────────────────────────────────────────────

    [HttpGet("editions")]
    public async Task<IActionResult> ListEditions(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sort = null,
        [FromQuery] string? direction = "asc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? curriculumId = null,
        [FromQuery] string? textbookSeriesId = null,
        [FromQuery] int? publicationYear = null,
        CancellationToken ct = default)
        => Ok(await _catalog.ListEditionsAsync(
            new CatalogListQueryDto(search, status, sort, direction, page, pageSize, null, null, curriculumId, textbookSeriesId, publicationYear), ct));

    [HttpGet("editions/{id}")]
    public async Task<IActionResult> GetEdition(string id, CancellationToken ct = default)
        => Ok(await _catalog.GetEditionAsync(id, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("editions")]
    public async Task<IActionResult> CreateEdition([FromBody] CreateCurriculumEditionRequestDto req, CancellationToken ct = default)
        => StatusCode(201, await _catalog.CreateEditionAsync(req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPut("editions/{id}")]
    [HttpPatch("editions/{id}")]
    public async Task<IActionResult> UpdateEdition(string id, [FromBody] UpdateCurriculumEditionRequestDto req, CancellationToken ct = default)
        => Ok(await _catalog.UpdateEditionAsync(id, req, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("editions/{id}/archive")]
    public async Task<IActionResult> ArchiveEdition(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ArchiveEditionAsync(id, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("editions/{id}/reactivate")]
    public async Task<IActionResult> ReactivateEdition(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.ReactivateEditionAsync(id, action, CurrentUserId, ct));

    [Authorize(Policy = "ContentAdminOnly")]
    [HttpPost("editions/{id}/publish")]
    public async Task<IActionResult> PublishEdition(string id, [FromBody] CatalogStatusActionDto? action, CancellationToken ct = default)
        => Ok(await _catalog.PublishEditionAsync(id, action, CurrentUserId, ct));

    // ─── Read-Only Compatibility Mapping ─────────────────────────────────────

    [HttpGet("compatibility-mapping")]
    public async Task<IActionResult> GetCompatibilityMapping(CancellationToken ct = default)
        => Ok(await _catalog.GetCompatibilityMappingReportAsync(ct));
}
