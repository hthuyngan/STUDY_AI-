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
        Assert.Equal("active", regResult.User.Status);

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
        Assert.Equal("active", meResult.Status);

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
    public async Task BootstrapAdmin_WhenAlreadyExists_IsIdempotent()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        string email = $"idempotent_admin_{Guid.NewGuid():N}@studyai.internal";
        var first = await DbInitializer.BootstrapAdminAsync(db, hasher, email, "SuperSecurePass@123");
        Assert.True(first.Created);

        // Calling it again with same email must not duplicate or error, but return idempotent status
        var second = await DbInitializer.BootstrapAdminAsync(db, hasher, email, "SuperSecurePass@123");
        Assert.False(second.Created);
        Assert.Contains("already exists", second.Message);
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

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized401()
    {
        var loginDto = new UserLoginRequestDto
        {
            Email = "admin@studyai.internal",
            Password = "WrongPassword@999"
        };
        var resp = await _client.PostAsync(
            "/api/v1/auth/login",
            new StringContent(JsonSerializer.Serialize(loginDto), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("không chính xác", body);
    }

    [Fact]
    public async Task Login_WithNonExistentEmail_ReturnsUnauthorized401()
    {
        var loginDto = new UserLoginRequestDto
        {
            Email = $"nonexistent_{Guid.NewGuid():N}@studyai.internal",
            Password = "AnyPassword@123"
        };
        var resp = await _client.PostAsync(
            "/api/v1/auth/login",
            new StringContent(JsonSerializer.Serialize(loginDto), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsConflict409()
    {
        string email = $"dup_{Guid.NewGuid():N}@studyai.internal";
        var regDto = new UserRegisterRequestDto
        {
            Email = email,
            Password = "ValidPassword@123",
            DisplayName = "Original User",
            Grade = "12"
        };

        // First registration
        var resp1 = await _client.PostAsync(
            "/api/v1/auth/register",
            new StringContent(JsonSerializer.Serialize(regDto), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, resp1.StatusCode);

        // Duplicate registration
        var resp2 = await _client.PostAsync(
            "/api/v1/auth/register",
            new StringContent(JsonSerializer.Serialize(regDto), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Conflict, resp2.StatusCode);
        var body2 = await resp2.Content.ReadAsStringAsync();
        Assert.Contains("Email đã được sử dụng", body2);
    }

    [Fact]
    public async Task Register_WithMissingDisplayNameOrInvalidPassword_ReturnsBadRequest400()
    {
        // 1. Missing display name
        var missingNameDto = new UserRegisterRequestDto
        {
            Email = $"valid_{Guid.NewGuid():N}@studyai.internal",
            Password = "ValidPassword@123",
            DisplayName = "   ",
            Grade = "12"
        };
        var resp1 = await _client.PostAsync(
            "/api/v1/auth/register",
            new StringContent(JsonSerializer.Serialize(missingNameDto), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, resp1.StatusCode);

        // 2. Short password (< 8 chars)
        var shortPassDto = new UserRegisterRequestDto
        {
            Email = $"valid_{Guid.NewGuid():N}@studyai.internal",
            Password = "short",
            DisplayName = "Valid Name",
            Grade = "12"
        };
        var resp2 = await _client.PostAsync(
            "/api/v1/auth/register",
            new StringContent(JsonSerializer.Serialize(shortPassDto), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, resp2.StatusCode);
    }

    [Fact]
    public async Task Learner_AccessingAdminDashboard_ReturnsForbidden403()
    {
        // Register learner
        string learnerEmail = $"learner_rbac_{Guid.NewGuid():N}@studyai.internal";
        var regDto = new UserRegisterRequestDto
        {
            Email = learnerEmail,
            Password = "LearnerPass@123",
            DisplayName = "RBAC Test Learner",
            Grade = "12"
        };
        var regResp = await _client.PostAsync(
            "/api/v1/auth/register",
            new StringContent(JsonSerializer.Serialize(regDto), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, regResp.StatusCode);

        var regBody = await regResp.Content.ReadAsStringAsync();
        var regData = JsonSerializer.Deserialize<AuthResponseDto>(regBody, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(regData);

        // Attempt to access /api/v1/admin/dashboard with Learner token
        var adminReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/dashboard");
        adminReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", regData.AccessToken);
        var adminResp = await _client.SendAsync(adminReq);

        Assert.Equal(HttpStatusCode.Forbidden, adminResp.StatusCode);
    }

    [Fact]
    public async Task UserA_CannotAccessOrModifyUserBProgress_ReturnsForbidden403()
    {
        // User A
        var regA = await _client.PostAsync(
            "/api/v1/auth/register",
            new StringContent(JsonSerializer.Serialize(new UserRegisterRequestDto
            {
                Email = $"user_a_{Guid.NewGuid():N}@studyai.internal",
                Password = "Password@123",
                DisplayName = "User A",
                Grade = "12"
            }), Encoding.UTF8, "application/json"));
        var userA = JsonSerializer.Deserialize<AuthResponseDto>(await regA.Content.ReadAsStringAsync(), new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })!;

        // User B
        var regB = await _client.PostAsync(
            "/api/v1/auth/register",
            new StringContent(JsonSerializer.Serialize(new UserRegisterRequestDto
            {
                Email = $"user_b_{Guid.NewGuid():N}@studyai.internal",
                Password = "Password@123",
                DisplayName = "User B",
                Grade = "12"
            }), Encoding.UTF8, "application/json"));
        var userB = JsonSerializer.Deserialize<AuthResponseDto>(await regB.Content.ReadAsStringAsync(), new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })!;

        // User A attempts to view User B's lesson progress
        var hackReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/users/{userB.User.Id}/lesson-progress");
        hackReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userA.AccessToken);
        var hackResp = await _client.SendAsync(hackReq);

        Assert.Equal(HttpStatusCode.Forbidden, hackResp.StatusCode);
    }

    [Fact]
    public async Task ForgedOrGarbageToken_AccessingProtectedEndpoint_ReturnsUnauthorized401()
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "completely.fake.and.invalid.jwt.token");
        var resp = await _client.SendAsync(req);

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Refresh_WithoutCookie_ReturnsUnauthorized401()
    {
        var isolatedClient = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = false
        });

        var resp = await isolatedClient.PostAsync("/api/v1/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task DisabledUser_CannotLogin_ReturnsForbidden403()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        string disabledEmail = $"disabled_{Guid.NewGuid():N}@studyai.internal";
        var user = new User
        {
            Id = $"usr_dis_{Guid.NewGuid():N}",
            Email = disabledEmail,
            EmailNormalized = disabledEmail.ToLowerInvariant(),
            PasswordHash = hasher.HashPassword("Password@123"),
            DisplayName = "Disabled User",
            Role = "learner",
            Status = "disabled",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var loginDto = new UserLoginRequestDto
        {
            Email = disabledEmail,
            Password = "Password@123"
        };
        var resp = await _client.PostAsync(
            "/api/v1/auth/login",
            new StringContent(JsonSerializer.Serialize(loginDto), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Login_BruteForceLockout_TriggersTooManyRequests429()
    {
        string targetEmail = $"target_bruteforce_{Guid.NewGuid():N}@studyai.internal";

        // Attempt 5 incorrect logins consecutively
        for (int i = 0; i < 5; i++)
        {
            var wrongLogin = new UserLoginRequestDto
            {
                Email = targetEmail,
                Password = $"WrongPass_{i}"
            };
            var resp = await _client.PostAsync(
                "/api/v1/auth/login",
                new StringContent(JsonSerializer.Serialize(wrongLogin), Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
        }

        // 6th attempt should be blocked by rate limiter with 429 Too Many Requests
        var blockedLogin = new UserLoginRequestDto
        {
            Email = targetEmail,
            Password = "AnyPassword"
        };
        var blockedResp = await _client.PostAsync(
            "/api/v1/auth/login",
            new StringContent(JsonSerializer.Serialize(blockedLogin), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.TooManyRequests, blockedResp.StatusCode);
        var body = await blockedResp.Content.ReadAsStringAsync();
        Assert.Contains("khóa", body);
    }
}
