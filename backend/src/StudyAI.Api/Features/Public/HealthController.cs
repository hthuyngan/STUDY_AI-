using Microsoft.AspNetCore.Mvc;
using StudyAI.Data;

namespace StudyAI.Features.Public;

[ApiController]
public class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;
    private readonly IHostEnvironment _env;
    private readonly IConfiguration _configuration;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        IHealthService healthService,
        IHostEnvironment env,
        IConfiguration configuration,
        ILogger<HealthController> logger)
    {
        _healthService = healthService;
        _env = env;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("health")]
    [HttpGet("api/v1/health")]
    public IActionResult Health()
    {
        if (_env.IsDevelopment() || _env.IsEnvironment("Testing"))
        {
            var dbMeta = DatabaseSafetyGuard.GetSafeDatabaseMetadata(_configuration.GetConnectionString("DefaultConnection"));
            return Ok(new
            {
                status = "ok",
                app = "STUDY_AI",
                version = "1.0.0",
                environment = _env.EnvironmentName,
                databaseName = dbMeta.DatabaseName,
                dataSource = dbMeta.DataSource
            });
        }

        return Ok(new
        {
            status = "ok",
            app = "STUDY_AI",
            version = "1.0.0"
        });
    }

    [HttpGet("health/db")]
    [HttpGet("api/v1/health/db")]
    public async Task<IActionResult> DatabaseHealth(CancellationToken ct = default)
    {
        bool isConnected = await _healthService.CheckDatabaseHealthAsync(ct);
        bool showDiagnostics = _env.IsDevelopment() || _env.IsEnvironment("Testing");
        var dbMeta = showDiagnostics
            ? DatabaseSafetyGuard.GetSafeDatabaseMetadata(_configuration.GetConnectionString("DefaultConnection"))
            : null;

        if (isConnected)
        {
            if (showDiagnostics && dbMeta != null)
            {
                return Ok(new
                {
                    status = "ok",
                    database = "connected",
                    environment = _env.EnvironmentName,
                    databaseName = dbMeta.DatabaseName,
                    dataSource = dbMeta.DataSource
                });
            }

            return Ok(new
            {
                status = "ok",
                database = "connected"
            });
        }

        _logger.LogError("Database probe failed");
        if (showDiagnostics && dbMeta != null)
        {
            return StatusCode(503, new
            {
                status = "unhealthy",
                database = "disconnected",
                environment = _env.EnvironmentName,
                databaseName = dbMeta.DatabaseName,
                dataSource = dbMeta.DataSource,
                detail = "Database service is unreachable or unready."
            });
        }

        return StatusCode(503, new
        {
            status = "unhealthy",
            database = "disconnected",
            detail = "Database service is unreachable or unready."
        });
    }
}