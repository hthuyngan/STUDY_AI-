using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IIntelligentExamService
{
    Task<PracticeSessionResponseDto> GenerateMatrixExamAsync(
        string userId,
        ExamMatrixRequestDto request,
        CancellationToken cancellationToken = default);

    Task<ExamReviewAnalyticsDto> GetExamReviewAnalyticsAsync(
        string userId,
        string sessionId,
        CancellationToken cancellationToken = default);
}

