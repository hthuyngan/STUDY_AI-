
namespace StudyAI.Features.Admin;

public interface ILearningDataConsistencyService
{
    Task<DataConsistencyReportDto> ScanDataConsistencyAsync(CancellationToken cancellationToken = default);

    Task<DataConsistencyRepairReportDto> RepairDataConsistencyAsync(
        string adminUserId,
        DataConsistencyRepairRequestDto request,
        CancellationToken cancellationToken = default);
}