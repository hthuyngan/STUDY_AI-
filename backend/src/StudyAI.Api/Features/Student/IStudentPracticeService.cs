using System.Text.Json.Serialization;

namespace StudyAI.Features.Student;

public class QuestionCountDto
{
    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("availableQuestions")]
    public int AvailableQuestions { get; set; }
}

public class LeaderboardItemDto
{
    [JsonPropertyName("rank")]
    public int Rank { get; set; }

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("grade")]
    public string Grade { get; set; } = string.Empty;

    [JsonPropertyName("xp")]
    public int Xp { get; set; }

    [JsonPropertyName("streak")]
    public int Streak { get; set; }

    [JsonPropertyName("isCurrentUser")]
    public bool IsCurrentUser { get; set; }
}

public interface IStudentPracticeService
{
    Task<QuestionCountDto> GetQuestionCountAsync(
        string subjectId,
        string? chapterId,
        string? lessonId,
        string? difficulty,
        string? mode,
        string? grade,
        string userGrade,
        string? skillId = null,
        string? type = null,
        CancellationToken cancellationToken = default);

    Task<PracticeSessionResponseDto> CreateSessionAsync(
        string userId,
        string userGrade,
        CreatePracticeSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<PracticeSessionResponseDto> GetSessionAsync(
        string userId,
        string userRole,
        string sessionId,
        CancellationToken cancellationToken = default);

    Task SaveAnswerAsync(
        string userId,
        string userRole,
        string sessionId,
        SaveAnswerRequest request,
        CancellationToken cancellationToken = default);

    Task<CheckQuestionResponse> CheckSingleQuestionAsync(
        string userId,
        string userRole,
        string sessionId,
        CheckQuestionRequest request,
        CancellationToken cancellationToken = default);

    Task<PracticeResultDto> SubmitSessionAsync(
        string userId,
        string userRole,
        string sessionId,
        SubmitPracticeSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<PracticeResultDto> GetSessionResultAsync(
        string userId,
        string userRole,
        string sessionId,
        CancellationToken cancellationToken = default);

    Task<PracticeResultDto> GetResultByIdAsync(
        string userId,
        string userRole,
        string resultId,
        CancellationToken cancellationToken = default);

    Task<List<MistakeItemDto>> GetMistakesAsync(
        string userId,
        string? subjectId,
        CancellationToken cancellationToken = default);

    Task<ReviewMistakeResponse> ReviewMistakeAsync(
        string userId,
        string questionId,
        ReviewMistakeRequest request,
        CancellationToken cancellationToken = default);

    Task<LearnerDashboardStatsDto> GetDashboardStatsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<List<LeaderboardItemDto>> GetLeaderboardAsync(
        string userId,
        int limit = 10,
        CancellationToken cancellationToken = default);
}