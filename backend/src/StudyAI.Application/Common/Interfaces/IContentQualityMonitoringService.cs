using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IContentQualityMonitoringService
{
    Task<ContentQualityAuditReportDto> ScanContentQualityAsync(CancellationToken cancellationToken = default);
}

