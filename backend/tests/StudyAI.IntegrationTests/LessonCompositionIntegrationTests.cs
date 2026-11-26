using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace StudyAI.IntegrationTests;

public class LessonCompositionIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly StudyAIApiFixture _fixture;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public LessonCompositionIntegrationTests(StudyAIApiFixture fixture)
    {
        _fixture = fixture;
    }

    private async Task<string> LoginAsAsync(HttpClient client, string email, string password)
    {
        var res = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return body.GetProperty("accessToken").GetString()!;
    }

    private static HttpClient CreateAuthedClient(StudyAIApiFixture fixture, string token)
    {
        var client = fixture.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task Composition_EndToEnd_Validation_CyclePrevention_RowVersion_Rollback_And_LearnerProjection()
    {
        using var anonClient = _fixture.CreateClient();
        var adminToken = await LoginAsAsync(anonClient, "admin@studyai.internal", "Admin@123456");
        var reviewerToken = await LoginAsAsync(anonClient, "content@studyai.internal", "Content@123456");
        var studentToken = await LoginAsAsync(anonClient, "learner@studyai.internal", "Learner@123456");

        using var admin = CreateAuthedClient(_fixture, adminToken);
        using var reviewer = CreateAuthedClient(_fixture, reviewerToken);
        using var student = CreateAuthedClient(_fixture, studentToken);

        var key = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

        // 1. Setup 2 curricula (History & Biology) to verify subject-neutrality and cross-curriculum rejection
        var grade = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/grades", new { code = $"G{key}", name = $"Khối {key}" })).Content.ReadFromJsonAsync<JsonElement>();
        var histSubj = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/subjects", new { code = $"HIST_{key}", name = $"Lịch sử {key}" })).Content.ReadFromJsonAsync<JsonElement>();
        var bioSubj = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/subjects", new { code = $"BIO_{key}", name = $"Sinh học {key}" })).Content.ReadFromJsonAsync<JsonElement>();

        var histCurrResp = await admin.PostAsJsonAsync("/api/v1/content/catalog/curricula", new
        {
            code = $"C_HIST_{key}",
            gradeLevelId = grade.GetProperty("id").GetString(),
            subjectId = histSubj.GetProperty("id").GetString(),
            name = $"CT Sử {key}",
            framework = "E2E"
        });
        histCurrResp.EnsureSuccessStatusCode();
        var histCurr = await histCurrResp.Content.ReadFromJsonAsync<JsonElement>();
        var histCurrId = histCurr.GetProperty("id").GetString()!;
        (await admin.PostAsJsonAsync($"/api/v1/content/catalog/curricula/{histCurrId}/publish", new { rowVersion = histCurr.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        var bioCurrResp = await admin.PostAsJsonAsync("/api/v1/content/catalog/curricula", new
        {
            code = $"C_BIO_{key}",
            gradeLevelId = grade.GetProperty("id").GetString(),
            subjectId = bioSubj.GetProperty("id").GetString(),
            name = $"CT Sinh {key}",
            framework = "E2E"
        });
        bioCurrResp.EnsureSuccessStatusCode();
        var bioCurr = await bioCurrResp.Content.ReadFromJsonAsync<JsonElement>();
        var bioCurrId = bioCurr.GetProperty("id").GetString()!;

        var edition = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/editions", new
        {
            code = $"ED_{key}",
            curriculumId = histCurrId,
            editionName = $"Bản {key}"
        })).Content.ReadFromJsonAsync<JsonElement>();
        var editionId = edition.GetProperty("id").GetString()!;
        await admin.PostAsJsonAsync($"/api/v1/content/catalog/editions/{editionId}/publish", new { rowVersion = edition.GetProperty("rowVersion").GetString() });

        var ch = await (await admin.PostAsJsonAsync("/api/v1/content/chapters", new
        {
            curriculumEditionId = editionId,
            code = $"CH_{key}",
            title = "Chương P03"
        })).Content.ReadFromJsonAsync<JsonElement>();
        var chId = ch.GetProperty("id").GetString()!;
        var chSub = await (await admin.PostAsJsonAsync($"/api/v1/content/chapters/{chId}/submit-review", new { rowVersion = ch.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>();
        var chApp = await (await reviewer.PostAsJsonAsync($"/api/v1/content/chapters/{chId}/approve", new { rowVersion = chSub.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>();
        (await reviewer.PostAsJsonAsync($"/api/v1/content/chapters/{chId}/publish", new { rowVersion = chApp.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        var lessonA = await (await admin.PostAsJsonAsync("/api/v1/content/lessons", new { chapterId = chId, code = $"LA_{key}", title = "Bài A", slug = $"bai-a-{key.ToLowerInvariant()}" })).Content.ReadFromJsonAsync<JsonElement>();
        var lessonB = await (await admin.PostAsJsonAsync("/api/v1/content/lessons", new { chapterId = chId, code = $"LB_{key}", title = "Bài B", slug = $"bai-b-{key.ToLowerInvariant()}" })).Content.ReadFromJsonAsync<JsonElement>();
        var lessonAId = lessonA.GetProperty("id").GetString()!;
        var lessonBId = lessonB.GetProperty("id").GetString()!;

        // 2. RBAC: anonymous 401, student 403
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonClient.GetAsync($"/api/v1/content/lessons/{lessonAId}/composition")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await student.GetAsync($"/api/v1/content/lessons/{lessonAId}/composition")).StatusCode);

        // 3. Create curriculum-scoped Objective, KnowledgeUnit, Skill (+ Bio objective for cross-curriculum test)
        // P03-REV-001: Nodes start as draft; publishing requires provenance and authorized reviewer
        var objNoProv = await (await admin.PostAsJsonAsync($"/api/v1/content/curricula/{histCurrId}/objectives", new { code = $"OBJ_{key}", title = "Phân tích sự kiện" })).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", objNoProv.GetProperty("status").GetString());
        var pubNoProv = await reviewer.PostAsync($"/api/v1/content/curricula/{histCurrId}/objectives/{objNoProv.GetProperty("id").GetString()}/publish", null);
        Assert.Equal(HttpStatusCode.BadRequest, pubNoProv.StatusCode);

        var objHist = await (await admin.PostAsJsonAsync($"/api/v1/content/curricula/{histCurrId}/objectives", new { code = $"OBJ2_{key}", title = "Phân tích sự kiện 1945", sourceName = "SGK Sử 12", sourceLicense = "Internal-Approved" })).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", objHist.GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.Forbidden, (await student.PostAsync($"/api/v1/content/curricula/{histCurrId}/objectives/{objHist.GetProperty("id").GetString()}/publish", null)).StatusCode);
        var pubObjResp = await reviewer.PostAsync($"/api/v1/content/curricula/{histCurrId}/objectives/{objHist.GetProperty("id").GetString()}/publish", null);
        pubObjResp.EnsureSuccessStatusCode();
        Assert.Equal("published", (await pubObjResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());

        var kuHist = await (await admin.PostAsJsonAsync($"/api/v1/content/curricula/{histCurrId}/knowledge-units", new { code = $"KU_{key}", title = "Mốc 1945", sourceName = "SGK Sử 12", sourceLicense = "Internal-Approved" })).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", kuHist.GetProperty("status").GetString());
        (await reviewer.PostAsync($"/api/v1/content/curricula/{histCurrId}/knowledge-units/{kuHist.GetProperty("id").GetString()}/publish", null)).EnsureSuccessStatusCode();

        var skHist = await (await admin.PostAsJsonAsync($"/api/v1/content/curricula/{histCurrId}/skills", new { code = $"SK_{key}", title = "Đọc dòng thời gian", sourceName = "SGK Sử 12", sourceLicense = "Internal-Approved" })).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", skHist.GetProperty("status").GetString());
        (await reviewer.PostAsync($"/api/v1/content/curricula/{histCurrId}/skills/{skHist.GetProperty("id").GetString()}/publish", null)).EnsureSuccessStatusCode();

        var objBio = await (await admin.PostAsJsonAsync($"/api/v1/content/curricula/{bioCurrId}/objectives", new { code = $"OBJB_{key}", title = "Tế bào" })).Content.ReadFromJsonAsync<JsonElement>();

        // Duplicate code -> 409 Conflict
        var dupObj = await admin.PostAsJsonAsync($"/api/v1/content/curricula/{histCurrId}/objectives", new { code = $"obj2_{key.ToLowerInvariant()}", title = "Trùng mã" });
        Assert.Equal(HttpStatusCode.Conflict, dupObj.StatusCode);

        // 4. Reject invalid block type, cross-curriculum objective, and stale RowVersion
        var compA = await (await admin.GetAsync($"/api/v1/content/lessons/{lessonAId}/composition")).Content.ReadFromJsonAsync<JsonElement>();
        var rowVersionA = compA.GetProperty("rowVersion").GetString()!;

        var badBlockRes = await admin.PutAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/composition", new
        {
            rowVersion = rowVersionA,
            blocks = new[] { new { blockType = "invalid_type", schemaVersion = 1, payload = new { content = "x" } } },
            objectiveIds = Array.Empty<string>(),
            knowledgeUnitIds = Array.Empty<string>(),
            skillIds = Array.Empty<string>(),
            prerequisiteLessonIds = Array.Empty<string>()
        });
        Assert.Equal(HttpStatusCode.BadRequest, badBlockRes.StatusCode);

        var crossCurrRes = await admin.PutAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/composition", new
        {
            rowVersion = rowVersionA,
            blocks = new[] { new { blockType = "text", schemaVersion = 1, payload = new { content = "Hợp lệ" } } },
            objectiveIds = new[] { objBio.GetProperty("id").GetString()! },
            knowledgeUnitIds = Array.Empty<string>(),
            skillIds = Array.Empty<string>(),
            prerequisiteLessonIds = Array.Empty<string>()
        });
        Assert.Equal(HttpStatusCode.BadRequest, crossCurrRes.StatusCode);

        // 5. Save valid subject-neutral blocks (timeline + exercise with answerKey + formula) on Lesson A
        var saveResA = await admin.PutAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/composition", new
        {
            rowVersion = rowVersionA,
            blocks = new object[]
            {
                new { blockType = "timeline", schemaVersion = 1, payload = new { events = new[] { new { date = "1945", title = "Cách mạng tháng Tám" } } } },
                new { blockType = "exercise", schemaVersion = 1, payload = new { prompt = "Nêu ý nghĩa?", hint = "Xem mốc 1945", solution = "Đáp án mật", answerKey = "SECRET_KEY" } }
            },
            objectiveIds = new[] { objHist.GetProperty("id").GetString()! },
            knowledgeUnitIds = new[] { kuHist.GetProperty("id").GetString()! },
            skillIds = new[] { skHist.GetProperty("id").GetString()! },
            prerequisiteLessonIds = Array.Empty<string>(),
            reason = "Soạn P03 v1"
        });
        saveResA.EnsureSuccessStatusCode();
        var savedA = await saveResA.Content.ReadFromJsonAsync<JsonElement>();
        var newRowVersionA = savedA.GetProperty("rowVersion").GetString()!;
        Assert.NotEqual(rowVersionA, newRowVersionA);
        Assert.Equal(2, savedA.GetProperty("blocks").GetArrayLength());

        // Stale RowVersion -> 409 Conflict
        var staleRes = await admin.PutAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/composition", new
        {
            rowVersion = rowVersionA,
            blocks = Array.Empty<object>(),
            objectiveIds = Array.Empty<string>(),
            knowledgeUnitIds = Array.Empty<string>(),
            skillIds = Array.Empty<string>(),
            prerequisiteLessonIds = Array.Empty<string>()
        });
        Assert.Equal(HttpStatusCode.Conflict, staleRes.StatusCode);

        // 6. Prerequisite cycle prevention: B depends on A succeeds; then A depends on B fails (400)
        var compB = await (await admin.GetAsync($"/api/v1/content/lessons/{lessonBId}/composition")).Content.ReadFromJsonAsync<JsonElement>();
        var rowVersionB = compB.GetProperty("rowVersion").GetString()!;
        var saveResB = await admin.PutAsJsonAsync($"/api/v1/content/lessons/{lessonBId}/composition", new
        {
            rowVersion = rowVersionB,
            blocks = new[] { new { blockType = "text", schemaVersion = 1, payload = new { content = "Bài B" } } },
            objectiveIds = Array.Empty<string>(),
            knowledgeUnitIds = Array.Empty<string>(),
            skillIds = Array.Empty<string>(),
            prerequisiteLessonIds = new[] { lessonAId }
        });
        saveResB.EnsureSuccessStatusCode();

        var cycleRes = await admin.PutAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/composition", new
        {
            rowVersion = newRowVersionA,
            blocks = new[] { new { blockType = "text", schemaVersion = 1, payload = new { content = "Cycle" } } },
            objectiveIds = Array.Empty<string>(),
            knowledgeUnitIds = Array.Empty<string>(),
            skillIds = Array.Empty<string>(),
            prerequisiteLessonIds = new[] { lessonBId }
        });
        Assert.Equal(HttpStatusCode.BadRequest, cycleRes.StatusCode);

        // 7. Learner projection: draft lesson A is invisible (404); publish -> visible with exercise answerKey stripped
        Assert.Equal(HttpStatusCode.NotFound, (await student.GetAsync($"/api/v1/curriculum/lessons/{lessonAId}")).StatusCode);

        var subRes = await admin.PostAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/submit-review", new { rowVersion = newRowVersionA });
        Assert.True(subRes.IsSuccessStatusCode, await subRes.Content.ReadAsStringAsync());
        var detailAfterSub = await subRes.Content.ReadFromJsonAsync<JsonElement>();
        var appRes = await reviewer.PostAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/approve", new { rowVersion = detailAfterSub.GetProperty("rowVersion").GetString() });
        Assert.True(appRes.IsSuccessStatusCode, await appRes.Content.ReadAsStringAsync());
        var detailAfterApp = await appRes.Content.ReadFromJsonAsync<JsonElement>();
        var pubRes = await reviewer.PostAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/publish", new { rowVersion = detailAfterApp.GetProperty("rowVersion").GetString() });
        Assert.True(pubRes.IsSuccessStatusCode, await pubRes.Content.ReadAsStringAsync());
        var detailAfterPub = await pubRes.Content.ReadFromJsonAsync<JsonElement>();
        var pubRowVersion = detailAfterPub.GetProperty("rowVersion").GetString()!;

        // Published lesson cannot be edited in place (409)
        var editPublishedRes = await admin.PutAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/composition", new
        {
            rowVersion = pubRowVersion,
            blocks = Array.Empty<object>(),
            objectiveIds = Array.Empty<string>(),
            knowledgeUnitIds = Array.Empty<string>(),
            skillIds = Array.Empty<string>(),
            prerequisiteLessonIds = Array.Empty<string>()
        });
        Assert.Equal(HttpStatusCode.Conflict, editPublishedRes.StatusCode);

        var learnerDetail = await (await student.GetAsync($"/api/v1/curriculum/lessons/{lessonAId}")).Content.ReadFromJsonAsync<JsonElement>();
        var learnerBlocks = learnerDetail.GetProperty("contentBlocks");
        Assert.Equal(2, learnerBlocks.GetArrayLength());
        var exPayload = learnerBlocks[1].GetProperty("payload");
        Assert.Equal("Nêu ý nghĩa?", exPayload.GetProperty("prompt").GetString());
        Assert.False(exPayload.TryGetProperty("solution", out _));
        Assert.False(exPayload.TryGetProperty("answerKey", out _));

        // 8. Revisions & Rollback creates new draft revision linked by SourceRevisionId
        var revsPage = await (await admin.GetAsync($"/api/v1/content/lessons/{lessonAId}/revisions")).Content.ReadFromJsonAsync<JsonElement>();
        var revItems = revsPage.GetProperty("items");
        Assert.True(revItems.GetArrayLength() >= 1);
        var rev1Id = revItems[0].GetProperty("id").GetString()!;

        var rollbackRes = await admin.PostAsJsonAsync($"/api/v1/content/lessons/{lessonAId}/revisions/{rev1Id}/rollback", new
        {
            rowVersion = pubRowVersion,
            reason = "Rollback về v1"
        });
        rollbackRes.EnsureSuccessStatusCode();
        var rolledBack = await rollbackRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("draft", rolledBack.GetProperty("status").GetString());

        var revsAfter = await (await admin.GetAsync($"/api/v1/content/lessons/{lessonAId}/revisions")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(rev1Id, revsAfter.GetProperty("items")[0].GetProperty("sourceRevisionId").GetString());
    }
}
