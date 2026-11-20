using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IAiLessonAuthoringService
{
    Task<LessonAuthoringOutlineResponseDto> GenerateLessonOutlineDraftAsync(
        string userId,
        LessonAuthoringOutlineRequestDto request,
        CancellationToken cancellationToken = default);

    Task<List<CheckpointQuestionDraftDto>> GenerateCheckpointQuestionsAsync(
        string userId,
        GenerateCheckpointQuestionsRequestDto request,
        CancellationToken cancellationToken = default);
}

