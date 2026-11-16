using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface ISystemHealthService
{
    Task<SystemHealthReportDto> GetSystemHealthAsync(CancellationToken cancellationToken = default);
}

