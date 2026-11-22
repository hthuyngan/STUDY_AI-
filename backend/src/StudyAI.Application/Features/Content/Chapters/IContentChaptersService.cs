using StudyAI.Application.DTOs;

namespace StudyAI.Application.Features.Content.Chapters;

public interface IContentChaptersService
{
    Task<object> ListChaptersAsync(string? subjectId = null, string? search = null, CancellationToken ct = default);
    Task<ContentChapterItemDto> GetChapterDetailAsync(string chapterId, CancellationToken ct = default);
    Task<ContentChapterItemDto> CreateChapterAsync(CreateChapterRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<ContentChapterItemDto> UpdateChapterAsync(string chapterId, UpdateChapterRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<bool> ReorderChaptersAsync(ReorderChaptersRequestDto req, string currentUserId, CancellationToken ct = default);
    Task<bool> DeleteChapterAsync(string chapterId, string currentUserId, CancellationToken ct = default);
}
