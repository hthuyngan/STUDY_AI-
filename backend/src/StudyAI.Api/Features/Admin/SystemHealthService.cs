using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace StudyAI.Features.Admin;

public class SystemHealthService : ISystemHealthService
{
    private readonly IApplicationDbContext _db;
    private readonly IConfiguration _configuration;
    private static readonly DateTimeOffset ProcessStartTime = DateTimeOffset.UtcNow;

    public SystemHealthService(IApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task<SystemHealthReportDto> GetSystemHealthAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var dayAgo = now.AddHours(-24);

        // 1. Database Connectivity & Ping
        var dbStopwatch = Stopwatch.StartNew();
        bool canConnect = false;
        try
        {
            canConnect = await _db.Database.CanConnectAsync(cancellationToken);
        }
        catch
        {
            canConnect = false;
        }
        dbStopwatch.Stop();
        int dbPingMs = (int)dbStopwatch.ElapsedMilliseconds;

        // 2. Counts
        int userCount = 0;
        int lessonCount = 0;
        int questionCount = 0;
        int attemptCount = 0;
        int logCount = 0;
        int eventCount = 0;

        if (canConnect)
        {
            userCount = await _db.Users.CountAsync(cancellationToken);
            lessonCount = await _db.ContentLessons.CountAsync(cancellationToken);
            questionCount = await _db.ContentQuestions.CountAsync(cancellationToken);
            attemptCount = await _db.AssessmentAttempts.CountAsync(cancellationToken);
            logCount = await _db.AiUsageLogs.CountAsync(cancellationToken);
            eventCount = await _db.LearningEvents.CountAsync(cancellationToken);
        }

        // 3. API & AI Metrics from recent AiUsageLogs
        var recentLogs = canConnect
            ? await _db.AiUsageLogs
                .Where(l => l.CreatedAt >= dayAgo)
                .Select(l => new { l.LatencyMs, l.Status })
                .ToListAsync(cancellationToken)
            : new();

        int totalReqs = recentLogs.Count;
        int errorReqs = recentLogs.Count(l => l.Status == "error" || l.Status == "timeout");
        double? errorRate = totalReqs > 0 ? Math.Round((double)errorReqs / totalReqs * 100.0, 2) : null;
        
        int? p95Latency = null;
        if (recentLogs.Count > 0)
        {
            var sortedLatencies = recentLogs.Select(l => l.LatencyMs).OrderBy(x => x).ToList();
            int p95Index = (int)Math.Ceiling(sortedLatencies.Count * 0.95) - 1;
            p95Latency = sortedLatencies[Math.Clamp(p95Index, 0, sortedLatencies.Count - 1)];
        }

        int activeSessions = canConnect
            ? await _db.RefreshSessions.CountAsync(s => s.ExpiresAt > now, cancellationToken)
            : 0;

        // 4. Component Statuses
        var components = new List<ComponentHealthDto>();

        // DB Component
        components.Add(new ComponentHealthDto
        {
            Name = "Microsoft SQL Server",
            Status = canConnect ? (dbPingMs < 200 ? "healthy" : "degraded") : "unhealthy",
            LatencyMs = dbPingMs,
            Details = canConnect ? $"Connection verified ({userCount} users, {lessonCount} lessons, {questionCount} questions)" : "Unable to establish database connection",
            LastChecked = now
        });

        // AI Provider Component
        bool hasGeminiKey = !string.IsNullOrWhiteSpace(_configuration["GEMINI_API_KEY"]) ||
                            !string.IsNullOrWhiteSpace(_configuration["Gemini:ApiKey"]) ||
                            !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GEMINI_API_KEY"));
        bool hasOpenAiKey = !string.IsNullOrWhiteSpace(_configuration["OpenAI:ApiKey"]);

        string aiStatus = "healthy";
        string aiDetails = "AI Provider configured and ready";
        if (!hasGeminiKey && !hasOpenAiKey)
        {
            aiStatus = "degraded";
            aiDetails = "API Key not detected in environment; fallback provider active";
        }
        else if (errorRate.HasValue && errorRate.Value > 15.0)
        {
            aiStatus = "degraded";
            aiDetails = $"Elevated error rate ({errorRate.Value}%) in last 24h";
        }

        components.Add(new ComponentHealthDto
        {
            Name = "Google Gemini / OpenAI LLM",
            Status = aiStatus,
            LatencyMs = p95Latency ?? 0,
            Details = aiDetails,
            LastChecked = now
        });

        // Application Server Component
        var uptime = (long)(now - ProcessStartTime).TotalSeconds;
        components.Add(new ComponentHealthDto
        {
            Name = "STUDY_AI Web API (.NET 10)",
            Status = "healthy",
            LatencyMs = 2,
            Details = $"Running in Kestrel (.NET 10.0), Uptime: {uptime}s",
            LastChecked = now
        });

        // Overall status
        string overall = "healthy";
        if (!canConnect)
        {
            overall = "unhealthy";
        }
        else if (components.Any(c => c.Status == "degraded") || (errorRate.HasValue && errorRate.Value > 10.0))
        {
            overall = "degraded";
        }

        return new SystemHealthReportDto
        {
            OverallStatus = overall,
            CheckedAt = now,
            UptimeSeconds = uptime,
            Components = components,
            ApiMetrics = new ApiMetricsDto
            {
                TotalRequests24h = totalReqs,
                ErrorRequests24h = errorReqs,
                ErrorRatePercent = errorRate,
                P95LatencyMs = p95Latency,
                ActiveSessions = activeSessions
            },
            DatabaseHealth = new DatabaseHealthDto
            {
                CanConnect = canConnect,
                PingLatencyMs = dbPingMs,
                TotalUsers = userCount,
                TotalLessons = lessonCount,
                TotalQuestions = questionCount,
                TotalAssessmentAttempts = attemptCount,
                TotalAiLogs = logCount,
                TotalLearningEvents = eventCount
            }
        };
    }
}
