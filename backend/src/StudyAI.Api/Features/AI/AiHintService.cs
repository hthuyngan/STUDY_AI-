using System.Diagnostics;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace StudyAI.Features.AI;

public class AiHintService : IAiHintService
{
    private readonly IApplicationDbContext _context;
    private readonly IAiUsageService _usageService;
    private readonly ILlmProvider _llmProvider;
    private readonly IAiModelRouter _modelRouter;
    private readonly ILogger<AiHintService> _logger;

    public AiHintService(
        IApplicationDbContext context,
        IAiUsageService usageService,
        ILlmProvider llmProvider,
        IAiModelRouter modelRouter,
        ILogger<AiHintService> logger)
    {
        _context = context;
        _usageService = usageService;
        _llmProvider = llmProvider;
        _modelRouter = modelRouter;
        _logger = logger;
    }

    public AiHintService(
        IApplicationDbContext context,
        IAiUsageService usageService,
        ILlmProvider llmProvider,
        ILogger<AiHintService> logger)
        : this(context, usageService, llmProvider, new AiModelRouter(), logger)
    {
    }

    public AiHintService(
        IApplicationDbContext context,
        IAiUsageService usageService,
        ILogger<AiHintService> logger)
        : this(context, usageService, new FakeLlmProvider(), new AiModelRouter(), logger)
    {
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

        // 1. Direct mode parameter validation
        if (!string.IsNullOrWhiteSpace(mode) &&
            (mode.Equals("exam", StringComparison.OrdinalIgnoreCase) ||
             mode.Equals("test", StringComparison.OrdinalIgnoreCase) ||
             mode.Equals("formal", StringComparison.OrdinalIgnoreCase)))
        {
            throw new UnauthorizedAccessException("Không được phép sử dụng gợi ý AI trong chế độ thi thử hoặc kiểm tra đánh giá.");
        }

        // 2. Database verification of session mode (Never trust client-side mode parameter alone)
        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            var attempt = await _context.AssessmentAttempts.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == sessionId, cancellationToken);

            if (attempt != null)
            {
                // Verify user isolation
                if (!string.IsNullOrWhiteSpace(userId) &&
                    !string.IsNullOrWhiteSpace(attempt.UserId) &&
                    !string.Equals(attempt.UserId, userId, StringComparison.OrdinalIgnoreCase))
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền yêu cầu gợi ý cho phiên làm bài của học sinh khác.");
                }

                // Check assessment mode markers in DB
                if (!string.IsNullOrWhiteSpace(attempt.AssessmentId) &&
                    (attempt.AssessmentId.Contains("exam", StringComparison.OrdinalIgnoreCase) ||
                     attempt.AssessmentId.Contains("test", StringComparison.OrdinalIgnoreCase) ||
                     attempt.AssessmentId.Contains("formal", StringComparison.OrdinalIgnoreCase)))
                {
                    throw new UnauthorizedAccessException("Phiên làm bài này được thiết lập ở chế độ thi/kiểm tra, hệ thống từ chối cung cấp gợi ý.");
                }

                if (!string.IsNullOrWhiteSpace(attempt.SuspendDataJson))
                {
                    try
                    {
                        var jsonNode = JsonNode.Parse(attempt.SuspendDataJson);
                        var internalMode = jsonNode?["mode"]?.GetValue<string>();
                        if (!string.IsNullOrWhiteSpace(internalMode) &&
                            (internalMode.Equals("exam", StringComparison.OrdinalIgnoreCase) ||
                             internalMode.Equals("test", StringComparison.OrdinalIgnoreCase) ||
                             internalMode.Equals("formal", StringComparison.OrdinalIgnoreCase)))
                        {
                            throw new UnauthorizedAccessException("Phiên làm bài này được thiết lập ở chế độ thi/kiểm tra, hệ thống từ chối cung cấp gợi ý.");
                        }
                    }
                    catch (UnauthorizedAccessException)
                    {
                        throw;
                    }
                    catch
                    {
                        // Ignore JSON parsing errors for legacy suspend data
                    }
                }

