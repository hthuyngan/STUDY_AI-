using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using StudyAI.Features.Content;
using Xunit;

namespace StudyAI.IntegrationTests;

public class CurriculumLifecycleIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly StudyAIApiFixture _fixture;
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };
    public CurriculumLifecycleIntegrationTests(StudyAIApiFixture fixture)
    {
        _fixture = fixture;
        _client = fixture.CreateClient();
    }

    private async Task<string> Login(string email, string password)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new UserLoginRequestDto { Email = email, Password = password });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponseDto>(_json))!.AccessToken;
    }

    private async Task<T> Send<T>(HttpMethod method, string path, string token, object? body = null)
    {
        using var request = new HttpRequestMessage(method, path) { Content = body == null ? null : JsonContent.Create(body) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"{method} {path} returned {(int)response.StatusCode}: {text}");
        return JsonSerializer.Deserialize<T>(text, _json)!;
    }

    [Fact]
    public async Task Management_ToSql_ToLearner_PublishedChain_IsRealAndEditionScoped()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var admin = await Login("admin@studyai.internal", "Admin@123456");
        var reviewer = await Login("content@studyai.internal", "Content@123456");
        var grade = await Send<GradeLevelDto>(HttpMethod.Post, "/api/v1/content/catalog/grades", admin, new { code = $"G{suffix}", name = $"Khối {suffix}", orderIndex = 1 });
        var subject = await Send<CatalogSubjectDto>(HttpMethod.Post, "/api/v1/content/catalog/subjects", admin, new { code = $"S{suffix}", name = $"Môn {suffix}" });
        var curriculum = await Send<CurriculumDto>(HttpMethod.Post, "/api/v1/content/catalog/curricula", admin, new { code = $"C{suffix}", gradeLevelId = grade.Id, subjectId = subject.Id, name = $"Chương trình {suffix}", framework = "Test isolation" });
        curriculum = await Send<CurriculumDto>(HttpMethod.Post, $"/api/v1/content/catalog/curricula/{curriculum.Id}/publish", admin, new { curriculum.RowVersion });
        var edition = await Send<CurriculumEditionDto>(HttpMethod.Post, "/api/v1/content/catalog/editions", admin, new { code = $"E{suffix}", curriculumId = curriculum.Id, editionName = $"Edition {suffix}" });
        edition = await Send<CurriculumEditionDto>(HttpMethod.Post, $"/api/v1/content/catalog/editions/{edition.Id}/publish", admin, new { edition.RowVersion });

        var chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, "/api/v1/content/chapters", admin, new { curriculumEditionId = edition.Id, code = "CH01", title = "Chương tích hợp", orderIndex = 1 });
        var staleChapterVersion = chapter.RowVersion;
        var learnerToken = await Login("learner@studyai.internal", "Learner@123456");
        using (var forbidden = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/content/chapters/{chapter.Id}") { Content = JsonContent.Create(new { title = "Không được phép", rowVersion = chapter.RowVersion }) })
        { forbidden.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken); Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(forbidden)).StatusCode); }
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/submit-review", admin, new { chapter.RowVersion });
        using (var stale = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/content/chapters/{chapter.Id}") { Content = JsonContent.Create(new { title = "Ghi đè cũ", rowVersion = staleChapterVersion }) })
        { stale.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin); Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(stale)).StatusCode); }
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/approve", reviewer, new { chapter.RowVersion });
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/publish", reviewer, new { chapter.RowVersion });

        var lesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, "/api/v1/content/lessons", admin, new { chapterId = chapter.Id, code = "L01", title = "Bài tích hợp", slug = $"lesson-{suffix}", orderIndex = 1 });
        var hidden = await _client.GetAsync($"/api/v1/curriculum/editions/{edition.Id}/chapters");
        hidden.EnsureSuccessStatusCode();
        Assert.DoesNotContain(lesson.Id, await hidden.Content.ReadAsStringAsync());
        lesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{lesson.Id}/submit-review", admin, new { lesson.RowVersion });
        lesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{lesson.Id}/approve", reviewer, new { lesson.RowVersion });
        lesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{lesson.Id}/publish", reviewer, new { lesson.RowVersion });

        var learner = await _client.GetAsync($"/api/v1/curriculum/editions/{edition.Id}/chapters");
        learner.EnsureSuccessStatusCode();
        var learnerJson = await learner.Content.ReadAsStringAsync();
        Assert.Contains(chapter.Id, learnerJson); Assert.Contains(lesson.Id, learnerJson);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/v1/curriculum/editions/not-real/chapters")).StatusCode);
    }

    [Fact]
    public async Task ChapterMutation_ReturnsNotFoundForUnknownEntity()
    {
        var admin = await Login("admin@studyai.internal", "Admin@123456");
        using var request = new HttpRequestMessage(HttpMethod.Patch, "/api/v1/content/chapters/not-real") { Content = JsonContent.Create(new { title = "No" }) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task ChapterAndLesson_FullLifecycle_Unpublish_Archive_Reactivate_Reorder_And_FourEyes_Work()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var admin = await Login("admin@studyai.internal", "Admin@123456");
        var reviewer = await Login("content@studyai.internal", "Content@123456");
        var teacherEmail = $"teacher.{suffix.ToLowerInvariant()}@studyai.internal";
        await Send<JsonElement>(HttpMethod.Post, "/api/v1/admin/users", admin, new { email = teacherEmail, displayName = "Teacher Test", password = "Teacher@123456", role = "teacher" });
        var teacher = await Login(teacherEmail, "Teacher@123456");

        var grade = await Send<GradeLevelDto>(HttpMethod.Post, "/api/v1/content/catalog/grades", admin, new { code = $"GL{suffix}", name = $"Khối {suffix}", orderIndex = 2 });
        var subject = await Send<CatalogSubjectDto>(HttpMethod.Post, "/api/v1/content/catalog/subjects", admin, new { code = $"SL{suffix}", name = $"Sử {suffix}" });
        var curriculum = await Send<CurriculumDto>(HttpMethod.Post, "/api/v1/content/catalog/curricula", admin, new { code = $"CL{suffix}", gradeLevelId = grade.Id, subjectId = subject.Id, name = $"CT {suffix}", framework = "CT2018" });
        curriculum = await Send<CurriculumDto>(HttpMethod.Post, $"/api/v1/content/catalog/curricula/{curriculum.Id}/publish", admin, new { curriculum.RowVersion });
        var edition = await Send<CurriculumEditionDto>(HttpMethod.Post, "/api/v1/content/catalog/editions", admin, new { code = $"EL{suffix}", curriculumId = curriculum.Id, editionName = $"Bản {suffix}" });
        edition = await Send<CurriculumEditionDto>(HttpMethod.Post, $"/api/v1/content/catalog/editions/{edition.Id}/publish", admin, new { edition.RowVersion });

        // Teacher cannot mutate chapter
        using (var teacherReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters") { Content = JsonContent.Create(new { curriculumEditionId = edition.Id, code = "TCH", title = "Denied", orderIndex = 1 }) })
        {
            teacherReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacher);
            Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(teacherReq)).StatusCode);
        }

        // Chapter: draft -> in-review -> changes-requested -> in-review -> approved -> published -> unpublish (approved) -> publish -> archive -> reactivate (draft)
        var ch1 = await Send<ContentChapterItemDto>(HttpMethod.Post, "/api/v1/content/chapters", admin, new { curriculumEditionId = edition.Id, code = "CH01", title = "Chương 1", orderIndex = 1 });
        var ch2 = await Send<ContentChapterItemDto>(HttpMethod.Post, "/api/v1/content/chapters", admin, new { curriculumEditionId = edition.Id, code = "CH02", title = "Chương 2", orderIndex = 2 });
        ch1 = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch1.Id}/submit-review", admin, new { ch1.RowVersion });

        // Four-eyes: author (admin) cannot approve own chapter
        using (var selfApprove = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/chapters/{ch1.Id}/approve") { Content = JsonContent.Create(new { ch1.RowVersion }) })
        {
            selfApprove.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin);
            Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(selfApprove)).StatusCode);
        }

        ch1 = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch1.Id}/request-changes", reviewer, new { ch1.RowVersion, reason = "Bổ sung mô tả" });
        Assert.Equal("changes-requested", ch1.Status);
        ch1 = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch1.Id}/submit-review", admin, new { ch1.RowVersion });
        ch1 = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch1.Id}/approve", reviewer, new { ch1.RowVersion });
        ch1 = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch1.Id}/publish", reviewer, new { ch1.RowVersion });
        ch1 = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch1.Id}/unpublish", reviewer, new { ch1.RowVersion });
        Assert.Equal("approved", ch1.Status);
        ch1 = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch1.Id}/publish", reviewer, new { ch1.RowVersion });
        Assert.Equal("published", ch1.Status);

        // Reorder chapters: stale RowVersion returns 409, valid RowVersions succeeds
        using (var staleReorder = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters/reorder") { Content = JsonContent.Create(new { curriculumEditionId = edition.Id, chapterIds = new[] { ch2.Id, ch1.Id }, rowVersions = new Dictionary<string, string> { [ch1.Id] = "AAAAAAAA", [ch2.Id] = ch2.RowVersion } }) })
        {
            staleReorder.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin);
            Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(staleReorder)).StatusCode);
        }
        await Send<JsonElement>(HttpMethod.Post, "/api/v1/content/chapters/reorder", admin, new { curriculumEditionId = edition.Id, chapterIds = new[] { ch2.Id, ch1.Id }, rowVersions = new Dictionary<string, string> { [ch1.Id] = ch1.RowVersion, [ch2.Id] = ch2.RowVersion } });

        // Lesson: draft -> in-review -> changes-requested -> in-review -> approved -> published -> archive -> reactivate
        var l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, "/api/v1/content/lessons", admin, new { chapterId = ch1.Id, code = "L01", title = "Bài 1", slug = $"b1-{suffix}", orderIndex = 1 });
        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/submit-review", admin, new { l1.RowVersion });
        var staleLessonRv = l1.RowVersion;
        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/request-changes", reviewer, new { rowVersion = l1.RowVersion, reason = "Sửa mục tiêu" });
        Assert.Equal("changes-requested", l1.Status);

        using (var staleReqChanges = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/submit-review") { Content = JsonContent.Create(new { rowVersion = staleLessonRv }) })
        {
            staleReqChanges.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin);
            Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(staleReqChanges)).StatusCode);
        }

        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/submit-review", admin, new { l1.RowVersion });
        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/approve", reviewer, new { l1.RowVersion });
        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/publish", reviewer, new { l1.RowVersion });
        Assert.Equal("published", l1.Status);

        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/archive", reviewer, new { l1.RowVersion, reason = "Lưu trữ thử" });
        Assert.Equal("archived", l1.Status);
        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/reactivate", reviewer, new { l1.RowVersion });
        Assert.Equal("draft", l1.Status);

        // Chapter archive -> reactivate (re-fetch ch2 because reorder incremented its RowVersion)
        ch2 = await Send<ContentChapterItemDto>(HttpMethod.Get, $"/api/v1/content/chapters/{ch2.Id}", reviewer);
        ch2 = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch2.Id}/archive", reviewer, new { ch2.RowVersion });
        Assert.Equal("archived", ch2.Status);
        ch2 = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch2.Id}/reactivate", reviewer, new { ch2.RowVersion });
        Assert.Equal("draft", ch2.Status);
    }

    [Fact]
    public async Task ForcedAuditFailure_RollsBackChapterCreation_Atomically()
    {
        using var scope = _fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var failingAudit = new FailingAuditWriter();
        var svc = new ContentChaptersService(db, failingAudit, scope.ServiceProvider.GetRequiredService<IClock>(), scope.ServiceProvider.GetRequiredService<IIdGenerator>());
        var code = $"FAIL_{Guid.NewGuid():N}"[..16];

        // Create a real edition first via normal service
        var suffix = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        var admin = await Login("admin@studyai.internal", "Admin@123456");
        var grade = await Send<GradeLevelDto>(HttpMethod.Post, "/api/v1/content/catalog/grades", admin, new { code = $"GA{suffix}", name = $"Khối {suffix}", orderIndex = 9 });
        var subject = await Send<CatalogSubjectDto>(HttpMethod.Post, "/api/v1/content/catalog/subjects", admin, new { code = $"SA{suffix}", name = $"Môn {suffix}" });
        var curriculum = await Send<CurriculumDto>(HttpMethod.Post, "/api/v1/content/catalog/curricula", admin, new { code = $"CA{suffix}", gradeLevelId = grade.Id, subjectId = subject.Id, name = $"CT {suffix}", framework = "Audit" });
        var edition = await Send<CurriculumEditionDto>(HttpMethod.Post, "/api/v1/content/catalog/editions", admin, new { code = $"EA{suffix}", curriculumId = curriculum.Id, editionName = $"Ed {suffix}" });

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.CreateChapterAsync(new CreateChapterRequestDto { CurriculumEditionId = edition.Id, Code = code, Title = "Must Rollback", OrderIndex = 1 }, "usr_admin"));

        db.ChangeTracker.Clear();
        Assert.False(await db.ContentChapters.AnyAsync(c => c.CurriculumEditionId == edition.Id && c.Code == code));
    }

    private sealed class FailingAuditWriter : IAuditWriter
    {
        public Task WriteStaffAuditAsync(string action, string targetType, string? targetId, string? targetUserId, string? detailsJson, CancellationToken ct = default)
            => throw new InvalidOperationException("Simulated audit failure");
    }
}
