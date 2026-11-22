
namespace StudyAI.Features.Admin;

public interface IAdminAuditService
{
    Task<AdminAuditLogsResponseDto> GetAuditLogsAsync(string? action = null, string? targetId = null, int page = 1, int pageSize = 20, CancellationToken ct = default);
}