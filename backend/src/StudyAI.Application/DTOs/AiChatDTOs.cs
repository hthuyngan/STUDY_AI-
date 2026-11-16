namespace StudyAI.Application.DTOs;

public record CreateAiConversationRequestDto(
    string? Subject = null,
    string? Title = null,
    string? LessonId = null,
    string? AssistanceMode = null,
    string? LearningContextJson = null
)
{
    public CreateAiConversationRequestDto() : this(null, null, null, null, null) { }
}

public record UpdateAiConversationRequestDto(
    string Title = ""
)
{
    public UpdateAiConversationRequestDto() : this("") { }
}

public record SendAiMessageRequestDto(
    string Message = "",
    string? LessonId = null,
    string? AssistanceMode = null,
    string? LearningContextJson = null
)
{
    public SendAiMessageRequestDto() : this("", null, null, null) { }
}

public record AiMessageDto(
    string Id,
    string ConversationId,
    string Role,
    string Content,
    string? SuggestedActionsJson,
    string? LearningContextSnapshotJson,
    string? AssistanceMode,
    int? TokensUsed,
    DateTimeOffset CreatedAt
);

public record AiConversationSummaryDto(
    string Id,
    string UserId,
    string Title,
    string? Subject,
    string? LessonId,
    string? LessonTitle,
    string AssistanceMode,
    string? LearningContextJson,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    int MessageCount
);

public record AiConversationDetailDto(
    string Id,
    string UserId,
    string Title,
    string? Subject,
    string? LessonId,
    string? LessonTitle,
    string AssistanceMode,
    string? LearningContextJson,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    List<AiMessageDto> Messages
);

public record SendAiMessageResponseDto(
    AiMessageDto UserMessage,
    AiMessageDto AssistantMessage,
    List<string> SuggestedActions,
    string Provider,
    bool IsConfigured
);

public record QuickChatRequestDto(
    string? ConversationId = null,
    string Message = "",
    string? Subject = null,
    string? LessonId = null,
    string? Mode = null,
    object? LearningContext = null
)
{
    public QuickChatRequestDto() : this(null, "", null, null, null, null) { }
};

public record AiProviderStatusDto(
    string Provider,
    string DisplayName,
    bool IsReady,
    string? Model = null
);
