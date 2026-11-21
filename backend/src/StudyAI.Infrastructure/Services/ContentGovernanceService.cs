using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Infrastructure.Services;

public class ContentGovernanceService : IContentGovernanceService
{
    private readonly StudyAIDbContext _context;
    private readonly IQuestionQualityService _questionQualityService;
    private readonly ILlmProvider _llmProvider;
    private readonly ILogger<ContentGovernanceService> _logger;

    public ContentGovernanceService(
        StudyAIDbContext context,
        IQuestionQualityService questionQualityService,
        ILlmProvider llmProvider,
        ILogger<ContentGovernanceService> logger)
    {
        _context = context;
        _questionQualityService = questionQualityService;
        _llmProvider = llmProvider;
        _logger = logger;
    }

    public async Task<ContentWorkflowActionResultDto> ExecuteWorkflowActionAsync(
        string actorUserId,
        string actorRole,
        ContentWorkflowActionRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var isAdmin = string.Equals(actorRole, "admin", StringComparison.OrdinalIgnoreCase);
        var isContentStaff = isAdmin || string.Equals(actorRole, "content", StringComparison.OrdinalIgnoreCase) || string.Equals(actorRole, "teacher", StringComparison.OrdinalIgnoreCase);

        if (!isContentStaff)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác kiểm duyệt nội dung.");
        }

        string previousStatus = "unknown";
        string newStatus = "unknown";
        string message = string.Empty;

