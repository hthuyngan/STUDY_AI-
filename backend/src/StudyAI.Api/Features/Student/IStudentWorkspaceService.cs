namespace StudyAI.Features.Student;

public interface IStudentWorkspaceService
{
    Task<List<StudentMistakeItemDto>> GetMistakesAsync(string userId, CancellationToken ct = default);
    Task ResolveMistakeAsync(string userId, int responseId, CancellationToken ct = default);
    Task<LearnerClassroomSummaryDto> JoinClassroomByCodeAsync(string userId, string code, CancellationToken ct = default);
    Task<List<LearnerClassroomSummaryDto>> GetMyClassroomsAsync(string userId, CancellationToken ct = default);
}
