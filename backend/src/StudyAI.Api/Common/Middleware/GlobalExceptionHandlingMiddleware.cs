using System.Net;
using System.Text.Json;
using StudyAI.Common.Exceptions;

namespace StudyAI.Common.Middleware;

public class GlobalExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;

    public GlobalExceptionHandlingMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var correlationId = context.TraceIdentifier;
        var statusCode = HttpStatusCode.InternalServerError;
        object responseBody;

        switch (exception)
        {
            case ValidationException valEx:
                statusCode = HttpStatusCode.BadRequest;
                responseBody = new
                {
                    status = 400,
                    title = "Dữ liệu không hợp lệ",
                    detail = valEx.Message,
                    errors = valEx.Errors,
                    traceId = correlationId
                };
                break;

            case UnauthorizedAccessException unauthEx:
                statusCode = HttpStatusCode.Unauthorized;
                responseBody = new
                {
                    status = 401,
                    title = "Chưa xác thực",
                    detail = string.IsNullOrWhiteSpace(unauthEx.Message) ? "Yêu cầu đăng nhập để truy cập tài nguyên này." : unauthEx.Message,
                    traceId = correlationId
                };
                break;

            case ForbiddenException forbEx:
                statusCode = HttpStatusCode.Forbidden;
                responseBody = new
                {
                    status = 403,
                    title = "Không có quyền truy cập",
                    detail = forbEx.Message,
                    traceId = correlationId
                };
                break;

            case NotFoundException notFoundEx:
                statusCode = HttpStatusCode.NotFound;
                responseBody = new
                {
                    status = 404,
                    title = "Không tìm thấy dữ liệu",
                    detail = notFoundEx.Message,
                    traceId = correlationId
                };
                break;

            case ConflictException conflictEx:
                statusCode = HttpStatusCode.Conflict;
                responseBody = new
                {
                    status = 409,
                    title = "Xung đột dữ liệu",
                    detail = conflictEx.Message,
                    traceId = correlationId
                };
                break;

            case TooManyRequestsException tooManyEx:
                statusCode = HttpStatusCode.TooManyRequests;
                responseBody = new
                {
                    status = 429,
                    title = "Quá nhiều yêu cầu",
                    detail = tooManyEx.Message,
                    traceId = correlationId
                };
                break;

            default:
                _logger.LogError(exception, "Unhandled exception occurred. TraceId: {TraceId}", correlationId);
                statusCode = HttpStatusCode.InternalServerError;
                responseBody = new
                {
                    status = 500,
                    title = "Lỗi hệ thống",
                    detail = "Đã xảy ra lỗi không mong muốn trên máy chủ. Vui lòng thử lại sau.",
                    traceId = correlationId
                };
                break;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;
        return context.Response.WriteAsync(JsonSerializer.Serialize(responseBody, _jsonOptions));
    }
}
