using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IAiHintService
{
    Task<HintResponseDto> GetHintAsync(
        string userId,
        string questionId,
        int hintLevel,
        string? sessionId = null,
        string? mode = null,
        CancellationToken cancellationToken = default);
}

