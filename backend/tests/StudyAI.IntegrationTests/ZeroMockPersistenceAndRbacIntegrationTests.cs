using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.IntegrationTests;

public class ZeroMockPersistenceAndRbacIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public ZeroMockPersistenceAndRbacIntegrationTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, string UserId, string Email)> CreateAndLoginUserAsync(string role, string? displayName = null, string? grade = null)
    {
        var email = $"{role}_{Guid.NewGuid():N}@studyai.internal";
        var password = "Password@123";

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            var user = new User
            {
                Id = $"usr-{Guid.NewGuid():N}"[..12],
                Email = email,
                EmailNormalized = email.ToUpperInvariant(),
                PasswordHash = passwordHasher.HashPassword(password),
                DisplayName = displayName ?? $"User {role}",
                Role = role,
                Grade = grade ?? (role == "learner" ? "12" : null),
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = email,
                Password = password
            }),
            Encoding.UTF8,
            "application/json"));
        loginResp.EnsureSuccessStatusCode();

        var authBody = await loginResp.Content.ReadAsStringAsync();
        var authResult = JsonSerializer.Deserialize<AuthResponseDto>(authBody, JsonOpts);
        return (authResult!.AccessToken, authResult.User.Id, email);
    }

    [Fact]
    public async Task Guest_Accessing_Personal_Data_Returns_Unauthorized_FailClosed()
    {
        var guestClient = _factory.CreateClient();

        var endpoints = new[]
        {
            "/api/v1/me/lesson-progress",
            "/api/v1/auth/me",
            "/api/v1/practice/dashboard-stats",
            "/api/v1/me/bookmarks",
            "/api/v1/me/learning-events",
            "/api/v1/teacher/alerts",
            "/api/v1/admin/users",
        };

        foreach (var endpoint in endpoints)
        {
            var resp = await guestClient.GetAsync(endpoint);
            Assert.True(
                resp.StatusCode == HttpStatusCode.Unauthorized || resp.StatusCode == HttpStatusCode.Forbidden,
                $"Guest access to {endpoint} expected 401/403 but got {resp.StatusCode}");

            var body = await resp.Content.ReadAsStringAsync();
            Assert.DoesNotContain("learner@studyai", body);
            Assert.DoesNotContain("Demo Admin", body);
        }
    }

    [Fact]
    public async Task Student_A_And_Student_B_Isolation_Guarantees_Zero_Cross_Leakage()
    {
        var (tokenA, userAId, _) = await CreateAndLoginUserAsync("learner", "Học viên A", "10");
        var (tokenB, userBId, _) = await CreateAndLoginUserAsync("learner", "Học viên B", "12");

        var lessonId = $"les_test_{Guid.NewGuid():N}"[..12];

        // 1. Student A updates progress on lesson
        var putReqA = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/me/lesson-progress/{lessonId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new LessonProgressCreateOrUpdateDto
            {
                SubjectId = "sub_math10",
                ContentProgress = 90,
                OverallProgress = 85,
                AssessmentStatus = "completed",
                CompletedSectionIds = new List<string> { "sec_a1" }
            }), Encoding.UTF8, "application/json")
        };
        putReqA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var putRespA = await _client.SendAsync(putReqA);
        Assert.Equal(HttpStatusCode.OK, putRespA.StatusCode);

        // 2. Student B queries progress for the same lesson
        var getReqB = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/me/lesson-progress/{lessonId}");
        getReqB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var getRespB = await _client.SendAsync(getReqB);

        if (getRespB.StatusCode == HttpStatusCode.OK)
        {
            var bodyB = await getRespB.Content.ReadAsStringAsync();
            var docB = JsonDocument.Parse(bodyB);
            var prog = docB.RootElement.GetProperty("contentProgress").GetInt32();
            Assert.Equal(0, prog); // Student B cannot see Student A's 90% progress
        }
        else
        {
            Assert.Equal(HttpStatusCode.NotFound, getRespB.StatusCode);
        }

        // 3. Verify in SQL that Student A's progress is explicitly tagged with UserA's Id
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var lpA = await db.LessonProgresses.FirstOrDefaultAsync(lp => lp.UserId == userAId && lp.LessonId == lessonId);
            Assert.NotNull(lpA);
            Assert.Equal(90, lpA.ContentProgress);

            var lpB = await db.LessonProgresses.FirstOrDefaultAsync(lp => lp.UserId == userBId && lp.LessonId == lessonId);
            Assert.Null(lpB);
        }
    }

    [Fact]
    public async Task Content_Revision_Rollback_Restores_Snapshot_And_Persists_To_SQL()
    {
        var (authorToken, authorUserId, _) = await CreateAndLoginUserAsync("content", "Biên tập viên Toán");
        var (reviewerToken, reviewerUserId, _) = await CreateAndLoginUserAsync("content", "Kiểm duyệt viên Toán");

        var qCode = $"Q_RB_{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        var originalPrompt = "Cho hàm số f(x) = x^3 - 3x. Tìm số điểm cực trị.";
        var modifiedPrompt = "Cho hàm số g(x) = 2x^2 + 1. Tìm giá trị nhỏ nhất.";

        // 1. Create Question (revision 1)
        var createPayload = new CreateQuestionRequestDto
        {
            Code = qCode,
            Prompt = originalPrompt,
            Type = "multiple-choice",
            Grade = "12",
            Difficulty = "thong_hieu",
            Options = new List<string> { "0", "2", "1", "3" },
            CorrectAnswer = "2",
            Explanation = "f'(x) = 3x^2 - 3 = 0 <=> x = +-1 nên có 2 cực trị.",
            Status = "draft"
        };

        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/questions")
        {
            Content = JsonContent.Create(createPayload)
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authorToken);
        var createResp = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        var createdItem = await createResp.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.NotNull(createdItem);
        var questionId = createdItem.Id;

        // 2. Submit Review (by Author), Approve & Publish (by Reviewer under Four-Eyes principle)
        var submitReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/questions/{questionId}/submit-review");
        submitReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authorToken);
        var submitResp = await _client.SendAsync(submitReq);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        // Verify Author CANNOT self-approve (Four-Eyes enforcement)
        var selfApproveReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/questions/{questionId}/approve");
        selfApproveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authorToken);
        var selfApproveResp = await _client.SendAsync(selfApproveReq);
        Assert.Equal(HttpStatusCode.Forbidden, selfApproveResp.StatusCode);

        var approveReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/questions/{questionId}/approve");
        approveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", reviewerToken);
        var approveResp = await _client.SendAsync(approveReq);
        Assert.Equal(HttpStatusCode.OK, approveResp.StatusCode);

        var pubReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/questions/{questionId}/publish");
        pubReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", reviewerToken);
        var pubResp = await _client.SendAsync(pubReq);
        Assert.Equal(HttpStatusCode.OK, pubResp.StatusCode);

        var publishedItem = await pubResp.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.NotNull(publishedItem);
        Assert.Equal("published", publishedItem.Status);

        // 3. Update Question (Prompt changed to modifiedPrompt)
        var updatePayload = new UpdateQuestionRequestDto
        {
            Prompt = modifiedPrompt,
            Type = "multiple-choice",
            Difficulty = "nhan_biet",
            CorrectAnswer = "1",
            Explanation = "g(x) >= 1 với mọi x."
        };
        var updateReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/content/questions/{questionId}")
        {
            Content = JsonContent.Create(updatePayload)
        };
        updateReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authorToken);
        var updateResp = await _client.SendAsync(updateReq);
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        // 4. Rollback to Revision 1 (by Reviewer or Author)
        var rollbackPayload = new RollbackContentRequestDto
        {
            TargetVersion = 1,
            Reason = "Khôi phục lại câu hỏi gốc ban đầu"
        };
        var rollbackReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/questions/{questionId}/rollback")
        {
            Content = JsonContent.Create(rollbackPayload)
        };
        rollbackReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", reviewerToken);
        var rollbackResp = await _client.SendAsync(rollbackReq);
        Assert.Equal(HttpStatusCode.OK, rollbackResp.StatusCode);

        var rollbackItem = await rollbackResp.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.NotNull(rollbackItem);
        Assert.Equal(originalPrompt, rollbackItem.Prompt);
        Assert.Equal("draft", rollbackItem.Status);

        // 5. Verify in a completely separate DbContext scope from SQL directly
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var persistedQ = await db.ContentQuestions.AsNoTracking().FirstOrDefaultAsync(q => q.Id == questionId);
            Assert.NotNull(persistedQ);
            Assert.Equal(originalPrompt, persistedQ.Prompt);
            Assert.Equal("draft", persistedQ.Status);

            var revisions = await db.ContentRevisions
                .AsNoTracking()
                .Where(r => r.ContentId == questionId)
                .OrderBy(r => r.Version)
                .ToListAsync();

            Assert.True(revisions.Count >= 2, $"Expected at least 2 revisions but got {revisions.Count}");
            Assert.Equal(1, revisions[0].Version);
            Assert.Equal(2, revisions[1].Version);

            var rev1Doc = JsonDocument.Parse(revisions[0].SnapshotJson);
            Assert.Equal(originalPrompt, rev1Doc.RootElement.GetProperty("Prompt").GetString());

            var rev2Doc = JsonDocument.Parse(revisions[1].SnapshotJson);
            Assert.Equal(originalPrompt, rev2Doc.RootElement.GetProperty("Prompt").GetString());
            Assert.Equal(revisions[0].Id, revisions[1].SourceRevisionId);
        }

        // 6. Verify learner cannot invoke rollback (RBAC)
        var (learnerToken, _, _) = await CreateAndLoginUserAsync("learner");
        var learnerRollbackReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/questions/{questionId}/rollback")
        {
            Content = JsonContent.Create(rollbackPayload)
        };
        learnerRollbackReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var learnerRollbackResp = await _client.SendAsync(learnerRollbackReq);
        Assert.Equal(HttpStatusCode.Forbidden, learnerRollbackResp.StatusCode);
    }

    [Fact]
    public async Task Classroom_Alert_Persistence_And_Resolution_Across_Fresh_DbContext()
    {
        var (teacherAToken, teacherAId, _) = await CreateAndLoginUserAsync("teacher", "Thầy A");
        var (teacherBToken, teacherBId, _) = await CreateAndLoginUserAsync("teacher", "Cô B");
        var (studentToken, studentId, _) = await CreateAndLoginUserAsync("learner", "Học sinh Alert");

        var classId = $"cls_{Guid.NewGuid():N}"[..12];
        var alertId = $"alt_{Guid.NewGuid():N}"[..12];

        // 1. Setup Classroom and Alert directly in SQL
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();

            var classroom = new Classroom
            {
                Id = classId,
                Code = $"CLS_{Guid.NewGuid():N}"[..8].ToUpperInvariant(),
                Name = "Lớp 12A1 Chuyên Toán",
                Subject = "Toán",
                Grade = "12",
                TeacherId = teacherAId,
                AcademicYear = "2026-2027",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Classrooms.Add(classroom);

            var enrollment = new ClassroomStudent
            {
                Id = $"cs_{Guid.NewGuid():N}"[..12],
                ClassroomId = classId,
                StudentId = studentId,
                EnrolledAt = DateTimeOffset.UtcNow
            };
            db.ClassroomStudents.Add(enrollment);

            var alert = new ClassroomAlert
            {
                Id = alertId,
                ClassroomId = classId,
                StudentId = studentId,
                Severity = "high",
                Type = "low_score",
                Message = "Học sinh đạt điểm dưới 5.0 trong 2 bài luyện tập liên tiếp",
                Status = "pending",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.ClassroomAlerts.Add(alert);

            await db.SaveChangesAsync();
        }

        // 2. Teacher A fetches alerts -> sees alert
        var getAlertsReqA = new HttpRequestMessage(HttpMethod.Get, "/api/v1/teacher/alerts");
        getAlertsReqA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherAToken);
        var getAlertsRespA = await _client.SendAsync(getAlertsReqA);
        Assert.Equal(HttpStatusCode.OK, getAlertsRespA.StatusCode);
        var alertsJsonA = await getAlertsRespA.Content.ReadAsStringAsync();
        Assert.Contains(alertId, alertsJsonA);

        // 3. Teacher B fetches alerts -> does NOT see Teacher A's alert (isolation)
        var getAlertsReqB = new HttpRequestMessage(HttpMethod.Get, "/api/v1/teacher/alerts");
        getAlertsReqB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherBToken);
        var getAlertsRespB = await _client.SendAsync(getAlertsReqB);
        Assert.Equal(HttpStatusCode.OK, getAlertsRespB.StatusCode);
        var alertsJsonB = await getAlertsRespB.Content.ReadAsStringAsync();
        Assert.DoesNotContain(alertId, alertsJsonB);

        // 4. Teacher B tries to resolve Teacher A's alert -> returns 403 Forbidden
        var resolvePayload = new JsonObject
        {
            ["status"] = "resolved",
            ["resolutionNote"] = "Đã phụ đạo thêm cho học viên"
        };
        var resolveReqB = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/teacher/alerts/{alertId}")
        {
            Content = new StringContent(resolvePayload.ToJsonString(), Encoding.UTF8, "application/json")
        };
        resolveReqB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherBToken);
        var resolveRespB = await _client.SendAsync(resolveReqB);
        Assert.Equal(HttpStatusCode.Forbidden, resolveRespB.StatusCode);

        // 5. Teacher A resolves the alert -> returns 200 OK
        var resolveReqA = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/teacher/alerts/{alertId}")
        {
            Content = new StringContent(resolvePayload.ToJsonString(), Encoding.UTF8, "application/json")
        };
        resolveReqA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherAToken);
        var resolveRespA = await _client.SendAsync(resolveReqA);
        Assert.Equal(HttpStatusCode.OK, resolveRespA.StatusCode);

        // 6. Verify persistence in a fresh separate DbContext scope
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var persistedAlert = await db.ClassroomAlerts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == alertId);
            Assert.NotNull(persistedAlert);
            Assert.Equal("resolved", persistedAlert.Status);
            Assert.Equal("Đã phụ đạo thêm cho học viên", persistedAlert.ResolutionNote);
            Assert.Equal(teacherAId, persistedAlert.ResolvedByTeacherId);
            Assert.NotNull(persistedAlert.ResolvedAt);
        }
    }

    [Fact]
    public async Task Zero_Mock_FailClosed_For_NonExistent_Resources()
    {
        var (learnerToken, _, _) = await CreateAndLoginUserAsync("learner");

        var endpoints = new[]
        {
            "/api/v1/curriculum/subjects/sub_non_existent_fake_999",
            "/api/v1/curriculum/lessons/les_non_existent_fake_999",
            "/api/v1/content/questions/q_non_existent_fake_999",
        };

        foreach (var endpoint in endpoints)
        {
            var req = new HttpRequestMessage(HttpMethod.Get, endpoint);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
            var resp = await _client.SendAsync(req);
            Assert.True(
                resp.StatusCode == HttpStatusCode.NotFound || resp.StatusCode == HttpStatusCode.Forbidden,
                $"Request to {endpoint} expected 404/403 but got {resp.StatusCode}");
        }
    }
}
