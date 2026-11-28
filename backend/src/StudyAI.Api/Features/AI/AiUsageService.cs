using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace StudyAI.Features.AI;

public class AiUsageService : IAiUsageService
{
    private readonly IApplicationDbContext _context;
    private readonly ILlmProvider _llmProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiUsageService> _logger;

    private static readonly ConcurrentDictionary<string, SemaphoreSlim> UserQuotaLocks = new(StringComparer.Ordinal);

    private static readonly ConcurrentDictionary<string, bool> FeatureToggles = new(new[]
    {
        new KeyValuePair<string, bool>("tutor", true),
        new KeyValuePair<string, bool>("hints", true),
        new KeyValuePair<string, bool>("error_analysis", true),
        new KeyValuePair<string, bool>("learning_path", true),
    });

    public AiUsageService(
        IApplicationDbContext context,
        ILlmProvider llmProvider,
        IConfiguration configuration,
        ILogger<AiUsageService> logger)
    {
        _context = context;
        _llmProvider = llmProvider;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task LogUsageAsync(
        string userId,
        string feature,
        string provider,
        string model,
        int inputTokens,
        int outputTokens,
        int latencyMs,
        string status,
        string? errorMessage = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Standard estimation: $0.15 / 1M input, $0.60 / 1M output
            decimal cost = (inputTokens * 0.00000015m) + (outputTokens * 0.00000060m);

            var log = new AiUsageLog
            {
                Id = $"usg_{Guid.NewGuid():N}",
                UserId = string.IsNullOrWhiteSpace(userId) ? "anonymous" : userId,
                Feature = feature,
                Provider = provider,
                Model = model,
                InputTokens = inputTokens,
                OutputTokens = outputTokens,
                EstimatedCostUsd = cost,
                LatencyMs = latencyMs,
                Status = status,
                ErrorMessage = errorMessage != null && errorMessage.Length > 500 ? errorMessage[..500] : errorMessage,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.AiUsageLogs.Add(log);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi ghi nhật ký sử dụng AI cho user {UserId}: {Message}", userId, ex.Message);
        }
    }

    public async Task<string?> TryReserveQuotaAsync(
        string userId,
        string feature,
        string provider,
        string model,
        int dailyLimit,
        int monthlyLimit,
        CancellationToken cancellationToken = default)
    {
        var key = string.IsNullOrWhiteSpace(userId) ? "anonymous" : userId;
        var userLock = UserQuotaLocks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await userLock.WaitAsync(cancellationToken);
        try
        {
            var now = DateTimeOffset.UtcNow;
            var dayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
            var monthStart = new DateTimeOffset(new DateTime(now.UtcDateTime.Year, now.UtcDateTime.Month, 1, 0, 0, 0, DateTimeKind.Utc), TimeSpan.Zero);

            async Task<string?> ExecuteReserveAsync()
            {
                Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? tx = null;
                if (_context is DbContext relDb && relDb.Database.IsRelational() && relDb.Database.CurrentTransaction == null)
                {
                    tx = await relDb.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
                }

                try
                {
                    var dailyCount = await _context.AiUsageLogs
                        .Where(l => l.UserId == key && l.CreatedAt >= dayStart)
                        .CountAsync(cancellationToken);
                    if (dailyLimit > 0 && dailyCount >= dailyLimit)
                    {
                        if (tx != null) await tx.RollbackAsync(cancellationToken);
                        return null;
                    }

                    var monthlyCount = await _context.AiUsageLogs
                        .Where(l => l.UserId == key && l.CreatedAt >= monthStart)
                        .CountAsync(cancellationToken);
                    if (monthlyLimit > 0 && monthlyCount >= monthlyLimit)
                    {
                        if (tx != null) await tx.RollbackAsync(cancellationToken);
                        return null;
                    }

                    var reservationId = $"usg_{Guid.NewGuid():N}";
                    _context.AiUsageLogs.Add(new AiUsageLog
                    {
                        Id = reservationId,
                        UserId = key,
                        Feature = feature,
                        Provider = provider,
                        Model = model,
                        InputTokens = 0,
                        OutputTokens = 0,
                        EstimatedCostUsd = 0m,
                        LatencyMs = 0,
                        Status = "reserved",
                        CreatedAt = now
                    });
                    await _context.SaveChangesAsync(cancellationToken);
                    if (tx != null) await tx.CommitAsync(cancellationToken);
                    return reservationId;
                }
                catch
                {
                    if (tx != null) await tx.RollbackAsync(CancellationToken.None);
                    throw;
                }
                finally
                {
                    if (tx != null) await tx.DisposeAsync();
                }
            }

            if (_context is DbContext db && db.Database.IsRelational() && db.Database.CurrentTransaction == null)
            {
                var strategy = db.Database.CreateExecutionStrategy();
                return await strategy.ExecuteAsync(ExecuteReserveAsync);
            }

            return await ExecuteReserveAsync();
        }
        finally
        {
            userLock.Release();
        }
    }

    public async Task FinalizeUsageReservationAsync(
        string? reservationId,
        int inputTokens,
        int outputTokens,
        int latencyMs,
        string status,
        string? errorMessage = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(reservationId)) return;
        try
        {
            var row = await _context.AiUsageLogs.FirstOrDefaultAsync(l => l.Id == reservationId, cancellationToken);
            if (row == null) return;

            row.InputTokens = inputTokens;
            row.OutputTokens = outputTokens;
            row.EstimatedCostUsd = (inputTokens * 0.00000015m) + (outputTokens * 0.00000060m);
            row.LatencyMs = latencyMs;
            row.Status = status;
            row.ErrorMessage = errorMessage != null && errorMessage.Length > 500 ? errorMessage[..500] : errorMessage;
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi hoàn tất reservation sử dụng AI {ReservationId}: {Message}", reservationId, ex.Message);
        }
    }

