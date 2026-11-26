using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Content;

[ApiController]
[Route("api/v1/content")]
[Authorize(Policy = "ContentAuthor")]
public class LessonCompositionController : ControllerBase
{
    private readonly ILessonCompositionService _compositionService;

    public LessonCompositionController(ILessonCompositionService compositionService)
    {
        _compositionService = compositionService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        "staff";

    [HttpGet("lessons/{lessonId}/composition")]
    public async Task<IActionResult> GetComposition(string lessonId, CancellationToken ct = default)
    {
        try
        {
            return Ok(await _compositionService.GetLessonCompositionAsync(lessonId, ct));
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPut("lessons/{lessonId}/composition")]
    public async Task<IActionResult> ReplaceComposition(
        string lessonId,
        [FromBody] ReplaceLessonCompositionRequestDto request,
        CancellationToken ct = default)
    {
        try
        {
            return Ok(await _compositionService.ReplaceLessonCompositionAsync(lessonId, request, CurrentUserId, ct));
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { detail = ex.Message }); }
    }

    [HttpGet("lessons/{lessonId}/revisions")]
    public async Task<IActionResult> GetRevisions(
        string lessonId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            return Ok(await _compositionService.GetRevisionsAsync(lessonId, page, pageSize, ct));
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPost("lessons/{lessonId}/revisions/{revisionId}/rollback")]
    public async Task<IActionResult> RollbackRevision(
        string lessonId,
        string revisionId,
        [FromBody] RollbackLessonRevisionRequestDto request,
        CancellationToken ct = default)
    {
        try
        {
            return Ok(await _compositionService.RollbackToRevisionAsync(lessonId, revisionId, request, CurrentUserId, ct));
        }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { detail = ex.Message }); }
    }

    [HttpGet("curricula/{curriculumId}/objectives")]
    public async Task<IActionResult> ListObjectives(string curriculumId, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        try { return Ok(await _compositionService.ListObjectivesAsync(curriculumId, search, ct)); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPost("curricula/{curriculumId}/objectives")]
    public async Task<IActionResult> CreateObjective(string curriculumId, [FromBody] CreateCurriculumNodeRequestDto request, CancellationToken ct = default)
    {
        try { return Ok(await _compositionService.CreateObjectiveAsync(curriculumId, request, CurrentUserId, ct)); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { detail = ex.Message }); }
    }

    [HttpGet("curricula/{curriculumId}/knowledge-units")]
    public async Task<IActionResult> ListKnowledgeUnits(string curriculumId, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        try { return Ok(await _compositionService.ListKnowledgeUnitsAsync(curriculumId, search, ct)); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPost("curricula/{curriculumId}/knowledge-units")]
    public async Task<IActionResult> CreateKnowledgeUnit(string curriculumId, [FromBody] CreateCurriculumNodeRequestDto request, CancellationToken ct = default)
    {
        try { return Ok(await _compositionService.CreateKnowledgeUnitAsync(curriculumId, request, CurrentUserId, ct)); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { detail = ex.Message }); }
    }

    [HttpGet("curricula/{curriculumId}/skills")]
    public async Task<IActionResult> ListSkills(string curriculumId, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        try { return Ok(await _compositionService.ListSkillsAsync(curriculumId, search, ct)); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }

    [HttpPost("curricula/{curriculumId}/skills")]
    public async Task<IActionResult> CreateSkill(string curriculumId, [FromBody] CreateCurriculumNodeRequestDto request, CancellationToken ct = default)
    {
        try { return Ok(await _compositionService.CreateSkillAsync(curriculumId, request, CurrentUserId, ct)); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
        catch (ValidationException ex) { return BadRequest(new { detail = ex.Message }); }
        catch (ConflictException ex) { return Conflict(new { detail = ex.Message }); }
    }

    [HttpGet("curricula/{curriculumId}/lessons")]
    public async Task<IActionResult> ListCurriculumLessons(
        string curriculumId,
        [FromQuery] string? excludeLessonId = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        try { return Ok(await _compositionService.ListCurriculumLessonsAsync(curriculumId, excludeLessonId, search, ct)); }
        catch (NotFoundException ex) { return NotFound(new { detail = ex.Message }); }
    }
}
