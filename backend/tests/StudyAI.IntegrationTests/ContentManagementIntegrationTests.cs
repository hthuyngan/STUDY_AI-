using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using StudyAI.Application.DTOs;
using Xunit;

namespace StudyAI.IntegrationTests;

public class ContentManagementIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;

    public ContentManagementIntegrationTests(StudyAIApiFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    private async Task<string> GetAdminTokenAsync()
    {
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "admin@studyai.internal",
            password = "Admin@123456"
        });

        loginResponse.EnsureSuccessStatusCode();
        var json = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("accessToken").GetString()!;
    }

    private async Task<string> GetLearnerTokenAsync()
    {
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "learner@studyai.internal",
            password = "Learner@123456"
        });

        loginResponse.EnsureSuccessStatusCode();
        var json = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("accessToken").GetString()!;
    }

    [Fact]
    public async Task Admin_Can_Create_Subject_Chapter_Lesson_Question_And_Moderate()
    {
        var adminToken = await GetAdminTokenAsync();
        using var adminReq = new HttpRequestMessage();
        var client = _client;

        var authHeader = new AuthenticationHeaderValue("Bearer", adminToken);

        // 1. Create Subject
        var uniqueCode = $"PHYS12_{Guid.NewGuid():N}"[..10].ToUpperInvariant();
        var createSubjectMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = authHeader },
            Content = JsonContent.Create(new
            {
                name = "Vật lý 12",
                code = uniqueCode,
                grade = "12",
                description = "Chương trình Vật lý lớp 12 mới",
                orderIndex = 2
            })
        };
        var createSubjectRes = await client.SendAsync(createSubjectMsg);
        Assert.Equal(HttpStatusCode.Created, createSubjectRes.StatusCode);
        var subjectData = await createSubjectRes.Content.ReadFromJsonAsync<JsonElement>();
        var subjectId = subjectData.GetProperty("id").GetString()!;
        Assert.NotEmpty(subjectId);

        // 2. Duplicate Subject Code returns 409 Conflict
        var dupSubjectMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = authHeader },
            Content = JsonContent.Create(new
            {
                name = "Vật lý 12 trùng",
                code = uniqueCode,
                grade = "12",
                description = "Trùng mã"
            })
        };
        var dupSubjectRes = await client.SendAsync(dupSubjectMsg);
        Assert.Equal(HttpStatusCode.Conflict, dupSubjectRes.StatusCode);

        // 3. Create Chapter
        var createChapterMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = authHeader },
            Content = JsonContent.Create(new
            {
                subjectId = subjectId,
                title = "Chương 1: Dao động cơ",
                description = "Các dạng dao động điều hòa",
                orderIndex = 1
            })
        };
        var createChapterRes = await client.SendAsync(createChapterMsg);
        Assert.Equal(HttpStatusCode.Created, createChapterRes.StatusCode);
        var chapterData = await createChapterRes.Content.ReadFromJsonAsync<JsonElement>();
        var chapterId = chapterData.GetProperty("id").GetString()!;
        Assert.NotEmpty(chapterId);

        // 4. Create Lesson (Starts as Draft)
        var createLessonMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = authHeader },
            Content = JsonContent.Create(new
            {
                chapterId = chapterId,
                title = "Bài 1: Dao động điều hòa",
                slug = $"dao-dong-dieu-hoa-{Guid.NewGuid():N}"[..25],
                orderIndex = 1,
                introduction = "Phương trình dao động điều hòa $x = A \\cos(\\omega t + \\varphi)$",
                definitions = new[] { "Dao động điều hòa là dao động có li độ hàm cos theo thời gian" },
                formulas = new[] { "x = A \\cos(\\omega t + \\varphi)", "v = x' = -\\omega A \\sin(\\omega t + \\varphi)" },
                examples = new[] { "Một vật dao động với $A = 5\\text{ cm}, \\omega = 2\\pi$" },
                importantNotes = new[] { "Vận tốc sớm pha $\\pi/2$ so với li độ" },
                summaryPoints = new[] { "Nắm vững 3 phương trình li độ, vận tốc, gia tốc" }
            })
        };
        var createLessonRes = await client.SendAsync(createLessonMsg);
        Assert.Equal(HttpStatusCode.Created, createLessonRes.StatusCode);
        var lessonData = await createLessonRes.Content.ReadFromJsonAsync<JsonElement>();
        var lessonId = lessonData.GetProperty("id").GetString()!;
        Assert.Equal("draft", lessonData.GetProperty("status").GetString());

        // 5. Create Question Bank Item for Lesson
        var createQuestionMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/questions")
        {
            Headers = { Authorization = authHeader },
            Content = JsonContent.Create(new
            {
                lessonId = lessonId,
                prompt = "Một vật dao động điều hòa có phương trình $x = 5 \\cos(2\\pi t)$. Biên độ dao động là:",
                options = new[] { "5 cm", "10 cm", "2 cm", "2.5 cm" },
                correctAnswer = "5 cm",
                explanation = "Từ phương trình $x = A \\cos(\\omega t + \\varphi)$, ta có $A = 5\\text{ cm}$.",
                topic = "Dao động điều hòa",
                difficulty = "easy",
                type = "multiple-choice",
                status = "published",
                orderIndex = 1
            })
        };
        var createQuestionRes = await client.SendAsync(createQuestionMsg);
        Assert.Equal(HttpStatusCode.Created, createQuestionRes.StatusCode);
        var questionData = await createQuestionRes.Content.ReadFromJsonAsync<JsonElement>();
        var questionId = questionData.GetProperty("id").GetString()!;
        Assert.NotEmpty(questionId);

        // 6. Moderation: Draft -> In-Review -> Published
        // Step A: Submit review
        var submitReviewMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/submit-review")
        {
            Headers = { Authorization = authHeader }
        };
        var submitReviewRes = await client.SendAsync(submitReviewMsg);
        Assert.Equal(HttpStatusCode.OK, submitReviewRes.StatusCode);
        var submitData = await submitReviewRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("in-review", submitData.GetProperty("status").GetString());

        // Step B: Approve
        var approveMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/approve")
        {
            Headers = { Authorization = authHeader }
        };
        var approveRes = await client.SendAsync(approveMsg);
        Assert.Equal(HttpStatusCode.OK, approveRes.StatusCode);
        var approvedData = await approveRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("published", approvedData.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Learner_Cannot_Access_Draft_Lesson_And_Never_Receives_Answers_In_Advance()
    {
        var adminToken = await GetAdminTokenAsync();
        var authHeader = new AuthenticationHeaderValue("Bearer", adminToken);

        // 1. Admin creates a subject, chapter, and draft lesson
        var uniqueCode = $"TEST_DRF_{Guid.NewGuid():N}"[..10].ToUpperInvariant();
        var subRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = authHeader },
            Content = JsonContent.Create(new { name = "Môn Nháp", code = uniqueCode, grade = "12", description = "Test", orderIndex = 99 })
        });
        subRes.EnsureSuccessStatusCode();
        var subId = (await subRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var chpRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = authHeader },
            Content = JsonContent.Create(new { subjectId = subId, title = "Chương Nháp", orderIndex = 1 })
        });
        chpRes.EnsureSuccessStatusCode();
        var chpId = (await chpRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var lesRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = authHeader },
            Content = JsonContent.Create(new
            {
                chapterId = chpId,
                title = "Bài Học Chưa Duyệt",
                slug = $"bai-nhap-{Guid.NewGuid():N}"[..25],
                orderIndex = 1,
                introduction = "Nội dung bí mật"
            })
        });
        lesRes.EnsureSuccessStatusCode();
        var lesId = (await lesRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // 2. Learner tries to GET draft lesson -> MUST return 404
        var draftGetRes = await _client.GetAsync($"/api/v1/curriculum/lessons/{lesId}");
        Assert.Equal(HttpStatusCode.NotFound, draftGetRes.StatusCode);

        // 3. Learner tries to GET questions for draft lesson -> MUST return 404
        var draftQRes = await _client.GetAsync($"/api/v1/curriculum/lessons/{lesId}/questions");
        Assert.Equal(HttpStatusCode.NotFound, draftQRes.StatusCode);

        // 4. Admin submits for review, approves the lesson and adds a question
        var submitRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesId}/submit-review")
        {
            Headers = { Authorization = authHeader }
        });
        submitRes.EnsureSuccessStatusCode();

        var approveRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesId}/approve")
        {
            Headers = { Authorization = authHeader }
        });
        approveRes.EnsureSuccessStatusCode();

        var qRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/questions")
        {
            Headers = { Authorization = authHeader },
            Content = JsonContent.Create(new
            {
                lessonId = lesId,
                prompt = "Hỏi: 1 + 1 bằng mấy?",
                options = new[] { "1", "2", "3", "4" },
                correctAnswer = "2",
                explanation = "Theo số học căn bản: 1 + 1 = 2.",
                difficulty = "easy",
                type = "multiple-choice",
                status = "published"
            })
        });
        qRes.EnsureSuccessStatusCode();
        var qId = (await qRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // 5. Learner can now GET the lesson
        var publishedLesRes = await _client.GetAsync($"/api/v1/curriculum/lessons/{lesId}");
        Assert.Equal(HttpStatusCode.OK, publishedLesRes.StatusCode);

        // 6. STRICT ZERO-LEAK SECURITY CHECK:
        // Learner GET questions -> MUST NOT contain correctAnswer or explanation
        var pubQRes = await _client.GetAsync($"/api/v1/curriculum/lessons/{lesId}/questions");
        Assert.Equal(HttpStatusCode.OK, pubQRes.StatusCode);
        var qJsonRaw = await pubQRes.Content.ReadAsStringAsync();

        // Raw text must NOT reveal "Theo số học căn bản" or "correctAnswer"
        Assert.DoesNotContain("Theo số học căn bản", qJsonRaw);
        Assert.DoesNotContain("\"correctAnswer\"", qJsonRaw, StringComparison.OrdinalIgnoreCase);

        // 7. Learner submits an INCORRECT answer
        var checkWrongRes = await _client.PostAsJsonAsync($"/api/v1/curriculum/lessons/{lesId}/questions/{qId}/check", new
        {
            selectedOption = "3"
        });
        Assert.Equal(HttpStatusCode.OK, checkWrongRes.StatusCode);
        var wrongResult = await checkWrongRes.Content.ReadFromJsonAsync<CheckAnswerResponseDto>();
        Assert.NotNull(wrongResult);
        Assert.False(wrongResult.IsCorrect);
        Assert.Equal(0, wrongResult.ScoreEarned);
        Assert.Equal("2", wrongResult.CorrectAnswer);
        Assert.Contains("Theo số học căn bản", wrongResult.Explanation);

        // 8. Learner submits the CORRECT answer
        var checkCorrectRes = await _client.PostAsJsonAsync($"/api/v1/curriculum/lessons/{lesId}/questions/{qId}/check", new
        {
            selectedOption = "2"
        });
        Assert.Equal(HttpStatusCode.OK, checkCorrectRes.StatusCode);
        var correctResult = await checkCorrectRes.Content.ReadFromJsonAsync<CheckAnswerResponseDto>();
        Assert.NotNull(correctResult);
        Assert.True(correctResult.IsCorrect);
        Assert.True(correctResult.ScoreEarned > 0);
        Assert.Contains("Chính xác", correctResult.Feedback);
    }
}