        if (string.Equals(request.EntityType, "lesson", StringComparison.OrdinalIgnoreCase))
        {
            var lesson = await _context.ContentLessons
                .FirstOrDefaultAsync(l => l.Id == request.EntityId, cancellationToken);

            if (lesson == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy bài học với mã '{request.EntityId}'.");
            }

            previousStatus = (lesson.Status ?? "draft").ToLowerInvariant();

            switch (request.Action.ToLowerInvariant())
            {
                case "submit_review":
                    if (previousStatus != "draft" && previousStatus != "rejected")
                    {
                        throw new InvalidOperationException($"Không thể gửi duyệt bài học đang ở trạng thái '{previousStatus}'. Chỉ có thể gửi duyệt từ 'draft' hoặc 'rejected'.");
                    }
                    lesson.Status = "in-review";
                    lesson.UpdatedAt = DateTimeOffset.UtcNow;
                    message = "Đã gửi bài học vào hàng đợi kiểm duyệt.";
                    break;

                case "approve":
                    if (previousStatus != "in-review")
                    {
                        throw new InvalidOperationException($"Chỉ có thể phê duyệt bài học đang ở trạng thái 'in-review' (Trạng thái hiện tại: '{previousStatus}').");
                    }
                    // Separation of duties rule: creator cannot self-approve unless Admin
                    if (!isAdmin && !string.IsNullOrEmpty(lesson.AuthorId) && lesson.AuthorId == actorUserId)
                    {
                        throw new InvalidOperationException("Quy trình kiểm định yêu cầu người phê duyệt độc lập (Tác giả không thể tự phê duyệt bài học của mình).");
                    }
                    lesson.Status = "approved";
                    lesson.ReviewedBy = actorUserId;
                    lesson.UpdatedAt = DateTimeOffset.UtcNow;
                    message = "Bài học đã được phê duyệt thành công.";
                    break;

                case "reject":
                    if (previousStatus != "in-review")
                    {
                        throw new InvalidOperationException($"Chỉ có thể từ chối phê duyệt bài học đang ở trạng thái 'in-review' (Trạng thái hiện tại: '{previousStatus}').");
                    }
                    lesson.Status = "rejected";
                    lesson.ReviewedBy = actorUserId;
                    lesson.UpdatedAt = DateTimeOffset.UtcNow;
                    message = $"Bài học đã bị từ chối phê duyệt. Lý do: {request.ReasonOrNotes ?? "Cần chỉnh sửa lại nội dung"}";
                    break;

                case "publish":
                    if (previousStatus != "approved")
                    {
                        throw new InvalidOperationException($"Nội dung chưa được phê duyệt (Trạng thái hiện tại: '{previousStatus}'). Chỉ bài học ở trạng thái 'approved' mới được phép xuất bản.");
                    }
                    lesson.Status = "published";
                    lesson.UpdatedAt = DateTimeOffset.UtcNow;
                    message = "Bài học đã được xuất bản chính thức cho học sinh.";
                    break;

                case "archive":
                    if (previousStatus != "approved" && previousStatus != "published")
                    {
                        throw new InvalidOperationException($"Chỉ bài học ở trạng thái 'approved' hoặc 'published' mới có thể lưu trữ (Trạng thái hiện tại: '{previousStatus}').");
                    }
                    lesson.Status = "archived";
                    lesson.UpdatedAt = DateTimeOffset.UtcNow;
                    message = "Bài học đã được chuyển vào kho lưu trữ (archived).";
                    break;

                default:
                    throw new ArgumentException($"Hành động kiểm duyệt không hợp lệ: '{request.Action}'.", nameof(request.Action));
            }

            newStatus = lesson.Status;
        }
        else if (string.Equals(request.EntityType, "question", StringComparison.OrdinalIgnoreCase))
        {
            var question = await _context.ContentQuestions
                .FirstOrDefaultAsync(q => q.Id == request.EntityId, cancellationToken);

            if (question == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy câu hỏi với mã '{request.EntityId}'.");
            }

            previousStatus = (question.Status ?? "draft").ToLowerInvariant();

            switch (request.Action.ToLowerInvariant())
            {
                case "submit_review":
                    if (previousStatus != "draft" && previousStatus != "rejected")
                    {
                        throw new InvalidOperationException($"Không thể gửi duyệt câu hỏi đang ở trạng thái '{previousStatus}'. Chỉ có thể gửi duyệt từ 'draft' hoặc 'rejected'.");
                    }
                    question.Status = "in-review";
                    question.UpdatedAt = DateTimeOffset.UtcNow;
                    message = "Đã gửi câu hỏi vào hàng đợi kiểm duyệt.";
                    break;

                case "approve":
                    if (previousStatus != "in-review")
                    {
                        throw new InvalidOperationException($"Chỉ có thể phê duyệt câu hỏi đang ở trạng thái 'in-review' (Trạng thái hiện tại: '{previousStatus}').");
                    }
                    if (!isAdmin && !string.IsNullOrEmpty(question.AuthorId) && question.AuthorId == actorUserId)
                    {
                        throw new InvalidOperationException("Quy trình kiểm định yêu cầu người phê duyệt độc lập (Tác giả không thể tự phê duyệt câu hỏi của mình).");
                    }
                    question.Status = "approved";
                    question.ReviewedBy = actorUserId;
                    question.UpdatedAt = DateTimeOffset.UtcNow;
                    message = "Câu hỏi đã được phê duyệt.";
                    break;

                case "reject":
                    if (previousStatus != "in-review")
                    {
                        throw new InvalidOperationException($"Chỉ có thể từ chối câu hỏi đang ở trạng thái 'in-review' (Trạng thái hiện tại: '{previousStatus}').");
                    }
                    question.Status = "rejected";
                    question.RejectionReason = request.ReasonOrNotes;
                    question.ReviewedBy = actorUserId;
                    question.UpdatedAt = DateTimeOffset.UtcNow;
                    message = $"Câu hỏi đã bị từ chối. Lý do: {request.ReasonOrNotes ?? "Cần chỉnh sửa lại"}";
                    break;

                case "publish":
                    if (previousStatus != "approved")
                    {
                        throw new InvalidOperationException($"Nội dung chưa được phê duyệt (Trạng thái hiện tại: '{previousStatus}'). Chỉ những câu hỏi đã được phê duyệt ('approved') mới có thể xuất bản vào ngân hàng đề thi.");
                    }
                    question.Status = "published";
                    question.UpdatedAt = DateTimeOffset.UtcNow;
                    message = "Câu hỏi đã được xuất bản vào ngân hàng câu hỏi chính thức.";
                    break;

                case "archive":
                    if (previousStatus != "approved" && previousStatus != "published")
                    {
                        throw new InvalidOperationException($"Chỉ câu hỏi ở trạng thái 'approved' hoặc 'published' mới có thể lưu trữ (Trạng thái hiện tại: '{previousStatus}').");
                    }
                    question.Status = "archived";
                    question.UpdatedAt = DateTimeOffset.UtcNow;
                    message = "Câu hỏi đã được đưa vào lưu trữ (archived).";
                    break;

                default:
                    throw new ArgumentException($"Hành động kiểm duyệt không hợp lệ: '{request.Action}'.", nameof(request.Action));
            }

            newStatus = question.Status;
        }
        else
        {
            throw new ArgumentException($"Loại nội dung không được hỗ trợ: '{request.EntityType}'. Hỗ trợ 'lesson' hoặc 'question'.", nameof(request.EntityType));
        }

        // Record Audit Log
        _context.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"audit_{Guid.NewGuid():N}",
            ActorUserId = actorUserId,
            Action = $"workflow_{request.Action}_{request.EntityType}",
            TargetType = request.EntityType,
            TargetId = request.EntityId,
            Payload = JsonSerializer.Serialize(new { prev = previousStatus, next = newStatus, reason = request.ReasonOrNotes }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return new ContentWorkflowActionResultDto
        {
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            PreviousStatus = previousStatus,
            NewStatus = newStatus,
            Message = message,
            Timestamp = DateTimeOffset.UtcNow
        };
    }

