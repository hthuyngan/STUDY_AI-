using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Admin.Announcements;

public interface IAdminAnnouncementsService
{
    Task<List<AnnouncementDto>> GetAnnouncementsAsync(string status = "all", string audience = "all", string? search = null, CancellationToken ct = default);
    Task<AnnouncementDto> CreateAnnouncementAsync(SaveAnnouncementRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<AnnouncementDto> UpdateAnnouncementAsync(string id, SaveAnnouncementRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<bool> DeleteAnnouncementAsync(string id, string currentUserId, CancellationToken ct = default);
}
