
namespace StudyAI.Features.Admin;

public interface ISystemHealthService
{
    Task<SystemHealthReportDto> GetSystemHealthAsync(CancellationToken cancellationToken = default);
}
