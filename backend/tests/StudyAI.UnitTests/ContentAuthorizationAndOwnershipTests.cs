using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Api.Controllers;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.UnitTests;

public class ContentAuthorizationAndOwnershipTests
{
    private (StudyAIDbContext Context, ContentController Controller) CreateContextAndController(string role, string userId, bool hasApproveClaim = false)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: $"StudyAI_Authz_Test_{Guid.NewGuid():N}")
            .Options;

        var context = new StudyAIDbContext(options);

        // Seed users
        context.Users.Add(new User
        {
            Id = "usr_author_1",
            Email = "author1@studyai.edu.vn",
            DisplayName = "Author One",
            Role = "author",
            PasswordHash = "hash"
        });

        context.Users.Add(new User
        {
            Id = "usr_author_2",
            Email = "author2@studyai.edu.vn",
            DisplayName = "Author Two",
            Role = "author",
            PasswordHash = "hash"
        });

        context.Users.Add(new User
        {
            Id = "usr_content_reviewer",
            Email = "reviewer@studyai.edu.vn",
            DisplayName = "Reviewer",
            Role = "content",
            PasswordHash = "hash"
        });

        context.Users.Add(new User
        {
            Id = "usr_admin",
            Email = "admin@studyai.edu.vn",
            DisplayName = "Admin",
            Role = "admin",
            PasswordHash = "hash"
        });

        // Seed subject and chapter
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

        // Seed lessons
        var lesson1 = new ContentLesson
        {
            Id = "les_author1",
            ChapterId = "chp_m10_c1",
            Title = "Bài 1: Tác giả 1",
            Slug = "bai-1-author-1",
            Status = "in-review",
            AuthorId = "usr_author_1",
            OrderIndex = 1
        };
        context.ContentLessons.Add(lesson1);

        var lessonDraft1 = new ContentLesson
        {
            Id = "les_draft_author1",
            ChapterId = "chp_m10_c1",
            Title = "Bài 1 draft: Tác giả 1",
            Slug = "bai-1-draft-author-1",
            Status = "draft",
            AuthorId = "usr_author_1",
            OrderIndex = 2
        };
        context.ContentLessons.Add(lessonDraft1);

        // Seed questions
        var question1 = new ContentQuestion
        {
            Id = "qst_author1",
            SubjectId = "sub_math10",
            LessonId = "les_author1",
            AuthorId = "usr_author_1",
            Prompt = "Câu hỏi của Author 1",
            Status = "in-review",
            Type = "multiple-choice",
            CorrectAnswer = "A",
            OptionsJson = "[\"A\", \"B\"]"
        };
        context.ContentQuestions.Add(question1);

        context.SaveChanges();

        // Controller setup
        var controller = new ContentController(context);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role)
        };
        if (hasApproveClaim)
        {
            claims.Add(new Claim("permission", "content.approve"));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };

        return (context, controller);
    }

    [Fact]
    public async Task UpdateLesson_ByDifferentAuthor_Returns403()
    {
        var (_, controller) = CreateContextAndController("author", "usr_author_2");

        var result = await controller.UpdateLesson("les_author1", new UpdateLessonRequestDto
        {
            Title = "Hacker update"
        });

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task DeleteLesson_ByDifferentAuthor_Returns403()
    {
        var (_, controller) = CreateContextAndController("author", "usr_author_2");

        var result = await controller.DeleteLesson("les_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task SubmitReview_ByDifferentAuthor_Returns403()
    {
        var (_, controller) = CreateContextAndController("author", "usr_author_2");

        var result = await controller.SubmitReview("les_draft_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task ApproveLesson_ByAuthorThemselves_Returns403FourEyes()
    {
        // Even if the author also has a 'content' role or approve claim, four-eyes forbids approving own content
        var (_, controller) = CreateContextAndController("content", "usr_author_1");

        var result = await controller.ApproveLesson("les_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task ApproveLesson_ByIndependentReviewer_Succeeds()
    {
        var (context, controller) = CreateContextAndController("content", "usr_content_reviewer");

        var result = await controller.ApproveLesson("les_author1");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);

        var updated = await context.ContentLessons.FindAsync("les_author1");
        Assert.Equal("published", updated!.Status);
        Assert.Equal("usr_content_reviewer", updated.ReviewedBy);
    }

    [Fact]
    public async Task ApproveLesson_ByAdmin_OverridesFourEyesAndSucceeds()
    {
        var (context, controller) = CreateContextAndController("admin", "usr_admin");

        var result = await controller.ApproveLesson("les_author1");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
    }

    [Fact]
    public async Task UpdateQuestion_ByDifferentAuthor_Returns403()
    {
        var (_, controller) = CreateContextAndController("author", "usr_author_2");

        var result = await controller.UpdateQuestion("qst_author1", new UpdateQuestionRequestDto
        {
            Prompt = "New Prompt"
        });

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task DeleteQuestion_ByDifferentAuthor_Returns403()
    {
        var (_, controller) = CreateContextAndController("author", "usr_author_2");

        var result = await controller.DeleteQuestion("qst_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task ApproveQuestion_ByAuthorThemselves_Returns403FourEyes()
    {
        var (_, controller) = CreateContextAndController("content", "usr_author_1");

        var result = await controller.ApproveQuestion("qst_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task ApproveQuestion_ByIndependentReviewer_Succeeds()
    {
        var (context, controller) = CreateContextAndController("content", "usr_content_reviewer");

        var result = await controller.ApproveQuestion("qst_author1");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);

        var updated = await context.ContentQuestions.FindAsync("qst_author1");
        Assert.Equal("approved", updated!.Status);
        Assert.Equal("usr_content_reviewer", updated.ReviewedBy);
    }
}
