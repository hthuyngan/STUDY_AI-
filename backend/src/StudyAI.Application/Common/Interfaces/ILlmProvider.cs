namespace StudyAI.Application.Common.Interfaces;

public record LlmChatMessage(string Role, string Content);

public record LlmCompletionRequest(
    IReadOnlyList<LlmChatMessage> Messages,
    string? SystemPrompt = null,
    double Temperature = 0.3,
    int MaxTokens = 1500,
    CancellationToken CancellationToken = default
);

public record LlmCompletionResponse(
    string Content,
    int? PromptTokens = null,
    int? CompletionTokens = null,
    string Provider = "mock"
);

public interface ILlmProvider
{
    string ProviderName { get; }
    bool IsConfigured { get; }
    Task<LlmCompletionResponse> GenerateCompletionAsync(LlmCompletionRequest request);
}
