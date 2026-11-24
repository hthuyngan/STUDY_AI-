using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Student;

[Authorize]
[ApiController]
[Route("api/v1/me/notes")]
public class StudentNotesController : ControllerBase
{
    private readonly IStudentNotesService _notesService;

    public StudentNotesController(IStudentNotesService notesService)
    {
        _notesService = notesService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");

    [HttpGet]
    public async Task<IActionResult> GetNotes(
        [FromQuery] string? lessonId,
        [FromQuery] string? subjectId,
        [FromQuery] string? search,
        CancellationToken ct = default)
    {
        var notes = await _notesService.GetNotesAsync(CurrentUserId, lessonId, subjectId, search, ct);
        return Ok(notes);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetNoteById(string id, CancellationToken ct = default)
    {
        var note = await _notesService.GetNoteByIdAsync(CurrentUserId, id, ct);
        if (note == null)
        {
            return NotFound(new { message = $"Không tìm thấy ghi chú với mã '{id}'." });
        }
        return Ok(note);
    }

    [HttpPost]
    public async Task<IActionResult> CreateNote([FromBody] CreateStudyNoteRequestDto dto, CancellationToken ct = default)
    {
        var created = await _notesService.CreateNoteAsync(CurrentUserId, dto, ct);
        return CreatedAtAction(nameof(GetNoteById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNote(string id, [FromBody] UpdateStudyNoteRequestDto dto, CancellationToken ct = default)
    {
        var updated = await _notesService.UpdateNoteAsync(CurrentUserId, id, dto, ct);
        if (updated == null)
        {
            return NotFound(new { message = $"Không tìm thấy ghi chú với mã '{id}'." });
        }
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNote(string id, CancellationToken ct = default)
    {
        var deleted = await _notesService.DeleteNoteAsync(CurrentUserId, id, ct);
        if (!deleted)
        {
            return NotFound(new { message = $"Không tìm thấy ghi chú với mã '{id}'." });
        }
        return Ok(new { success = true, id });
    }
}
