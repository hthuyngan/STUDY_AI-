
namespace StudyAI.Features.Student;

public interface ISpacedRepetitionService
{
    Task<SpacedRepetitionQueueDto> GetUserSpacedRepetitionQueueAsync(
        string userId,
        string subjectId,
        CancellationToken cancellationToken = default);

    Task<SpacedRepetitionReviewResultDto> RecordReviewOutcomeAsync(
        string userId,
        SpacedRepetitionReviewRequestDto request,
        CancellationToken cancellationToken = default);

    (double newEasinessFactor, int newIntervalDays) CalculateSm2NextInterval(
        int repetitionNumber,
        double currentEasinessFactor,
        int qualityScore);
}
