using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;

namespace StudyAI.Infrastructure.Services;

public class OpenAiLlmProvider : ILlmProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenAiLlmProvider> _logger;

    public OpenAiLlmProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<OpenAiLlmProvider> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public string ProviderName => "OpenAI";

    public bool IsConfigured
    {
        get
        {
            var apiKey = _configuration["Llm:ApiKey"] ?? Environment.GetEnvironmentVariable("STUDY_AI_LLM_API_KEY");
            return !string.IsNullOrWhiteSpace(apiKey);
        }
    }

    public async Task<LlmCompletionResponse> GenerateCompletionAsync(LlmCompletionRequest request)
    {
        var apiKey = _configuration["Llm:ApiKey"] ?? Environment.GetEnvironmentVariable("STUDY_AI_LLM_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Chưa cấu hình API Key cho nhà cung cấp LLM (Llm:ApiKey). Vui lòng cấu hình biến môi trường hoặc cấu hình ứng dụng.");
        }

        var baseUrl = _configuration["Llm:BaseUrl"] ?? "https://api.openai.com/v1";
        var model = _configuration["Llm:Model"] ?? "gpt-4o-mini";

        var url = $"{baseUrl.TrimEnd('/')}/chat/completions";

        var messagesPayload = new List<object>();

        if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
        {
            messagesPayload.Add(new { role = "system", content = request.SystemPrompt });
        }

        foreach (var m in request.Messages)
        {
            messagesPayload.Add(new { role = m.Role, content = m.Content });
        }

        var payload = new
        {
            model = model,
            messages = messagesPayload,
            temperature = request.Temperature,
            max_tokens = request.MaxTokens
        };

        var jsonContent = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Content = jsonContent;

        try
        {
            using var response = await _httpClient.SendAsync(httpRequest, request.CancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync(request.CancellationToken);
                var safeErrorText = MaskSensitiveData(errorText);
                _logger.LogError("LLM Provider returned error HTTP {StatusCode}: {ErrorText}", response.StatusCode, safeErrorText);
                throw new HttpRequestException($"Lỗi từ nhà cung cấp dịch vụ LLM: HTTP {(int)response.StatusCode} {response.ReasonPhrase}");
            }

            var responseStream = await response.Content.ReadAsStreamAsync(request.CancellationToken);
            using var doc = await JsonDocument.ParseAsync(responseStream, cancellationToken: request.CancellationToken);

            var root = doc.RootElement;
            var choice = root.GetProperty("choices")[0];
            var content = choice.GetProperty("message").GetProperty("content").GetString() ?? string.Empty;

            int? promptTokens = null;
            int? completionTokens = null;

            if (root.TryGetProperty("usage", out var usage))
            {
                if (usage.TryGetProperty("prompt_tokens", out var pt)) promptTokens = pt.GetInt32();
                if (usage.TryGetProperty("completion_tokens", out var ct)) completionTokens = ct.GetInt32();
            }

            return new LlmCompletionResponse(
                Content: content,
                PromptTokens: promptTokens,
                CompletionTokens: completionTokens,
                Provider: ProviderName
            );
        }
        catch (OperationCanceledException) when (request.CancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("LLM request was canceled by user/timeout.");
            throw;
        }
    }

    public static string MaskSensitiveData(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;
        // Mask API keys (e.g. sk-..., bearer tokens)
        var masked = System.Text.RegularExpressions.Regex.Replace(
            text,
            @"(sk-[a-zA-Z0-9_\-]{6,})",
            "sk-***REDACTED***");
        masked = System.Text.RegularExpressions.Regex.Replace(
            masked,
            @"(Bearer\s+)[a-zA-Z0-9_\-\.]{8,}",
            "$1***REDACTED***",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return masked;
    }
}
