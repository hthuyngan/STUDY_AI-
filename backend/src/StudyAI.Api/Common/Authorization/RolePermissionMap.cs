namespace StudyAI.Common.Authorization;

public static class RolePermissionMap
{
    private static readonly Dictionary<string, HashSet<string>> Map = new(StringComparer.OrdinalIgnoreCase)
    {
        ["admin"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Permissions.UsersRead, Permissions.UsersWrite, Permissions.UsersChangeRole,
            Permissions.SettingsManage, Permissions.AuditRead,
            Permissions.ContentRead, Permissions.ContentCreate, Permissions.ContentUpdate,
            Permissions.ContentSubmit, Permissions.ContentReview, Permissions.ContentPublish,
            Permissions.ContentRollback, Permissions.ContentArchive,
            Permissions.ClassroomsRead, Permissions.ClassroomsManage,
            Permissions.AssignmentsManage, Permissions.SubmissionsGrade,
            Permissions.LearningReadOwn, Permissions.LearningUpdateOwn,
            Permissions.AiTutorUse
        },
        ["content"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Permissions.ContentRead, Permissions.ContentCreate, Permissions.ContentUpdate,
            Permissions.ContentSubmit, Permissions.ContentReview, Permissions.ContentPublish,
            Permissions.ContentRollback, Permissions.ContentArchive,
            Permissions.AuditRead
        },
        ["teacher"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Permissions.ClassroomsRead, Permissions.ClassroomsManage,
            Permissions.AssignmentsManage, Permissions.SubmissionsGrade,
            Permissions.ContentRead, Permissions.LearningReadOwn, Permissions.AiTutorUse
        },
        ["learner"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Permissions.LearningReadOwn, Permissions.LearningUpdateOwn,
            Permissions.ContentRead, Permissions.AiTutorUse
        },
        ["support"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Permissions.UsersRead, Permissions.AuditRead, Permissions.ContentRead
        }
    };

    public static bool HasPermission(string? role, string permission)
    {
        if (string.IsNullOrWhiteSpace(role)) return false;
        return Map.TryGetValue(role, out var permissions) && permissions.Contains(permission);
    }

    public static IReadOnlyCollection<string> GetPermissionsForRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return Array.Empty<string>();
        return Map.TryGetValue(role, out var permissions) ? permissions : Array.Empty<string>();
    }
}
