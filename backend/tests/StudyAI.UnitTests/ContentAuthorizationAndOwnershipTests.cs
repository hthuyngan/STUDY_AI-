using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Api.Features.Content;
using StudyAI.Application.DTOs;
using StudyAI.Application.Features.Content.Lessons;
using StudyAI.Application.Features.Content.Questions;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Authentication;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

public class ContentAuthorizationAndOwnershipTests
{
    private (StudyAIDbContext Context, ContentLessonsController LessonsController, ContentQuestionsController QuestionsController)
        CreateControllers(string role, string userId, bool hasApproveClaim = false)
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
        var httpContext = new DefaultHttpContext { User = claimsPrincipal };
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };

        var clock = new SystemClock();
        var idGenerator = new IdGenerator();
        var currentUser = new CurrentUser(httpContextAccessor);
        var auditWriter = new AuditWriter(context, currentUser, clock, idGenerator);

        var lessonsService = new ContentLessonsService(context, auditWriter, clock, idGenerator);
        var questionsService = new ContentQuestionsService(context, auditWriter, clock, idGenerator);

        var lessonsController = new ContentLessonsController(lessonsService)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };

        var questionsController = new ContentQuestionsController(questionsService)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };

        return (context, lessonsController, questionsController);
    }

    [Fact]
    public async Task UpdateLesson_ByDifferentAuthor_Returns403()
    {
        var (_, lessonsController, _) = CreateControllers("author", "usr_author_2");

        var result = await lessonsController.UpdateLesson("les_author1", new UpdateLessonRequestDto
        {
            Title = "Hacker update"
        });

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task DeleteLesson_ByDifferentAuthor_Returns403()
    {
        var (_, lessonsController, _) = CreateControllers("author", "usr_author_2");

        var result = await lessonsController.DeleteLesson("les_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task SubmitReview_ByDifferentAuthor_Returns403()
    {
        var (_, lessonsController, _) = CreateControllers("author", "usr_author_2");

        var result = await lessonsController.SubmitReview("les_draft_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task ApproveLesson_ByAuthorThemselves_Returns403FourEyes()
    {
        var (_, lessonsController, _) = CreateControllers("content", "usr_author_1");

        var result = await lessonsController.ApproveLesson("les_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task ApproveLesson_ByIndependentReviewer_Succeeds()
    {
        var (context, lessonsController, _) = CreateControllers("content", "usr_content_reviewer");

        var result = await lessonsController.ApproveLesson("les_author1");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);

        var updated = await context.ContentLessons.FindAsync("les_author1");
        Assert.Equal("published", updated!.Status);
        Assert.Equal("usr_content_reviewer", updated.ReviewedBy);
    }

    [Fact]
    public async Task ApproveLesson_ByAdmin_OverridesFourEyesAndSucceeds()
    {
        var (context, lessonsController, _) = CreateControllers("admin", "usr_admin");

        var result = await lessonsController.ApproveLesson("les_author1");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
    }

    [Fact]
    public async Task UpdateQuestion_ByDifferentAuthor_Returns403()
    {
        var (_, _, questionsController) = CreateControllers("author", "usr_author_2");

        var result = await questionsController.UpdateQuestion("qst_author1", new UpdateQuestionRequestDto
        {
            Prompt = "New Prompt"
        });

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task DeleteQuestion_ByDifferentAuthor_Returns403()
    {
        var (_, _, questionsController) = CreateControllers("author", "usr_author_2");

        var result = await questionsController.DeleteQuestion("qst_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task ApproveQuestion_ByAuthorThemselves_Returns403FourEyes()
    {
        var (_, _, questionsController) = CreateControllers("content", "usr_author_1");

        var result = await questionsController.ApproveQuestion("qst_author1");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task ApproveQuestion_ByIndependentReviewer_Succeeds()
    {
        var (context, _, questionsController) = CreateControllers("content", "usr_content_reviewer");

        var result = await questionsController.ApproveQuestion("qst_author1");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);

        var updated = await context.ContentQuestions.FindAsync("qst_author1");
        Assert.Equal("approved", updated!.Status);
        Assert.Equal("usr_content_reviewer", updated.ReviewedBy);
    }
}
