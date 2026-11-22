
namespace StudyAI.Features.Admin;

public interface IAiQualityEvaluationService
{
    Task<AiQualityBenchmarkReportDto> RunBenchmarkSuiteAsync(CancellationToken cancellationToken = default);
    Task<AiQualityBenchmarkReportDto> GetLatestBenchmarkReportAsync(CancellationToken cancellationToken = default);
}
