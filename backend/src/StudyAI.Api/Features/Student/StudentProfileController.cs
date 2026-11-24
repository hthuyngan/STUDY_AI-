using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Common.Exceptions;

namespace StudyAI.Features.Student;

[Authorize]
[ApiController]
[Route("api/v1/me")]
public class StudentProfileController : ControllerBase
{
    private readonly ILearnerProfileService _profileService;
    private readonly IStudentNotesService _notesService;

    public StudentProfileController(
        ILearnerProfileService profileService,
        IStudentNotesService notesService)
    {
        _profileService = profileService;
        _notesService = notesService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");

    [HttpPost("sync/bootstrap")]
    public async Task<IActionResult> BootstrapSync([FromBody] BootstrapSyncRequestDto dto, CancellationToken ct = default)
    {
        var result = await _profileService.BootstrapSyncAsync(CurrentUserId, dto, ct);
        return Ok(result);
    }

    private static bool TryGetProperty(JsonElement element, string propertyName, out string? value)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in element.EnumerateObject())
            {
                if (string.Equals(prop.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    value = prop.Value.ValueKind == JsonValueKind.String ? prop.Value.GetString() : prop.Value.ToString();
                    return true;
                }
            }
        }
        value = null;
        return false;
    }

    [HttpGet("bookmarks")]
    public async Task<IActionResult> GetBookmarks(
        [FromQuery] string? lessonId,
        [FromQuery] string? subjectId,
        [FromQuery] string? search,
        CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(lessonId))
        {
            var bookmarks = await _notesService.GetBookmarksAsync(CurrentUserId, lessonId, subjectId, search, ct);
            return Ok(bookmarks);
        }

        var legacy = await _profileService.GetBookmarksAsync(CurrentUserId, ct);
        var sectionBookmarks = await _notesService.GetBookmarksAsync(CurrentUserId, null, subjectId, search, ct);
        if (sectionBookmarks.Count > 0 && legacy.Count == 0)
        {
            return Ok(sectionBookmarks);
        }
        return Ok(legacy);
    }

    [HttpPost("bookmarks")]
    public async Task<IActionResult> AddBookmark([FromBody] JsonElement rawBody, CancellationToken ct = default)
    {
        TryGetProperty(rawBody, "lessonId", out var lessonId);
        TryGetProperty(rawBody, "sectionId", out var sectionId);
        TryGetProperty(rawBody, "itemId", out var itemId);
        TryGetProperty(rawBody, "title", out var title);
        if (string.IsNullOrWhiteSpace(title))
        {
            TryGetProperty(rawBody, "sectionTitle", out title);
        }
        TryGetProperty(rawBody, "subjectId", out var subjectId);
        TryGetProperty(rawBody, "lessonTitle", out var lessonTitle);
        TryGetProperty(rawBody, "subjectName", out var subjectName);

        var targetLessonId = lessonId ?? itemId;
        if (string.IsNullOrWhiteSpace(targetLessonId))
        {
            throw new ValidationException("LessonId", "Mã bài học hoặc itemId không được để trống.");
        }

        if (!string.IsNullOrWhiteSpace(sectionId))
        {
            var toggleDto = new ToggleBookmarkRequestDto
            {
                LessonId = targetLessonId,
                SectionId = sectionId,
                SectionTitle = title,
                LessonTitle = lessonTitle,
                SubjectId = subjectId,
                SubjectName = subjectName
            };

            var result = await _notesService.ToggleBookmarkAsync(CurrentUserId, toggleDto, ct);
            return Ok(result);
        }
        else
        {
            var success = await _profileService.AddBookmarkAsync(CurrentUserId, new CreateBookmarkRequest(targetLessonId, title, subjectId), ct);
            return Ok(new { success, itemId = targetLessonId });
        }
    }

    [HttpDelete("bookmarks/{itemId}")]
    public async Task<IActionResult> RemoveBookmark(string itemId, [FromQuery] string? sectionId, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(sectionId))
        {
            await _notesService.RemoveBookmarkAsync(CurrentUserId, itemId, sectionId, ct);
        }
        await _profileService.RemoveBookmarkAsync(CurrentUserId, itemId, ct);
        return Ok(new { success = true, itemId });
    }
}
