using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Admin.Operations;

public interface IAdminOperationsService
{
    Task<SystemHealthReportDto> GetSystemHealthAsync(CancellationToken cancellationToken = default);
    Task<AiQualityBenchmarkReportDto> RunBenchmarkSuiteAsync(CancellationToken cancellationToken = default);
    Task<AiQualityBenchmarkReportDto> GetLatestBenchmarkReportAsync(CancellationToken cancellationToken = default);
    Task<AiCostOptimizationDto> GetCostAndOptimizationAsync(int days = 30, CancellationToken cancellationToken = default);
    Task<ContentQualityAuditReportDto> ScanContentQualityAsync(CancellationToken cancellationToken = default);
    Task<DataConsistencyReportDto> ScanDataConsistencyAsync(CancellationToken cancellationToken = default);
    Task<DataConsistencyRepairReportDto> RepairDataConsistencyAsync(string adminUserId, DataConsistencyRepairRequestDto request, CancellationToken cancellationToken = default);
    Task<StaffAuditLogListDto> GetAuditLogsAsync(string? action, string? targetType, int page = 1, int pageSize = 20, CancellationToken cancellationToken = default);
}
