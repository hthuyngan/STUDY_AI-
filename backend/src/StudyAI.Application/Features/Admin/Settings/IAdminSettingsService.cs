using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Admin.Settings;

public interface IAdminSettingsService
{
    Task<OperationalSettingsDto> GetSettingsAsync(CancellationToken ct = default);
    Task<OperationalSettingsDto> UpdateSettingsAsync(OperationalSettingsDto req, string currentUserId, CancellationToken ct = default);
}