    public async Task<AiContentQualityAuditResponseDto> AuditContentQualityWithAiAsync(
        string userId,
        AiContentQualityAuditRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var suggestions = new List<ContentQualitySuggestionItemDto>();

        // 1. Deterministic KaTeX syntax audit
        if (!_questionQualityService.ValidateLatexSyntax(request.BodyText, out var latexErr))
        {
            suggestions.Add(new ContentQualitySuggestionItemDto
            {
                Category = "katex_syntax",
                OriginalSnippet = Truncate(request.BodyText, 100),
                ProposedCorrection = "Đóng mở đầy đủ cặp dấu '$' hoặc '$$'",
                Reason = latexErr ?? "Lỗi định dạng công thức KaTeX không cân xứng."
            });
        }

        // 2. Duplicate Detection
        if (!string.IsNullOrWhiteSpace(request.BodyText))
        {
            var normText = NormalizeText(request.BodyText);
            var isDuplicate = await _context.ContentQuestions.AsNoTracking()
                .AnyAsync(q => q.Prompt.Contains(normText.Substring(0, Math.Min(40, normText.Length))), cancellationToken);

            if (isDuplicate)
            {
                suggestions.Add(new ContentQualitySuggestionItemDto
                {
                    Category = "duplicate",
                    OriginalSnippet = Truncate(request.BodyText, 80),
                    ProposedCorrection = "Xem xét thay đổi thông số hoặc dữ kiện bài toán",
                    Reason = "Phát hiện nội dung có độ tương đồng cao với câu hỏi đã tồn tại trong hệ thống."
                });
            }
        }

        // 3. Spell & Readability check via AI with fallback
        string prompt = $"Bạn là chuyên gia thẩm định nội dung học liệu Toán 12 của Bộ GD&ĐT.\n" +
            $"Hãy kiểm tra đoạn văn bản sau về mặt chính tả, diễn đạt sư phạm và tính chính xác của thuật ngữ toán học:\n" +
            $"Tiêu đề: {request.Title}\n" +
            $"Nội dung: {request.BodyText}\n\n" +
            $"Quy tắc: Chỉ đề xuất chỉnh sửa, không tự ý thay đổi ý nghĩa toán học. Dùng KaTeX $...$ cho công thức.";

        string proposedBody = request.BodyText;
        string overallEval = "Nội dung đạt chuẩn cú pháp và phong cách sư phạm.";
        string diffLevel = "thong_hieu";

        try
        {
            var completion = await _llmProvider.GenerateCompletionAsync(new LlmCompletionRequest(
                Messages: new List<LlmChatMessage> { new("user", prompt) },
                SystemPrompt: "Bạn là chuyên gia thẩm định chất lượng giáo trình toán học trung học phổ thông.",
                Temperature: 0.2,
                MaxTokens: 800,
                CancellationToken: cancellationToken
            ));

            if (!string.IsNullOrWhiteSpace(completion.Content))
            {
                overallEval = "AI đã rà soát và đưa ra các đề xuất tối ưu hóa câu chữ cho giáo viên.";
                proposedBody = completion.Content;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM provider error during content audit: {Message}", ex.Message);
            overallEval = "Kiểm định hoàn tất thông qua bộ quy tắc xác định cục bộ (Local Rule-based Engine).";
        }

        // Suggest cognitive level based on keywords
        var lowerBody = request.BodyText.ToLowerInvariant();
        if (lowerBody.Contains("giá trị lớn nhất") && lowerBody.Contains("tham số m") || lowerBody.Contains("vận dụng cao"))
        {
            diffLevel = "van_dung_cao";
        }
        else if (lowerBody.Contains("tìm m") || lowerBody.Contains("tiếp tuyến") || lowerBody.Contains("khoảng cách"))
        {
            diffLevel = "van_dung";
        }
        else if (lowerBody.Contains("tính đạo hàm") || lowerBody.Contains("đồng biến") || lowerBody.Contains("nghịch biến"))
        {
            diffLevel = "thong_hieu";
        }
        else
        {
            diffLevel = "nhan_biet";
        }

        return new AiContentQualityAuditResponseDto
        {
            ContentType = request.ContentType,
            HasIssues = suggestions.Count > 0,
            IssueCount = suggestions.Count,
            OverallAssessment = overallEval,
            Suggestions = suggestions,
            ProposedImprovedBody = proposedBody,
            SuggestedCognitiveDifficulty = diffLevel,
            Provider = "Gemini",
            RequiresHumanApproval = true // Strict guard: human review required
        };
    }

    public async Task FlagQuestionForModerationAsync(
        string actorUserId,
        string questionId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var question = await _context.ContentQuestions
            .FirstOrDefaultAsync(q => q.Id == questionId, cancellationToken);

        if (question == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy câu hỏi với mã '{questionId}'.");
        }

        question.Status = "in-review";
        question.RejectionReason = reason;
        question.UpdatedAt = DateTimeOffset.UtcNow;

        _context.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"audit_{Guid.NewGuid():N}",
            ActorUserId = actorUserId,
            Action = "flag_question_moderation",
            TargetType = "question",
            TargetId = questionId,
            Payload = JsonSerializer.Serialize(new { reason }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizeText(string text)
    {
        var cleaned = Regex.Replace(text.ToLowerInvariant(), @"\s+", " ").Trim();
        cleaned = Regex.Replace(cleaned, @"[.,!?;:]", "");
        return cleaned;
    }

    private static string Truncate(string text, int max)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;
        return text.Length <= max ? text : text.Substring(0, max) + "...";
    }
}

