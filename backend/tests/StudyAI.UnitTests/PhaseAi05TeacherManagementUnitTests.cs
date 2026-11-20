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
/// Phase AI-05: Intelligent Teaching & Content Management Unit Tests
/// </summary>
public class PhaseAi05TeacherManagementUnitTests
{
    private StudyAIDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new StudyAIDbContext(options);
    }

    private class TestLlmProvider : ILlmProvider
    {
        public string ProviderName => "TestLlm";
        public string DefaultModel => "gemini-2.5-flash";
        public string? ReasoningModel => null;
        public string FallbackModel => "gemini-2.5-flash";
        public bool IsConfigured => true;

        public Func<LlmCompletionRequest, string>? ResponseGenerator { get; set; }

        public Task<LlmCompletionResponse> GenerateCompletionAsync(LlmCompletionRequest request)
        {
            var content = ResponseGenerator != null
                ? ResponseGenerator(request)
                : "{\"overallQualityScore\": 9.0}";

            return Task.FromResult(new LlmCompletionResponse(
                Content: content,
                PromptTokens: 100,
                CompletionTokens: 150,
                Provider: "TestLlm",
                Model: "gemini-2.5-flash"
            ));
        }
    }

    [Fact]
    public async Task Teacher_01_TeacherAnalytics_ReturnsCohortMetricsAndDifficultTopics()
    {
        var db = CreateInMemoryDb(nameof(Teacher_01_TeacherAnalytics_ReturnsCohortMetricsAndDifficultTopics));
        var teacherId = "usr_teacher_01";
        var student1Id = "usr_student_01";
        var student2Id = "usr_student_02";

        var classroom = new Classroom
        {
            Id = "cls_12a1",
            Name = "Lớp 12A1 Toán Chuyên",
            TeacherId = teacherId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Classrooms.Add(classroom);

        db.Users.AddRange(
            new User { Id = teacherId, Role = "teacher", DisplayName = "Thầy Hưng", Email = "hung@example.com" },
            new User { Id = student1Id, Role = "student", DisplayName = "Nguyễn Văn A", Email = "a@example.com" },
            new User { Id = student2Id, Role = "student", DisplayName = "Trần Thị B", Email = "b@example.com" }
        );

        db.ClassroomStudents.AddRange(
            new ClassroomStudent { Id = "cs_1", ClassroomId = classroom.Id, StudentId = student1Id, EnrolledAt = DateTimeOffset.UtcNow },
            new ClassroomStudent { Id = "cs_2", ClassroomId = classroom.Id, StudentId = student2Id, EnrolledAt = DateTimeOffset.UtcNow }
        );

        // Add mastery records
        db.StudentTopicMasteries.AddRange(
            new StudentTopicMastery { Id = "stm_1", UserId = student1Id, SubjectId = "sub_math", TopicId = "t_tich_phan", TopicName = "Tích phân từng phần", MasteryScore = 45.0, AttemptCount = 10, CorrectCount = 4, LastAttemptAt = DateTimeOffset.UtcNow },
            new StudentTopicMastery { Id = "stm_2", UserId = student2Id, SubjectId = "sub_math", TopicId = "t_tich_phan", TopicName = "Tích phân từng phần", MasteryScore = 50.0, AttemptCount = 8, CorrectCount = 4, LastAttemptAt = DateTimeOffset.UtcNow },
            new StudentTopicMastery { Id = "stm_3", UserId = student1Id, SubjectId = "sub_math", TopicId = "t_hinh_hoc_kg", TopicName = "Hình học Oxyz", MasteryScore = 85.0, AttemptCount = 15, CorrectCount = 13, LastAttemptAt = DateTimeOffset.UtcNow }
        );

        await db.SaveChangesAsync();

        var service = new TeacherManagementService(db, NullLogger<TeacherManagementService>.Instance);
        var analytics = await service.GetClassroomAnalyticsAsync(teacherId, "teacher", classroom.Id);

        Assert.NotNull(analytics);
        Assert.Equal(classroom.Id, analytics.ClassroomId);
        Assert.Equal("Lớp 12A1 Toán Chuyên", analytics.ClassroomName);
        Assert.Equal(2, analytics.TotalStudents);
        Assert.True(analytics.CohortAverageMasteryPercent > 0);

        // Verify difficult topic detection
        Assert.NotEmpty(analytics.DifficultTopics);
        var diffTopic = analytics.DifficultTopics.FirstOrDefault(t => t.TopicName == "Tích phân từng phần");
        Assert.NotNull(diffTopic);
        Assert.True(diffTopic.CohortAccuracyPercent < 65.0);
        Assert.Equal(2, diffTopic.AffectedStudentsCount);
    }

    [Fact]
    public async Task Teacher_02_CrossTenantAccessCheck_UnauthorizedTeacherBlocked()
    {
        var db = CreateInMemoryDb(nameof(Teacher_02_CrossTenantAccessCheck_UnauthorizedTeacherBlocked));
        var teacher1Id = "usr_teacher_01";
        var teacher2Id = "usr_teacher_02";

        var classroom = new Classroom
        {
            Id = "cls_12a2",
            Name = "Lớp 12A2",
            TeacherId = teacher1Id,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Classrooms.Add(classroom);
        await db.SaveChangesAsync();

        var service = new TeacherManagementService(db, NullLogger<TeacherManagementService>.Instance);

        // Teacher 2 attempting to access Teacher 1's class should throw UnauthorizedAccessException
        await Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
        {
            await service.GetClassroomAnalyticsAsync(teacher2Id, "teacher", classroom.Id);
        });

        // Admin accessing Teacher 1's class should succeed
        var adminId = "usr_admin_01";
        var result = await service.GetClassroomAnalyticsAsync(adminId, "admin", classroom.Id);
        Assert.NotNull(result);
    }

    [Fact]
    public async Task Teacher_03_RemedialIntervention_AssignAndTrackOutcome()
    {
        var db = CreateInMemoryDb(nameof(Teacher_03_RemedialIntervention_AssignAndTrackOutcome));
        var teacherId = "usr_teacher_01";
        var studentId = "usr_student_01";

        var classroom = new Classroom
        {
            Id = "cls_12a3",
            Name = "Lớp 12A3",
            TeacherId = teacherId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Classrooms.Add(classroom);

        db.Users.AddRange(
            new User { Id = teacherId, Role = "teacher", DisplayName = "Thầy Hưng", Email = "hung@example.com" },
            new User { Id = studentId, Role = "student", DisplayName = "Nguyễn Văn A", Email = "a@example.com" }
        );

        db.ClassroomStudents.Add(new ClassroomStudent
        {
            Id = "cs_3",
            ClassroomId = classroom.Id,
            StudentId = studentId,
            EnrolledAt = DateTimeOffset.UtcNow
        });

        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "stm_4",
            UserId = studentId,
            SubjectId = "sub_math",
            TopicId = "t_so_phuc",
            TopicName = "Số phức và ứng dụng",
            MasteryScore = 40.0,
            AttemptCount = 10,
            CorrectCount = 4,
            LastAttemptAt = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();

        var service = new TeacherManagementService(db, NullLogger<TeacherManagementService>.Instance);

        var request = new CreateRemedialInterventionRequestDto
        {
            ClassroomId = classroom.Id,
            Title = "Gói ôn tập khẩn cấp: Số phức",
            TargetTopic = "Số phức và ứng dụng",
            TargetStudentIds = new List<string> { studentId },
            DueDate = DateTimeOffset.UtcNow.AddDays(3),
            Instructions = "Yêu cầu làm tối thiểu 10 câu trắc nghiệm"
        };

        var intervention = await service.AssignRemedialInterventionAsync(teacherId, "teacher", request);

        Assert.NotNull(intervention);
        Assert.Equal("Số phức và ứng dụng", intervention.TopicName);
        Assert.Equal(40.0, intervention.InitialMasteryScore);

        // Update student mastery simulating completion
        var mastery = await db.StudentTopicMasteries.FirstAsync(m => m.UserId == studentId && m.TopicId == "t_so_phuc");
        mastery.MasteryScore = 75.0;
        mastery.AttemptCount += 10;
        mastery.CorrectCount += 8;
        await db.SaveChangesAsync();

        // Track outcome
        var interventions = await service.GetClassroomInterventionsAsync(teacherId, "teacher", classroom.Id);
        Assert.NotNull(interventions);
        Assert.NotEmpty(interventions);
        var tracked = interventions.First(i => i.StudentId == studentId);
        Assert.True(tracked.CurrentMasteryScore >= 70.0);
        Assert.True(tracked.MasteryDelta > 30.0);
    }

    [Fact]
    public async Task Governance_01_SeparationOfDuties_CreatorCannotSelfApprove()
    {
        var db = CreateInMemoryDb(nameof(Governance_01_SeparationOfDuties_CreatorCannotSelfApprove));
        var authorId = "usr_teacher_author";
        var reviewerId = "usr_teacher_reviewer";

        var question = new ContentQuestion
        {
            Id = "q_test_01",
            Prompt = "Cho hàm số $y = x^3 - 3x$. Tìm số điểm cực trị.",
            Status = "in-review",
            AuthorId = authorId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.ContentQuestions.Add(question);
        await db.SaveChangesAsync();

        var mockLlm = new TestLlmProvider();
        var questionQuality = new QuestionQualityService(db, NullLogger<QuestionQualityService>.Instance);
        var service = new ContentGovernanceService(db, questionQuality, mockLlm, NullLogger<ContentGovernanceService>.Instance);

        // Creator attempts to self-approve as teacher -> Must throw InvalidOperationException
        var selfApproveReq = new ContentWorkflowActionRequestDto
        {
            EntityId = question.Id,
            EntityType = "question",
            Action = "approve",
            ReasonOrNotes = "Tự duyệt bài của mình"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await service.ExecuteWorkflowActionAsync(authorId, "teacher", selfApproveReq);
        });

        // Another reviewer approves -> Should succeed
        var reviewerApproveReq = new ContentWorkflowActionRequestDto
        {
            EntityId = question.Id,
            EntityType = "question",
            Action = "approve",
            ReasonOrNotes = "Đã kiểm tra công thức Toán, duyệt."
        };

        var result = await service.ExecuteWorkflowActionAsync(reviewerId, "teacher", reviewerApproveReq);
        Assert.NotNull(result);
        Assert.Equal("approved", result.NewStatus);

        // Publish after approval
        var publishReq = new ContentWorkflowActionRequestDto
        {
            EntityId = question.Id,
            EntityType = "question",
            Action = "publish",
            ReasonOrNotes = "Đưa vào ngân hàng chính thức"
        };

        var publishResult = await service.ExecuteWorkflowActionAsync(reviewerId, "teacher", publishReq);
        Assert.Equal("published", publishResult.NewStatus);
    }

    [Fact]
    public async Task Teacher_04_CrossTenantStudentTampering_Blocked()
    {
        var db = CreateInMemoryDb(nameof(Teacher_04_CrossTenantStudentTampering_Blocked));
        var teacherId = "usr_teacher_01";
        var studentFromOtherClass = "usr_student_other";

        var classroom = new Classroom
        {
            Id = "cls_teacher1_class",
            Name = "Lớp 12A1",
            TeacherId = teacherId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Classrooms.Add(classroom);

        db.Users.AddRange(
            new User { Id = teacherId, Role = "teacher", DisplayName = "Thầy Hưng", Email = "hung@example.com" },
            new User { Id = studentFromOtherClass, Role = "student", DisplayName = "Học sinh lớp khác", Email = "other@example.com" }
        );
        await db.SaveChangesAsync();

        var service = new TeacherManagementService(db, NullLogger<TeacherManagementService>.Instance);

        var request = new CreateRemedialInterventionRequestDto
        {
            ClassroomId = classroom.Id,
            Title = "Gói ôn tập can thiệp trái phép",
            TargetTopic = "Toán",
            TargetStudentIds = new List<string> { studentFromOtherClass },
            DueDate = DateTimeOffset.UtcNow.AddDays(3),
            Instructions = "Can thiệp học sinh lớp khác"
        };

        // Must reject studentId tampering when student does not belong to the class
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await service.AssignRemedialInterventionAsync(teacherId, "teacher", request);
        });
    }

    [Fact]
    public async Task Governance_03_InvalidStateTransitions_StrictlyBlocked()
    {
        var db = CreateInMemoryDb(nameof(Governance_03_InvalidStateTransitions_StrictlyBlocked));
        var authorId = "usr_teacher_author";
        var reviewerId = "usr_teacher_reviewer";

        var lesson = new ContentLesson
        {
            Id = "lsn_draft_01",
            Title = "Bài học nháp chưa duyệt",
            Status = "draft",
            AuthorId = authorId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.ContentLessons.Add(lesson);
        await db.SaveChangesAsync();

        var mockLlm = new TestLlmProvider();
        var questionQuality = new QuestionQualityService(db, NullLogger<QuestionQualityService>.Instance);
        var service = new ContentGovernanceService(db, questionQuality, mockLlm, NullLogger<ContentGovernanceService>.Instance);

        // 1. Cannot publish Draft directly without being Approved
        var directPublishReq = new ContentWorkflowActionRequestDto
        {
            EntityId = lesson.Id,
            EntityType = "lesson",
            Action = "publish",
            ReasonOrNotes = "Cố tình xuất bản bài nháp"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await service.ExecuteWorkflowActionAsync(reviewerId, "teacher", directPublishReq);
        });

        // 2. Cannot approve Draft directly without submitting for review
        var directApproveReq = new ContentWorkflowActionRequestDto
        {
            EntityId = lesson.Id,
            EntityType = "lesson",
            Action = "approve",
            ReasonOrNotes = "Duyệt luôn bài nháp"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await service.ExecuteWorkflowActionAsync(reviewerId, "teacher", directApproveReq);
        });

        // 3. Valid flow: Submit review -> in-review
        var submitReq = new ContentWorkflowActionRequestDto
        {
            EntityId = lesson.Id,
            EntityType = "lesson",
            Action = "submit_review"
        };
        var submitRes = await service.ExecuteWorkflowActionAsync(authorId, "teacher", submitReq);
        Assert.Equal("in-review", submitRes.NewStatus);

        // 4. In-Review -> Reject -> rejected
        var rejectReq = new ContentWorkflowActionRequestDto
        {
            EntityId = lesson.Id,
            EntityType = "lesson",
            Action = "reject",
            ReasonOrNotes = "Sai công thức KaTeX"
        };
        var rejectRes = await service.ExecuteWorkflowActionAsync(reviewerId, "teacher", rejectReq);
        Assert.Equal("rejected", rejectRes.NewStatus);

        // 5. From rejected -> submit_review again -> in-review
        var resubmitRes = await service.ExecuteWorkflowActionAsync(authorId, "teacher", submitReq);
        Assert.Equal("in-review", resubmitRes.NewStatus);
    }

    [Fact]
    public async Task Governance_02_AiContentQualityAudit_AdvisoryOnlyWithHumanApprovalRequired()
    {
        var db = CreateInMemoryDb(nameof(Governance_02_AiContentQualityAudit_AdvisoryOnlyWithHumanApprovalRequired));
        var authorId = "usr_teacher_author";

        var question = new ContentQuestion
        {
            Id = "q_test_02",
            Prompt = "Tính tích phân $\\int_0^1 x dx$.",
            Status = "draft",
            AuthorId = authorId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.ContentQuestions.Add(question);
        await db.SaveChangesAsync();

        var mockLlm = new TestLlmProvider
        {
            ResponseGenerator = _ => "{\n  \"hasIssues\": false,\n  \"issueCount\": 0,\n  \"overallAssessment\": \"Nội dung chuẩn KaTeX và rõ ràng.\",\n  \"suggestions\": [],\n  \"proposedImprovedBody\": \"Tính tích phân $\\\\int_0^1 x dx$.\",\n  \"suggestedCognitiveDifficulty\": \"thong_hieu\"\n}"
        };

        var questionQuality = new QuestionQualityService(db, NullLogger<QuestionQualityService>.Instance);
        var service = new ContentGovernanceService(db, questionQuality, mockLlm, NullLogger<ContentGovernanceService>.Instance);
        var audit = await service.AuditContentQualityWithAiAsync(authorId, new AiContentQualityAuditRequestDto
        {
            ContentType = "question",
            Title = "Câu hỏi tích phân",
            BodyText = question.Prompt
        });

        Assert.NotNull(audit);
        Assert.False(audit.HasIssues);
        Assert.True(audit.RequiresHumanApproval);
        Assert.Equal("Gemini", audit.Provider);
    }

    [Fact]
    public async Task TeachingRecommendations_01_DetectsCohortWeaknessesAndGeneratesAlerts()
    {
        var db = CreateInMemoryDb(nameof(TeachingRecommendations_01_DetectsCohortWeaknessesAndGeneratesAlerts));
        var teacherId = "usr_teacher_01";
        var classroom = new Classroom
        {
            Id = "cls_12a_cohort",
            Name = "Lớp 12A Toán",
            TeacherId = teacherId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Classrooms.Add(classroom);

        // Add 5 students with low mastery in Integral
        for (int i = 1; i <= 5; i++)
        {
            var studentId = $"usr_student_{i}";
            db.Users.Add(new User { Id = studentId, Role = "student", DisplayName = $"Học sinh {i}", Email = $"s{i}@example.com" });
            db.ClassroomStudents.Add(new ClassroomStudent { Id = $"cs_c_{i}", ClassroomId = classroom.Id, StudentId = studentId, EnrolledAt = DateTimeOffset.UtcNow });
            db.StudentTopicMasteries.Add(new StudentTopicMastery
            {
                Id = $"stm_c_{i}",
                UserId = studentId,
                SubjectId = "sub_math",
                TopicId = "t_tich_phan",
                TopicName = "Tích phân nâng cao",
                MasteryScore = 42.0,
                AttemptCount = 12,
                CorrectCount = 4,
                LastAttemptAt = DateTimeOffset.UtcNow
            });
        }
        await db.SaveChangesAsync();

        var teacherService = new TeacherManagementService(db, NullLogger<TeacherManagementService>.Instance);
        var service = new TeachingRecommendationService(teacherService, NullLogger<TeachingRecommendationService>.Instance);

        var recommendations = await service.GetCohortTeachingRecommendationsAsync(teacherId, "teacher", classroom.Id);

        Assert.NotNull(recommendations);
        Assert.NotEmpty(recommendations);

        var alert = recommendations.FirstOrDefault(r => r.SuggestedTopic == "Tích phân nâng cao");
        Assert.NotNull(alert);
        Assert.Equal("high", alert.Priority);
        Assert.NotEmpty(alert.DataEvidence);
        Assert.NotEmpty(alert.ActionableDescription);
    }

    [Fact]
    public async Task LessonAuthoring_01_GeneratesStructuredOutlineWithFormulasAndCheckpoints()
    {
        var db = CreateInMemoryDb(nameof(LessonAuthoring_01_GeneratesStructuredOutlineWithFormulasAndCheckpoints));
        var mockLlm = new TestLlmProvider
        {
            ResponseGenerator = _ => "{\n  \"learningObjectives\": [\"Hiểu định nghĩa nguyên hàm\", \"Nắm bảng nguyên hàm cơ bản\"],\n  \"introductionDraft\": \"Giới thiệu phép toán ngược của đạo hàm\",\n  \"keyDefinitions\": [\"Cho hàm số f(x). Hàm F(x) là nguyên hàm nếu F'(x)=f(x)\"],\n  \"coreFormulasKaTeX\": [\"\\\\int f(x)dx = F(x) + C\", \"\\\\int x^n dx = \\\\frac{x^{n+1}}{n+1} + C\"],\n  \"workedExamples\": [\"Ví dụ 1: Tính \\\\int 2x dx = x^2 + C\"],\n  \"pedagogicalNotes\": \"Lưu ý quên hằng số C\"\n}"
        };

        var service = new AiLessonAuthoringService(db, mockLlm, NullLogger<AiLessonAuthoringService>.Instance);

        var request = new LessonAuthoringOutlineRequestDto
        {
            SubjectName = "Toán 12",
            TargetGrade = "12",
            ChapterTitle = "Chương 4: Nguyên hàm và Tích phân",
            LessonTitle = "Bài 1: Nguyên hàm"
        };

        var outline = await service.GenerateLessonOutlineDraftAsync("usr_teacher_01", request);

        Assert.NotNull(outline);
        Assert.Equal("Bài 1: Nguyên hàm", outline.LessonTitle);
        Assert.NotEmpty(outline.LearningObjectives);
        Assert.NotEmpty(outline.CoreFormulasKaTeX);
        Assert.NotEmpty(outline.WorkedExamples);
        Assert.Contains(outline.CoreFormulasKaTeX, f => f.Contains("\\int"));
    }

    [Fact]
    public async Task LessonAuthoring_02_GenerateCheckpointQuestions_UsesLlm_And_DoesNotReturnFabricatedFixtures()
    {
        var db = CreateInMemoryDb(nameof(LessonAuthoring_02_GenerateCheckpointQuestions_UsesLlm_And_DoesNotReturnFabricatedFixtures));
        bool llmWasCalled = false;
        string capturedUserPrompt = string.Empty;

        var mockLlm = new TestLlmProvider
        {
            ResponseGenerator = req =>
            {
                llmWasCalled = true;
                capturedUserPrompt = req.Messages.Last().Content;
                return @"[
  {
    ""prompt"": ""Cho hình chóp $S.ABCD$ có đáy là hình vuông cạnh $a$. Chiều cao $h = a\\sqrt{3}$. Thể tích khối chóp bằng bao nhiêu?"",
    ""options"": [""A. $\\frac{a^3\\sqrt{3}}{3}$"", ""B. $a^3\\sqrt{3}$"", ""C. $\\frac{a^3}{3}$"", ""D. $2a^3$""],
    ""correctAnswer"": ""A"",
    ""explanation"": ""$V = \\frac{1}{3} B \\cdot h = \\frac{1}{3} a^2 \\cdot a\\sqrt{3} = \\frac{a^3\\sqrt{3}}{3}$."",
    ""cognitiveLevel"": ""thong_hieu""
  }
]";
            }
        };

        var service = new AiLessonAuthoringService(db, mockLlm, NullLogger<AiLessonAuthoringService>.Instance);

        var request = new GenerateCheckpointQuestionsRequestDto
        {
            SubjectId = "sub_math12",
            TopicName = "Thể tích khối đa diện",
            QuestionCount = 1,
            TargetDifficulty = "thong_hieu"
        };

        var result = await service.GenerateCheckpointQuestionsAsync("usr_teacher_01", request);

        // 1. LLM must be called with topic in prompt
        Assert.True(llmWasCalled);
        Assert.Contains("Thể tích khối đa diện", capturedUserPrompt);

        // 2. Must return verified LLM response
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("A", result[0].CorrectAnswer);
        Assert.Contains("S.ABCD", result[0].Prompt);

        // 3. Must NEVER contain the legacy fabricated fixture
        Assert.DoesNotContain("có bảng xét dấu đạo hàm như hình vẽ", result[0].Prompt);
    }

    [Fact]
    public async Task LessonAuthoring_03_GenerateCheckpointQuestions_WhenLlmFails_ThrowsFailClosedException()
    {
        var db = CreateInMemoryDb(nameof(LessonAuthoring_03_GenerateCheckpointQuestions_WhenLlmFails_ThrowsFailClosedException));
        var mockLlm = new TestLlmProvider
        {
            ResponseGenerator = _ => throw new HttpRequestException("503 Service Unavailable")
        };

        var service = new AiLessonAuthoringService(db, mockLlm, NullLogger<AiLessonAuthoringService>.Instance);

        var request = new GenerateCheckpointQuestionsRequestDto
        {
            SubjectId = "sub_math12",
            TopicName = "Khảo sát hàm số",
            QuestionCount = 2,
            TargetDifficulty = "thong_hieu"
        };

        // Must throw fail-closed InvalidOperationException rather than returning fake questions
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.GenerateCheckpointQuestionsAsync("usr_teacher_01", request));

        Assert.Contains("không khả dụng", ex.Message);
    }
}
