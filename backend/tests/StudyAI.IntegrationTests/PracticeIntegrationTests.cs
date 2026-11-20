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
}

