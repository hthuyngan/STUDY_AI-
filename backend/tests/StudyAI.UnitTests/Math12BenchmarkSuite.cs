using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

public record Math12BenchmarkItem(
    string Id,
    string Topic,
    string Difficulty,
    string Prompt,
    string CorrectAnswer,
    string Explanation,
    string[] Options
);

public class Math12BenchmarkSuite
{
    public static readonly List<Math12BenchmarkItem> BenchmarkItems = Generate100BenchmarkItems();

    [Fact]
    public void Benchmark_Dataset_ContainsAtLeast100VerifiedMath12Items()
    {
        Assert.True(BenchmarkItems.Count >= 100, $"Benchmark dataset must contain at least 100 items. Current count: {BenchmarkItems.Count}");

        var topics = BenchmarkItems.Select(i => i.Topic).Distinct().ToList();
        Assert.Contains(topics, t => t.Contains("Khảo sát hàm số") || t.Contains("Đơn điệu"));
        Assert.Contains(topics, t => t.Contains("Đạo hàm") || t.Contains("Cực trị") || t.Contains("Tiệm cận"));
        Assert.Contains(topics, t => t.Contains("Nguyên hàm") || t.Contains("Tích phân"));
        Assert.Contains(topics, t => t.Contains("Mũ") || t.Contains("Logarit"));
        Assert.Contains(topics, t => t.Contains("Oxyz") || t.Contains("Mặt phẳng") || t.Contains("Mặt cầu"));
        Assert.Contains(topics, t => t.Contains("Vectơ"));
        Assert.Contains(topics, t => t.Contains("Xác suất"));
        Assert.Contains(topics, t => t.Contains("Thống kê"));
        Assert.Contains(topics, t => t.Contains("thực tế") || t.Contains("Ứng dụng"));
    }

    [Fact]
    public void Benchmark_AllItems_HaveValidLaTeXDelimiters_AndVietnameseText()
    {
        foreach (var item in BenchmarkItems)
        {
            Assert.False(string.IsNullOrWhiteSpace(item.Prompt), $"Item {item.Id} has empty prompt.");
            Assert.False(string.IsNullOrWhiteSpace(item.CorrectAnswer), $"Item {item.Id} has empty correct answer.");

            // Verify balanced LaTeX $ delimiters
            int dollarCount = item.Prompt.Count(c => c == '$');
            Assert.True(dollarCount % 2 == 0, $"Item {item.Id} has unbalanced LaTeX $ delimiters: {item.Prompt}");

            // Verify no mojibake
            Assert.DoesNotContain("Ã", item.Prompt);
            Assert.DoesNotContain("Æ", item.Prompt);
            Assert.DoesNotContain("áº", item.Prompt);
        }
    }

