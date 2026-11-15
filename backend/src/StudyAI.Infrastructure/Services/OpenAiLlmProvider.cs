using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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

    public string ProviderName =>
        _configuration["Llm:ProviderName"] ??
        Environment.GetEnvironmentVariable("STUDY_AI_LLM_PROVIDER") ??
        "OpenAI";

    public string DefaultModel =>
        _configuration["Llm:Model"] ??
        Environment.GetEnvironmentVariable("STUDY_AI_LLM_DEFAULT_MODEL") ??
        "gpt-4o-mini";

    public string? ReasoningModel
    {
        get
        {
            var model = _configuration["Llm:ReasoningModel"] ??
                        Environment.GetEnvironmentVariable("STUDY_AI_LLM_REASONING_MODEL");
            return string.IsNullOrWhiteSpace(model) ? null : model.Trim();
        }
    }

    public string FallbackModel =>
        _configuration["Llm:FallbackModel"] ??
        Environment.GetEnvironmentVariable("STUDY_AI_LLM_FALLBACK_MODEL") ??
        DefaultModel;

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
            throw new InvalidOperationException("Chưa cấu hình API Key cho nhà cung cấp LLM (Llm:ApiKey hoặc STUDY_AI_LLM_API_KEY).");
        }

        var baseUrl = _configuration["Llm:BaseUrl"] ??
                      Environment.GetEnvironmentVariable("STUDY_AI_LLM_BASE_URL") ??
                      "https://api.openai.com/v1";

        var chosenModel = !string.IsNullOrWhiteSpace(request.Model) ? request.Model : DefaultModel;
        var correlationId = !string.IsNullOrWhiteSpace(request.CorrelationId) ? request.CorrelationId : Guid.NewGuid().ToString("N");

        int timeoutSeconds = 25;
        if (int.TryParse(_configuration["Llm:TimeoutSeconds"] ?? Environment.GetEnvironmentVariable("STUDY_AI_LLM_TIMEOUT_SECONDS"), out var parsedTimeout) && parsedTimeout > 0)
        {
            timeoutSeconds = Math.Clamp(parsedTimeout, 5, 120);
        }

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

        // Resilient payload construction: some reasoning models (like o1/o3/reasoner) forbid temperature or custom max_tokens
        var payloadDict = new Dictionary<string, object>
        {
            ["model"] = chosenModel,
            ["messages"] = messagesPayload
        };

        bool isStrictReasoning = chosenModel.Contains("o1", StringComparison.OrdinalIgnoreCase) ||
                                chosenModel.Contains("o3", StringComparison.OrdinalIgnoreCase) ||
                                chosenModel.Contains("reasoner", StringComparison.OrdinalIgnoreCase);

        if (!isStrictReasoning)
        {
            payloadDict["temperature"] = request.Temperature;
            payloadDict["max_tokens"] = request.MaxTokens;
        }
        else
        {
            payloadDict["max_completion_tokens"] = request.MaxTokens;
        }

        var jsonContent = new StringContent(
            JsonSerializer.Serialize(payloadDict),
            Encoding.UTF8,
            "application/json");

        const int maxRetries = 3;
        int currentAttempt = 0;
        Exception? lastException = null;

        var sw = Stopwatch.StartNew();

        while (currentAttempt < maxRetries)
        {
            currentAttempt++;

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(request.CancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            httpRequest.Headers.Add("X-Correlation-Id", correlationId);
            httpRequest.Content = jsonContent;

            try
            {
                using var response = await _httpClient.SendAsync(httpRequest, cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    var responseStream = await response.Content.ReadAsStreamAsync(cts.Token);
                    using var doc = await JsonDocument.ParseAsync(responseStream, cancellationToken: cts.Token);

                    var root = doc.RootElement;
                    var choices = root.GetProperty("choices");
                    if (choices.GetArrayLength() == 0)
                    {
                        throw new InvalidOperationException("Phản hồi từ LLM không chứa choices.");
                    }

                    var choice = choices[0];
                    var content = choice.GetProperty("message").GetProperty("content").GetString() ?? string.Empty;

                    int? promptTokens = null;
                    int? completionTokens = null;

                    if (root.TryGetProperty("usage", out var usage))
                    {
                        if (usage.TryGetProperty("prompt_tokens", out var pt)) promptTokens = pt.GetInt32();
                        if (usage.TryGetProperty("completion_tokens", out var ct)) completionTokens = ct.GetInt32();
                    }

                    sw.Stop();

                    return new LlmCompletionResponse(
                        Content: content,
                        PromptTokens: promptTokens,
                        CompletionTokens: completionTokens,
                        Provider: ProviderName,
                        Model: chosenModel,
                        LatencyMs: (int)sw.ElapsedMilliseconds,
                        IsFallback: false,
                        CorrelationId: correlationId
                    );
                }

                var errorText = await response.Content.ReadAsStringAsync(cts.Token);
                var safeErrorText = MaskSensitiveData(errorText);
                _logger.LogWarning("LLM Provider returned HTTP {StatusCode} on attempt {Attempt}/{MaxRetries} (CorrelationId={CorrelationId}): {ErrorText}",
                    response.StatusCode, currentAttempt, maxRetries, correlationId, safeErrorText);

                // Rate limiting (429) or transient 5xx server errors => retry with exponential backoff
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests || (int)response.StatusCode >= 500)
                {
                    if (currentAttempt < maxRetries)
                    {
                        int delayMs = (int)(Math.Pow(2, currentAttempt - 1) * 750) + Random.Shared.Next(100, 400);

                        // Check Retry-After header
                        if (response.Headers.RetryAfter?.Delta != null)
                        {
                            delayMs = Math.Max(delayMs, (int)response.Headers.RetryAfter.Delta.Value.TotalMilliseconds);
                        }

                        _logger.LogInformation("Rate limit or transient error. Backing off for {DelayMs}ms before retry...", delayMs);
                        await Task.Delay(delayMs, request.CancellationToken);
                        continue;
                    }

                    if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                    {
                        throw new HttpRequestException("Hệ thống LLM đang bị giới hạn tần suất yêu cầu (Rate Limit - 429). Vui lòng thử lại sau giây lát.");
                    }
                }

                throw new HttpRequestException($"Lỗi từ nhà cung cấp dịch vụ LLM: HTTP {(int)response.StatusCode} {response.ReasonPhrase}");
            }
            catch (OperationCanceledException) when (cts.IsCancellationRequested && !request.CancellationToken.IsCancellationRequested)
            {
                lastException = new TimeoutException($"Thời gian phản hồi từ nhà cung cấp LLM vượt quá giới hạn ({timeoutSeconds}s).");
                _logger.LogWarning("LLM request timed out on attempt {Attempt}/{MaxRetries}.", currentAttempt, maxRetries);
                if (currentAttempt < maxRetries)
                {
                    await Task.Delay(500 * currentAttempt, request.CancellationToken);
                    continue;
                }
                throw lastException;
            }
            catch (HttpRequestException ex) when (currentAttempt < maxRetries && (ex.Message.Contains("429") || ex.Message.Contains("503")))
            {
                lastException = ex;
                await Task.Delay(1000 * currentAttempt, request.CancellationToken);
            }
            catch (Exception ex)
            {
                lastException = ex;
                if (currentAttempt >= maxRetries) throw;
                await Task.Delay(500 * currentAttempt, request.CancellationToken);
            }
        }

        sw.Stop();
        throw lastException ?? new InvalidOperationException("Không thể nhận phản hồi từ LLM sau số lần thử lại tối đa.");
    }

    public static string MaskSensitiveData(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;
        var masked = Regex.Replace(text, @"(sk-[a-zA-Z0-9_\-]{6,})", "sk-***REDACTED***");
        masked = Regex.Replace(masked, @"(Bearer\s+)[a-zA-Z0-9_\-\.]{8,}", "$1***REDACTED***", RegexOptions.IgnoreCase);
        return masked;
    }
}
