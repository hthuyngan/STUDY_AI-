using System.IO;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Common.Exceptions;
using StudyAI.Common.Middleware;
using Xunit;

namespace StudyAI.UnitTests;

public class GlobalExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task Middleware_ValidationExceptionWithXssAndVietnamese_ReturnsSafeJsonEncoding()
    {
        var rawMessage = "Lỗi nhập liệu: <script>alert(\"xss\")</script> & 'toán 12' — kiểm tra Tiếng Việt có dấu";
        RequestDelegate next = (ctx) => throw new ValidationException("Field", rawMessage);
        var middleware = new GlobalExceptionHandlingMiddleware(next, NullLogger<GlobalExceptionHandlingMiddleware>.Instance);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(400, context.Response.StatusCode);
        Assert.Equal("application/json", context.Response.ContentType);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var rawJson = await reader.ReadToEndAsync();

        // Must NOT contain raw unescaped HTML characters '<' or '>'
        Assert.DoesNotContain("<script>", rawJson);
        Assert.DoesNotContain("</script>", rawJson);

        // Must deserialize cleanly and preserve the exact semantic content
        using var doc = JsonDocument.Parse(rawJson);
        var root = doc.RootElement;
        Assert.Equal(400, root.GetProperty("status").GetInt32());
        Assert.Equal("Dữ liệu không hợp lệ", root.GetProperty("title").GetString());
        Assert.Equal(rawMessage, root.GetProperty("detail").GetString());
        Assert.True(root.TryGetProperty("traceId", out _));
    }

    [Theory]
    [InlineData(typeof(NotFoundException), 404, "Không tìm thấy dữ liệu", "Không tìm thấy môn học: MATH10")]
    [InlineData(typeof(ForbiddenException), 403, "Không có quyền truy cập", "Bạn không có quyền truy cập học liệu này.")]
    [InlineData(typeof(ConflictException), 409, "Xung đột dữ liệu", "Phiên bản cấu hình hệ thống đã thay đổi.")]
    [InlineData(typeof(TooManyRequestsException), 429, "Quá nhiều yêu cầu", "Vượt quá giới hạn gọi API.")]
    public async Task Middleware_DomainExceptions_ReturnStandardProblemDetails(Type exType, int expectedStatus, string expectedTitle, string message)
    {
        Exception ex = exType switch
        {
            _ when exType == typeof(NotFoundException) => new NotFoundException(message),
            _ when exType == typeof(ForbiddenException) => new ForbiddenException(message),
            _ when exType == typeof(ConflictException) => new ConflictException(message),
            _ when exType == typeof(TooManyRequestsException) => new TooManyRequestsException(message),
            _ => new Exception(message)
        };

        RequestDelegate next = (ctx) => throw ex;
        var middleware = new GlobalExceptionHandlingMiddleware(next, NullLogger<GlobalExceptionHandlingMiddleware>.Instance);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(expectedStatus, context.Response.StatusCode);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var doc = await JsonDocument.ParseAsync(context.Response.Body);
        var root = doc.RootElement;

        Assert.Equal(expectedStatus, root.GetProperty("status").GetInt32());
        Assert.Equal(expectedTitle, root.GetProperty("title").GetString());
        Assert.Equal(message, root.GetProperty("detail").GetString());
    }
}
