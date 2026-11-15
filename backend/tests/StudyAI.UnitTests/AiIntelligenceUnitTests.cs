using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

public class AiIntelligenceUnitTests
{
    private StudyAIDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new StudyAIDbContext(options);
    }

    [Fact]
    public async Task AiUsageService_LogsUsage_CalculatesCost_AndReturnsStats()
    {
        using var db = CreateInMemoryDb(nameof(AiUsageService_LogsUsage_CalculatesCost_AndReturnsStats));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);

        await usageService.LogUsageAsync("usr_test1", "tutor_chat", "OpenAI", "gpt-4o-mini", 1000, 500, 150, "success");
        await usageService.LogUsageAsync("usr_test1", "hint_level_1", "RuleEngine", "socratic-hint-v1", 200, 100, 50, "success");

        var stats = await usageService.GetUsageStatsAsync("usr_test1");

        Assert.Equal(2, stats.TotalRequests);
        Assert.Equal(1200, stats.TotalInputTokens);
        Assert.Equal(600, stats.TotalOutputTokens);
        Assert.Equal(2, stats.SuccessCount);
        Assert.Equal(0, stats.ErrorCount);
        Assert.True(stats.EstimatedTotalCostUsd > 0);
        Assert.Equal(2, stats.FeatureBreakdown.Count);

        var recentLogs = await usageService.GetRecentLogsAsync(10);
        Assert.Equal(2, recentLogs.Count);
    }

    [Fact]
    public void AiUsageService_FeatureToggle_EnablesAndDisablesFeatures()
    {
        using var db = CreateInMemoryDb(nameof(AiUsageService_FeatureToggle_EnablesAndDisablesFeatures));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);

        var initial = usageService.GetFeatureConfig();
        Assert.True(initial.EnableHints);

        usageService.SetFeatureToggle("hints", false);
        var updated = usageService.GetFeatureConfig();
        Assert.False(updated.EnableHints);

        // Reset
        usageService.SetFeatureToggle("hints", true);
    }

    [Fact]
    public async Task AiHintService_ForbidsHints_InExamMode()
    {
        using var db = CreateInMemoryDb(nameof(AiHintService_ForbidsHints_InExamMode));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var hintService = new AiHintService(db, usageService, NullLogger<AiHintService>.Instance);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            hintService.GetHintAsync("usr_student1", "q_1", 1, mode: "exam"));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            hintService.GetHintAsync("usr_student1", "q_1", 2, mode: "test"));
    }

    [Fact]
    public async Task AiHintService_GeneratesThreeLevels_WithKaTeX_AndNoLeak()
    {
        using var db = CreateInMemoryDb(nameof(AiHintService_GeneratesThreeLevels_WithKaTeX_AndNoLeak));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var hintService = new AiHintService(db, usageService, NullLogger<AiHintService>.Instance);

        db.ContentQuestions.Add(new ContentQuestion
        {
            Id = "q_calc1",
            Prompt = "Cho hàm số $y = x^3 - 3x$. Tìm cực trị của hàm số.",
            Topic = "Khảo sát hàm số",
            Difficulty = "medium",
            Explanation = "Tính đạo hàm $y' = 3x^2 - 3 = 0$. Rút ra $x = \\pm 1$.\nĐáp án A.",
            CorrectAnswer = "A"
        });
        await db.SaveChangesAsync();

        // Level 1: Conceptual
        var h1 = await hintService.GetHintAsync("usr_student1", "q_calc1", 1);
        Assert.Equal(1, h1.HintLevel);
        Assert.Contains("Khảo sát hàm số", h1.HintText);
        Assert.DoesNotContain("Đáp án A", h1.HintText);
        Assert.NotEmpty(h1.MathFormulas);

        // Level 2: Methodological
        var h2 = await hintService.GetHintAsync("usr_student1", "q_calc1", 2);
        Assert.Equal(2, h2.HintLevel);
        Assert.Contains("Bước 1", h2.HintText);
        Assert.DoesNotContain("Đáp án A", h2.HintText);

        // Level 3: Key Step
        var h3 = await hintService.GetHintAsync("usr_student1", "q_calc1", 3);
        Assert.Equal(3, h3.HintLevel);
        Assert.Contains("Tính đạo hàm", h3.HintText);

        // Verify hint usage was logged into db
        var hintLog = await db.AiHintUsages.FirstOrDefaultAsync(h => h.UserId == "usr_student1" && h.QuestionId == "q_calc1");
        Assert.NotNull(hintLog);
    }

    [Fact]
    public async Task AiAnalysisService_EnforcesOwnership_AndAnalyzesErrors()
    {
        using var db = CreateInMemoryDb(nameof(AiAnalysisService_EnforcesOwnership_AndAnalyzesErrors));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var analysisService = new AiAnalysisService(db, usageService, NullLogger<AiAnalysisService>.Instance);

        var lesson = new ContentLesson { Id = "les_math1", Title = "Tính đơn điệu của hàm số", ChapterId = "c1" };
        var q1 = new ContentQuestion { Id = "q_1", Prompt = "Câu hỏi 1", LessonId = "les_math1", Topic = "Đơn điệu", Difficulty = "easy", CorrectAnswer = "A", Explanation = "Lời giải chi tiết câu 1" };
        var q2 = new ContentQuestion { Id = "q_2", Prompt = "Câu hỏi 2", LessonId = "les_math1", Topic = "Cực trị", Difficulty = "hard", CorrectAnswer = "B", Explanation = "Lời giải chi tiết câu 2" };

        db.ContentLessons.Add(lesson);
        db.ContentQuestions.AddRange(q1, q2);

        var attempt = new AssessmentAttempt
        {
            Id = "att_test123",
            UserId = "usr_real_owner",
            SubjectId = "sub_math12",
            ScoreRaw = 5.0,
            ScoreScaled = 50.0,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_1", IsCorrect = true, SelectedOptionIdsJson = "[\"A\"]" },
                new() { QuestionId = "q_2", IsCorrect = false, SelectedOptionIdsJson = "[\"C\"]" }
            }
        };
        db.AssessmentAttempts.Add(attempt);
        await db.SaveChangesAsync();

        // Unauthorized access by another user
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            analysisService.AnalyzeSessionErrorsAsync("usr_imposter", "att_test123"));

        // Authorized access
        var analysis = await analysisService.AnalyzeSessionErrorsAsync("usr_real_owner", "att_test123");
        Assert.NotNull(analysis);
        Assert.Equal(2, analysis.TotalQuestions);
        Assert.Equal(1, analysis.CorrectCount);
        Assert.Equal(1, analysis.IncorrectCount);
        Assert.Single(analysis.AnalyzedErrors);
        Assert.Equal("q_2", analysis.AnalyzedErrors[0].QuestionId);
        Assert.Contains("Cực trị", analysis.KeyConceptsToReview);
        Assert.NotEmpty(analysis.OverallAssessment);
    }

    [Fact]
    public async Task StudentMasteryService_CalculatesDeterministicMasteryLevels()
    {
        using var db = CreateInMemoryDb(nameof(StudentMasteryService_CalculatesDeterministicMasteryLevels));
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        var q1 = new ContentQuestion { Id = "q_m1", Topic = "Hàm số mũ", Difficulty = "easy" };
        var q2 = new ContentQuestion { Id = "q_m2", Topic = "Hàm số mũ", Difficulty = "medium" };
        var q3 = new ContentQuestion { Id = "q_m3", Topic = "Hàm số mũ", Difficulty = "medium" };
        var q4 = new ContentQuestion { Id = "q_m4", Topic = "Hàm số mũ", Difficulty = "hard" };
        var q5 = new ContentQuestion { Id = "q_m5", Topic = "Hàm số mũ", Difficulty = "hard" };
        db.ContentQuestions.AddRange(q1, q2, q3, q4, q5);

        // Attempt 1: 5 questions, all correct => 100% => mastered
        var attempt = new AssessmentAttempt
        {
            Id = "att_mst1",
            UserId = "usr_studentA",
            SubjectId = "sub_math12",
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_m1", IsCorrect = true },
                new() { QuestionId = "q_m2", IsCorrect = true },
                new() { QuestionId = "q_m3", IsCorrect = true },
                new() { QuestionId = "q_m4", IsCorrect = true },
                new() { QuestionId = "q_m5", IsCorrect = true }
            }
        };
        db.AssessmentAttempts.Add(attempt);
        await db.SaveChangesAsync();

        await masteryService.UpdateMasteryFromAttemptAsync("usr_studentA", "att_mst1");

        var mastery = await masteryService.GetStudentMasteryAsync("usr_studentA", "sub_math12");
        Assert.NotNull(mastery);
        Assert.Single(mastery.Skills);
        Assert.Equal("mastered", mastery.Skills[0].Status);
        Assert.Equal(100.0, mastery.Skills[0].MasteryScore);
    }

    [Fact]
    public async Task LearningRecommendationService_GroundsInRealLessons()
    {
        using var db = CreateInMemoryDb(nameof(LearningRecommendationService_GroundsInRealLessons));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);
        var recService = new LearningRecommendationService(db, masteryService, usageService, NullLogger<LearningRecommendationService>.Instance);

        var chapter = new ContentChapter { Id = "c1", SubjectId = "sub_math12", Title = "Chương 1. Ứng dụng đạo hàm", OrderIndex = 1 };
        db.ContentChapters.Add(chapter);

        var les1 = new ContentLesson { Id = "les_1", ChapterId = "c1", Title = "Đơn điệu của hàm số", OrderIndex = 1, Status = "published" };
        var les2 = new ContentLesson { Id = "les_2", ChapterId = "c1", Title = "Cực trị của hàm số", OrderIndex = 2, Status = "published" };
        var les3 = new ContentLesson { Id = "les_3", ChapterId = "c1", Title = "Giá trị lớn nhất và nhỏ nhất", OrderIndex = 3, Status = "published" };
        db.ContentLessons.AddRange(les1, les2, les3);

        // Student completed lesson 1
        db.LessonProgresses.Add(new LessonProgress
        {
            Id = 1,
            UserId = "usr_studentB",
            LessonId = "les_1",
            SubjectId = "sub_math12",
            OverallProgress = 100,
            ContentProgress = 100
        });
        await db.SaveChangesAsync();

        var recs = await recService.GetRecommendationsAsync("usr_studentB", "sub_math12");
        Assert.NotEmpty(recs);
        // Verify all recommended lessons exist in DB
        foreach (var r in recs)
        {
            var existsInDb = await db.ContentLessons.AnyAsync(l => l.Id == r.LessonId);
            Assert.True(existsInDb, $"Recommended lesson {r.LessonId} must exist in ContentLessons.");
        }

        var path = await recService.GetLearningPathAsync("usr_studentB", "sub_math12");
        Assert.NotNull(path);
        Assert.NotEmpty(path.Steps);
    }
}
