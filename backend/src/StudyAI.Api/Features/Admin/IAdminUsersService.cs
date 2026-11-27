
namespace StudyAI.Features.Admin;

public interface IAdminUsersService
{
    Task<AdminUsersResponseDto> ListUsersAsync(string? role, string? status, string? search, int page, int pageSize, bool includeDeleted, string? sortBy = null, string? sortOrder = null, CancellationToken ct = default);
    Task<AdminUserDetailDto> GetUserDetailAsync(string userId, bool includeDeleted, CancellationToken ct = default);
    Task<CreateUserResponseDto> CreateUserAsync(CreateUserRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<AdminUserDetailDto> UpdateUserAsync(string userId, UpdateUserRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<AdminUserDto> UpdateUserRoleAsync(string userId, UpdateRoleRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<AdminUserDto> UpdateUserStatusAsync(string userId, UpdateStatusRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<int> RevokeUserSessionsAsync(string userId, string currentUserId, CancellationToken ct = default);
    Task<ResetPasswordResponseDto> ResetUserPasswordAsync(string userId, ResetPasswordRequestDto? req, string currentUserId, CancellationToken ct = default);
    Task<bool> DeleteUserAsync(string userId, string currentUserId, CancellationToken ct = default);
    object GetRoles();
}