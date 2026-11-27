namespace StudyAI.Features.Teacher;

public interface ITeacherWorkspaceService
{
    Task<List<TeacherExamDto>> GetExamsAsync(string teacherUserId, bool isAdmin, string? classroomId = null, CancellationToken ct = default);
    Task<TeacherExamDto> CreateExamAsync(CreateTeacherExamRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default);
    Task<TeacherExamDto> UpdateExamStatusAsync(string examId, UpdateTeacherExamStatusRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default);
    Task<List<ClassroomMaterialDto>> GetMaterialsAsync(string teacherUserId, bool isAdmin, string? classroomId = null, CancellationToken ct = default);
    Task<ClassroomMaterialDto> CreateMaterialAsync(CreateClassroomMaterialRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default);
    Task<ClassroomMaterialDto> RevokeMaterialAsync(string materialId, string teacherUserId, bool isAdmin, CancellationToken ct = default);
    Task<List<ClassroomAnnouncementDto>> GetAnnouncementsAsync(string teacherUserId, bool isAdmin, string? classroomId = null, CancellationToken ct = default);
    Task<ClassroomAnnouncementDto> CreateAnnouncementAsync(CreateClassroomAnnouncementRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default);
    Task<List<TeacherScheduleItemDto>> GetScheduleAsync(string teacherUserId, bool isAdmin, CancellationToken ct = default);
    Task<TeacherAiAssistantResponseDto> RunAiAssistantAsync(TeacherAiAssistantRequestDto req, string teacherUserId, bool isAdmin, CancellationToken ct = default);
}
