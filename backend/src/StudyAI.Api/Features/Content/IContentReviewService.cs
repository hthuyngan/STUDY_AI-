namespace StudyAI.Features.Content;

public interface IContentReviewService
{
    Task<List<object>> GetApprovalsAsync(string? status = "all", string? type = "all", string? search = null, CancellationToken ct = default);
    Task<List<object>> GetPublicationsAsync(string? search = null, string? type = "all", CancellationToken ct = default);
}