    public async Task ReleaseUsageReservationAsync(
        string? reservationId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(reservationId)) return;
        try
        {
            var row = await _context.AiUsageLogs.FirstOrDefaultAsync(l => l.Id == reservationId, cancellationToken);
            if (row == null || row.Status != "reserved") return;
            _context.AiUsageLogs.Remove(row);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi giải phóng reservation sử dụng AI {ReservationId}: {Message}", reservationId, ex.Message);
        }
    }

    public async Task<AiUsageStatsDto> GetUsageStatsAsync(
        string? userId = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AiUsageLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(userId))
        {
            query = query.Where(l => l.UserId == userId);
        }

        if (from.HasValue)
        {
            query = query.Where(l => l.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(l => l.CreatedAt <= to.Value);
        }

        var logs = await query.ToListAsync(cancellationToken);

        int fallbackCount = logs.Count(l =>
            (l.Provider != null && l.Provider.Contains("Fallback", StringComparison.OrdinalIgnoreCase)) ||
            (l.Model != null && l.Model.Contains("fallback", StringComparison.OrdinalIgnoreCase)));

        int rateLimitCount = logs.Count(l =>
            (l.ErrorMessage != null && l.ErrorMessage.Contains("429")) ||
            l.Status == "rate_limited");

        int timeoutCount = logs.Count(l =>
            (l.ErrorMessage != null && l.ErrorMessage.Contains("timeout", StringComparison.OrdinalIgnoreCase)) ||
            l.Status == "timeout");

        var dailyCosts = logs
            .GroupBy(l => l.CreatedAt.ToString("yyyy-MM-dd"))
            .ToDictionary(g => g.Key, g => g.Sum(l => l.EstimatedCostUsd));

        var todayStr = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");
        decimal costToday = dailyCosts.TryGetValue(todayStr, out var c) ? c : 0.0m;
        const decimal dailyBudget = 5.0m;

        var stats = new AiUsageStatsDto
        {
            TotalRequests = logs.Count,
            TotalInputTokens = logs.Sum(l => l.InputTokens),
            TotalOutputTokens = logs.Sum(l => l.OutputTokens),
            EstimatedTotalCostUsd = logs.Sum(l => l.EstimatedCostUsd),
            AverageLatencyMs = logs.Count > 0 ? Math.Round(logs.Average(l => l.LatencyMs), 1) : 0,
            SuccessCount = logs.Count(l => l.Status == "success"),
            ErrorCount = logs.Count(l => l.Status != "success"),
            FallbackCount = fallbackCount,
            RateLimitCount = rateLimitCount,
            TimeoutCount = timeoutCount,
            DailyBudgetUsd = dailyBudget,
            BudgetWarning = costToday >= (dailyBudget * 0.8m),
            FeatureBreakdown = logs.GroupBy(l => l.Feature).ToDictionary(g => g.Key, g => g.Count()),
            ModelBreakdown = logs.GroupBy(l => l.Model).ToDictionary(g => g.Key, g => g.Count()),
            DailyCostBreakdown = dailyCosts
        };

        return stats;
    }

    public async Task<List<AiUsageLogItemDto>> GetRecentLogsAsync(
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var safeLimit = Math.Clamp(limit, 1, 200);

        return await _context.AiUsageLogs
            .AsNoTracking()
            .OrderByDescending(l => l.CreatedAt)
            .Take(safeLimit)
            .Select(l => new AiUsageLogItemDto
            {
                Id = l.Id,
                UserId = l.UserId,
                Feature = l.Feature,
                Provider = l.Provider,
                Model = l.Model,
                InputTokens = l.InputTokens,
                OutputTokens = l.OutputTokens,
                EstimatedCostUsd = l.EstimatedCostUsd,
                LatencyMs = l.LatencyMs,
                Status = l.Status,
                ErrorMessage = l.ErrorMessage,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public AiFeatureConfigDto GetFeatureConfig()
    {
        var defaultModel = _llmProvider.DefaultModel;
        var reasoningModel = _llmProvider.ReasoningModel;
        var fallbackModel = _llmProvider.FallbackModel;

        return new AiFeatureConfigDto
        {
            EnableTutor = FeatureToggles.GetValueOrDefault("tutor", true),
            EnableHints = FeatureToggles.GetValueOrDefault("hints", true),
            EnableErrorAnalysis = FeatureToggles.GetValueOrDefault("error_analysis", true),
            EnableLearningPath = FeatureToggles.GetValueOrDefault("learning_path", true),
            ProviderName = _llmProvider.ProviderName,
            ModelName = defaultModel,
            ReasoningModelName = reasoningModel,
            FallbackModelName = fallbackModel,
            IsConfigured = _llmProvider.IsConfigured
        };
    }

    public void SetFeatureToggle(string feature, bool enabled)
    {
        var key = feature.ToLowerInvariant().Trim();
        FeatureToggles[key] = enabled;
    }
}
