using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Public;

public class HealthService : IHealthService
{
    private readonly IApplicationDbContext _db;

    public HealthService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<bool> CheckDatabaseHealthAsync(CancellationToken ct = default)
    {
        try
        {
            return await _db.Database.CanConnectAsync(ct);
        }
        catch
        {
            return false;
        }
    }
}