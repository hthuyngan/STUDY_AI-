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

    private async Task<string> GetContentStaffTokenAsync()
    {
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "content@studyai.internal",
            password = "Content@123456"
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
    public async Task Independent_Moderation_Workflow_Enforces_RBAC_And_Dual_Control()
    {
        var contentToken = await GetContentStaffTokenAsync();
        var adminToken = await GetAdminTokenAsync();
        var learnerToken = await GetLearnerTokenAsync();

        var contentAuthHeader = new AuthenticationHeaderValue("Bearer", contentToken);
        var adminAuthHeader = new AuthenticationHeaderValue("Bearer", adminToken);
        var learnerAuthHeader = new AuthenticationHeaderValue("Bearer", learnerToken);

        // 1. Content Staff creates Subject
        var uniqueCode = $"PHYS12_{Guid.NewGuid():N}"[..10].ToUpperInvariant();
        var createSubjectMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new
            {
                name = "Vật lý 12",
                code = uniqueCode,
                grade = "12",
                description = "Chương trình Vật lý lớp 12 mới",
                orderIndex = 2
            })
        };
        var createSubjectRes = await _client.SendAsync(createSubjectMsg);
        Assert.Equal(HttpStatusCode.Created, createSubjectRes.StatusCode);
        var subjectData = await createSubjectRes.Content.ReadFromJsonAsync<JsonElement>();
        var subjectId = subjectData.GetProperty("id").GetString()!;
        Assert.NotEmpty(subjectId);

        // 2. Duplicate Subject Code returns 409 Conflict
        var dupSubjectMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new
            {
                name = "Vật lý 12 trùng",
                code = uniqueCode,
                grade = "12",
                description = "Trùng mã"
            })
        };
        var dupSubjectRes = await _client.SendAsync(dupSubjectMsg);
        Assert.Equal(HttpStatusCode.Conflict, dupSubjectRes.StatusCode);

        // 3. Content Staff creates Chapter
        var createChapterMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new
            {
                subjectId = subjectId,
                title = "Chương 1: Dao động cơ",
                description = "Các dạng dao động điều hòa",
                orderIndex = 1
            })
        };
        var createChapterRes = await _client.SendAsync(createChapterMsg);
        Assert.Equal(HttpStatusCode.Created, createChapterRes.StatusCode);
        var chapterData = await createChapterRes.Content.ReadFromJsonAsync<JsonElement>();
        var chapterId = chapterData.GetProperty("id").GetString()!;
        Assert.NotEmpty(chapterId);

        // 4. Content Staff creates Lesson 1 (Status starts as 'draft')
        var createLessonMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = contentAuthHeader },
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
        var createLessonRes = await _client.SendAsync(createLessonMsg);
        Assert.Equal(HttpStatusCode.Created, createLessonRes.StatusCode);
        var lessonData = await createLessonRes.Content.ReadFromJsonAsync<JsonElement>();
        var lessonId = lessonData.GetProperty("id").GetString()!;
        Assert.Equal("draft", lessonData.GetProperty("status").GetString());

        // 5. Content Staff creates Question for Lesson 1
        var createQuestionMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/questions")
        {
            Headers = { Authorization = contentAuthHeader },
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
        var createQuestionRes = await _client.SendAsync(createQuestionMsg);
        Assert.Equal(HttpStatusCode.Created, createQuestionRes.StatusCode);

        // 6. Content Staff submits review: Status changes to 'in-review'
        var submitReviewMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/submit-review")
        {
            Headers = { Authorization = contentAuthHeader }
        };
        var submitReviewRes = await _client.SendAsync(submitReviewMsg);
        Assert.Equal(HttpStatusCode.OK, submitReviewRes.StatusCode);
        var submitData = await submitReviewRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("in-review", submitData.GetProperty("status").GetString());

        // 7. CONTENT WORKFLOW: Content specialist is the final approver and can self-approve valid content -> 200 OK
        var selfApproveMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/approve")
        {
            Headers = { Authorization = contentAuthHeader }
        };
        var selfApproveRes = await _client.SendAsync(selfApproveMsg);
        Assert.Equal(HttpStatusCode.OK, selfApproveRes.StatusCode);
        var selfApprovedData = await selfApproveRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("published", selfApprovedData.GetProperty("status").GetString());

        // 8. SECURITY GUARD: Learner cannot approve -> 403 Forbidden
        var learnerApproveMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/approve")
        {
            Headers = { Authorization = learnerAuthHeader }
        };
        var learnerApproveRes = await _client.SendAsync(learnerApproveMsg);
        Assert.Equal(HttpStatusCode.Forbidden, learnerApproveRes.StatusCode);

        // 9. Content can unpublish -> 200 OK & Status = 'draft', then Admin can publish -> 200 OK & Status = 'published'
        var unpublishMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/unpublish")
        {
            Headers = { Authorization = contentAuthHeader }
        };
        var unpublishRes = await _client.SendAsync(unpublishMsg);
        Assert.Equal(HttpStatusCode.OK, unpublishRes.StatusCode);
        var unpublishData = await unpublishRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", unpublishData.GetProperty("status").GetString());

        var adminApproveMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/publish")
        {
            Headers = { Authorization = adminAuthHeader }
        };
        var adminApproveRes = await _client.SendAsync(adminApproveMsg);
        Assert.Equal(HttpStatusCode.OK, adminApproveRes.StatusCode);
        var approvedData = await adminApproveRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("published", approvedData.GetProperty("status").GetString());
        Assert.NotEmpty(approvedData.GetProperty("reviewedBy").GetString() ?? string.Empty);

        // 10. Test Request-Changes flow with Lesson 2
        var createLesson2Msg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new
            {
                chapterId = chapterId,
                title = "Bài 2: Con lắc lò xo",
                slug = $"con-lac-lo-xo-{Guid.NewGuid():N}"[..25],
                orderIndex = 2,
                introduction = "Chu kỳ con lắc lò xo $T = 2\\pi \\sqrt{m/k}$"
            })
        };
        var createLesson2Res = await _client.SendAsync(createLesson2Msg);
        Assert.Equal(HttpStatusCode.Created, createLesson2Res.StatusCode);
        var lesson2Id = (await createLesson2Res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // Content Staff submits Lesson 2 for review
        var submit2Msg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesson2Id}/submit-review")
        {
            Headers = { Authorization = contentAuthHeader }
        };
        var submit2Res = await _client.SendAsync(submit2Msg);
        Assert.Equal(HttpStatusCode.OK, submit2Res.StatusCode);

        // Content Staff can reject / request changes in review queue -> 200 OK & Status = 'draft'
        var selfReqChangesMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesson2Id}/request-changes")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { feedback = "Cần chỉnh sửa lại phần mở đầu bài 2." })
        };
        var selfReqChangesRes = await _client.SendAsync(selfReqChangesMsg);
        Assert.Equal(HttpStatusCode.OK, selfReqChangesRes.StatusCode);
        var selfReqData = await selfReqChangesRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", selfReqData.GetProperty("status").GetString());

        // SECURITY GUARD: Learner cannot request changes -> 403 Forbidden
        var learnerReqChangesMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesson2Id}/request-changes")
        {
            Headers = { Authorization = learnerAuthHeader },
            Content = JsonContent.Create(new { feedback = "Hack attempt" })
        };
        var learnerReqChangesRes = await _client.SendAsync(learnerReqChangesMsg);
        Assert.Equal(HttpStatusCode.Forbidden, learnerReqChangesRes.StatusCode);

        // Admin can also request changes with feedback -> 200 OK & Status = 'draft'
        var adminReqChangesMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesson2Id}/reject")
        {
            Headers = { Authorization = adminAuthHeader },
            Content = JsonContent.Create(new { feedback = "Cần bổ sung thêm ví dụ và hình ảnh minh họa bài 2." })
        };
        var adminReqChangesRes = await _client.SendAsync(adminReqChangesMsg);
        Assert.Equal(HttpStatusCode.OK, adminReqChangesRes.StatusCode);
        var rejectedData = await adminReqChangesRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", rejectedData.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Learner_Cannot_Access_Draft_Lesson_And_Never_Receives_Answers_In_Advance()
    {
        var contentToken = await GetContentStaffTokenAsync();
        var adminToken = await GetAdminTokenAsync();
        var contentAuthHeader = new AuthenticationHeaderValue("Bearer", contentToken);
        var adminAuthHeader = new AuthenticationHeaderValue("Bearer", adminToken);

        // 1. Content Staff creates subject, chapter, and draft lesson
        var uniqueCode = $"DRF_{Guid.NewGuid():N}"[..18].ToUpperInvariant();
        var subRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { name = "Môn Nháp", code = uniqueCode, grade = "12", description = "Test", orderIndex = 99 })
        });
        subRes.EnsureSuccessStatusCode();
        var subId = (await subRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var chpRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { subjectId = subId, title = "Chương Nháp", orderIndex = 1 })
        });
        chpRes.EnsureSuccessStatusCode();
        var chpId = (await chpRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var lesRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = contentAuthHeader },
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

        // 4. Content Staff submits for review, Admin approves lesson and Content Staff adds a question
        var submitRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesId}/submit-review")
        {
            Headers = { Authorization = contentAuthHeader }
        });
        submitRes.EnsureSuccessStatusCode();

        var approveRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesId}/approve")
        {
            Headers = { Authorization = adminAuthHeader }
        });
        approveRes.EnsureSuccessStatusCode();

        var qRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/questions")
        {
            Headers = { Authorization = contentAuthHeader },
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

    [Fact]
    public async Task Anti_Scraping_Protection_Blocks_Excessive_Failed_Attempts_With_429()
    {
        var contentToken = await GetContentStaffTokenAsync();
        var adminToken = await GetAdminTokenAsync();
        var contentAuthHeader = new AuthenticationHeaderValue("Bearer", contentToken);
        var adminAuthHeader = new AuthenticationHeaderValue("Bearer", adminToken);

        // 1. Create published lesson and question
        var subRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { name = "Bảo Mật Test", code = $"SEC_{Guid.NewGuid():N}"[..9].ToUpperInvariant(), grade = "12", description = "Test", orderIndex = 99 })
        });
        subRes.EnsureSuccessStatusCode();
        var subId = (await subRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var chpRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { subjectId = subId, title = "Chương Bảo Mật", orderIndex = 1 })
        });
        chpRes.EnsureSuccessStatusCode();
        var chpId = (await chpRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var lesRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { chapterId = chpId, title = "Bài Bảo Mật", slug = $"sec-les-{Guid.NewGuid():N}"[..25], orderIndex = 1 })
        });
        lesRes.EnsureSuccessStatusCode();
        var lesId = (await lesRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var submitRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesId}/submit-review")
        {
            Headers = { Authorization = contentAuthHeader }
        });
        submitRes.EnsureSuccessStatusCode();

        var approveRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesId}/approve")
        {
            Headers = { Authorization = adminAuthHeader }
        });
        approveRes.EnsureSuccessStatusCode();

        var qRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/questions")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new
            {
                lessonId = lesId,
                prompt = "Thủ đô của Việt Nam là gì?",
                options = new[] { "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Cần Thơ" },
                correctAnswer = "Hà Nội",
                explanation = "Hà Nội là thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.",
                difficulty = "easy",
                type = "multiple-choice",
                status = "published"
            })
        });
        qRes.EnsureSuccessStatusCode();
        var qId = (await qRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // 2. Client submits wrong answers 3 times
        for (int i = 1; i <= 3; i++)
        {
            var res = await _client.PostAsJsonAsync($"/api/v1/curriculum/lessons/{lesId}/questions/{qId}/check", new
            {
                selectedOption = "Sai_" + i
            });
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var result = await res.Content.ReadFromJsonAsync<CheckAnswerResponseDto>();
            Assert.NotNull(result);
            Assert.False(result.IsCorrect);
        }

        // 3. 4th consecutive attempt MUST be blocked by anti-scraping / rate-limit with HTTP 429 Too Many Requests
        var blockedRes = await _client.PostAsJsonAsync($"/api/v1/curriculum/lessons/{lesId}/questions/{qId}/check", new
        {
            selectedOption = "Sai_4"
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, blockedRes.StatusCode);
    }
}
