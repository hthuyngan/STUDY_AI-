using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace StudyAI.IntegrationTests;

public class LearnerDataIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;

    public LearnerDataIntegrationTests(StudyAIApiFixture factory)
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
        var result = JsonSerializer.Deserialize<AuthResponseDto>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        return result!.AccessToken;
    }

    [Fact]
    public async Task PutAndGetLessonProgress_Succeeds()
    {
        var token = await GetLearnerTokenAsync();
        var lessonId = "les_math12_c1_b1";

        var putDto = new LessonProgressCreateOrUpdateDto
        {
            SubjectId = "sub_math12",
            ContentProgress = 75,
            OverallProgress = 60,
            AssessmentStatus = "in-progress",
            CompletedSectionIds = new List<string> { "sec_1", "sec_2" }
        };

        var req = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/me/lesson-progress/{lessonId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(putDto), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var putResp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        // Get single progress
        var getReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/me/lesson-progress/{lessonId}");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getResp = await _client.SendAsync(getReq);
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);

        var body = await getResp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<LessonProgressResponseDto>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(result);
        Assert.Equal(75, result.ContentProgress);
        Assert.Equal(2, result.CompletedSectionIds.Count);
    }

    [Fact]
    public async Task PostAssessmentAttempt_Succeeds()
    {
        var token = await GetLearnerTokenAsync();
        var attemptId = $"att_test_{Guid.NewGuid():N}";
        var qId = $"q_{Guid.NewGuid():N}";
        var subjId = $"subj_{Guid.NewGuid():N}";
        var chapId = $"chap_{Guid.NewGuid():N}";
        var lesId = $"les_{Guid.NewGuid():N}";
        var asmId = $"asm_{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAI.Data.StudyAIDbContext>();
            var anyUserId = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstAsync(
                db.Users.Select(u => u.Id));
            db.ContentSubjects.Add(new StudyAI.Models.ContentSubject { Id = subjId, Code = $"M12-{subjId[..6]}", Name = "Toán 12", Grade = "12" });
            db.ContentChapters.Add(new StudyAI.Models.ContentChapter { Id = chapId, SubjectId = subjId, Title = "Chương 1", OrderIndex = 1 });
            db.ContentLessons.Add(new StudyAI.Models.ContentLesson { Id = lesId, ChapterId = chapId, AuthorId = anyUserId, Title = "Bài 1", Status = "published" });
            db.ContentAssessments.Add(new StudyAI.Models.ContentAssessment { Id = asmId, LessonId = lesId, Title = "Đề 1", PassScore = 80, Status = "published" });
            db.ContentQuestions.Add(new StudyAI.Models.ContentQuestion
            {
                Id = qId,
                AssessmentId = asmId,
                LessonId = lesId,
                SubjectId = subjId,
                ChapterId = chapId,
                Prompt = "Câu hỏi kiểm tra server grading",
                OptionsJson = "[\"opt_a\", \"opt_b\"]",
                CorrectAnswer = "opt_a",
                Status = "published"
            });
            await db.SaveChangesAsync();
        }

        var createDto = new AssessmentAttemptCreateDto
        {
            Id = attemptId,
            AssessmentId = asmId,
            LessonId = lesId,
            SubjectId = subjId,
            AttemptNumber = 1,
            StartedAt = DateTimeOffset.UtcNow,
            LastActivityAt = DateTimeOffset.UtcNow,
            CompletionStatus = "completed",
            SuccessStatus = "passed",
            ProgressMeasure = 1.0,
            ScoreRaw = 9.0,
            ScoreMin = 0.0,
            ScoreMax = 10.0,
            ScoreScaled = 0.9,
            Responses = new Dictionary<string, AssessmentResponseItemDto>
            {
                [qId] = new()
                {
                    QuestionId = qId,
                    SelectedOptionIds = new List<string> { "opt_a" },
                    IsCorrect = true,
                    TimeSpentMs = 15000,
                    ChangeCount = 1
                }
            }
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/me/assessment-attempts")
        {
            Content = new StringContent(JsonSerializer.Serialize(createDto), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AssessmentAttemptResponseDto>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(result);
        Assert.Equal("passed", result.SuccessStatus);
        Assert.True(result.Responses.ContainsKey(qId));
        Assert.True(result.Responses[qId].IsCorrect);
    }
}
