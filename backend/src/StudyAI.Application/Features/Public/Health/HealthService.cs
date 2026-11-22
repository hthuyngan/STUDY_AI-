using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;

namespace StudyAI.Application.Features.Public.Health;

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
