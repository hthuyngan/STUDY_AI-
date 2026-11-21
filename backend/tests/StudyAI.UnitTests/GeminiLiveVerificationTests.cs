using System.IO;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

public class GeminiLiveVerificationTests
{
    private readonly IConfiguration _configuration;

    public GeminiLiveVerificationTests()
    {
        // Microsoft.Extensions.Configuration treats keys case-insensitively. Linux
        // environments can expose both HTTPS_PROXY and https_proxy, so normalize
        // here before passing the collection to the configuration provider.
        var dict = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var secretsPath = Path.Combine(appData, "Microsoft", "UserSecrets", "d55765d9-064d-4e2f-80ea-e211a6d3c2aa", "secrets.json");

        if (File.Exists(secretsPath))
        {
            var json = File.ReadAllText(secretsPath);
            using var doc = JsonDocument.Parse(json);
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                dict[prop.Name] = prop.Value.GetString();
            }
        }

        foreach (System.Collections.DictionaryEntry env in Environment.GetEnvironmentVariables())
        {
            var key = env.Key?.ToString();
            if (!string.IsNullOrWhiteSpace(key))
            {
                dict[key] = env.Value?.ToString();
            }
        }

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(dict)
            .Build();
    }

    [Fact]
    public async Task GeminiLive_DirectVerification_CallsGoogleGeminiApiAndReceivesValidMathReasoning()
    {
        var apiKey = _configuration["Llm:ApiKey"] ?? Environment.GetEnvironmentVariable("STUDY_AI_LLM_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return;
        }

        var provider = new OpenAiLlmProvider(
            new HttpClient(),
            _configuration,
            NullLogger<OpenAiLlmProvider>.Instance);

        Assert.True(provider.IsConfigured, "Provider must be configured when API key is present");
        Assert.Equal("Gemini", provider.ProviderName);

        var request = new LlmCompletionRequest(
            Messages: new List<LlmChatMessage>
            {
                new("user", "Cho hàm số $y = x^3 - 3x$. Tìm tọa độ điểm cực đại của đồ thị hàm số.")
            },
            SystemPrompt: "Bạn là gia sư Toán 12 của StudyAI. Hãy giải thích ngắn gọn bằng tiếng Việt và dùng KaTeX $...$ cho công thức.",
            Temperature: 0.2,
            MaxTokens: 500
        );

        var response = await provider.GenerateCompletionAsync(request);

        Assert.NotNull(response);
        Assert.False(string.IsNullOrWhiteSpace(response.Content), "Response content must not be empty");
        Assert.Contains("$", response.Content); // Verifies KaTeX formatting
        Assert.True(
            response.Content.Contains("đạo hàm", StringComparison.OrdinalIgnoreCase) ||
            response.Content.Contains("cực đại", StringComparison.OrdinalIgnoreCase) ||
            response.Content.Contains("y'", StringComparison.OrdinalIgnoreCase),
            "Response should contain mathematical explanation of extreme points");
        Assert.Equal("Gemini", response.Provider);
    }

    [Fact]
    public void GeminiLive_AntiLeakDetector_ProtectsAgainstPrematureAnswers()
    {
        var leakedText = "Đáp án đúng là A. Giá trị lớn nhất là 1.";
        var cleanText = "Để tìm giá trị lớn nhất, em hãy tính đạo hàm $y'$ và lập bảng biến thiên trên đoạn $[0, 3]$.";

        Assert.True(AiAnswerLeakDetector.HasAnswerLeak(leakedText, "A", 1));
        Assert.False(AiAnswerLeakDetector.HasAnswerLeak(cleanText, "A", 1));

        var sanitized = AiAnswerLeakDetector.SanitizeText(leakedText, "A", 1);
        Assert.DoesNotContain("Đáp án đúng là A", sanitized);
    }
}
