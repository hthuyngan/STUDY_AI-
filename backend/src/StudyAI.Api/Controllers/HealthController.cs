using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Api.Controllers;

[ApiController]
public class HealthController : ControllerBase
{
    private readonly StudyAIDbContext _db;
    private readonly ILogger<HealthController> _logger;

    public HealthController(StudyAIDbContext db, ILogger<HealthController> logger)
    {
        _db = db;
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
    public async Task<IActionResult> DatabaseHealth()
    {
        try
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT 1");
            return Ok(new
            {
                status = "ok",
                database = "connected"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database probe failed");
            return StatusCode(503, new
            {
                status = "unhealthy",
                database = "disconnected",
                detail = "Database service is unreachable or unready."
            });
        }
    }
}
