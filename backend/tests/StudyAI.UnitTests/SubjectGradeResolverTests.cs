using Microsoft.EntityFrameworkCore;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

public class SubjectGradeResolverTests
{
    private StudyAIDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: $"StudyAI_Resolver_Test_{Guid.NewGuid():N}")
            .Options;

        var context = new StudyAIDbContext(options);

        // Seed subjects
        context.ContentSubjects.AddRange(
            new ContentSubject
            {
                Id = "sub_math10",
                Code = "MATH10",
                Name = "Toán 10",
                Grade = "10",
                OrderIndex = 1,
                IsActive = true
            },
            new ContentSubject
            {
                Id = "sub_math11",
                Code = "MATH11",
                Name = "Toán 11",
                Grade = "11",
                OrderIndex = 2,
                IsActive = true
            },
            new ContentSubject
            {
                Id = "sub_math12",
                Code = "MATH12",
                Name = "Toán 12",
                Grade = "12",
                OrderIndex = 3,
                IsActive = true
            },
            new ContentSubject
            {
                Id = "sub_math_locked",
                Code = "MATH_LOCKED",
                Name = "Toán Tạm Khóa",
                Grade = "12",
                OrderIndex = 4,
                IsActive = false
            }
        );

        // Seed chapter and lesson for Grade 10
        var chp10 = new ContentChapter
        {
            Id = "chp_m10_c1",
            SubjectId = "sub_math10",
            Title = "Chương 1: Mệnh đề và tập hợp",
            OrderIndex = 1,
            IsActive = true
        };
        context.ContentChapters.Add(chp10);

        var les10 = new ContentLesson
        {
            Id = "les_m10_c1_b1",
            ChapterId = "chp_m10_c1",
            Title = "Bài 1: Mệnh đề",
            Slug = "menh-de",
            OrderIndex = 1,
            Status = "published",
            AuthorId = "usr_author1"
        };
        context.ContentLessons.Add(les10);

        context.SaveChanges();
        return context;
    }

    [Theory]
    [InlineData("10", "10")]
    [InlineData("Lớp 10", "10")]
    [InlineData("Toán 10", "10")]
    [InlineData("grade 10", "10")]
    [InlineData("11", "11")]
    [InlineData("Lớp 11", "11")]
    [InlineData("12", "12")]
    [InlineData("Lớp 12", "12")]
    [InlineData("unknown", null)]
    [InlineData(null, null)]
    [InlineData("", null)]
    public void NormalizeGrade_ReturnsExpectedGrade(string? input, string? expected)
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = resolver.NormalizeGrade(input);

        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithValidGrade10_ResolvesMath10()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = await resolver.ResolveSubjectAsync(userGrade: "10");

        Assert.True(result.Success);
        Assert.Equal("sub_math10", result.SubjectId);
        Assert.Equal("10", result.Grade);
        Assert.Equal("Toán 10", result.SubjectName);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithValidGrade11_ResolvesMath11()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = await resolver.ResolveSubjectAsync(userGrade: "11");

        Assert.True(result.Success);
        Assert.Equal("sub_math11", result.SubjectId);
        Assert.Equal("11", result.Grade);
        Assert.Equal("Toán 11", result.SubjectName);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithValidGrade12_ResolvesMath12()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = await resolver.ResolveSubjectAsync(userGrade: "12");

        Assert.True(result.Success);
        Assert.Equal("sub_math12", result.SubjectId);
        Assert.Equal("12", result.Grade);
        Assert.Equal("Toán 12", result.SubjectName);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithExplicitSubjectId_TakesPriorityOverUserGrade()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        // User is grade 12, but requests sub_math10
        var result = await resolver.ResolveSubjectAsync(
            requestedSubjectId: "sub_math10",
            userGrade: "12");

        Assert.True(result.Success);
        Assert.Equal("sub_math10", result.SubjectId);
        Assert.Equal("10", result.Grade);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithInvalidExplicitSubject_FailsAndDoesNotFallbackTo12()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = await resolver.ResolveSubjectAsync(
            requestedSubjectId: "non_existent_subject",
            userGrade: "12");

        Assert.False(result.Success);
        Assert.Null(result.SubjectId);
        Assert.Contains("non_existent_subject", result.ErrorMessage);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithLockedSubject_FailsWithLockedMessage()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = await resolver.ResolveSubjectAsync(requestedSubjectId: "sub_math_locked");

        Assert.False(result.Success);
        Assert.Null(result.SubjectId);
        Assert.Contains("tạm khóa", result.ErrorMessage);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithLessonId_ResolvesFromLessonChapter()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = await resolver.ResolveSubjectAsync(lessonId: "les_m10_c1_b1");

        Assert.True(result.Success);
        Assert.Equal("sub_math10", result.SubjectId);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithChapterId_ResolvesFromChapter()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = await resolver.ResolveSubjectAsync(chapterId: "chp_m10_c1");

        Assert.True(result.Success);
        Assert.Equal("sub_math10", result.SubjectId);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithUnknownGrade_FailsAndDoesNotDefaultTo12()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = await resolver.ResolveSubjectAsync(userGrade: "unknown_grade");

        Assert.False(result.Success);
        Assert.Null(result.SubjectId);
        Assert.Contains("không hợp lệ", result.ErrorMessage);
    }

    [Fact]
    public async Task ResolveSubjectAsync_WithNoInput_FailsAndDoesNotDefaultTo12()
    {
        var context = CreateInMemoryDbContext();
        var resolver = new SubjectGradeResolver(context);

        var result = await resolver.ResolveSubjectAsync();

        Assert.False(result.Success);
        Assert.Null(result.SubjectId);
        Assert.NotNull(result.ErrorMessage);
    }
}
