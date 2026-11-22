namespace StudyAI.Common.Authorization;

public interface ICurrentUser
{
    string? UserId { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
    bool HasPermission(string permission);
    bool IsInRole(string role);
}
