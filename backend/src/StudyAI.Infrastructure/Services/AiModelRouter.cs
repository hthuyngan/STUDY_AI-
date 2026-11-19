using Microsoft.Extensions.Configuration;
using StudyAI.Application.Common.Interfaces;

namespace StudyAI.Infrastructure.Services;

public class AiModelRouter : IAiModelRouter
{
    private readonly IConfiguration? _configuration;

    public AiModelRouter(IConfiguration? configuration = null)
    {
        _configuration = configuration;
    }

    public string DefaultModel
    {
        get
        {
            var configured = _configuration?["Llm:Model"] ?? Environment.GetEnvironmentVariable("STUDY_AI_LLM_DEFAULT_MODEL");
            if (!string.IsNullOrWhiteSpace(configured)) return configured.Trim();

            var baseUrl = _configuration?["Llm:BaseUrl"] ?? Environment.GetEnvironmentVariable("STUDY_AI_LLM_BASE_URL") ?? string.Empty;
            var provider = (_configuration?["Llm:Provider"] ?? _configuration?["Llm:ProviderName"] ?? string.Empty).ToLowerInvariant();

            if (provider == "gemini" || baseUrl.Contains("generativelanguage.googleapis.com", StringComparison.OrdinalIgnoreCase))
            {
                return "gemini-1.5-flash";
            }

            return "gpt-4o-mini";
        }
    }

    public string? ReasoningModel
    {
        get
        {
            var model = _configuration?["Llm:ReasoningModel"] ??
                        Environment.GetEnvironmentVariable("STUDY_AI_LLM_REASONING_MODEL");
            return string.IsNullOrWhiteSpace(model) ? null : model.Trim();
        }
    }

    public string FallbackModel =>
        _configuration?["Llm:FallbackModel"] ??
        Environment.GetEnvironmentVariable("STUDY_AI_LLM_FALLBACK_MODEL") ??
        DefaultModel;

    public ModelRouteDecision Route(AiTaskType taskType, string? difficulty = null, int? promptLength = null)
    {
        return taskType switch
        {
            AiTaskType.TutorChat => new ModelRouteDecision(
                ModelName: DefaultModel,
                MaxTokens: 600,
                Temperature: 0.3,
                TaskName: "tutor_chat",
                UseReasoningModel: false,
                FallbackModel: FallbackModel),

            AiTaskType.HintLevel1 => new ModelRouteDecision(
                ModelName: DefaultModel,
                MaxTokens: 250,
                Temperature: 0.1,
                TaskName: "hint_level_1",
                UseReasoningModel: false,
                FallbackModel: FallbackModel),

            AiTaskType.HintLevel2 => new ModelRouteDecision(
                ModelName: DefaultModel,
                MaxTokens: 350,
                Temperature: 0.1,
                TaskName: "hint_level_2",
                UseReasoningModel: false,
                FallbackModel: FallbackModel),

            AiTaskType.HintLevel3 => ResolveHintLevel3Route(difficulty),

            AiTaskType.ErrorAnalysis => new ModelRouteDecision(
                ModelName: DefaultModel,
                MaxTokens: 700,
                Temperature: 0.2,
                TaskName: "error_analysis",
                UseReasoningModel: false,
                FallbackModel: FallbackModel),

            AiTaskType.LearningPathExplanation => new ModelRouteDecision(
                ModelName: DefaultModel,
                MaxTokens: 300,
                Temperature: 0.2,
                TaskName: "learning_path_explanation",
                UseReasoningModel: false,
                FallbackModel: FallbackModel),

            AiTaskType.ConversationSummary => new ModelRouteDecision(
                ModelName: DefaultModel,
                MaxTokens: 200,
                Temperature: 0.1,
                TaskName: "conversation_summary",
                UseReasoningModel: false,
                FallbackModel: FallbackModel),

            _ => new ModelRouteDecision(
                ModelName: DefaultModel,
                MaxTokens: 500,
                Temperature: 0.2,
                TaskName: "default",
                UseReasoningModel: false,
                FallbackModel: FallbackModel)
        };
    }

    private ModelRouteDecision ResolveHintLevel3Route(string? difficulty)
    {
        bool isVeryHard = !string.IsNullOrWhiteSpace(difficulty) &&
            (difficulty.Equals("very-hard", StringComparison.OrdinalIgnoreCase) ||
             difficulty.Equals("van_dung_cao", StringComparison.OrdinalIgnoreCase) ||
             difficulty.Equals("hard", StringComparison.OrdinalIgnoreCase));

        if (isVeryHard && !string.IsNullOrWhiteSpace(ReasoningModel))
        {
            return new ModelRouteDecision(
                ModelName: ReasoningModel,
                MaxTokens: 500,
                Temperature: 0.1,
                TaskName: "hint_level_3_reasoning",
                UseReasoningModel: true,
                FallbackModel: DefaultModel);
        }

        return new ModelRouteDecision(
            ModelName: DefaultModel,
            MaxTokens: 400,
            Temperature: 0.1,
            TaskName: "hint_level_3",
            UseReasoningModel: false,
            FallbackModel: FallbackModel);
    }
}
