
namespace StudyAI.Features.Student;

public interface IStudentProgressService
{
    Task<List<LessonProgressResponseDto>> ListUserProgressAsync(string requestingUserId, string targetUserId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<LessonProgressResponseDto> GetSingleProgressAsync(string requestingUserId, string targetUserId, bool isAdmin, string lessonId, CancellationToken cancellationToken = default);
    Task<LessonProgressResponseDto> PutLessonProgressAsync(string requestingUserId, string targetUserId, bool isAdmin, string lessonId, LessonProgressCreateOrUpdateDto dto, CancellationToken cancellationToken = default);
}