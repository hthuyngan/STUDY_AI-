using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public class ImportValidationResult
{
    public List<ImportValidationErrorDto> Errors { get; set; } = new();
    public List<ImportValidationErrorDto> Warnings { get; set; } = new();
    public List<ImportItemPreviewDto> Previews { get; set; } = new();
    public ImportPreviewSummaryDto Summary { get; set; } = new();
    public bool IsValid => Errors.Count == 0 && Summary.ConflictCount == 0;
}

public interface ICurriculumImportValidator
{
    Task<ImportValidationResult> ValidateBatchAsync(CurriculumImportBatchDto batch, CancellationToken cancellationToken = default);
    bool ValidateKaTeX(string text, out string? errorMessage);
    string SanitizeText(string text);
}

