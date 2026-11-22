namespace StudyAI.Application.Features.Public.Health;

public interface IHealthService
{
    Task<bool> CheckDatabaseHealthAsync(CancellationToken ct = default);
}
