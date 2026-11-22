
namespace StudyAI.Features.Admin;

public interface IAiCostOptimizationService
{
    Task<AiCostOptimizationDto> GetCostAndOptimizationAsync(int days = 30, CancellationToken cancellationToken = default);
}
