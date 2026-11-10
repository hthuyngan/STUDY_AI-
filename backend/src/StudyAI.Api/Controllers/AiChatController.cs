using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/ai")]
public class AiChatController : ControllerBase
{
    private readonly IAiTutorService _aiTutorService;
    private readonly ILogger<AiChatController> _logger;

    public AiChatController(
        IAiTutorService aiTutorService,
        ILogger<AiChatController> logger)
    {
        _aiTutorService = aiTutorService;
        _logger = logger;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "learner";

    /// <summary>
    /// Lấy danh sách hội thoại của người dùng hiện tại
    /// </summary>
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var list = await _aiTutorService.GetUserConversationsAsync(userId, cancellationToken);
        return Ok(list);
    }

    /// <summary>
    /// Tạo một cuộc hội thoại mới
    /// </summary>
    [HttpPost("conversations")]
    public async Task<IActionResult> CreateConversation(
        [FromBody] CreateAiConversationRequestDto request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        try
        {
            var created = await _aiTutorService.CreateConversationAsync(userId, CurrentUserRole, request, cancellationToken);
            return CreatedAtAction(nameof(GetConversationDetail), new { conversationId = created.Id }, created);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
    }

    /// <summary>
    /// Lấy chi tiết cuộc hội thoại và lịch sử tin nhắn
    /// </summary>
    [HttpGet("conversations/{conversationId}")]
    public async Task<IActionResult> GetConversationDetail(
        [FromRoute] string conversationId,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var detail = await _aiTutorService.GetConversationDetailAsync(userId, conversationId, cancellationToken);
        if (detail == null)
        {
            return NotFound(new { detail = "Cuộc trò chuyện không tồn tại hoặc bạn không có quyền truy cập." });
        }

        return Ok(detail);
    }

    /// <summary>
    /// Đổi tiêu đề cuộc hội thoại
    /// </summary>
    [HttpPatch("conversations/{conversationId}")]
    public async Task<IActionResult> UpdateConversationTitle(
        [FromRoute] string conversationId,
        [FromBody] UpdateAiConversationRequestDto request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { detail = "Tiêu đề không được để trống." });
        }

        var success = await _aiTutorService.UpdateConversationTitleAsync(userId, conversationId, request.Title, cancellationToken);
        if (!success)
        {
            return NotFound(new { detail = "Không tìm thấy cuộc trò chuyện để đổi tiêu đề." });
        }

        return NoContent();
    }

    /// <summary>
    /// Xóa cuộc hội thoại
    /// </summary>
    [HttpDelete("conversations/{conversationId}")]
    public async Task<IActionResult> DeleteConversation(
        [FromRoute] string conversationId,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var success = await _aiTutorService.DeleteConversationAsync(userId, conversationId, cancellationToken);
        if (!success)
        {
            return NotFound(new { detail = "Không tìm thấy cuộc trò chuyện để xóa." });
        }

        return NoContent();
    }

    /// <summary>
    /// Gửi tin nhắn câu hỏi và nhận câu trả lời từ AI Tutor
    /// </summary>
    [HttpPost("conversations/{conversationId}/messages")]
    public async Task<IActionResult> SendMessage(
        [FromRoute] string conversationId,
        [FromBody] SendAiMessageRequestDto request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        try
        {
            var response = await _aiTutorService.SendMessageAsync(
                userId,
                CurrentUserRole,
                conversationId,
                request,
                cancellationToken);

            return Ok(response);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { detail = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
        catch (TimeoutException ex)
        {
            _logger.LogWarning("AI Tutor request timed out for user {UserId}", userId);
            return StatusCode(StatusCodes.Status504GatewayTimeout, new { detail = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "AI Provider network error for user {UserId}", userId);
            return StatusCode(StatusCodes.Status502BadGateway, new { detail = "Không thể kết nối tới nhà cung cấp mô hình AI." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("AI Tutor invalid operation: {Message}", ex.Message);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { detail = ex.Message });
        }
    }

    /// <summary>
    /// Tiện ích gửi tin nhắn nhanh (Tự động khởi tạo hội thoại nếu chưa có)
    /// </summary>
    [HttpPost("chat")]
    public async Task<IActionResult> QuickChat(
        [FromBody] QuickChatRequestDto request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        string conversationId = request.ConversationId ?? string.Empty;

        if (string.IsNullOrWhiteSpace(conversationId))
        {
            var initialTitle = request.Message.Length > 36 ? request.Message[..36] + "..." : request.Message;
            var created = await _aiTutorService.CreateConversationAsync(
                userId,
                CurrentUserRole,
                new CreateAiConversationRequestDto(
                    Subject: request.Subject,
                    Title: initialTitle,
                    LessonId: request.LessonId,
                    AssistanceMode: request.Mode ?? "explain",
                    LearningContextJson: request.LearningContext != null ? System.Text.Json.JsonSerializer.Serialize(request.LearningContext) : null
                ),
                cancellationToken);

            conversationId = created.Id;
        }

        var sendRequest = new SendAiMessageRequestDto(
            Message: request.Message,
            LessonId: request.LessonId,
            AssistanceMode: request.Mode ?? "explain",
            LearningContextJson: request.LearningContext != null ? System.Text.Json.JsonSerializer.Serialize(request.LearningContext) : null
        );

        try
        {
            var response = await _aiTutorService.SendMessageAsync(
                userId,
                CurrentUserRole,
                conversationId,
                sendRequest,
                cancellationToken);

            return Ok(new
            {
                conversationId = conversationId,
                userMessage = response.UserMessage,
                assistantMessage = response.AssistantMessage,
                suggestedActions = response.SuggestedActions,
                provider = response.Provider,
                isConfigured = response.IsConfigured
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { detail = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
        catch (TimeoutException ex)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout, new { detail = ex.Message });
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { detail = "Không thể kết nối tới nhà cung cấp mô hình AI." });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { detail = ex.Message });
        }
    }
}
