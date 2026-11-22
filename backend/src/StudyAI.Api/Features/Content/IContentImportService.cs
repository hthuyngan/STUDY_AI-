using System.Text.Json.Nodes;

namespace StudyAI.Features.Content;

public interface IContentImportService
{
    Task<object> DryRunCurriculumImportAsync(JsonObject? body = null, CancellationToken ct = default);
    Task<object> ApplyCurriculumImportAsync(JsonObject? body, string currentUserId, CancellationToken ct = default);
    Task<object> AuditAndCleanupTestCurriculumAsync(bool dryRun = true, string? currentUserId = null, CancellationToken ct = default);
}