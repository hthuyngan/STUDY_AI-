using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Application.DTOs;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.IntegrationTests;

public class PhaseAi06LearningOperationsIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public PhaseAi06LearningOperationsIntegrationTests(StudyAIApiFixture factory)
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

        loginResp.EnsureSuccessStatusCode();
        var body = await loginResp.Content.ReadAsStringAsync();
        var authResult = JsonSerializer.Deserialize<AuthResponseDto>(body, JsonOpts);
        return authResult!.AccessToken;
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

        loginResp.EnsureSuccessStatusCode();
        var body = await loginResp.Content.ReadAsStringAsync();
        var authResult = JsonSerializer.Deserialize<AuthResponseDto>(body, JsonOpts);
        return authResult!.AccessToken;
    }

    [Fact]
    public async Task Ops_01_NonAdmin_AccessingOperations_ReturnsForbidden()
    {
        // Unauthenticated -> 401
        var unauthResp = await _client.GetAsync("/api/v1/admin/operations/health");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthResp.StatusCode);

        // Learner role -> 403
        var learnerToken = await GetLearnerTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/operations/health");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Ops_02_Admin_GetHealth_ReturnsSuccessAndPayload()
    {
        var adminToken = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/operations/health");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        var report = JsonSerializer.Deserialize<SystemHealthReportDto>(body, JsonOpts);

        Assert.NotNull(report);
        Assert.False(string.IsNullOrEmpty(report.OverallStatus));
        Assert.NotEmpty(report.Components);
        Assert.NotNull(report.DatabaseHealth);
        Assert.True(report.DatabaseHealth.CanConnect);
    }

    [Fact]
    public async Task Ops_03_Admin_GetAiCost_ReturnsCostMetrics()
    {
        var adminToken = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/operations/ai-cost?days=30");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        var cost = JsonSerializer.Deserialize<AiCostOptimizationDto>(body, JsonOpts);

        Assert.NotNull(cost);
        Assert.NotNull(cost.OptimizationRecommendations);
        Assert.True(cost.OptimizationRecommendations.Count > 0);
    }

    [Fact]
    public async Task Ops_04_Admin_GetContentQuality_ReturnsAuditReport()
    {
        var adminToken = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/operations/content-quality");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        var audit = JsonSerializer.Deserialize<ContentQualityAuditReportDto>(body, JsonOpts);

        Assert.NotNull(audit);
        Assert.True(audit.HealthScore >= 0.0 && audit.HealthScore <= 100.0);
        Assert.NotNull(audit.Issues);
    }

    [Fact]
    public async Task Ops_05_Admin_GetDataConsistency_ReturnsConsistencyReport()
    {
        var adminToken = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/operations/data-consistency");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        var report = JsonSerializer.Deserialize<DataConsistencyReportDto>(body, JsonOpts);

        Assert.NotNull(report);
        Assert.True(report.IntegrityScore >= 0.0 && report.IntegrityScore <= 100.0);
        Assert.NotNull(report.Anomalies);
    }

    [Fact]
    public async Task Ops_06_Admin_GetAuditLogs_ReturnsList()
    {
        var adminToken = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/operations/audit-logs?page=1&pageSize=10");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        var list = JsonSerializer.Deserialize<StaffAuditLogListDto>(body, JsonOpts);

        Assert.NotNull(list);
        Assert.NotNull(list.Logs);
    }

    [Fact]
    public async Task Ops_07_Admin_RepairDataConsistency_DryRun_ReturnsPreview()
    {
        var adminToken = await GetAdminTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/operations/data-consistency/repair");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        req.Content = new StringContent(
            JsonSerializer.Serialize(new DataConsistencyRepairRequestDto { DryRun = true }),
            Encoding.UTF8,
            "application/json");

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        var report = JsonSerializer.Deserialize<DataConsistencyRepairReportDto>(body, JsonOpts);

        Assert.NotNull(report);
        Assert.True(report.WasDryRun);
        Assert.Equal("DRY_RUN_PREVIEW", report.Status);
    }

    [Fact]
    public async Task Ops_08_NonAdmin_RepairDataConsistency_ReturnsForbidden()
    {
        var learnerToken = await GetLearnerTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/operations/data-consistency/repair");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        req.Content = new StringContent(
            JsonSerializer.Serialize(new DataConsistencyRepairRequestDto { DryRun = true }),
            Encoding.UTF8,
            "application/json");

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}

