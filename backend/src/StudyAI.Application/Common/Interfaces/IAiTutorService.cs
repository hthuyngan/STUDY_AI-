using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IAiTutorService
{
    Task<List<AiConversationSummaryDto>> GetUserConversationsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<AiConversationDetailDto?> GetConversationDetailAsync(
        string userId,
        string conversationId,
        CancellationToken cancellationToken = default);

    Task<AiConversationDetailDto> CreateConversationAsync(
        string userId,
        string userRole,
        CreateAiConversationRequestDto request,
        CancellationToken cancellationToken = default);

    Task<bool> UpdateConversationTitleAsync(
        string userId,
        string conversationId,
        string newTitle,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteConversationAsync(
        string userId,
        string conversationId,
        CancellationToken cancellationToken = default);

    Task<SendAiMessageResponseDto> SendMessageAsync(
        string userId,
        string userRole,
        string conversationId,
        SendAiMessageRequestDto request,
        CancellationToken cancellationToken = default);
}
