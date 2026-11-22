using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;


using StudyAI.Models;
using StudyAI.Data;

using Xunit;

namespace StudyAI.UnitTests;

/// <summary>
/// Phase AI-03: Learning Analytics & Intelligent Assessment Comprehensive Unit Tests
/// </summary>
public class PhaseAi03LearningAnalyticsUnitTests
{
    private StudyAIDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new StudyAIDbContext(options);
    }

    private void SeedCurriculumAndQuestions(StudyAIDbContext db)
    {
        var sub = new ContentSubject { Id = "sub_math12", Name = "Toán 12", Code = "MATH12", OrderIndex = 1, IsActive = true };
        db.ContentSubjects.Add(sub);

        var chp1 = new ContentChapter { Id = "chp_1", SubjectId = "sub_math12", Title = "Chương 1: Ứng dụng đạo hàm", OrderIndex = 1, IsActive = true };
        var chp2 = new ContentChapter { Id = "chp_2", SubjectId = "sub_math12", Title = "Chương 2: Vectơ không gian", OrderIndex = 2, IsActive = true };
        db.ContentChapters.AddRange(chp1, chp2);

        var les1 = new ContentLesson { Id = "les_1", ChapterId = "chp_1", Title = "Tính đơn điệu của hàm số", OrderIndex = 1, Status = "published" };
        var les2 = new ContentLesson { Id = "les_2", ChapterId = "chp_1", Title = "Cực trị của hàm số", OrderIndex = 2, Status = "published" };
        var les3 = new ContentLesson { Id = "les_3", ChapterId = "chp_2", Title = "Toạ độ của vectơ", OrderIndex = 1, Status = "published" };
        db.ContentLessons.AddRange(les1, les2, les3);

        // Seed questions across cognitive levels
        for (int i = 1; i <= 10; i++)
        {
            db.ContentQuestions.Add(new ContentQuestion
            {
                Id = $"q_nb_{i}",
                SubjectId = "sub_math12",
                ChapterId = "chp_1",
                LessonId = "les_1",
                Topic = "Tính đơn điệu của hàm số",
                Difficulty = "nhan_biet",
                CorrectAnswer = "A",
                OptionsJson = "[\"A. Đúng\", \"B. Sai\", \"C. Không xác định\", \"D. Khác\"]",
                Prompt = $"Câu hỏi nhận biết {i}",
                Status = "published",
                IsDeleted = false
            });
        }

        for (int i = 1; i <= 8; i++)
        {
            db.ContentQuestions.Add(new ContentQuestion
            {
                Id = $"q_th_{i}",
                SubjectId = "sub_math12",
                ChapterId = "chp_1",
                LessonId = "les_2",
                Topic = "Cực trị của hàm số",
                Difficulty = "thong_hieu",
                CorrectAnswer = "B",
                OptionsJson = "[\"A. 1\", \"B. 2\", \"C. 3\", \"D. 4\"]",
                Prompt = $"Câu hỏi thông hiểu {i}",
                Status = "published",
                IsDeleted = false
            });
        }

        for (int i = 1; i <= 5; i++)
        {
            db.ContentQuestions.Add(new ContentQuestion
            {
                Id = $"q_vd_{i}",
                SubjectId = "sub_math12",
                ChapterId = "chp_1",
                LessonId = "les_2",
                Topic = "Cực trị của hàm số",
                Difficulty = "van_dung",
                CorrectAnswer = "C",
                OptionsJson = "[\"A. a\", \"B. b\", \"C. c\", \"D. d\"]",
                Prompt = $"Câu hỏi vận dụng {i}",
                Status = "published",
                IsDeleted = false
            });
        }

        for (int i = 1; i <= 3; i++)
        {
            db.ContentQuestions.Add(new ContentQuestion
            {
                Id = $"q_vdc_{i}",
                SubjectId = "sub_math12",
                ChapterId = "chp_2",
                LessonId = "les_3",
                Topic = "Toạ độ của vectơ",
                Difficulty = "van_dung_cao",
                CorrectAnswer = "D",
                OptionsJson = "[\"A. x\", \"B. y\", \"C. z\", \"D. w\"]",
                Prompt = $"Câu hỏi vận dụng cao {i}",
                Status = "published",
                IsDeleted = false
            });
        }

        db.SaveChanges();
    }

    [Fact]
    public async Task Analytics_01_GetAnalyticsOverview_CalculatesAccurateMetrics()
    {
        using var db = CreateInMemoryDb(nameof(Analytics_01_GetAnalyticsOverview_CalculatesAccurateMetrics));
        SeedCurriculumAndQuestions(db);

        const string userId = "student_analytics_01";
        const string subjectId = "sub_math12";

        // Completed lesson progress
        db.LessonProgresses.Add(new LessonProgress
        {
            Id = 1,
            UserId = userId,
            SubjectId = subjectId,
            LessonId = "les_1",
            OverallProgress = 100,
            ContentProgress = 100
        });

        // Topic mastery: mastered mono, weak extreme
        db.StudentTopicMasteries.AddRange(
            new StudentTopicMastery
            {
                Id = "mst_1",
                UserId = userId,
                SubjectId = subjectId,
                TopicName = "Tính đơn điệu của hàm số",
                AttemptCount = 10,
                CorrectCount = 9,
                MasteryScore = 90.0,
                Status = "mastered"
            },
            new StudentTopicMastery
            {
                Id = "mst_2",
                UserId = userId,
                SubjectId = subjectId,
                TopicName = "Cực trị của hàm số",
                AttemptCount = 6,
                CorrectCount = 2,
                MasteryScore = 33.3,
                Status = "needs_reinforcement"
            }
        );

        // Completed Assessment attempt
        var now = DateTimeOffset.UtcNow;
        var attempt = new AssessmentAttempt
        {
            Id = "att_overview_1",
            UserId = userId,
            SubjectId = subjectId,
            AssessmentId = "asmt_practice",
            CompletionStatus = "completed",
            ScoreRaw = 5.0,
            ScoreMax = 6.0,
            ScoreScaled = 8.33,
            SessionTimeMs = 180000,
            LastActivityAt = now,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_nb_1", IsCorrect = true },
                new() { QuestionId = "q_nb_2", IsCorrect = true },
                new() { QuestionId = "q_nb_3", IsCorrect = true },
                new() { QuestionId = "q_th_1", IsCorrect = true },
                new() { QuestionId = "q_th_2", IsCorrect = true },
                new() { QuestionId = "q_vd_1", IsCorrect = false }
            }
        };
        db.AssessmentAttempts.Add(attempt);
        await db.SaveChangesAsync();

        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);
        var analyticsService = new LearningAnalyticsService(db, masteryService, new FakeLlmProvider(), NullLogger<LearningAnalyticsService>.Instance);

        var overview = await analyticsService.GetAnalyticsOverviewAsync(userId, subjectId, "all");

        Assert.NotNull(overview);
        Assert.Equal(userId, overview.UserId);
        Assert.Equal(subjectId, overview.SubjectId);
        Assert.Equal(6, overview.TotalQuestionsAttempted);
        Assert.Equal(5, overview.TotalCorrect);
        Assert.Equal(1, overview.TotalIncorrect);
        Assert.Equal(83.3, overview.OverallAccuracyPercent);

        // Curriculum progress: 1 of 3 lessons completed = 33.3%
        Assert.Equal(33.3, overview.CurriculumProgressPercent);

        // Chapter masteries
        Assert.Equal(2, overview.ChapterMasteries.Count);
        var chp1 = overview.ChapterMasteries.First(c => c.ChapterId == "chp_1");
        Assert.Equal(2, chp1.TotalLessons);
        Assert.Equal(1, chp1.CompletedLessons);
        Assert.Equal(50.0, chp1.CompletionPercent);

        // Strengths & Weaknesses
        Assert.NotEmpty(overview.TopStrengths);
        Assert.Equal("Tính đơn điệu của hàm số", overview.TopStrengths.First().TopicName);
        Assert.NotEmpty(overview.TopWeaknesses);
        Assert.Equal("Cực trị của hàm số", overview.TopWeaknesses.First().TopicName);

        // Review Frequency & Streak
        Assert.Equal(1, overview.ReviewFrequency.SessionsLast7Days);
        Assert.True(overview.ReviewFrequency.ActiveStreakDays >= 1);
    }

    [Fact]
    public async Task Analytics_02_GetLearningRisks_DetectsConsecutiveMistakes_And_Decay()
    {
        using var db = CreateInMemoryDb(nameof(Analytics_02_GetLearningRisks_DetectsConsecutiveMistakes_And_Decay));
        SeedCurriculumAndQuestions(db);

        const string userId = "student_risks_02";
        const string subjectId = "sub_math12";

        // Topic 1: Lâu chưa ôn tập (> 14 ngày)
        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_decay",
            UserId = userId,
            SubjectId = subjectId,
            TopicName = "Tính đơn điệu của hàm số",
            AttemptCount = 5,
            CorrectCount = 3,
            MasteryScore = 60.0,
            Status = "progressing",
            LastAttemptAt = DateTimeOffset.UtcNow.AddDays(-20),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-20)
        });

        // Topic 2: Sai 3 câu liên tiếp gần nhất
        var attempt = new AssessmentAttempt
        {
            Id = "att_consec_fail",
            UserId = userId,
            SubjectId = subjectId,
            CompletionStatus = "completed",
            LastActivityAt = DateTimeOffset.UtcNow,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_th_1", IsCorrect = false },
                new() { QuestionId = "q_th_2", IsCorrect = false },
                new() { QuestionId = "q_th_3", IsCorrect = false }
            }
        };
        db.AssessmentAttempts.Add(attempt);
        await db.SaveChangesAsync();

        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);
        var analyticsService = new LearningAnalyticsService(db, masteryService, new FakeLlmProvider(), NullLogger<LearningAnalyticsService>.Instance);

        var risks = await analyticsService.GetLearningRisksAsync(userId, subjectId);

        Assert.NotEmpty(risks);

        // Verify consecutive mistakes detected
        var consecRisk = risks.FirstOrDefault(r => r.RiskType == "consecutive_mistakes");
        Assert.NotNull(consecRisk);
        Assert.Equal("high", consecRisk.RiskLevel);
        Assert.Equal("Cực trị của hàm số", consecRisk.TopicName);
        Assert.Contains("3 lượt câu hỏi liên tiếp", consecRisk.RootCauseEvidence);

        // Verify decay unreviewed detected
        var decayRisk = risks.FirstOrDefault(r => r.RiskType == "decay_unreviewed");
        Assert.NotNull(decayRisk);
        Assert.Equal("medium", decayRisk.RiskLevel);
        Assert.Equal("Tính đơn điệu của hàm số", decayRisk.TopicName);
        Assert.Contains("ngày kể từ phiên làm bài gần nhất", decayRisk.RootCauseEvidence);
    }

    [Fact]
    public async Task Analytics_03_GetAiLearningReport_GeneratesHolisticReport_WithFallback()
    {
        using var db = CreateInMemoryDb(nameof(Analytics_03_GetAiLearningReport_GeneratesHolisticReport_WithFallback));
        SeedCurriculumAndQuestions(db);

        const string userId = "student_report_03";
        const string subjectId = "sub_math12";

        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_rep",
            UserId = userId,
            SubjectId = subjectId,
            TopicName = "Tính đơn điệu của hàm số",
            AttemptCount = 8,
            CorrectCount = 7,
            MasteryScore = 87.5,
            Status = "proficient"
        });
        await db.SaveChangesAsync();

        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);
        var analyticsService = new LearningAnalyticsService(db, masteryService, new FakeLlmProvider(), NullLogger<LearningAnalyticsService>.Instance);

        var report = await analyticsService.GetAiLearningReportAsync(userId, subjectId);

        Assert.NotNull(report);
        Assert.Equal(userId, report.UserId);
        Assert.Equal(subjectId, report.SubjectId);
        Assert.NotEmpty(report.ReportId);
        Assert.NotEmpty(report.OverallEvaluation);
        Assert.NotEmpty(report.PedagogicalNarrative);
        Assert.NotEmpty(report.RecommendedGoals);
        Assert.NotEmpty(report.ShortTermStudyPlan);
        Assert.False(string.IsNullOrWhiteSpace(report.PedagogicalNarrative));

        // Now test explicitly when LLM throws an exception (simulating offline/quota exhausted)
        var failingLlm = new FailingLlmProvider();
        var analyticsWithFallback = new LearningAnalyticsService(db, masteryService, failingLlm, NullLogger<LearningAnalyticsService>.Instance);
        var fallbackReport = await analyticsWithFallback.GetAiLearningReportAsync(userId, subjectId);

        Assert.NotNull(fallbackReport);
        Assert.True(fallbackReport.IsFallbackNarrative);
        Assert.Equal("LocalPedagogicalEngine", fallbackReport.Provider);
        Assert.Contains("Bạn thể hiện phong độ tốt nhất", fallbackReport.PedagogicalNarrative);
    }

    private class FailingLlmProvider : ILlmProvider
    {
        public string ProviderName => "FailingProvider";
        public string DefaultModel => "fail-v1";
        public string? ReasoningModel => null;
        public string FallbackModel => "fail-fallback";
        public bool IsConfigured => true;

        public Task<LlmCompletionResponse> GenerateCompletionAsync(LlmCompletionRequest request)
        {
            throw new HttpRequestException("Resource Exhausted (429 Quota Exceeded)");
        }
    }

    [Fact]
    public async Task Exam_04_GenerateMatrixExam_DistributesCognitiveLevelsAccurately()
    {
        using var db = CreateInMemoryDb(nameof(Exam_04_GenerateMatrixExam_DistributesCognitiveLevelsAccurately));
        SeedCurriculumAndQuestions(db);

        var examService = new IntelligentExamService(db, NullLogger<IntelligentExamService>.Instance);

        var request = new ExamMatrixRequestDto
        {
            SubjectId = "sub_math12",
            Title = "Đề thi thử THPT Quốc gia số 1",
            DurationMinutes = 90,
            TotalQuestions = 20,
            CognitiveDistribution = new Dictionary<string, int>
            {
                ["nhan_biet"] = 8,
                ["thong_hieu"] = 6,
                ["van_dung"] = 4,
                ["van_dung_cao"] = 2
            }
        };

        var response = await examService.GenerateMatrixExamAsync("student_exam_04", request);

        Assert.NotNull(response);
        Assert.StartsWith("exam_", response.SessionId);
        Assert.Equal("exam", response.Mode);
        Assert.Equal(20, response.QuestionCount);
        Assert.Equal(90, response.TimeLimitMinutes);
        Assert.Equal("in_progress", response.Status);
        Assert.Equal(20, response.Questions.Count);

        // Zero-leak security check: correct answers must NOT be present in questions DTO
        foreach (var q in response.Questions)
        {
            Assert.NotEmpty(q.Id);
            Assert.NotEmpty(q.Prompt);
            Assert.NotEmpty(q.Options);
        }

        // Verify attempt saved in database
        var savedAttempt = await db.AssessmentAttempts.FirstOrDefaultAsync(a => a.Id == response.SessionId);
        Assert.NotNull(savedAttempt);
        Assert.Equal("asmt_exam", savedAttempt.AssessmentId);
        Assert.Equal("in_progress", savedAttempt.CompletionStatus);
    }

    [Fact]
    public async Task Exam_05_GetExamReviewAnalytics_ProvidesDeepBreakdown_And_RecommendsLessons()
    {
        using var db = CreateInMemoryDb(nameof(Exam_05_GetExamReviewAnalytics_ProvidesDeepBreakdown_And_RecommendsLessons));
        SeedCurriculumAndQuestions(db);

        const string userId = "student_review_05";

        var completedExam = new AssessmentAttempt
        {
            Id = "exam_completed_05",
            UserId = userId,
            SubjectId = "sub_math12",
            AssessmentId = "asmt_exam",
            CompletionStatus = "completed",
            ScoreRaw = 3.0,
            ScoreMax = 4.0,
            ScoreScaled = 7.5,
            SessionTimeMs = 3600000,
            LastActivityAt = DateTimeOffset.UtcNow,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_nb_1", IsCorrect = true },
                new() { QuestionId = "q_th_1", IsCorrect = true },
                new() { QuestionId = "q_vd_1", IsCorrect = true },
                new() { QuestionId = "q_vdc_1", IsCorrect = false } // Mistake on "Toạ độ của vectơ"
            }
        };
        db.AssessmentAttempts.Add(completedExam);
        await db.SaveChangesAsync();

        var examService = new IntelligentExamService(db, NullLogger<IntelligentExamService>.Instance);

        var analytics = await examService.GetExamReviewAnalyticsAsync(userId, "exam_completed_05");

        Assert.NotNull(analytics);
        Assert.Equal(7.5, analytics.ScoreScaled);
        Assert.Equal(3, analytics.CorrectCount);
        Assert.Equal(1, analytics.IncorrectCount);
        Assert.Equal(4, analytics.TotalQuestions);

        // Check cognitive breakdown
        Assert.True(analytics.ByCognitiveBreakdown.ContainsKey("nhan_biet"));
        Assert.Equal(100.0, analytics.ByCognitiveBreakdown["nhan_biet"].AccuracyPercent);
        Assert.True(analytics.ByCognitiveBreakdown.ContainsKey("van_dung_cao"));
        Assert.Equal(0.0, analytics.ByCognitiveBreakdown["van_dung_cao"].AccuracyPercent);

        // Check mistake topics & lesson recommendations
        Assert.Contains("Toạ độ của vectơ", analytics.MistakeTopics);
        Assert.NotEmpty(analytics.RecommendedLessons);
        var recLesson = analytics.RecommendedLessons.First();
        Assert.Equal("les_3", recLesson.LessonId);
        Assert.Equal("Toạ độ của vectơ", recLesson.LessonTitle);

        // Cross-tenant security: unauthorized user must be rejected
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            examService.GetExamReviewAnalyticsAsync("attacker_student", "exam_completed_05"));
    }
}

