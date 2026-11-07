using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using StudyAI.Application.DTOs;
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
}
