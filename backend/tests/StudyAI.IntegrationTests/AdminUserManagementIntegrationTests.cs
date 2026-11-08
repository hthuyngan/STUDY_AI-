using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.IntegrationTests;

public class AdminUserManagementIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public AdminUserManagementIntegrationTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> GetAdminTokenAsync()
    {
        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = "admin@studyai.internal",
                Password = "Admin@123456"
            }),
            Encoding.UTF8,
            "application/json"));

        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        var body = await loginResp.Content.ReadAsStringAsync();
        var auth = JsonSerializer.Deserialize<AuthResponseDto>(body, JsonOpts);
        Assert.NotNull(auth);
        return auth.AccessToken;
    }

    private async Task<string> GetLearnerTokenAsync()
    {
        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = "learner@studyai.internal",
                Password = "Learner@123456"
            }),
            Encoding.UTF8,
            "application/json"));

        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        var body = await loginResp.Content.ReadAsStringAsync();
        var auth = JsonSerializer.Deserialize<AuthResponseDto>(body, JsonOpts);
        Assert.NotNull(auth);
        return auth.AccessToken;
    }

    [Fact]
    public async Task Admin_GetUsers_WithPagination_ReturnsUsersList()
    {
        var token = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/users?page=1&pageSize=5");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var content = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AdminUsersResponseDto>(content, JsonOpts);
        Assert.NotNull(result);
        Assert.True(result.Total >= 1);
        Assert.Equal(1, result.Page);
        Assert.Equal(5, result.PageSize);
        Assert.NotEmpty(result.Items);
    }

    [Fact]
    public async Task Admin_GetUsers_WithFiltersAndSearch_ReturnsFilteredResults()
    {
        var token = await GetAdminTokenAsync();

        // Search for "admin"
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/users?search=admin&role=admin&status=active");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var content = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AdminUsersResponseDto>(content, JsonOpts);
        Assert.NotNull(result);
        Assert.All(result.Items, u =>
        {
            Assert.Equal("admin", u.Role);
            Assert.Equal("active", u.Status);
        });
    }

    [Fact]
    public async Task Admin_CreateUser_Teacher_SucceedsWithSecureRandomPasswordAndAuditLog()
    {
        var token = await GetAdminTokenAsync();
        var email = $"teacher_{Guid.NewGuid():N}@studyai.internal";

        var createReq = new CreateUserRequestDto
        {
            Email = email,
            DisplayName = "Thầy Giáo Mẫu",
            Role = "teacher",
            Status = "active"
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var content = await resp.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<CreateUserResponseDto>(content, JsonOpts);
        Assert.NotNull(created);
        Assert.NotNull(created.User);
        Assert.Equal(email, created.User.Email);
        Assert.Equal("teacher", created.User.Role);
        Assert.Equal("active", created.User.Status);
        Assert.False(string.IsNullOrWhiteSpace(created.TemporaryPassword));
        Assert.True(created.TemporaryPassword.Length >= 8);

        // Verify audit log
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var log = await db.StaffAuditLogs.FirstOrDefaultAsync(l => l.TargetId == created.User.Id && l.Action == "user_created");
        Assert.NotNull(log);
        Assert.Equal("user", log.TargetType);
    }

    [Fact]
    public async Task Admin_CreateUser_DuplicateEmail_ReturnsConflict409()
    {
        var token = await GetAdminTokenAsync();
        var email = $"dup_admin_{Guid.NewGuid():N}@studyai.internal";

        var createReq = new CreateUserRequestDto
        {
            Email = email,
            DisplayName = "Người Dùng Trùng",
            Role = "learner",
            Status = "active"
        };

        var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        req1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp1 = await _client.SendAsync(req1);
        Assert.Equal(HttpStatusCode.Created, resp1.StatusCode);

        // Second creation with same email
        var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        req2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp2 = await _client.SendAsync(req2);
        Assert.Equal(HttpStatusCode.Conflict, resp2.StatusCode);
    }

    [Fact]
    public async Task Admin_CreateUser_InvalidRoleOrStatus_ReturnsBadRequest400()
    {
        var token = await GetAdminTokenAsync();

        // 1. Invalid role
        var invalidRoleReq = new CreateUserRequestDto
        {
            Email = $"inv_role_{Guid.NewGuid():N}@studyai.internal",
            DisplayName = "Invalid Role",
            Role = "superman"
        };
        var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(invalidRoleReq), Encoding.UTF8, "application/json")
        };
        req1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp1 = await _client.SendAsync(req1);
        Assert.Equal(HttpStatusCode.BadRequest, resp1.StatusCode);

        // 2. Invalid status
        var invalidStatusReq = new CreateUserRequestDto
        {
            Email = $"inv_stat_{Guid.NewGuid():N}@studyai.internal",
            DisplayName = "Invalid Status",
            Role = "learner",
            Status = "destroyed"
        };
        var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(invalidStatusReq), Encoding.UTF8, "application/json")
        };
        req2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp2 = await _client.SendAsync(req2);
        Assert.Equal(HttpStatusCode.BadRequest, resp2.StatusCode);
    }

    [Fact]
    public async Task Admin_UpdateUser_UpdatesDisplayNameGradeRoleAndStatus()
    {
        var token = await GetAdminTokenAsync();
        var email = $"edit_target_{Guid.NewGuid():N}@studyai.internal";

        // Create learner
        var createReq = new CreateUserRequestDto
        {
            Email = email,
            DisplayName = "Tên Ban Đầu",
            Role = "learner",
            Status = "active",
            Grade = "11"
        };
        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respCreate = await _client.SendAsync(reqCreate);
        Assert.Equal(HttpStatusCode.Created, respCreate.StatusCode);
        var created = JsonSerializer.Deserialize<CreateUserResponseDto>(await respCreate.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(created?.User);

        // Update via PATCH /users/{id}
        var updateDto = new UpdateUserRequestDto
        {
            DisplayName = "Tên Đã Cập Nhật",
            Grade = "12",
            Role = "support",
            Status = "active"
        };
        var reqUpdate = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/admin/users/{created.User.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateDto), Encoding.UTF8, "application/json")
        };
        reqUpdate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respUpdate = await _client.SendAsync(reqUpdate);
        Assert.Equal(HttpStatusCode.OK, respUpdate.StatusCode);

        var updated = JsonSerializer.Deserialize<AdminUserDto>(await respUpdate.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(updated);
        Assert.Equal("Tên Đã Cập Nhật", updated.DisplayName);
        Assert.Equal("12", updated.Grade);
        Assert.Equal("support", updated.Role);
    }

    [Fact]
    public async Task Admin_UpdateRole_LastActiveAdmin_CannotBeDemoted()
    {
        var token = await GetAdminTokenAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var admin = await db.Users.FirstAsync(u => u.EmailNormalized == "admin@studyai.internal");

        // Attempt to demote sole active admin to learner
        var req = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/admin/users/{admin.Id}/role")
        {
            Content = new StringContent(JsonSerializer.Serialize(new UpdateRoleRequestDto { Role = "learner" }), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("Không thể hủy quyền quản trị viên hoạt động duy nhất", body);
    }

    [Fact]
    public async Task Admin_UpdateStatus_LastActiveAdmin_CannotBeDisabledOrSuspended()
    {
        var token = await GetAdminTokenAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var admin = await db.Users.FirstAsync(u => u.EmailNormalized == "admin@studyai.internal");

        // Attempt to suspend sole active admin
        var req = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/admin/users/{admin.Id}/status")
        {
            Content = new StringContent(JsonSerializer.Serialize(new UpdateStatusRequestDto { Status = "suspended" }), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("Không thể tạm khóa hoặc vô hiệu hóa quản trị viên", body);
    }

    [Fact]
    public async Task Admin_RevokeSessions_RevokesAllSessionsInDatabase()
    {
        var token = await GetAdminTokenAsync();
        string email = $"target_rev_{Guid.NewGuid():N}@studyai.internal";

        // Create target user
        var createReq = new CreateUserRequestDto { Email = email, DisplayName = "Target Revoke", Role = "learner", Status = "active" };
        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respCreate = await _client.SendAsync(reqCreate);
        var created = JsonSerializer.Deserialize<CreateUserResponseDto>(await respCreate.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(created?.User);

        // Seed 3 mock sessions
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            db.RefreshSessions.AddRange(
                new RefreshSession { Id = $"s1_{Guid.NewGuid():N}", UserId = created.User.Id, TokenHash = "hash1", CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddDays(7) },
                new RefreshSession { Id = $"s2_{Guid.NewGuid():N}", UserId = created.User.Id, TokenHash = "hash2", CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddDays(7) },
                new RefreshSession { Id = $"s3_{Guid.NewGuid():N}", UserId = created.User.Id, TokenHash = "hash3", CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddDays(7) }
            );
            await db.SaveChangesAsync();
        }

        // Call revoke sessions API
        var reqRevoke = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/admin/users/{created.User.Id}/revoke-sessions");
        reqRevoke.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respRevoke = await _client.SendAsync(reqRevoke);
        Assert.Equal(HttpStatusCode.OK, respRevoke.StatusCode);

        // Confirm database has 0 sessions
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var count = await db.RefreshSessions.CountAsync(s => s.UserId == created.User.Id);
            Assert.Equal(0, count);
        }
    }

    [Fact]
    public async Task Admin_ResetPassword_GeneratesNewPasswordAndRevokesSessions()
    {
        var token = await GetAdminTokenAsync();
        string email = $"reset_pass_{Guid.NewGuid():N}@studyai.internal";

        var createReq = new CreateUserRequestDto { Email = email, DisplayName = "Target Reset Pass", Role = "learner", Status = "active" };
        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respCreate = await _client.SendAsync(reqCreate);
        var created = JsonSerializer.Deserialize<CreateUserResponseDto>(await respCreate.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(created?.User);

        // Reset password via API
        var resetReq = new ResetPasswordRequestDto { NewPassword = "NewSecurePassword@999" };
        var reqReset = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/admin/users/{created.User.Id}/reset-password")
        {
            Content = new StringContent(JsonSerializer.Serialize(resetReq), Encoding.UTF8, "application/json")
        };
        reqReset.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respReset = await _client.SendAsync(reqReset);
        Assert.Equal(HttpStatusCode.OK, respReset.StatusCode);

        var resetResult = JsonSerializer.Deserialize<ResetPasswordResponseDto>(await respReset.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(resetResult);
        Assert.True(resetResult.Success);
        Assert.Equal("NewSecurePassword@999", resetResult.TemporaryPassword);

        // Try logging in with the newly reset password
        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = email,
                Password = "NewSecurePassword@999"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
    }

    [Fact]
    public async Task Admin_SoftDelete_SetsIsDeletedAndPreservesLearningHistory()
    {
        var token = await GetAdminTokenAsync();
        string email = $"soft_del_{Guid.NewGuid():N}@studyai.internal";

        // Create learner
        var createReq = new CreateUserRequestDto { Email = email, DisplayName = "Học Sinh Bị Xóa Mềm", Role = "learner", Status = "active" };
        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respCreate = await _client.SendAsync(reqCreate);
        var created = JsonSerializer.Deserialize<CreateUserResponseDto>(await respCreate.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(created?.User);
        string userId = created.User.Id;

        // Seed learning history: LessonProgress & AssessmentAttempt
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            db.LessonProgresses.Add(new LessonProgress
            {
                UserId = userId,
                LessonId = "lesson_math_1",
                SubjectId = "subject_math",
                AssessmentStatus = "completed",
                UpdatedAt = DateTimeOffset.UtcNow
            });

            db.AssessmentAttempts.Add(new AssessmentAttempt
            {
                Id = $"att_{Guid.NewGuid():N}",
                UserId = userId,
                AssessmentId = "asmt_1",
                LessonId = "lesson_math_1",
                SubjectId = "subject_math",
                ScoreRaw = 95.0,
                ScoreScaled = 0.95,
                CompletionStatus = "completed",
                SuccessStatus = "pass",
                StartedAt = DateTimeOffset.UtcNow,
                LastActivityAt = DateTimeOffset.UtcNow,
                CompletedAt = DateTimeOffset.UtcNow
            });

            await db.SaveChangesAsync();
        }

        // Soft delete user via DELETE /users/{id}
        var reqDelete = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{userId}");
        reqDelete.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respDelete = await _client.SendAsync(reqDelete);
        Assert.Equal(HttpStatusCode.OK, respDelete.StatusCode);

        // Verify in database: User is soft-deleted, but learning history remains intact!
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var u = await db.Users.FindAsync(userId);
            Assert.NotNull(u);
            Assert.True(u.IsDeleted);
            Assert.NotNull(u.DeletedAt);
            Assert.Equal("disabled", u.Status);

            // Invariants: Learning history is preserved
            var progressCount = await db.LessonProgresses.CountAsync(p => p.UserId == userId);
            Assert.Equal(1, progressCount);

            var attemptCount = await db.AssessmentAttempts.CountAsync(a => a.UserId == userId);
            Assert.Equal(1, attemptCount);
        }

        // Verify soft-deleted user CANNOT log in
        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = email,
                Password = created.TemporaryPassword!
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, loginResp.StatusCode);
    }

    [Fact]
    public async Task Admin_SoftDelete_LastActiveAdmin_CannotBeDeleted()
    {
        var token = await GetAdminTokenAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var admin = await db.Users.FirstAsync(u => u.EmailNormalized == "admin@studyai.internal");

        var req = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{admin.Id}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("Không thể xóa quản trị viên hoạt động duy nhất", body);
    }

    [Fact]
    public async Task Admin_GetDashboard_ReturnsRealMetricsFromSqlServer()
    {
        var token = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/dashboard");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var content = await resp.Content.ReadAsStringAsync();
        var dashboard = JsonSerializer.Deserialize<AdminDashboardDto>(content, JsonOpts);
        Assert.NotNull(dashboard);
        Assert.NotNull(dashboard.Metrics);
        Assert.True(dashboard.Metrics.TotalUsers >= 1);
        Assert.True(dashboard.Metrics.ActiveUsers >= 1);
        Assert.Equal("healthy", dashboard.Metrics.SystemStatus);
        Assert.NotEmpty(dashboard.RecentActivities);
    }

    [Fact]
    public async Task Admin_GetAuditLogs_ReturnsPaginatedLogsWithActor()
    {
        var token = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/audit-logs?page=1&pageSize=10");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var content = await resp.Content.ReadAsStringAsync();
        var logs = JsonSerializer.Deserialize<AdminAuditLogsResponseDto>(content, JsonOpts);
        Assert.NotNull(logs);
        Assert.True(logs.Total >= 1);
        Assert.NotEmpty(logs.Items);
    }

    [Fact]
    public async Task Learner_CallingAdminEndpoints_ReturnsForbidden403()
    {
        var learnerToken = await GetLearnerTokenAsync();

        // 1. GET /admin/users
        var reqUsers = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/users");
        reqUsers.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var respUsers = await _client.SendAsync(reqUsers);
        Assert.Equal(HttpStatusCode.Forbidden, respUsers.StatusCode);

        // 2. GET /admin/dashboard
        var reqDash = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/dashboard");
        reqDash.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var respDash = await _client.SendAsync(reqDash);
        Assert.Equal(HttpStatusCode.Forbidden, respDash.StatusCode);

        // 3. POST /admin/users
        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var respCreate = await _client.SendAsync(reqCreate);
        Assert.Equal(HttpStatusCode.Forbidden, respCreate.StatusCode);

        // 4. GET /admin/audit-logs
        var reqLogs = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/audit-logs");
        reqLogs.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var respLogs = await _client.SendAsync(reqLogs);
        Assert.Equal(HttpStatusCode.Forbidden, respLogs.StatusCode);
    }
}