                if (attempt.CompletionStatus == "completed" || attempt.CompletionStatus == "abandoned")
                {
                    throw new InvalidOperationException("Phiên làm bài đã kết thúc, không thể yêu cầu gợi ý.");
                }
            }
        }

        if (string.IsNullOrWhiteSpace(questionId))
        {
            throw new ArgumentException("Mã câu hỏi (QuestionId) không được để trống.", nameof(questionId));
        }

        var sw = Stopwatch.StartNew();

        var question = await _context.ContentQuestions.AsNoTracking()
            .Include(q => q.Lesson)
            .ThenInclude(l => l!.Chapter)
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
        string hintText = string.Empty;
        string activeProvider = "RuleBasedSocraticFallback";
        bool isFallback = true;

        // Extract LaTeX formulas from question prompt
        var latexMatches = Regex.Matches(question.Prompt, @"(\$[^$]+\$|\$\$[^$]+\$\$)");
        foreach (Match m in latexMatches)
        {
            if (!mathFormulas.Contains(m.Value)) mathFormulas.Add(m.Value);
        }

        string topic = !string.IsNullOrWhiteSpace(question.Topic) ? question.Topic : "Kiến thức trọng tâm Toán 12";
        string lessonTitle = question.Lesson?.Title ?? "Bài học liên quan";
        string chapterTitle = question.Lesson?.Chapter?.Title ?? "Toán lớp 12";

        // Try Live LLM Generation if configured
        bool generatedViaLlm = false;
        if (_llmProvider.IsConfigured && !(_llmProvider is FakeLlmProvider))
        {
            try
            {
                var systemPrompt = "Bạn là AI Tutor sư phạm chuyên môn Toán 12 chuẩn chương trình GDPT 2018 Việt Nam. " +
                                   "Nhiệm vụ của bạn là đưa ra GỢI Ý SOCRATIC giúp học sinh tự tư duy, TUYỆT ĐỐI KHÔNG giải bài hoàn chỉnh, " +
                                   "TUYỆT ĐỐI KHÔNG tiết lộ đáp án lựa chọn (A, B, C, D) hay kết quả số cuối cùng. " +
                                   "Sử dụng công thức LaTeX trong dấu $...$ hoặc $$...$$. Trả lời ngắn gọn, chuẩn xác, sư phạm tích cực.";

                var userPrompt = $"Đề bài câu hỏi: {question.Prompt}\n" +
                                 $"Chương: {chapterTitle} | Bài: {lessonTitle} | Chủ đề: {topic} | Dạng: {question.Type}\n" +
                                 $"Yêu cầu gợi ý Cấp độ {level}:\n" +
                                 (level == 1 ? "Cấp độ 1: Nhắc lại định nghĩa, định lý cốt lõi, hướng dẫn học sinh quan sát đại lượng và điều kiện xác định." :
                                  level == 2 ? "Cấp độ 2: Hướng dẫn quy trình 2-3 bước phương pháp giải toán tương ứng dạng này." :
                                  "Cấp độ 3: Chỉ ra điểm nút thắt then chốt nhất của phép biến đổi mà không cho ra đáp án cuối.");

                var taskType = level switch
                {
                    1 => AiTaskType.HintLevel1,
                    2 => AiTaskType.HintLevel2,
                    _ => AiTaskType.HintLevel3
                };
                var route = _modelRouter.Route(taskType, question.Difficulty, question.Prompt.Length);

                var llmReq = new LlmCompletionRequest(
                    Messages: new List<LlmChatMessage> { new("user", userPrompt) },
                    SystemPrompt: systemPrompt,
                    Temperature: route.Temperature,
                    MaxTokens: route.MaxTokens,
                    Model: route.ModelName,
                    TaskType: route.TaskName,
                    CancellationToken: cancellationToken);

                var llmRes = await _llmProvider.GenerateCompletionAsync(llmReq);
                if (!string.IsNullOrWhiteSpace(llmRes.Content))
                {
                    hintText = AiAnswerLeakDetector.SanitizeText(llmRes.Content, question.CorrectAnswer, level);
                    activeProvider = _llmProvider.ProviderName;
                    isFallback = false;
                    generatedViaLlm = true;

                    // Extract formulas from LLM content
                    var llmFormulaMatches = Regex.Matches(hintText, @"(\$[^$]+\$|\$\$[^$]+\$\$)");
                    foreach (Match m in llmFormulaMatches)
                    {
                        if (!mathFormulas.Contains(m.Value)) mathFormulas.Add(m.Value);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gọi LLM API thất bại, chuyển sang bộ quy tắc sư phạm Socratic Fallback: {Message}", ex.Message);
            }
        }

        // Rule-Based Socratic Pedagogical Engine (Used when LLM not configured or as fallback)
        if (!generatedViaLlm)
        {
            var (ruleHint, ruleSteps, ruleFormulas) = GenerateTopicAdaptedHint(
                level,
                topic,
                lessonTitle,
                chapterTitle,
                question.Prompt,
                question.Explanation,
                question.Type);

            hintText = AiAnswerLeakDetector.SanitizeText(ruleHint, question.CorrectAnswer, level);
            nextSteps.AddRange(ruleSteps);
            foreach (var f in ruleFormulas)
            {
                if (!mathFormulas.Contains(f)) mathFormulas.Add(f);
            }
            activeProvider = _llmProvider.IsConfigured ? _llmProvider.ProviderName : "RuleBasedSocraticFallback";
            isFallback = !(_llmProvider.IsConfigured && !(_llmProvider is FakeLlmProvider));
        }

        // Add standard next steps if empty
        if (nextSteps.Count == 0)
        {
            if (level == 1)
            {
                nextSteps.Add("Xác định tập xác định và các dữ kiện đã cho");
                nextSteps.Add($"Nhớ lại định lý cơ bản của chủ đề \"{topic}\"");
            }
            else if (level == 2)
            {
                nextSteps.Add("Viết công thức giải tích tương ứng");
                nextSteps.Add("Tiến hành các bước biến đổi trung gian");
            }
            else
            {
                nextSteps.Add("Thực hiện phép tính bước cuối cùng");
                nextSteps.Add("Đối chiếu kết quả và kiểm tra điều kiện nghiệm");
            }
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
            provider: activeProvider,
            model: isFallback ? "rule-based-socratic-v1" : "gpt-4o-mini",
            inputTokens: 60,
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
            SuggestedNextSteps = nextSteps,
            Provider = activeProvider,
            IsFallback = isFallback
        };
    }

    private static (string HintText, List<string> Steps, List<string> Formulas) GenerateTopicAdaptedHint(
        int level,
        string topic,
        string lessonTitle,
        string chapterTitle,
        string prompt,
        string? explanation,
        string? questionType)
    {
        var steps = new List<string>();
        var formulas = new List<string>();
        string lower = (topic + " " + lessonTitle + " " + prompt).ToLowerInvariant();

        // 1. Topic: Đạo hàm, đơn điệu, cực trị, tiệm cận, GTLN - GTNN
        if (lower.Contains("đơn điệu") || lower.Contains("đồng biến") || lower.Contains("nghịch biến") ||
            lower.Contains("cực trị") || lower.Contains("cực đại") || lower.Contains("cực tiểu") ||
            lower.Contains("đạo hàm") || lower.Contains("tiệm cận") || lower.Contains("giá trị lớn nhất"))
        {
            formulas.Add("$y' = f'(x)$");
            if (level == 1)
            {
                return (
                    $"💡 **Gợi ý định hướng (Cấp độ 1):**\n\n" +
                    $"Bài toán thuộc chuyên đề **\"{topic}\"** trong bài *\"{lessonTitle}\"*.\n\n" +
                    $"• Xét dấu của đạo hàm bậc nhất $y' = f'(x)$ trên từng khoảng xác định.\n" +
                    $"• Hàm số đồng biến khi $y' \\ge 0$ và nghịch biến khi $y' \\le 0$ (dấu bằng chỉ tại hữu hạn điểm).\n" +
                    $"• Hãy tìm tập xác định $D$ của hàm số trước tiên.",
                    new List<string> { "Tìm tập xác định D của hàm số", "Tính đạo hàm bậc nhất y' = f'(x)" },
                    formulas
                );
            }
            if (level == 2)
            {
                formulas.Add("$f'(x) = 0$");
                return (
                    $"📐 **Gợi ý phương pháp (Cấp độ 2):**\n\n" +
                    $"Thực hiện theo 3 bước chuẩn:\n" +
                    $"1. **Bước 1:** Tính đạo hàm $y' = f'(x)$ và giải phương trình $f'(x) = 0$ tìm các nghiệm $x_i \\in D$.\n" +
                    $"2. **Bước 2:** Lập bảng xét dấu của $y'$ hoặc bảng biến thiên hoàn chỉnh.\n" +
                    $"3. **Bước 3:** Đọc các khoảng đơn điệu hoặc điểm cực trị từ bảng biến thiên.",
                    new List<string> { "Giải phương trình y' = 0", "Lập bảng xét dấu của y'" },
                    formulas
                );
            }

            string step3Snippet = ExtractSafeExplanationSnippet(explanation, "Xét dấu y' qua các nghiệm bội lẻ và nghiệm bội chẵn để đưa ra kết luận.");
            return (
                $"🎯 **Gợi ý bước then chốt (Cấp độ 3):**\n\n" +
                $"{step3Snippet}\n\n" +
                $"Chú ý quy tắc đan dấu: qua nghiệm bội chẵn thì $y'$ không đổi dấu, qua nghiệm đơn hoặc bội lẻ thì $y'$ đổi dấu.",
                new List<string> { "Xác định tính chất nghiệm đơn/bội chẵn", "Kết luận khoảng hoặc giá trị theo yêu cầu đề bài" },
                formulas
            );
        }

        // 2. Topic: Tọa độ không gian Oxyz, Vectơ, Mặt phẳng, Đường thẳng, Mặt cầu
        if (lower.Contains("oxyz") || lower.Contains("mặt phẳng") || lower.Contains("đường thẳng") ||
            lower.Contains("mặt cầu") || lower.Contains("vectơ") || lower.Contains("khoảng cách"))
        {
            formulas.Add("$\\vec{n} = (A; B; C)$");
            formulas.Add("$\\vec{u} = (a; b; c)$");

            if (level == 1)
            {
                return (
                    $"💡 **Gợi ý định hướng (Cấp độ 1):**\n\n" +
                    $"Bài toán hình học giải tích trong không gian thuộc **\"{topic}\"**.\n\n" +
                    "• Xác định rõ các yếu tố cơ bản: điểm đi qua $M(x_0; y_0; z_0)$ và vectơ định hướng (vectơ pháp tuyến $\\vec{n}$ đối với mặt phẳng, hoặc vectơ chỉ phương $\\vec{u}$ đối với đường thẳng).\n" +
                    "• Nhớ lại điều kiện vuông góc: $\\vec{u} \\perp \\vec{v} \\iff \\vec{u} \\cdot \\vec{v} = 0$.",
                    new List<string> { "Xác định tọa độ điểm đã biết", "Tìm mối liên hệ giữa các vectơ pháp tuyến / chỉ phương" },
                    formulas
                );
            }
            if (level == 2)
            {
                formulas.Add("$\\vec{n} = [\\vec{u}_1, \\vec{u}_2]$");
                return (
                    "📐 **Gợi ý phương pháp (Cấp độ 2):**\n\n" +
                    "1. **Bước 1:** Nếu mặt phẳng song song hoặc chứa hai đường thẳng, vectơ pháp tuyến được xác định qua tích có hướng: $\\vec{n} = [\\vec{u}_1, \\vec{u}_2]$.\n" +
                    "2. **Bước 2:** Viết phương trình tổng quát mặt phẳng: $A(x - x_0) + B(y - y_0) + C(z - z_0) = 0$.\n" +
                    "3. **Bước 3:** Khai triển và rút gọn để đưa về dạng chuẩn $Ax + By + Cz + D = 0$.",
                    new List<string> { "Tính tích có hướng của 2 vectơ", "Thế tọa độ điểm đi qua vào phương trình tổng quát" },
                    formulas
                );
            }

            string step3Snippet = ExtractSafeExplanationSnippet(explanation, "Sử dụng công thức khoảng cách hoặc điều kiện vuông góc để giải tìm tham số ẩn.");
            return (
                $"🎯 **Gợi ý bước then chốt (Cấp độ 3):**\n\n" +
                $"{step3Snippet}\n\n" +
                $"Kiểm tra cẩn thận dấu của các thành phần tọa độ khi tính định thức cấp hai của tích có hướng.",
                new List<string> { "Thực hiện phép tính rút gọn tọa độ", "Đối chiếu với các phương án lựa chọn" },
                formulas
            );
        }

        // 3. Topic: Nguyên hàm, Tích phân & Ứng dụng
        if (lower.Contains("nguyên hàm") || lower.Contains("tích phân") || lower.Contains("diện tích") || lower.Contains("thể tích"))
        {
            formulas.Add("$\\int f(x)dx = F(x) + C$");
            if (level == 1)
            {
                return (
                    $"💡 **Gợi ý định hướng (Cấp độ 1):**\n\n" +
                    $"Bài toán thuộc phần **\"{topic}\"**.\n\n" +
                    $"• Quan sát biểu thức dưới dấu tích phân xem có dạng hàm cơ bản hay hàm hợp.\n" +
                    $"• Nhận diện xem biểu thức có chứa đồng thời $u(x)$ và $u'(x)dx$ hay là tích của hai hàm số khác loại.",
                    new List<string> { "Quan sát cấu trúc hàm số dưới dấu tích phân", "Xác định xem áp dụng bảng cơ bản, đổi biến hay từng phần" },
                    formulas
                );
            }
            if (level == 2)
            {
                formulas.Add("$\\int u dv = uv - \\int v du$");
                return (
                    $"📐 **Gợi ý phương pháp (Cấp độ 2):**\n\n" +
                    $"• Nếu có $f(u) \\cdot u'(x)dx$: Dùng phương pháp đổi biến số, đặt $t = u(x) \\implies dt = u'(x)dx$.\n" +
                    $"• Nếu là tích hai hàm khác loại (đa thức $\\times$ lượng giác/mũ/logarit): Dùng phương pháp từng phần: đặt $u$ và $dv$ theo thứ tự ưu tiên: *Nhất lô, nhì đa, tam lượng, tứ mũ*.\n" +
                    $"• Nhớ đổi cận nếu đang tính tích phân xác định.",
                    new List<string> { "Đặt ẩn phụ hoặc phân tích u, dv", "Đổi cận tích phân nếu có" },
                    formulas
                );
            }

            string step3Snippet = ExtractSafeExplanationSnippet(explanation, "Thay cận vào công thức Newton-Leibniz $F(b) - F(a)$ và tính toán cẩn thận.");
            return (
                $"🎯 **Gợi ý bước then chốt (Cấp độ 3):**\n\n" +
                $"{step3Snippet}\n\n" +
                $"Tránh nhầm lẫn dấu khi áp dụng công thức $F(b) - F(a)$.",
                new List<string> { "Tính giá trị tại hai đầu mút cận", "Rút gọn biểu thức kết quả" },
                formulas
            );
        }

        // 4. Default General Math 12 Socratic Guidance
        formulas.Add("f(x)");
        if (level == 1)
        {
            return (
                $"💡 **Gợi ý định hướng (Cấp độ 1):**\n\n" +
                $"Câu hỏi này thuộc chủ đề **\"{topic}\"** trong bài học *\"{lessonTitle}\"* ({chapterTitle}).\n\n" +
                $"Hãy phân tích kỹ các giả thiết của đề bài: đại lượng đã cho, đại lượng cần tìm và các điều kiện ràng buộc.\n" +
                $"Nhớ lại định nghĩa và tính chất cơ bản được giới thiệu trong sách giáo khoa Toán 12.",
                new List<string> { "Đọc kỹ đề bài và gạch chân từ khóa chính", "Liệt kê các công thức liên quan đến chủ đề này" },
                formulas
            );
        }
        if (level == 2)
        {
            return (
                $"📐 **Gợi ý phương pháp (Cấp độ 2):**\n\n" +
                $"Để giải bài toán này, bạn hãy triển khai theo 3 bước chuẩn:\n" +
                $"1. **Bước 1:** Biểu diễn đại lượng cần tìm theo các ẩn số thích hợp.\n" +
                $"2. **Bước 2:** Thiết lập phương trình hoặc áp dụng công thức biến đổi tương đương.\n" +
                $"3. **Bước 3:** Giải phương trình hoặc bất phương trình và kiểm tra điều kiện nghiệm.",
                new List<string> { "Lập phương trình hoặc hệ thức liên hệ", "Biến đổi rút gọn biểu thức" },
                formulas
            );
        }

        string generalStep3 = ExtractSafeExplanationSnippet(explanation, "Thực hiện phép tính rút gọn cuối cùng và so sánh với 4 phương án đề bài.");
        return (
            $"🎯 **Gợi ý bước then chốt (Cấp độ 3):**\n\n" +
            $"{generalStep3}\n\n" +
            $"Chú ý đối chiếu kết quả với điều kiện xác định của bài toán trước khi đưa ra quyết định chọn phương án.",
            new List<string> { "Tính toán bước cuối cùng", "Đối chiếu các phương án để chọn đáp án đúng" },
            formulas
        );
    }

    private static string ExtractSafeExplanationSnippet(string? explanation, string defaultSnippet)
    {
        if (string.IsNullOrWhiteSpace(explanation)) return defaultSnippet;

        var lines = explanation.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        // Find a middle derivation line, avoiding direct answer reveals
        var candidates = lines
            .Where(l => !Regex.IsMatch(l, @"(Đáp án|Chọn\s+[A-D]|Do đó chọn|Vậy ta chọn)", RegexOptions.IgnoreCase))
            .ToList();

        if (candidates.Count > 0)
        {
            // Pick a good middle deduction line
            return candidates[Math.Min(1, candidates.Count - 1)];
        }

        return defaultSnippet;
    }

    private static string SanitizeAntiLeak(string text, string? correctAnswer)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        // Replace direct answer revealing patterns
        var sanitized = Regex.Replace(
            text,
            @"(Đáp án là|Đáp án đúng là|Chọn đáp án|Do đó ta chọn|Vậy chọn)\s*:?\s*([A-D])",
            "Đối chiếu các bước biến đổi trên với các phương án lựa chọn",
            RegexOptions.IgnoreCase);

        sanitized = Regex.Replace(
            sanitized,
            @"\b(Chọn\s+[A-D])\b",
            "Đối chiếu phương án",
            RegexOptions.IgnoreCase);

        if (!string.IsNullOrWhiteSpace(correctAnswer) && correctAnswer.Length <= 2)
        {
            sanitized = Regex.Replace(
                sanitized,
                $@"\b(đáp án\s+là\s+{Regex.Escape(correctAnswer)})\b",
                "hãy chọn phương án tương ứng",
                RegexOptions.IgnoreCase);
        }

        return sanitized;
    }
}