using System.Text;

namespace StudyAI.Features.AI;

public class FakeLlmProvider : ILlmProvider
{
    public string ProviderName => "FakeLlmProvider";
    public string DefaultModel => "fake-flash-v1";
    public string? ReasoningModel => "fake-reasoner-v1";
    public string FallbackModel => "fake-rule-fallback";
    public bool IsConfigured => true;

    public Task<LlmCompletionResponse> GenerateCompletionAsync(LlmCompletionRequest request)
    {
        request.CancellationToken.ThrowIfCancellationRequested();

        var lastMessage = request.Messages.LastOrDefault(m => m.Role == "user")?.Content ?? string.Empty;
        var lower = lastMessage.ToLowerInvariant();

        var sb = new StringBuilder();

        // 1. Check if lesson context is present in SystemPrompt
        var hasLessonContext = !string.IsNullOrWhiteSpace(request.SystemPrompt) &&
                               request.SystemPrompt.Contains("Ngữ cảnh bài học:");

        if (lower.Contains("timeout_test"))
        {
            throw new TimeoutException("Thao tác gọi AI Tutor đã vượt quá thời gian chờ cho phép (timeout).");
        }

        if (lower.Contains("rate_limit_test"))
        {
            throw new HttpRequestException("Hệ thống LLM đang bị giới hạn tần suất yêu cầu (Rate Limit - 429). Vui lòng thử lại sau giây lát.", null, System.Net.HttpStatusCode.TooManyRequests);
        }

        if (lower.Contains("server_error_test"))
        {
            throw new HttpRequestException("Lỗi máy chủ từ nhà cung cấp LLM: HTTP 503 Service Unavailable", null, System.Net.HttpStatusCode.ServiceUnavailable);
        }

        if (lower.Contains("error_test"))
        {
            throw new HttpRequestException("Lỗi kết nối từ phía nhà cung cấp dịch vụ mô hình AI (Provider error).");
        }

        if (lower.Contains("checkpoint") || lower.Contains("câu hỏi kiểm tra") || lower.Contains("checkpoint questions"))
        {
            var fakeJson = @"[
  {
    ""prompt"": ""Cho hàm số $y = x^3 - 3x^2 + 2$. Tìm khoảng đồng biến của hàm số."",
    ""options"": [
      ""A. $(-\\infty; 0)$ và $(2; +\\infty)$"",
      ""B. $(0; 2)$"",
      ""C. $(-\\infty; 2)$"",
      ""D. $(0; +\\infty)$""
    ],
    ""correctAnswer"": ""A"",
    ""explanation"": ""Ta có $y' = 3x^2 - 6x = 3x(x - 2)$. Cho $y' > 0 \\Leftrightarrow x < 0$ hoặc $x > 2$. Do đó hàm số đồng biến trên $(-\\infty; 0)$ và $(2; +\\infty)$."",
    ""cognitiveLevel"": ""thong_hieu""
  },
  {
    ""prompt"": ""Giá trị cực đại của hàm số $y = -x^3 + 3x - 1$ bằng bao nhiêu?"",
    ""options"": [
      ""A. $1$"",
      ""B. $-3$"",
      ""C. $2$"",
      ""D. $0$""
    ],
    ""correctAnswer"": ""A"",
    ""explanation"": ""$y' = -3x^2 + 3 = 0 \\Leftrightarrow x = \\pm 1$. Tại $x = 1$, $y'' = -6 < 0$ nên $x = 1$ là điểm cực đại, giá trị cực đại là $y(1) = 1$."",
    ""cognitiveLevel"": ""thong_hieu""
  }
]";
            sb.Append(fakeJson);
        }
        else if (hasLessonContext)
        {
            sb.AppendLine("### 📖 Trả lời có ngữ cảnh bài học (AI Tutor)");
            sb.AppendLine();
            sb.AppendLine($"Dựa trên nội dung bài học đang học, câu hỏi của bạn: **\"{lastMessage.Trim()}\"** có thể được giải thích như sau:");
            sb.AppendLine();
            sb.AppendLine("1. **Khái niệm trọng tâm:** Hãy chú ý mối liên hệ giữa lý thuyết trong bài và câu hỏi được đặt ra.");
            sb.AppendLine("2. **Công thức cốt lõi:** Khi giải quyết bài toán thuộc phần này, hãy sử dụng công thức toán học chuẩn:");
            sb.AppendLine("   $$(u \\cdot v)' = u' \\cdot v + u \\cdot v'$$");
            sb.AppendLine("   $$\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$$");
            sb.AppendLine("3. **Lưu ý sư phạm:** Nếu câu hỏi này mở rộng ra ngoài phạm vi bài giảng trên lớp, bạn nên ghi nhớ rằng hệ thống ưu tiên bám sát khung kiến thức sách giáo khoa.");
            sb.AppendLine();
            sb.AppendLine("> *Ghi chú:* Thông tin trên được tổng hợp trực tiếp từ tài liệu bài học chính khóa.");
        }
        else if (lower.Contains("cực trị") || lower.Contains("cuc tri"))
        {
            sb.AppendLine("### 📐 Hướng dẫn tìm cực trị:");
            sb.AppendLine();
            sb.AppendLine("Để tìm cực trị của hàm số, em thực hiện 3 bước trọng tâm:");
            sb.AppendLine("1. Tìm tập xác định và tính đạo hàm $y' = f'(x)$.");
            sb.AppendLine("2. Giải phương trình $y' = 0$ để tìm các điểm tới hạn.");
            sb.AppendLine("3. Lập bảng biến thiên hoặc xét dấu đạo hàm để kết luận điểm cực đại, cực tiểu (cực trị).");
        }
        else if (lower.Contains("đạo hàm") || lower.Contains("dao ham"))
        {
            sb.AppendLine("### 📐 Hướng dẫn tính Đạo hàm:");
            sb.AppendLine();
            sb.AppendLine("Để tính đạo hàm của một hàm số, em áp dụng các quy tắc sau:");
            sb.AppendLine("- **Đạo hàm đa thức cơ bản:** $(x^n)' = n \\cdot x^{n-1}$ với mọi $n \\in \\mathbb{R}$.");
            sb.AppendLine("- **Đạo hàm hàm hợp:** $(u^n)' = n \\cdot u^{n-1} \\cdot u'$.");
            sb.AppendLine("- **Ví dụ:** Cho $y = (2x + 1)^3$, ta có $y' = 3(2x + 1)^2 \\cdot (2x + 1)' = 6(2x + 1)^2$.");
            sb.AppendLine();
            sb.AppendLine("Em có muốn làm một câu hỏi luyện tập nhỏ để ghi nhớ không?");
        }
        else if (lower.Contains("tích phân") || lower.Contains("tich phan") || lower.Contains("nguyên hàm"))
        {
            sb.AppendLine("### 📐 Nguyên hàm và Tích phân:");
            sb.AppendLine();
            sb.AppendLine("Định nghĩa nguyên hàm: Hàm số $F(x)$ được gọi là một nguyên hàm của $f(x)$ trên khoảng $K$ nếu $F'(x) = f(x)$ với mọi $x \\in K$.");
            sb.AppendLine();
            sb.AppendLine("Công thức cơ bản:");
            sb.AppendLine("$$\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)$$");
            sb.AppendLine("$$\\int \\frac{1}{x} \\, dx = \\ln|x| + C$$");
        }
        else
        {
            sb.AppendLine("### 💡 Phản hồi từ AI Tutor:");
            sb.AppendLine();
            sb.AppendLine($"Tôi đã nhận được câu hỏi của bạn: *\"{lastMessage.Trim()}\"*. Dưới đây là phần giải thích sư phạm:");
            sb.AppendLine();
            sb.AppendLine("- **Bản chất kiến thức:** Mọi khái niệm học tập đều cần được xây dựng từ nền tảng định nghĩa rõ ràng.");
            sb.AppendLine("- **Phương pháp tiếp cận:** Hãy phân tích yêu cầu thành từng bước nhỏ để xử lý chính xác.");
            sb.AppendLine("- **Luyện tập:** Việc thường xuyên làm bài tập và xem lại lỗi sai là cách nhanh nhất để làm chủ kiến thức.");
            sb.AppendLine();
            sb.AppendLine("Bạn có muốn tìm hiểu sâu hơn về phần nào trong câu trả lời này không?");
        }

        var text = sb.ToString();
        var response = new LlmCompletionResponse(
            Content: text,
            PromptTokens: lastMessage.Length / 4 + 10,
            CompletionTokens: text.Length / 4,
            Provider: ProviderName
        );

        return Task.FromResult(response);
    }
}