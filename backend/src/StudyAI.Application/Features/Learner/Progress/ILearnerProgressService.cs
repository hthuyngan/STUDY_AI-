using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Learner.Progress;

public interface ILearnerProgressService
{
    Task<List<LessonProgressResponseDto>> ListUserProgressAsync(string requestingUserId, string targetUserId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<LessonProgressResponseDto> GetSingleProgressAsync(string requestingUserId, string targetUserId, bool isAdmin, string lessonId, CancellationToken cancellationToken = default);
    Task<LessonProgressResponseDto> PutLessonProgressAsync(string requestingUserId, string targetUserId, bool isAdmin, string lessonId, LessonProgressCreateOrUpdateDto dto, CancellationToken cancellationToken = default);
}
