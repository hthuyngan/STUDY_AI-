using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Admin.AuditLogs;

public interface IAdminAuditService
{
    Task<AdminAuditLogsResponseDto> GetAuditLogsAsync(string? action = null, string? targetId = null, int page = 1, int pageSize = 20, CancellationToken ct = default);
}
