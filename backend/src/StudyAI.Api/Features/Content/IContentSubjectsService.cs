
namespace StudyAI.Features.Content;

public interface IContentSubjectsService
{
    Task<ContentSubjectListResponseDto> ListSubjectsAsync(string? search = null, string? grade = null, bool? isActive = null, CancellationToken ct = default);
    Task<object> GetSubjectDetailAsync(string subjectId, CancellationToken ct = default);
    Task<ContentSubjectItemDto> CreateSubjectAsync(CreateSubjectRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<ContentSubjectItemDto> UpdateSubjectAsync(string subjectId, UpdateSubjectRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<bool> DeleteSubjectAsync(string subjectId, string currentUserId, CancellationToken ct = default);
}