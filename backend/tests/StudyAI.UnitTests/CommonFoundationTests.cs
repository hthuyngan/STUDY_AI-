using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Api.Middleware;
using StudyAI.Application.Common.Authorization;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Results;
using StudyAI.Infrastructure.Authentication;
using Xunit;

namespace StudyAI.UnitTests;

public class CommonFoundationTests
{
    [Theory]
    [InlineData("admin", Permissions.UsersRead, true)]
    [InlineData("admin", Permissions.ContentPublish, true)]
    [InlineData("content", Permissions.ContentRead, true)]
    [InlineData("content", Permissions.UsersWrite, false)]
    [InlineData("teacher", Permissions.ClassroomsManage, true)]
    [InlineData("teacher", Permissions.SettingsManage, false)]
    [InlineData("learner", Permissions.LearningReadOwn, true)]
    [InlineData("learner", Permissions.ClassroomsManage, false)]
    [InlineData("support", Permissions.UsersRead, true)]
    [InlineData("support", Permissions.ContentPublish, false)]
    [InlineData("", Permissions.ContentRead, false)]
    [InlineData(null, Permissions.ContentRead, false)]
    public void RolePermissionMap_EvaluatesExpectedPermissions(string? role, string permission, bool expected)
    {
        var hasPermission = RolePermissionMap.HasPermission(role, permission);
        Assert.Equal(expected, hasPermission);
    }

    [Fact]
    public void CurrentUser_ReadsClaimsCorrectly()
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "usr_learner_1"),
            new(ClaimTypes.Role, "learner")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var context = new DefaultHttpContext { User = principal };
        var accessor = new HttpContextAccessor { HttpContext = context };
        var currentUser = new CurrentUser(accessor);

        Assert.True(currentUser.IsAuthenticated);
        Assert.Equal("usr_learner_1", currentUser.UserId);
        Assert.Equal("learner", currentUser.Role);
        Assert.True(currentUser.IsInRole("learner"));
        Assert.True(currentUser.HasPermission(Permissions.LearningReadOwn));
        Assert.False(currentUser.HasPermission(Permissions.SettingsManage));
    }

    [Fact]
    public void Result_HandlesSuccessAndFailure()
    {
        var ok = Result<string>.Success("test-value");
        Assert.True(ok.IsSuccess);
        Assert.Equal("test-value", ok.Value);

        var fail = Result<string>.Failure("Lỗi xử lý", "ERR_TEST");
        Assert.False(fail.IsSuccess);
        Assert.Equal("Lỗi xử lý", fail.ErrorMessage);
        Assert.Equal("ERR_TEST", fail.ErrorCode);
    }

    [Theory]
    [InlineData(typeof(ValidationException), 400)]
    [InlineData(typeof(UnauthorizedAccessException), 401)]
    [InlineData(typeof(ForbiddenException), 403)]
    [InlineData(typeof(NotFoundException), 404)]
    [InlineData(typeof(ConflictException), 409)]
    [InlineData(typeof(Exception), 500)]
    public async Task GlobalExceptionHandlingMiddleware_MapsExceptionsToStatusCodes(Type exceptionType, int expectedStatusCode)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        RequestDelegate next = _ =>
        {
            if (exceptionType == typeof(ValidationException))
                throw new ValidationException("Dữ liệu không đúng");
            if (exceptionType == typeof(UnauthorizedAccessException))
                throw new UnauthorizedAccessException("Chưa đăng nhập");
            if (exceptionType == typeof(ForbiddenException))
                throw new ForbiddenException();
            if (exceptionType == typeof(NotFoundException))
                throw new NotFoundException("User", "usr_123");
            if (exceptionType == typeof(ConflictException))
                throw new ConflictException("Đã tồn tại");
            throw new Exception("Lỗi bất ngờ");
        };

        var middleware = new GlobalExceptionHandlingMiddleware(next, NullLogger<GlobalExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(expectedStatusCode, context.Response.StatusCode);
        Assert.Equal("application/json", context.Response.ContentType);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseText = await reader.ReadToEndAsync();
        using var doc = JsonDocument.Parse(responseText);
        Assert.Equal(expectedStatusCode, doc.RootElement.GetProperty("status").GetInt32());
    }
}