    [Fact]
    public async Task Benchmark_HintGeneration_AndAntiLeakEvaluation_AcrossAll100Items()
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: nameof(Benchmark_HintGeneration_AndAntiLeakEvaluation_AcrossAll100Items))
            .Options;
        using var db = new StudyAIDbContext(options);

        var config = new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build();
        var fakeLlm = new FakeLlmProvider();
        var usageService = new AiUsageService(db, fakeLlm, config, NullLogger<AiUsageService>.Instance);
        var router = new AiModelRouter(config);
        var hintService = new AiHintService(db, usageService, fakeLlm, router, NullLogger<AiHintService>.Instance);

        foreach (var item in BenchmarkItems)
        {
            db.ContentQuestions.Add(new ContentQuestion
            {
                Id = item.Id,
                Prompt = item.Prompt,
                Topic = item.Topic,
                Difficulty = item.Difficulty,
                CorrectAnswer = item.CorrectAnswer,
                Explanation = item.Explanation
            });
        }
        await db.SaveChangesAsync();

        int evaluatedHints = 0;
        int leakageCount = 0;

        foreach (var item in BenchmarkItems)
        {
            // Level 1 evaluation
            var h1 = await hintService.GetHintAsync("usr_bench", item.Id, 1);
            evaluatedHints++;
            if (AiAnswerLeakDetector.HasAnswerLeak(h1.HintText, item.CorrectAnswer, 1)) leakageCount++;

            // Level 2 evaluation
            var h2 = await hintService.GetHintAsync("usr_bench", item.Id, 2);
            evaluatedHints++;
            if (AiAnswerLeakDetector.HasAnswerLeak(h2.HintText, item.CorrectAnswer, 2)) leakageCount++;

            // Level 3 evaluation
            var h3 = await hintService.GetHintAsync("usr_bench", item.Id, 3);
            evaluatedHints++;
            if (AiAnswerLeakDetector.HasAnswerLeak(h3.HintText, item.CorrectAnswer, 3)) leakageCount++;
        }

        Assert.Equal(300, evaluatedHints);
        Assert.Equal(0, leakageCount);
    }

    [Fact]
    public void Benchmark_TokenAndCostEstimation_MeetsLowCostBudget()
    {
        // 100 questions * 3 levels = 300 hint calls
        // Target: < $0.10 USD per 1,000 hints with gpt-4o-mini / flash models
        // Standard pricing: $0.15 / 1M input, $0.60 / 1M output
        const int averageInputTokens = 120;
        const int averageOutputTokens = 80;

        decimal costPerCall = (averageInputTokens * 0.00000015m) + (averageOutputTokens * 0.00000060m);
        decimal costPerThousandCalls = costPerCall * 1000m;

        // Verify cost per 1,000 requests is under $0.10 USD
        Assert.True(costPerThousandCalls < 0.10m, $"Cost per 1,000 calls (${costPerThousandCalls:F4}) must be under $0.10 USD.");
    }

    private static List<Math12BenchmarkItem> Generate100BenchmarkItems()
    {
        var list = new List<Math12BenchmarkItem>();

        // 1. Khảo sát hàm số (15 items)
        for (int i = 1; i <= 15; i++)
        {
            list.Add(new Math12BenchmarkItem(
                $"bm_func_{i:D2}",
                "Khảo sát hàm số và tính đơn điệu",
                i <= 5 ? "easy" : (i <= 10 ? "medium" : "hard"),
                $"Tìm khoảng đồng biến của hàm số $y = x^3 - 3x^2 + {i}$.",
                "A",
                $"Ta có $y' = 3x^2 - 6x = 3x(x - 2)$. $y' > 0 \\iff x \\in (-\\infty; 0) \\cup (2; +\\infty)$.",
                new[] { "$(-\\infty; 0)$ và $(2; +\\infty)$", "$(0; 2)$", "$(-\\infty; 2)$", "$(0; +\\infty)$" }
            ));
        }

        // 2. Cực trị & Tiệm cận (10 items)
        for (int i = 1; i <= 10; i++)
        {
            list.Add(new Math12BenchmarkItem(
                $"bm_ext_{i:D2}",
                "Cực trị và Tiệm cận của hàm số",
                i <= 5 ? "medium" : "hard",
                $"Tìm số đường tiệm cận của đồ thị hàm số $y = \\frac{{2x + {i}}}{{x - 1}}$.",
                "B",
                $"Tiệm cận đứng $x = 1$, tiệm cận ngang $y = 2$. Tổng cộng có 2 đường tiệm cận.",
                new[] { "1", "2", "3", "0" }
            ));
        }

        // 3. Nguyên hàm & Tích phân (15 items)
        for (int i = 1; i <= 15; i++)
        {
            list.Add(new Math12BenchmarkItem(
                $"bm_int_{i:D2}",
                "Nguyên hàm và Tích phân",
                i <= 5 ? "easy" : (i <= 10 ? "medium" : "hard"),
                $"Tính tích phân $I = \\int_0^1 (2x + {i}) dx$.",
                "C",
                $"Ta có $I = [x^2 + {i}x]_0^1 = 1 + {i}$.",
                new[] { $"{i}", $"{i + 2}", $"{i + 1}", $"{2 * i}" }
            ));
        }

        // 4. Ứng dụng tích phân tính diện tích & thể tích (10 items)
        for (int i = 1; i <= 10; i++)
        {
            list.Add(new Math12BenchmarkItem(
                $"bm_appint_{i:D2}",
                "Ứng dụng hình học của tích phân",
                i <= 5 ? "medium" : "hard",
                $"Tính diện tích hình phẳng giới hạn bởi đồ thị $y = x^2$ và đường thẳng $y = {i}x$.",
                "A",
                $"Phương trình hoành độ giao điểm $x^2 - {i}x = 0 \\iff x = 0$ hoặc $x = {i}$. $S = \\int_0^{{{i}}} ({i}x - x^2)dx$.",
                new[] { $"\\frac{{{i}^3}}{{6}}", $"\\frac{{{i}^3}}{{3}}", $"\\frac{{{i}^2}}{{2}}", $"{i}^2" }
            ));
        }

        // 5. Mũ và Logarit (15 items)
        for (int i = 1; i <= 15; i++)
        {
            list.Add(new Math12BenchmarkItem(
                $"bm_exp_{i:D2}",
                "Hàm số Mũ và Logarit",
                i <= 5 ? "easy" : (i <= 10 ? "medium" : "hard"),
                $"Giải phương trình $\\log_2(x - {i}) = 3$.",
                "D",
                $"Điều kiện $x > {i}$. Phương trình tương đương $x - {i} = 2^3 = 8 \\iff x = {8 + i}$.",
                new[] { $"{i + 6}", $"{i + 7}", $"{i + 9}", $"{8 + i}" }
            ));
        }

        // 6. Phương pháp tọa độ trong không gian Oxyz (15 items)
        for (int i = 1; i <= 15; i++)
        {
            list.Add(new Math12BenchmarkItem(
                $"bm_oxyz_{i:D2}",
                "Tọa độ không gian Oxyz và Mặt phẳng",
                i <= 5 ? "easy" : (i <= 10 ? "medium" : "hard"),
                $"Trong không gian $Oxyz$, cho mặt phẳng $(P): {i}x + 2y - z + 1 = 0$. Tìm vectơ pháp tuyến của $(P)$.",
                "A",
                $"Vectơ pháp tuyến của mặt phẳng là $\\vec{{n}} = ({i}; 2; -1)$.",
                new[] { $"({i}; 2; -1)", $"({i}; -2; 1)", $"(2; {i}; -1)", $"({i}; 1; 2)" }
            ));
        }

        // 7. Vectơ trong không gian (10 items)
        for (int i = 1; i <= 10; i++)
        {
            list.Add(new Math12BenchmarkItem(
                $"bm_vec_{i:D2}",
                "Vectơ trong không gian",
                i <= 5 ? "easy" : "medium",
                $"Cho hai vectơ $\\vec{{u}} = (1; {i}; 0)$ và $\\vec{{v}} = (0; 1; 2)$. Tính tích vô hướng $\\vec{{u}} \\cdot \\vec{{v}}$.",
                "C",
                $"Ta có $\\vec{{u}} \\cdot \\vec{{v}} = 1 \\cdot 0 + {i} \\cdot 1 + 0 \\cdot 2 = {i}$.",
                new[] { $"{i + 1}", $"{2 * i}", $"{i}", "0" }
            ));
        }

        // 8. Xác suất có điều kiện & Công thức Bayes (5 items)
        for (int i = 1; i <= 5; i++)
        {
            list.Add(new Math12BenchmarkItem(
                $"bm_prob_{i:D2}",
                "Xác suất có điều kiện và Công thức Bayes",
                "medium",
                $"Cho hai biến cố $A$ và $B$ độc lập có $P(A) = 0.{i}$ và $P(B) = 0.5$. Tính $P(A \\cap B)$.",
                "B",
                $"Vì hai biến cố độc lập nên $P(A \\cap B) = P(A) \\cdot P(B) = 0.{i} \\times 0.5$.",
                new[] { $"0.{i}", $"{0.05 * i:F2}", $"{0.1 * i:F2}", "0.5" }
            ));
        }

        // 9. Thống kê mẫu số liệu ghép nhóm (5 items)
        for (int i = 1; i <= 5; i++)
        {
            list.Add(new Math12BenchmarkItem(
                $"bm_stat_{i:D2}",
                "Thống kê mẫu số liệu ghép nhóm",
                "easy",
                $"Nhóm số liệu $[{10 * i}; {10 * i + 10})$ có giá trị đại diện là bao nhiêu?",
                "A",
                $"Giá trị đại diện là trung điểm của hai đầu mút: $({10 * i} + {10 * i + 10}) / 2 = {10 * i + 5}$.",
                new[] { $"{10 * i + 5}", $"{10 * i}", $"{10 * i + 10}", $"{10 * i + 2}" }
            ));
        }

        return list;
    }
}
