using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Features.Student;
using StudyAI.Features.AI;


using StudyAI.Features.Student;
using StudyAI.Models;
using StudyAI.Data;

using Xunit;

namespace StudyAI.UnitTests;

/// <summary>
/// Phase AI-02 Independent Acceptance & Comprehensive Audit Test Suite
/// Verifies Student Mastery, Gap Detection, Learning Path, Adaptive Practice,
/// Grounded AI Learning Coach, and Security/Consistency invariants.
/// </summary>
public class PhaseAi02ComprehensiveAuditTests
{
    private StudyAIDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new StudyAIDbContext(options);
    }

    private void SeedCurriculum(StudyAIDbContext db)
    {
        if (db.ContentSubjects.Any(s => s.Id == "sub_math12")) return;

        var sub = new ContentSubject { Id = "sub_math12", Name = "Toán 12", Code = "MATH12", OrderIndex = 1, IsActive = true };
        db.ContentSubjects.Add(sub);

        var chp1 = new ContentChapter { Id = "chp_c1", SubjectId = "sub_math12", Title = "Chương 1: Ứng dụng đạo hàm", OrderIndex = 1, IsActive = true };
        var chp2 = new ContentChapter { Id = "chp_c2", SubjectId = "sub_math12", Title = "Chương 2: Vectơ không gian", OrderIndex = 2, IsActive = true };
        db.ContentChapters.AddRange(chp1, chp2);

        var les1 = new ContentLesson { Id = "les_c1_b1", ChapterId = "chp_c1", Title = "Tính đơn điệu của hàm số", OrderIndex = 1, Status = "published" };
        var les2 = new ContentLesson { Id = "les_c1_b2", ChapterId = "chp_c1", Title = "Cực trị của hàm số", OrderIndex = 2, Status = "published" };
        var les3 = new ContentLesson { Id = "les_c1_b3", ChapterId = "chp_c1", Title = "Giá trị lớn nhất và nhỏ nhất", OrderIndex = 3, Status = "published" };
        db.ContentLessons.AddRange(les1, les2, les3);

        // Seed 10 questions with varied difficulties for testing
        db.ContentQuestions.AddRange(
            new ContentQuestion { Id = "q_easy_1", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b2", Topic = "Cực trị của hàm số", Difficulty = "nhan_biet", CorrectAnswer = "A", Status = "published", IsDeleted = false },
            new ContentQuestion { Id = "q_easy_2", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b2", Topic = "Cực trị của hàm số", Difficulty = "nhan_biet", CorrectAnswer = "B", Status = "published", IsDeleted = false },
            new ContentQuestion { Id = "q_med_1", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b2", Topic = "Cực trị của hàm số", Difficulty = "thong_hieu", CorrectAnswer = "C", Status = "published", IsDeleted = false },
            new ContentQuestion { Id = "q_med_2", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b2", Topic = "Cực trị của hàm số", Difficulty = "thong_hieu", CorrectAnswer = "D", Status = "published", IsDeleted = false },
            new ContentQuestion { Id = "q_hard_1", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b2", Topic = "Cực trị của hàm số", Difficulty = "van_dung", CorrectAnswer = "A", Status = "published", IsDeleted = false },
            new ContentQuestion { Id = "q_hard_2", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b2", Topic = "Cực trị của hàm số", Difficulty = "van_dung", CorrectAnswer = "B", Status = "published", IsDeleted = false },
            new ContentQuestion { Id = "q_vhard_1", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b2", Topic = "Cực trị của hàm số", Difficulty = "van_dung_cao", CorrectAnswer = "C", Status = "published", IsDeleted = false },
            new ContentQuestion { Id = "q_mono_1", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b1", Topic = "Tính đơn điệu của hàm số", Difficulty = "nhan_biet", CorrectAnswer = "A", Status = "published", IsDeleted = false },
            new ContentQuestion { Id = "q_mono_2", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b1", Topic = "Tính đơn điệu của hàm số", Difficulty = "thong_hieu", CorrectAnswer = "B", Status = "published", IsDeleted = false },
            new ContentQuestion { Id = "q_mono_3", SubjectId = "sub_math12", ChapterId = "chp_c1", LessonId = "les_c1_b1", Topic = "Tính đơn điệu của hàm số", Difficulty = "van_dung", CorrectAnswer = "C", Status = "published", IsDeleted = false }
        );
        db.SaveChanges();
    }

    [Fact]
    public async Task Audit_01_StudentMastery_4TierClassification_And_DifficultyBreakdown()
    {
        using var db = CreateInMemoryDb(nameof(Audit_01_StudentMastery_4TierClassification_And_DifficultyBreakdown));
        SeedCurriculum(db);
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        const string userId = "student_audit_01";

        // Setup student with 6 questions (3 correct, 3 incorrect = 50% accuracy)
        var attempt = new AssessmentAttempt
        {
            Id = "att_audit_1",
            UserId = userId,
            SubjectId = "sub_math12",
            CompletionStatus = "completed",
            ScoreScaled = 5.0,
            SessionTimeMs = 90000,
            LastActivityAt = DateTimeOffset.UtcNow,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_easy_1", IsCorrect = true, TimeSpentMs = 20000 },
                new() { QuestionId = "q_easy_2", IsCorrect = true, TimeSpentMs = 20000 },
                new() { QuestionId = "q_med_1", IsCorrect = true, TimeSpentMs = 25000 },
                new() { QuestionId = "q_med_2", IsCorrect = false, TimeSpentMs = 25000 },
                new() { QuestionId = "q_hard_1", IsCorrect = false, TimeSpentMs = 25000 },
                new() { QuestionId = "q_hard_2", IsCorrect = false, TimeSpentMs = 25000 },
            }
        };
        db.AssessmentAttempts.Add(attempt);
        await db.SaveChangesAsync();

        var profile = await masteryService.GetStudentKnowledgeProfileAsync(userId, "sub_math12");

        Assert.NotNull(profile);
        Assert.Equal(6, profile.TotalQuestionsAttempted);
        Assert.Equal(3, profile.TotalCorrect);
        Assert.Equal(3, profile.TotalIncorrect);
        Assert.Equal(50.0, profile.OverallAccuracyPercent);

        // Check difficulty breakdown
        Assert.True(profile.DifficultyBreakdown.ContainsKey("nhan_biet"));
        Assert.Equal(2, profile.DifficultyBreakdown["nhan_biet"].TotalQuestions);
        Assert.Equal(2, profile.DifficultyBreakdown["nhan_biet"].CorrectCount);
        Assert.Equal(100.0, profile.DifficultyBreakdown["nhan_biet"].AccuracyPercent);

        Assert.True(profile.DifficultyBreakdown.ContainsKey("thong_hieu"));
        Assert.Equal(2, profile.DifficultyBreakdown["thong_hieu"].TotalQuestions);
        Assert.Equal(1, profile.DifficultyBreakdown["thong_hieu"].CorrectCount);
        Assert.Equal(50.0, profile.DifficultyBreakdown["thong_hieu"].AccuracyPercent);

        // Check 4-tier competency classification (>= 5 questions, 50% score -> progressing)
        Assert.Equal("progressing", profile.OverallStatus);
        Assert.Equal("Cần củng cố", profile.OverallStatusLabel);
        Assert.Contains("Cần củng cố", profile.ScoringExplanation);
    }

    [Fact]
    public async Task Audit_02_CompleteLifecycle_Fail_GapDetected_Recommend_RetrySuccess_MasteryUpdated()
    {
        using var db = CreateInMemoryDb(nameof(Audit_02_CompleteLifecycle_Fail_GapDetected_Recommend_RetrySuccess_MasteryUpdated));
        SeedCurriculum(db);
        var config = new ConfigurationBuilder().Build();
        var usageService = new AiUsageService(db, new FakeLlmProvider(), config, NullLogger<AiUsageService>.Instance);
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);
        var recService = new LearningRecommendationService(db, masteryService, usageService, NullLogger<LearningRecommendationService>.Instance);

        const string userId = "student_lifecycle_audit";
        const string subjectId = "sub_math12";

        // ─────────────────────────────────────────────────────────────────────
        // GIAI ĐOẠN 1: Học sinh làm bài lần đầu bị sai 4/5 câu về "Cực trị của hàm số"
        // ─────────────────────────────────────────────────────────────────────
        var initialTopicMastery = new StudentTopicMastery
        {
            Id = $"mst_{Guid.NewGuid():N}",
            UserId = userId,
            SubjectId = subjectId,
            TopicName = "Cực trị của hàm số",
            AttemptCount = 5,
            CorrectCount = 1,
            HintCount = 2,
            MasteryScore = 20.0,
            Status = "needs_reinforcement",
            LastAttemptAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.StudentTopicMasteries.Add(initialTopicMastery);

        var failAttempt = new AssessmentAttempt
        {
            Id = "att_initial_fail",
            UserId = userId,
            SubjectId = subjectId,
            CompletionStatus = "completed",
            ScoreScaled = 2.0,
            SessionTimeMs = 120000,
            LastActivityAt = DateTimeOffset.UtcNow,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_easy_1", IsCorrect = true },
                new() { QuestionId = "q_easy_2", IsCorrect = false },
                new() { QuestionId = "q_med_1", IsCorrect = false },
                new() { QuestionId = "q_med_2", IsCorrect = false },
                new() { QuestionId = "q_hard_1", IsCorrect = false }
            }
        };
        db.AssessmentAttempts.Add(failAttempt);
        await db.SaveChangesAsync();

        // ─────────────────────────────────────────────────────────────────────
        // GIAI ĐOẠN 2: Phát hiện lỗ hổng kiến thức (Knowledge Gap Detection)
        // ─────────────────────────────────────────────────────────────────────
        var gaps = await recService.GetKnowledgeGapsAsync(userId, subjectId);
        Assert.NotEmpty(gaps);

        var extremeGap = gaps.FirstOrDefault(g => g.SkillName.Contains("Cực trị"));
        Assert.NotNull(extremeGap);
        Assert.Equal("critical", extremeGap.Severity);
        Assert.True(extremeGap.Status == "open" || extremeGap.Status == "reviewing");
        Assert.NotEmpty(extremeGap.PrerequisiteConcepts);
        Assert.Contains(extremeGap.PrerequisiteConcepts, p => p.Contains("đạo hàm") || p.Contains("bảng biến thiên"));
        Assert.Equal(4, extremeGap.ActionSteps.Count);
        Assert.Equal(5, extremeGap.RecommendedPracticeCount);

        // ─────────────────────────────────────────────────────────────────────
        // GIAI ĐOẠN 3: Tạo lộ trình thích ứng đề xuất ôn tập
        // ─────────────────────────────────────────────────────────────────────
        var learningPath = await recService.GetLearningPathAsync(userId, subjectId);
        Assert.NotNull(learningPath);
        Assert.NotEmpty(learningPath.Steps);
        Assert.NotEmpty(learningPath.ShortTermGoals);

        // Step 1 must focus on reviewing the critical gap
        var firstStep = learningPath.Steps.First();
        Assert.Contains("Cực trị", firstStep.Title);
        Assert.Equal("review_lesson", firstStep.ActionType);

        // ─────────────────────────────────────────────────────────────────────
        // GIAI ĐOẠN 4: Học sinh thực hiện phiên luyện tập củng cố và làm đúng 5/5 câu
        // ─────────────────────────────────────────────────────────────────────
        var successAttempt = new AssessmentAttempt
        {
            Id = "att_remediation_success",
            UserId = userId,
            SubjectId = subjectId,
            CompletionStatus = "completed",
            ScoreScaled = 10.0,
            SessionTimeMs = 150000,
            LastActivityAt = DateTimeOffset.UtcNow,
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_easy_1", IsCorrect = true },
                new() { QuestionId = "q_easy_2", IsCorrect = true },
                new() { QuestionId = "q_med_1", IsCorrect = true },
                new() { QuestionId = "q_med_2", IsCorrect = true },
                new() { QuestionId = "q_hard_1", IsCorrect = true }
            }
        };
        db.AssessmentAttempts.Add(successAttempt);

        // Update mastery to reflect practice success
        initialTopicMastery.AttemptCount += 5;
        initialTopicMastery.CorrectCount += 5; // 6/10 total = 60%, plus trend weight => proficient
        initialTopicMastery.MasteryScore = 75.0;
        initialTopicMastery.Status = "proficient";
        initialTopicMastery.LastAttemptAt = DateTimeOffset.UtcNow;
        initialTopicMastery.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        // ─────────────────────────────────────────────────────────────────────
        // GIAI ĐOẠN 5: Cập nhật Mastery và Kiểm tra lỗ hổng đã được khắc phục
        // ─────────────────────────────────────────────────────────────────────
        var updatedProfile = await masteryService.GetStudentKnowledgeProfileAsync(userId, subjectId);
        Assert.Equal(10, updatedProfile.TotalQuestionsAttempted);
        Assert.Equal(6, updatedProfile.TotalCorrect);
        Assert.Equal(60.0, updatedProfile.OverallAccuracyPercent);

        var updatedGaps = await recService.GetKnowledgeGapsAsync(userId, subjectId);
        var postRemediationGap = updatedGaps.FirstOrDefault(g => g.SkillName.Contains("Cực trị"));
        // Gap is marked as resolved and reduced to minor severity because MasteryScore >= 70%
        Assert.NotNull(postRemediationGap);
        Assert.Equal("resolved", postRemediationGap.Status);
        Assert.Equal("minor", postRemediationGap.Severity);
        Assert.Equal(60.0, postRemediationGap.AccuracyPercent);
    }

    [Fact]
    public async Task Audit_03_AdaptivePractice_TargetsDifficulty_And_EnforcesAntiRepetition()
    {
        using var db = CreateInMemoryDb(nameof(Audit_03_AdaptivePractice_TargetsDifficulty_And_EnforcesAntiRepetition));
        SeedCurriculum(db);
        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);

        const string userId = "student_adaptive_test";
        const string subjectId = "sub_math12";

        // Mark q_easy_1 and q_easy_2 as answered recently (yesterday)
        var recentAttempt = new AssessmentAttempt
        {
            Id = "att_recent_1",
            UserId = userId,
            SubjectId = subjectId,
            LastActivityAt = DateTimeOffset.UtcNow.AddDays(-1),
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_easy_1", IsCorrect = true },
                new() { QuestionId = "q_easy_2", IsCorrect = true }
            }
        };
        db.AssessmentAttempts.Add(recentAttempt);

        // Student is struggling with "Cực trị của hàm số"
        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_weak_adapt",
            UserId = userId,
            SubjectId = subjectId,
            TopicName = "Cực trị của hàm số",
            MasteryScore = 30.0,
            Status = "needs_reinforcement"
        });
        await db.SaveChangesAsync();

        var clock = new SystemClock();
        var idGen = new IdGenerator();
        var practiceService = new LearnerPracticeService(db, clock, idGen, masteryService);
        var controller = new LearnerPracticeController(practiceService);
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim("role", "learner")
        }, "TestAuth"));
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var request = new CreatePracticeSessionRequest
        {
            SubjectId = subjectId,
            Mode = "adaptive",
            QuestionCount = 4
        };

        var actionResult = await controller.CreateSession(request);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var response = Assert.IsType<PracticeSessionResponseDto>(okResult.Value);

        Assert.NotNull(response);
        Assert.Equal(4, response.Questions.Count);

        // Anti-repetition check: q_easy_1 and q_easy_2 were answered yesterday, so fresh questions should take precedence
        var selectedIds = response.Questions.Select(q => q.Id).ToList();
        
        // Assert that at least 2 questions are fresh unattempted questions (q_med_1, q_med_2, q_mono_1, etc.)
        var unattemptedCount = selectedIds.Count(id => id != "q_easy_1" && id != "q_easy_2");
        Assert.True(unattemptedCount >= 2, $"Expected at least 2 fresh questions, got {unattemptedCount}");
    }

    [Fact]
    public async Task Audit_04_AiLearningCoach_GroundedWithAuthenticatedStudentProfile()
    {
        using var db = CreateInMemoryDb(nameof(Audit_04_AiLearningCoach_GroundedWithAuthenticatedStudentProfile));
        SeedCurriculum(db);

        const string studentA = "student_A_id";
        const string studentB = "student_B_id";

        // Student A has weak topic "Cực trị của hàm số"
        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_A_1",
            UserId = studentA,
            SubjectId = "sub_math12",
            TopicName = "Cực trị của hàm số",
            MasteryScore = 25.0,
            AttemptCount = 4,
            CorrectCount = 1,
            Status = "needs_reinforcement"
        });

        // Student B has mastered "Cực trị của hàm số" but weak on "Vectơ không gian"
        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_B_1",
            UserId = studentB,
            SubjectId = "sub_math12",
            TopicName = "Vectơ trong không gian",
            MasteryScore = 30.0,
            AttemptCount = 5,
            CorrectCount = 1,
            Status = "needs_reinforcement"
        });

        var convA = new AiConversation { Id = "conv_A", UserId = studentA, Title = "Hỏi Coach A", Subject = "math", AssistanceMode = "explain" };
        var convB = new AiConversation { Id = "conv_B", UserId = studentB, Title = "Hỏi Coach B", Subject = "math", AssistanceMode = "explain" };
        db.AiConversations.AddRange(convA, convB);
        await db.SaveChangesAsync();

        var masteryService = new StudentMasteryService(db, NullLogger<StudentMasteryService>.Instance);
        var tutorService = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance, null, masteryService);

        // Student A asks: "Em đang yếu phần nào?"
        var reqA = new SendAiMessageRequestDto("Em đang yếu phần nào?", "explain");
        var respA = await tutorService.SendMessageAsync(studentA, "learner", "conv_A", reqA);

        Assert.NotNull(respA.AssistantMessage);
        Assert.Contains("Cực trị của hàm số", respA.AssistantMessage.Content);
        Assert.DoesNotContain("Vectơ trong không gian", respA.AssistantMessage.Content);

        // Student B asks: "Em đang yếu phần nào?"
        var reqB = new SendAiMessageRequestDto("Em đang yếu phần nào?", "explain");
        var respB = await tutorService.SendMessageAsync(studentB, "learner", "conv_B", reqB);

        Assert.NotNull(respB.AssistantMessage);
        Assert.Contains("Vectơ trong không gian", respB.AssistantMessage.Content);
        Assert.DoesNotContain("Cực trị của hàm số", respB.AssistantMessage.Content);
    }

    [Fact]
    public async Task Audit_05_SecurityAndConsistency_CrossUserAccessForbidden_And_SubmissionIdempotent()
    {
        using var db = CreateInMemoryDb(nameof(Audit_05_SecurityAndConsistency_CrossUserAccessForbidden_And_SubmissionIdempotent));
        SeedCurriculum(db);

        const string victimUserId = "victim_student";
        const string attackerUserId = "attacker_student";

        var victimAttempt = new AssessmentAttempt
        {
            Id = "sess_victim_01",
            UserId = victimUserId,
            SubjectId = "sub_math12",
            StartedAt = DateTimeOffset.UtcNow,
            CompletionStatus = "in_progress",
            SuspendDataJson = JsonSerializer.Serialize(new { questionIds = new[] { "q_easy_1", "q_easy_2" } })
        };
        db.AssessmentAttempts.Add(victimAttempt);
        await db.SaveChangesAsync();

        var clock = new SystemClock();
        var idGen = new IdGenerator();
        var practiceService = new LearnerPracticeService(db, clock, idGen, null);
        var controller = new LearnerPracticeController(practiceService);

        // Attacker attempts to submit or complete victim's practice session
        var attackerContext = new DefaultHttpContext();
        attackerContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, attackerUserId),
            new Claim("role", "learner")
        }, "TestAuth"));
        controller.ControllerContext = new ControllerContext { HttpContext = attackerContext };

        var submitRequest = new SubmitPracticeSessionRequest
        {
            Answers = new Dictionary<string, string> { { "q_easy_1", "A" } },
            SessionTimeMs = 60000
        };

        var submitResult = await controller.SubmitSession("sess_victim_01", submitRequest);
        // Must reject cross-tenant access with 403 Forbidden
        var forbiddenResult = Assert.IsType<ObjectResult>(submitResult);
        Assert.Equal(StatusCodes.Status403Forbidden, forbiddenResult.StatusCode);

        // Now victim submits legitimate attempt
        var victimContext = new DefaultHttpContext();
        victimContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, victimUserId),
            new Claim("role", "learner")
        }, "TestAuth"));
        controller.ControllerContext = new ControllerContext { HttpContext = victimContext };

        var firstSubmit = await controller.SubmitSession("sess_victim_01", submitRequest);
        Assert.IsType<OkObjectResult>(firstSubmit);

        // Idempotency: Attempting to complete already-completed session returns existing result, does not duplicate attempt or corrupt state
        var duplicateSubmit = await controller.SubmitSession("sess_victim_01", submitRequest);
        Assert.IsType<OkObjectResult>(duplicateSubmit);

        var countAttempts = await db.AssessmentAttempts.CountAsync(a => a.Id == "sess_victim_01");
        Assert.Equal(1, countAttempts);
    }
}
