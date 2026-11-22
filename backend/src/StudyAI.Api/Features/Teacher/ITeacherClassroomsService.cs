using System.Text.Json.Nodes;

namespace StudyAI.Features.Teacher;

public record DeleteClassroomResultDto(bool IsArchived, string? Message);

public class ClassActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
}

public interface ITeacherClassroomsService
{
    Task<List<ClassroomDto>> ListClassroomsAsync(string userId, string userRole, string? teacherId = null, CancellationToken cancellationToken = default);
    Task<ClassroomDto> CreateClassroomAsync(string userId, CreateClassroomRequestDto dto, CancellationToken cancellationToken = default);
    Task<ClassroomDto> GetClassroomAsync(string userId, string userRole, string id, CancellationToken cancellationToken = default);
    Task<ClassroomDto> UpdateClassroomAsync(string userId, string userRole, string id, UpdateClassroomRequestDto dto, CancellationToken cancellationToken = default);
    Task<DeleteClassroomResultDto> DeleteClassroomAsync(string userId, string userRole, string id, CancellationToken cancellationToken = default);
    Task<List<ClassActivityDto>> GetClassActivitiesAsync(string userId, string userRole, string id, CancellationToken cancellationToken = default);
    Task<ClassActivityDto> AddClassActivityAsync(string userId, string userRole, string id, JsonObject payload, CancellationToken cancellationToken = default);
}