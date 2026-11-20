using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

/// <summary>
/// Phase AI-04: Intelligent Exam Preparation & Learning Optimization Unit Tests
/// </summary>
public class PhaseAi04ExamPreparationUnitTests
{
    private StudyAIDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new StudyAIDbContext(options);
    }

    [Fact]
    public async Task Blueprint_01_Official2025Blueprint_HasCorrectRegulationAndSections()
    {
        var service = new ExamBlueprintService();
        var bp = await service.GetBlueprintByIdAsync("moet_thpt_2025_official");

        Assert.NotNull(bp);
        Assert.Equal("moet_thpt_2025_official", bp.BlueprintId);
        Assert.Equal(22, bp.TotalQuestions); // 12 + 4 + 6 = 22 main questions per 764/QĐ-BGDĐT
        Assert.Equal(34, bp.TotalSubQuestions); // 12 + 16 + 6 = 34 evaluation sub-questions
        Assert.Equal(34, bp.ScorableUnits);
        Assert.Equal(90, bp.DurationMinutes);
        Assert.Equal(10.0, bp.MaxScore);
        Assert.True(bp.IsOfficialStandard);
        Assert.Equal("verified_official", bp.VerificationStatus);
        Assert.Contains("764/QĐ-BGDĐT", bp.RegulationSource);
        Assert.Equal(3, bp.Sections.Count);

        // Section I: 12 multiple choice
        var s1 = bp.Sections[0];
        Assert.Equal(1, s1.SectionIndex);
        Assert.Equal("multiple_choice", s1.QuestionType);
        Assert.Equal(12, s1.QuestionCount);
        Assert.Equal(0.25, s1.PointsPerQuestion);
        Assert.Equal(3.0, s1.MaxSectionScore);

        // Section II: 4 true/false group
        var s2 = bp.Sections[1];
        Assert.Equal(2, s2.SectionIndex);
        Assert.Equal("true_false_group", s2.QuestionType);
        Assert.Equal(4, s2.QuestionCount);
        Assert.Equal(1.0, s2.PointsPerQuestion);
        Assert.Equal(4.0, s2.MaxSectionScore);

        // Section III: 6 short answer
        var s3 = bp.Sections[2];
        Assert.Equal(3, s3.SectionIndex);
        Assert.Equal("short_answer", s3.QuestionType);
        Assert.Equal(6, s3.QuestionCount);
        Assert.Equal(0.5, s3.PointsPerQuestion);
        Assert.Equal(3.0, s3.MaxSectionScore);
    }

    [Fact]
    public async Task Blueprint_02_LegacyAndCustomBlueprints_AreAvailable()
    {
        var service = new ExamBlueprintService();
        var all = await service.GetAvailableBlueprintsAsync();

        Assert.True(all.Count >= 4);

        var legacy = all.FirstOrDefault(b => b.BlueprintId == "moet_thpt_legacy_50q");
        Assert.NotNull(legacy);
        Assert.Equal(50, legacy.TotalQuestions);
        Assert.False(legacy.IsOfficialStandard); // Legacy is not current official standard
        Assert.Equal("verified_legacy", legacy.VerificationStatus);

        var chapterRev = all.FirstOrDefault(b => b.BlueprintId == "chapter_mastery_revision");
        Assert.NotNull(chapterRev);
        Assert.Equal(25, chapterRev.TotalQuestions);
        Assert.False(chapterRev.IsOfficialStandard);
    }

    [Fact]
    public void Quality_01_ValidateLatexSyntax_DetectsUnbalancedDelimiters()
    {
        using var db = CreateInMemoryDb(nameof(Quality_01_ValidateLatexSyntax_DetectsUnbalancedDelimiters));
        var qualityService = new QuestionQualityService(db, NullLogger<QuestionQualityService>.Instance);

        // Valid syntax
        Assert.True(qualityService.ValidateLatexSyntax("Cho hàm số $y = f(x)$ xác định trên $\\mathbb{R}$", out var err1));
        Assert.Null(err1);

        Assert.True(qualityService.ValidateLatexSyntax("Biểu thức $$E = mc^2$$ và inline \\(x + y = 1\\)", out var err2));
        Assert.Null(err2);

        // Unbalanced single dollar
        Assert.False(qualityService.ValidateLatexSyntax("Cho hàm số $y = f(x) liên tục", out var err3));
        Assert.Contains("'$' không đóng mở", err3);

        // Unbalanced double dollar
        Assert.False(qualityService.ValidateLatexSyntax("Công thức $$E = mc^2", out var err4));
        Assert.Contains("'$$' không đóng mở", err4);

        // Unbalanced inline parentheses
        Assert.False(qualityService.ValidateLatexSyntax("Ta có \\(a + b = c", out var err5));
        Assert.Contains("inline math", err5);

        // Unbalanced curly braces
        Assert.False(qualityService.ValidateLatexSyntax("$\\frac{1}{2$", out var err6));
        Assert.Contains("ngoặc nhọn", err6);
    }

    [Fact]
    public async Task Quality_02_AuditQuestionsQuality_FlagsBrokenLatexMissingAnswersAndDuplicates()
    {
        using var db = CreateInMemoryDb(nameof(Quality_02_AuditQuestionsQuality_FlagsBrokenLatexMissingAnswersAndDuplicates));
        const string subjectId = "sub_math12";

        // Seed 4 questions: 1 valid, 1 broken latex, 1 missing answer, 1 duplicate
        db.ContentQuestions.AddRange(
            new ContentQuestion
            {
                Id = "q_valid_1",
                SubjectId = subjectId,
                Prompt = "Tìm tập xác định của $y = \\sqrt{x}$",
                CorrectAnswer = "A",
                OptionsJson = "[\"A. [0; +inf)\", \"B. R\"]",
                Status = "published",
                Difficulty = "nhan_biet"
            },
            new ContentQuestion
            {
                Id = "q_broken_latex",
                SubjectId = subjectId,
                Prompt = "Phương trình $y = \\frac{1}{x có bao nhiêu tiệm cận?", // Missing closing $
                CorrectAnswer = "B",
                OptionsJson = "[\"A. 1\", \"B. 2\"]",
                Status = "published",
                Difficulty = "thong_hieu"
            },
            new ContentQuestion
            {
                Id = "q_missing_ans",
                SubjectId = subjectId,
                Prompt = "Hàm số đạt cực trị khi nào?",
                CorrectAnswer = "", // Missing answer
                OptionsJson = "[\"A. f'(x)=0\", \"B. f(x)=0\"]",
                Status = "published",
                Difficulty = "nhan_biet"
            },
            new ContentQuestion
            {
                Id = "q_dup_1",
                SubjectId = subjectId,
                Prompt = "Tìm tập xác định của $y = \\sqrt{x}$", // Duplicate of q_valid_1
                CorrectAnswer = "A",
                OptionsJson = "[\"A. [0; +inf)\", \"B. R\"]",
                Status = "published",
                Difficulty = "nhan_biet"
            }
        );
        await db.SaveChangesAsync();

        var qualityService = new QuestionQualityService(db, NullLogger<QuestionQualityService>.Instance);
        var audit = await qualityService.AuditQuestionsQualityAsync(subjectId);

        Assert.NotNull(audit);
        Assert.Equal(4, audit.TotalQuestions);
        Assert.True(audit.BrokenLatexCount >= 1);
        Assert.True(audit.MissingAnswerCount >= 1);
        Assert.True(audit.DuplicateCount >= 1);
        Assert.True(audit.NeedsReviewCount >= 3);
        Assert.True(audit.QualityScorePercent < 100.0);
    }

    [Fact]
    public void SpacedRepetition_01_CalculateSm2NextInterval_CalculatesDeterministicDecay()
    {
        using var db = CreateInMemoryDb(nameof(SpacedRepetition_01_CalculateSm2NextInterval_CalculatesDeterministicDecay));
        var srService = new SpacedRepetitionService(db, NullLogger<SpacedRepetitionService>.Instance);

        // 1. Initial success progression (q = 5, perfect)
        var (ef1, int1) = srService.CalculateSm2NextInterval(0, 2.5, 5);
        Assert.Equal(1, int1);
        Assert.True(ef1 >= 2.5);

        var (ef2, int2) = srService.CalculateSm2NextInterval(1, ef1, 5);
        Assert.Equal(6, int2);

        var (ef3, int3) = srService.CalculateSm2NextInterval(2, ef2, 5);
        Assert.True(int3 >= 15); // 6 * ~2.6 = ~16

        // 2. Failure reset (q = 1, failure)
        var (efFail, intFail) = srService.CalculateSm2NextInterval(5, 2.6, 1);
        Assert.Equal(1, intFail); // Must reset interval to 1 day
        Assert.True(efFail < 2.6); // EF decays
        Assert.True(efFail >= 1.3); // Minimum floor is 1.3
    }

    [Fact]
    public async Task SpacedRepetition_02_QueueBuckets_SortsDueTodayUpcomingAndReinforcement()
    {
        using var db = CreateInMemoryDb(nameof(SpacedRepetition_02_QueueBuckets_SortsDueTodayUpcomingAndReinforcement));
        const string userId = "student_sr_02";
        const string subjectId = "sub_math12";

        // Seed 3 topic masteries
        db.StudentTopicMasteries.AddRange(
            new StudentTopicMastery
            {
                Id = "m_weak",
                UserId = userId,
                SubjectId = subjectId,
                TopicName = "Cực trị của hàm số",
                MasteryScore = 35.0, // Should be in needs_reinforcement
                AttemptCount = 5,
                CorrectCount = 1,
                Status = "needs_reinforcement",
                LastAttemptAt = DateTimeOffset.UtcNow.AddDays(-2)
            },
            new StudentTopicMastery
            {
                Id = "m_progress",
                UserId = userId,
                SubjectId = subjectId,
                TopicName = "Tính đơn điệu của hàm số",
                MasteryScore = 70.0,
                AttemptCount = 10,
                CorrectCount = 7,
                Status = "progressing",
                LastAttemptAt = DateTimeOffset.UtcNow.AddDays(-3) // Due today (baseline 2 days)
            },
            new StudentTopicMastery
            {
                Id = "m_mastered",
                UserId = userId,
                SubjectId = subjectId,
                TopicName = "Toạ độ của vectơ",
                MasteryScore = 90.0,
                AttemptCount = 12,
                CorrectCount = 11,
                Status = "proficient",
                LastAttemptAt = DateTimeOffset.UtcNow // Upcoming in 4 days
            }
        );
        await db.SaveChangesAsync();

        var srService = new SpacedRepetitionService(db, NullLogger<SpacedRepetitionService>.Instance);
        var queue = await srService.GetUserSpacedRepetitionQueueAsync(userId, subjectId);

        Assert.NotNull(queue);
        Assert.Equal(3, queue.TotalItems);
        Assert.Contains(queue.NeedsReinforcement, i => i.TopicName == "Cực trị của hàm số");
        Assert.Contains(queue.DueToday, i => i.TopicName == "Tính đơn điệu của hàm số");
        Assert.Contains(queue.Upcoming, i => i.TopicName == "Toạ độ của vectơ");
    }

    [Fact]
    public async Task SpacedRepetition_03_RecordReviewOutcome_UpdatesMasteryAndNextReviewDate()
    {
        using var db = CreateInMemoryDb(nameof(SpacedRepetition_03_RecordReviewOutcome_UpdatesMasteryAndNextReviewDate));
        const string userId = "student_sr_03";
        const string subjectId = "sub_math12";

        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "m_test",
            UserId = userId,
            SubjectId = subjectId,
            TopicId = "topic_extreme",
            TopicName = "Cực trị của hàm số",
            MasteryScore = 60.0,
            AttemptCount = 4,
            CorrectCount = 3,
            Status = "progressing"
        });
        await db.SaveChangesAsync();

        var srService = new SpacedRepetitionService(db, NullLogger<SpacedRepetitionService>.Instance);

        var reviewReq = new SpacedRepetitionReviewRequestDto
        {
            ItemId = "topic_extreme",
            TopicName = "Cực trị của hàm số",
            SubjectId = subjectId,
            QualityScore = 4
        };

        var result = await srService.RecordReviewOutcomeAsync(userId, reviewReq);

        Assert.NotNull(result);
        Assert.Equal("topic_extreme", result.ItemId);
        Assert.Equal(1, result.NewIntervalDays); // Repetition 0 -> 1 day
        Assert.True(result.NewEasinessFactor >= 2.5);
        Assert.Contains("Ghi nhận thành thạo", result.Message);

        // Verify event logged in db
        var savedEvent = await db.LearningEvents.FirstOrDefaultAsync(e => e.UserId == userId && e.Type == "spaced_repetition_review");
        Assert.NotNull(savedEvent);

        // Verify mastery score improved
        var updatedMastery = await db.StudentTopicMasteries.FirstAsync(m => m.Id == "m_test");
        Assert.Equal(65.0, updatedMastery.MasteryScore);
    }

    [Fact]
    public async Task RevisionPlan_01_CreateAndGetRevisionPlan_SchedulesMilestonesAndFocusTopics()
    {
        using var db = CreateInMemoryDb(nameof(RevisionPlan_01_CreateAndGetRevisionPlan_SchedulesMilestonesAndFocusTopics));
        const string userId = "student_plan_01";
        const string subjectId = "sub_math12";

        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "m_weak_01",
            UserId = userId,
            SubjectId = subjectId,
            TopicName = "Khảo sát hàm phân thức",
            MasteryScore = 40.0,
            Status = "needs_reinforcement"
        });
        await db.SaveChangesAsync();

        var planner = new RevisionPlannerService(db, NullLogger<RevisionPlannerService>.Instance);

        var request = new CreateRevisionPlanRequestDto
        {
            SubjectId = subjectId,
            TargetScore = 8.5,
            DailyStudyMinutes = 60,
            ExamDate = DateTimeOffset.UtcNow.AddDays(45)
        };

        var plan = await planner.CreateOrUpdateRevisionPlanAsync(userId, request);

        Assert.NotNull(plan);
        Assert.Equal(userId, plan.UserId);
        Assert.Equal(8.5, plan.TargetScore);
        Assert.Equal(60, plan.DailyStudyMinutes);
        Assert.Equal(45, plan.DaysRemaining);
        Assert.NotEmpty(plan.Milestones);
        Assert.Contains(plan.Milestones, m => m.FocusTopic == "Khảo sát hàm phân thức");

        // Verify retrieval matches
        var retrieved = await planner.GetRevisionPlanAsync(userId, subjectId);
        Assert.NotNull(retrieved);
        Assert.Equal(plan.PlanId, retrieved.PlanId);
        Assert.Equal(8.5, retrieved.TargetScore);
    }

    [Fact]
    public async Task RevisionPlan_02_AutoAdjustPlanAfterExam_InjectsMistakeRemediation()
    {
        using var db = CreateInMemoryDb(nameof(RevisionPlan_02_AutoAdjustPlanAfterExam_InjectsMistakeRemediation));
        const string userId = "student_plan_02";
        const string subjectId = "sub_math12";

        // Seed question and exam attempt with mistake
        db.ContentQuestions.Add(new ContentQuestion
        {
            Id = "q_exam_err",
            SubjectId = subjectId,
            Topic = "Toạ độ không gian Oxyz",
            Prompt = "Phương trình mặt cầu?",
            CorrectAnswer = "A",
            Status = "published"
        });

        db.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = "exam_session_err",
            UserId = userId,
            SubjectId = subjectId,
            AssessmentId = "asmt_exam",
            CompletionStatus = "completed",
            Responses = new List<AssessmentResponse>
            {
                new() { QuestionId = "q_exam_err", IsCorrect = false }
            }
        });
        await db.SaveChangesAsync();

        var planner = new RevisionPlannerService(db, NullLogger<RevisionPlannerService>.Instance);

        // Initialize plan
        await planner.CreateOrUpdateRevisionPlanAsync(userId, new CreateRevisionPlanRequestDto
        {
            SubjectId = subjectId,
            TargetScore = 8.0,
            DailyStudyMinutes = 45,
            ExamDate = DateTimeOffset.UtcNow.AddDays(30)
        });

        // Trigger auto adjust
        var adjusted = await planner.AutoAdjustPlanAfterExamAsync(userId, subjectId, "exam_session_err");

        Assert.NotNull(adjusted);
        Assert.True(adjusted.AdjustmentHistory.Count >= 2);
        Assert.Contains("Toạ độ không gian Oxyz", adjusted.AdjustmentHistory.Last().Reason);
        Assert.Equal("Toạ độ không gian Oxyz", adjusted.Milestones.First().FocusTopic);
    }

    [Fact]
    public async Task Readiness_01_AssessReadiness_HandlesInsufficientDataGracefully()
    {
        using var db = CreateInMemoryDb(nameof(Readiness_01_AssessReadiness_HandlesInsufficientDataGracefully));
        const string userId = "student_ready_01";
        const string subjectId = "sub_math12";

        var readinessService = new ExamReadinessService(db, NullLogger<ExamReadinessService>.Instance);
        var readiness = await readinessService.AssessReadinessAsync(userId, subjectId);

        Assert.NotNull(readiness);
        Assert.Equal("insufficient_data", readiness.ReadinessTier);
        Assert.NotEmpty(readiness.Disclaimer);
        Assert.Contains("tham khảo", readiness.Disclaimer);
        Assert.Contains("hoàn thành thêm ít nhất 2 đề thi", readiness.RecommendedAction);
    }

    [Fact]
    public async Task Readiness_02_AssessReadiness_CalculatesStabilityAndCompositeReadiness()
    {
        using var db = CreateInMemoryDb(nameof(Readiness_02_AssessReadiness_CalculatesStabilityAndCompositeReadiness));
        const string userId = "student_ready_02";
        const string subjectId = "sub_math12";

        // Seed 2 completed exams with high stable scores (8.5, 9.0)
        db.AssessmentAttempts.AddRange(
            new AssessmentAttempt
            {
                Id = "exam_1",
                UserId = userId,
                SubjectId = subjectId,
                AssessmentId = "asmt_exam",
                CompletionStatus = "completed",
                ScoreScaled = 8.5,
                ScoreRaw = 8.5,
                ScoreMax = 10.0,
                LastActivityAt = DateTimeOffset.UtcNow.AddDays(-2)
            },
            new AssessmentAttempt
            {
                Id = "exam_2",
                UserId = userId,
                SubjectId = subjectId,
                AssessmentId = "asmt_exam",
                CompletionStatus = "completed",
                ScoreScaled = 9.0,
                ScoreRaw = 9.0,
                ScoreMax = 10.0,
                LastActivityAt = DateTimeOffset.UtcNow.AddDays(-1)
            }
        );

        // Seed critical masteries
        db.StudentTopicMasteries.AddRange(
            new StudentTopicMastery { Id = "m1", UserId = userId, SubjectId = subjectId, TopicName = "Tính đơn điệu của hàm số", MasteryScore = 85.0 },
            new StudentTopicMastery { Id = "m2", UserId = userId, SubjectId = subjectId, TopicName = "Cực trị của hàm số", MasteryScore = 90.0 },
            new StudentTopicMastery { Id = "m3", UserId = userId, SubjectId = subjectId, TopicName = "Giá trị lớn nhất và nhỏ nhất của hàm số", MasteryScore = 80.0 },
            new StudentTopicMastery { Id = "m4", UserId = userId, SubjectId = subjectId, TopicName = "Vectơ trong không gian", MasteryScore = 85.0 }
        );
        await db.SaveChangesAsync();

        var readinessService = new ExamReadinessService(db, NullLogger<ExamReadinessService>.Instance);
        var readiness = await readinessService.AssessReadinessAsync(userId, subjectId);

        Assert.NotNull(readiness);
        Assert.NotEqual("insufficient_data", readiness.ReadinessTier);
        Assert.True(readiness.ExamScoreStabilityPercent >= 80.0); // High stability
        Assert.True(readiness.ReadinessScorePercent >= 50.0);
        Assert.True(readiness.PredictedScoreMin >= 7.0);
        Assert.True(readiness.PredictedScoreMax <= 10.0);
    }

    [Fact]
    public async Task ExamSecurity_01_BlockReviewBeforeCompletion()
    {
        using var db = CreateInMemoryDb(nameof(ExamSecurity_01_BlockReviewBeforeCompletion));
        const string userId = "student_sec_01";
        const string sessionId = "exam_in_progress_01";

        db.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = sessionId,
            UserId = userId,
            SubjectId = "sub_math12",
            AssessmentId = "asmt_exam",
            CompletionStatus = "in_progress", // NOT completed
            LastActivityAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();

        var examService = new IntelligentExamService(db, NullLogger<IntelligentExamService>.Instance);

        // Must reject review while exam is in progress
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            examService.GetExamReviewAnalyticsAsync(userId, sessionId));
    }

    [Fact]
    public async Task ExamSecurity_02_BlockAiTutorDuringActiveExam()
    {
        using var db = CreateInMemoryDb(nameof(ExamSecurity_02_BlockAiTutorDuringActiveExam));
        const string userId = "student_exam_sec_02";

        // Seed an active in-progress exam
        db.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = "exam_active_123",
            UserId = userId,
            SubjectId = "sub_math12",
            AssessmentId = "asmt_exam",
            CompletionStatus = "in_progress",
            SuspendDataJson = "{\"mode\":\"exam\"}",
            LastActivityAt = DateTimeOffset.UtcNow
        });

        // Seed an existing AI conversation
        db.AiConversations.Add(new AiConversation
        {
            Id = "conv_during_exam",
            UserId = userId,
            Title = "Hỏi bài",
            Subject = "sub_math12"
        });
        await db.SaveChangesAsync();

        var aiTutor = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);

        // Learner attempting to message AI during exam must be blocked by backend
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            aiTutor.SendMessageAsync(userId, "learner", "conv_during_exam", new SendAiMessageRequestDto("Hỏi đáp án câu 1")));
    }
}
