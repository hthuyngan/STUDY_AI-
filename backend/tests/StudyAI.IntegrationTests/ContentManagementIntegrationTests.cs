using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;

using Xunit;

namespace StudyAI.IntegrationTests;

public class ContentManagementIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;

    public ContentManagementIntegrationTests(StudyAIApiFixture fixture)
    {
        _factory = fixture;
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

    private async Task<string> GetReviewerStaffTokenAsync()
    {
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "content2@studyai.internal",
            password = "Content2@123456"
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
        var reviewerToken = await GetReviewerStaffTokenAsync();
        var adminToken = await GetAdminTokenAsync();
        var learnerToken = await GetLearnerTokenAsync();

        var contentAuthHeader = new AuthenticationHeaderValue("Bearer", contentToken);
        var reviewerAuthHeader = new AuthenticationHeaderValue("Bearer", reviewerToken);
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

        // 7. FOUR-EYES GUARD: Author cannot self-approve -> 403 Forbidden
        var selfApproveMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/approve")
        {
            Headers = { Authorization = contentAuthHeader }
        };
        var selfApproveRes = await _client.SendAsync(selfApproveMsg);
        Assert.Equal(HttpStatusCode.Forbidden, selfApproveRes.StatusCode);

        // Independent Content Reviewer approves valid content -> 200 OK
        var reviewerApproveMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/approve")
        {
            Headers = { Authorization = reviewerAuthHeader }
        };
        var reviewerApproveRes = await _client.SendAsync(reviewerApproveMsg);
        Assert.Equal(HttpStatusCode.OK, reviewerApproveRes.StatusCode);
        var selfApprovedData = await reviewerApproveRes.Content.ReadFromJsonAsync<JsonElement>();
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

        // Verify author CANNOT request changes or reject on their own content (Four-Eyes)
        var selfReqChangesMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesson2Id}/request-changes")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { feedback = "Cần chỉnh sửa lại phần mở đầu bài 2." })
        };
        var selfReqChangesRes = await _client.SendAsync(selfReqChangesMsg);
        Assert.Equal(HttpStatusCode.Forbidden, selfReqChangesRes.StatusCode);

        // Independent Reviewer can reject / request changes in review queue -> 200 OK & Status = 'draft'
        var reviewerReqChangesMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesson2Id}/request-changes")
        {
            Headers = { Authorization = reviewerAuthHeader },
            Content = JsonContent.Create(new { feedback = "Cần chỉnh sửa lại phần mở đầu bài 2." })
        };
        var reviewerReqChangesRes = await _client.SendAsync(reviewerReqChangesMsg);
        Assert.Equal(HttpStatusCode.OK, reviewerReqChangesRes.StatusCode);
        var reviewerReqData = await reviewerReqChangesRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", reviewerReqData.GetProperty("status").GetString());

        // Resubmit for review
        var resubmit2Msg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesson2Id}/submit-review")
        {
            Headers = { Authorization = contentAuthHeader }
        };
        var resubmit2Res = await _client.SendAsync(resubmit2Msg);
        Assert.Equal(HttpStatusCode.OK, resubmit2Res.StatusCode);

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

        // WORKSTREAM 4: State Machine - Request changes on a lesson in 'draft' status MUST RETURN 400 Bad Request
        // Ensure that no mutation and no audit log is created
        var auditCountBefore = 0;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            auditCountBefore = await db.StaffAuditLogs.CountAsync(l => l.TargetId == lesson2Id && l.Action == "lesson_changes_requested");
        }

        var draftReqChangesMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesson2Id}/request-changes")
        {
            Headers = { Authorization = adminAuthHeader },
            Content = JsonContent.Create(new { notes = "Attempting to request changes on draft" })
        };
        var draftReqChangesRes = await _client.SendAsync(draftReqChangesMsg);
        Assert.Equal(HttpStatusCode.BadRequest, draftReqChangesRes.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var lessonReloaded = await db.ContentLessons.FindAsync(lesson2Id);
            Assert.NotNull(lessonReloaded);
            Assert.Equal("draft", lessonReloaded.Status);

            var auditCountAfter = await db.StaffAuditLogs.CountAsync(l => l.TargetId == lesson2Id && l.Action == "lesson_changes_requested");
            Assert.Equal(auditCountBefore, auditCountAfter);
        }
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

    [Fact]
    public async Task ContentLessons_GenericPatch_StatusBypass_Returns400BadRequest()
    {
        var contentToken = await GetContentStaffTokenAsync();
        var contentAuthHeader = new AuthenticationHeaderValue("Bearer", contentToken);

        // 1. Create a draft lesson
        var subRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { name = "Patch Security Test", code = $"SEC_{Guid.NewGuid():N}"[..9].ToUpperInvariant(), grade = "10", description = "Test" })
        });
        subRes.EnsureSuccessStatusCode();
        var subId = (await subRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var chpRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { subjectId = subId, title = "Chương Patch Security", orderIndex = 1 })
        });
        chpRes.EnsureSuccessStatusCode();
        var chpId = (await chpRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var lesRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { chapterId = chpId, title = "Bài Draft Không Thể Bypass", slug = $"sec-patch-{Guid.NewGuid():N}"[..25], orderIndex = 1 })
        });
        lesRes.EnsureSuccessStatusCode();
        var lesId = (await lesRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // 2. Attempt generic PATCH with status = "published" -> MUST return 400 Bad Request
        var patchMsg = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/content/lessons/{lesId}")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new
            {
                title = "Bài Cố Tình Bypass",
                status = "published"
            })
        };
        var patchRes = await _client.SendAsync(patchMsg);
        Assert.Equal(HttpStatusCode.BadRequest, patchRes.StatusCode);
        var errJson = await patchRes.Content.ReadAsStringAsync();
        Assert.Contains("Không thể thay đổi trạng thái qua API cập nhật bài học", errJson);

        // Verify status remains "draft"
        var detailRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Get, $"/api/v1/content/lessons/{lesId}")
        {
            Headers = { Authorization = contentAuthHeader }
        });
        detailRes.EnsureSuccessStatusCode();
        var detailJson = await detailRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", detailJson.GetProperty("status").GetString());
    }

    [Fact]
    public async Task ContentLessons_ListLessons_SubjectFilter_ReturnsOnlyMatchingSubject()
    {
        var contentToken = await GetContentStaffTokenAsync();
        var contentAuthHeader = new AuthenticationHeaderValue("Bearer", contentToken);

        // Create Subject A and Lesson A
        var subARes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { name = "Môn Lọc A", code = $"FLT_A_{Guid.NewGuid():N}"[..9].ToUpperInvariant(), grade = "10" })
        });
        subARes.EnsureSuccessStatusCode();
        var subAId = (await subARes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var chpARes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { subjectId = subAId, title = "Chương A", orderIndex = 1 })
        });
        chpARes.EnsureSuccessStatusCode();
        var chpAId = (await chpARes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var lesARes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { chapterId = chpAId, title = "Bài Thuộc Môn A", slug = $"les-sub-a-{Guid.NewGuid():N}"[..25], orderIndex = 1 })
        });
        lesARes.EnsureSuccessStatusCode();
        var lesAId = (await lesARes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // Create Subject B and Lesson B
        var subBRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { name = "Môn Lọc B", code = $"FLT_B_{Guid.NewGuid():N}"[..9].ToUpperInvariant(), grade = "11" })
        });
        subBRes.EnsureSuccessStatusCode();
        var subBId = (await subBRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var chpBRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { subjectId = subBId, title = "Chương B", orderIndex = 1 })
        });
        chpBRes.EnsureSuccessStatusCode();
        var chpBId = (await chpBRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var lesBRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { chapterId = chpBId, title = "Bài Thuộc Môn B", slug = $"les-sub-b-{Guid.NewGuid():N}"[..25], orderIndex = 1 })
        });
        lesBRes.EnsureSuccessStatusCode();
        var lesBId = (await lesBRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // Query lessons with subjectId = subAId
        var listRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Get, $"/api/v1/content/lessons?subjectId={subAId}")
        {
            Headers = { Authorization = contentAuthHeader }
        });
        listRes.EnsureSuccessStatusCode();
        var listJson = await listRes.Content.ReadFromJsonAsync<JsonElement>();
        var items = listJson.GetProperty("items").EnumerateArray().ToList();

        Assert.Contains(items, item => item.GetProperty("id").GetString() == lesAId);
        Assert.DoesNotContain(items, item => item.GetProperty("id").GetString() == lesBId);
    }

    [Fact]
    public async Task ContentLessons_StructuredContent_Roundtrip_PreservesObjectFields()
    {
        var contentToken = await GetContentStaffTokenAsync();
        var contentAuthHeader = new AuthenticationHeaderValue("Bearer", contentToken);

        var subRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { name = "Cấu Trúc Test", code = $"STR_{Guid.NewGuid():N}"[..9].ToUpperInvariant(), grade = "10" })
        });
        subRes.EnsureSuccessStatusCode();
        var subId = (await subRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var chpRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { subjectId = subId, title = "Chương Cấu Trúc", orderIndex = 1 })
        });
        chpRes.EnsureSuccessStatusCode();
        var chpId = (await chpRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // Create lesson with structured JSON objects in definitions, formulas, examples
        var defItem = new { term = "Mệnh đề kéo theo", content = "Mệnh đề 'Nếu P thì Q' được gọi là mệnh đề kéo theo." };
        var formItem = new { label = "Công thức kéo theo", formula = "P \\Rightarrow Q", note = "Chỉ sai khi P đúng và Q sai." };
        var exItem = new
        {
            title = "Ví dụ 1",
            problem = "Xét tính đúng sai của mệnh đề",
            solutionSteps = new[]
            {
                new { step = 1, explanation = "Xác định giả thiết P và kết luận Q", math = "P: 2 > 1" }
            },
            conclusion = "Mệnh đề đúng."
        };

        var lesRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new
            {
                chapterId = chpId,
                title = "Bài Cấu Trúc Đầy Đủ",
                slug = $"les-str-{Guid.NewGuid():N}"[..25],
                orderIndex = 1,
                definitions = new object[] { defItem },
                formulas = new object[] { formItem },
                examples = new object[] { exItem },
                importantNotes = new[] { "Lưu ý bảng chân trị" },
                summaryPoints = new[] { "Ghi nhớ điều kiện mệnh đề đúng" }
            })
        });
        lesRes.EnsureSuccessStatusCode();
        var lesId = (await lesRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // Fetch back and verify object preservation
        var getRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Get, $"/api/v1/content/lessons/{lesId}")
        {
            Headers = { Authorization = contentAuthHeader }
        });
        getRes.EnsureSuccessStatusCode();
        var lesson = await getRes.Content.ReadFromJsonAsync<JsonElement>();

        var defs = lesson.GetProperty("definitions").EnumerateArray().ToList();
        Assert.Single(defs);
        Assert.Equal("Mệnh đề kéo theo", defs[0].GetProperty("term").GetString());
        Assert.Equal("Mệnh đề 'Nếu P thì Q' được gọi là mệnh đề kéo theo.", defs[0].GetProperty("content").GetString());

        var forms = lesson.GetProperty("formulas").EnumerateArray().ToList();
        Assert.Single(forms);
        Assert.Equal("Công thức kéo theo", forms[0].GetProperty("label").GetString());
        Assert.Equal("P \\Rightarrow Q", forms[0].GetProperty("formula").GetString());
        Assert.Equal("Chỉ sai khi P đúng và Q sai.", forms[0].GetProperty("note").GetString());

        var exs = lesson.GetProperty("examples").EnumerateArray().ToList();
        Assert.Single(exs);
        Assert.Equal("Ví dụ 1", exs[0].GetProperty("title").GetString());
        Assert.Equal("Mệnh đề đúng.", exs[0].GetProperty("conclusion").GetString());
        var steps = exs[0].GetProperty("solutionSteps").EnumerateArray().ToList();
        Assert.Single(steps);
        Assert.Equal(1, steps[0].GetProperty("step").GetInt32());
    }

    [Fact]
    public async Task StudentCurriculum_DraftLesson_NotVisibleToLearner_PublishedLesson_VisibleToLearner()
    {
        var contentToken = await GetContentStaffTokenAsync();
        var adminToken = await GetAdminTokenAsync();
        var learnerToken = await GetLearnerTokenAsync();

        var contentAuthHeader = new AuthenticationHeaderValue("Bearer", contentToken);
        var adminAuthHeader = new AuthenticationHeaderValue("Bearer", adminToken);
        var learnerAuthHeader = new AuthenticationHeaderValue("Bearer", learnerToken);

        // 1. Create active subject & chapter
        var subRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/subjects")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { name = "Toán Học Kiểm Thử", code = $"MATH_VIS_{Guid.NewGuid():N}"[..12].ToUpperInvariant(), grade = "10" })
        });
        subRes.EnsureSuccessStatusCode();
        var subId = (await subRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var chpRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new { subjectId = subId, title = "Chương 1", orderIndex = 1 })
        });
        chpRes.EnsureSuccessStatusCode();
        var chpId = (await chpRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // 2. Create lesson (defaults to draft)
        var lesRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = contentAuthHeader },
            Content = JsonContent.Create(new
            {
                chapterId = chpId,
                title = "Bài 1 Kiểm Thử Hiển Thị",
                slug = $"bai-1-visibility-{Guid.NewGuid():N}"[..25],
                orderIndex = 1,
                introduction = "Mô tả bài học"
            })
        });
        lesRes.EnsureSuccessStatusCode();
        var lesId = (await lesRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // 3. Learner requests draft lesson -> MUST be 404 Not Found
        var draftGetLearner = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Get, $"/api/v1/curriculum/lessons/{lesId}")
        {
            Headers = { Authorization = learnerAuthHeader }
        });
        Assert.Equal(HttpStatusCode.NotFound, draftGetLearner.StatusCode);

        // 4. Admin publishes lesson
        var pubRes = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lesId}/publish")
        {
            Headers = { Authorization = adminAuthHeader }
        });
        pubRes.EnsureSuccessStatusCode();

        // 5. Learner requests published lesson -> MUST be 200 OK
        var pubGetLearner = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Get, $"/api/v1/curriculum/lessons/{lesId}")
        {
            Headers = { Authorization = learnerAuthHeader }
        });
        Assert.Equal(HttpStatusCode.OK, pubGetLearner.StatusCode);
        var pubBody = await pubGetLearner.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Bài 1 Kiểm Thử Hiển Thị", pubBody.GetProperty("title").GetString());
    }
}
