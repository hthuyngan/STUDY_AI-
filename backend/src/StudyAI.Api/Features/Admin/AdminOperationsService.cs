using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Admin;

public class AdminOperationsService : IAdminOperationsService
{
    private readonly ISystemHealthService _systemHealthService;
    private readonly IAiQualityEvaluationService _aiQualityEvaluationService;
    private readonly IAiCostOptimizationService _aiCostOptimizationService;
    private readonly IContentQualityMonitoringService _contentQualityMonitoringService;
    private readonly ILearningDataConsistencyService _learningDataConsistencyService;
    private readonly IApplicationDbContext _db;

    public AdminOperationsService(
        ISystemHealthService systemHealthService,
        IAiQualityEvaluationService aiQualityEvaluationService,
        IAiCostOptimizationService aiCostOptimizationService,
        IContentQualityMonitoringService contentQualityMonitoringService,
        ILearningDataConsistencyService learningDataConsistencyService,
        IApplicationDbContext db)
    {
        _systemHealthService = systemHealthService;
        _aiQualityEvaluationService = aiQualityEvaluationService;
        _aiCostOptimizationService = aiCostOptimizationService;
        _contentQualityMonitoringService = contentQualityMonitoringService;
        _learningDataConsistencyService = learningDataConsistencyService;
        _db = db;
    }

    public Task<SystemHealthReportDto> GetSystemHealthAsync(CancellationToken cancellationToken = default) =>
        _systemHealthService.GetSystemHealthAsync(cancellationToken);

    public Task<AiQualityBenchmarkReportDto> RunBenchmarkSuiteAsync(CancellationToken cancellationToken = default) =>
        _aiQualityEvaluationService.RunBenchmarkSuiteAsync(cancellationToken);

    public Task<AiQualityBenchmarkReportDto> GetLatestBenchmarkReportAsync(CancellationToken cancellationToken = default) =>
        _aiQualityEvaluationService.GetLatestBenchmarkReportAsync(cancellationToken);

    public Task<AiCostOptimizationDto> GetCostAndOptimizationAsync(int days = 30, CancellationToken cancellationToken = default) =>
        _aiCostOptimizationService.GetCostAndOptimizationAsync(days, cancellationToken);

    public Task<ContentQualityAuditReportDto> ScanContentQualityAsync(CancellationToken cancellationToken = default) =>
        _contentQualityMonitoringService.ScanContentQualityAsync(cancellationToken);

    public Task<DataConsistencyReportDto> ScanDataConsistencyAsync(CancellationToken cancellationToken = default) =>
        _learningDataConsistencyService.ScanDataConsistencyAsync(cancellationToken);

    public Task<DataConsistencyRepairReportDto> RepairDataConsistencyAsync(string adminUserId, DataConsistencyRepairRequestDto request, CancellationToken cancellationToken = default) =>
        _learningDataConsistencyService.RepairDataConsistencyAsync(adminUserId, request, cancellationToken);

    public async Task<StaffAuditLogListDto> GetAuditLogsAsync(
        string? action,
        string? targetType,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.StaffAuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(l => l.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(targetType))
        {
            query = query.Where(l => l.TargetType == targetType);
        }

        int totalCount = await query.CountAsync(cancellationToken);

        var logs = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new StaffAuditLogItemDto
            {
                Id = l.Id,
                ActorUserId = l.ActorUserId,
                Action = l.Action,
                TargetType = l.TargetType,
                TargetId = l.TargetId,
                Payload = l.Payload,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new StaffAuditLogListDto
        {
            TotalCount = totalCount,
            Logs = logs
        };
    }
}