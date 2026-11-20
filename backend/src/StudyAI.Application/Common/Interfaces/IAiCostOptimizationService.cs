using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IAiCostOptimizationService
{
    Task<AiCostOptimizationDto> GetCostAndOptimizationAsync(int days = 30, CancellationToken cancellationToken = default);
}

