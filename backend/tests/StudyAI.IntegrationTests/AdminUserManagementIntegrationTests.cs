using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

using StudyAI.Models;
using StudyAI.Data;
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
    public async Task Admin_CreateUser_Teacher_SucceedsWithExplicitPasswordAndAuditLog()
    {
        var token = await GetAdminTokenAsync();
        var email = $"teacher_{Guid.NewGuid():N}@studyai.internal";

        var createReq = new CreateUserRequestDto
        {
            Email = email,
            DisplayName = "Thầy Giáo Mẫu",
            Role = "teacher",
            Status = "active",
            Password = "TeacherSecret@2026"
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

        // Verify login succeeds with explicit password
        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = email,
                Password = "TeacherSecret@2026"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

        // Verify audit log
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var log = await db.StaffAuditLogs.FirstOrDefaultAsync(l => l.TargetId == created.User.Id && l.Action == "user_created");
        Assert.NotNull(log);
        Assert.Equal("user", log.TargetType);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("short")]
    public async Task Admin_CreateUser_MissingOrInvalidPassword_ReturnsBadRequest400(string? invalidPassword)
    {
        var token = await GetAdminTokenAsync();
        var email = $"teacher_badpass_{Guid.NewGuid():N}@studyai.internal";

        var createReq = new CreateUserRequestDto
        {
            Email = email,
            DisplayName = "Thầy Giáo Mẫu",
            Role = "teacher",
            Status = "active",
            Password = invalidPassword
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
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
            Status = "active",
            Password = "ValidPassword@123"
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
            Grade = "11",
            Password = "ValidPassword@123"
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
        string emailA = $"target_rev_a_{Guid.NewGuid():N}@studyai.internal";
        string emailB = $"target_rev_b_{Guid.NewGuid():N}@studyai.internal";

        // Create target user A
        var createReqA = new CreateUserRequestDto { Email = emailA, DisplayName = "Target Revoke A", Role = "learner", Status = "active", Password = "ValidPassword@123" };
        var reqCreateA = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReqA), Encoding.UTF8, "application/json")
        };
        reqCreateA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respCreateA = await _client.SendAsync(reqCreateA);
        var createdA = JsonSerializer.Deserialize<CreateUserResponseDto>(await respCreateA.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(createdA?.User);

        // Create target user B
        var createReqB = new CreateUserRequestDto { Email = emailB, DisplayName = "Target Revoke B", Role = "learner", Status = "active", Password = "ValidPassword@123" };
        var reqCreateB = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReqB), Encoding.UTF8, "application/json")
        };
        reqCreateB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respCreateB = await _client.SendAsync(reqCreateB);
        var createdB = JsonSerializer.Deserialize<CreateUserResponseDto>(await respCreateB.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(createdB?.User);

        // Seed 3 active sessions for user A, and 2 active sessions for user B
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            db.RefreshSessions.AddRange(
                new RefreshSession { Id = $"sa1_{Guid.NewGuid():N}", UserId = createdA.User.Id, TokenHash = "hash1", CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddDays(7) },
                new RefreshSession { Id = $"sa2_{Guid.NewGuid():N}", UserId = createdA.User.Id, TokenHash = "hash2", CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddDays(7) },
                new RefreshSession { Id = $"sa3_{Guid.NewGuid():N}", UserId = createdA.User.Id, TokenHash = "hash3", CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddDays(7) },
                new RefreshSession { Id = $"sb1_{Guid.NewGuid():N}", UserId = createdB.User.Id, TokenHash = "hash4", CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddDays(7) },
                new RefreshSession { Id = $"sb2_{Guid.NewGuid():N}", UserId = createdB.User.Id, TokenHash = "hash5", CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddDays(7) }
            );
            await db.SaveChangesAsync();
        }

        // Call revoke sessions API for user A
        var reqRevoke = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/admin/users/{createdA.User.Id}/revoke-sessions");
        reqRevoke.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respRevoke = await _client.SendAsync(reqRevoke);
        Assert.Equal(HttpStatusCode.OK, respRevoke.StatusCode);

        var revokeContent = await respRevoke.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(revokeContent);
        Assert.Equal(3, doc.RootElement.GetProperty("revokedSessionsCount").GetInt32());

        // In database:
        // User A sessions must NOT be deleted: totalCount == 3, activeCount == 0, RevokedAt != null
        // User B sessions must remain intact: totalCount == 2, activeCount == 2, RevokedAt == null
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var sessionsA = await db.RefreshSessions.Where(s => s.UserId == createdA.User.Id).ToListAsync();
            Assert.Equal(3, sessionsA.Count);
            Assert.All(sessionsA, s => Assert.NotNull(s.RevokedAt));
            var activeCountA = sessionsA.Count(s => s.RevokedAt == null);
            Assert.Equal(0, activeCountA);

            var sessionsB = await db.RefreshSessions.Where(s => s.UserId == createdB.User.Id).ToListAsync();
            Assert.Equal(2, sessionsB.Count);
            Assert.All(sessionsB, s => Assert.Null(s.RevokedAt));
            var activeCountB = sessionsB.Count(s => s.RevokedAt == null);
            Assert.Equal(2, activeCountB);
        }

        // Second call for user A must be idempotent and return 0 newly revoked sessions
        var reqRevoke2 = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/admin/users/{createdA.User.Id}/revoke-sessions");
        reqRevoke2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respRevoke2 = await _client.SendAsync(reqRevoke2);
        Assert.Equal(HttpStatusCode.OK, respRevoke2.StatusCode);

        var revokeContent2 = await respRevoke2.Content.ReadAsStringAsync();
        using var doc2 = JsonDocument.Parse(revokeContent2);
        Assert.Equal(0, doc2.RootElement.GetProperty("revokedSessionsCount").GetInt32());
    }

    [Fact]
    public async Task Admin_ResetPassword_GeneratesNewPasswordAndRevokesSessions()
    {
        var token = await GetAdminTokenAsync();
        string email = $"reset_pass_{Guid.NewGuid():N}@studyai.internal";

        var createReq = new CreateUserRequestDto { Email = email, DisplayName = "Target Reset Pass", Role = "learner", Status = "active", Password = "InitialPassword@123" };
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

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("short")]
    public async Task Admin_ResetPassword_MissingOrInvalidNewPassword_ReturnsBadRequest400(string? invalidPassword)
    {
        var token = await GetAdminTokenAsync();
        string email = $"reset_pass_bad_{Guid.NewGuid():N}@studyai.internal";

        var createReq = new CreateUserRequestDto
        {
            Email = email,
            DisplayName = "Target Reset Pass Bad",
            Role = "learner",
            Status = "active",
            Password = "InitialValidPassword@123"
        };
        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respCreate = await _client.SendAsync(reqCreate);
        var created = JsonSerializer.Deserialize<CreateUserResponseDto>(await respCreate.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(created?.User);

        // Reset password with invalid password
        var resetReq = new ResetPasswordRequestDto { NewPassword = invalidPassword };
        var reqReset = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/admin/users/{created.User.Id}/reset-password")
        {
            Content = new StringContent(JsonSerializer.Serialize(resetReq), Encoding.UTF8, "application/json")
        };
        reqReset.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respReset = await _client.SendAsync(reqReset);
        Assert.Equal(HttpStatusCode.BadRequest, respReset.StatusCode);
    }

    [Fact]
    public async Task Admin_SoftDelete_SetsIsDeletedAndPreservesLearningHistory()
    {
        var token = await GetAdminTokenAsync();
        string email = $"soft_del_{Guid.NewGuid():N}@studyai.internal";

        // Create learner
        var createReq = new CreateUserRequestDto { Email = email, DisplayName = "Học Sinh Bị Xóa Mềm", Role = "learner", Status = "active", Password = "InitialPassword@123" };
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
                Password = "InitialPassword@123"
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

        // Session 1: Admin fetches current settings to get version token
        var reqGetInitial = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/settings");
        reqGetInitial.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenSession1);
        var respGetInitial = await _client.SendAsync(reqGetInitial);
        var current = JsonSerializer.Deserialize<OperationalSettingsDto>(await respGetInitial.Content.ReadAsStringAsync(), JsonOpts)!;

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
            EnableDemoAlerts = false,
            Version = current.Version
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
    public async Task Admin_UpdateSettings_ConcurrentParallelRequests_NeverThrowsDeadlock1205_ReturnsConflictForStaleTokens()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Fetch current settings to get baseline version
        var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/settings");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var getResp = await _client.SendAsync(getReq);
        var current = JsonSerializer.Deserialize<OperationalSettingsDto>(await getResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 2. Launch 6 concurrent update requests all presenting the SAME version token
        var tasks = Enumerable.Range(1, 6).Select(async i =>
        {
            var updateSettings = new OperationalSettingsDto
            {
                SystemName = $"STUDY_AI Parallel Test {i}",
                SystemDescription = $"Concurrency test iteration {i}",
                Language = "vi-VN",
                PassingScoreThreshold = 6.0 + (i * 0.1),
                LowScoreAlertThreshold = 5.0,
                AttentionProgressThreshold = 60,
                Version = current.Version // Same token across all parallel workers
            };

            var putReq = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
            {
                Content = new StringContent(JsonSerializer.Serialize(updateSettings), Encoding.UTF8, "application/json")
            };
            putReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

            return await _client.SendAsync(putReq);
        }).ToList();

        var responses = await Task.WhenAll(tasks);

        // Exactly one request should succeed (200 OK) with the initial token, and all others must receive 409 Conflict
        // NONE should fail with 500 Internal Server Error or SqlException 1205 deadlock victim!
        int okCount = responses.Count(r => r.StatusCode == HttpStatusCode.OK);
        int conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);
        int errorCount = responses.Count(r => (int)r.StatusCode >= 500);

        Assert.Equal(0, errorCount);
        Assert.Equal(1, okCount);
        Assert.Equal(5, conflictCount);
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
            Assert.False(string.IsNullOrWhiteSpace(log.Payload));

            var persisted = JsonSerializer.Deserialize<AnnouncementDto>(log.Payload!, JsonOpts);
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
            Status = "active",
            Password = "SessionPass@123"
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
    public async Task Admin_CreateTeacher_RequiresExplicitPassword_RejectsMissing_AndDoesNotReturnPlaintextPassword()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Attempt create teacher without password -> MUST FAIL (400)
        var missingPassReq = new SaveTeacherRequestDto
        {
            Name = "Thầy Không Có Mật Khẩu",
            Email = $"teacher.nopass.{Guid.NewGuid():N}@studyai.test",
            Subject = "Toán 12",
            Status = "active"
        };
        var reqNoPass = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(missingPassReq), Encoding.UTF8, "application/json")
        };
        reqNoPass.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respNoPass = await _client.SendAsync(reqNoPass);
        Assert.Equal(HttpStatusCode.BadRequest, respNoPass.StatusCode);

        // 2. Create teacher with explicit valid password -> MUST SUCCEED (201)
        var uniqueEmail = $"teacher.secure.{Guid.NewGuid():N}@studyai.test";
        var validPassword = "TeacherPassword@2026";
        var createReq = new SaveTeacherRequestDto
        {
            Name = "Thầy Giáo Bảo Mật Cao",
            Email = uniqueEmail,
            Subject = "Toán 12",
            Status = "active",
            Password = validPassword
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

        // 3. Attempt login with wrong password -> MUST FAIL (401)
        var loginInsecureReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                email = uniqueEmail,
                password = "WrongPassword@123"
            }), Encoding.UTF8, "application/json")
        };
        var respInsecure = await _client.SendAsync(loginInsecureReq);
        Assert.Equal(HttpStatusCode.Unauthorized, respInsecure.StatusCode);

        // 4. Attempt login with explicit password -> MUST SUCCEED (200)
        var loginSecureReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                email = uniqueEmail,
                password = validPassword
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
            Status = "active",
            Password = "TeacherProfile@123"
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
                Subject = "Toán 12",
                Password = "Teacher1@Secret"
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
                Subject = "Toán 12",
                Password = "Teacher2@Secret"
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

    [Fact]
    public async Task Admin_ToggleTeacherLock_PersistsSuspendedStatus_And_RejectsLogin()
    {
        // Issue 3: Locking teacher account must persist "suspended" in SQL and block authentication
        var adminToken = await GetAdminTokenAsync();
        var teacherEmail = $"teacher.lock.{Guid.NewGuid():N}@studyai.test";
        var password = "Teacher@123456";

        // 1. Create teacher
        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
            {
                Name = "Thầy Giáo Khóa Tài Khoản",
                Email = teacherEmail,
                Subject = "Toán 12",
                Password = password,
                AccountStatus = "ACTIVE"
            }), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respCreate = await _client.SendAsync(reqCreate);
        Assert.True(respCreate.StatusCode == HttpStatusCode.Created || respCreate.StatusCode == HttpStatusCode.OK);
        var teacher = JsonSerializer.Deserialize<AdminTeacherDto>(await respCreate.Content.ReadAsStringAsync(), JsonOpts)!;

        try
        {
            // Verify initial login succeeds
            var login1 = await _client.PostAsync("/api/v1/auth/login", new StringContent(
                JsonSerializer.Serialize(new UserLoginRequestDto { Email = teacherEmail, Password = password }),
                Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.OK, login1.StatusCode);

            // 2. Lock account via Admin API
            var reqLock = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/teachers/{teacher.Id}")
            {
                Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
                {
                    Name = "Thầy Giáo Khóa Tài Khoản",
                    Email = teacherEmail,
                    Subject = "Toán 12",
                    AccountStatus = "LOCKED"
                }), Encoding.UTF8, "application/json")
            };
            reqLock.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var respLock = await _client.SendAsync(reqLock);
            Assert.Equal(HttpStatusCode.OK, respLock.StatusCode);

            // 3. Database verification: status must be "suspended"
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
                var dbTeacher = await db.Users.FirstOrDefaultAsync(u => u.Id == teacher.Id);
                Assert.NotNull(dbTeacher);
                Assert.Equal("suspended", dbTeacher.Status);
            }

            // 4. Login attempt when locked must be REJECTED (403 Forbidden)
            var loginLocked = await _client.PostAsync("/api/v1/auth/login", new StringContent(
                JsonSerializer.Serialize(new UserLoginRequestDto { Email = teacherEmail, Password = password }),
                Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.Forbidden, loginLocked.StatusCode);

            // 5. Unlock account via Admin API
            var reqUnlock = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/teachers/{teacher.Id}")
            {
                Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
                {
                    Name = "Thầy Giáo Khóa Tài Khoản",
                    Email = teacherEmail,
                    Subject = "Toán 12",
                    AccountStatus = "ACTIVE"
                }), Encoding.UTF8, "application/json")
            };
            reqUnlock.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var respUnlock = await _client.SendAsync(reqUnlock);
            Assert.Equal(HttpStatusCode.OK, respUnlock.StatusCode);

            // 6. Database verification: status must be "active"
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
                var dbTeacher = await db.Users.FirstOrDefaultAsync(u => u.Id == teacher.Id);
                Assert.NotNull(dbTeacher);
                Assert.Equal("active", dbTeacher.Status);
            }

            // 7. Login succeeds again
            var loginUnlocked = await _client.PostAsync("/api/v1/auth/login", new StringContent(
                JsonSerializer.Serialize(new UserLoginRequestDto { Email = teacherEmail, Password = password }),
                Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.OK, loginUnlocked.StatusCode);
        }
        finally
        {
            var reqDel = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{teacher.Id}");
            reqDel.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            await _client.SendAsync(reqDel);
        }
    }

    [Fact]
    public async Task Admin_UpdateTeacher_PartialUpdate_PreservesExistingProfileFields()
    {
        // Issue 4: Dedicated TeacherProfiles table preserves fields when partial update is sent
        var adminToken = await GetAdminTokenAsync();
        var teacherEmail = $"teacher.preserve.{Guid.NewGuid():N}@studyai.test";

        // 1. Create teacher
        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
            {
                Name = "Thầy Gốc Ban Đầu",
                Email = teacherEmail,
                Subject = "Toán 11",
                Phone = "0911223344",
                Qualifications = "Thạc Sĩ Toán Học",
                ExperienceYears = 7,
                Bio = "Chuyên gia Đại số tổ hợp",
                Password = "TeacherPreserve@123"
            }), Encoding.UTF8, "application/json")
        };
        reqCreate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respCreate = await _client.SendAsync(reqCreate);
        Assert.True(respCreate.StatusCode == HttpStatusCode.Created || respCreate.StatusCode == HttpStatusCode.OK);
        var teacher = JsonSerializer.Deserialize<AdminTeacherDto>(await respCreate.Content.ReadAsStringAsync(), JsonOpts)!;

        try
        {
            // 2. Perform partial update (e.g. only update name and account status, leaving phone/qualifications/experienceYears/bio null)
            var reqPartial = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/teachers/{teacher.Id}")
            {
                Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
                {
                    Name = "Thầy Gốc Đã Cập Nhật Tên",
                    Email = teacherEmail,
                    Subject = "Toán 11"
                    // Phone, Qualifications, ExperienceYears, Bio are omitted / null
                }), Encoding.UTF8, "application/json")
            };
            reqPartial.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var respPartial = await _client.SendAsync(reqPartial);
            Assert.Equal(HttpStatusCode.OK, respPartial.StatusCode);

            // 3. Direct DB check on TeacherProfiles table
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
                var profile = await db.TeacherProfiles.FirstOrDefaultAsync(tp => tp.TeacherId == teacher.Id);
                Assert.NotNull(profile);
                Assert.Equal("0911223344", profile.Phone);
                Assert.Equal("Thạc Sĩ Toán Học", profile.Qualifications);
                Assert.Equal(7, profile.ExperienceYears);
                Assert.Equal("Chuyên gia Đại số tổ hợp", profile.Bio);
            }

            // 4. API list check
            var reqList = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/teachers");
            reqList.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var respList = await _client.SendAsync(reqList);
            var teachers = JsonSerializer.Deserialize<List<AdminTeacherDto>>(await respList.Content.ReadAsStringAsync(), JsonOpts)!;
            var reloaded = teachers.FirstOrDefault(t => t.Id == teacher.Id);
            Assert.NotNull(reloaded);
            Assert.Equal("Thầy Gốc Đã Cập Nhật Tên", reloaded.Name);
            Assert.Equal("0911223344", reloaded.Phone);
            Assert.Equal("Thạc Sĩ Toán Học", reloaded.Qualifications);
            Assert.Equal(7, reloaded.ExperienceYears);
            Assert.Equal("Chuyên gia Đại số tổ hợp", reloaded.Bio);
        }
        finally
        {
            var reqDel = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/users/{teacher.Id}");
            reqDel.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            await _client.SendAsync(reqDel);
        }
    }

    [Fact]
    public async Task Admin_UpdateSettings_ConcurrencyConflict_Returns409()
    {
        // Issue 8: Settings concurrency check returns 409 Conflict when stale version is sent
        var adminToken = await GetAdminTokenAsync();

        // 1. Get initial settings
        var reqGet = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/settings");
        reqGet.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respGet = await _client.SendAsync(reqGet);
        Assert.Equal(HttpStatusCode.OK, respGet.StatusCode);
        var initialSettings = JsonSerializer.Deserialize<OperationalSettingsDto>(await respGet.Content.ReadAsStringAsync(), JsonOpts)!;
        var staleVersion = initialSettings.Version;

        // 2. Perform an update (advances version)
        var update1 = new OperationalSettingsDto
        {
            SystemName = "STUDY_AI Updated Name 1",
            PassingScoreThreshold = 6.0,
            LowScoreAlertThreshold = 4.0,
            AttentionProgressThreshold = 30,
            Version = staleVersion
        };
        var reqUpdate1 = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(update1), Encoding.UTF8, "application/json")
        };
        reqUpdate1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respUpdate1 = await _client.SendAsync(reqUpdate1);
        Assert.Equal(HttpStatusCode.OK, respUpdate1.StatusCode);

        // 3. Attempt update with stale version -> MUST RETURN 409 Conflict!
        var updateStale = new OperationalSettingsDto
        {
            SystemName = "STUDY_AI Stale Update",
            PassingScoreThreshold = 5.0,
            LowScoreAlertThreshold = 3.5,
            AttentionProgressThreshold = 25,
            Version = "stale-version-token-or-old-guid"
        };
        var reqStale = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateStale), Encoding.UTF8, "application/json")
        };
        reqStale.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respStale = await _client.SendAsync(reqStale);
        Assert.Equal(HttpStatusCode.Conflict, respStale.StatusCode);
    }

    [Fact]
    public async Task Admin_UpdateSettings_ConcurrentDatabaseUpdates_ExactlyOneWins_AndOtherReceives409_RetrySucceeds()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Initial GET to obtain baseline Version
        var reqGet = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/settings");
        reqGet.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respGet = await _client.SendAsync(reqGet);
        Assert.Equal(HttpStatusCode.OK, respGet.StatusCode);
        var initialSettings = JsonSerializer.Deserialize<OperationalSettingsDto>(await respGet.Content.ReadAsStringAsync(), JsonOpts)!;
        var baseVersion = initialSettings.Version;

        // 2. Prepare two competing update requests both carrying the SAME baseVersion
        var updateDtoA = new OperationalSettingsDto
        {
            SystemName = "STUDY_AI Concurrent Test A",
            PassingScoreThreshold = 6.0,
            Version = baseVersion
        };
        var updateDtoB = new OperationalSettingsDto
        {
            SystemName = "STUDY_AI Concurrent Test B",
            PassingScoreThreshold = 7.0,
            Version = baseVersion
        };

        var clientA = _factory.CreateClient();
        var clientB = _factory.CreateClient();

        var reqA = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateDtoA), Encoding.UTF8, "application/json")
        };
        reqA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var reqB = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateDtoB), Encoding.UTF8, "application/json")
        };
        reqB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // 3. Dispatch both concurrently
        var taskA = clientA.SendAsync(reqA);
        var taskB = clientB.SendAsync(reqB);

        var responses = await Task.WhenAll(taskA, taskB);

        // Exactly one MUST return 200 OK and exactly one MUST return 409 Conflict
        var successCount = responses.Count(r => r.StatusCode == HttpStatusCode.OK);
        var conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);

        Assert.Equal(1, successCount);
        Assert.Equal(1, conflictCount);

        // 4. Retry with fresh version succeeds
        var reqGetFresh = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/settings");
        reqGetFresh.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respGetFresh = await _client.SendAsync(reqGetFresh);
        var freshSettings = JsonSerializer.Deserialize<OperationalSettingsDto>(await respGetFresh.Content.ReadAsStringAsync(), JsonOpts)!;

        var retryDto = new OperationalSettingsDto
        {
            SystemName = "STUDY_AI Concurrent Retry Final",
            PassingScoreThreshold = 8.0,
            Version = freshSettings.Version
        };
        var reqRetry = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(retryDto), Encoding.UTF8, "application/json")
        };
        reqRetry.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respRetry = await _client.SendAsync(reqRetry);
        Assert.Equal(HttpStatusCode.OK, respRetry.StatusCode);

        // 5. Verify database entity SystemSetting
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var dbSetting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Id == "global");
        Assert.NotNull(dbSetting);
        Assert.Contains("STUDY_AI Concurrent Retry Final", dbSetting.Payload);
    }

    [Fact]
    public async Task Admin_GetSystemHealth_ReturnsRealStorageStatsFromDatabase()
    {
        // Issue 7: System health endpoint returns real storage stats from SQL Server
        var adminToken = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/system/health");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var content = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(content);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("apiStatus", out var statusProp));
        Assert.Equal("operational", statusProp.GetString());

        Assert.True(root.TryGetProperty("database", out var dbProp));
        Assert.Equal("connected", dbProp.GetProperty("status").GetString());

        Assert.True(root.TryGetProperty("storageStats", out var storageProp));
        Assert.True(storageProp.TryGetProperty("usersCount", out var usersProp));
        Assert.True(usersProp.GetInt32() >= 1, "Users count from database must be at least 1 (admin)");
    }

    [Fact]
    public async Task Admin_UpdateTeacher_TeachingStatus_MapsCorrectly_And_RejectsInvalid()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Create a teacher
        var uniqueEmail = $"teacher.status.{Guid.NewGuid():N}@studyai.test";
        var createReq = new SaveTeacherRequestDto
        {
            Name = "Thầy Lê Văn Hùng",
            Email = uniqueEmail,
            Subject = "Toán học 11",
            Status = "active",
            Password = "TeacherHung@123"
        };
        var createHttp = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        createHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var createResp = await _client.SendAsync(createHttp);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = JsonSerializer.Deserialize<AdminTeacherDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 2. Update teaching status to "inactive" -> maps to disabled, returns 200
        var updateInactive = new SaveTeacherRequestDto
        {
            Status = "inactive"
        };
        var updateHttp1 = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/teachers/{created.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateInactive), Encoding.UTF8, "application/json")
        };
        updateHttp1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var resp1 = await _client.SendAsync(updateHttp1);
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);
        var updated1 = JsonSerializer.Deserialize<AdminTeacherDto>(await resp1.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("inactive", updated1.Status);
        Assert.Equal("LOCKED", updated1.AccountStatus);

        // 3. Update with invalid status -> returns 400 Bad Request
        var updateInvalid = new SaveTeacherRequestDto
        {
            Status = "unsupported_teaching_status"
        };
        var updateHttp2 = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/teachers/{created.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateInvalid), Encoding.UTF8, "application/json")
        };
        updateHttp2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var resp2 = await _client.SendAsync(updateHttp2);
        Assert.Equal(HttpStatusCode.BadRequest, resp2.StatusCode);
    }

    [Fact]
    public async Task Admin_UpdateSettings_StaleInitialVersion_WhenSettingsExist_Returns409()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Ensure at least one settings record exists
        var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/settings");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var getResp = await _client.SendAsync(getReq);
        var currentSettings = JsonSerializer.Deserialize<OperationalSettingsDto>(await getResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var saveReq = new OperationalSettingsDto
        {
            SystemName = "STUDY_AI Existing Setup",
            Version = currentSettings.Version
        };
        var saveHttp = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(saveReq), Encoding.UTF8, "application/json")
        };
        saveHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var saveResp = await _client.SendAsync(saveHttp);
        Assert.Equal(HttpStatusCode.OK, saveResp.StatusCode);

        // 2. Try saving with version "initial" when settings record exists -> must return 409
        var staleInitialReq = new OperationalSettingsDto
        {
            SystemName = "STUDY_AI Overwrite Attempt",
            Version = "initial"
        };
        var staleHttp = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(staleInitialReq), Encoding.UTF8, "application/json")
        };
        staleHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var staleResp = await _client.SendAsync(staleHttp);
        Assert.Equal(HttpStatusCode.Conflict, staleResp.StatusCode);

        // 3. Try saving with empty version -> must also return 409
        var emptyVersionReq = new OperationalSettingsDto
        {
            SystemName = "STUDY_AI Empty Version Overwrite Attempt",
            Version = ""
        };
        var emptyHttp = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(emptyVersionReq), Encoding.UTF8, "application/json")
        };
        emptyHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var emptyResp = await _client.SendAsync(emptyHttp);
        Assert.Equal(HttpStatusCode.Conflict, emptyResp.StatusCode);
    }

    [Fact]
    public async Task Admin_GetUserDetail_CalculatesRealStreakAndSubjectProgress_NoFabricatedStats()
    {
        var adminToken = await GetAdminTokenAsync();

        // Create a learner with no activity
        var uniqueEmail = $"learner.noact.{Guid.NewGuid():N}@studyai.test";
        var createReq = new CreateUserRequestDto
        {
            DisplayName = "Nguyễn Thị Mới",
            Email = uniqueEmail,
            Role = "learner",
            Grade = "10",
            Password = "LearnerMoi@123"
        };
        var createHttp = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        createHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var createResp = await _client.SendAsync(createHttp);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var createdRes = JsonSerializer.Deserialize<CreateUserResponseDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts)!;
        var created = createdRes.User;

        // Fetch detail
        var getReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/admin/users/{created.Id}");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var getResp = await _client.SendAsync(getReq);
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var detail = JsonSerializer.Deserialize<AdminUserDetailDto>(await getResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Streak must be 0 (no activity), and recent subjects must be empty (not fabricated 3-day streak or hardcoded Math 12)
        Assert.NotNull(detail.LearningProgress);
        Assert.Equal(0, detail.LearningProgress!.StreakDays);
        Assert.Empty(detail.LearningProgress.RecentSubjects);
    }

    [Fact]
    public async Task Admin_GetTeachers_FilterByStatus_InactiveAndPending_CorrectlyFiltersMappedAccountStatuses()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Create a teacher with inactive status (mapped to disabled in Users table)
        var emailInactive = $"teacher.filter.inact.{Guid.NewGuid():N}@studyai.test";
        var createInactiveReq = new SaveTeacherRequestDto
        {
            Name = "Thầy Inactive Test",
            Email = emailInactive,
            Subject = "Toán 12",
            Status = "inactive",
            Password = "TeacherInact@123"
        };
        var httpCreateInactive = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(createInactiveReq), Encoding.UTF8, "application/json")
        };
        httpCreateInactive.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respCreateInactive = await _client.SendAsync(httpCreateInactive);
        Assert.Equal(HttpStatusCode.Created, respCreateInactive.StatusCode);
        var teacherInactive = JsonSerializer.Deserialize<AdminTeacherDto>(await respCreateInactive.Content.ReadAsStringAsync(), JsonOpts)!;

        // 2. Create a teacher with pending status (mapped to suspended in Users table)
        var emailPending = $"teacher.filter.pend.{Guid.NewGuid():N}@studyai.test";
        var createPendingReq = new SaveTeacherRequestDto
        {
            Name = "Thầy Pending Test",
            Email = emailPending,
            Subject = "Toán 12",
            Status = "pending",
            Password = "TeacherPend@123"
        };
        var httpCreatePending = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(createPendingReq), Encoding.UTF8, "application/json")
        };
        httpCreatePending.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respCreatePending = await _client.SendAsync(httpCreatePending);
        Assert.Equal(HttpStatusCode.Created, respCreatePending.StatusCode);
        var teacherPending = JsonSerializer.Deserialize<AdminTeacherDto>(await respCreatePending.Content.ReadAsStringAsync(), JsonOpts)!;

        // 3. Filter by status=inactive
        var reqFilterInactive = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/teachers?status=inactive");
        reqFilterInactive.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respFilterInactive = await _client.SendAsync(reqFilterInactive);
        Assert.Equal(HttpStatusCode.OK, respFilterInactive.StatusCode);
        var listInactive = JsonSerializer.Deserialize<List<AdminTeacherDto>>(await respFilterInactive.Content.ReadAsStringAsync(), JsonOpts)!;

        Assert.Contains(listInactive, t => t.Id == teacherInactive.Id);
        Assert.DoesNotContain(listInactive, t => t.Id == teacherPending.Id);

        // 4. Filter by status=pending
        var reqFilterPending = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/teachers?status=pending");
        reqFilterPending.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respFilterPending = await _client.SendAsync(reqFilterPending);
        Assert.Equal(HttpStatusCode.OK, respFilterPending.StatusCode);
        var listPending = JsonSerializer.Deserialize<List<AdminTeacherDto>>(await respFilterPending.Content.ReadAsStringAsync(), JsonOpts)!;

        Assert.Contains(listPending, t => t.Id == teacherPending.Id);
        Assert.DoesNotContain(listPending, t => t.Id == teacherInactive.Id);

        // 5. Filter by status=active
        var reqFilterActive = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/teachers?status=active");
        reqFilterActive.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var respFilterActive = await _client.SendAsync(reqFilterActive);
        Assert.Equal(HttpStatusCode.OK, respFilterActive.StatusCode);
        var listActive = JsonSerializer.Deserialize<List<AdminTeacherDto>>(await respFilterActive.Content.ReadAsStringAsync(), JsonOpts)!;

        Assert.DoesNotContain(listActive, t => t.Id == teacherInactive.Id);
        Assert.DoesNotContain(listActive, t => t.Id == teacherPending.Id);
    }

    [Fact]
    public async Task Admin_UpdateAnnouncement_PreservesOriginalCreatedAtAndCreatedBy_AndReturns404ForDeleted()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Admin creates announcement
        var createReq = new SaveAnnouncementRequestDto
        {
            Title = "Thông báo ban đầu kiểm thử metadata",
            Content = "Nội dung ban đầu của thông báo hệ thống.",
            Audience = "all",
            Severity = "info",
            Status = "published"
        };
        var postHttp = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/announcements")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        postHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var postResp = await _client.SendAsync(postHttp);
        Assert.Equal(HttpStatusCode.Created, postResp.StatusCode);
        var created = JsonSerializer.Deserialize<AnnouncementDto>(await postResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.False(string.IsNullOrWhiteSpace(created.CreatedAt));
        Assert.False(string.IsNullOrWhiteSpace(created.CreatedBy));

        var originalCreatedAt = created.CreatedAt;
        var originalCreatedBy = created.CreatedBy;

        // 2. Admin updates the announcement
        var updateReq = new SaveAnnouncementRequestDto
        {
            Title = "Thông báo đã sửa tiêu đề",
            Content = "Nội dung cập nhật mới hơn.",
            Audience = "teacher",
            Severity = "warning",
            Status = "published"
        };
        var putHttp = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/announcements/{created.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateReq), Encoding.UTF8, "application/json")
        };
        putHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var putResp = await _client.SendAsync(putHttp);
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);
        var updated = JsonSerializer.Deserialize<AnnouncementDto>(await putResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Verify CreatedAt and CreatedBy are preserved, UpdatedAt is set
        Assert.Equal(originalCreatedAt, updated.CreatedAt);
        Assert.Equal(originalCreatedBy, updated.CreatedBy);
        Assert.Equal("Thông báo đã sửa tiêu đề", updated.Title);
        Assert.Equal("teacher", updated.Audience);
        Assert.False(string.IsNullOrWhiteSpace(updated.UpdatedAt));

        // 3. Update non-existent announcement returns 404
        var fakeId = $"anc_{Guid.NewGuid():N}";
        var putFakeHttp = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/announcements/{fakeId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateReq), Encoding.UTF8, "application/json")
        };
        putFakeHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var putFakeResp = await _client.SendAsync(putFakeHttp);
        Assert.Equal(HttpStatusCode.NotFound, putFakeResp.StatusCode);

        // 4. Delete the announcement
        var delHttp = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/admin/announcements/{created.Id}");
        delHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var delResp = await _client.SendAsync(delHttp);
        Assert.Equal(HttpStatusCode.NoContent, delResp.StatusCode);

        // 5. Update on deleted announcement returns 404
        var putDeletedHttp = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/announcements/{created.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateReq), Encoding.UTF8, "application/json")
        };
        putDeletedHttp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var putDeletedResp = await _client.SendAsync(putDeletedHttp);
        Assert.Equal(HttpStatusCode.NotFound, putDeletedResp.StatusCode);
    }
}
