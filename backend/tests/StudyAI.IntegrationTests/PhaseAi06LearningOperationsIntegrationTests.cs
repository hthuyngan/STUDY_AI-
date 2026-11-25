using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

using StudyAI.Data;
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

    [Fact]
    public async Task Practice_ReviewMistake_WhenInActiveExam_ReturnsForbidden_CannotExposeExamAnswers()
    {
        var learnerToken = await GetLearnerTokenAsync();
        string learnerId;
        string examQuestionId;

        string activeExamId = $"exam_{Guid.NewGuid():N}"[..12];
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var learner = await db.Users.FirstAsync(u => u.EmailNormalized == "LEARNER@STUDYAI.INTERNAL" || u.EmailNormalized == "learner@studyai.internal");
            learnerId = learner.Id;

            // Ensure a published question exists
            var q = await db.ContentQuestions.FirstOrDefaultAsync(x => x.Status == "published" && !x.IsDeleted);
            if (q == null)
            {
                q = new ContentQuestion
                {
                    Id = $"q_exam_leak_{Guid.NewGuid():N}"[..12],
                    SubjectId = "sub_math12",
                    Prompt = "Câu hỏi thi toán thử nghiệm tính toàn vẹn",
                    OptionsJson = "[\"A. 1\", \"B. 2\", \"C. 3\", \"D. 4\"]",
                    CorrectAnswer = "A",
                    Explanation = "Giải thích chi tiết không được lộ trong giờ thi",
                    Status = "published"
                };
                db.ContentQuestions.Add(q);
            }
            examQuestionId = q.Id;

            // Create an active exam session containing this question
            var activeExam = new AssessmentAttempt
            {
                Id = activeExamId,
                UserId = learnerId,
                AssessmentId = "asmt_exam",
                SubjectId = "sub_math12",
                CompletionStatus = "in_progress",
                StartedAt = DateTimeOffset.UtcNow,
                SuspendDataJson = JsonSerializer.Serialize(new
                {
                    mode = "exam",
                    questionIds = new List<string> { examQuestionId },
                    expiresAt = DateTimeOffset.UtcNow.AddMinutes(45).ToString("o")
                })
            };
            db.AssessmentAttempts.Add(activeExam);
            await db.SaveChangesAsync();
        }

        try
        {
            // Student attempts to call mistake review on active exam question to cheat and get CorrectAnswer & Explanation
            var reviewReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/mistakes/{examQuestionId}/review")
            {
                Content = new StringContent(JsonSerializer.Serialize(new { answer = "A" }), Encoding.UTF8, "application/json")
            };
            reviewReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);

            var reviewResp = await _client.SendAsync(reviewReq);

            // MUST be 403 Forbidden to prevent exam cheating
            Assert.Equal(HttpStatusCode.Forbidden, reviewResp.StatusCode);
            var body = await reviewResp.Content.ReadAsStringAsync();
            Assert.Contains("bài thi", body);
        }
        finally
        {
            // Cleanup active exam attempt so subsequent tests for learner are not blocked by the exam guard
            using var cleanupScope = _factory.Services.CreateScope();
            var cleanupDb = cleanupScope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var attempt = await cleanupDb.AssessmentAttempts.FindAsync(activeExamId);
            if (attempt != null)
            {
                cleanupDb.AssessmentAttempts.Remove(attempt);
                await cleanupDb.SaveChangesAsync();
            }
        }
    }

    [Fact]
    public async Task Practice_ReviewMistake_WhenNeverAnsweredIncorrectly_ReturnsBadRequest()
    {
        var learnerToken = await GetLearnerTokenAsync();
        string unattemptedQId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var q = new ContentQuestion
            {
                Id = $"q_unatt_{Guid.NewGuid():N}"[..12],
                SubjectId = "sub_math12",
                Prompt = "Câu hỏi học sinh chưa từng làm sai",
                OptionsJson = "[\"A. 1\", \"B. 2\", \"C. 3\", \"D. 4\"]",
                CorrectAnswer = "B",
                Explanation = "Không được ôn tập khi chưa từng làm sai",
                Status = "published"
            };
            db.ContentQuestions.Add(q);
            await db.SaveChangesAsync();
            unattemptedQId = q.Id;
        }

        var reviewReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/mistakes/{unattemptedQId}/review")
        {
            Content = new StringContent(JsonSerializer.Serialize(new { answer = "A" }), Encoding.UTF8, "application/json")
        };
        reviewReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);

        var reviewResp = await _client.SendAsync(reviewReq);

        // MUST be 400 BadRequest because student has no mistake record for this question
        Assert.Equal(HttpStatusCode.BadRequest, reviewResp.StatusCode);
        var body = await reviewResp.Content.ReadAsStringAsync();
        Assert.Contains("từng trả lời sai", body);
    }

    [Fact]
    public async Task Practice_SubmitSession_PastDeadline_RestrictsToAutosave_And_PreservesScoreMax()
    {
        var learnerToken = await GetLearnerTokenAsync();
        string sessionId;
        string q1Id, q2Id;
        var isolatedSubjectId = $"sub_p06_{Guid.NewGuid():N}"[..16];

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var learner = await db.Users.FirstAsync(u => u.EmailNormalized == "LEARNER@STUDYAI.INTERNAL" || u.EmailNormalized == "learner@studyai.internal");

            db.ContentSubjects.Add(new ContentSubject
            {
                Id = isolatedSubjectId,
                Name = "Môn Test PhaseAi06",
                Code = $"P06_{Guid.NewGuid():N}"[..12],
                Grade = "12",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            });

            var q1 = new ContentQuestion
            {
                Id = $"q1_{Guid.NewGuid():N}"[..16],
                SubjectId = isolatedSubjectId,
                Prompt = "Câu hỏi 1 đã lưu trước hạn",
                OptionsJson = "[\"A\", \"B\", \"C\", \"D\"]",
                CorrectAnswer = "A",
                Status = "published"
            };
            var q2 = new ContentQuestion
            {
                Id = $"q2_{Guid.NewGuid():N}"[..16],
                SubjectId = isolatedSubjectId,
                Prompt = "Câu hỏi 2 nộp muộn sau hạn",
                OptionsJson = "[\"A\", \"B\", \"C\", \"D\"]",
                CorrectAnswer = "B",
                Status = "published"
            };
            db.ContentQuestions.AddRange(q1, q2);

            sessionId = $"exp_{Guid.NewGuid():N}"[..16];
            // Expired 10 minutes ago
            var expiredTime = DateTimeOffset.UtcNow.AddMinutes(-10);

            var attempt = new AssessmentAttempt
            {
                Id = sessionId,
                UserId = learner.Id,
                AssessmentId = "asmt_exam",
                SubjectId = isolatedSubjectId,
                CompletionStatus = "in_progress",
                StartedAt = expiredTime.AddMinutes(-60),
                ScoreMax = 2.0,
                SuspendDataJson = JsonSerializer.Serialize(new
                {
                    mode = "exam",
                    questionIds = new List<string> { q1.Id, q2.Id },
                    expiresAt = expiredTime.ToString("o"),
                    answers = new Dictionary<string, string>
                    {
                        [q1.Id] = "A" // Correct answer autosaved BEFORE deadline
                        // q2 was NOT saved before deadline
                    }
                })
            };
            db.AssessmentAttempts.Add(attempt);
            await db.SaveChangesAsync();

            q1Id = q1.Id;
            q2Id = q2.Id;
        }

        // Student submits after deadline with answers dictionary trying to sneak in answer for q2
        var submitReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{sessionId}/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                answers = new Dictionary<string, string>
                {
                    [q1Id] = "A",
                    [q2Id] = "B" // Sneaked answer submitted late
                },
                sessionTimeMs = 3600000
            }), Encoding.UTF8, "application/json")
        };
        submitReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);

        var submitResp = await _client.SendAsync(submitReq);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        // Verify in database: Only q1 (saved before expiration) was counted, q2 submitted late was NOT accepted
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var savedAttempt = await db.AssessmentAttempts.FirstAsync(a => a.Id == sessionId);

            Assert.Equal("completed", savedAttempt.CompletionStatus);
            // Exactly 1 correct (from autosaved q1), q2 was not accepted so scoreRaw is 1.0
            Assert.Equal(1.0, savedAttempt.ScoreRaw);
            // ScoreMax must preserve total question count (2.0), not hardcoded 10.0!
            Assert.Equal(2.0, savedAttempt.ScoreMax);
            // ScoreScaled normalized to 10-scale: 1 out of 2 = 5.0
            Assert.Equal(5.0, savedAttempt.ScoreScaled);
        }
    }
}

