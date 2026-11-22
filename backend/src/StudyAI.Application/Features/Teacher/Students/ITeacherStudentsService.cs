using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Teacher.Students;

public interface ITeacherStudentsService
{
    Task<List<ClassroomStudentDto>> GetClassroomStudentsAsync(string userId, string userRole, string classroomId, CancellationToken cancellationToken = default);
    Task<ClassroomStudentDto> EnrollStudentAsync(string userId, string userRole, string classroomId, EnrollStudentRequestDto dto, CancellationToken cancellationToken = default);
    Task RemoveStudentAsync(string userId, string userRole, string classroomId, string studentId, CancellationToken cancellationToken = default);
    Task<ClassroomStudentDto> TransferStudentAsync(string userId, string userRole, string targetClassroomId, TransferStudentRequestDto dto, CancellationToken cancellationToken = default);
}
