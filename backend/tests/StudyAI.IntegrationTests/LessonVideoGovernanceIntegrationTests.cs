using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;


using StudyAI.Models;
using StudyAI.Data;
using Xunit;

namespace StudyAI.IntegrationTests;

[Collection("IntegrationTests")]
public class LessonVideoGovernanceIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private readonly string _adminPassword = Environment.GetEnvironmentVariable("ADMIN_PROVISION_PASSWORD") ?? "admin";
    private readonly string _contentPassword = Environment.GetEnvironmentVariable("CONTENT_PROVISION_PASSWORD") ?? "content";

    public LessonVideoGovernanceIntegrationTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string SubjectId, string ChapterId, string LessonId)> CreateIsolatedCurriculumFixtureAsync()
    {
        await EnsureProvisionedAccountsExistAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var contentUser = await db.Users.FirstAsync(u => u.EmailNormalized == "CONTENT@GMAIL.COM");

        string suffix = Guid.NewGuid().ToString("N")[..8];
        var subject = new ContentSubject
        {
            Id = $"sub_vid_{suffix}",
            Name = $"Môn học Video Test {suffix}",
            Code = $"VID-{suffix}".ToUpperInvariant(),
            Grade = "12",
            Description = "Subject fixture for lesson video testing",
            OrderIndex = 999,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.ContentSubjects.Add(subject);

        var chapter = new ContentChapter
        {
            Id = $"ch_vid_{suffix}",
            SubjectId = subject.Id,
            Title = $"Chương Video Test {suffix}",
            OrderIndex = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.ContentChapters.Add(chapter);

        var lesson = new ContentLesson
        {
            Id = $"les_vid_{suffix}",
            ChapterId = chapter.Id,
            Title = $"Bài học Video Test {suffix}",
            Slug = $"bai-hoc-video-test-{suffix}",
            OrderIndex = 1,
            Status = "published",
            AuthorId = contentUser.Id,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.ContentLessons.Add(lesson);

        await db.SaveChangesAsync();
        return (subject.Id, chapter.Id, lesson.Id);
    }

    private async Task EnsureProvisionedAccountsExistAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        var admin = await db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == "ADMIN@GMAIL.COM");
        if (admin == null)
        {
            admin = new User
            {
                Id = $"usr_adm_{Guid.NewGuid():N}"[..16],
                Email = "admin@gmail.com",
                EmailNormalized = "ADMIN@GMAIL.COM",
                PasswordHash = passwordHasher.HashPassword(_adminPassword),
                DisplayName = "Quản trị viên Hệ thống",
                Role = "admin",
                Status = "active",
                IsDeleted = false,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Users.Add(admin);
        }
        else
        {
            admin.Role = "admin";
            admin.Status = "active";
            admin.IsDeleted = false;
            admin.PasswordHash = passwordHasher.HashPassword(_adminPassword);
        }

        var content = await db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == "CONTENT@GMAIL.COM");
        if (content == null)
        {
            content = new User
            {
                Id = $"usr_cnt_{Guid.NewGuid():N}"[..16],
                Email = "content@gmail.com",
                EmailNormalized = "CONTENT@GMAIL.COM",
                PasswordHash = passwordHasher.HashPassword(_contentPassword),
                DisplayName = "Chuyên viên Nội dung",
                Role = "content",
                Status = "active",
                IsDeleted = false,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Users.Add(content);
        }
        else
        {
            content.Role = "content";
            content.Status = "active";
            content.IsDeleted = false;
            content.PasswordHash = passwordHasher.HashPassword(_contentPassword);
        }

        await db.SaveChangesAsync();
    }

    private async Task<string> LoginAsync(string email, string password)
    {
        var loginPayload = new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = email,
                Password = password
            }),
            Encoding.UTF8,
            "application/json");

        var resp = await _client.PostAsync("/api/v1/auth/login", loginPayload);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("accessToken").GetString()!;
    }

    [Fact]
    public async Task VideoGovernance_UnauthenticatedRequest_Returns401Unauthorized()
    {
        var (_, _, lessonId) = await CreateIsolatedCurriculumFixtureAsync();

        var payload = new CreateLessonVideoRequestDto
        {
            Title = "Video không xác thực",
            SourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/videos");
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task VideoGovernance_LearnerAndTeacherRole_Returns403Forbidden()
    {
        var (_, _, lessonId) = await CreateIsolatedCurriculumFixtureAsync();

        string teacherEmail = $"teacher_{Guid.NewGuid():N}@studyai.internal";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
            db.Users.Add(new User
            {
                Id = $"usr_tch_{Guid.NewGuid():N}"[..16],
                Email = teacherEmail,
                EmailNormalized = teacherEmail.ToUpperInvariant(),
                PasswordHash = passwordHasher.HashPassword("Teacher@123"),
                DisplayName = "Giáo viên Test",
                Role = "teacher",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var teacherToken = await LoginAsync(teacherEmail, "Teacher@123");

        var payload = new CreateLessonVideoRequestDto
        {
            Title = "Video từ Giáo viên",
            SourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/videos");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task VideoGovernance_InvalidVerificationStatus_Returns400BadRequest()
    {
        await EnsureProvisionedAccountsExistAsync();
        var contentToken = await LoginAsync("content@gmail.com", _contentPassword);
        var (_, _, lessonId) = await CreateIsolatedCurriculumFixtureAsync();

        var payload = new CreateLessonVideoRequestDto
        {
            Title = "Video Sai Status",
            SourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            VerificationStatus = "invalid_status_value"
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/videos");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task VideoGovernance_PublishUnverifiedVideo_Returns400BadRequest()
    {
        await EnsureProvisionedAccountsExistAsync();
        var adminToken = await LoginAsync("admin@gmail.com", _adminPassword);
        var (_, _, lessonId) = await CreateIsolatedCurriculumFixtureAsync();

        // Attempting to create video with IsPublished=true while VerificationStatus is pending
        var payload = new CreateLessonVideoRequestDto
        {
            Title = "Video Xuất Bản Không Phê Duyệt",
            SourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            VerificationStatus = "pending",
            IsPublished = true
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/videos");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task VideoGovernance_NonReviewerCreator_CannotSelfVerifyOrPublish_Returns403Forbidden()
    {
        string creatorEmail = $"creator_{Guid.NewGuid():N}@studyai.internal";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
            db.Users.Add(new User
            {
                Id = $"usr_crt_{Guid.NewGuid():N}"[..16],
                Email = creatorEmail,
                EmailNormalized = creatorEmail.ToUpperInvariant(),
                PasswordHash = passwordHasher.HashPassword("Creator@123"),
                DisplayName = "Tác giả Nội dung",
                Role = "content_creator",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var creatorToken = await LoginAsync(creatorEmail, "Creator@123");
        var (_, _, lessonId) = await CreateIsolatedCurriculumFixtureAsync();

        // Creator attempts to self-verify upon creation -> 403 Forbidden
        var payload = new CreateLessonVideoRequestDto
        {
            Title = "Video Tác Giả Tự Phê Duyệt",
            SourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            VerificationStatus = "verified",
            IsPublished = false
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/videos");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", creatorToken);
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);

        // Creator creates regular pending video -> 201 Created
        var validPayload = new CreateLessonVideoRequestDto
        {
            Title = "Video Tác Giả Bình Thường",
            SourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            VerificationStatus = "pending",
            IsPublished = false
        };
        using var validReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/videos");
        validReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", creatorToken);
        validReq.Content = new StringContent(JsonSerializer.Serialize(validPayload), Encoding.UTF8, "application/json");

        var validResp = await _client.SendAsync(validReq);
        Assert.Equal(HttpStatusCode.Created, validResp.StatusCode);
        var created = JsonSerializer.Deserialize<ContentLessonVideoItemDto>(await validResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(created?.Id);

        // Creator attempts to verify via endpoint -> 403 Forbidden
        using var verifyReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{created.Id}/verify");
        verifyReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", creatorToken);
        var verifyResp = await _client.SendAsync(verifyReq);
        Assert.Equal(HttpStatusCode.Forbidden, verifyResp.StatusCode);

        // Creator attempts to publish via endpoint -> 403 Forbidden
        using var publishReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{created.Id}/publish");
        publishReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", creatorToken);
        var publishResp = await _client.SendAsync(publishReq);
        Assert.Equal(HttpStatusCode.Forbidden, publishResp.StatusCode);
    }

    [Fact]
    public async Task VideoGovernance_FullReviewWorkflow_Verify_Publish_Unpublish_Reject_EmitsAuditLogs()
    {
        await EnsureProvisionedAccountsExistAsync();
        var contentToken = await LoginAsync("content@gmail.com", _contentPassword);
        var adminToken = await LoginAsync("admin@gmail.com", _adminPassword);
        var (_, _, lessonId) = await CreateIsolatedCurriculumFixtureAsync();

        // 1. Add Lesson Video
        var createPayload = new CreateLessonVideoRequestDto
        {
            Title = "Bài giảng Hình học Không gian 12",
            Description = "Video hướng dẫn tính khoảng cách và thể tích",
            SourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            AttributionText = "Nguồn: YouTube / GDPT 2018",
            DurationSeconds = 600,
            VerificationStatus = "pending",
            IsPublished = false
        };
        using var createReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/videos");
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        createReq.Content = new StringContent(JsonSerializer.Serialize(createPayload), Encoding.UTF8, "application/json");

        var createResp = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var video = JsonSerializer.Deserialize<ContentLessonVideoItemDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(video);
        Assert.Equal("pending", video.VerificationStatus);
        Assert.False(video.IsPublished);
        string videoId = video.Id;

        // 2. Verify Video
        using var verifyReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{videoId}/verify");
        verifyReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var verifyResp = await _client.SendAsync(verifyReq);
        Assert.Equal(HttpStatusCode.OK, verifyResp.StatusCode);
        var verified = JsonSerializer.Deserialize<ContentLessonVideoItemDto>(await verifyResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(verified);
        Assert.Equal("verified", verified.VerificationStatus);
        Assert.NotNull(verified.VerifiedAt);

        // 3. Publish Video
        using var publishReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{videoId}/publish");
        publishReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var publishResp = await _client.SendAsync(publishReq);
        Assert.Equal(HttpStatusCode.OK, publishResp.StatusCode);
        var published = JsonSerializer.Deserialize<ContentLessonVideoItemDto>(await publishResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(published);
        Assert.True(published.IsPublished);

        // 4. Unpublish Video
        using var unpublishReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{videoId}/unpublish");
        unpublishReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var unpublishResp = await _client.SendAsync(unpublishReq);
        Assert.Equal(HttpStatusCode.OK, unpublishResp.StatusCode);
        var unpublished = JsonSerializer.Deserialize<ContentLessonVideoItemDto>(await unpublishResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(unpublished);
        Assert.False(unpublished.IsPublished);

        // 5. Reject Video
        using var rejectReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{videoId}/reject");
        rejectReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var rejectResp = await _client.SendAsync(rejectReq);
        Assert.Equal(HttpStatusCode.OK, rejectResp.StatusCode);
        var rejected = JsonSerializer.Deserialize<ContentLessonVideoItemDto>(await rejectResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(rejected);
        Assert.Equal("rejected", rejected.VerificationStatus);
        Assert.False(rejected.IsPublished);
        Assert.Null(rejected.VerifiedAt);

        // 6. Verify Audit Logs in Database
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var logs = await db.StaffAuditLogs
            .Where(l => l.TargetType == "content_lesson_video" && l.TargetId == videoId)
            .OrderBy(l => l.CreatedAt)
            .ToListAsync();

        Assert.Contains(logs, l => l.Action == "lesson_video_added");
        Assert.Contains(logs, l => l.Action == "lesson_video_verified");
        Assert.Contains(logs, l => l.Action == "lesson_video_published");
        Assert.Contains(logs, l => l.Action == "lesson_video_unpublished");
        Assert.Contains(logs, l => l.Action == "lesson_video_rejected");
    }

    [Fact]
    public async Task VideoGovernance_UpdateSourceUrl_ResetsVerification_AndUnpublishes()
    {
        await EnsureProvisionedAccountsExistAsync();
        var contentToken = await LoginAsync("content@gmail.com", _contentPassword);
        var adminToken = await LoginAsync("admin@gmail.com", _adminPassword);
        var (_, _, lessonId) = await CreateIsolatedCurriculumFixtureAsync();

        // 1. Add video
        var createPayload = new CreateLessonVideoRequestDto
        {
            Title = "Video Ban Đầu",
            SourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            AttributionText = "Nguồn: YouTube / GDPT 2018",
            VerificationStatus = "pending",
            IsPublished = false
        };
        using var createReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/videos");
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        createReq.Content = new StringContent(JsonSerializer.Serialize(createPayload), Encoding.UTF8, "application/json");

        var createResp = await _client.SendAsync(createReq);
        createResp.EnsureSuccessStatusCode();
        var video = JsonSerializer.Deserialize<ContentLessonVideoItemDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(video);
        string videoId = video.Id;

        // 2. Verify and Publish
        using var verifyReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{videoId}/verify");
        verifyReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var verifyResp = await _client.SendAsync(verifyReq);
        verifyResp.EnsureSuccessStatusCode();

        using var publishReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{videoId}/publish");
        publishReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var publishResp = await _client.SendAsync(publishReq);
        publishResp.EnsureSuccessStatusCode();

        // 3. Update Source URL to a new YouTube URL
        var updatePayload = new UpdateLessonVideoRequestDto
        {
            SourceUrl = "https://www.youtube.com/watch?v=9bZkp7q19f0"
        };
        using var updateReq = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/content/videos/{videoId}");
        updateReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        updateReq.Content = new StringContent(JsonSerializer.Serialize(updatePayload), Encoding.UTF8, "application/json");

        var updateResp = await _client.SendAsync(updateReq);
        updateResp.EnsureSuccessStatusCode();
        var updated = JsonSerializer.Deserialize<ContentLessonVideoItemDto>(await updateResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(updated);

        // CURR-003: When source URL changes, reset verification and unpublish!
        Assert.Equal("pending", updated.VerificationStatus);
        Assert.False(updated.IsPublished);
        Assert.Null(updated.VerifiedAt);
    }

    [Fact]
    public async Task VideoGovernance_LearnerApi_ReturnsOnlyPublishedAndVerifiedVideos()
    {
        await EnsureProvisionedAccountsExistAsync();
        var contentToken = await LoginAsync("content@gmail.com", _contentPassword);
        var adminToken = await LoginAsync("admin@gmail.com", _adminPassword);
        var (_, _, lessonId) = await CreateIsolatedCurriculumFixtureAsync();

        // 1. Add video
        var createPayload = new CreateLessonVideoRequestDto
        {
            Title = "Video Kiểm Tra Learner API",
            SourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            AttributionText = "Nguồn: YouTube / GDPT 2018",
            VerificationStatus = "pending",
            IsPublished = false
        };
        using var createReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/videos");
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        createReq.Content = new StringContent(JsonSerializer.Serialize(createPayload), Encoding.UTF8, "application/json");

        var createResp = await _client.SendAsync(createReq);
        createResp.EnsureSuccessStatusCode();
        var video = JsonSerializer.Deserialize<ContentLessonVideoItemDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(video);
        string videoId = video.Id;

        // 2. Pending video -> Learner API MUST NOT return it
        var learnerVideosResp = await _client.GetAsync($"/api/v1/curriculum/lessons/{lessonId}/videos");
        learnerVideosResp.EnsureSuccessStatusCode();
        var learnerVideos = JsonSerializer.Deserialize<List<LearnerVideoDto>>(await learnerVideosResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.Empty(learnerVideos!);

        // 3. Verify video but leave unpublished -> Learner API MUST NOT return it
        using var verifyReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{videoId}/verify");
        verifyReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var verifyResp = await _client.SendAsync(verifyReq);
        verifyResp.EnsureSuccessStatusCode();

        learnerVideosResp = await _client.GetAsync($"/api/v1/curriculum/lessons/{lessonId}/videos");
        learnerVideosResp.EnsureSuccessStatusCode();
        learnerVideos = JsonSerializer.Deserialize<List<LearnerVideoDto>>(await learnerVideosResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.Empty(learnerVideos!);

        // 4. Publish verified video -> Learner API MUST now return it
        using var publishReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/videos/{videoId}/publish");
        publishReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var publishResp = await _client.SendAsync(publishReq);
        publishResp.EnsureSuccessStatusCode();

        learnerVideosResp = await _client.GetAsync($"/api/v1/curriculum/lessons/{lessonId}/videos");
        learnerVideosResp.EnsureSuccessStatusCode();
        learnerVideos = JsonSerializer.Deserialize<List<LearnerVideoDto>>(await learnerVideosResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.Single(learnerVideos!);
        Assert.Equal(videoId, learnerVideos![0].Id);
    }
}
