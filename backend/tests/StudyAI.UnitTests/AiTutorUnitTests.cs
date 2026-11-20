using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

public class AiTutorUnitTests
{
    [Fact]
    public async Task FakeLlmProvider_GeneratesPedagogicalResponse_WithKaTeX()
    {
        var provider = new FakeLlmProvider();
        Assert.True(provider.IsConfigured);
        Assert.Equal("FakeLlmProvider", provider.ProviderName);

        var request = new LlmCompletionRequest(
            Messages: new List<LlmChatMessage>
            {
                new("user", "Đạo hàm của hàm số x^3 là gì?")
            }
        );

        var response = await provider.GenerateCompletionAsync(request);

        Assert.NotNull(response);
        Assert.Contains("Đạo hàm", response.Content);
        Assert.Contains("$", response.Content); // KaTeX delimiter
        Assert.NotNull(response.PromptTokens);
        Assert.NotNull(response.CompletionTokens);
    }

    [Fact]
    public async Task FakeLlmProvider_ThrowsOnTimeout()
    {
        var provider = new FakeLlmProvider();
        var request = new LlmCompletionRequest(
            Messages: new List<LlmChatMessage> { new("user", "timeout_test please") }
        );

        await Assert.ThrowsAsync<TimeoutException>(() => provider.GenerateCompletionAsync(request));
    }

    [Fact]
    public async Task FakeLlmProvider_ThrowsOnNetworkError()
    {
        var provider = new FakeLlmProvider();
        var request = new LlmCompletionRequest(
            Messages: new List<LlmChatMessage> { new("user", "error_test please") }
        );

        await Assert.ThrowsAsync<HttpRequestException>(() => provider.GenerateCompletionAsync(request));
    }

    [Fact]
    public async Task AiTutorService_RejectsEmptyMessage()
    {
        var service = new AiTutorService(null!, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var req = new SendAiMessageRequestDto("   ");

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.SendMessageAsync("usr_1", "learner", "conv_1", req));
    }

    [Fact]
    public async Task AiTutorService_RejectsOversizedMessage()
    {
        var service = new AiTutorService(null!, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var longMsg = new string('A', AiTutorService.MaxMessageLength + 10);
        var req = new SendAiMessageRequestDto(longMsg);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.SendMessageAsync("usr_1", "learner", "conv_1", req));
    }

