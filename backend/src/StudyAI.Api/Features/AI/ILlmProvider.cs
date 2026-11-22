namespace StudyAI.Features.AI;

public record LlmChatMessage(string Role, string Content);

public record LlmCompletionRequest(
    IReadOnlyList<LlmChatMessage> Messages,
    string? SystemPrompt = null,
    double Temperature = 0.3,
    int MaxTokens = 1500,
    string? Model = null,
    string? CorrelationId = null,
    string? TaskType = null,
    CancellationToken CancellationToken = default
);

public record LlmCompletionResponse(
    string Content,
    int? PromptTokens = null,
    int? CompletionTokens = null,
    string Provider = "mock",
    string? Model = null,
    int LatencyMs = 0,
    bool IsFallback = false,
    string? CorrelationId = null
);

public interface ILlmProvider
{
    string ProviderName { get; }
    string DefaultModel { get; }
    string? ReasoningModel { get; }
    string FallbackModel { get; }
    bool IsConfigured { get; }
    Task<LlmCompletionResponse> GenerateCompletionAsync(LlmCompletionRequest request);
}