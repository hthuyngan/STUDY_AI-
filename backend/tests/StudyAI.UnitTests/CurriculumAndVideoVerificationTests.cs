using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Api.Features.Content;
using StudyAI.Api.Features.Learner;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Content.Topics;
using StudyAI.Application.Features.Content.Videos;
using StudyAI.Application.Features.Learner.Curriculum;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Authentication;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

public class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

    public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
    {
        _responder = responder;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(_responder(request));
    }
}

public class FakeVideoVerificationService : IVideoVerificationService
{
    public Task<VideoPreviewResponseDto> VerifyVideoUrlAsync(string url, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new VideoPreviewResponseDto
        {
            IsValid = true,
            Provider = "youtube",
            VideoId = "xtYqUS8_pZM",
            Title = "Bài 1. Mệnh Đề Toán Học",
            ChannelName = "Thầy Nguyễn Phan Tiến",
            EmbedAllowed = true,
            EmbedUrl = "https://www.youtube-nocookie.com/embed/xtYqUS8_pZM",
            AttributionText = "Nguồn: YouTube / Kênh Thầy Nguyễn Phan Tiến"
        });
    }
}

public class CurriculumAndVideoVerificationTests
{
    private StudyAIDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new StudyAIDbContext(options);
    }

    private static ClaimsPrincipal CreateUserPrincipal(string userId, string role, bool isReviewer = false)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Role, role)
        };
        if (isReviewer) claims.Add(new Claim("reviewer", "true"));
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    private static IAuditWriter CreateAuditWriter(StudyAIDbContext db, ClaimsPrincipal? principal = null)
    {
        var httpContext = new DefaultHttpContext();
        if (principal != null) httpContext.User = principal;
        var accessor = new HttpContextAccessor { HttpContext = httpContext };
        return new AuditWriter(db, new CurrentUser(accessor), new SystemClock(), new IdGenerator());
    }

    [Fact]
    public async Task VideoVerification_RejectsNonHttpsUrl()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var httpClient = new HttpClient(handler);
        var service = new VideoVerificationService(httpClient, NullLogger<VideoVerificationService>.Instance);

        var result = await service.VerifyVideoUrlAsync("http://www.youtube.com/watch?v=xtYqUS8_pZM");

        Assert.False(result.IsValid);
        Assert.Contains("https://", result.ErrorMessage);
    }

    [Fact]
    public async Task VideoVerification_RejectsDisallowedHost()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var httpClient = new HttpClient(handler);
        var service = new VideoVerificationService(httpClient, NullLogger<VideoVerificationService>.Instance);

        var result = await service.VerifyVideoUrlAsync("https://vimeo.com/12345678");

        Assert.False(result.IsValid);
        Assert.Contains("không nằm trong danh sách được phép", result.ErrorMessage);
    }

    [Fact]
    public async Task VideoVerification_VerifiesKhanAcademyUrl()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var httpClient = new HttpClient(handler);
        var service = new VideoVerificationService(httpClient, NullLogger<VideoVerificationService>.Instance);

        var result = await service.VerifyVideoUrlAsync("https://vi.khanacademy.org/math/toan-lop-10-vietnam");

        Assert.True(result.IsValid);
        Assert.Equal("khan_academy", result.Provider);
        Assert.False(result.EmbedAllowed);
        Assert.Contains("Khan Academy Vietnam", result.AttributionText);
    }

    [Fact]
    public async Task VideoVerification_VerifiesYouTubeUrl_WithValidOEmbedResponse()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                title = "Bài 1. Mệnh Đề Toán Học",
                author_name = "Thầy Nguyễn Phan Tiến",
                thumbnail_url = "https://i.ytimg.com/vi/xtYqUS8_pZM/hqdefault.jpg"
            }))
        });

        var httpClient = new HttpClient(handler);
        var service = new VideoVerificationService(httpClient, NullLogger<VideoVerificationService>.Instance);

        var result = await service.VerifyVideoUrlAsync("https://www.youtube.com/watch?v=xtYqUS8_pZM");

        Assert.True(result.IsValid);
        Assert.Equal("youtube", result.Provider);
        Assert.Equal("xtYqUS8_pZM", result.VideoId);
        Assert.Equal("Bài 1. Mệnh Đề Toán Học", result.Title);
        Assert.Equal("Thầy Nguyễn Phan Tiến", result.ChannelName);
        Assert.True(result.EmbedAllowed);
        Assert.Equal("https://www.youtube-nocookie.com/embed/xtYqUS8_pZM", result.EmbedUrl);
    }

    [Fact]
    public async Task CurriculumController_GetChapterDetail_ReturnsActiveChapterAndPublishedLessons()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());

        var sub = new ContentSubject { Id = "sub_math10", Code = "MATH10", Name = "Toán 10", Grade = "10", IsActive = true };
        var chap = new ContentChapter { Id = "chap_1", SubjectId = sub.Id, Title = "Chương 1", IsActive = true, Status = "published" };
        var top = new ContentTopic { Id = "top_1", ChapterId = chap.Id, Title = "Chủ đề 1", IsActive = true };
        var lesPub = new ContentLesson { Id = "les_1", ChapterId = chap.Id, TopicId = top.Id, Title = "Bài 1", Slug = "bai-1", Status = "published", AuthorId = "u1" };
        var lesDraft = new ContentLesson { Id = "les_2", ChapterId = chap.Id, TopicId = top.Id, Title = "Bài 2", Slug = "bai-2", Status = "draft", AuthorId = "u1" };

        db.ContentSubjects.Add(sub);
        db.ContentChapters.Add(chap);
        db.ContentTopics.Add(top);
        db.ContentLessons.AddRange(lesPub, lesDraft);
        await db.SaveChangesAsync();

        var auditWriter = CreateAuditWriter(db);
        var service = new LearnerCurriculumService(db, auditWriter, null!, NullLogger<LearnerCurriculumService>.Instance);
        var controller = new LearnerCurriculumController(service);
        var result = await controller.GetChapterDetail(chap.Id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<LearnerChapterDto>(okResult.Value);
        Assert.Equal(chap.Id, dto.Id);
        Assert.Single(dto.Lessons);
        Assert.Equal("Bài 1", dto.Lessons[0].Title);
    }

    [Fact]
    public async Task CurriculumController_GetLessonVideos_ReturnsOnlyPublishedVideos()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());

        var sub = new ContentSubject { Id = "sub_math10", Code = "MATH10", Name = "Toán 10", Grade = "10", IsActive = true };
        var chap = new ContentChapter { Id = "chap_1", SubjectId = sub.Id, Title = "Chương 1", IsActive = true };
        var les = new ContentLesson { Id = "les_1", ChapterId = chap.Id, Title = "Bài 1", Slug = "bai-1", Status = "published", AuthorId = "u1" };

        var vid1 = new ContentLessonVideo
        {
            Id = "vid_1",
            LessonId = les.Id,
            Title = "Video 1",
            SourceUrl = "https://youtube.com/watch?v=xtYqUS8_pZM",
            EmbedUrl = "https://www.youtube-nocookie.com/embed/xtYqUS8_pZM",
            YouTubeVideoId = "xtYqUS8_pZM",
            ChannelName = "Thầy Tiến",
            IsPrimary = true,
            IsPublished = true,
            VerificationStatus = "verified"
        };
        var vid2 = new ContentLessonVideo
        {
            Id = "vid_2",
            LessonId = les.Id,
            Title = "Video Draft",
            SourceUrl = "https://youtube.com/watch?v=dummy",
            IsPublished = false,
            VerificationStatus = "pending"
        };

        db.ContentSubjects.Add(sub);
        db.ContentChapters.Add(chap);
        db.ContentLessons.Add(les);
        db.ContentLessonVideos.AddRange(vid1, vid2);
        await db.SaveChangesAsync();

        var auditWriter = CreateAuditWriter(db);
        var service = new LearnerCurriculumService(db, auditWriter, null!, NullLogger<LearnerCurriculumService>.Instance);
        var controller = new LearnerCurriculumController(service);
        var result = await controller.GetLessonVideos(les.Id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsType<List<LearnerVideoDto>>(okResult.Value);
        Assert.Single(list);
        Assert.Equal("Video 1", list[0].Title);
        Assert.Equal("Thầy Tiến", list[0].ChannelName);
        Assert.True(list[0].IsPrimary);
    }

    [Fact]
    public async Task ContentController_ReorderTopics_UpdatesOrderIndicesAtomically()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());

        var chap = new ContentChapter { Id = "ch_1", SubjectId = "sub_1", Title = "Chương 1", IsActive = true };
        var t1 = new ContentTopic { Id = "top_1", ChapterId = chap.Id, Title = "Chủ đề 1", OrderIndex = 1 };
        var t2 = new ContentTopic { Id = "top_2", ChapterId = chap.Id, Title = "Chủ đề 2", OrderIndex = 2 };

        db.ContentChapters.Add(chap);
        db.ContentTopics.AddRange(t1, t2);
        await db.SaveChangesAsync();

        var userPrincipal = CreateUserPrincipal("admin_1", "admin");
        var auditWriter = CreateAuditWriter(db, userPrincipal);
        var topicService = new ContentTopicsService(db, auditWriter, new SystemClock(), new IdGenerator());
        var controller = new ContentTopicsController(topicService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = userPrincipal }
            }
        };

        var req = new ReorderTopicsRequestDto
        {
            ChapterId = chap.Id,
            TopicIds = new List<string> { "top_2", "top_1" }
        };

        var result = await controller.ReorderTopics(req);
        Assert.IsType<OkObjectResult>(result);

        var updatedT2 = await db.ContentTopics.FindAsync("top_2");
        var updatedT1 = await db.ContentTopics.FindAsync("top_1");
        Assert.Equal(1, updatedT2!.OrderIndex);
        Assert.Equal(2, updatedT1!.OrderIndex);
    }

    [Fact]
    public async Task ContentController_PreviewVideoMetadata_ReturnsVerifiedInformation()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());

        var fakeVerifier = new FakeVideoVerificationService();
        var userPrincipal = CreateUserPrincipal("admin_1", "admin");
        var auditWriter = CreateAuditWriter(db, userPrincipal);
        var videoService = new ContentVideosService(db, auditWriter, new SystemClock(), new IdGenerator(), fakeVerifier);
        var controller = new ContentVideosController(videoService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = userPrincipal }
            }
        };

        var result = await controller.PreviewVideoMetadata(new VideoPreviewRequestDto
        {
            Url = "https://www.youtube.com/watch?v=xtYqUS8_pZM"
        }, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var preview = Assert.IsType<VideoPreviewResponseDto>(okResult.Value);
        Assert.True(preview.IsValid);
        Assert.Equal("xtYqUS8_pZM", preview.VideoId);
        Assert.Equal("Thầy Nguyễn Phan Tiến", preview.ChannelName);
    }
}
