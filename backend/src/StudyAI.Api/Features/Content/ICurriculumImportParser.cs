
namespace StudyAI.Features.Content;

public interface ICurriculumImportParser
{
    Task<CurriculumImportBatchDto> ParseAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default);
    Task<CurriculumImportBatchDto> ParseJsonAsync(Stream stream, string fileName, CancellationToken cancellationToken = default);
    Task<CurriculumImportBatchDto> ParseCsvAsync(Stream stream, string fileName, CancellationToken cancellationToken = default);
    Task<CurriculumImportBatchDto> ParseXlsxAsync(Stream stream, string fileName, CancellationToken cancellationToken = default);
}
