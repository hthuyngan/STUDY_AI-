using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;


using StudyAI.Models;
using StudyAI.Data;
using StudyAI.IntegrationTests.Fixtures;
using Xunit;

namespace StudyAI.IntegrationTests;

public class PracticeIntegrationTests : IClassFixture<StudyAIApiFixture>, IAsyncLifetime
{
    private readonly StudyAIApiFixture _factory;
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public PracticeIntegrationTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
    }

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        await SampleCurriculumFixtureSeeder.SeedAsync(db);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<string> LoginAsync(string email, string password)
    {
        var loginDto = new UserLoginRequestDto
        {
            Email = email,
            Password = password
        };
        var content = new StringContent(JsonSerializer.Serialize(loginDto), Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/v1/auth/login", content);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AuthResponseDto>(body, _jsonOptions);
        return result!.AccessToken;
    }

    private async Task<string> GetLearnerTokenAsync()
    {
        return await LoginAsync("learner@studyai.internal", "Learner@123456");
    }

    [Fact]
    public async Task PracticeFlow_Create_Answer_Submit_And_CheckStats()
    {
        var token = await GetLearnerTokenAsync();

        // 1. Create Practice Session (Zero-Leak)
        var createReq = new CreatePracticeSessionRequest
        {
            SubjectId = "sub_math12",
            QuestionCount = 3,
            Mode = "practice"
        };

        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var createResp = await _client.SendAsync(postMsg);
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);

        var createBody = await createResp.Content.ReadAsStringAsync();
        var session = JsonSerializer.Deserialize<PracticeSessionResponseDto>(createBody, _jsonOptions);

        Assert.NotNull(session);
        Assert.NotEmpty(session.SessionId);
        Assert.NotEmpty(session.Questions);
        Assert.Equal("in_progress", session.Status);

        // Verify Zero-Leak: Ensure JSON response doesn't contain "correctAnswer" or "explanation"
        Assert.DoesNotContain("\"correctAnswer\"", createBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"explanation\"", createBody, StringComparison.OrdinalIgnoreCase);

        var firstQ = session.Questions[0];
        Assert.NotEmpty(firstQ.Prompt);
        Assert.NotEmpty(firstQ.Options);

        // 2. Save Answer for First Question
        var saveReq = new SaveAnswerRequest
        {
            QuestionId = firstQ.Id,
            Answer = firstQ.Options[0],
            TimeSpentMs = 3000
        };

        var saveMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/answer")
        {
            Content = new StringContent(JsonSerializer.Serialize(saveReq), Encoding.UTF8, "application/json")
        };
        saveMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var saveResp = await _client.SendAsync(saveMsg);
        Assert.Equal(HttpStatusCode.OK, saveResp.StatusCode);

        // 3. Submit Session
        var answers = new Dictionary<string, string>();
        foreach (var q in session.Questions)
        {
            answers[q.Id] = q.Options[0];
        }

        var submitReq = new SubmitPracticeSessionRequest
        {
            Answers = answers,
            SessionTimeMs = 45000
        };

        var submitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(submitReq), Encoding.UTF8, "application/json")
        };
        submitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var submitResp = await _client.SendAsync(submitMsg);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        var submitBody = await submitResp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<PracticeResultDto>(submitBody, _jsonOptions);

        Assert.NotNull(result);
        Assert.Equal(session.SessionId, result.SessionId);
        Assert.Equal(session.Questions.Count, result.TotalQuestions);
        Assert.True(result.ScoreScaled >= 0 && result.ScoreScaled <= 10.0);
        Assert.NotEmpty(result.Questions);

        // Post-submission: Explanations are now available
        Assert.Contains("\"explanation\"", submitBody, StringComparison.OrdinalIgnoreCase);

        // 4. Check Dashboard Stats
        var statsMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/dashboard-stats");
        statsMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var statsResp = await _client.SendAsync(statsMsg);
        Assert.Equal(HttpStatusCode.OK, statsResp.StatusCode);

        var statsBody = await statsResp.Content.ReadAsStringAsync();
        var stats = JsonSerializer.Deserialize<LearnerDashboardStatsDto>(statsBody, _jsonOptions);

        Assert.NotNull(stats);
        Assert.True(stats.TotalQuestionsPracticed >= session.Questions.Count);
        Assert.NotNull(stats.SubjectProgress);
    }

    [Fact]
    public async Task Practice_Unauthenticated_ReturnsUnauthorized()
    {
        var createReq = new CreatePracticeSessionRequest
        {
            SubjectId = "sub_math12",
            QuestionCount = 3,
            Mode = "practice"
        };
        var content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json");
        var resp = await _client.PostAsync("/api/v1/practice/sessions", content);

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Practice_ExamMode_CheckQuestionBeforeSubmit_ReturnsForbidden()
    {
        var token = await GetLearnerTokenAsync();

        // 1. Create Exam Session
        var createReq = new CreatePracticeSessionRequest
        {
            SubjectId = "sub_math12",
            QuestionCount = 2,
            Mode = "exam"
        };

        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var createResp = await _client.SendAsync(postMsg);
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);

        var session = JsonSerializer.Deserialize<PracticeSessionResponseDto>(
            await createResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(session);

        // 2. Try to peek answer in exam mode before submit -> MUST BE FORBIDDEN (403)
        var checkReq = new CheckQuestionRequest
        {
            QuestionId = session.Questions[0].Id,
            Answer = session.Questions[0].Options[0]
        };

        var checkMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/check-question")
        {
            Content = new StringContent(JsonSerializer.Serialize(checkReq), Encoding.UTF8, "application/json")
        };
        checkMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var checkResp = await _client.SendAsync(checkMsg);
        Assert.Equal(HttpStatusCode.Forbidden, checkResp.StatusCode);

        // 3. Clean up by submitting the session so it doesn't block other integration tests
        var submitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SubmitPracticeSessionRequest
            {
                Answers = new Dictionary<string, string>(),
                SessionTimeMs = 1000
            }), Encoding.UTF8, "application/json")
        };
        submitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        await _client.SendAsync(submitMsg);
    }

    [Fact]
    public async Task GetQuestionCount_ReturnsRealPublishedCountFromSql()
    {
        var token = await GetLearnerTokenAsync();

        // 1. Query Question Count for seeded Math 10
        var msg10 = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/question-count?subjectId=sub_math10");
        msg10.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp10 = await _client.SendAsync(msg10);
        Assert.Equal(HttpStatusCode.OK, resp10.StatusCode);

        var body10 = await resp10.Content.ReadAsStringAsync();
        using var doc10 = JsonDocument.Parse(body10);
        var count10 = doc10.RootElement.GetProperty("count").GetInt32();
        Assert.True(count10 >= 2, $"Expected at least 2 questions for sub_math10, found {count10}");

        // 2. Query Question Count for non-existent chapter -> 0
        var msgNonExistent = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/question-count?subjectId=sub_math10&chapterId=chap_nonexistent_99");
        msgNonExistent.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var respNonExistent = await _client.SendAsync(msgNonExistent);
        Assert.Equal(HttpStatusCode.OK, respNonExistent.StatusCode);

        var bodyNonExistent = await respNonExistent.Content.ReadAsStringAsync();
        using var docNonExistent = JsonDocument.Parse(bodyNonExistent);
        var countNonExistent = docNonExistent.RootElement.GetProperty("count").GetInt32();
        Assert.Equal(0, countNonExistent);
    }

    [Fact]
    public async Task Me_Bookmarks_Add_Query_Delete_PersistedInSql()
    {
        var token = await GetLearnerTokenAsync();
        var testItemId = $"test_lib_item_{Guid.NewGuid():N}";

        // 1. Add Bookmark
        var addReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/me/bookmarks")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                itemId = testItemId,
                title = "Đạo hàm và ứng dụng ôn tập",
                subjectId = "sub_math12"
            }), Encoding.UTF8, "application/json")
        };
        addReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var addResp = await _client.SendAsync(addReq);
        Assert.Equal(HttpStatusCode.OK, addResp.StatusCode);

        // 2. Query Bookmarks
        var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/me/bookmarks");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getResp = await _client.SendAsync(getReq);
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);

        var getBody = await getResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(getBody);
        var items = doc.RootElement.EnumerateArray();
        var found = items.Any(el => el.GetProperty("itemId").GetString() == testItemId);
        Assert.True(found, $"Item {testItemId} was not found in persisted bookmarks");

        // 3. Delete Bookmark
        var delReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/me/bookmarks/{testItemId}");
        delReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var delResp = await _client.SendAsync(delReq);
        Assert.Equal(HttpStatusCode.OK, delResp.StatusCode);

        // 4. Verify Removed
        var getAfterReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/me/bookmarks");
        getAfterReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getAfterResp = await _client.SendAsync(getAfterReq);
        var getAfterBody = await getAfterResp.Content.ReadAsStringAsync();
        using var docAfter = JsonDocument.Parse(getAfterBody);
        var foundAfter = docAfter.RootElement.EnumerateArray().Any(el => el.GetProperty("itemId").GetString() == testItemId);
        Assert.False(foundAfter, $"Item {testItemId} should have been deleted from bookmarks");
    }

    [Fact]
    public async Task AssessmentAttempt_Update_PreservesAndAssignsLessonAndSubjectId()
    {
        var token = await GetLearnerTokenAsync();
        var attemptId = $"att_update_test_{Guid.NewGuid():N}";
        var testLessonId = "les_math12_c1_b1";
        var testSubjectId = "sub_math12";

        // 1. Initial attempt creation without lessonId
        var initDto = new AssessmentAttemptCreateDto
        {
            Id = attemptId,
            AssessmentId = "asm_math12_test",
            LessonId = "", // initially empty
            SubjectId = "",
            CompletionStatus = "incomplete",
            StartedAt = DateTimeOffset.UtcNow,
            LastActivityAt = DateTimeOffset.UtcNow
        };
        var initReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/me/assessment-attempts/{attemptId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(initDto), Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"))
        };
        initReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var initResp = await _client.SendAsync(initReq);
        Assert.Equal(HttpStatusCode.OK, initResp.StatusCode);

        // 2. Later update providing LessonId and SubjectId
        var updateDto = new AssessmentAttemptCreateDto
        {
            Id = attemptId,
            AssessmentId = "asm_math12_test",
            LessonId = testLessonId,
            SubjectId = testSubjectId,
            CompletionStatus = "completed",
            SuccessStatus = "passed",
            ScoreRaw = 10,
            CompletedAt = DateTimeOffset.UtcNow,
            LastActivityAt = DateTimeOffset.UtcNow
        };
        var updateReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/me/assessment-attempts/{attemptId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateDto), Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"))
        };
        updateReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var updateResp = await _client.SendAsync(updateReq);
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        // 3. Query by lessonId -> MUST find the attempt
        var queryReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/me/assessment-attempts?lessonId={testLessonId}");
        queryReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var queryResp = await _client.SendAsync(queryReq);
        Assert.Equal(HttpStatusCode.OK, queryResp.StatusCode);

        var queryBody = await queryResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(queryBody);
        var attempts = doc.RootElement.EnumerateArray();
        var matched = attempts.FirstOrDefault(a => a.GetProperty("id").GetString() == attemptId);
        Assert.NotNull(matched.GetRawText());
        Assert.Equal(testLessonId, matched.GetProperty("lessonId").GetString());
        Assert.Equal(testSubjectId, matched.GetProperty("subjectId").GetString());
        Assert.Equal("completed", matched.GetProperty("completionStatus").GetString());
    }

    [Fact]
    public async Task GetQuestionCount_And_CreateSession_UseExactSamePredicate_Including_Skill_Type_Difficulty()
    {
        var token = await GetLearnerTokenAsync();

        // 1. Filter sub_math10 with skillId = "Mệnh đề toán học" -> 1 question
        var countMsg1 = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/question-count?subjectId=sub_math10&skillId=M%E1%BB%87nh%20%C4%91%E1%BB%81%20to%C3%A1n%20h%E1%BB%8Dc");
        countMsg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp1 = await _client.SendAsync(countMsg1);
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);
        var body1 = await resp1.Content.ReadAsStringAsync();
        using var doc1 = JsonDocument.Parse(body1);
        Assert.Equal(1, doc1.RootElement.GetProperty("count").GetInt32());

        // 2. Filter sub_math10 with non-existent skill -> count = 0
        var countMsg2 = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/question-count?subjectId=sub_math10&skillId=NON_EXISTENT_SKILL_99");
        countMsg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp2 = await _client.SendAsync(countMsg2);
        Assert.Equal(HttpStatusCode.OK, resp2.StatusCode);
        var body2 = await resp2.Content.ReadAsStringAsync();
        using var doc2 = JsonDocument.Parse(body2);
        Assert.Equal(0, doc2.RootElement.GetProperty("count").GetInt32());

        // 3. CreateSession with non-existent skill -> MUST return 404 NotFound
        var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreatePracticeSessionRequest
            {
                SubjectId = "sub_math10",
                SkillId = "NON_EXISTENT_SKILL_99",
                QuestionCount = 5
            }), Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"))
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createResp = await _client.SendAsync(createMsg);
        Assert.Equal(HttpStatusCode.NotFound, createResp.StatusCode);

        // 4. QuestionType filter: multiple-choice on sub_math10 -> 2 questions
        var countMsg3 = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/question-count?subjectId=sub_math10&questionType=multiple_choice");
        countMsg3.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp3 = await _client.SendAsync(countMsg3);
        Assert.Equal(HttpStatusCode.OK, resp3.StatusCode);
        var body3 = await resp3.Content.ReadAsStringAsync();
        using var doc3 = JsonDocument.Parse(body3);
        Assert.Equal(2, doc3.RootElement.GetProperty("count").GetInt32());

        // 5. QuestionType filter: short_answer on sub_math10 -> 0 questions
        var countMsg4 = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/question-count?subjectId=sub_math10&questionType=short_answer");
        countMsg4.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp4 = await _client.SendAsync(countMsg4);
        Assert.Equal(HttpStatusCode.OK, resp4.StatusCode);
        var body4 = await resp4.Content.ReadAsStringAsync();
        using var doc4 = JsonDocument.Parse(body4);
        Assert.Equal(0, doc4.RootElement.GetProperty("count").GetInt32());
    }

    [Fact]
    public async Task AssessmentAttempt_Completed_IsImmutable_And_CannotChangeLessonId()
    {
        var token = await GetLearnerTokenAsync();
        var attemptId = $"att_immut_{Guid.NewGuid():N}";

        // 1. Create valid incomplete attempt
        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/me/assessment-attempts")
        {
            Content = new StringContent(JsonSerializer.Serialize(new AssessmentAttemptCreateDto
            {
                Id = attemptId,
                LessonId = "les_math12_c1_b1",
                SubjectId = "sub_math12",
                CompletionStatus = "incomplete",
                StartedAt = DateTimeOffset.UtcNow
            }), Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"))
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createResp = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        // 3. Try to change lessonId of existing attempt to another lesson -> 409 Conflict
        var changeLessonReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/me/assessment-attempts/{attemptId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new AssessmentAttemptCreateDto
            {
                Id = attemptId,
                LessonId = "les_math10_c1_b1", // changed lesson
                SubjectId = "sub_math12"
            }), Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"))
        };
        changeLessonReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var changeResp = await _client.SendAsync(changeLessonReq);
        Assert.Equal(HttpStatusCode.Conflict, changeResp.StatusCode);

        // 4. Mark attempt as completed
        var completeReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/me/assessment-attempts/{attemptId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new AssessmentAttemptCreateDto
            {
                Id = attemptId,
                LessonId = "les_math12_c1_b1",
                SubjectId = "sub_math12",
                CompletionStatus = "completed",
                CompletedAt = DateTimeOffset.UtcNow
            }), Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"))
        };
        completeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var completeResp = await _client.SendAsync(completeReq);
        Assert.Equal(HttpStatusCode.OK, completeResp.StatusCode);

        // 5. Try to modify finalized completed attempt -> 409 Conflict
        var mutateReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/me/assessment-attempts/{attemptId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new AssessmentAttemptCreateDto
            {
                Id = attemptId,
                LessonId = "les_math12_c1_b1",
                ScoreRaw = 100
            }), Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"))
        };
        mutateReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var mutateResp = await _client.SendAsync(mutateReq);
        Assert.Equal(HttpStatusCode.Conflict, mutateResp.StatusCode);
    }

    [Fact]
    public async Task Curriculum_GetMaterials_ReturnsRealPublishedLessonsAndFormulas()
    {
        var token = await GetLearnerTokenAsync();

        var msg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/curriculum/materials?subjectId=sub_math12");
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _client.SendAsync(msg);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var items = doc.RootElement.EnumerateArray();
        Assert.True(items.Any(), "Expected published curriculum materials from SQL");

        var first = items.First();
        Assert.NotEmpty(first.GetProperty("title").GetString()!);
        Assert.NotEmpty(first.GetProperty("category").GetString()!);
        Assert.Equal("sub_math12", first.GetProperty("subjectId").GetString());
    }

    [Fact]
    public async Task AdaptiveMode_AdheresToAllFilters_And_NeverReturnsQuestionsOutsideFilter()
    {
        var token = await GetLearnerTokenAsync();

        // 1. Adaptive mode with short_answer on sub_math10 (where 0 short_answer questions exist) -> 404 NotFound
        var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreatePracticeSessionRequest
            {
                SubjectId = "sub_math10",
                QuestionType = "short_answer",
                Mode = "adaptive",
                QuestionCount = 5
            }), Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"))
        };
        req1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp1 = await _client.SendAsync(req1);
        Assert.Equal(HttpStatusCode.NotFound, resp1.StatusCode);

        // 2. Adaptive mode with multiple-choice on sub_math10 -> 200 OK, all returned questions must be multiple-choice
        var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreatePracticeSessionRequest
            {
                SubjectId = "sub_math10",
                QuestionType = "multiple_choice",
                Mode = "adaptive",
                QuestionCount = 5
            }), Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"))
        };
        req2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp2 = await _client.SendAsync(req2);
        Assert.Equal(HttpStatusCode.OK, resp2.StatusCode);
        var body2 = await resp2.Content.ReadAsStringAsync();
        using var doc2 = JsonDocument.Parse(body2);
        var questions = doc2.RootElement.GetProperty("questions").EnumerateArray().ToList();
        Assert.True(questions.Count > 0);
        foreach (var q in questions)
        {
            Assert.Equal("sub_math10", q.GetProperty("subjectId").GetString());
            var qType = q.GetProperty("type").GetString();
            Assert.True(qType == "multiple-choice" || qType == "multiple_choice", $"Expected multiple-choice, got {qType}");
        }
    }

    private async Task<string> RegisterOtherLearnerTokenAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var regDto = new UserRegisterRequestDto
        {
            Email = $"other.learner.{suffix}@studyai.internal",
            Password = "Learner@123456",
            DisplayName = $"Other Learner {suffix}",
            Grade = "10"
        };
        var content = new StringContent(JsonSerializer.Serialize(regDto), Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/v1/auth/register", content);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AuthResponseDto>(body, _jsonOptions);
        return result!.AccessToken;
    }

    [Fact]
    public async Task GetSessionResult_Lifecycle_Auth_Ownership_And_ResultPersistence()
    {
        var token = await GetLearnerTokenAsync();
        var otherToken = await RegisterOtherLearnerTokenAsync();

        // 1. Create a session
        var createReq = new CreatePracticeSessionRequest
        {
            SubjectId = "sub_math10",
            QuestionCount = 2,
            Mode = "practice"
        };
        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createResp = await _client.SendAsync(postMsg);
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var session = JsonSerializer.Deserialize<PracticeSessionResponseDto>(await createResp.Content.ReadAsStringAsync(), _jsonOptions)!;

        // 2. Unauthenticated GET /sessions/{id}/result -> 401
        var unauthReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}/result");
        var unauthResp = await _client.SendAsync(unauthReq);
        Assert.Equal(HttpStatusCode.Unauthorized, unauthResp.StatusCode);

        // 3. Other student GET /sessions/{id}/result -> 403 Forbidden
        var otherReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}/result");
        otherReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", otherToken);
        var otherResp = await _client.SendAsync(otherReq);
        Assert.Equal(HttpStatusCode.Forbidden, otherResp.StatusCode);

        // 4. In-progress session GET /sessions/{id}/result -> 400 Bad Request (prevents answer leakage prior to submission)
        var inProgressReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}/result");
        inProgressReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var inProgressResp = await _client.SendAsync(inProgressReq);
        Assert.Equal(HttpStatusCode.BadRequest, inProgressResp.StatusCode);

        // 5. Submit session
        var submitReq = new SubmitPracticeSessionRequest
        {
            Answers = new Dictionary<string, string> { { session.Questions[0].Id, session.Questions[0].Options[0] } },
            SessionTimeMs = 15000
        };
        var submitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(submitReq), Encoding.UTF8, "application/json")
        };
        submitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var submitResp = await _client.SendAsync(submitMsg);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        // 6. After completion: GET /sessions/{id}/result -> 200 OK with full score & explanations
        var resultReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}/result");
        resultReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resultResp = await _client.SendAsync(resultReq);
        Assert.Equal(HttpStatusCode.OK, resultResp.StatusCode);
        var resultDto = JsonSerializer.Deserialize<PracticeResultDto>(await resultResp.Content.ReadAsStringAsync(), _jsonOptions)!;
        Assert.Equal(session.SessionId, resultDto.SessionId);
        Assert.Equal(2, resultDto.TotalQuestions);
        Assert.NotNull(resultDto.Questions);
        Assert.True(resultDto.Questions.Count > 0);
        Assert.NotEmpty(resultDto.Questions[0].CorrectAnswer);
        Assert.NotNull(resultDto.StartedAt);
        Assert.NotEmpty(resultDto.Questions[0].QuestionType ?? "");
        Assert.NotEmpty(resultDto.Questions[0].CognitiveLevel ?? "");
        Assert.NotNull(resultDto.Questions[0].SkillIds);

        // 7. GET /results/{resultId} (with 'res_' prefix and raw ID) -> 200 OK
        var resIdReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/results/res_{session.SessionId}");
        resIdReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resIdResp = await _client.SendAsync(resIdReq);
        Assert.Equal(HttpStatusCode.OK, resIdResp.StatusCode);

        var rawIdReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/results/{session.SessionId}");
        rawIdReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var rawIdResp = await _client.SendAsync(rawIdReq);
        Assert.Equal(HttpStatusCode.OK, rawIdResp.StatusCode);
    }

    [Fact]
    public async Task Practice_RBAC_Student_Teacher_Content_Admin_Isolation()
    {
        var learnerAToken = await GetLearnerTokenAsync();
        var learnerBToken = await RegisterOtherLearnerTokenAsync();

        // 1. Provision Teacher A, Teacher B, Admin, Content in StudyAIDb_E2E
        string teacherAEmail = "teacher.a@studyai.internal";
        string teacherBEmail = "teacher.b@studyai.internal";
        string teacherPassword = "Teacher@123456";

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            var learnerAUser = await db.Users.FirstAsync(u => u.EmailNormalized == "LEARNER@STUDYAI.INTERNAL" || u.EmailNormalized == "learner@studyai.internal");

            var teacherA = await db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == teacherAEmail.ToUpperInvariant());
            if (teacherA == null)
            {
                teacherA = new User
                {
                    Id = $"usr_tea_{Guid.NewGuid():N}"[..16],
                    Email = teacherAEmail,
                    EmailNormalized = teacherAEmail.ToUpperInvariant(),
                    PasswordHash = hasher.HashPassword(teacherPassword),
                    DisplayName = "Giáo viên A (Quản lý lớp)",
                    Role = "teacher",
                    Status = "active",
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                db.Users.Add(teacherA);
            }

            var teacherB = await db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == teacherBEmail.ToUpperInvariant());
            if (teacherB == null)
            {
                teacherB = new User
                {
                    Id = $"usr_teb_{Guid.NewGuid():N}"[..16],
                    Email = teacherBEmail,
                    EmailNormalized = teacherBEmail.ToUpperInvariant(),
                    PasswordHash = hasher.HashPassword(teacherPassword),
                    DisplayName = "Giáo viên B (Không dạy HS)",
                    Role = "teacher",
                    Status = "active",
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                db.Users.Add(teacherB);
            }

            // Classroom A managed by Teacher A
            var classroomA = await db.Classrooms.FirstOrDefaultAsync(c => c.TeacherId == teacherA.Id);
            if (classroomA == null)
            {
                classroomA = new Classroom
                {
                    Id = $"cls_tea_{Guid.NewGuid():N}"[..16],
                    Name = "Lớp 12A1 Thử Nghiệm",
                    Code = $"12A1_{Guid.NewGuid():N}"[..8],
                    Grade = "12",
                    Subject = "Toán",
                    TeacherId = teacherA.Id,
                    TeacherName = teacherA.DisplayName
                };
                db.Classrooms.Add(classroomA);
            }

            // Ensure Learner A is enrolled in Classroom A
            var enrollment = await db.ClassroomStudents.FirstOrDefaultAsync(cs => cs.ClassroomId == classroomA.Id && cs.StudentId == learnerAUser.Id);
            if (enrollment == null)
            {
                enrollment = new ClassroomStudent
                {
                    Id = $"cs_{Guid.NewGuid():N}"[..16],
                    ClassroomId = classroomA.Id,
                    StudentId = learnerAUser.Id,
                    EnrolledAt = DateTimeOffset.UtcNow
                };
                db.ClassroomStudents.Add(enrollment);
            }

            // Ensure Learner A is NOT enrolled in any classroom of Teacher B
            var classroomB = await db.Classrooms.FirstOrDefaultAsync(c => c.TeacherId == teacherB.Id);
            if (classroomB != null)
            {
                var foreignEnrollments = await db.ClassroomStudents.Where(cs => cs.ClassroomId == classroomB.Id && cs.StudentId == learnerAUser.Id).ToListAsync();
                db.ClassroomStudents.RemoveRange(foreignEnrollments);
            }

            await db.SaveChangesAsync();
        }

        var teacherAToken = await LoginAsync(teacherAEmail, teacherPassword);
        var teacherBToken = await LoginAsync(teacherBEmail, teacherPassword);
        var contentToken = await LoginAsync("content@studyai.internal", "Content@123456");
        var adminToken = await LoginAsync("admin@studyai.internal", "Admin@123456");

        // 2. Learner A creates a practice session
        var createReq = new CreatePracticeSessionRequest
        {
            SubjectId = "sub_math12",
            QuestionCount = 2,
            Mode = "practice"
        };
        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerAToken);
        var createResp = await _client.SendAsync(postMsg);
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var session = JsonSerializer.Deserialize<PracticeSessionResponseDto>(await createResp.Content.ReadAsStringAsync(), _jsonOptions)!;

        // 3. Learner B cannot view, answer, or submit Learner A's session -> 403
        var bGetMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}");
        bGetMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerBToken);
        var bGetResp = await _client.SendAsync(bGetMsg);
        Assert.Equal(HttpStatusCode.Forbidden, bGetResp.StatusCode);

        var bAnswerMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/answer")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SaveAnswerRequest { QuestionId = session.Questions[0].Id, Answer = session.Questions[0].Options[0] }), Encoding.UTF8, "application/json")
        };
        bAnswerMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerBToken);
        var bAnswerResp = await _client.SendAsync(bAnswerMsg);
        Assert.Equal(HttpStatusCode.Forbidden, bAnswerResp.StatusCode);

        var bSubmitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SubmitPracticeSessionRequest { Answers = new Dictionary<string, string>() }), Encoding.UTF8, "application/json")
        };
        bSubmitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerBToken);
        var bSubmitResp = await _client.SendAsync(bSubmitMsg);
        Assert.Equal(HttpStatusCode.Forbidden, bSubmitResp.StatusCode);

        // 4. Content user cannot view session -> 403
        var cGetMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}");
        cGetMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var cGetResp = await _client.SendAsync(cGetMsg);
        Assert.Equal(HttpStatusCode.Forbidden, cGetResp.StatusCode);

        // 5. Teacher B (not teaching Learner A) cannot view session -> 403
        var tBGetMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}");
        tBGetMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherBToken);
        var tBGetResp = await _client.SendAsync(tBGetMsg);
        Assert.Equal(HttpStatusCode.Forbidden, tBGetResp.StatusCode);

        // 6. Teacher A (teaches Learner A) CAN view session -> 200 OK
        var tAGetMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}");
        tAGetMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherAToken);
        var tAGetResp = await _client.SendAsync(tAGetMsg);
        Assert.Equal(HttpStatusCode.OK, tAGetResp.StatusCode);

        // But Teacher A CANNOT submit or answer for Learner A -> 403 Forbidden
        var tASubmitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SubmitPracticeSessionRequest { Answers = new Dictionary<string, string>() }), Encoding.UTF8, "application/json")
        };
        tASubmitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherAToken);
        var tASubmitResp = await _client.SendAsync(tASubmitMsg);
        Assert.Equal(HttpStatusCode.Forbidden, tASubmitResp.StatusCode);

        // 7. Admin CAN view session -> 200 OK, but CANNOT submit for student -> 403
        var admGetMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}");
        admGetMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var admGetResp = await _client.SendAsync(admGetMsg);
        Assert.Equal(HttpStatusCode.OK, admGetResp.StatusCode);

        var admSubmitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SubmitPracticeSessionRequest { Answers = new Dictionary<string, string>() }), Encoding.UTF8, "application/json")
        };
        admSubmitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var admSubmitResp = await _client.SendAsync(admSubmitMsg);
        Assert.Equal(HttpStatusCode.Forbidden, admSubmitResp.StatusCode);

        // 8. Learner A submits session
        var aSubmitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{session.SessionId}/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SubmitPracticeSessionRequest
            {
                Answers = new Dictionary<string, string> { { session.Questions[0].Id, session.Questions[0].Options[0] } },
                SessionTimeMs = 5000
            }), Encoding.UTF8, "application/json")
        };
        aSubmitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerAToken);
        var aSubmitResp = await _client.SendAsync(aSubmitMsg);
        Assert.Equal(HttpStatusCode.OK, aSubmitResp.StatusCode);

        // 9. Post-Submission Result Access RBAC:
        // Learner B -> 403
        var bResultMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}/result");
        bResultMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerBToken);
        var bResultResp = await _client.SendAsync(bResultMsg);
        Assert.Equal(HttpStatusCode.Forbidden, bResultResp.StatusCode);

        // Content -> 403
        var cResultMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}/result");
        cResultMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var cResultResp = await _client.SendAsync(cResultMsg);
        Assert.Equal(HttpStatusCode.Forbidden, cResultResp.StatusCode);

        // Teacher B -> 403
        var tBResultMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}/result");
        tBResultMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherBToken);
        var tBResultResp = await _client.SendAsync(tBResultMsg);
        Assert.Equal(HttpStatusCode.Forbidden, tBResultResp.StatusCode);

        // Teacher A (managing teacher) -> 200 OK
        var tAResultMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}/result");
        tAResultMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherAToken);
        var tAResultResp = await _client.SendAsync(tAResultMsg);
        Assert.Equal(HttpStatusCode.OK, tAResultResp.StatusCode);

        // Admin -> 200 OK
        var admResultMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/practice/sessions/{session.SessionId}/result");
        admResultMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var admResultResp = await _client.SendAsync(admResultMsg);
        Assert.Equal(HttpStatusCode.OK, admResultResp.StatusCode);
    }
}

