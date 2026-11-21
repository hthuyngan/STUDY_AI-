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

    private async Task<string> RegisterOtherLearnerTokenAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var regDto = new UserRegisterRequestDto
        {
            Email = $"adapt.learner.{suffix}@studyai.internal",
            Password = "Learner@123456",
            DisplayName = $"Adapt Learner {suffix}",
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
    public async Task TwoUserIsolation_LearnerBHasIndependentZeroData()
    {
        // 1. Learner A registers and completes a practice session with mistakes
        var learnerAToken = await RegisterOtherLearnerTokenAsync();
        var createReq = new CreatePracticeSessionRequest
        {
            SubjectId = "sub_math12",
            QuestionCount = 2,
            Mode = "practice"
        };
        var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(createReq), Encoding.UTF8, "application/json")
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerAToken);
        var createResp = await _client.SendAsync(createMsg);
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var sessionA = JsonSerializer.Deserialize<PracticeSessionResponseDto>(
            await createResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(sessionA);

        // Learner A submits wrong answers to record attempts and mistakes
        var wrongAnswers = new Dictionary<string, string>();
        foreach (var q in sessionA.Questions)
        {
            wrongAnswers[q.Id] = "WRONG_ANSWER_CHOICE_FOR_TEST";
        }
        var submitReq = new SubmitPracticeSessionRequest
        {
            Answers = wrongAnswers,
            SessionTimeMs = 12000
        };
        var submitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/practice/sessions/{sessionA.SessionId}/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(submitReq), Encoding.UTF8, "application/json")
        };
        submitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerAToken);
        var submitResp = await _client.SendAsync(submitMsg);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        // Verify Learner A has 1 session and questions practiced
        var statsMsgA = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/dashboard-stats");
        statsMsgA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerAToken);
        var statsRespA = await _client.SendAsync(statsMsgA);
        Assert.Equal(HttpStatusCode.OK, statsRespA.StatusCode);
        var statsA = JsonSerializer.Deserialize<LearnerDashboardStatsDto>(
            await statsRespA.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(statsA);
        Assert.Equal(1, statsA.TotalSessions);
        Assert.Equal(2, statsA.TotalQuestionsPracticed);
        Assert.True(statsA.TotalMistakes > 0);
        Assert.Single(statsA.RecentAttempts);

        // 2. Learner B registers fresh
        var learnerBToken = await RegisterOtherLearnerTokenAsync();

        // Learner B: 0 attempts -> 0 gaps
        var gapsMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/ai/knowledge-gaps?subjectId=sub_math10");
        gapsMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerBToken);
        var gapsResp = await _client.SendAsync(gapsMsg);
        Assert.Equal(HttpStatusCode.OK, gapsResp.StatusCode);
        var gaps = JsonSerializer.Deserialize<List<KnowledgeGapDto>>(
            await gapsResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(gaps);
        Assert.Empty(gaps);

        // Learner B: 0 attempts -> 0 mastery
        var masteryMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/ai/mastery?subjectId=sub_math10");
        masteryMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerBToken);
        var masteryResp = await _client.SendAsync(masteryMsg);
        Assert.Equal(HttpStatusCode.OK, masteryResp.StatusCode);
        var mastery = JsonSerializer.Deserialize<SkillMasteryResponseDto>(
            await masteryResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(mastery);
        Assert.Equal(0, mastery.SkillsEvaluated);
        Assert.Equal(0, mastery.SkillsMastered);
        Assert.Equal(0.0, mastery.OverallMasteryScore);

        // Learner B: dashboard-stats has 0 total practiced and 0 streak
        var statsMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/dashboard-stats");
        statsMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerBToken);
        var statsResp = await _client.SendAsync(statsMsg);
        Assert.Equal(HttpStatusCode.OK, statsResp.StatusCode);
        var stats = JsonSerializer.Deserialize<LearnerDashboardStatsDto>(
            await statsResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(stats);
        Assert.Equal(0, stats.TotalSessions);
        Assert.Equal(0, stats.CompletedLessons);
        Assert.Equal(0, stats.TotalQuestionsPracticed);
        Assert.Equal(0, stats.StreakDays);
        Assert.Equal(0, stats.TotalMistakes);
        Assert.Empty(stats.RecentAttempts);

        // 3. Re-verify Learner A: state is intact and isolated
        var recheckMsgA = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/dashboard-stats");
        recheckMsgA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerAToken);
        var recheckRespA = await _client.SendAsync(recheckMsgA);
        Assert.Equal(HttpStatusCode.OK, recheckRespA.StatusCode);
        var recheckStatsA = JsonSerializer.Deserialize<LearnerDashboardStatsDto>(
            await recheckRespA.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(recheckStatsA);
        Assert.Equal(1, recheckStatsA.TotalSessions);
        Assert.Equal(2, recheckStatsA.TotalQuestionsPracticed);

        // 4. Re-verify Learner B: still 0 sessions
        var recheckMsgB = new HttpRequestMessage(HttpMethod.Get, "/api/v1/practice/dashboard-stats");
        recheckMsgB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerBToken);
        var recheckRespB = await _client.SendAsync(recheckMsgB);
        Assert.Equal(HttpStatusCode.OK, recheckRespB.StatusCode);
        var recheckStatsB = JsonSerializer.Deserialize<LearnerDashboardStatsDto>(
            await recheckRespB.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(recheckStatsB);
        Assert.Equal(0, recheckStatsB.TotalSessions);
    }

    [Fact]
    public async Task AdaptiveLearning_UpdateLearningPlan_PersistsAndReturnsUpdatedPath()
    {
        var token = await RegisterOtherLearnerTokenAsync();

        var updateReq = new UpdateLearningPlanRequestDto
        {
            TargetScore = 9.2,
            TargetExamDate = "2027-06-28",
            TargetDailyMinutes = 60,
            CustomGoals = new List<string> { "Chinh phục hình học không gian Oxyz" }
        };

        var putMsg = new HttpRequestMessage(HttpMethod.Put, "/api/v1/ai/learning-path/plan?subjectId=sub_math12")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateReq), Encoding.UTF8, "application/json")
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var putResp = await _client.SendAsync(putMsg);
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        var path = JsonSerializer.Deserialize<AdaptiveLearningPathDto>(
            await putResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(path);
        Assert.Equal(9.2, path.TargetScore);
        Assert.Equal("2027-06-28", path.TargetExamDate);
        Assert.Equal(60, path.TargetDailyMinutes);
        Assert.True(path.Version >= 1);
        Assert.Contains(path.ShortTermGoals, g => g.Contains("Chinh phục hình học không gian Oxyz"));

        // GET confirms persistence
        var getMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/ai/learning-path?subjectId=sub_math12");
        getMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getResp = await _client.SendAsync(getMsg);
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var persisted = JsonSerializer.Deserialize<AdaptiveLearningPathDto>(
            await getResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(persisted);
        Assert.Equal(9.2, persisted.TargetScore);
        Assert.Equal("2027-06-28", persisted.TargetExamDate);
        Assert.Equal(60, persisted.TargetDailyMinutes);

        // Validation: TargetScore > 10.0 -> BadRequest
        var invalidReq = new UpdateLearningPlanRequestDto { TargetScore = 12.0 };
        var badMsg = new HttpRequestMessage(HttpMethod.Put, "/api/v1/ai/learning-path/plan")
        {
            Content = new StringContent(JsonSerializer.Serialize(invalidReq), Encoding.UTF8, "application/json")
        };
        badMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var badResp = await _client.SendAsync(badMsg);
        Assert.Equal(HttpStatusCode.BadRequest, badResp.StatusCode);
    }

    [Fact]
    public async Task Me_Preferences_GetAndUpdate_Succeeds()
    {
        var token = await RegisterOtherLearnerTokenAsync();

        // 1. Default GET
        var getMsg1 = new HttpRequestMessage(HttpMethod.Get, "/api/v1/me/preferences");
        getMsg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getResp1 = await _client.SendAsync(getMsg1);
        Assert.Equal(HttpStatusCode.OK, getResp1.StatusCode);

        // 2. PUT update
        var updateDto = new
        {
            Theme = "dark",
            DailyGoalMinutes = 60,
            StudyReminder = false,
            StreakAlert = true,
            CourseAlert = true,
            AiResponseStyle = "concise",
            StudyGoal = "Chinh phục điểm 9 môn Toán",
            TargetScore = 9.0
        };
        var putMsg = new HttpRequestMessage(HttpMethod.Put, "/api/v1/me/preferences")
        {
            Content = new StringContent(JsonSerializer.Serialize(updateDto), Encoding.UTF8, "application/json")
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var putResp = await _client.SendAsync(putMsg);
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        // 3. GET verify
        var getMsg2 = new HttpRequestMessage(HttpMethod.Get, "/api/v1/me/preferences");
        getMsg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getResp2 = await _client.SendAsync(getMsg2);
        Assert.Equal(HttpStatusCode.OK, getResp2.StatusCode);
        using var doc = JsonDocument.Parse(await getResp2.Content.ReadAsStringAsync());
        Assert.Equal("dark", doc.RootElement.GetProperty("theme").GetString());
        Assert.Equal(60, doc.RootElement.GetProperty("dailyGoalMinutes").GetInt32());
        Assert.Equal("Chinh phục điểm 9 môn Toán", doc.RootElement.GetProperty("studyGoal").GetString());

        // 4. Validation: DailyGoalMinutes < 5 -> BadRequest
        var invalidDto = new { DailyGoalMinutes = 2 };
        var badMsg = new HttpRequestMessage(HttpMethod.Put, "/api/v1/me/preferences")
        {
            Content = new StringContent(JsonSerializer.Serialize(invalidDto), Encoding.UTF8, "application/json")
        };
        badMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var badResp = await _client.SendAsync(badMsg);
        Assert.Equal(HttpStatusCode.BadRequest, badResp.StatusCode);
    }

    [Fact]
    public async Task AdaptiveLearning_Unauthenticated_ReturnsUnauthorized401()
    {
        var gapsResp = await _client.GetAsync("/api/v1/ai/knowledge-gaps");
        Assert.Equal(HttpStatusCode.Unauthorized, gapsResp.StatusCode);

        var masteryResp = await _client.GetAsync("/api/v1/ai/mastery");
        Assert.Equal(HttpStatusCode.Unauthorized, masteryResp.StatusCode);

        var pathResp = await _client.GetAsync("/api/v1/ai/learning-path");
        Assert.Equal(HttpStatusCode.Unauthorized, pathResp.StatusCode);

        var hintReq = new HintRequestDto { QuestionId = "qst_any", HintLevel = 1 };
        var hintResp = await _client.PostAsync("/api/v1/ai/hints",
            new StringContent(JsonSerializer.Serialize(hintReq), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Unauthorized, hintResp.StatusCode);
    }

    [Fact]
    public async Task HintLadder_DuringActiveExam_Returns403Forbidden()
    {
        var token = await GetLearnerTokenAsync();

        // 1. Create an exam session
        var examReq = new CreatePracticeSessionRequest
        {
            SubjectId = "sub_math12",
            Mode = "exam",
            QuestionCount = 2
        };
        var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions")
        {
            Content = new StringContent(JsonSerializer.Serialize(examReq), Encoding.UTF8, "application/json")
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createResp = await _client.SendAsync(createMsg);
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var examSession = JsonSerializer.Deserialize<PracticeSessionResponseDto>(
            await createResp.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(examSession);

        var qId = examSession.Questions[0].Id;

        // 2. Request hint with mode=exam parameter -> 403 Forbidden
        var hintReq = new HintRequestDto { QuestionId = qId, HintLevel = 1 };
        var hintMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/ai/hints?sessionId={examSession.SessionId}&mode=exam")
        {
            Content = new StringContent(JsonSerializer.Serialize(hintReq), Encoding.UTF8, "application/json")
        };
        hintMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var hintResp = await _client.SendAsync(hintMsg);
        Assert.Equal(HttpStatusCode.Forbidden, hintResp.StatusCode);
    }
}

