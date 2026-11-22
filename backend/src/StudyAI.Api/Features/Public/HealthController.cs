using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Features.Public.Health;

namespace StudyAI.Api.Features.Public;

[ApiController]
public class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;
    private readonly ILogger<HealthController> _logger;

    public HealthController(IHealthService healthService, ILogger<HealthController> logger)
    {
        _healthService = healthService;
        _logger = logger;
    }

    [HttpGet("health")]
    [HttpGet("api/v1/health")]
    public IActionResult Health()
    {
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
        if (isConnected)
        {
            return Ok(new
            {
                status = "ok",
                database = "connected"
            });
        }

        _logger.LogError("Database probe failed");
        return StatusCode(503, new
        {
            status = "unhealthy",
            database = "disconnected",
            detail = "Database service is unreachable or unready."
        });
    }
}
