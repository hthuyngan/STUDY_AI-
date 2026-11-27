namespace StudyAI.Features.Content;

public interface IContentWorkspaceService
{
    Task<ContentWorkspaceDashboardDto> GetDashboardAsync(CancellationToken ct = default);
    Task<List<ContentMaterialDto>> GetMaterialsAsync(string? category = null, string? status = null, string? search = null, CancellationToken ct = default);
    Task<ContentMaterialDto> CreateMaterialAsync(CreateContentMaterialRequestDto req, string userId, CancellationToken ct = default);
    Task<ContentMaterialDto> UpdateMaterialStatusAsync(string id, string status, string userId, CancellationToken ct = default);
    Task<List<AiKnowledgeSourceDto>> GetKnowledgeSourcesAsync(CancellationToken ct = default);
    Task<AiKnowledgeSourceDto> RegisterAndSyncKnowledgeSourceAsync(RegisterAiKnowledgeSourceRequestDto req, string userId, CancellationToken ct = default);
    Task<AiKnowledgeSourceDto> SyncKnowledgeSourceAsync(string id, string userId, CancellationToken ct = default);
    Task<AiKnowledgeSourceDto> RevokeKnowledgeSourceAsync(string id, string userId, CancellationToken ct = default);
    Task<List<RetrievedKnowledgeChunkDto>> TestRetrieveKnowledgeAsync(string query, int topK = 5, CancellationToken ct = default);
    Task<List<ContentErrorReportDto>> GetErrorReportsAsync(string? status = null, string? classification = null, CancellationToken ct = default);
    Task<ContentErrorReportDto> CreateErrorReportAsync(CreateContentErrorReportRequestDto req, string userId, CancellationToken ct = default);
    Task<ContentErrorReportDto> UpdateErrorReportAsync(string id, UpdateContentErrorReportRequestDto req, string userId, CancellationToken ct = default);
}
