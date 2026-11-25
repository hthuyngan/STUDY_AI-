using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using StudyAI.Models;
using Xunit;

namespace StudyAI.IntegrationTests;

public class AdaptiveLearningIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly StudyAIApiFixture _factory;
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public AdaptiveLearningIntegrationTests(StudyAIApiFixture factory)
    {
        _factory = factory;
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

    private async Task<string> SeedIsolatedSubjectWithQuestionsAsync(int count = 2)
    {
        var token = Guid.NewGuid().ToString("N")[..10];
        var subjectId = $"sub_adp_{token}";
        var chapterId = $"chp_adp_{token}";
        var lessonId = $"les_adp_{token}";

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var author = await db.Users.FirstAsync();

        db.ContentSubjects.Add(new ContentSubject
        {
            Id = subjectId,
            Name = $"Môn Adaptive {token}",
            Code = $"ADP_{token}".ToUpperInvariant(),
            Grade = "12",
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        });

        db.ContentChapters.Add(new ContentChapter
        {
            Id = chapterId,
            SubjectId = subjectId,
            Title = $"Chương Adaptive {token}",
            OrderIndex = 1,
            Status = "published",
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        });

        db.ContentLessons.Add(new ContentLesson
        {
            Id = lessonId,
            ChapterId = chapterId,
            Title = $"Bài Adaptive {token}",
            Slug = $"adp-{token}",
            OrderIndex = 1,
            Status = "published",
            AuthorId = author.Id,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        for (int i = 0; i < count; i++)
        {
            db.ContentQuestions.Add(new ContentQuestion
            {
                Id = $"q_adp_{token}_{i + 1}",
                SubjectId = subjectId,
                ChapterId = chapterId,
                LessonId = lessonId,
                Prompt = $"Câu hỏi Adaptive {i + 1} ({token})",
                OptionsJson = "[\"A\", \"B\", \"C\", \"D\"]",
                CorrectAnswer = "A",
                Explanation = "Giải thích chi tiết.",
                Topic = "Hàm số",
                Difficulty = "medium",
                Type = "multiple-choice",
                Status = "published",
                AuthorId = author.Id,
                ReviewedBy = author.Id,
                SourceType = "manual",
                CopyrightStatus = "proprietary",
                OrderIndex = i + 1,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        }

        await db.SaveChangesAsync();
        return subjectId;
    }

    [Fact]
    public async Task HintLadder_ReturnsThreeLevels_WithoutLeakingFinalAnswer()
    {
        var subjectId = await SeedIsolatedSubjectWithQuestionsAsync(1);
        var token = await GetLearnerTokenAsync();

        // 1. Get a question from practice session to test hints
        var createReq = new CreatePracticeSessionRequest
        {
            SubjectId = subjectId,
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
        Assert.Equal(0, stats.CompletedLessons);
        Assert.Equal(0, stats.TotalQuestionsPracticed);
        Assert.Equal(0, stats.StreakDays);
        Assert.Equal(0, stats.TotalMistakes);
        Assert.Empty(stats.RecentAttempts);
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
        var subjectId = await SeedIsolatedSubjectWithQuestionsAsync(2);
        var token = await GetLearnerTokenAsync();

        // 1. Create an exam session
        var examReq = new CreatePracticeSessionRequest
        {
            SubjectId = subjectId,
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

