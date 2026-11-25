using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Student;

[ApiController]
[Route("api/v1/curriculum")]
[AllowAnonymous]
public class StudentCurriculumController : ControllerBase
{
    private readonly ILearnerCurriculumService _curriculumService;

    public StudentCurriculumController(ILearnerCurriculumService curriculumService)
    {
        _curriculumService = curriculumService;
    }

    private string? CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");

    private bool IsStaffOrAuthorized => User?.Identity?.IsAuthenticated == true &&
        (User.IsInRole("admin") || User.IsInRole("content") || User.IsInRole("content_admin") || User.IsInRole("teacher") || User.HasClaim("permission", "content.approve"));

    [HttpGet("subjects")]
    public async Task<IActionResult> GetSubjects([FromQuery] string? grade = null, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        var result = await _curriculumService.GetSubjectsAsync(grade, search, ct);
        return Ok(result);
    }

    [HttpGet("subjects/{subjectId}")]
    public async Task<IActionResult> GetSubjectDetail(string subjectId, CancellationToken ct = default)
    {
        try
        {
            var result = await _curriculumService.GetSubjectDetailAsync(subjectId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("subjects/{subjectId}/chapters")]
    public async Task<IActionResult> GetSubjectChapters(string subjectId, CancellationToken ct = default)
    {
        try
        {
            var result = await _curriculumService.GetSubjectChaptersAsync(subjectId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("chapters/{chapterId}")]
    public async Task<IActionResult> GetChapterDetail(string chapterId, CancellationToken ct = default)
    {
        try
        {
            var result = await _curriculumService.GetChapterDetailAsync(chapterId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("editions/{editionId}/chapters")]
    public async Task<IActionResult> GetEditionChapters(string editionId, CancellationToken ct = default)
    {
        try { return Ok(await _curriculumService.GetEditionChaptersAsync(editionId, ct)); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("topics/{topicId}")]
    public async Task<IActionResult> GetTopicDetail(string topicId, CancellationToken ct = default)
    {
        try
        {
            var result = await _curriculumService.GetTopicDetailAsync(topicId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("lessons/{lessonId}/videos")]
    public async Task<IActionResult> GetLessonVideos(string lessonId, CancellationToken ct = default)
    {
        try
        {
            var result = await _curriculumService.GetLessonVideosAsync(lessonId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("lessons/{lessonId}")]
    public async Task<IActionResult> GetLessonDetail(string lessonId, CancellationToken ct = default)
    {
        try
        {
            var result = await _curriculumService.GetLessonDetailAsync(lessonId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("lessons/{lessonId}/questions")]
    public async Task<IActionResult> GetLessonQuestions(string lessonId, CancellationToken ct = default)
    {
        try
        {
            var result = await _curriculumService.GetLessonQuestionsAsync(lessonId, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("lessons/{lessonId}/questions/{questionId}/check")]
    public async Task<IActionResult> CheckQuestionAnswer(
        string lessonId,
        string questionId,
        [FromBody] CheckAnswerRequestDto req,
        CancellationToken ct = default)
    {
        try
        {
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "anon";
            var result = await _curriculumService.CheckQuestionAnswerAsync(lessonId, questionId, req, CurrentUserId, clientIp, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ValidationException ex) when (ex.Message.Contains("quá 3 lần"))
        {
            return StatusCode(429, new { message = ex.Message, retryAfterSeconds = 120 });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("materials")]
    public async Task<IActionResult> GetMaterials(
        [FromQuery] string? category = null,
        [FromQuery] string? subjectId = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await _curriculumService.GetMaterialsAsync(category, subjectId, search, ct);
        return Ok(result);
    }

    [HttpGet("question-bank")]
    public async Task<IActionResult> GetQuestionBank(
        [FromQuery] string? subjectId = null,
        [FromQuery] string? chapterId = null,
        [FromQuery] string? lessonId = null,
        [FromQuery] string? grade = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? type = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await _curriculumService.GetQuestionBankAsync(subjectId, chapterId, lessonId, grade, difficulty, type, search, page, pageSize, IsStaffOrAuthorized, ct);
        return Ok(result);
    }

    [HttpGet("question-bank/statistics")]
    public async Task<IActionResult> GetQuestionBankStats(
        [FromQuery] string? subjectId = null,
        [FromQuery] string? grade = null,
        CancellationToken ct = default)
    {
        var result = await _curriculumService.GetQuestionBankStatsAsync(subjectId, grade, ct);
        return Ok(result);
    }

    [HttpGet("question-bank/{questionId}")]
    public async Task<IActionResult> GetQuestionBankDetail(string questionId, CancellationToken ct = default)
    {
        try
        {
            var result = await _curriculumService.GetQuestionBankDetailAsync(questionId, IsStaffOrAuthorized, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
