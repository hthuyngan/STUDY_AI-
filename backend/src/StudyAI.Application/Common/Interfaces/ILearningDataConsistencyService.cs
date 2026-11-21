using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface ILearningDataConsistencyService
{
    Task<DataConsistencyReportDto> ScanDataConsistencyAsync(CancellationToken cancellationToken = default);

    Task<DataConsistencyRepairReportDto> RepairDataConsistencyAsync(
        string adminUserId,
        DataConsistencyRepairRequestDto request,
        CancellationToken cancellationToken = default);
}
