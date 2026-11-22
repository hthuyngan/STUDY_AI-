
namespace StudyAI.Features.Admin;

public interface IContentQualityMonitoringService
{
    Task<ContentQualityAuditReportDto> ScanContentQualityAsync(CancellationToken cancellationToken = default);
}
