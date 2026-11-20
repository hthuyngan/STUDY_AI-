namespace StudyAI.Application.Common.Interfaces;

public enum AiTaskType
{
    TutorChat,
    HintLevel1,
    HintLevel2,
    HintLevel3,
    ErrorAnalysis,
    LearningPathExplanation,
    ConversationSummary
}

public record ModelRouteDecision(
    string ModelName,
    int MaxTokens,
    double Temperature,
    string TaskName,
    bool UseReasoningModel,
    string FallbackModel
);

public interface IAiModelRouter
{
    ModelRouteDecision Route(AiTaskType taskType, string? difficulty = null, int? promptLength = null);
    string DefaultModel { get; }
    string? ReasoningModel { get; }
    string FallbackModel { get; }
}
