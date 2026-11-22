namespace StudyAI.Application.Common.Authorization;

public static class Permissions
{
    public const string UsersRead = "users.read";
    public const string UsersWrite = "users.write";
    public const string UsersChangeRole = "users.change_role";
    public const string SettingsManage = "settings.manage";
    public const string AuditRead = "audit.read";
    public const string ContentRead = "content.read";
    public const string ContentCreate = "content.create";
    public const string ContentUpdate = "content.update";
    public const string ContentSubmit = "content.submit";
    public const string ContentReview = "content.review";
    public const string ContentPublish = "content.publish";
    public const string ContentRollback = "content.rollback";
    public const string ContentArchive = "content.archive";
    public const string ClassroomsRead = "classrooms.read";
    public const string ClassroomsManage = "classrooms.manage";
    public const string AssignmentsManage = "assignments.manage";
    public const string SubmissionsGrade = "submissions.grade";
    public const string LearningReadOwn = "learning.read_own";
    public const string LearningUpdateOwn = "learning.update_own";
    public const string AiTutorUse = "ai_tutor.use";
}
