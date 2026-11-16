using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Infrastructure.Services;

public class AiCostOptimizationService : IAiCostOptimizationService
{
    private readonly IApplicationDbContext _db;

    public AiCostOptimizationService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<AiCostOptimizationDto> GetCostAndOptimizationAsync(int days = 30, CancellationToken cancellationToken = default)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-Math.Max(1, days));

        var logs = await _db.AiUsageLogs
            .Where(l => l.CreatedAt >= since)
            .Select(l => new
            {
                l.Feature,
                l.InputTokens,
                l.OutputTokens,
                l.EstimatedCostUsd,
                l.LatencyMs,
                l.Status
            })
            .ToListAsync(cancellationToken);

        int totalInputTokens = logs.Sum(l => l.InputTokens);
        int totalOutputTokens = logs.Sum(l => l.OutputTokens);
        int totalTokens = totalInputTokens + totalOutputTokens;
        decimal totalCost = logs.Sum(l => l.EstimatedCostUsd);
        int totalRequests = logs.Count;
        double? avgLatency = totalRequests > 0 ? Math.Round(logs.Average(l => l.LatencyMs), 1) : null;
        int successCount = logs.Count(l => l.Status == "success");
        double? successRate = totalRequests > 0 ? Math.Round((double)successCount / totalRequests * 100.0, 1) : null;

        var groupedFeatures = logs
            .GroupBy(l => string.IsNullOrWhiteSpace(l.Feature) ? "unclassified" : l.Feature)
            .Select(g =>
            {
                int fTokens = g.Sum(x => x.InputTokens + x.OutputTokens);
                decimal fCost = g.Sum(x => x.EstimatedCostUsd);
                return new FeatureUsageSummaryDto
                {
                    Feature = g.Key,
                    RequestCount = g.Count(),
                    Tokens = fTokens,
                    CostUsd = fCost,
                    AverageLatencyMs = Math.Round(g.Average(x => x.LatencyMs), 1),
                    SharePercentage = totalTokens > 0 ? Math.Round((double)fTokens / totalTokens * 100.0, 1) : 0
                };
            })
            .OrderByDescending(f => f.Tokens)
            .ToList();

        var recommendations = new List<string>();

        if (totalTokens > 100000)
        {
            recommendations.Add("Kích hoạt Gemini Context Caching cho System Prompt của AI Tutor để giảm tới 50% chi phí Input Token.");
        }
        else
        {
            recommendations.Add("Duy trì cấu hình Gemini 2.5 Flash Free Tier / Low Latency để tối ưu hóa ngân sách.");
        }

        if (groupedFeatures.Any(f => f.Feature.Contains("hint") && f.SharePercentage > 30))
        {
            recommendations.Add("Gợi ý Hint tầng 1 và tầng 2 có tần suất sử dụng cao: Cân nhắc lưu cache template gợi ý theo mã câu hỏi để tránh gọi LLM lặp lại.");
        }

        if (avgLatency > 1500)
        {
            recommendations.Add("Độ trễ trung bình vượt 1.5s: Giảm MaxTokens từ 1500 xuống 800 cho các phản hồi hội thoại thông thường.");
        }

        recommendations.Add("Áp dụng Rate Limiting tối đa 30 yêu cầu/phút/học sinh để ngăn chặn việc spam chatbot ngoài ý muốn.");
        recommendations.Add("Sử dụng nén ngữ cảnh lịch sử chat (Conversation Compaction) sau mỗi 10 lượt hội thoại.");

        return new AiCostOptimizationDto
        {
            Period = $"last_{days}_days",
            TotalTokens = totalTokens,
            PromptTokens = totalInputTokens,
            CompletionTokens = totalOutputTokens,
            EstimatedCostUsd = totalCost,
            AverageLatencyMs = avgLatency,
            TotalAiRequests = totalRequests,
            SuccessRate = successRate,
            UsageByFeature = groupedFeatures,
            OptimizationRecommendations = recommendations
        };
    }
}

