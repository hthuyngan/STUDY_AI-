namespace StudyAI.Common.Utilities;

public interface IAuditWriter
{
    Task WriteStaffAuditAsync(
        string action,
        string targetType,
        string? targetId = null,
        string? beforeState = null,
        string? afterState = null,
        CancellationToken cancellationToken = default);
}
