
namespace StudyAI.Features.Admin;

public interface IAdminSettingsService
{
    Task<OperationalSettingsDto> GetSettingsAsync(CancellationToken ct = default);
    Task<OperationalSettingsDto> UpdateSettingsAsync(OperationalSettingsDto req, string currentUserId, CancellationToken ct = default);
}