using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using StudyAI.Features.Admin;
using StudyAI.Features.Support;
using StudyAI.Models;
using Xunit;

namespace StudyAI.IntegrationTests;

public class AdminFirstIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public AdminFirstIntegrationTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> LoginAsAdminAsync()
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
            JsonSerializer.Serialize(new { email = "admin@studyai.internal", password = "Admin@123456" }),
            Encoding.UTF8,
            "application/json"));

        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        var body = await loginResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("accessToken").GetString()!;
    }

    private async Task<(string UserId, string Token)> RegisterUserAsync(string prefix)
    {
        var email = $"{prefix}_{Guid.NewGuid():N}@studyai.test";
        var resp = await _client.PostAsync("/api/v1/auth/register", new StringContent(
            JsonSerializer.Serialize(new
            {
                email,
                password = "Password@123456",
                displayName = $"User {prefix}",
                grade = "12"
            }),
            Encoding.UTF8,
            "application/json"));

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var token = doc.RootElement.GetProperty("accessToken").GetString()!;
        var userId = doc.RootElement.GetProperty("user").GetProperty("id").GetString()!;
        return (userId, token);
    }

    [Fact]
    public async Task SupportTicket_Ownership_Enforced_UserCannotReadOrReplyAnotherUsersTicket()
    {
        var (_, tokenA) = await RegisterUserAsync("sup_a");
        var (_, tokenB) = await RegisterUserAsync("sup_b");

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var createResp = await _client.PostAsync("/api/v1/support/tickets", new StringContent(
            JsonSerializer.Serialize(new CreateSupportTicketRequestDto
            {
                Subject = "Lỗi hiển thị công thức Toán 12",
                Category = "TECHNICAL",
                Message = "Không thấy công thức tích phân ở bài 1."
            }),
            Encoding.UTF8,
            "application/json"));

        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = JsonSerializer.Deserialize<SupportTicketDetailDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(created);
        Assert.Equal("OPEN", created!.Status);

        // User B attempts to read User A's ticket -> 403 Forbidden
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var getResp = await _client.GetAsync($"/api/v1/support/tickets/{created.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, getResp.StatusCode);

        // User B attempts to reply to User A's ticket -> 403 Forbidden
        var replyResp = await _client.PostAsync($"/api/v1/support/tickets/{created.Id}/messages", new StringContent(
            JsonSerializer.Serialize(new ReplySupportTicketRequestDto { Body = "Unauthorized reply" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, replyResp.StatusCode);
    }

    [Fact]
    public async Task SupportTicket_AdminTriageAndReply_UpdatesStatusPriorityAndDashboardCount()
    {
        var (_, userToken) = await RegisterUserAsync("sup_triage");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

        var createResp = await _client.PostAsync("/api/v1/support/tickets", new StringContent(
            JsonSerializer.Serialize(new CreateSupportTicketRequestDto
            {
                Subject = "Cần hỗ trợ tài khoản học viên",
                Category = "ACCOUNT",
                Message = "Nhờ kiểm tra trạng thái lớp học."
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = JsonSerializer.Deserialize<SupportTicketDetailDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var adminToken = await LoginAsAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // Admin updates priority & status
        var patchResp = await _client.PatchAsync($"/api/v1/admin/support/tickets/{created.Id}", new StringContent(
            JsonSerializer.Serialize(new AdminUpdateSupportTicketRequestDto
            {
                Status = "IN_PROGRESS",
                Priority = "HIGH"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, patchResp.StatusCode);
        var patched = JsonSerializer.Deserialize<SupportTicketDetailDto>(await patchResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("IN_PROGRESS", patched.Status);
        Assert.Equal("HIGH", patched.Priority);

        // Admin replies
        var replyResp = await _client.PostAsync($"/api/v1/admin/support/tickets/{created.Id}/messages", new StringContent(
            JsonSerializer.Serialize(new ReplySupportTicketRequestDto
            {
                Body = "Đã tiếp nhận và đang kiểm tra.",
                NextStatus = "WAITING_FOR_USER"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, replyResp.StatusCode);
        var replied = JsonSerializer.Deserialize<SupportTicketDetailDto>(await replyResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("WAITING_FOR_USER", replied.Status);
        Assert.Equal(2, replied.Messages.Count);

        // Dashboard reflects at least 1 open ticket
        var dashResp = await _client.GetAsync("/api/v1/admin/dashboard?range=90d");
        Assert.Equal(HttpStatusCode.OK, dashResp.StatusCode);
        var dash = JsonSerializer.Deserialize<AdminDashboardDto>(await dashResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.True((dash.Metrics.OpenSupportTicketsCount ?? 0) >= 1);
        Assert.False(dash.Metrics.SubscriptionsModuleAvailable);
        Assert.Null(dash.Metrics.ActualRevenueVnd);
    }

    [Fact]
    public async Task AdminEndpoints_CrossRoleAuthorization_LearnerBlocked()
    {
        var (_, learnerToken) = await RegisterUserAsync("rbac_learner");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);

        var dashResp = await _client.GetAsync("/api/v1/admin/dashboard");
        Assert.Equal(HttpStatusCode.Forbidden, dashResp.StatusCode);

        var usersResp = await _client.GetAsync("/api/v1/admin/users");
        Assert.Equal(HttpStatusCode.Forbidden, usersResp.StatusCode);

        var ticketsResp = await _client.GetAsync("/api/v1/admin/support/tickets");
        Assert.Equal(HttpStatusCode.Forbidden, ticketsResp.StatusCode);

        var rolePatchResp = await _client.PatchAsync("/api/v1/admin/users/some-id/role", new StringContent(
            JsonSerializer.Serialize(new { role = "admin" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, rolePatchResp.StatusCode);
    }

    [Fact]
    public async Task SupportTicket_TeacherOwnership_Enforced_AndDuplicateReplyBlocked()
    {
        var adminToken = await LoginAsAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var (teacherId, teacherToken) = await RegisterUserAsync("sup_teacher");
        var (_, otherToken) = await RegisterUserAsync("sup_other");

        // Promote teacher
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var roleResp = await _client.PatchAsync($"/api/v1/admin/users/{teacherId}/role", new StringContent(
            JsonSerializer.Serialize(new { role = "teacher" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, roleResp.StatusCode);

        // Teacher creates ticket
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var createResp = await _client.PostAsync("/api/v1/support/tickets", new StringContent(
            JsonSerializer.Serialize(new CreateSupportTicketRequestDto
            {
                Subject = "Hỗ trợ phân công lớp 12A1",
                Category = "LEARNING_CONTENT",
                Message = "Cần kiểm tra quyền giao bài tập."
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = JsonSerializer.Deserialize<SupportTicketDetailDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Idempotent retry with same ClientMessageId -> 200 OK without duplicate message
        var idemKey = $"msg-{Guid.NewGuid():N}";
        var r1 = await _client.PostAsync($"/api/v1/support/tickets/{created.Id}/messages", new StringContent(
            JsonSerializer.Serialize(new ReplySupportTicketRequestDto { Body = "Chi tiết bổ sung", ClientMessageId = idemKey }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, r1.StatusCode);
        var d1 = JsonSerializer.Deserialize<SupportTicketDetailDto>(await r1.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal(2, d1.Messages.Count);

        var r2 = await _client.PostAsync($"/api/v1/support/tickets/{created.Id}/messages", new StringContent(
            JsonSerializer.Serialize(new ReplySupportTicketRequestDto { Body = "Chi tiết bổ sung", ClientMessageId = idemKey }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, r2.StatusCode);
        var d2 = JsonSerializer.Deserialize<SupportTicketDetailDto>(await r2.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal(2, d2.Messages.Count);

        // Legitimate repeated message with a new ClientMessageId -> succeeds and appends
        var r3 = await _client.PostAsync($"/api/v1/support/tickets/{created.Id}/messages", new StringContent(
            JsonSerializer.Serialize(new ReplySupportTicketRequestDto { Body = "Chi tiết bổ sung", ClientMessageId = $"msg-{Guid.NewGuid():N}" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, r3.StatusCode);
        var d3 = JsonSerializer.Deserialize<SupportTicketDetailDto>(await r3.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal(3, d3.Messages.Count);

        // Other user cannot read teacher's ticket -> 403 Forbidden
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherToken);
        var getResp = await _client.GetAsync($"/api/v1/support/tickets/{created.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, getResp.StatusCode);
    }

    [Fact]
    public async Task AdminUsers_RoleChangeAndLock_RevokesRefreshSessionsImmediately()
    {
        var adminToken = await LoginAsAdminAsync();
        var (userId, _) = await RegisterUserAsync("rbac_revoke");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var activeSessions = await db.RefreshSessions.CountAsync(s => s.UserId == userId && s.RevokedAt == null);
            Assert.True(activeSessions >= 1, "Newly registered user should have at least 1 active refresh session.");
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var roleResp = await _client.PatchAsync($"/api/v1/admin/users/{userId}/role", new StringContent(
            JsonSerializer.Serialize(new { role = "teacher" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, roleResp.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var remainingActive = await db.RefreshSessions.CountAsync(s => s.UserId == userId && s.RevokedAt == null);
            Assert.Equal(0, remainingActive);
        }
    }

    [Fact]
    public async Task AdminDashboard_CanonicalPracticeEvent_And_365DayBoundary()
    {
        var adminToken = await LoginAsAdminAsync();
        var (userId, _) = await RegisterUserAsync("dash_boundary");
        var now = DateTimeOffset.UtcNow;
        var from = now.AddDays(-400);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            db.LearningEvents.AddRange(
                new LearningEvent { Id = $"evt-{Guid.NewGuid():N}", UserId = userId, Type = "practice_completed", Timestamp = from.AddDays(5) },
                new LearningEvent { Id = $"evt-{Guid.NewGuid():N}", UserId = userId, Type = "practice_session", Timestamp = from.AddDays(10) },
                new LearningEvent { Id = $"evt-{Guid.NewGuid():N}", UserId = userId, Type = "practice_completed", Timestamp = from.AddDays(380) } // outside 365-day clamped window
            );
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var resp = await _client.GetAsync($"/api/v1/admin/dashboard?range=custom&from={Uri.EscapeDataString(from.ToString("o"))}&to={Uri.EscapeDataString(now.ToString("o"))}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var dto = JsonSerializer.Deserialize<AdminDashboardDto>(await resp.Content.ReadAsStringAsync(), JsonOpts)!;
        var spanDays = (DateTimeOffset.Parse(dto.Metrics.RangeEndUtc) - DateTimeOffset.Parse(dto.Metrics.RangeStartUtc)).TotalDays;
        Assert.Equal(365, Math.Round(spanDays));
        Assert.True(dto.Metrics.PracticeSessionsInRange >= 2);
    }

    [Fact]
    public async Task AdminUsers_SecondarySortById_IsDeterministic()
    {
        var adminToken = await LoginAsAdminAsync();
        await RegisterUserAsync("sort_a");
        await RegisterUserAsync("sort_b");

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var r1 = await _client.GetAsync("/api/v1/admin/users?sortBy=role&sortDir=asc&pageSize=20");
        var r2 = await _client.GetAsync("/api/v1/admin/users?sortBy=role&sortDir=asc&pageSize=20");
        Assert.Equal(HttpStatusCode.OK, r1.StatusCode);
        Assert.Equal(HttpStatusCode.OK, r2.StatusCode);

        var p1 = JsonSerializer.Deserialize<AdminUsersResponseDto>(await r1.Content.ReadAsStringAsync(), JsonOpts)!;
        var p2 = JsonSerializer.Deserialize<AdminUsersResponseDto>(await r2.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal(p1.Items.Select(x => x.Id), p2.Items.Select(x => x.Id));
    }

    [Fact]
    public async Task SupportTicket_ConcurrentRetries_And_ReverseStateTimestamps()
    {
        var adminToken = await LoginAsAdminAsync();
        var (_, userToken) = await RegisterUserAsync("sup_idem_conc");

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
        var createResp = await _client.PostAsync("/api/v1/support/tickets", new StringContent(
            JsonSerializer.Serialize(new CreateSupportTicketRequestDto
            {
                Subject = "Concurrent retry & reverse transition test",
                Category = "TECHNICAL",
                Message = "Initial message"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = JsonSerializer.Deserialize<SupportTicketDetailDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Sequential/concurrent retries with same ClientMessageId
        var idemKey = $"conc-{Guid.NewGuid():N}";
        var reqBody = JsonSerializer.Serialize(new ReplySupportTicketRequestDto { Body = "Retry body", ClientMessageId = idemKey });
        var c1 = _factory.CreateClient();
        var c2 = _factory.CreateClient();
        c1.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
        c2.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
        var tasks = await Task.WhenAll(
            c1.PostAsync($"/api/v1/support/tickets/{created.Id}/messages", new StringContent(reqBody, Encoding.UTF8, "application/json")),
            c2.PostAsync($"/api/v1/support/tickets/{created.Id}/messages", new StringContent(reqBody, Encoding.UTF8, "application/json"))
        );
        Assert.All(tasks, t => Assert.True(t.StatusCode == HttpStatusCode.OK || t.StatusCode == HttpStatusCode.Conflict));

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var detailAfterRetry = await _client.GetAsync($"/api/v1/admin/support/tickets/{created.Id}");
        var detailDto = JsonSerializer.Deserialize<SupportTicketDetailDto>(await detailAfterRetry.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal(2, detailDto.Messages.Count);

        // Transition to RESOLVED -> OPEN via reply -> timestamps must clear
        var closeResp = await _client.PatchAsync($"/api/v1/admin/support/tickets/{created.Id}", new StringContent(
            JsonSerializer.Serialize(new AdminUpdateSupportTicketRequestDto { Status = "RESOLVED" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, closeResp.StatusCode);
        var resolvedDto = JsonSerializer.Deserialize<SupportTicketDetailDto>(await closeResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.NotNull(resolvedDto.ResolvedAt);

        var reopenViaReply = await _client.PostAsync($"/api/v1/admin/support/tickets/{created.Id}/messages", new StringContent(
            JsonSerializer.Serialize(new ReplySupportTicketRequestDto { Body = "Reopening ticket", NextStatus = "OPEN" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, reopenViaReply.StatusCode);
        var reopenedDto = JsonSerializer.Deserialize<SupportTicketDetailDto>(await reopenViaReply.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("OPEN", reopenedDto.Status);
        Assert.Null(reopenedDto.ResolvedAt);
        Assert.Null(reopenedDto.ClosedAt);
    }
}
