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
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var adminUser = await db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == "ADMIN@STUDYAI.INTERNAL" || u.EmailNormalized == "admin@studyai.internal");
            if (adminUser != null && (adminUser.Role != "admin" || adminUser.Status != "active"))
            {
                adminUser.Role = "admin";
                adminUser.Status = "active";
                await db.SaveChangesAsync();
            }
        }

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
            Role = "content",
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
        Assert.Equal("content", updated.Role);
    }

    [Fact]
    public async Task Admin_UpdateRole_LastActiveAdmin_CannotBeDemoted()
    {
        var token = await GetAdminTokenAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var admin = await db.Users.FirstAsync(u => u.EmailNormalized == "admin@studyai.internal");

        // Temporarily disable any other active admins so admin@studyai.internal is the sole active admin
        var otherAdmins = await db.Users.Where(u => u.Role == "admin" && u.Id != admin.Id && u.Status == "active").ToListAsync();
        foreach (var oa in otherAdmins)
        {
            oa.Status = "disabled";
        }
        await db.SaveChangesAsync();

        try
        {
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
        finally
        {
            foreach (var oa in otherAdmins)
            {
                oa.Status = "active";
            }
            admin.Role = "admin";
            admin.Status = "active";
            await db.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task Admin_UpdateStatus_LastActiveAdmin_CannotBeDisabledOrSuspended()
    {
        var token = await GetAdminTokenAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var admin = await db.Users.FirstAsync(u => u.EmailNormalized == "admin@studyai.internal");

        // Temporarily disable any other active admins so admin@studyai.internal is the sole active admin
        var otherAdmins = await db.Users.Where(u => u.Role == "admin" && u.Id != admin.Id && u.Status == "active").ToListAsync();
        foreach (var oa in otherAdmins)
        {
            oa.Status = "disabled";
        }
        await db.SaveChangesAsync();

        try
        {
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
        finally
        {
            foreach (var oa in otherAdmins)
            {
                oa.Status = "active";
            }
            admin.Role = "admin";
            admin.Status = "active";
            await db.SaveChangesAsync();
        }
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

        // Temporarily disable any other active admins so admin@studyai.internal is the sole active admin
        var otherAdmins = await db.Users.Where(u => u.Role == "admin" && u.Id != admin.Id && u.Status == "active").ToListAsync();
        foreach (var oa in otherAdmins)
        {
            oa.Status = "disabled";
        }
        await db.SaveChangesAsync();

        try
        {
            var req = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{admin.Id}");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var resp = await _client.SendAsync(req);
            Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
            var body = await resp.Content.ReadAsStringAsync();
            Assert.Contains("Không thể xóa quản trị viên hoạt động duy nhất", body);
        }
        finally
        {
            foreach (var oa in otherAdmins)
            {
                oa.Status = "active";
            }
            admin.Role = "admin";
            admin.Status = "active";
            await db.SaveChangesAsync();
        }
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

    [Fact]
    public async Task Admin_UpdateSettings_PersistsAndReadsFromSecondSession_ReturnsEffectiveSettings()
    {
        var tokenSession1 = await GetAdminTokenAsync();

        // Session 1: Admin updates operational settings
        var updatedSettings = new OperationalSettingsDto
        {
            SystemName = "STUDY_AI Enterprise Production",
            SystemDescription = "Hệ thống học tập thông minh chuẩn hóa dữ liệu",
            Language = "vi-VN",
            PassingScoreThreshold = 7.5,
            LowScoreAlertThreshold = 6.0,
            AttentionProgressThreshold = 70,
            RequireApprovalBeforePublish = true,
            AllowRevisionRequests = true,
            ShowArchivedContent = false,
            NotificationDisplayDays = 14,
            EnableDemoAlerts = false
        };

        var reqPut = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(updatedSettings), Encoding.UTF8, "application/json")
        };
        reqPut.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenSession1);

        var respPut = await _client.SendAsync(reqPut);
        Assert.Equal(HttpStatusCode.OK, respPut.StatusCode);

        // Verify directly in database StudyAIDb_E2E
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var auditLog = await db.StaffAuditLogs
                .Where(l => l.TargetType == "system_settings" && l.Action == "system_settings_updated")
                .OrderByDescending(l => l.CreatedAt)
                .FirstOrDefaultAsync();

            Assert.NotNull(auditLog);
            Assert.Contains("STUDY_AI Enterprise Production", auditLog.Payload);
            Assert.Contains("7.5", auditLog.Payload);
        }

        // Session 2: Second browser session retrieves settings from server
        var clientSession2 = _factory.CreateClient();
        var tokenSession2 = await GetAdminTokenAsync();

        var reqGet = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/settings");
        reqGet.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenSession2);

        var respGet = await clientSession2.SendAsync(reqGet);
        Assert.Equal(HttpStatusCode.OK, respGet.StatusCode);

        var bodyGet = await respGet.Content.ReadAsStringAsync();
        var retrievedSettings = JsonSerializer.Deserialize<OperationalSettingsDto>(bodyGet, JsonOpts);

        Assert.NotNull(retrievedSettings);
        Assert.Equal("STUDY_AI Enterprise Production", retrievedSettings.SystemName);
        Assert.Equal(7.5, retrievedSettings.PassingScoreThreshold);
        Assert.Equal(14, retrievedSettings.NotificationDisplayDays);
        Assert.Equal("vi-VN", retrievedSettings.Language);
    }

    [Fact]
    public async Task Admin_CreateAnnouncement_TargetedToRecipients_PersistsAndDeliversCorrectly()
    {
        var token = await GetAdminTokenAsync();

        var announcementReq = new SaveAnnouncementRequestDto
        {
            Title = "Lịch thi khảo sát học kỳ II năm học 2026",
            Content = "Toàn bộ học viên khối 12 tham gia thi thử tốt nghiệp THPT Quốc gia môn Toán.",
            Audience = "learner",
            Severity = "warning",
            Status = "published"
        };

        // 1. Admin creates announcement
        var reqPost = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/announcements")
        {
            Content = new StringContent(JsonSerializer.Serialize(announcementReq), Encoding.UTF8, "application/json")
        };
        reqPost.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var respPost = await _client.SendAsync(reqPost);
        Assert.Equal(HttpStatusCode.Created, respPost.StatusCode);

        var bodyPost = await respPost.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<AnnouncementDto>(bodyPost, JsonOpts);
        Assert.NotNull(created);
        Assert.False(string.IsNullOrWhiteSpace(created.Id));
        Assert.Equal("Lịch thi khảo sát học kỳ II năm học 2026", created.Title);
        Assert.Equal("learner", created.Audience);
        Assert.Equal("warning", created.Severity);

        // 2. Verify persistence in StudyAIDb_E2E
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var log = await db.StaffAuditLogs.FirstOrDefaultAsync(l => l.TargetType == "announcement" && l.TargetId == created.Id);
            Assert.NotNull(log);
            Assert.Equal(created.Id, log.TargetId);

            var persisted = JsonSerializer.Deserialize<AnnouncementDto>(log.Payload, JsonOpts);
            Assert.NotNull(persisted);
            Assert.Equal(created.Title, persisted.Title);
            Assert.Equal("learner", persisted.Audience);
        }

        // 3. Second browser session queries announcement list and verifies targeted audience
        var clientSession2 = _factory.CreateClient();
        var reqList = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/announcements");
        reqList.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var respList = await clientSession2.SendAsync(reqList);
        Assert.Equal(HttpStatusCode.OK, respList.StatusCode);

        var bodyList = await respList.Content.ReadAsStringAsync();
        var list = JsonSerializer.Deserialize<List<AnnouncementDto>>(bodyList, JsonOpts);
        Assert.NotNull(list);

        var match = list.FirstOrDefault(a => a.Id == created.Id);
        Assert.NotNull(match);
        Assert.Equal("learner", match.Audience);
        Assert.Equal("warning", match.Severity);
    }

    [Fact]
    public async Task Admin_Endpoints_ErrorHandling_Returns401_403_404_400_Evidence()
    {
        // 1. 401 Unauthorized: Calling protected endpoints without token
        var req401 = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/settings");
        var resp401 = await _client.SendAsync(req401);
        Assert.Equal(HttpStatusCode.Unauthorized, resp401.StatusCode);

        var req401Invalid = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/users");
        req401Invalid.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "invalid-token-xyz");
        var resp401Invalid = await _client.SendAsync(req401Invalid);
        Assert.Equal(HttpStatusCode.Unauthorized, resp401Invalid.StatusCode);

        // 2. 403 Forbidden: Learner attempting admin actions
        var learnerToken = await GetLearnerTokenAsync();

        var req403Settings = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json")
        };
        req403Settings.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var resp403Settings = await _client.SendAsync(req403Settings);
        Assert.Equal(HttpStatusCode.Forbidden, resp403Settings.StatusCode);

        var req403Announce = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/announcements")
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json")
        };
        req403Announce.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var resp403Announce = await _client.SendAsync(req403Announce);
        Assert.Equal(HttpStatusCode.Forbidden, resp403Announce.StatusCode);

        // 3. 404 Not Found: Admin querying non-existent user ID
        var adminToken = await GetAdminTokenAsync();
        var req404 = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/admin/users/{Guid.NewGuid():D}");
        req404.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var resp404 = await _client.SendAsync(req404);
        Assert.Equal(HttpStatusCode.NotFound, resp404.StatusCode);

        // 4. 400 Bad Request: Admin creating user with invalid input
        var req400 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateUserRequestDto
            {
                Email = "",
                DisplayName = "No Email User",
                Role = "learner"
            }), Encoding.UTF8, "application/json")
        };
        req400.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var resp400 = await _client.SendAsync(req400);
        Assert.Equal(HttpStatusCode.BadRequest, resp400.StatusCode);
    }

    [Fact]
    public async Task Admin_MultiSession_Browser1UpdatesUser_Browser2ReadsIdenticalData_StudyAIDb_E2E()
    {
        var tokenSession1 = await GetAdminTokenAsync();

        // 1. Session 1 creates a test user
        var uniqueEmail = $"multisession.{Guid.NewGuid():N}@studyai.test";
        var createReq = new CreateUserRequestDto
        {
            Email = uniqueEmail,
            DisplayName = "Đồng Bộ Phiên Trình Duyệt",
            Role = "teacher",
            Grade = "Lớp 12",
            Status = "active"
        };

        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenSession1);

        var respCreate = await _client.SendAsync(reqCreate);
        Assert.Equal(HttpStatusCode.Created, respCreate.StatusCode);

        var bodyCreate = await respCreate.Content.ReadAsStringAsync();
        var created = JsonSerializer.Deserialize<CreateUserResponseDto>(bodyCreate, JsonOpts);
        Assert.NotNull(created);
        Assert.NotNull(created.User);
        var userId = created.User.Id;

        // 2. Session 1 updates role to 'content' and changes display name
        var updateReq = new UpdateUserRequestDto
        {
            DisplayName = "Đồng Bộ Phiên Trình Duyệt - Đã Cập Nhật",
            Role = "content",
            Status = "active"
        };
        var reqPut = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/users/{userId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateReq), Encoding.UTF8, "application/json")
        };
        reqPut.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenSession1);

        var respPut = await _client.SendAsync(reqPut);
        Assert.Equal(HttpStatusCode.OK, respPut.StatusCode);

        // 3. Browser Session 2 (distinct HttpClient & separate auth query) reads user details
        var clientSession2 = _factory.CreateClient();
        var tokenSession2 = await GetAdminTokenAsync();

        var reqGet = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/admin/users/{userId}");
        reqGet.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenSession2);

        var respGet = await clientSession2.SendAsync(reqGet);
        Assert.Equal(HttpStatusCode.OK, respGet.StatusCode);

        var bodyGet = await respGet.Content.ReadAsStringAsync();
        var userInSession2 = JsonSerializer.Deserialize<AdminUserDetailDto>(bodyGet, JsonOpts);

        Assert.NotNull(userInSession2);
        Assert.Equal(userId, userInSession2.Id);
        Assert.Equal("Đồng Bộ Phiên Trình Duyệt - Đã Cập Nhật", userInSession2.DisplayName);
        Assert.Equal("content", userInSession2.Role);
        Assert.Equal("active", userInSession2.Status);

        // Clean up test account
        var reqDel = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{userId}");
        reqDel.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenSession1);
        await _client.SendAsync(reqDel);
    }

    [Fact]
    public async Task Admin_CreateTeacher_GeneratesUniqueSecurePassword_RejectsHardcodedPassword()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Create a new teacher via admin endpoint without supplying password
        var uniqueEmail = $"teacher.secure.{Guid.NewGuid():N}@studyai.test";
        var createReq = new SaveTeacherRequestDto
        {
            Name = "Thầy Giáo Bảo Mật Cao",
            Email = uniqueEmail,
            Subject = "Toán 12",
            Status = "active"
        };

        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var respCreate = await _client.SendAsync(reqCreate);
        Assert.Equal(HttpStatusCode.Created, respCreate.StatusCode);

        var bodyCreate = await respCreate.Content.ReadAsStringAsync();
        var teacherDto = JsonSerializer.Deserialize<AdminTeacherDto>(bodyCreate, JsonOpts);

        Assert.NotNull(teacherDto);
        Assert.NotNull(teacherDto.TemporaryPassword);
        // Must NOT be the legacy insecure hardcoded password
        Assert.NotEqual("Teacher@123456", teacherDto.TemporaryPassword);
        Assert.True(teacherDto.TemporaryPassword.Length >= 12, "Temporary password must be at least 12 characters long.");

        // 2. Attempt login with the legacy shared password "Teacher@123456" -> MUST FAIL (401)
        var loginInsecureReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                email = uniqueEmail,
                password = "Teacher@123456"
            }), Encoding.UTF8, "application/json")
        };
        var respInsecure = await _client.SendAsync(loginInsecureReq);
        Assert.Equal(HttpStatusCode.Unauthorized, respInsecure.StatusCode);

        // 3. Attempt login with the securely generated TemporaryPassword -> MUST SUCCEED (200)
        var loginSecureReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                email = uniqueEmail,
                password = teacherDto.TemporaryPassword
            }), Encoding.UTF8, "application/json")
        };
        var respSecure = await _client.SendAsync(loginSecureReq);
        Assert.Equal(HttpStatusCode.OK, respSecure.StatusCode);

        // Clean up test teacher account
        var reqDel = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{teacherDto.Id}");
        reqDel.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        await _client.SendAsync(reqDel);
    }

    [Fact]
    public async Task Admin_GetReports_PreservesZeroCounts_And_DoesNotFabricateSampleData()
    {
        var adminToken = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/reports");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        var reports = JsonSerializer.Deserialize<LearningReportsResponseDto>(body, JsonOpts);

        Assert.NotNull(reports);
        // Verify ActivityTrend is returned and activeUsers / lessonsCompleted are valid real counts (not fabricated 650+ / 420+)
        Assert.NotNull(reports.ActivityTrend);
        Assert.All(reports.ActivityTrend, item =>
        {
            Assert.True(item.ActiveUsers >= 0);
            Assert.True(item.CompletedLessons >= 0);
            // Must NOT have the fabricated formulas: 650 + (i % 5) * 20 or 420 + (i % 4) * 25
            Assert.True(item.ActiveUsers < 650 || reports.TotalLearners >= 650);
        });

        // Verify SubjectProgress does NOT contain fabricated subjects like "Vật lý", "Hóa học"
        Assert.NotNull(reports.SubjectProgress);
        Assert.DoesNotContain(reports.SubjectProgress, sp => sp.Subject == "Vật lý" || sp.Subject == "Hóa học");

        // Verify ScoreDistribution exists and is properly structured
        Assert.NotNull(reports.ScoreDistribution);
        Assert.Equal(4, reports.ScoreDistribution.Count);
        Assert.Contains(reports.ScoreDistribution, d => d.Range.Contains("Xuất sắc"));
        Assert.Contains(reports.ScoreDistribution, d => d.Range.Contains("Giỏi"));
        Assert.Contains(reports.ScoreDistribution, d => d.Range.Contains("Khá"));
        Assert.Contains(reports.ScoreDistribution, d => d.Range.Contains("Trung bình"));
    }

    [Fact]
    public async Task Admin_GetReports_And_UserDetail_NormalizesScores_UsingScoreMax()
    {
        var adminToken = await GetAdminTokenAsync();
        var studentId = $"usr_norm_{Guid.NewGuid():N}"[..12];
        var attemptId = $"atm_norm_{Guid.NewGuid():N}"[..12];

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var user = new User
            {
                Id = studentId,
                DisplayName = "Học sinh Chuẩn Hóa Điểm",
                Email = $"student.norm.{Guid.NewGuid():N}@studyai.test",
                EmailNormalized = $"STUDENT.NORM.{Guid.NewGuid():N}@STUDYAI.TEST",
                Role = "student",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Users.Add(user);

            // Raw score 20 out of 40 = 50% = 5.0 on a 10-point scale
            // If NOT normalized, 20.0 would be categorized as "Xuất sắc (>= 8.0)"!
            // When properly normalized to 5.0, it MUST be categorized as "Trung bình (< 6.5)".
            var attempt = new AssessmentAttempt
            {
                Id = attemptId,
                UserId = studentId,
                AssessmentId = "asmt_test_norm",
                SubjectId = "sub_math10",
                ScoreRaw = 20.0,
                ScoreMax = 40.0,
                ScoreScaled = null,
                CompletedAt = DateTimeOffset.UtcNow,
                StartedAt = DateTimeOffset.UtcNow.AddMinutes(-30)
            };
            db.AssessmentAttempts.Add(attempt);
            await db.SaveChangesAsync();
        }

        try
        {
            // 1. Verify UserDetail returns normalized score 5.0
            var reqDetail = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/admin/users/{studentId}");
            reqDetail.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var respDetail = await _client.SendAsync(reqDetail);
            Assert.Equal(HttpStatusCode.OK, respDetail.StatusCode);

            var detailBody = await respDetail.Content.ReadAsStringAsync();
            var detail = JsonSerializer.Deserialize<AdminUserDetailDto>(detailBody, JsonOpts);
            Assert.NotNull(detail);
            Assert.Equal(5.0, detail.AverageScore);
            Assert.NotEmpty(detail.Assessments);
            var userAttempt = detail.Assessments.FirstOrDefault(a => a.Id == attemptId);
            Assert.NotNull(userAttempt);
            Assert.Equal(5.0, userAttempt.Score);

            // 2. Verify GetReports puts the normalized 5.0 in the "< 6.5" range
            var reqReports = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/reports");
            reqReports.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var respReports = await _client.SendAsync(reqReports);
            Assert.Equal(HttpStatusCode.OK, respReports.StatusCode);

            var reportsBody = await respReports.Content.ReadAsStringAsync();
            var reports = JsonSerializer.Deserialize<LearningReportsResponseDto>(reportsBody, JsonOpts);
            Assert.NotNull(reports);
            var lowRange = reports.ScoreDistribution.FirstOrDefault(d => d.Range.Contains("< 6.5"));
            Assert.NotNull(lowRange);
            Assert.True(lowRange.Count >= 1, "Attempt with normalized score 5.0 must fall in the < 6.5 bucket");
        }
        finally
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var att = await db.AssessmentAttempts.FindAsync(attemptId);
            if (att != null) db.AssessmentAttempts.Remove(att);
            var u = await db.Users.FindAsync(studentId);
            if (u != null) db.Users.Remove(u);
            await db.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task Admin_UpdateTeacher_PersistsProfileFields_And_ReturnsThemOnReload()
    {
        var adminToken = await GetAdminTokenAsync();
        var teacherEmail = $"teacher.profile.{Guid.NewGuid():N}@studyai.test";

        // 1. Create teacher
        var createReq = new SaveTeacherRequestDto
        {
            Name = "Thầy Profile Test",
            Email = teacherEmail,
            Subject = "Toán 11",
            Phone = "0912345678",
            Qualifications = "Thạc sĩ Toán học",
            ExperienceYears = 8,
            Bio = "Giáo viên chuyên ôn thi THPT Quốc gia",
            Status = "active"
        };
        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respCreate = await _client.SendAsync(reqCreate);
        Assert.True(respCreate.StatusCode == HttpStatusCode.Created || respCreate.StatusCode == HttpStatusCode.OK);

        var createdTeacher = JsonSerializer.Deserialize<AdminTeacherDto>(await respCreate.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(createdTeacher);
        var teacherId = createdTeacher.Id;

        try
        {
            // 2. Update profile fields
            var updatedEmail = $"teacher.updated.{Guid.NewGuid():N}@studyai.test";
            var updateReq = new SaveTeacherRequestDto
            {
                Name = "Thầy Profile Test Đã Đổi Tên",
                Email = updatedEmail,
                Subject = "Toán 10",
                Phone = "0987654321",
                Qualifications = "Tiến sĩ Toán - Tin",
                ExperienceYears = 12,
                Bio = "Chuyên gia bồi dưỡng học sinh giỏi Toán",
                Status = "active"
            };
            var reqUpdate = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/teachers/{teacherId}")
            {
                Content = new StringContent(JsonSerializer.Serialize(updateReq), Encoding.UTF8, "application/json")
            };
            reqUpdate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var respUpdate = await _client.SendAsync(reqUpdate);
            Assert.Equal(HttpStatusCode.OK, respUpdate.StatusCode);

            // 3. Reload teacher list and verify persisted fields from database
            var reqList = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/teachers");
            reqList.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var respList = await _client.SendAsync(reqList);
            Assert.Equal(HttpStatusCode.OK, respList.StatusCode);

            var list = JsonSerializer.Deserialize<List<AdminTeacherDto>>(await respList.Content.ReadAsStringAsync(), JsonOpts);
            Assert.NotNull(list);
            var reloadedTeacher = list.FirstOrDefault(t => t.Id == teacherId);
            Assert.NotNull(reloadedTeacher);
            Assert.Equal("Thầy Profile Test Đã Đổi Tên", reloadedTeacher.Name);
            Assert.Equal(updatedEmail, reloadedTeacher.Email);
            Assert.Equal("0987654321", reloadedTeacher.Phone);
            Assert.Equal("Tiến sĩ Toán - Tin", reloadedTeacher.Qualifications);
            Assert.Equal(12, reloadedTeacher.ExperienceYears);
            Assert.Equal("Chuyên gia bồi dưỡng học sinh giỏi Toán", reloadedTeacher.Bio);
            Assert.Contains("Toán 10", reloadedTeacher.Subject);
        }
        finally
        {
            var reqDel = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{teacherId}");
            reqDel.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            await _client.SendAsync(reqDel);
        }
    }

    [Fact]
    public async Task Admin_UpdateTeacher_DuplicateEmail_ReturnsBadRequest()
    {
        var adminToken = await GetAdminTokenAsync();
        var email1 = $"teacher1.{Guid.NewGuid():N}@studyai.test";
        var email2 = $"teacher2.{Guid.NewGuid():N}@studyai.test";

        // Create teacher 1
        var reqCreate1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
            {
                Name = "Giáo Viên Một",
                Email = email1,
                Subject = "Toán 12"
            }), Encoding.UTF8, "application/json")
        };
        reqCreate1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var resp1 = await _client.SendAsync(reqCreate1);
        var t1 = JsonSerializer.Deserialize<AdminTeacherDto>(await resp1.Content.ReadAsStringAsync(), JsonOpts)!;

        // Create teacher 2
        var reqCreate2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
            {
                Name = "Giáo Viên Hai",
                Email = email2,
                Subject = "Toán 12"
            }), Encoding.UTF8, "application/json")
        };
        reqCreate2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var resp2 = await _client.SendAsync(reqCreate2);
        var t2 = JsonSerializer.Deserialize<AdminTeacherDto>(await resp2.Content.ReadAsStringAsync(), JsonOpts)!;

        try
        {
            // Attempt to update teacher 2's email to teacher 1's email -> MUST RETURN 400 BadRequest
            var reqUpdateDup = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/teachers/{t2.Id}")
            {
                Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
                {
                    Name = "Giáo Viên Hai Đổi Mail",
                    Email = email1, // Duplicate!
                    Subject = "Toán 12"
                }), Encoding.UTF8, "application/json")
            };
            reqUpdateDup.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var respDup = await _client.SendAsync(reqUpdateDup);

            Assert.Equal(HttpStatusCode.BadRequest, respDup.StatusCode);
            var errBody = await respDup.Content.ReadAsStringAsync();
            Assert.Contains("đã được sử dụng", errBody);
        }
        finally
        {
            var reqDel1 = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{t1.Id}");
            reqDel1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            await _client.SendAsync(reqDel1);

            var reqDel2 = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{t2.Id}");
            reqDel2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            await _client.SendAsync(reqDel2);
        }
    }
}
