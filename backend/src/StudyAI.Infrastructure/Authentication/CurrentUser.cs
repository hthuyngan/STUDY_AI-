using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using StudyAI.Application.Common.Authorization;

namespace StudyAI.Infrastructure.Authentication;

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public string? UserId => User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    public string? Role => User?.FindFirst(ClaimTypes.Role)?.Value?.ToLowerInvariant();

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public bool HasPermission(string permission)
    {
        if (!IsAuthenticated || string.IsNullOrWhiteSpace(Role)) return false;
        return RolePermissionMap.HasPermission(Role, permission);
    }

    public bool IsInRole(string role)
    {
        if (!IsAuthenticated || string.IsNullOrWhiteSpace(Role)) return false;
        return string.Equals(Role, role, StringComparison.OrdinalIgnoreCase);
    }
}
