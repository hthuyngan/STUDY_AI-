using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Api.Controllers;

[Authorize(Roles = "admin")]
[ApiController]
[Route("api/v1/admin/operations")]
public class LearningOperationsController : ControllerBase
{
    private readonly ISystemHealthService _systemHealthService;
    private readonly IAiQualityEvaluationService _aiQualityEvaluationService;
    private readonly IAiCostOptimizationService _aiCostOptimizationService;
    private readonly IContentQualityMonitoringService _contentQualityMonitoringService;
    private readonly ILearningDataConsistencyService _learningDataConsistencyService;
    private readonly IApplicationDbContext _db;

    public LearningOperationsController(
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

    [HttpGet("health")]
    public async Task<ActionResult<SystemHealthReportDto>> GetSystemHealth(CancellationToken cancellationToken)
    {
        var result = await _systemHealthService.GetSystemHealthAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("benchmark/run")]
    public async Task<ActionResult<AiQualityBenchmarkReportDto>> RunBenchmark(CancellationToken cancellationToken)
    {
        var result = await _aiQualityEvaluationService.RunBenchmarkSuiteAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("benchmark/latest")]
    public async Task<ActionResult<AiQualityBenchmarkReportDto>> GetLatestBenchmark(CancellationToken cancellationToken)
    {
        var result = await _aiQualityEvaluationService.GetLatestBenchmarkReportAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("ai-cost")]
    public async Task<ActionResult<AiCostOptimizationDto>> GetAiCost([FromQuery] int days = 30, CancellationToken cancellationToken = default)
    {
        var result = await _aiCostOptimizationService.GetCostAndOptimizationAsync(days, cancellationToken);
        return Ok(result);
    }

    [HttpGet("content-quality")]
    public async Task<ActionResult<ContentQualityAuditReportDto>> GetContentQuality(CancellationToken cancellationToken)
    {
        var result = await _contentQualityMonitoringService.ScanContentQualityAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("data-consistency")]
    public async Task<ActionResult<DataConsistencyReportDto>> GetDataConsistency(CancellationToken cancellationToken)
    {
        var result = await _learningDataConsistencyService.ScanDataConsistencyAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("data-consistency/repair")]
    public async Task<ActionResult<DataConsistencyRepairReportDto>> RepairDataConsistency(
        [FromBody] DataConsistencyRepairRequestDto request,
        CancellationToken cancellationToken)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "admin";
        var result = await _learningDataConsistencyService.RepairDataConsistencyAsync(adminUserId, request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("audit-logs")]
    public async Task<ActionResult<StaffAuditLogListDto>> GetAuditLogs(
        [FromQuery] string? action,
        [FromQuery] string? targetType,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
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

        return Ok(new StaffAuditLogListDto
        {
            TotalCount = totalCount,
            Logs = logs
        });
    }
}

