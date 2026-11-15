using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Infrastructure.Services;

public class AiHintService : IAiHintService
{
    private readonly IApplicationDbContext _context;
    private readonly IAiUsageService _usageService;
    private readonly ILogger<AiHintService> _logger;

    public AiHintService(
        IApplicationDbContext context,
        IAiUsageService usageService,
        ILogger<AiHintService> logger)
    {
        _context = context;
        _usageService = usageService;
        _logger = logger;
    }

    public async Task<HintResponseDto> GetHintAsync(
        string userId,
        string questionId,
        int hintLevel,
        string? sessionId = null,
        string? mode = null,
        CancellationToken cancellationToken = default)
    {
        var config = _usageService.GetFeatureConfig();
        if (!config.EnableHints)
        {
            throw new InvalidOperationException("Chức năng Gợi ý AI hiện đang tạm tắt theo chính sách quản trị.");
        }

        // Assessment mode security check: no hints in exam/test mode
        if (!string.IsNullOrWhiteSpace(mode) &&
            (mode.Equals("exam", StringComparison.OrdinalIgnoreCase) ||
             mode.Equals("test", StringComparison.OrdinalIgnoreCase) ||
             mode.Equals("formal", StringComparison.OrdinalIgnoreCase)))
        {
            throw new UnauthorizedAccessException("Không được phép sử dụng gợi ý AI trong chế độ thi thử hoặc kiểm tra đánh giá.");
        }

        if (string.IsNullOrWhiteSpace(questionId))
        {
            throw new ArgumentException("Mã câu hỏi (QuestionId) không được để trống.", nameof(questionId));
        }

        var sw = Stopwatch.StartNew();

        var question = await _context.ContentQuestions.AsNoTracking()
            .Include(q => q.Lesson)
            .FirstOrDefaultAsync(q => q.Id == questionId, cancellationToken);

        if (question == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy câu hỏi với mã '{questionId}'.");
        }

        int level = Math.Clamp(hintLevel, 1, 3);
        string levelName = level switch
        {
            1 => "Gợi ý định hướng (Cấp độ 1 - Khái niệm & Nhận diện dạng)",
            2 => "Gợi ý phương pháp (Cấp độ 2 - Công thức & Các bước biến đổi)",
            _ => "Gợi ý bước then chốt (Cấp độ 3 - Mấu chốt biến đổi)"
        };

        var mathFormulas = new List<string>();
        var nextSteps = new List<string>();
        string hintText;

        // Extract LaTeX formulas from question prompt
        var latexMatches = Regex.Matches(question.Prompt, @"(\$[^$]+\$|\$\$[^$]+\$\$)");
        foreach (Match m in latexMatches)
        {
            if (!mathFormulas.Contains(m.Value)) mathFormulas.Add(m.Value);
        }

        string topic = !string.IsNullOrWhiteSpace(question.Topic) ? question.Topic : "Kiến thức trọng tâm";
        string lessonTitle = question.Lesson?.Title ?? "Bài học liên quan";

        if (level == 1)
        {
            hintText = $"💡 **Gợi ý định hướng (Cấp độ 1):**\n\n" +
                       $"Câu hỏi này thuộc chủ đề **\"{topic}\"** (liên quan tới bài *\"{lessonTitle}\"*).\n\n" +
                       $"Hãy quan sát kỹ giả thiết của bài toán: đại lượng nào là biến số, điều kiện xác định là gì, và yêu cầu cần tìm là gì.\n" +
                       $"Nhớ lại định nghĩa và tính chất cơ bản của dạng toán này trước khi bắt đầu tính toán.";

            nextSteps.Add("Đọc kỹ giả thiết và xác định điều kiện xác định");
            nextSteps.Add($"Nhớ lại định lý cơ bản của chủ đề \"{topic}\"");
        }
        else if (level == 2)
        {
            hintText = $"📐 **Gợi ý phương pháp (Cấp độ 2):**\n\n" +
                       $"Để xử lý bài toán này, bạn hãy triển khai theo 3 bước chuẩn:\n" +
                       $"1. **Bước 1:** Viết công thức tổng quát liên hệ giữa các đại lượng trong đề bài.\n" +
                       $"2. **Bước 2:** Thực hiện biến đổi tương đương hoặc tính đạo hàm / nguyên hàm theo quy tắc cơ bản.\n" +
                       $"3. **Bước 3:** Lập bảng biến thiên hoặc giải phương trình tìm giá trị nghiệm thích hợp.";

            nextSteps.Add("Áp dụng công thức giải tích chuẩn");
            nextSteps.Add("Biến đổi rút gọn biểu thức");
            nextSteps.Add("Loại bỏ các trường hợp nghiệm ngoại lai nếu có");
        }
        else
        {
            // Level 3: Point to critical step without leaking answer key directly
            string explanationSnippet = "Áp dụng bước biến đổi cuối cùng để rút ra kết luận nghiệm.";
            if (!string.IsNullOrWhiteSpace(question.Explanation))
            {
                var lines = question.Explanation.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                if (lines.Length > 0)
                {
                    // Pick the middle deduction line, avoid final line if it reveals answer letter
                    var chosenLine = lines.FirstOrDefault(l => !l.Contains("Đáp án") && !l.Contains("Chọn ")) ?? lines[0];
                    explanationSnippet = chosenLine.Trim();
                }
            }

            hintText = $"🎯 **Gợi ý bước then chốt (Cấp độ 3):**\n\n" +
                       $"{explanationSnippet}\n\n" +
                       $"Thực hiện phép tính rút gọn cuối cùng và đối chiếu với 4 phương án để tìm ra kết quả đúng.";

            nextSteps.Add("Thực hiện phép tính bước cuối");
            nextSteps.Add("Đối chiếu kết quả và chọn đáp án");
        }

        // Record hint usage in database
        try
        {
            var hintUsage = new AiHintUsage
            {
                Id = $"hnt_{Guid.NewGuid():N}",
                UserId = userId,
                QuestionId = questionId,
                SessionId = sessionId,
                HintLevel = level,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _context.AiHintUsages.Add(hintUsage);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể ghi nhận lượt sử dụng hint vào DB: {Message}", ex.Message);
        }

        sw.Stop();

        // Log AI usage
        await _usageService.LogUsageAsync(
            userId: userId,
            feature: $"hint_level_{level}",
            provider: "RuleBasedSocraticEngine",
            model: "socratic-hint-v1",
            inputTokens: 50,
            outputTokens: hintText.Length / 4,
            latencyMs: (int)sw.ElapsedMilliseconds,
            status: "success",
            cancellationToken: cancellationToken);

        return new HintResponseDto
        {
            QuestionId = question.Id,
            HintLevel = level,
            HintLevelName = levelName,
            HintText = hintText,
            MathFormulas = mathFormulas,
            SuggestedNextSteps = nextSteps
        };
    }
}
