using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StudyAI.Features.Admin;

[ApiController]
[Route("api/v1/admin/teachers")]
[Authorize(Policy = "AdminOnly")]
public class AdminTeachersController : ControllerBase
{
    private readonly IAdminTeachersService _teachersService;

    public AdminTeachersController(IAdminTeachersService teachersService)
    {
        _teachersService = teachersService;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;

    [HttpGet]
    public async Task<IActionResult> GetTeachers(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? subject = null,
        CancellationToken ct = default)
    {
        var result = await _teachersService.GetTeachersAsync(search, status, subject, ct);
        return Ok(result);
    }

    [HttpGet("kpis")]
    public async Task<IActionResult> GetTeacherKpis(CancellationToken ct = default)
    {
        var result = await _teachersService.GetTeacherKpisAsync(ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTeacher([FromBody] SaveTeacherRequestDto req, CancellationToken ct = default)
    {
        var result = await _teachersService.CreateTeacherAsync(req, CurrentUserId, ct);
        return StatusCode(201, result);
    }

    [HttpPatch("{id}")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTeacher(string id, [FromBody] SaveTeacherRequestDto req, CancellationToken ct = default)
    {
        var result = await _teachersService.UpdateTeacherAsync(id, req, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTeacher(string id, CancellationToken ct = default)
    {
        await _teachersService.DeleteTeacherAsync(id, CurrentUserId, ct);
        return Ok(new { message = "Đã vô hiệu hóa tài khoản giáo viên thành công." });
    }
}