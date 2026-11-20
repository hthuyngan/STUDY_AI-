using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using StudyAI.Application.DTOs;
using Xunit;

namespace StudyAI.IntegrationTests;

public class PracticeIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public PracticeIntegrationTests(StudyAIApiFixture factory)
    {
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
    }

    private async Task<string> GetLearnerTokenAsync()
    {
        var loginDto = new UserLoginRequestDto
        {
            Email = "learner@studyai.internal",
            Password = "Learner@123456"
        };
        var content = new StringContent(JsonSerializer.Serialize(loginDto), Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/v1/auth/login", content);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AuthResponseDto>(body, _jsonOptions);
        return result!.AccessToken;
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
}

