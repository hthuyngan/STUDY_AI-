using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Infrastructure.Services;

public class AiTutorService : IAiTutorService
{
    private readonly IApplicationDbContext _context;
    private readonly ILlmProvider _llmProvider;
    private readonly ILogger<AiTutorService> _logger;
    private readonly IConfiguration? _configuration;

    public const int MaxMessageLength = 2000;
    public const int MaxHistoryMessages = 10;

    public AiTutorService(
        IApplicationDbContext context,
        ILlmProvider llmProvider,
        ILogger<AiTutorService> logger,
        IConfiguration? configuration = null)
    {
        _context = context;
        _llmProvider = llmProvider;
        _logger = logger;
        _configuration = configuration;
    }

    public AiProviderStatusDto GetProviderStatus()
    {
        if (_llmProvider is OpenAiLlmProvider && _llmProvider.IsConfigured)
        {
            var model = _configuration?["Llm:Model"] ?? "gpt-4o-mini";
            return new AiProviderStatusDto("openai", "AI thật", true, model);
        }

        if (_llmProvider is FakeLlmProvider)
        {
            return new AiProviderStatusDto("fake", "Chế độ mô phỏng", true, "fake-pedagogical-v1");
        }

        return new AiProviderStatusDto("unconfigured", "AI chưa sẵn sàng", false, null);
    }

    public async Task<List<AiConversationSummaryDto>> GetUserConversationsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new List<AiConversationSummaryDto>();

        var list = await _context.AiConversations
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .Select(c => new AiConversationSummaryDto(
                c.Id,
                c.UserId,
                c.Title,
                c.Subject,
                c.LessonId,
                c.Lesson != null ? c.Lesson.Title : null,
                c.AssistanceMode,
                c.LearningContextJson,
                c.CreatedAt,
                c.UpdatedAt,
                c.Messages.Count
            ))
            .ToListAsync(cancellationToken);

