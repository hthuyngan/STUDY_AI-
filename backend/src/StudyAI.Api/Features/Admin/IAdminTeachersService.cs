
namespace StudyAI.Features.Admin;

public interface IAdminTeachersService
{
    Task<List<AdminTeacherDto>> GetTeachersAsync(string? search = null, string? status = null, string? subject = null, CancellationToken ct = default);
    Task<TeacherKpisDto> GetTeacherKpisAsync(CancellationToken ct = default);
    Task<AdminTeacherDto> CreateTeacherAsync(SaveTeacherRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<AdminTeacherDto> UpdateTeacherAsync(string id, SaveTeacherRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<bool> DeleteTeacherAsync(string id, string currentUserId, CancellationToken ct = default);
}