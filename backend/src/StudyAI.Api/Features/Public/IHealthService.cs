namespace StudyAI.Features.Public;

public interface IHealthService
{
    Task<bool> CheckDatabaseHealthAsync(CancellationToken ct = default);
}