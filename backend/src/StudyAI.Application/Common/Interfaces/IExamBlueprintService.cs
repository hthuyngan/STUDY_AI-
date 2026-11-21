using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IExamBlueprintService
{
    Task<List<ExamBlueprintDto>> GetAvailableBlueprintsAsync(
        string? subjectId = null,
        CancellationToken cancellationToken = default);

    Task<ExamBlueprintDto> GetBlueprintByIdAsync(
        string blueprintId,
        CancellationToken cancellationToken = default);
}