        return list;
    }

    public async Task<AiConversationDetailDto?> GetConversationDetailAsync(
        string userId,
        string conversationId,
        CancellationToken cancellationToken = default)
    {
        var conv = await _context.AiConversations
            .AsNoTracking()
            .Include(c => c.Lesson)
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);

        if (conv == null) return null;
        if (conv.UserId != userId) return null; // Ownership protection: return null -> 404

        var orderedMessages = conv.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new AiMessageDto(
                m.Id,
                m.ConversationId,
                m.Role,
                m.Content,
                m.SuggestedActionsJson,
                m.LearningContextSnapshotJson,
                m.AssistanceMode,
                m.TokensUsed,
                m.CreatedAt
            ))
            .ToList();

        return new AiConversationDetailDto(
            conv.Id,
            conv.UserId,
            conv.Title,
            conv.Subject,
            conv.LessonId,
            conv.Lesson?.Title,
            conv.AssistanceMode,
            conv.LearningContextJson,
            conv.CreatedAt,
            conv.UpdatedAt,
            orderedMessages
        );
    }

    public async Task<AiConversationDetailDto> CreateConversationAsync(
        string userId,
        string userRole,
        CreateAiConversationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId không được để trống.", nameof(userId));

        // If lessonId is specified, validate existence and permissions
        string? lessonId = null;
        string? lessonTitle = null;

        if (!string.IsNullOrWhiteSpace(request.LessonId))
        {
            var lesson = await _context.ContentLessons
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == request.LessonId, cancellationToken);

            if (lesson != null)
            {
                var isLearner = string.Equals(userRole, "learner", StringComparison.OrdinalIgnoreCase);
                if (isLearner && !string.Equals(lesson.Status, "published", StringComparison.OrdinalIgnoreCase))
                {
                    throw new UnauthorizedAccessException("Không có quyền truy cập bài học chưa xuất bản.");
                }

                lessonId = lesson.Id;
                lessonTitle = lesson.Title;
            }
        }

        var convId = $"conv_{Guid.NewGuid():N}";
        var title = !string.IsNullOrWhiteSpace(request.Title)
            ? request.Title.Trim()
            : (lessonTitle != null ? $"Hỏi về bài: {lessonTitle}" : "Cuộc trò chuyện mới");

        if (title.Length > 255) title = title[..255];

        var conv = new AiConversation
        {
            Id = convId,
            UserId = userId,
            Title = title,
            Subject = request.Subject,
            LessonId = lessonId,
            AssistanceMode = !string.IsNullOrWhiteSpace(request.AssistanceMode) ? request.AssistanceMode : "explain",
            LearningContextJson = request.LearningContextJson,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.AiConversations.Add(conv);
        await _context.SaveChangesAsync(cancellationToken);

        return new AiConversationDetailDto(
            conv.Id,
            conv.UserId,
            conv.Title,
            conv.Subject,
            conv.LessonId,
            lessonTitle,
            conv.AssistanceMode,
            conv.LearningContextJson,
            conv.CreatedAt,
            conv.UpdatedAt,
            new List<AiMessageDto>()
        );
    }

    public async Task<bool> UpdateConversationTitleAsync(
        string userId,
        string conversationId,
        string newTitle,
        CancellationToken cancellationToken = default)
    {
        var conv = await _context.AiConversations
            .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);

        if (conv == null || conv.UserId != userId) return false;

        var trimmed = newTitle.Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) return false;
        if (trimmed.Length > 255) trimmed = trimmed[..255];

        conv.Title = trimmed;
        conv.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteConversationAsync(
        string userId,
        string conversationId,
        CancellationToken cancellationToken = default)
    {
        var conv = await _context.AiConversations
            .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);

        if (conv == null || conv.UserId != userId) return false;

        _context.AiConversations.Remove(conv);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<SendAiMessageResponseDto> SendMessageAsync(
        string userId,
        string userRole,
        string conversationId,
        SendAiMessageRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var rawMessage = request.Message?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(rawMessage))
        {
            throw new ArgumentException("Nội dung tin nhắn không được để trống.", nameof(request.Message));
        }

        if (rawMessage.Length > MaxMessageLength)
        {
            throw new ArgumentException($"Độ dài tin nhắn vượt quá giới hạn cho phép ({MaxMessageLength} ký tự).", nameof(request.Message));
        }

        var conv = await _context.AiConversations
            .Include(c => c.Lesson)
            .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);

        if (conv == null || conv.UserId != userId)
        {
            throw new KeyNotFoundException("Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền truy cập.");
        }

        // Determine effective lessonId and validate
        var effectiveLessonId = !string.IsNullOrWhiteSpace(request.LessonId)
            ? request.LessonId
            : conv.LessonId;

        ContentLesson? lesson = null;
        if (!string.IsNullOrWhiteSpace(effectiveLessonId))
        {
            lesson = await _context.ContentLessons
                .Include(l => l.Chapter)
                    .ThenInclude(ch => ch!.Subject)
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == effectiveLessonId, cancellationToken);

            if (lesson != null)
            {
                var isLearner = string.Equals(userRole, "learner", StringComparison.OrdinalIgnoreCase);
                if (isLearner && !string.Equals(lesson.Status, "published", StringComparison.OrdinalIgnoreCase))
                {
                    throw new UnauthorizedAccessException("Không có quyền truy cập bài học chưa xuất bản.");
                }
            }
        }

        var mode = !string.IsNullOrWhiteSpace(request.AssistanceMode)
            ? request.AssistanceMode
            : conv.AssistanceMode;

        // Build System Prompt with Pedagogical Guidelines & Lesson Context
        var systemPrompt = BuildSystemPrompt(lesson, mode);

        // Fetch recent messages for context (limited to MaxHistoryMessages)
        var recentHistory = await _context.AiMessages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(MaxHistoryMessages)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new LlmChatMessage(m.Role, m.Content))
            .ToListAsync(cancellationToken);

        // Append current user message
        var messagesForLlm = new List<LlmChatMessage>(recentHistory)
        {
            new("user", rawMessage)
        };

        // Call LLM Provider
        var completionRequest = new LlmCompletionRequest(
            Messages: messagesForLlm,
            SystemPrompt: systemPrompt,
            Temperature: 0.3,
            MaxTokens: 1500,
            CancellationToken: cancellationToken
        );

        LlmCompletionResponse completionResponse;
        try
        {
            completionResponse = await _llmProvider.GenerateCompletionAsync(completionRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi nhà cung cấp LLM: {Message}", ex.Message);
            throw;
        }

        var userMessageId = $"msg_{Guid.NewGuid():N}";
        var assistantMessageId = $"msg_{Guid.NewGuid():N}";
        var now = DateTimeOffset.UtcNow;

        var userMessage = new AiMessage
        {
            Id = userMessageId,
            ConversationId = conversationId,
            Role = "user",
            Content = rawMessage,
            AssistanceMode = mode,
            LearningContextSnapshotJson = request.LearningContextJson,
            CreatedAt = now
        };

        var suggestedActions = GenerateSuggestedActions(mode, lesson != null);

        var assistantMessage = new AiMessage
        {
            Id = assistantMessageId,
            ConversationId = conversationId,
            Role = "assistant",
            Content = completionResponse.Content,
            AssistanceMode = mode,
            SuggestedActionsJson = JsonSerializer.Serialize(suggestedActions),
            TokensUsed = (completionResponse.PromptTokens ?? 0) + (completionResponse.CompletionTokens ?? 0),
            CreatedAt = now.AddMilliseconds(10)
        };

        _context.AiMessages.AddRange(userMessage, assistantMessage);

        // Update conversation metadata
        conv.UpdatedAt = DateTimeOffset.UtcNow;
        if (conv.Title == "Cuộc trò chuyện mới" || string.IsNullOrWhiteSpace(conv.Title))
        {
            conv.Title = rawMessage.Length > 36 ? rawMessage[..36] + "..." : rawMessage;
        }
        if (conv.LessonId == null && lesson != null)
        {
            conv.LessonId = lesson.Id;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new SendAiMessageResponseDto(
            UserMessage: new AiMessageDto(
                userMessage.Id,
                userMessage.ConversationId,
                userMessage.Role,
                userMessage.Content,
                userMessage.SuggestedActionsJson,
                userMessage.LearningContextSnapshotJson,
                userMessage.AssistanceMode,
                userMessage.TokensUsed,
                userMessage.CreatedAt
            ),
            AssistantMessage: new AiMessageDto(
                assistantMessage.Id,
                assistantMessage.ConversationId,
                assistantMessage.Role,
                assistantMessage.Content,
                assistantMessage.SuggestedActionsJson,
                assistantMessage.LearningContextSnapshotJson,
                assistantMessage.AssistanceMode,
                assistantMessage.TokensUsed,
                assistantMessage.CreatedAt
            ),
            SuggestedActions: suggestedActions,
            Provider: completionResponse.Provider,
            IsConfigured: _llmProvider.IsConfigured
        );
    }

    private static string BuildSystemPrompt(ContentLesson? lesson, string assistanceMode)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Bạn là Trợ lý Gia sư AI (StudyAI Tutor) thông thái, tận tâm, sư phạm và chuẩn mực.");
        sb.AppendLine("Nhiệm vụ của bạn là hỗ trợ học sinh học tập, giải thích bản chất kiến thức và rèn luyện tư duy.");
        sb.AppendLine();
        sb.AppendLine("QUY TẮC BẮT BUỘC:");
        sb.AppendLine("1. Luôn phản hồi bằng tiếng Việt chuẩn mực, mạch lạc, dễ hiểu và khuyến khích người học.");
        sb.AppendLine("2. Sử dụng định dạng KaTeX LaTeX ($...$ hoặc $$...$$) cho mọi công thức toán học và biểu thức đại số.");
        sb.AppendLine("3. Không giải hộ toàn bộ bài tập một cách thụ động; hãy định hướng từng bước hoặc đưa ra câu hỏi gợi ý để học sinh tự suy nghĩ.");

        switch (assistanceMode.ToLowerInvariant())
        {
            case "hint":
                sb.AppendLine("4. Chế độ GỢI Ý (Hint): Chỉ đưa ra gợi ý tư duy, chỉ ra mấu chốt vấn đề hoặc lỗi sai tiềm ẩn, KHÔNG đưa ra đáp số cuối cùng.");
                break;
            case "step-by-step":
                sb.AppendLine("4. Chế độ TỪNG BƯỚC (Step-by-step): Trình bày hướng giải theo các bước 1, 2, 3 rõ ràng, giải thích cặn kẽ từng biến đổi toán học.");
                break;
            case "practice":
                sb.AppendLine("4. Chế độ LUYỆN TẬP (Practice): Đưa ra một câu hỏi hoặc bài toán tương tự có độ khó phù hợp để học sinh thử sức.");
                break;
            case "summarize":
                sb.AppendLine("4. Chế độ TÓM TẮT (Summarize): Đúc kết các định nghĩa, công thức cốt lõi và phương pháp giải thành bảng hoặc danh sách súc tích.");
                break;
            default:
                sb.AppendLine("4. Chế độ GIẢI THÍCH (Explain): Phân tích trực quan, nêu ví dụ minh họa và giải thích cội nguồn của định nghĩa/công thức.");
                break;
        }

        if (lesson != null)
        {
            sb.AppendLine();
            sb.AppendLine($"Ngữ cảnh bài học: \"{lesson.Title}\"");
            if (lesson.Chapter?.Subject != null)
            {
                sb.AppendLine($"Môn học: {lesson.Chapter.Subject.Name} (Khối {lesson.Chapter.Subject.Grade})");
            }
            if (!string.IsNullOrWhiteSpace(lesson.Introduction))
            {
                sb.AppendLine($"Mô tả mở đầu bài học: {lesson.Introduction}");
            }
            if (!string.IsNullOrWhiteSpace(lesson.DefinitionsJson) && lesson.DefinitionsJson != "[]")
            {
                sb.AppendLine($"Định nghĩa trọng tâm: {lesson.DefinitionsJson}");
            }
            if (!string.IsNullOrWhiteSpace(lesson.FormulasJson) && lesson.FormulasJson != "[]")
            {
                sb.AppendLine($"Công thức cốt lõi: {lesson.FormulasJson}");
            }
            sb.AppendLine();
            sb.AppendLine("GIỚI HẠN NỘI DUNG: Trả lời bám sát nội dung bài học trên. Nếu câu hỏi của người học không có căn cứ trong tài liệu hoặc vượt quá phạm vi kiến thức, bạn phải nói rõ giới hạn của bài học này thay vì tự ý khẳng định điều không có cơ sở.");
        }

        return sb.ToString();
    }

    private static List<string> GenerateSuggestedActions(string assistanceMode, bool hasLesson)
    {
        return assistanceMode.ToLowerInvariant() switch
        {
            "hint" => new List<string> { "Xem hướng dẫn giải từng bước", "Giải thích bản chất lý thuyết", "Cho bài tập tương tự để làm thử" },
            "step-by-step" => new List<string> { "Cho mình 1 câu trắc nghiệm tương tự", "Tóm tắt các công thức cốt lõi", hasLesson ? "Quay lại bài giảng" : "Đặt câu hỏi khác" },
            "practice" => new List<string> { "Xem gợi ý cho bài toán này", "Giải thích phương pháp giải", "Đổi sang câu hỏi khác" },
            "summarize" => new List<string> { "Cho ví dụ áp dụng công thức", "Luyện tập 1 bài trắc nghiệm", hasLesson ? "Quay lại bài giảng" : "Hỏi thêm" },
            _ => new List<string> { "Hướng dẫn giải từng bước", "Cho ví dụ minh họa dễ hiểu", "Tóm tắt các công thức cần nhớ" }
        };
    }
}
