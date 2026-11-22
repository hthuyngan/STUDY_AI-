
namespace StudyAI.Features.AI;

/// <summary>
/// Provider đại diện cho trạng thái khi nhà cung cấp LLM chưa được cấu hình hoặc thiếu API Key hợp lệ.
/// Sẽ trả về lỗi fail-closed rõ ràng nếu được gọi để sinh phản hồi.
/// </summary>
public class UnconfiguredLlmProvider : ILlmProvider
{
    public string ProviderName => "Unconfigured";
    public string DefaultModel => "none";
    public string? ReasoningModel => null;
    public string FallbackModel => "rule-based";
    public bool IsConfigured => false;

    public Task<LlmCompletionResponse> GenerateCompletionAsync(LlmCompletionRequest request)
    {
        throw new InvalidOperationException("Dịch vụ AI chưa sẵn sàng: Nhà cung cấp mô hình AI chưa được cấu hình hoặc thiếu API Key hợp lệ.");
    }
}