using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IAiQualityEvaluationService
{
    Task<AiQualityBenchmarkReportDto> RunBenchmarkSuiteAsync(CancellationToken cancellationToken = default);
    Task<AiQualityBenchmarkReportDto> GetLatestBenchmarkReportAsync(CancellationToken cancellationToken = default);
}

