using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Api.Controllers;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.UnitTests;

public class ContentModerationWorkflowTests
{
    private (StudyAIDbContext Context, ContentController Controller) CreateContextAndController(string role = "content", string userId = "usr_reviewer_1")
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: $"StudyAI_ContentMod_Test_{Guid.NewGuid():N}")
            .Options;

        var context = new StudyAIDbContext(options);

        // Seed author, subject, chapter, and lesson
        var author = new User
        {
            Id = "usr_author_1",
            Email = "author@studyai.edu.vn",
            DisplayName = "Biên soạn Nguyễn Văn A",
            Role = "teacher",
            PasswordHash = "hash"
        };
        context.Users.Add(author);

        if (userId != "usr_author_1")
        {
            var reviewer = new User
            {
                Id = userId,
                Email = $"{userId}@studyai.edu.vn",
                DisplayName = "Kiểm duyệt Lê Văn B",
                Role = role,
                PasswordHash = "hash"
            };
            context.Users.Add(reviewer);
        }

        var subject = new ContentSubject
        {
            Id = "sub_math10",
            Name = "Toán 10",
            Code = "MATH10",
            Grade = "10",
            IsActive = true
        };
        context.ContentSubjects.Add(subject);

        var chapter = new ContentChapter
        {
            Id = "chp_m10_c1",
            SubjectId = "sub_math10",
            Title = "Chương 1: Mệnh đề",
            IsActive = true
        };
        context.ContentChapters.Add(chapter);

        var draftLesson = new ContentLesson
        {
            Id = "les_draft_1",
            ChapterId = "chp_m10_c1",
            Title = "Bài 1: Mệnh đề toán học",
            Slug = "menh-de-toan-hoc",
            Status = "draft",
            AuthorId = "usr_author_1",
            Introduction = "Tổng quan về mệnh đề và mệnh đề chứa biến",
            DefinitionsJson = "[\"Mệnh đề là một câu khẳng định đúng hoặc sai.\"]",
            FormulasJson = "[]",
            ExamplesJson = "[\"Ví dụ 1: 2 là số chẵn.\"]",
            SummaryPointsJson = "[\"Mệnh đề đúng/sai.\"]",
            OrderIndex = 1
        };
        context.ContentLessons.Add(draftLesson);

        var publishedLesson = new ContentLesson
        {
            Id = "les_published_1",
            ChapterId = "chp_m10_c1",
            Title = "Bài 2: Tập hợp và các phép toán",
            Slug = "tap-hop",
            Status = "published",
            AuthorId = "usr_author_1",
            Introduction = "Khái niệm tập hợp",
            DefinitionsJson = "[\"Tập hợp các phần tử\"]",
            OrderIndex = 2
        };
        context.ContentLessons.Add(publishedLesson);

        var publishedQuestion = new ContentQuestion
        {
            Id = "qst_pub_1",
            SubjectId = "sub_math10",
            LessonId = "les_published_1",
            Prompt = "Tập hợp nào sau đây là tập rỗng?",
            OptionsJson = "[\"A. {0}\", \"B. {}\", \"C. {1}\", \"D. {x}\"]",
            CorrectAnswer = "B",
            Difficulty = "nhan_biet",
            Status = "published",
            IsDeleted = false
        };
        context.ContentQuestions.Add(publishedQuestion);

        context.SaveChanges();

        var controller = new ContentController(context);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim("sub", userId),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role)
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };

        return (context, controller);
    }

    [Fact]
    public async Task SubmitReview_TransitionsDraftLessonToInReview()
    {
        var (context, controller) = CreateContextAndController(role: "author", userId: "usr_author_1");

        var result = await controller.SubmitReview("les_draft_1");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var updatedLesson = await context.ContentLessons.FindAsync("les_draft_1");
        Assert.NotNull(updatedLesson);
        Assert.Equal("in-review", updatedLesson.Status);

        var auditLog = await context.StaffAuditLogs.FirstOrDefaultAsync(l => l.TargetId == "les_draft_1");
        Assert.NotNull(auditLog);
        Assert.Equal("lesson_submitted", auditLog.Action);
    }

    [Fact]
    public async Task SubmitReview_OnNonDraftLesson_ReturnsBadRequest()
    {
        var (_, controller) = CreateContextAndController(role: "author", userId: "usr_author_1");

        var result = await controller.SubmitReview("les_published_1");

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ApproveLesson_ByAuthorizedReviewer_TransitionsToPublished()
    {
        var (context, controller) = CreateContextAndController(role: "content");

        // Put lesson into in-review first
        var lesson = await context.ContentLessons.FindAsync("les_draft_1");
        lesson!.Status = "in-review";
        await context.SaveChangesAsync();

        var result = await controller.ApproveLesson("les_draft_1");

        Assert.IsType<OkObjectResult>(result);
        var updated = await context.ContentLessons.FindAsync("les_draft_1");
        Assert.NotNull(updated);
        Assert.Equal("published", updated.Status);

        var auditLog = await context.StaffAuditLogs.FirstOrDefaultAsync(l => l.TargetId == "les_draft_1" && l.Action == "lesson_approved");
        Assert.NotNull(auditLog);
    }

    [Fact]
    public async Task ApproveLesson_ByUnauthorizedUser_ReturnsForbidden()
    {
        var (_, controller) = CreateContextAndController(role: "student");

        var result = await controller.ApproveLesson("les_draft_1");

        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, objResult.StatusCode);
    }

    [Fact]
    public async Task RollbackLesson_WithoutHistoricalRevision_ReturnsConflictWithoutMutation()
    {
        var (context, controller) = CreateContextAndController(role: "content");

        var result = await controller.RollbackLesson("les_published_1");

        Assert.IsType<ConflictObjectResult>(result);
        var updated = await context.ContentLessons.FindAsync("les_published_1");
        Assert.NotNull(updated);
        Assert.Equal("published", updated.Status);

        var rollbackLog = await context.StaffAuditLogs.FirstOrDefaultAsync(l => l.TargetId == "les_published_1" && l.Action == "lesson_rollback");
        Assert.Null(rollbackLog);
    }

    [Fact]
    public async Task RollbackLesson_OnDraftLesson_ReturnsConflict()
    {
        var (_, controller) = CreateContextAndController(role: "content");

        var result = await controller.RollbackLesson("les_draft_1");

        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(409, objResult.StatusCode);
    }

    [Fact]
    public async Task GetApprovals_ReturnsReviewQueueWithHistory()
    {
        var (context, controller) = CreateContextAndController(role: "content");

        var lesson = await context.ContentLessons.FindAsync("les_draft_1");
        lesson!.Status = "in-review";
        await context.SaveChangesAsync();

        var result = await controller.GetApprovals(status: "pending");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var items = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okResult.Value);
        Assert.NotEmpty(items);
    }

    [Fact]
    public async Task GetPublications_ReturnsPublishedLessonsAndQuestions()
    {
        var (_, controller) = CreateContextAndController(role: "content");

        var result = await controller.GetPublications();

        var okResult = Assert.IsType<OkObjectResult>(result);
        var items = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okResult.Value);
        Assert.NotEmpty(items);
    }

    [Fact]
    public async Task GetPublications_ReturnsPublishedBy_AndActiveStatus()
    {
        var (_, controller) = CreateContextAndController(role: "content");

        var result = await controller.GetPublications();

        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var array = doc.RootElement.EnumerateArray().ToList();
        Assert.NotEmpty(array);

        var first = array[0];
        Assert.True(first.TryGetProperty("publishedBy", out var publishedByProp));
        Assert.False(string.IsNullOrWhiteSpace(publishedByProp.GetString()));
        Assert.True(first.TryGetProperty("status", out var statusProp));
        Assert.Equal("active", statusProp.GetString());
    }

    [Fact]
    public async Task RollbackLesson_WithTargetVersion_RestoresHistoricalSnapshot()
    {
        var (context, controller) = CreateContextAndController(role: "content");

        // Seed a historical revision for les_published_1
        var snapshot = new
        {
            Id = "les_published_1",
            Title = "Bài 2: Tập hợp - Bản gốc v1",
            Introduction = "Giới thiệu phiên bản cũ",
            DefinitionsJson = "[\"Định nghĩa v1\"]",
            FormulasJson = "[]",
            ExamplesJson = "[]",
            SummaryPointsJson = "[]"
        };

        context.ContentRevisions.Add(new ContentRevision
        {
            Id = "rev_l_historical_1",
            ContentId = "les_published_1",
            ContentType = "lesson",
            Version = 1,
            Status = "published",
            Title = "Bài 2: Tập hợp - Bản gốc v1",
            SnapshotJson = System.Text.Json.JsonSerializer.Serialize(snapshot),
            AuthorId = "usr_author_1",
            CreatedBy = "usr_author_1",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-10)
        });
        await context.SaveChangesAsync();

        // Mutate current title
        var lesson = await context.ContentLessons.FindAsync("les_published_1");
        lesson!.Title = "Bài 2: Tập hợp - Đã sửa đổi";
        await context.SaveChangesAsync();

        var rollbackReq = new StudyAI.Application.DTOs.RollbackContentRequestDto
        {
            TargetVersion = 1,
            Reason = "Khôi phục phiên bản v1"
        };

        var result = await controller.RollbackLesson("les_published_1", rollbackReq);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var updated = await context.ContentLessons.FindAsync("les_published_1");
        Assert.NotNull(updated);
        Assert.Equal("draft", updated.Status);
        Assert.Equal("Bài 2: Tập hợp - Bản gốc v1", updated.Title);
        Assert.Equal("Giới thiệu phiên bản cũ", updated.Introduction);

        // Verify revision was recorded
        var latestRev = await context.ContentRevisions
            .Where(r => r.ContentId == "les_published_1")
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();
        Assert.NotNull(latestRev);
        Assert.Equal("rev_l_historical_1", latestRev.SourceRevisionId);
    }
}