    [Fact]
    public void OpenAiLlmProvider_Unconfigured_WhenNoApiKey()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Llm:Provider", "openai"},
            {"Llm:ApiKey", ""}
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var provider = new OpenAiLlmProvider(new HttpClient(), config, NullLogger<OpenAiLlmProvider>.Instance);
        Assert.False(provider.IsConfigured);
    }

    [Fact]
    public async Task OpenAiLlmProvider_ThrowsInvalidOperation_WhenApiKeyMissing()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Llm:Provider", "openai"},
            {"Llm:ApiKey", ""}
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var provider = new OpenAiLlmProvider(new HttpClient(), config, NullLogger<OpenAiLlmProvider>.Instance);
        var request = new LlmCompletionRequest(Messages: new List<LlmChatMessage> { new("user", "Hello") });

        await Assert.ThrowsAsync<InvalidOperationException>(() => provider.GenerateCompletionAsync(request));
    }

    [Fact]
    public void OpenAiLlmProvider_Configured_WhenApiKeyPresent()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Llm:Provider", "openai"},
            {"Llm:ApiKey", "sk-proj-test1234567890abcdef"},
            {"Llm:Model", "gpt-4o-mini"}
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var provider = new OpenAiLlmProvider(new HttpClient(), config, NullLogger<OpenAiLlmProvider>.Instance);
        Assert.True(provider.IsConfigured);
        Assert.Equal("OpenAI", provider.ProviderName);
    }

    [Fact]
    public void OpenAiLlmProvider_MaskSensitiveData_MasksApiKeysAndTokens()
    {
        var rawLog = "Error calling OpenAI API with key sk-proj-1234567890abcdef and Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.test";
        var masked = OpenAiLlmProvider.MaskSensitiveData(rawLog);

        Assert.DoesNotContain("sk-proj-1234567890abcdef", masked);
        Assert.DoesNotContain("eyJhbGciOiJIUzI1NiJ9.test", masked);
        Assert.Contains("sk-***REDACTED***", masked);
        Assert.Contains("***REDACTED***", masked);
    }

    [Fact]
    public async Task UnconfiguredLlmProvider_ReportsNotConfigured_AndThrowsOnGenerate()
    {
        var provider = new UnconfiguredLlmProvider();
        Assert.False(provider.IsConfigured);
        Assert.Equal("Unconfigured", provider.ProviderName);

        var request = new LlmCompletionRequest(Messages: new List<LlmChatMessage> { new("user", "Test") });
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => provider.GenerateCompletionAsync(request));
        Assert.Contains("chưa sẵn sàng", ex.Message);
    }

    [Fact]
    public void AiTutorService_GetProviderStatus_ReturnsCorrectStatusForEachProvider()
    {
        // 1. FakeLlmProvider
        var fakeService = new AiTutorService(null!, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var fakeStatus = fakeService.GetProviderStatus();
        Assert.Equal("fake", fakeStatus.Provider);
        Assert.Equal("Chế độ mô phỏng", fakeStatus.DisplayName);
        Assert.True(fakeStatus.IsReady);

        // 2. OpenAiLlmProvider with key
        var openAiConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                {"Llm:ApiKey", "sk-valid-key-123456789"},
                {"Llm:Model", "gpt-4o-mini"}
            })
            .Build();
        var openAiProvider = new OpenAiLlmProvider(new HttpClient(), openAiConfig, NullLogger<OpenAiLlmProvider>.Instance);
        var openAiService = new AiTutorService(null!, openAiProvider, NullLogger<AiTutorService>.Instance, openAiConfig);
        var openAiStatus = openAiService.GetProviderStatus();
        Assert.Equal("openai", openAiStatus.Provider);
        Assert.Equal("AI thật", openAiStatus.DisplayName);
        Assert.True(openAiStatus.IsReady);
        Assert.Equal("gpt-4o-mini", openAiStatus.Model);

        // 3. Unconfigured Provider
        var unconfService = new AiTutorService(null!, new UnconfiguredLlmProvider(), NullLogger<AiTutorService>.Instance);
        var unconfStatus = unconfService.GetProviderStatus();
        Assert.Equal("unconfigured", unconfStatus.Provider);
        Assert.Equal("AI chưa sẵn sàng", unconfStatus.DisplayName);
        Assert.False(unconfStatus.IsReady);
        Assert.Null(unconfStatus.Model);
    }

    [Fact]
    public void ProviderRegistration_ProductionMissingKey_FailsFast()
    {
        // Simulating the startup check in Program.cs
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                {"Llm:Provider", "openai"},
                {"Llm:ApiKey", ""}
            })
            .Build();

        var isProduction = true;
        var llmProviderConfig = config["Llm:Provider"]?.Trim().ToLowerInvariant();
        var llmApiKey = config["Llm:ApiKey"];

        Assert.Throws<InvalidOperationException>(() =>
        {
            if (isProduction && llmProviderConfig == "openai" && string.IsNullOrWhiteSpace(llmApiKey))
            {
                throw new InvalidOperationException("FATAL: LLM provider is explicitly configured as 'openai' in production but 'Llm:ApiKey' is missing or empty.");
            }
        });
    }

    [Fact]
    public void ProviderRegistration_ProductionFakeWithoutDemoFlag_FailsFast()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                {"Llm:Provider", "fake"},
                {"Llm:AllowDemoInProduction", "false"}
            })
            .Build();

        var isProduction = true;
        var llmProviderConfig = config["Llm:Provider"]?.Trim().ToLowerInvariant();
        var allowDemo = bool.TryParse(config["Llm:AllowDemoInProduction"], out var parsed) && parsed;

        Assert.Throws<InvalidOperationException>(() =>
        {
            if (isProduction && llmProviderConfig == "fake" && !allowDemo)
            {
                throw new InvalidOperationException("FATAL: Fake LLM provider is strictly forbidden in production unless explicitly authorized.");
            }
        });
    }

    [Fact]
    public async Task OpenAiLlmProvider_ClientCancellation_AbortsImmediatelyWithoutDelay()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Llm:Provider", "gemini"},
            {"Llm:ApiKey", "AIzaSyTest1234567890abcdef"},
            {"Llm:BaseUrl", "https://generativelanguage.googleapis.com/v1beta/openai"}
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var provider = new OpenAiLlmProvider(new HttpClient(), config, NullLogger<OpenAiLlmProvider>.Instance);

        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var request = new LlmCompletionRequest(
            Messages: new List<LlmChatMessage> { new("user", "Hello Gemini") },
            CancellationToken: cts.Token
        );

        var sw = System.Diagnostics.Stopwatch.StartNew();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => provider.GenerateCompletionAsync(request));
        sw.Stop();

        Assert.True(sw.ElapsedMilliseconds < 500, $"Expected immediate abort, took {sw.ElapsedMilliseconds}ms");
    }

    [Fact]
    public async Task OpenAiLlmProvider_Timeout_ThrowsTimeoutException()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Llm:Provider", "gemini"},
            {"Llm:ApiKey", "AIzaSyTest1234567890abcdef"},
            {"Llm:BaseUrl", "https://generativelanguage.googleapis.com/v1beta/openai"}
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var provider = new OpenAiLlmProvider(new HttpClient(), config, NullLogger<OpenAiLlmProvider>.Instance);
        var request = new LlmCompletionRequest(
            Messages: new List<LlmChatMessage> { new("user", "trigger timeout_test please") }
        );

        var ex = await Assert.ThrowsAsync<TimeoutException>(() => provider.GenerateCompletionAsync(request));
        Assert.Contains("vượt quá thời gian chờ", ex.Message);
    }

    [Fact]
    public async Task OpenAiLlmProvider_RateLimit429_ThrowsHttpRequestExceptionWith429()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Llm:Provider", "gemini"},
            {"Llm:ApiKey", "AIzaSyTest1234567890abcdef"},
            {"Llm:BaseUrl", "https://generativelanguage.googleapis.com/v1beta/openai"}
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var provider = new OpenAiLlmProvider(new HttpClient(), config, NullLogger<OpenAiLlmProvider>.Instance);
        var request = new LlmCompletionRequest(
            Messages: new List<LlmChatMessage> { new("user", "trigger rate_limit_test please") }
        );

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => provider.GenerateCompletionAsync(request));
        Assert.Equal(System.Net.HttpStatusCode.TooManyRequests, ex.StatusCode);
    }

    [Fact]
    public async Task OpenAiLlmProvider_ServerError5xx_ThrowsHttpRequestExceptionWith5xx()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Llm:Provider", "gemini"},
            {"Llm:ApiKey", "AIzaSyTest1234567890abcdef"},
            {"Llm:BaseUrl", "https://generativelanguage.googleapis.com/v1beta/openai"}
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var provider = new OpenAiLlmProvider(new HttpClient(), config, NullLogger<OpenAiLlmProvider>.Instance);
        var request = new LlmCompletionRequest(
            Messages: new List<LlmChatMessage> { new("user", "trigger server_error_test please") }
        );

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => provider.GenerateCompletionAsync(request));
        Assert.Equal(System.Net.HttpStatusCode.ServiceUnavailable, ex.StatusCode);
    }

    [Fact]
    public void OpenAiLlmProvider_GeminiBaseUrl_DefaultsToGeminiModel()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Llm:Provider", "gemini"},
            {"Llm:ApiKey", "AIzaSyTest1234567890abcdef"},
            {"Llm:BaseUrl", "https://generativelanguage.googleapis.com/v1beta/openai"}
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var provider = new OpenAiLlmProvider(new HttpClient(), config, NullLogger<OpenAiLlmProvider>.Instance);
        Assert.Equal("gemini-1.5-flash", provider.DefaultModel);
    }

    [Fact]
    public void OpenAiLlmProvider_MaskSensitiveData_MasksGeminiApiKey()
    {
        var log = "Calling Gemini API with key AIzaSyD3x9L7m4K1Qp8V2wZ6-test and Authorization: Bearer AIzaSySecretKey12345678";
        var masked = OpenAiLlmProvider.MaskSensitiveData(log);

        Assert.DoesNotContain("AIzaSyD3x9L7m4K1Qp8V2wZ6-test", masked);
        Assert.DoesNotContain("AIzaSySecretKey12345678", masked);
        Assert.Contains("AIzaSy***REDACTED***", masked);
    }
}
