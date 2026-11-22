using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Admin.Operations;

namespace StudyAI.Api.Features.Admin;

[Authorize(Roles = "admin")]
[ApiController]
[Route("api/v1/admin/operations")]
public class AdminOperationsController : ControllerBase
{
    private readonly IAdminOperationsService _operationsService;

    public AdminOperationsController(IAdminOperationsService operationsService)
    {
        _operationsService = operationsService;
    }

    [HttpGet("health")]
    public async Task<ActionResult<SystemHealthReportDto>> GetSystemHealth(CancellationToken cancellationToken)
    {
        var result = await _operationsService.GetSystemHealthAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("benchmark/run")]
    public async Task<ActionResult<AiQualityBenchmarkReportDto>> RunBenchmark(CancellationToken cancellationToken)
    {
        var result = await _operationsService.RunBenchmarkSuiteAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("benchmark/latest")]
    public async Task<ActionResult<AiQualityBenchmarkReportDto>> GetLatestBenchmark(CancellationToken cancellationToken)
    {
        var result = await _operationsService.GetLatestBenchmarkReportAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("ai-cost")]
    public async Task<ActionResult<AiCostOptimizationDto>> GetAiCost([FromQuery] int days = 30, CancellationToken cancellationToken = default)
    {
        var result = await _operationsService.GetCostAndOptimizationAsync(days, cancellationToken);
        return Ok(result);
    }

    [HttpGet("content-quality")]
    public async Task<ActionResult<ContentQualityAuditReportDto>> GetContentQuality(CancellationToken cancellationToken)
    {
        var result = await _operationsService.ScanContentQualityAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("data-consistency")]
    public async Task<ActionResult<DataConsistencyReportDto>> GetDataConsistency(CancellationToken cancellationToken)
    {
        var result = await _operationsService.ScanDataConsistencyAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("data-consistency/repair")]
    public async Task<ActionResult<DataConsistencyRepairReportDto>> RepairDataConsistency(
        [FromBody] DataConsistencyRepairRequestDto request,
        CancellationToken cancellationToken)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "admin";
        var result = await _operationsService.RepairDataConsistencyAsync(adminUserId, request, cancellationToken);
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
        var result = await _operationsService.GetAuditLogsAsync(action, targetType, page, pageSize, cancellationToken);
        return Ok(result);
    }
}
