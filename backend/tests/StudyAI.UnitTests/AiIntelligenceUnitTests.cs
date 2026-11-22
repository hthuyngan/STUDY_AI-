using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;


using StudyAI.Models;
using StudyAI.Data;

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
    public async Task AiHintService_BlocksHints_WhenSessionModeInDbIsExam_EvenIfFrontendSendsPractice()
    {
        using var db = CreateInMemoryDb(nameof(AiHintService_BlocksHints_WhenSessionModeInDbIsExam_EvenIfFrontendSendsPractice));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var hintService = new AiHintService(db, usageService, NullLogger<AiHintService>.Instance);

        db.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = "sess_exam_123",
            UserId = "usr_student1",
            AssessmentId = "asmt_exam",
            CompletionStatus = "in_progress",
            SuspendDataJson = "{\"mode\":\"exam\"}"
        });
        db.ContentQuestions.Add(new ContentQuestion
        {
            Id = "q_exam_1",
            Prompt = "Tính tích phân $\\int_0^1 x dx$",
            CorrectAnswer = "A"
        });
        await db.SaveChangesAsync();

        // Frontend fraudulently claims mode is "practice", but DB shows it's an exam session
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            hintService.GetHintAsync("usr_student1", "q_exam_1", 1, sessionId: "sess_exam_123", mode: "practice"));
    }

    [Fact]
    public async Task AiHintService_EnforcesSessionUserIsolation()
    {
        using var db = CreateInMemoryDb(nameof(AiHintService_EnforcesSessionUserIsolation));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var hintService = new AiHintService(db, usageService, NullLogger<AiHintService>.Instance);

        db.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = "sess_user_a",
            UserId = "usr_legit_owner",
            AssessmentId = "asmt_practice",
            CompletionStatus = "in_progress"
        });
        db.ContentQuestions.Add(new ContentQuestion
        {
            Id = "q_calc_isolate",
            Prompt = "Cho hàm số $y = x^2$",
            CorrectAnswer = "B"
        });
        await db.SaveChangesAsync();

        // Attacker attempts to request hint for another user's session
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            hintService.GetHintAsync("usr_attacker", "q_calc_isolate", 1, sessionId: "sess_user_a"));
    }

    [Fact]
    public async Task AiHintService_TopicAdaptedHints_GeneratesFormulasForOxyzAndIntegrals()
    {
        using var db = CreateInMemoryDb(nameof(AiHintService_TopicAdaptedHints_GeneratesFormulasForOxyzAndIntegrals));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var hintService = new AiHintService(db, usageService, NullLogger<AiHintService>.Instance);

        db.ContentQuestions.Add(new ContentQuestion
        {
            Id = "q_oxyz_1",
            Prompt = "Trong không gian $Oxyz$, viết phương trình mặt phẳng $(P)$ đi qua $A(1;0;2)$ có vectơ pháp tuyến $\\vec{n} = (1;2;3)$.",
            Topic = "Phương trình mặt phẳng Oxyz",
            Difficulty = "medium",
            CorrectAnswer = "C",
            Explanation = "Áp dụng phương trình tổng quát mặt phẳng."
        });

        db.ContentQuestions.Add(new ContentQuestion
        {
            Id = "q_integral_1",
            Prompt = "Tính nguyên hàm $\\int x e^x dx$.",
            Topic = "Nguyên hàm và Tích phân",
            Difficulty = "hard",
            CorrectAnswer = "A",
            Explanation = "Dùng phương pháp từng phần: đặt u = x, dv = e^x dx."
        });
        await db.SaveChangesAsync();

        // Check Oxyz hints
        var oxyzHint1 = await hintService.GetHintAsync("usr_student1", "q_oxyz_1", 1);
        Assert.Contains("không gian", oxyzHint1.HintText);
        Assert.Contains(oxyzHint1.MathFormulas, f => f.Contains("vec{n}") || f.Contains("vec{u}"));

        var oxyzHint2 = await hintService.GetHintAsync("usr_student1", "q_oxyz_1", 2);
        Assert.Contains("tích có hướng", oxyzHint2.HintText);

        // Check Integral hints
        var intHint2 = await hintService.GetHintAsync("usr_student1", "q_integral_1", 2);
        Assert.Contains("từng phần", intHint2.HintText);
        Assert.Contains(intHint2.MathFormulas, f => f.Contains("\\int u dv"));
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
        Assert.DoesNotContain("Đáp án A", h3.HintText);

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
            CompletionStatus = "completed",
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
        Assert.Contains("Khả năng cao do", analysis.AnalyzedErrors[0].LikelyCause);
    }

    [Fact]
    public async Task AiAnalysisService_RequiresCompletedAttempt()
    {
        using var db = CreateInMemoryDb(nameof(AiAnalysisService_RequiresCompletedAttempt));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var analysisService = new AiAnalysisService(db, usageService, NullLogger<AiAnalysisService>.Instance);

        db.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = "att_in_progress",
            UserId = "usr_student_active",
            CompletionStatus = "in_progress",
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_1", IsCorrect = false }
            }
        });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            analysisService.AnalyzeSessionErrorsAsync("usr_student_active", "att_in_progress"));
    }

    [Fact]
    public async Task StudentMasteryService_IsStrictlyIdempotent_DoesNotDoubleCountSameAttempt()
    {
        using var db = CreateInMemoryDb(nameof(StudentMasteryService_IsStrictlyIdempotent_DoesNotDoubleCountSameAttempt));
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        var q1 = new ContentQuestion { Id = "q_idemp_1", Topic = "Hàm số mũ", Difficulty = "medium" };
        var q2 = new ContentQuestion { Id = "q_idemp_2", Topic = "Hàm số mũ", Difficulty = "medium" };
        var q3 = new ContentQuestion { Id = "q_idemp_3", Topic = "Hàm số mũ", Difficulty = "medium" };
        db.ContentQuestions.AddRange(q1, q2, q3);

        var attempt = new AssessmentAttempt
        {
            Id = "att_idemp_100",
            UserId = "usr_student_idemp",
            SubjectId = "sub_math12",
            CompletionStatus = "completed",
            ScoreScaled = 10.0,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_idemp_1", IsCorrect = true },
                new() { QuestionId = "q_idemp_2", IsCorrect = true },
                new() { QuestionId = "q_idemp_3", IsCorrect = true }
            }
        };
        db.AssessmentAttempts.Add(attempt);
        await db.SaveChangesAsync();

        // First call
        await masteryService.UpdateMasteryFromAttemptAsync("usr_student_idemp", "att_idemp_100");

        var masteryAfterFirst = await db.StudentTopicMasteries
            .FirstOrDefaultAsync(m => m.UserId == "usr_student_idemp" && m.TopicName == "Hàm số mũ");
        Assert.NotNull(masteryAfterFirst);
        Assert.Equal(3, masteryAfterFirst.AttemptCount);
        Assert.Equal(3, masteryAfterFirst.CorrectCount);

        // Second call with same attempt (e.g. duplicate request)
        await masteryService.UpdateMasteryFromAttemptAsync("usr_student_idemp", "att_idemp_100");

        var masteryAfterSecond = await db.StudentTopicMasteries
            .FirstOrDefaultAsync(m => m.UserId == "usr_student_idemp" && m.TopicName == "Hàm số mũ");
        Assert.NotNull(masteryAfterSecond);
        // AttemptCount MUST remain 3, not double to 6!
        Assert.Equal(3, masteryAfterSecond.AttemptCount);
        Assert.Equal(3, masteryAfterSecond.CorrectCount);
    }

    [Fact]
    public async Task StudentMasteryService_ScopesHintsStrictlyToCurrentSession()
    {
        using var db = CreateInMemoryDb(nameof(StudentMasteryService_ScopesHintsStrictlyToCurrentSession));
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        var q = new ContentQuestion { Id = "q_scoped_hint", Topic = "Nguyên hàm", Difficulty = "medium" };
        db.ContentQuestions.Add(q);

        // Hint was used in past Session A
        db.AiHintUsages.Add(new AiHintUsage
        {
            Id = "h_old",
            UserId = "usr_student_hints",
            QuestionId = "q_scoped_hint",
            SessionId = "sess_old_A",
            HintLevel = 1
        });

        // Now student does Session B on the same question, but asks 0 hints in Session B!
        var attemptB = new AssessmentAttempt
        {
            Id = "sess_new_B",
            UserId = "usr_student_hints",
            SubjectId = "sub_math12",
            CompletionStatus = "completed",
            ScoreScaled = 10.0,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_scoped_hint", IsCorrect = true }
            }
        };
        db.AssessmentAttempts.Add(attemptB);
        await db.SaveChangesAsync();

        await masteryService.UpdateMasteryFromAttemptAsync("usr_student_hints", "sess_new_B");

        var mastery = await db.StudentTopicMasteries
            .FirstOrDefaultAsync(m => m.UserId == "usr_student_hints" && m.TopicName == "Nguyên hàm");
        Assert.NotNull(mastery);
        // HintCount for this attempt session MUST be 0, not 1!
        Assert.Equal(0, mastery.HintCount);
    }

    [Fact]
    public async Task StudentMasteryService_EnforcesUserIsolation_CannotProcessAnotherUsersAttempt()
    {
        using var db = CreateInMemoryDb(nameof(StudentMasteryService_EnforcesUserIsolation_CannotProcessAnotherUsersAttempt));
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        db.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = "att_user_x",
            UserId = "usr_student_X",
            SubjectId = "sub_math12",
            CompletionStatus = "completed",
            ScoreScaled = 8.0,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_1", IsCorrect = true }
            }
        });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            masteryService.UpdateMasteryFromAttemptAsync("usr_student_Y", "att_user_x"));
    }

    [Fact]
    public async Task StudentMasteryService_DoesNotMisclassifyUnknownSubjectAsMath12()
    {
        using var db = CreateInMemoryDb(nameof(StudentMasteryService_DoesNotMisclassifyUnknownSubjectAsMath12));
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        db.ContentQuestions.Add(new ContentQuestion
        {
            Id = "q_unknown_subject",
            Topic = "Chủ đề chưa xác định",
            Difficulty = "medium"
        });
        db.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = "att_unknown_subject",
            UserId = "usr_without_grade",
            SubjectId = string.Empty,
            CompletionStatus = "completed",
            ScoreScaled = 10.0,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_unknown_subject", IsCorrect = true }
            }
        });
        await db.SaveChangesAsync();

        await masteryService.UpdateMasteryFromAttemptAsync("usr_without_grade", "att_unknown_subject");

        Assert.Empty(await db.StudentTopicMasteries.ToListAsync());
        var attempt = await db.AssessmentAttempts.SingleAsync(a => a.Id == "att_unknown_subject");
        Assert.DoesNotContain("masteryProcessed", attempt.SuspendDataJson ?? string.Empty);
    }

    [Fact]
    public async Task StudentMasteryService_ComputesAllSubjectsWithoutMixingTheirResponses()
    {
        using var db = CreateInMemoryDb(nameof(StudentMasteryService_ComputesAllSubjectsWithoutMixingTheirResponses));
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        db.ContentQuestions.AddRange(
            new ContentQuestion { Id = "q_math10", SubjectId = "sub_math10", Topic = "Mệnh đề" },
            new ContentQuestion { Id = "q_math11", SubjectId = "sub_math11", Topic = "Lượng giác" });
        db.AssessmentAttempts.AddRange(
            new AssessmentAttempt
            {
                Id = "att_math10",
                UserId = "usr_multi_subject",
                SubjectId = "sub_math10",
                CompletionStatus = "completed",
                ScoreScaled = 10,
                Responses = new List<AssessmentResponse>
                {
                    new() { QuestionId = "q_math10", IsCorrect = true }
                }
            },
            new AssessmentAttempt
            {
                Id = "att_math11",
                UserId = "usr_multi_subject",
                SubjectId = "sub_math11",
                CompletionStatus = "completed",
                ScoreScaled = 0,
                Responses = new List<AssessmentResponse>
                {
                    new() { QuestionId = "q_math11", IsCorrect = false }
                }
            });
        await db.SaveChangesAsync();

        var result = await masteryService.GetStudentMasteryAsync("usr_multi_subject", "all");

        Assert.Equal(2, result.SkillsEvaluated);
        Assert.Contains(result.Skills, skill => skill.SubjectId == "sub_math10" && skill.SkillName == "Mệnh đề" && skill.TotalCorrect == 1);
        Assert.Contains(result.Skills, skill => skill.SubjectId == "sub_math11" && skill.SkillName == "Lượng giác" && skill.TotalCorrect == 0);
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
            CompletionStatus = "completed",
            ScoreScaled = 10.0,
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
        Assert.Equal("standard_curriculum", path.CurrentStage);
    }

    [Fact]
    public async Task StudentMasteryService_GetStudentKnowledgeProfileAsync_ReturnsComprehensiveMetricsAnd4TierClassification()
    {
        using var db = CreateInMemoryDb(nameof(StudentMasteryService_GetStudentKnowledgeProfileAsync_ReturnsComprehensiveMetricsAnd4TierClassification));
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        var chap = new ContentChapter { Id = "c1", SubjectId = "sub_math12", Title = "Chương 1", OrderIndex = 1 };
        db.ContentChapters.Add(chap);

        var les1 = new ContentLesson { Id = "les_prof_1", ChapterId = "c1", Title = "Tính đơn điệu của hàm số", OrderIndex = 1, Status = "published" };
        var les2 = new ContentLesson { Id = "les_prof_2", ChapterId = "c1", Title = "Cực trị của hàm số", OrderIndex = 2, Status = "published" };
        db.ContentLessons.AddRange(les1, les2);

        // Lesson progress: 1 of 2 completed
        db.LessonProgresses.Add(new LessonProgress
        {
            Id = 1,
            UserId = "usr_profile_test",
            LessonId = "les_prof_1",
            SubjectId = "sub_math12",
            OverallProgress = 100,
            ContentProgress = 100
        });

        // Questions with varying difficulties
        var qEasy = new ContentQuestion { Id = "q_easy_1", Topic = "Tính đơn điệu", Difficulty = "nhan_biet" };
        var qMed = new ContentQuestion { Id = "q_med_1", Topic = "Cực trị", Difficulty = "thong_hieu" };
        var qHard = new ContentQuestion { Id = "q_hard_1", Topic = "Cực trị", Difficulty = "van_dung" };
        db.ContentQuestions.AddRange(qEasy, qMed, qHard);

        // Completed Attempt with responses
        var attempt = new AssessmentAttempt
        {
            Id = "att_profile_1",
            UserId = "usr_profile_test",
            SubjectId = "sub_math12",
            CompletionStatus = "completed",
            ScoreScaled = 6.67,
            SessionTimeMs = 120000,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_easy_1", IsCorrect = true, TimeSpentMs = 30000 },
                new() { QuestionId = "q_med_1", IsCorrect = true, TimeSpentMs = 40000 },
                new() { QuestionId = "q_hard_1", IsCorrect = false, TimeSpentMs = 50000 }
            }
        };
        db.AssessmentAttempts.Add(attempt);
        await db.SaveChangesAsync();

        // Call GetStudentKnowledgeProfileAsync
        var profile = await masteryService.GetStudentKnowledgeProfileAsync("usr_profile_test", "sub_math12");

        Assert.NotNull(profile);
        Assert.Equal("usr_profile_test", profile.UserId);
        Assert.Equal("sub_math12", profile.SubjectId);
        Assert.Equal(3, profile.TotalQuestionsAttempted);
        Assert.Equal(2, profile.TotalCorrect);
        Assert.Equal(1, profile.TotalIncorrect);
        Assert.Equal(66.7, profile.OverallAccuracyPercent);
        Assert.Equal(120, profile.TotalTimeSpentSeconds);
        Assert.Equal(1, profile.TotalSessionsCompleted);
        Assert.Equal(1, profile.LessonsCompletedCount);
        Assert.Equal(2, profile.TotalLessonsCount);
        Assert.Equal(50.0, profile.CurriculumProgressPercent);

        // Verify Difficulty Breakdown
        Assert.True(profile.DifficultyBreakdown.ContainsKey("nhan_biet"));
        Assert.True(profile.DifficultyBreakdown.ContainsKey("thong_hieu"));
        Assert.True(profile.DifficultyBreakdown.ContainsKey("van_dung"));
        Assert.Equal(1, profile.DifficultyBreakdown["nhan_biet"].CorrectCount);
        Assert.Equal(1, profile.DifficultyBreakdown["thong_hieu"].CorrectCount);
        Assert.Equal(0, profile.DifficultyBreakdown["van_dung"].CorrectCount);

        // Verify 4-tier labeling & explanation
        Assert.False(string.IsNullOrWhiteSpace(profile.OverallStatusLabel));
        Assert.False(string.IsNullOrWhiteSpace(profile.ScoringExplanation));
        Assert.Contains("Mastery Score", profile.ScoringExplanation);
    }

    [Fact]
    public async Task AiTutorService_CoachingIntents_AnswersWeakTopicsWithVerifiedData()
    {
        using var db = CreateInMemoryDb(nameof(AiTutorService_CoachingIntents_AnswersWeakTopicsWithVerifiedData));
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        // Prepopulate a weak topic
        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_weak_1",
            UserId = "usr_student_coach",
            SubjectId = "sub_math12",
            TopicName = "Cực trị của hàm số",
            AttemptCount = 5,
            CorrectCount = 1,
            HintCount = 0,
            MasteryScore = 20.0,
            Status = "needs_reinforcement"
        });

        var conv = new AiConversation
        {
            Id = "conv_coach_1",
            UserId = "usr_student_coach",
            Title = "Hỏi AI Coach",
            Subject = "math",
            AssistanceMode = "explain"
        };
        db.AiConversations.Add(conv);
        await db.SaveChangesAsync();

        var tutorService = new AiTutorService(
            db,
            new FakeLlmProvider(),
            NullLogger<AiTutorService>.Instance,
            null,
            masteryService);

        var request = new SendAiMessageRequestDto(
            Message: "Em đang yếu phần nào vậy thầy?",
            AssistanceMode: "explain"
        );

        var response = await tutorService.SendMessageAsync("usr_student_coach", "learner", "conv_coach_1", request);

        Assert.NotNull(response);
        Assert.NotNull(response.AssistantMessage);
        Assert.Contains("Cực trị của hàm số", response.AssistantMessage.Content);
        Assert.Contains("Chưa nắm vững", response.AssistantMessage.Content);
        Assert.Contains("20%", response.AssistantMessage.Content);
    }

    [Fact]
    public async Task LearningRecommendationService_GetKnowledgeGaps_DetectsWeakTopicsAccurately()
    {
        using var db = CreateInMemoryDb(nameof(LearningRecommendationService_GetKnowledgeGaps_DetectsWeakTopicsAccurately));
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);
        var recService = new LearningRecommendationService(db, masteryService, usageService, NullLogger<LearningRecommendationService>.Instance);

        var chap = new ContentChapter { Id = "c_gap_1", SubjectId = "sub_math12", Title = "Chương 1" };
        db.ContentChapters.Add(chap);

        var les = new ContentLesson { Id = "les_gap_1", ChapterId = "c_gap_1", Title = "Tính đơn điệu của hàm số", Status = "published" };
        db.ContentLessons.Add(les);

        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_gap_test",
            UserId = "usr_gap_student",
            SubjectId = "sub_math12",
            TopicName = "Tính đơn điệu của hàm số",
            AttemptCount = 4,
            CorrectCount = 1,
            MasteryScore = 25.0,
            Status = "needs_reinforcement"
        });
        await db.SaveChangesAsync();

        var gaps = await recService.GetKnowledgeGapsAsync("usr_gap_student", "sub_math12");

        Assert.NotEmpty(gaps);
        var firstGap = gaps.First();
        Assert.Equal("Tính đơn điệu của hàm số", firstGap.SkillName);
        Assert.Equal("critical", firstGap.Severity);
        Assert.Equal("les_gap_1", firstGap.RecommendedLessonId);
        Assert.NotEmpty(firstGap.PrerequisiteConcepts);
        Assert.NotEmpty(firstGap.ActionSteps);
    }
}
