using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.IntegrationTests;

public class AuthIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly StudyAIApiFixture _factory;
    private readonly HttpClient _client;

    public AuthIntegrationTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
    }

    [Fact]
    public async Task Register_Login_GetMe_Lifecycle_Succeeds()
    {
        string uniqueEmail = $"learner_{Guid.NewGuid():N}@studyai.internal";
        var regDto = new UserRegisterRequestDto
        {
            Email = uniqueEmail,
            Password = "SecurePassword@123",
            DisplayName = "Automated Test Learner",
            Grade = "12"
        };

        // 1. Register
        var regContent = new StringContent(JsonSerializer.Serialize(regDto), Encoding.UTF8, "application/json");
        var regResponse = await _client.PostAsync("/api/v1/auth/register", regContent);
        Assert.Equal(HttpStatusCode.Created, regResponse.StatusCode);

        var regBody = await regResponse.Content.ReadAsStringAsync();
        var regResult = JsonSerializer.Deserialize<AuthResponseDto>(regBody, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(regResult);
        Assert.False(string.IsNullOrWhiteSpace(regResult.AccessToken));
        Assert.Equal(uniqueEmail, regResult.User.Email);

        // 2. Login
        var loginDto = new UserLoginRequestDto
        {
            Email = uniqueEmail,
            Password = "SecurePassword@123"
        };
        var loginContent = new StringContent(JsonSerializer.Serialize(loginDto), Encoding.UTF8, "application/json");
        var loginResponse = await _client.PostAsync("/api/v1/auth/login", loginContent);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var loginBody = await loginResponse.Content.ReadAsStringAsync();
        var loginResult = JsonSerializer.Deserialize<AuthResponseDto>(loginBody, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(loginResult);

        // 3. Authenticated GetMe
        var meRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        meRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginResult.AccessToken);
        var meResponse = await _client.SendAsync(meRequest);
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);

        var meBody = await meResponse.Content.ReadAsStringAsync();
        var meResult = JsonSerializer.Deserialize<UserResponseDto>(meBody, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(meResult);
        Assert.Equal(uniqueEmail, meResult.Email);

        // 4. Refresh Token Rotation
        var refreshResponse = await _client.PostAsync("/api/v1/auth/refresh", null);
        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

        // 5. Logout
        var logoutResponse = await _client.PostAsync("/api/v1/auth/logout", null);
        Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);
    }

    [Fact]
    public async Task AdminProtection_CannotDemoteLastActiveAdmin()
    {
        // 1. Login as default Admin
        var adminLoginDto = new UserLoginRequestDto
        {
            Email = "admin@studyai.internal",
            Password = "Admin@123456"
        };
        var loginContent = new StringContent(JsonSerializer.Serialize(adminLoginDto), Encoding.UTF8, "application/json");
        var loginResponse = await _client.PostAsync("/api/v1/auth/login", loginContent);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var loginBody = await loginResponse.Content.ReadAsStringAsync();
        var loginResult = JsonSerializer.Deserialize<AuthResponseDto>(loginBody, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(loginResult);

        // 2. Try to demote the admin to learner
        var updateRoleDto = new UpdateRoleRequestDto { Role = "learner" };
        var roleContent = new StringContent(JsonSerializer.Serialize(updateRoleDto), Encoding.UTF8, "application/json");
        var roleReq = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/admin/users/{loginResult.User.Id}/role")
        {
            Content = roleContent
        };
        roleReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginResult.AccessToken);

        var roleResponse = await _client.SendAsync(roleReq);
        Assert.Equal(HttpStatusCode.BadRequest, roleResponse.StatusCode);

        var errBody = await roleResponse.Content.ReadAsStringAsync();
        Assert.Contains("duy nhất", errBody);
    }

    [Fact]
    public async Task RefreshToken_ReuseDetection_RevokesAllSessions()
    {
        // Use an isolated client to control cookies directly
        var customClient = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = false
        });

        string email = $"reuse_test_{Guid.NewGuid():N}@studyai.internal";
        var regDto = new UserRegisterRequestDto
        {
            Email = email,
            Password = "SecurePassword@123",
            DisplayName = "Reuse Test User",
            Grade = "12"
        };

        // 1. Register
        var regResp = await customClient.PostAsync(
            "/api/v1/auth/register",
            new StringContent(JsonSerializer.Serialize(regDto), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, regResp.StatusCode);

        // Extract initial Set-Cookie
        var cookies1 = regResp.Headers.GetValues("Set-Cookie").ToList();
        var initialCookieHeader = cookies1.First(c => c.StartsWith("study_ai_refresh_token="));
        var initialRawToken = initialCookieHeader.Split(';')[0];

        // 2. Valid refresh with initial token
        var refreshReq1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        refreshReq1.Headers.Add("Cookie", initialRawToken);
        var refreshResp1 = await customClient.SendAsync(refreshReq1);
        Assert.Equal(HttpStatusCode.OK, refreshResp1.StatusCode);

        // Extract new rotated cookie
        var cookies2 = refreshResp1.Headers.GetValues("Set-Cookie").ToList();
        var secondCookieHeader = cookies2.First(c => c.StartsWith("study_ai_refresh_token="));
        var secondRawToken = secondCookieHeader.Split(';')[0];

        // 3. Attacker replays initial token (which is now revoked!)
        var reuseReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        reuseReq.Headers.Add("Cookie", initialRawToken);
        var reuseResp = await customClient.SendAsync(reuseReq);
        Assert.Equal(HttpStatusCode.Unauthorized, reuseResp.StatusCode);

        var reuseBody = await reuseResp.Content.ReadAsStringAsync();
        Assert.Contains("Cảnh báo bảo mật", reuseBody);

        // 4. Verify that the second (previously valid) token is also now revoked
        var refreshReq2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        refreshReq2.Headers.Add("Cookie", secondRawToken);
        var refreshResp2 = await customClient.SendAsync(refreshReq2);
        Assert.Equal(HttpStatusCode.Unauthorized, refreshResp2.StatusCode);
    }

    [Fact]
    public async Task BootstrapAdmin_WithInvalidPassword_FailsValidation()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        var weakResult = await DbInitializer.BootstrapAdminAsync(db, hasher, "new_admin@studyai.internal", "weak");
        Assert.False(weakResult.Created);
        Assert.Contains("at least 10 characters", weakResult.Message);

        var noUpperResult = await DbInitializer.BootstrapAdminAsync(db, hasher, "new_admin@studyai.internal", "weakpassword123");
        Assert.False(noUpperResult.Created);
        Assert.Contains("uppercase", noUpperResult.Message);

        var invalidEmailResult = await DbInitializer.BootstrapAdminAsync(db, hasher, "invalid-email", "ValidPass@123");
        Assert.False(invalidEmailResult.Created);
    }

    [Fact]
    public async Task SuspendedUser_CannotAccessProtectedEndpoints()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var tokenService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();

        string suspendedEmail = $"suspended_{Guid.NewGuid():N}@studyai.internal";
        var user = new User
        {
            Id = $"usr_susp_{Guid.NewGuid():N}",
            Email = suspendedEmail,
            EmailNormalized = suspendedEmail.ToLowerInvariant(),
            PasswordHash = hasher.HashPassword("Password@123"),
            DisplayName = "Suspended Learner",
            Role = "learner",
            Status = "suspended",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        // 1. Try to login - should receive 403 Forbidden
        var loginDto = new UserLoginRequestDto
        {
            Email = suspendedEmail,
            Password = "Password@123"
        };
        var loginResp = await _client.PostAsync(
            "/api/v1/auth/login",
            new StringContent(JsonSerializer.Serialize(loginDto), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, loginResp.StatusCode);

        // 2. Generate a valid signed token directly, but attempt to call protected /api/v1/auth/me
        var (token, _) = tokenService.GenerateAccessToken(user);
        var meReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        meReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var meResp = await _client.SendAsync(meReq);
        Assert.Equal(HttpStatusCode.Unauthorized, meResp.StatusCode);
    }
}
