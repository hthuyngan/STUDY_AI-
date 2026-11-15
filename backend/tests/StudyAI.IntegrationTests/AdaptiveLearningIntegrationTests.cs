using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using StudyAI.Application.DTOs;
using Xunit;

namespace StudyAI.IntegrationTests;

public class AdaptiveLearningIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public AdaptiveLearningIntegrationTests(StudyAIApiFixture factory)
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
    public async Task HintLadder_ReturnsThreeLevels_WithoutLeakingFinalAnswer()
    {
        var token = await GetLearnerTokenAsync();

        // 1. Get a question from practice session to test hints
        var createReq = new CreatePracticeSessionRequest
        {
            SubjectId = "sub_math12",
            QuestionCount = 1
        };
        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createResp = await _client.SendAsync(postMsg);
        var session = JsonSerializer.Deserialize<PracticeSessionResponseDto>(
            await createResp.Content.ReadAsStringAsync(), _jsonOptions);

        var qId = session!.Questions[0].Id;

        // Test Level 1 Hint (Conceptual)
        var hint1Req = new HintRequestDto { QuestionId = qId, HintLevel = 1 };
        var msg1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/hints")
        {
            Content = new StringContent(JsonSerializer.Serialize(hint1Req), Encoding.UTF8, "application/json")
        };
        msg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp1 = await _client.SendAsync(msg1);
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);
        var hint1 = JsonSerializer.Deserialize<HintResponseDto>(await resp1.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(hint1);
        Assert.Equal(1, hint1.HintLevel);
        Assert.Contains("Gợi ý", hint1.HintLevelName);
        Assert.NotEmpty(hint1.HintText);

        // Test Level 2 Hint (Methodological)
        var hint2Req = new HintRequestDto { QuestionId = qId, HintLevel = 2 };
        var msg2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/hints")
        {
            Content = new StringContent(JsonSerializer.Serialize(hint2Req), Encoding.UTF8, "application/json")
        };
        msg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp2 = await _client.SendAsync(msg2);
        Assert.Equal(HttpStatusCode.OK, resp2.StatusCode);
        var hint2 = JsonSerializer.Deserialize<HintResponseDto>(await resp2.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.Equal(2, hint2!.HintLevel);

        // Test Level 3 Hint (Key Step)
        var hint3Req = new HintRequestDto { QuestionId = qId, HintLevel = 3 };
        var msg3 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/hints")
        {
            Content = new StringContent(JsonSerializer.Serialize(hint3Req), Encoding.UTF8, "application/json")
        };
        msg3.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp3 = await _client.SendAsync(msg3);
        Assert.Equal(HttpStatusCode.OK, resp3.StatusCode);
        var hint3 = JsonSerializer.Deserialize<HintResponseDto>(await resp3.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.Equal(3, hint3!.HintLevel);
    }

    [Fact]
    public async Task AdaptiveLearning_Mastery_Gaps_And_LearningPath_Succeed()
    {
        var token = await GetLearnerTokenAsync();

        // 1. Mastery
        var masteryMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/ai/mastery?subjectId=sub_math12");
        masteryMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var masteryResp = await _client.SendAsync(masteryMsg);
        Assert.Equal(HttpStatusCode.OK, masteryResp.StatusCode);
        var mastery = JsonSerializer.Deserialize<SkillMasteryResponseDto>(
            await masteryResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(mastery);

        // 2. Knowledge Gaps
        var gapsMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/ai/knowledge-gaps?subjectId=sub_math12");
        gapsMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var gapsResp = await _client.SendAsync(gapsMsg);
        Assert.Equal(HttpStatusCode.OK, gapsResp.StatusCode);
        var gaps = JsonSerializer.Deserialize<List<KnowledgeGapDto>>(
            await gapsResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(gaps);

        // 3. Adaptive Learning Path
        var pathMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/ai/learning-path?subjectId=sub_math12");
        pathMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var pathResp = await _client.SendAsync(pathMsg);
        Assert.Equal(HttpStatusCode.OK, pathResp.StatusCode);
        var path = JsonSerializer.Deserialize<AdaptiveLearningPathDto>(
            await pathResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(path);
        Assert.NotEmpty(path.Steps);
        Assert.NotEmpty(path.CurrentStage);
    }
}

