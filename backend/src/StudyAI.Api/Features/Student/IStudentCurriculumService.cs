
namespace StudyAI.Features.Student;

public interface IStudentCurriculumService
{
    Task<List<LearnerSubjectDto>> GetSubjectsAsync(string? grade = null, string? search = null, CancellationToken ct = default);
    Task<LearnerSubjectWithChaptersDto> GetSubjectDetailAsync(string subjectId, CancellationToken ct = default);
    Task<List<LearnerChapterDto>> GetSubjectChaptersAsync(string subjectId, CancellationToken ct = default);
    Task<List<LearnerChapterDto>> GetEditionChaptersAsync(string editionId, CancellationToken ct = default);
    Task<LearnerChapterDto> GetChapterDetailAsync(string chapterId, CancellationToken ct = default);
    Task<LearnerTopicDto> GetTopicDetailAsync(string topicId, CancellationToken ct = default);
    Task<List<LearnerVideoDto>> GetLessonVideosAsync(string lessonId, CancellationToken ct = default);
    Task<LearnerLessonDetailDto> GetLessonDetailAsync(string lessonId, CancellationToken ct = default);
    Task<List<LearnerQuestionDto>> GetLessonQuestionsAsync(string lessonId, CancellationToken ct = default);
    Task<CheckAnswerResponseDto> CheckQuestionAnswerAsync(string lessonId, string questionId, CheckAnswerRequestDto req, string? currentUserId, string clientIp, CancellationToken ct = default);
    Task<List<object>> GetMaterialsAsync(string? category = null, string? subjectId = null, string? search = null, CancellationToken ct = default);
    Task<object> GetQuestionBankAsync(string? subjectId = null, string? chapterId = null, string? lessonId = null, string? grade = null, string? difficulty = null, string? type = null, string? search = null, int page = 1, int pageSize = 50, bool isStaffOrAuthorized = false, CancellationToken ct = default);
    Task<object> GetQuestionBankStatsAsync(string? subjectId = null, string? grade = null, CancellationToken ct = default);
    Task<object> GetQuestionBankDetailAsync(string questionId, bool isStaffOrAuthorized = false, CancellationToken ct = default);
}
