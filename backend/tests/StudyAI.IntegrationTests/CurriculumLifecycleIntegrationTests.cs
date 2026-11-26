using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
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

    [Fact]
    public async Task EditionAwareLearnerProjection_MultiSubjectIsolation_OptionalVideo_And_PublishedChain_AreEnforced()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var admin = await Login("admin@studyai.internal", "Admin@123456");
        var reviewer = await Login("content@studyai.internal", "Content@123456");

        var grade = await Send<GradeLevelDto>(HttpMethod.Post, "/api/v1/content/catalog/grades", admin, new { code = $"GM{suffix}", name = $"Khối {suffix}", orderIndex = 1 });
        var histSub = await Send<CatalogSubjectDto>(HttpMethod.Post, "/api/v1/content/catalog/subjects", admin, new { code = $"HIST{suffix}", name = $"Lịch sử {suffix}" });
        var bioSub = await Send<CatalogSubjectDto>(HttpMethod.Post, "/api/v1/content/catalog/subjects", admin, new { code = $"BIO{suffix}", name = $"Sinh học {suffix}" });

        var histCur = await Send<CurriculumDto>(HttpMethod.Post, "/api/v1/content/catalog/curricula", admin, new { code = $"CH{suffix}", gradeLevelId = grade.Id, subjectId = histSub.Id, name = $"CT Sử {suffix}", framework = "CT2018" });
        histCur = await Send<CurriculumDto>(HttpMethod.Post, $"/api/v1/content/catalog/curricula/{histCur.Id}/publish", admin, new { histCur.RowVersion });
        var histEd = await Send<CurriculumEditionDto>(HttpMethod.Post, "/api/v1/content/catalog/editions", admin, new { code = $"EH{suffix}", curriculumId = histCur.Id, editionName = $"Bản Sử {suffix}" });
        histEd = await Send<CurriculumEditionDto>(HttpMethod.Post, $"/api/v1/content/catalog/editions/{histEd.Id}/publish", admin, new { histEd.RowVersion });

        var bioCur = await Send<CurriculumDto>(HttpMethod.Post, "/api/v1/content/catalog/curricula", admin, new { code = $"CB{suffix}", gradeLevelId = grade.Id, subjectId = bioSub.Id, name = $"CT Sinh {suffix}", framework = "CT2018" });
        bioCur = await Send<CurriculumDto>(HttpMethod.Post, $"/api/v1/content/catalog/curricula/{bioCur.Id}/publish", admin, new { bioCur.RowVersion });
        var bioEd = await Send<CurriculumEditionDto>(HttpMethod.Post, "/api/v1/content/catalog/editions", admin, new { code = $"EB{suffix}", curriculumId = bioCur.Id, editionName = $"Bản Sinh {suffix}" });
        bioEd = await Send<CurriculumEditionDto>(HttpMethod.Post, $"/api/v1/content/catalog/editions/{bioEd.Id}/publish", admin, new { bioEd.RowVersion });

        var histCh = await Send<ContentChapterItemDto>(HttpMethod.Post, "/api/v1/content/chapters", admin, new { curriculumEditionId = histEd.Id, code = "HCH1", title = "Chương Sử 1", orderIndex = 1 });
        histCh = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{histCh.Id}/submit-review", admin, new { histCh.RowVersion });
        histCh = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{histCh.Id}/approve", reviewer, new { histCh.RowVersion });
        histCh = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{histCh.Id}/publish", reviewer, new { histCh.RowVersion });

        var bioCh = await Send<ContentChapterItemDto>(HttpMethod.Post, "/api/v1/content/chapters", admin, new { curriculumEditionId = bioEd.Id, code = "BCH1", title = "Chương Sinh 1", orderIndex = 1 });
        bioCh = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{bioCh.Id}/submit-review", admin, new { bioCh.RowVersion });
        bioCh = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{bioCh.Id}/approve", reviewer, new { bioCh.RowVersion });
        bioCh = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{bioCh.Id}/publish", reviewer, new { bioCh.RowVersion });

        var histPubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, "/api/v1/content/lessons", admin, new { chapterId = histCh.Id, code = "HL1", title = "Bài Sử Published", slug = $"hl1-{suffix}", orderIndex = 1 });
        histPubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{histPubLesson.Id}/submit-review", admin, new { histPubLesson.RowVersion });
        histPubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{histPubLesson.Id}/approve", reviewer, new { histPubLesson.RowVersion });
        histPubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{histPubLesson.Id}/publish", reviewer, new { histPubLesson.RowVersion });

        var histDraftLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, "/api/v1/content/lessons", admin, new { chapterId = histCh.Id, code = "HL2", title = "Bài Sử Draft", slug = $"hl2-{suffix}", orderIndex = 2 });

        var bioPubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, "/api/v1/content/lessons", admin, new { chapterId = bioCh.Id, code = "BL1", title = "Bài Sinh Published", slug = $"bl1-{suffix}", orderIndex = 1 });
        bioPubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{bioPubLesson.Id}/submit-review", admin, new { bioPubLesson.RowVersion });
        bioPubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{bioPubLesson.Id}/approve", reviewer, new { bioPubLesson.RowVersion });
        bioPubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{bioPubLesson.Id}/publish", reviewer, new { bioPubLesson.RowVersion });

        // Exact-once & multi-subject isolation
        var histResp = await _client.GetFromJsonAsync<List<LearnerChapterDto>>($"/api/v1/curriculum/editions/{histEd.Id}/chapters", _json);
        Assert.NotNull(histResp);
        Assert.Single(histResp);
        Assert.Equal(grade.Id, histResp[0].GradeLevelId);
        Assert.Equal(histSub.Id, histResp[0].CatalogSubjectId);
        Assert.Equal(histCur.Id, histResp[0].CurriculumId);
        Assert.Equal(histEd.Id, histResp[0].CurriculumEditionId);
        Assert.Single(histResp[0].Lessons);
        Assert.Equal(histPubLesson.Id, histResp[0].Lessons[0].Id);
        Assert.DoesNotContain(histResp[0].Lessons, l => l.Id == histDraftLesson.Id || l.Id == bioPubLesson.Id);

        // Optional video: published lesson with 0 videos succeeds and returns empty videos list
        var detailResp = await _client.GetFromJsonAsync<LearnerLessonDetailDto>($"/api/v1/curriculum/lessons/{histPubLesson.Id}", _json);
        Assert.NotNull(detailResp);
        Assert.Equal(histEd.Id, detailResp.CurriculumEditionId);
        Assert.Empty(detailResp.Videos);

        // Draft lesson is 404
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/v1/curriculum/lessons/{histDraftLesson.Id}")).StatusCode);

        // Archiving parent edition hides its published lesson
        await Send<CurriculumEditionDto>(HttpMethod.Post, $"/api/v1/content/catalog/editions/{histEd.Id}/archive", admin, new { histEd.RowVersion });
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/v1/curriculum/editions/{histEd.Id}/chapters")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/v1/curriculum/lessons/{histPubLesson.Id}")).StatusCode);
    }

    [Fact]
    public async Task Remediation_DuplicateSlugOrCode_And_DeleteLessonGuards_EnforceConflictAndDraftOnly()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var admin = await Login("admin@studyai.internal", "Admin@123456");
        var reviewer = await Login("content@studyai.internal", "Content@123456");

        var grade = await Send<GradeLevelDto>(HttpMethod.Post, "/api/v1/content/catalog/grades", admin, new { code = $"GR{suffix}", name = $"Khối {suffix}", orderIndex = 1 });
        var subject = await Send<CatalogSubjectDto>(HttpMethod.Post, "/api/v1/content/catalog/subjects", admin, new { code = $"SR{suffix}", name = $"Môn {suffix}" });
        var curriculum = await Send<CurriculumDto>(HttpMethod.Post, "/api/v1/content/catalog/curricula", admin, new { code = $"CR{suffix}", gradeLevelId = grade.Id, subjectId = subject.Id, name = $"CT {suffix}", framework = "CT2018" });
        curriculum = await Send<CurriculumDto>(HttpMethod.Post, $"/api/v1/content/catalog/curricula/{curriculum.Id}/publish", admin, new { curriculum.RowVersion });
        var edition = await Send<CurriculumEditionDto>(HttpMethod.Post, "/api/v1/content/catalog/editions", admin, new { code = $"ER{suffix}", curriculumId = curriculum.Id, editionName = $"Bản {suffix}" });
        edition = await Send<CurriculumEditionDto>(HttpMethod.Post, $"/api/v1/content/catalog/editions/{edition.Id}/publish", admin, new { edition.RowVersion });

        var ch = await Send<ContentChapterItemDto>(HttpMethod.Post, "/api/v1/content/chapters", admin, new { curriculumEditionId = edition.Id, code = "CHR1", title = "Chương R1", orderIndex = 1 });
        ch = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch.Id}/submit-review", admin, new { ch.RowVersion });
        ch = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch.Id}/approve", reviewer, new { ch.RowVersion });
        ch = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{ch.Id}/publish", reviewer, new { ch.RowVersion });

        // Duplicate chapter code in same edition returns 409 Conflict
        using (var dupChapter = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/chapters")
        {
            Content = JsonContent.Create(new { curriculumEditionId = edition.Id, code = "CHR1", title = "Chương Trùng", orderIndex = 2 })
        })
        {
            dupChapter.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin);
            Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(dupChapter)).StatusCode);
        }

        // Create lesson, verify duplicate slug in same chapter returns 409
        var sharedSlug = $"rem-slug-{suffix.ToLowerInvariant()}";
        var l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, "/api/v1/content/lessons", admin, new { chapterId = ch.Id, code = "LR1", title = "Bài R1", slug = sharedSlug, orderIndex = 1 });

        using (var dupSlug = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Content = JsonContent.Create(new { chapterId = ch.Id, code = "LR2", title = "Bài R2", slug = sharedSlug, orderIndex = 2 })
        })
        {
            dupSlug.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin);
            Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(dupSlug)).StatusCode);
        }

        // Publish l1 -> delete must return 400 (non-draft cannot be deleted)
        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/submit-review", admin, new { l1.RowVersion });
        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/approve", reviewer, new { l1.RowVersion });
        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/publish", reviewer, new { l1.RowVersion });

        using (var delPublished = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/content/lessons/{l1.Id}"))
        {
            delPublished.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin);
            Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(delPublished)).StatusCode);
        }

        // Archive l1 -> new lesson can reuse slug, then reactivating l1 returns 409 Conflict
        l1 = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/archive", reviewer, new { l1.RowVersion });
        var l2 = await Send<ContentLessonDetailDto>(HttpMethod.Post, "/api/v1/content/lessons", admin, new { chapterId = ch.Id, code = "LR3", title = "Bài R3", slug = sharedSlug, orderIndex = 3 });

        using (var reactivateConflict = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{l1.Id}/reactivate")
        {
            Content = JsonContent.Create(new { l1.RowVersion })
        })
        {
            reactivateConflict.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin);
            var reactivateResp = await _client.SendAsync(reactivateConflict);
            var reactivateBody = await reactivateResp.Content.ReadAsStringAsync();
            Assert.True(reactivateResp.StatusCode == HttpStatusCode.Conflict, $"Expected 409 Conflict, got {(int)reactivateResp.StatusCode}: {reactivateBody}");
        }

        // Clean draft lesson l2 can be deleted
        using (var delDraft = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/content/lessons/{l2.Id}"))
        {
            delDraft.Headers.Authorization = new AuthenticationHeaderValue("Bearer", admin);
            var delResp = await _client.SendAsync(delDraft);
            Assert.True(delResp.IsSuccessStatusCode, $"Expected 2xx deleting clean draft lesson, got {(int)delResp.StatusCode}");
        }
    }

    [Fact]
    public async Task F04_ConcurrentDuplicateSlug_Returns409_And_F05_ArchiveFirstRetention_Enforced()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var admin = await Login("admin@studyai.internal", "Admin@123456");
        var reviewer = await Login("content@studyai.internal", "Content@123456");

        var grade = await Send<GradeLevelDto>(HttpMethod.Post, "/api/v1/content/catalog/grades", admin, new { code = $"GF{suffix}", name = $"Khối {suffix}", orderIndex = 3 });
        var subject = await Send<CatalogSubjectDto>(HttpMethod.Post, "/api/v1/content/catalog/subjects", admin, new { code = $"SF{suffix}", name = $"Sinh {suffix}" });
        var curriculum = await Send<CurriculumDto>(HttpMethod.Post, "/api/v1/content/catalog/curricula", admin, new { code = $"CF{suffix}", gradeLevelId = grade.Id, subjectId = subject.Id, name = $"CT {suffix}", framework = "CT2018" });
        curriculum = await Send<CurriculumDto>(HttpMethod.Post, $"/api/v1/content/catalog/curricula/{curriculum.Id}/publish", admin, new { curriculum.RowVersion });
        var edition = await Send<CurriculumEditionDto>(HttpMethod.Post, "/api/v1/content/catalog/editions", admin, new { code = $"EF{suffix}", curriculumId = curriculum.Id, editionName = $"Ed {suffix}" });
        edition = await Send<CurriculumEditionDto>(HttpMethod.Post, $"/api/v1/content/catalog/editions/{edition.Id}/publish", admin, new { edition.RowVersion });
        var chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, "/api/v1/content/chapters", admin, new { curriculumEditionId = edition.Id, code = $"CHF{suffix}", title = "Chương F04/F05", orderIndex = 1 });
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/submit-review", admin, new { chapter.RowVersion });
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/approve", reviewer, new { chapter.RowVersion });
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/publish", reviewer, new { chapter.RowVersion });

        var sharedSlug = $"dup-slug-{suffix.ToLowerInvariant()}";
        var t1 = _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", admin) },
            Content = JsonContent.Create(new { chapterId = chapter.Id, code = $"C1{suffix}", title = "Bài A", slug = sharedSlug, orderIndex = 1 })
        });
        var t2 = _client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", admin) },
            Content = JsonContent.Create(new { chapterId = chapter.Id, code = $"C2{suffix}", title = "Bài B", slug = sharedSlug, orderIndex = 2 })
        });
        var responses = await Task.WhenAll(t1, t2);
        var statuses = responses.Select(r => r.StatusCode).OrderBy(s => (int)s).ToArray();
        Assert.Equal([HttpStatusCode.Created, HttpStatusCode.Conflict], statuses);

        var pubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, "/api/v1/content/lessons", admin, new { chapterId = chapter.Id, code = $"PL{suffix}", title = "Bài xuất bản", slug = $"pub-{suffix.ToLowerInvariant()}", orderIndex = 4 });
        pubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{pubLesson.Id}/submit-review", admin, new { pubLesson.RowVersion });
        pubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{pubLesson.Id}/approve", reviewer, new { pubLesson.RowVersion });
        pubLesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{pubLesson.Id}/publish", reviewer, new { pubLesson.RowVersion });
        using (var delDenied = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/content/lessons/{pubLesson.Id}") { Headers = { Authorization = new AuthenticationHeaderValue("Bearer", admin) } })
        {
            Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(delDenied)).StatusCode);
        }

        using var scope = _fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var migrator = db.GetService<IMigrator>();
        try
        {
            await Assert.ThrowsAnyAsync<Exception>(() => migrator.MigrateAsync("20261125023144_AddMultiSubjectCatalogFoundations"));
        }
        finally
        {
            await migrator.MigrateAsync();
        }
    }

    [Fact]
    public async Task F03_DualLinked_CannotBypassUnpublishedAncestor_And_CanonicalQuestionsWorkWithoutLegacySubject()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var admin = await Login("admin@studyai.internal", "Admin@123456");
        var reviewer = await Login("content@studyai.internal", "Content@123456");
        var learner = await Login("learner@studyai.internal", "Learner@123456");

        var grade = await Send<GradeLevelDto>(HttpMethod.Post, "/api/v1/content/catalog/grades", admin, new { code = $"GQ{suffix}", name = $"Khối {suffix}", orderIndex = 4 });
        var subject = await Send<CatalogSubjectDto>(HttpMethod.Post, "/api/v1/content/catalog/subjects", admin, new { code = $"SQ{suffix}", name = $"Địa {suffix}" });
        var curriculum = await Send<CurriculumDto>(HttpMethod.Post, "/api/v1/content/catalog/curricula", admin, new { code = $"CQ{suffix}", gradeLevelId = grade.Id, subjectId = subject.Id, name = $"CT {suffix}", framework = "CT2018" });
        curriculum = await Send<CurriculumDto>(HttpMethod.Post, $"/api/v1/content/catalog/curricula/{curriculum.Id}/publish", admin, new { curriculum.RowVersion });
        var edition = await Send<CurriculumEditionDto>(HttpMethod.Post, "/api/v1/content/catalog/editions", admin, new { code = $"EQ{suffix}", curriculumId = curriculum.Id, editionName = $"Ed {suffix}" });
        edition = await Send<CurriculumEditionDto>(HttpMethod.Post, $"/api/v1/content/catalog/editions/{edition.Id}/publish", admin, new { edition.RowVersion });

        var chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, "/api/v1/content/chapters", admin, new { curriculumEditionId = edition.Id, code = $"CHQ{suffix}", title = "Chương canonical", orderIndex = 1 });
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/submit-review", admin, new { chapter.RowVersion });
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/approve", reviewer, new { chapter.RowVersion });
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/publish", reviewer, new { chapter.RowVersion });

        var lesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, "/api/v1/content/lessons", admin, new { chapterId = chapter.Id, code = $"LQ{suffix}", title = "Bài canonical", slug = $"canon-{suffix.ToLowerInvariant()}", orderIndex = 1 });
        lesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{lesson.Id}/submit-review", admin, new { lesson.RowVersion });
        lesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{lesson.Id}/approve", reviewer, new { lesson.RowVersion });
        lesson = await Send<ContentLessonDetailDto>(HttpMethod.Post, $"/api/v1/content/lessons/{lesson.Id}/publish", reviewer, new { lesson.RowVersion });

        using (var scope = _fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            db.ContentQuestions.Add(new Models.ContentQuestion
            {
                Id = $"q_{suffix.ToLowerInvariant()}",
                LessonId = lesson.Id,
                ChapterId = chapter.Id,
                SubjectId = subject.Id,
                Prompt = "Câu hỏi canonical?",
                OptionsJson = "[\"A1\",\"B2\"]",
                CorrectAnswer = "A1",
                Status = "published",
                OrderIndex = 1
            });
            await db.SaveChangesAsync();
        }

        var qList = await _client.GetAsync($"/api/v1/curriculum/lessons/{lesson.Id}/questions");
        Assert.Equal(HttpStatusCode.OK, qList.StatusCode);
        Assert.Contains($"q_{suffix.ToLowerInvariant()}", await qList.Content.ReadAsStringAsync());

        using (var checkReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/curriculum/lessons/{lesson.Id}/questions/q_{suffix.ToLowerInvariant()}/check")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", learner) },
            Content = JsonContent.Create(new { selectedOption = "A1" })
        })
        {
            var checkResp = await _client.SendAsync(checkReq);
            Assert.Equal(HttpStatusCode.OK, checkResp.StatusCode);
            Assert.Contains("\"isCorrect\":true", await checkResp.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        }

        var edListResp = await _client.GetAsync("/api/v1/curriculum/editions");
        Assert.Equal(HttpStatusCode.OK, edListResp.StatusCode);
        Assert.Contains(edition.Id, await edListResp.Content.ReadAsStringAsync());

        using (var scope = _fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            db.ContentSubjects.Add(new Models.ContentSubject { Id = $"sub_leg_{suffix.ToLowerInvariant()}", Code = $"LEG{suffix}", Name = "Legacy Active", Grade = "12", IsActive = true, OrderIndex = 1 });
            var ch = await db.ContentChapters.FindAsync(chapter.Id);
            ch!.SubjectId = $"sub_leg_{suffix.ToLowerInvariant()}";
            await db.SaveChangesAsync();
        }

        chapter = await Send<ContentChapterItemDto>(HttpMethod.Get, $"/api/v1/content/chapters/{chapter.Id}", admin);
        chapter = await Send<ContentChapterItemDto>(HttpMethod.Post, $"/api/v1/content/chapters/{chapter.Id}/unpublish", reviewer, new { chapter.RowVersion });
        Assert.Equal("approved", chapter.Status);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/v1/curriculum/lessons/{lesson.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/v1/curriculum/lessons/{lesson.Id}/questions")).StatusCode);
    }

    private sealed class FailingAuditWriter : IAuditWriter
    {
        public Task WriteStaffAuditAsync(string action, string targetType, string? targetId, string? targetUserId, string? detailsJson, CancellationToken ct = default)
            => throw new InvalidOperationException("Simulated audit failure");
    }
}
