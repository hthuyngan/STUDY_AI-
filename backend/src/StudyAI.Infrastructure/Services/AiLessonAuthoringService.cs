using System.Text.Json;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Infrastructure.Services;

public class AiLessonAuthoringService : IAiLessonAuthoringService
{
    private readonly StudyAIDbContext _context;
    private readonly ILlmProvider _llmProvider;
    private readonly ILogger<AiLessonAuthoringService> _logger;

    public AiLessonAuthoringService(
        StudyAIDbContext context,
        ILlmProvider llmProvider,
        ILogger<AiLessonAuthoringService> logger)
    {
        _context = context;
        _llmProvider = llmProvider;
        _logger = logger;
    }

    public async Task<LessonAuthoringOutlineResponseDto> GenerateLessonOutlineDraftAsync(
        string userId,
        LessonAuthoringOutlineRequestDto request,
        CancellationToken cancellationToken = default)
    {
        // Try calling LLM for dynamic creative drafting
        string prompt = $"Bạn là chuyên gia sư phạm biên soạn sách giáo khoa Toán 12 theo chương trình GDPT 2018.\n" +
            $"Hãy lập đề cương và nội dung chi tiết bài giảng cho bài học:\n" +
            $"Môn học: {request.SubjectName}, Khối {request.TargetGrade}\n" +
            $"Chương: {request.ChapterTitle}\n" +
            $"Tên bài học: {request.LessonTitle}\n\n" +
            $"Yêu cầu định dạng JSON với các khóa:\n" +
            $"- learningObjectives: mảng chuỗi 3 mục tiêu bài học\n" +
            $"- introductionDraft: chuỗi mở đầu bài học trực quan\n" +
            $"- keyDefinitions: mảng chuỗi 2 định nghĩa cơ bản\n" +
            $"- coreFormulasKaTeX: mảng chuỗi các công thức KaTeX ($...$)\n" +
            $"- workedExamples: mảng chuỗi 2 ví dụ mẫu có lời giải chi tiết\n" +
            $"- pedagogicalNotes: lưu ý sư phạm và bẫy sai lầm của học sinh";

        try
        {
            var completion = await _llmProvider.GenerateCompletionAsync(new LlmCompletionRequest(
                Messages: new List<LlmChatMessage> { new("user", prompt) },
                SystemPrompt: "Bạn là chuyên gia biên soạn học liệu Toán học. Hãy trả lời JSON thuần túy.",
                Temperature: 0.3,
                MaxTokens: 1500,
                CancellationToken: cancellationToken
            ));

            if (!string.IsNullOrWhiteSpace(completion.Content))
            {
                var content = completion.Content.Trim();
                int start = content.IndexOf('{');
                int end = content.LastIndexOf('}');
                if (start >= 0 && end > start)
                {
                    var jsonStr = content.Substring(start, end - start + 1);
                    var parsed = JsonSerializer.Deserialize<LessonAuthoringOutlineResponseDto>(jsonStr, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null && parsed.LearningObjectives.Count > 0)
                    {
                        parsed.LessonTitle = request.LessonTitle;
                        return parsed;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM outline generation fallback: {Message}", ex.Message);
        }

        // Deterministic Pedagogical Template Fallback
        return new LessonAuthoringOutlineResponseDto
        {
            LessonTitle = request.LessonTitle,
            LearningObjectives = new List<string>
            {
                $"Nắm vững định nghĩa và ý nghĩa hình học của '{request.LessonTitle}'.",
                "Biết cách vận dụng quy tắc và công thức toán học để giải các bài toán trọng tâm.",
                "Nhận diện và tránh các bẫy xét dấu hoặc nhầm lẫn điều kiện xác định thường gặp."
            },
            IntroductionDraft = $"Bài học '{request.LessonTitle}' là một trong những chuyên đề then chốt trong chương trình Toán 12, xuất hiện thường xuyên trong các đề thi tốt nghiệp THPT.",
            KeyDefinitions = new List<string>
            {
                $"Định nghĩa 1: Cho hàm số $y = f(x)$ xác định trên khoảng $(a; b)$...",
                "Định lý then chốt: Điều kiện cần và đủ để hàm số đạt tính chất đặc trưng..."
            },
            CoreFormulasKaTeX = new List<string>
            {
                "$f'(x) = \\lim_{\\Delta x \\to 0} \\frac{f(x + \\Delta x) - f(x)}{\\Delta x}$",
                "$y - y_0 = f'(x_0)(x - x_0)$"
            },
            WorkedExamples = new List<string>
            {
                "Ví dụ 1: Tìm các khoảng đơn điệu của hàm số $y = x^3 - 3x^2 + 2$.\nLời giải: Tập xác định $D = \\mathbb{R}$. Đạo hàm $y' = 3x^2 - 6x = 3x(x - 2)$. Cho $y' = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. Bảng xét dấu cho thấy hàm số đồng biến trên $(-\\infty; 0)$ và $(2; +\\infty)$.",
                "Ví dụ 2: Tìm giá trị lớn nhất và nhỏ nhất của hàm số $f(x) = x + \\frac{4}{x}$ trên $[1; 3]$."
            },
            PedagogicalNotes = "Giáo viên lưu ý nhắc học sinh luôn tìm tập xác định trước khi tính đạo hàm và xét dấu."
        };
    }

    public async Task<List<CheckpointQuestionDraftDto>> GenerateCheckpointQuestionsAsync(
        string userId,
        GenerateCheckpointQuestionsRequestDto request,
        CancellationToken cancellationToken = default)
    {
        int count = Math.Clamp(request.QuestionCount, 1, 5);
        var result = new List<CheckpointQuestionDraftDto>();

        for (int i = 1; i <= count; i++)
        {
            result.Add(new CheckpointQuestionDraftDto
            {
                Prompt = $"Câu {i}: Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{{R}}$ có bảng xét dấu đạo hàm như hình vẽ. Hàm số đồng biến trên khoảng nào dưới đây?",
                Options = new List<string>
                {
                    "A. $(-\\infty; 0)$",
                    "B. $(0; 2)$",
                    "C. $(2; +\\infty)$",
                    "D. $(-\\infty; 2)$"
                },
                CorrectAnswer = "A",
                Explanation = "Dựa vào bảng xét dấu, $f'(x) > 0$ trên $(-\\infty; 0)$ nên hàm số đồng biến trên khoảng $(-\\infty; 0)$.",
                CognitiveLevel = request.TargetDifficulty
            });
        }

        return await Task.FromResult(result);
    }
}

