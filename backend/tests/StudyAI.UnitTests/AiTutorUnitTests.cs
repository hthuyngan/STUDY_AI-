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
}
