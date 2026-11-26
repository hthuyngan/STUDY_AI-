using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using Xunit;

namespace StudyAI.IntegrationTests;

public class LessonResourceIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly StudyAIApiFixture _fixture;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public LessonResourceIntegrationTests(StudyAIApiFixture fixture)
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
    public async Task Resources_EndToEnd_Auth_Validation_RowVersion_Workflow_Reorder_Archive_And_LearnerProjection()
    {
        using var anonClient = _fixture.CreateClient();
        var adminToken = await LoginAsAsync(anonClient, "admin@studyai.internal", "Admin@123456");
        var reviewerToken = await LoginAsAsync(anonClient, "content@studyai.internal", "Content@123456");
        var studentToken = await LoginAsAsync(anonClient, "learner@studyai.internal", "Learner@123456");

        using var admin = CreateAuthedClient(_fixture, adminToken);
        using var reviewer = CreateAuthedClient(_fixture, reviewerToken);
        using var student = CreateAuthedClient(_fixture, studentToken);

        var key = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

        // Setup published Grade -> Subject -> Curriculum -> Edition -> Chapter -> Lesson
        var grade = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/grades", new { code = $"GR_{key}", name = $"Khối {key}" })).Content.ReadFromJsonAsync<JsonElement>();
        var subj = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/subjects", new { code = $"SR_{key}", name = $"Toán {key}" })).Content.ReadFromJsonAsync<JsonElement>();
        var curr = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/curricula", new
        {
            code = $"CR_{key}",
            gradeLevelId = grade.GetProperty("id").GetString(),
            subjectId = subj.GetProperty("id").GetString(),
            name = $"CT {key}",
            framework = "E2E"
        })).Content.ReadFromJsonAsync<JsonElement>();
        var currId = curr.GetProperty("id").GetString()!;
        (await admin.PostAsJsonAsync($"/api/v1/content/catalog/curricula/{currId}/publish", new { rowVersion = curr.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        var edition = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/editions", new
        {
            code = $"EDR_{key}",
            curriculumId = currId,
            editionName = $"Bản {key}"
        })).Content.ReadFromJsonAsync<JsonElement>();
        var editionId = edition.GetProperty("id").GetString()!;
        (await admin.PostAsJsonAsync($"/api/v1/content/catalog/editions/{editionId}/publish", new { rowVersion = edition.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        var ch = await (await admin.PostAsJsonAsync("/api/v1/content/chapters", new
        {
            curriculumEditionId = editionId,
            code = $"CHR_{key}",
            title = $"Chương {key}"
        })).Content.ReadFromJsonAsync<JsonElement>();
        var chId = ch.GetProperty("id").GetString()!;
        var chSub = await (await admin.PostAsJsonAsync($"/api/v1/content/chapters/{chId}/submit-review", new { rowVersion = ch.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>();
        var chApp = await (await reviewer.PostAsJsonAsync($"/api/v1/content/chapters/{chId}/approve", new { rowVersion = chSub.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>();
        (await reviewer.PostAsJsonAsync($"/api/v1/content/chapters/{chId}/publish", new { rowVersion = chApp.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        var lesResp = await admin.PostAsJsonAsync("/api/v1/content/lessons", new
        {
            chapterId = chId,
            code = $"LESR_{key}",
            title = $"Bài học tài nguyên {key}",
            slug = $"bai-hoc-tai-nguyen-{key.ToLowerInvariant()}",
            introduction = "Giới thiệu bài học kiểm thử tài nguyên P04.",
            definitions = new[] { new { term = "Khái niệm P04", content = "Nội dung lý thuyết P04." } },
            sourceName = "SGK Chuẩn",
            sourceLicense = "Internal-Approved"
        });
        lesResp.EnsureSuccessStatusCode();
        var les = await lesResp.Content.ReadFromJsonAsync<JsonElement>();
        var lessonId = les.GetProperty("id").GetString()!;
        var lesSubResp = await admin.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/submit-review", new { rowVersion = les.GetProperty("rowVersion").GetString() });
        lesSubResp.EnsureSuccessStatusCode();
        var lesSub = await lesSubResp.Content.ReadFromJsonAsync<JsonElement>();
        var lesAppResp = await reviewer.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/approve", new { rowVersion = lesSub.GetProperty("rowVersion").GetString() });
        lesAppResp.EnsureSuccessStatusCode();
        var lesApp = await lesAppResp.Content.ReadFromJsonAsync<JsonElement>();
        (await reviewer.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/publish", new { rowVersion = lesApp.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        // 1. Auth checks: 401 anon, 403 student
        var unauthRes = await anonClient.GetAsync($"/api/v1/content/lessons/{lessonId}/resources");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthRes.StatusCode);

        var forbiddenRes = await student.GetAsync($"/api/v1/content/lessons/{lessonId}/resources");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenRes.StatusCode);

        // 2. Optional-resource check: published lesson with 0 resources loads cleanly for student
        var emptyLearnerRes = await student.GetAsync($"/api/v1/curriculum/lessons/{lessonId}");
        emptyLearnerRes.EnsureSuccessStatusCode();
        var emptyLearnerBody = await emptyLearnerRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(0, emptyLearnerBody.GetProperty("resources").GetArrayLength());
        Assert.Equal(0, emptyLearnerBody.GetProperty("videos").GetArrayLength());

        // 3. URL safety rejections (400)
        var badJs = await admin.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/resources", new
        {
            resourceType = "link",
            title = "Bad JS",
            sourceUrl = "javascript:alert(1)"
        });
        Assert.Equal(HttpStatusCode.BadRequest, badJs.StatusCode);

        var badSsrf = await admin.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/resources", new
        {
            resourceType = "document",
            title = "Bad SSRF",
            sourceUrl = "https://127.0.0.1/secret.pdf"
        });
        Assert.Equal(HttpStatusCode.BadRequest, badSsrf.StatusCode);

        // 4. Create video + document resources
        var createVid = await admin.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/resources", new
        {
            resourceType = "video",
            title = "Video bài giảng",
            sourceUrl = "https://youtu.be/dQw4w9WgXcQ",
            embedAllowed = true
        });
        Assert.Equal(HttpStatusCode.Created, createVid.StatusCode);
        var vidDto = await createVid.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var vidId = vidDto.GetProperty("id").GetString()!;
        var vidRv = vidDto.GetProperty("rowVersion").GetString()!;
        Assert.Equal("youtube", vidDto.GetProperty("provider").GetString());
        Assert.Equal("draft", vidDto.GetProperty("status").GetString());

        var createDoc = await admin.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/resources", new
        {
            resourceType = "document",
            title = "Phiếu bài tập",
            sourceUrl = "https://cdn.example.org/worksheet.pdf",
            mimeType = "application/pdf"
        });
        Assert.Equal(HttpStatusCode.Created, createDoc.StatusCode);
        var docDto = await createDoc.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var docId = docDto.GetProperty("id").GetString()!;
        var docRv = docDto.GetProperty("rowVersion").GetString()!;

        // 5. RowVersion stale conflict (409)
        var staleUpdate = await admin.PatchAsJsonAsync($"/api/v1/content/resources/{vidId}", new
        {
            title = "Stale",
            rowVersion = "AAAAAAAAAAA="
        });
        Assert.Equal(HttpStatusCode.Conflict, staleUpdate.StatusCode);

        // 6. Verify + Publish both via reviewer
        var vidVerified = await (await reviewer.PostAsJsonAsync($"/api/v1/content/resources/{vidId}/verify", new { rowVersion = vidRv })).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var vidPublished = await (await reviewer.PostAsJsonAsync($"/api/v1/content/resources/{vidId}/publish", new { rowVersion = vidVerified.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var vidPubRv = vidPublished.GetProperty("rowVersion").GetString()!;

        // Cannot edit or archive published resource (409)
        var editPublished = await admin.PatchAsJsonAsync($"/api/v1/content/resources/{vidId}", new
        {
            title = "Edit while published",
            rowVersion = vidPubRv
        });
        Assert.Equal(HttpStatusCode.Conflict, editPublished.StatusCode);

        var docVerified = await (await reviewer.PostAsJsonAsync($"/api/v1/content/resources/{docId}/verify", new { rowVersion = docRv })).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var docPublished = await (await reviewer.PostAsJsonAsync($"/api/v1/content/resources/{docId}/publish", new { rowVersion = docVerified.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var docPubRv = docPublished.GetProperty("rowVersion").GetString()!;

        // 7. Reorder: put doc first, vid second
        var reorderResp = await admin.PostAsJsonAsync("/api/v1/content/resources/reorder", new
        {
            lessonId,
            resourceIds = new[] { docId, vidId },
            items = new[]
            {
                new { resourceId = docId, rowVersion = docPubRv },
                new { resourceId = vidId, rowVersion = vidPubRv }
            }
        });
        reorderResp.EnsureSuccessStatusCode();
        var reordered = await reorderResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var reorderedItems = reordered.GetProperty("items");
        Assert.Equal(docId, reorderedItems[0].GetProperty("id").GetString());
        Assert.Equal(vidId, reorderedItems[1].GetProperty("id").GetString());

        // 8. Learner sees ordered published+verified resources
        var learnerDetail = await (await student.GetAsync($"/api/v1/curriculum/lessons/{lessonId}")).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var learnerResources = learnerDetail.GetProperty("resources");
        Assert.Equal(2, learnerResources.GetArrayLength());
        Assert.Equal(docId, learnerResources[0].GetProperty("id").GetString());
        Assert.Equal(vidId, learnerResources[1].GetProperty("id").GetString());
        Assert.Equal(1, learnerDetail.GetProperty("videos").GetArrayLength());

        // 9. Unpublish + Archive doc, verify excluded from learner projection
        var docLatestRv = reorderedItems[0].GetProperty("rowVersion").GetString()!;
        var docUnpub = await (await reviewer.PostAsJsonAsync($"/api/v1/content/resources/{docId}/unpublish", new { rowVersion = docLatestRv })).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var docArch = await admin.PostAsJsonAsync($"/api/v1/content/resources/{docId}/archive", new { rowVersion = docUnpub.GetProperty("rowVersion").GetString(), reason = "Outdated" });
        docArch.EnsureSuccessStatusCode();

        var learnerAfterArchive = await (await student.GetAsync($"/api/v1/curriculum/lessons/{lessonId}")).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(1, learnerAfterArchive.GetProperty("resources").GetArrayLength());
        Assert.Equal(vidId, learnerAfterArchive.GetProperty("resources")[0].GetProperty("id").GetString());

        // 10. StaffAuditLog entries recorded
        using var scope = _fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var auditActions = await db.StaffAuditLogs
            .Where(a => a.TargetId == vidId || a.TargetId == docId || a.TargetId == lessonId)
            .Select(a => a.Action)
            .ToListAsync();
        Assert.Contains("lesson_resource_created", auditActions);
        Assert.Contains("lesson_resource_verified", auditActions);
        Assert.Contains("lesson_resource_published", auditActions);
        Assert.Contains("lesson_resources_reordered", auditActions);
        Assert.Contains("lesson_resource_archived", auditActions);
    }
}
