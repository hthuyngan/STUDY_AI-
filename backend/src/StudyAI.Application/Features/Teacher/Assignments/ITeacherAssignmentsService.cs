using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Teacher.Assignments;

public record DeleteAssignmentResultDto(bool IsArchived, string? Message);

public interface ITeacherAssignmentsService
{
    Task<List<AssignmentDto>> ListAssignmentsAsync(string userId, string userRole, string? classroomId = null, CancellationToken cancellationToken = default);
    Task<AssignmentDto> GetAssignmentAsync(string userId, string userRole, string id, CancellationToken cancellationToken = default);
    Task<AssignmentDto> CreateClassroomAssignmentAsync(string userId, string userRole, string classroomId, CreateAssignmentRequestDto dto, CancellationToken cancellationToken = default);
    Task<AssignmentDto> UpdateAssignmentAsync(string userId, string userRole, string id, UpdateAssignmentRequestDto dto, CancellationToken cancellationToken = default);
    Task<DeleteAssignmentResultDto> DeleteAssignmentAsync(string userId, string userRole, string id, CancellationToken cancellationToken = default);
    Task<List<AssignmentDto>> GetClassroomAssignmentsAsync(string userId, string userRole, string classroomId, CancellationToken cancellationToken = default);
}
