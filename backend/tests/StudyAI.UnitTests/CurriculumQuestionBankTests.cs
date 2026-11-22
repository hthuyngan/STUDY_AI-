using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Features.Student;
using StudyAI.Features.AI;
using StudyAI.Features.Student;
using StudyAI.Features.Student;
using StudyAI.Models;
using StudyAI.Common.Authorization;
using StudyAI.Data;

using Xunit;

namespace StudyAI.UnitTests;

public class CurriculumQuestionBankTests
{
    private (LearnerCurriculumController controller, StudyAIDbContext db) CreateCurriculumController(string dbName, string? role = null)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var context = new StudyAIDbContext(options);
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var logger = NullLogger<LearnerCurriculumService>.Instance;
        var clock = new SystemClock();
        var idGen = new IdGenerator();
        var httpContextAccessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
        if (role != null)
        {
            var userPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "usr_staff"),
                new Claim(ClaimTypes.Role, role)
            }, "TestAuth"));
            httpContextAccessor.HttpContext.User = userPrincipal;
        }
        var currentUser = new CurrentUser(httpContextAccessor);
        var auditWriter = new AuditWriter(context, currentUser, clock, idGen);
        var service = new LearnerCurriculumService(context, auditWriter, memoryCache, logger);

        var controller = new LearnerCurriculumController(service);
        if (role != null)
        {
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContextAccessor.HttpContext
            };
        }
        return (controller, context);
    }

    private (LearnerPracticeController controller, StudyAIDbContext db) CreatePracticeController(string dbName, string userId)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var context = new StudyAIDbContext(options);
        var clock = new SystemClock();
        var idGenerator = new IdGenerator();
        var practiceService = new LearnerPracticeService(context, clock, idGenerator);
        var controller = new LearnerPracticeController(practiceService);
        var userPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim("sub", userId),
            new Claim(ClaimTypes.Role, "learner")
        }, "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = userPrincipal }
        };

        return (controller, context);
    }

    [Fact]
    public async Task GetQuestionBank_FiltersOutDeletedAndDraftQuestions()
    {
        var (controller, db) = CreateCurriculumController(Guid.NewGuid().ToString());

        db.ContentQuestions.AddRange(
            new ContentQuestion
            {
                Id = "q_pub_1",
                SubjectId = "sub_math10",
                Prompt = "Câu 1 published",
                Status = "published",
                IsDeleted = false,
                OptionsJson = "[\"A\", \"B\"]",
                Difficulty = "easy",
                Type = "multiple-choice"
            },
            new ContentQuestion
            {
                Id = "q_app_2",
                SubjectId = "sub_math10",
                Prompt = "Câu 2 approved",
                Status = "approved",
                IsDeleted = false,
                OptionsJson = "[\"C\", \"D\"]",
                Difficulty = "medium",
                Type = "multiple-choice"
            },
            new ContentQuestion
            {
                Id = "q_draft_3",
                SubjectId = "sub_math10",
                Prompt = "Câu 3 draft",
                Status = "draft",
                IsDeleted = false
            },
            new ContentQuestion
            {
                Id = "q_del_4",
                SubjectId = "sub_math10",
                Prompt = "Câu 4 deleted",
                Status = "published",
                IsDeleted = true
            }
        );
        await db.SaveChangesAsync();

        var result = await controller.GetQuestionBank() as OkObjectResult;
        Assert.NotNull(result);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        var node = JsonNode.Parse(json);
        Assert.NotNull(node);

        var total = node["total"]?.GetValue<int>();
        var items = node["items"]?.AsArray();

        Assert.Equal(2, total);
        Assert.Equal(2, items?.Count);
    }

    [Fact]
    public async Task GetQuestionBank_FilterByGradeAndSubject_Accurately()
    {
        var (controller, db) = CreateCurriculumController(Guid.NewGuid().ToString());

        db.ContentQuestions.AddRange(
            new ContentQuestion
            {
                Id = "q_m10",
                SubjectId = "sub_math10",
                Grade = "10",
                Prompt = "Toán 10 Prompt",
                Status = "published",
                OptionsJson = "[\"A\", \"B\"]"
            },
            new ContentQuestion
            {
                Id = "q_m12",
                SubjectId = "sub_math12",
                Grade = "12",
                Prompt = "Toán 12 Prompt",
                Status = "published",
                OptionsJson = "[\"C\", \"D\"]"
            }
        );
        await db.SaveChangesAsync();

        var result = await controller.GetQuestionBank(subjectId: "sub_math10") as OkObjectResult;
        Assert.NotNull(result);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        var node = JsonNode.Parse(json);
        var items = node?["items"]?.AsArray();

        Assert.Single(items!);
        Assert.Equal("q_m10", items![0]?["id"]?.GetValue<string>());
    }

    [Fact]
    public async Task GetQuestionBankStats_ReturnsAggregatedCounts_Accurately()
    {
        var (controller, db) = CreateCurriculumController(Guid.NewGuid().ToString());

        db.ContentQuestions.AddRange(
            new ContentQuestion
            {
                Id = "q1",
                SubjectId = "sub_math10",
                Prompt = "Q1",
                Status = "published",
                Difficulty = "easy",
                Type = "multiple-choice"
            },
            new ContentQuestion
            {
                Id = "q2",
                SubjectId = "sub_math10",
                Prompt = "Q2",
                Status = "approved",
                Difficulty = "hard",
                Type = "short-answer"
            },
            new ContentQuestion
            {
                Id = "q3",
                SubjectId = "sub_math10",
                Prompt = "Q3",
                Status = "in-review",
                Difficulty = "medium",
                Type = "true-false-group"
            }
        );
        await db.SaveChangesAsync();

        var result = await controller.GetQuestionBankStats() as OkObjectResult;
        Assert.NotNull(result);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        var node = JsonNode.Parse(json);

        Assert.Equal(2, node?["total"]?.GetValue<int>());
        Assert.Equal(2, node?["approvedCount"]?.GetValue<int>());
        Assert.Equal(1, node?["needsReviewCount"]?.GetValue<int>());
        Assert.Equal(1, node?["byType"]?["multiple_choice"]?.GetValue<int>());
        Assert.Equal(1, node?["byType"]?["short_answer"]?.GetValue<int>());
        Assert.Equal(1, node?["byCognitiveLevel"]?["recognition"]?.GetValue<int>());
        Assert.Equal(1, node?["byCognitiveLevel"]?["application"]?.GetValue<int>());
    }

    [Fact]
    public async Task GetQuestionBankDetail_Returns404ForNonexistentOrUnpublished()
    {
        var (controller, db) = CreateCurriculumController(Guid.NewGuid().ToString());

        db.ContentQuestions.Add(new ContentQuestion
        {
            Id = "q_draft",
            Prompt = "Draft question",
            Status = "draft"
        });
        await db.SaveChangesAsync();

        var notFoundResult = await controller.GetQuestionBankDetail("q_draft") as NotFoundObjectResult;
        Assert.NotNull(notFoundResult);

        var missingResult = await controller.GetQuestionBankDetail("nonexistent") as NotFoundObjectResult;
        Assert.NotNull(missingResult);
    }

    [Fact]
    public async Task GetQuestionBank_ReturnsProperDiscriminatedUnionFields_ForVariants()
    {
        var (controller, db) = CreateCurriculumController(Guid.NewGuid().ToString(), "content");

        db.ContentQuestions.AddRange(
            new ContentQuestion
            {
                Id = "q_mcq_1",
                SubjectId = "sub_math12",
                Grade = "12",
                Prompt = "Câu MCQ 1",
                Status = "published",
                Type = "multiple-choice",
                OptionsJson = "[\"Đáp án A\", \"Đáp án B\", \"Đáp án C\", \"Đáp án D\"]",
                CorrectAnswer = "B"
            },
            new ContentQuestion
            {
                Id = "q_tfg_1",
                SubjectId = "sub_math12",
                Grade = "12",
                Prompt = "Câu Đúng Sai Cụm",
                Status = "published",
                Type = "true_false_group",
                OptionsJson = "[\"Mệnh đề a\", \"Mệnh đề b\", \"Mệnh đề c\", \"Mệnh đề d\"]",
                CorrectAnswer = "true,false,true,false"
            },
            new ContentQuestion
            {
                Id = "q_sa_1",
                SubjectId = "sub_math12",
                Grade = "12",
                Prompt = "Câu Trả lời ngắn",
                Status = "published",
                Type = "short-answer",
                CorrectAnswer = "4.5; 9/2",
                MetadataJson = "{\"acceptedAnswers\":[\"4.5\",\"9/2\"],\"displayAnswer\":\"4.5\",\"unit\":\"cm\"}"
            }
        );
        await db.SaveChangesAsync();

        // Test math filter matching sub_math12
        var result = await controller.GetQuestionBank(subjectId: "math") as OkObjectResult;
        Assert.NotNull(result);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        var node = JsonNode.Parse(json);
        var items = node?["items"]?.AsArray();
        Assert.NotNull(items);
        Assert.Equal(3, items.Count);

        // Verify MCQ
        var mcq = items.FirstOrDefault(x => x?["id"]?.GetValue<string>() == "q_mcq_1");
        Assert.NotNull(mcq);
        Assert.Equal("multiple_choice", mcq["type"]?.GetValue<string>());
        Assert.Equal("B", mcq["correctAnswer"]?.GetValue<string>());
        var mcqOptions = mcq["options"]?.AsArray();
        Assert.Equal(4, mcqOptions?.Count);

        // Verify True/False Group subItems
        var tfg = items.FirstOrDefault(x => x?["id"]?.GetValue<string>() == "q_tfg_1");
        Assert.NotNull(tfg);
        Assert.Equal("true_false_group", tfg["type"]?.GetValue<string>());
        var subItems = tfg["subItems"]?.AsArray();
        Assert.NotNull(subItems);
        Assert.Equal(4, subItems.Count);
        Assert.Equal("a", subItems[0]?["id"]?.GetValue<string>());
        Assert.True(subItems[0]?["isCorrect"]?.GetValue<bool>());
        Assert.False(subItems[1]?["isCorrect"]?.GetValue<bool>());

        // Verify Short Answer
        var sa = items.FirstOrDefault(x => x?["id"]?.GetValue<string>() == "q_sa_1");
        Assert.NotNull(sa);
        Assert.Equal("short_answer", sa["type"]?.GetValue<string>());
        Assert.Equal("4.5", sa["displayAnswer"]?.GetValue<string>());
        Assert.Equal("cm", sa["unit"]?.GetValue<string>());
        var acc = sa["acceptedAnswers"]?.AsArray();
        Assert.NotNull(acc);
        Assert.Equal(2, acc.Count);
    }

    [Fact]
    public async Task GetQuestionBank_StripsAnswers_ForLearnersAndUnauthenticatedUsers()
    {
        var (controller, db) = CreateCurriculumController(Guid.NewGuid().ToString(), "learner");

        db.ContentQuestions.AddRange(
            new ContentQuestion
            {
                Id = "q_mcq_secret",
                SubjectId = "sub_math12",
                Grade = "12",
                Prompt = "Câu hỏi trắc nghiệm bí mật",
                Status = "published",
                Type = "multiple-choice",
                OptionsJson = "[\"Đáp án A\", \"Đáp án B\"]",
                CorrectAnswer = "A",
                Explanation = "Lời giải chi tiết câu hỏi"
            },
            new ContentQuestion
            {
                Id = "q_tfg_secret",
                SubjectId = "sub_math12",
                Grade = "12",
                Prompt = "Câu đúng sai cụm bí mật",
                Status = "published",
                Type = "true_false_group",
                OptionsJson = "[\"Mệnh đề 1\"]",
                MetadataJson = "{\"subItems\":[{\"id\":\"a\",\"prompt\":\"Mệnh đề 1\",\"isCorrect\":true}]}"
            }
        );
        await db.SaveChangesAsync();

        var result = await controller.GetQuestionBank(subjectId: "sub_math12") as OkObjectResult;
        Assert.NotNull(result);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        var node = JsonNode.Parse(json);
        var items = node?["items"]?.AsArray();
        Assert.NotNull(items);

        var mcq = items.FirstOrDefault(x => x?["id"]?.GetValue<string>() == "q_mcq_secret");
        Assert.NotNull(mcq);
        Assert.Null(mcq["correctAnswer"]);
        Assert.Null(mcq["explanation"]);

        var tfg = items.FirstOrDefault(x => x?["id"]?.GetValue<string>() == "q_tfg_secret");
        Assert.NotNull(tfg);
        var subItem = tfg["subItems"]?.AsArray()?.FirstOrDefault();
        Assert.NotNull(subItem);
        Assert.Null(subItem["isCorrect"]);
    }

    [Fact]
    public async Task GetLeaderboard_ReturnsRealRankingFromResponses_ExcludesDeletedUsers()
    {
        var dbName = Guid.NewGuid().ToString();
        var (practiceController, db) = CreatePracticeController(dbName, "usr_student_1");

        // Seed users
        db.Users.AddRange(
            new User { Id = "usr_student_1", DisplayName = "Học sinh 1", Role = "learner" },
            new User { Id = "usr_student_2", DisplayName = "Học sinh 2", Role = "learner" },
            new User { Id = "usr_deleted", DisplayName = "Học sinh đã xóa", Role = "learner", IsDeleted = true }
        );

        // Seed attempts
        var attempt1 = new AssessmentAttempt { Id = "att_1", UserId = "usr_student_1" };
        var attempt2 = new AssessmentAttempt { Id = "att_2", UserId = "usr_student_2" };
        var attempt3 = new AssessmentAttempt { Id = "att_3", UserId = "usr_deleted" };
        db.AssessmentAttempts.AddRange(attempt1, attempt2, attempt3);

        // Seed responses: usr_student_2 has 3 correct, usr_student_1 has 1 correct, usr_deleted has 5 correct
        db.AssessmentResponses.AddRange(
            new AssessmentResponse { Id = 1, AttemptId = "att_1", Attempt = attempt1, IsCorrect = true },
            new AssessmentResponse { Id = 2, AttemptId = "att_1", Attempt = attempt1, IsCorrect = false },
            new AssessmentResponse { Id = 3, AttemptId = "att_2", Attempt = attempt2, IsCorrect = true },
            new AssessmentResponse { Id = 4, AttemptId = "att_2", Attempt = attempt2, IsCorrect = true },
            new AssessmentResponse { Id = 5, AttemptId = "att_2", Attempt = attempt2, IsCorrect = true },
            new AssessmentResponse { Id = 6, AttemptId = "att_3", Attempt = attempt3, IsCorrect = true }
        );
        await db.SaveChangesAsync();

        var result = await practiceController.GetLeaderboard() as OkObjectResult;
        Assert.NotNull(result);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        var node = JsonNode.Parse(json)?.AsArray();
        Assert.NotNull(node);

        // usr_deleted is excluded, usr_student_2 is rank 1 (30 XP), usr_student_1 is rank 2 (10 XP, isCurrentUser = true)
        Assert.Equal(2, node.Count);

        var top1 = node[0];
        Assert.Equal(1, top1?["rank"]?.GetValue<int>());
        Assert.Equal("usr_student_2", top1?["id"]?.GetValue<string>());
        Assert.Equal(30, top1?["xp"]?.GetValue<int>());
        Assert.False(top1?["isCurrentUser"]?.GetValue<bool>());

        var top2 = node[1];
        Assert.Equal(2, top2?["rank"]?.GetValue<int>());
        Assert.Equal("usr_student_1", top2?["id"]?.GetValue<string>());
        Assert.Equal(10, top2?["xp"]?.GetValue<int>());
        Assert.True(top2?["isCurrentUser"]?.GetValue<bool>());
    }
}
