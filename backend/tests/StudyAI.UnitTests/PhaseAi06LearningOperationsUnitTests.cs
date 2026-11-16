using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

/// <summary>
/// Phase AI-06: Intelligent Learning Operations & Quality Assurance Unit Tests
/// </summary>
public class PhaseAi06LearningOperationsUnitTests
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
                : "Để tính đạo hàm $y' = 3x^2 - 3$, ta tìm nghiệm trên $[0, 2]$. Hãy thử thay $x=1$ vào nhé!";

            return Task.FromResult(new LlmCompletionResponse(
                Content: content,
                PromptTokens: 80,
                CompletionTokens: 120,
                Provider: "TestLlm",
                Model: "gemini-2.5-flash",
                LatencyMs: 250
            ));
        }
    }

    [Fact]
    public async Task Ops_01_SystemHealth_ReportsDatabaseAndComponentsCorrectly()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        db.Users.Add(new User { Id = "u1", Email = "admin@studyai.edu.vn", Role = "admin" });
        db.ContentLessons.Add(new ContentLesson { Id = "les1", Title = "Đạo hàm" });
        await db.SaveChangesAsync();

        var inMemorySettings = new Dictionary<string, string?>
        {
            { "GEMINI_API_KEY", "test-key" },
            { "Jwt:SecretKey", "super-secret-key-32-chars-long-12345" }
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var service = new SystemHealthService(db, config);
        var report = await service.GetSystemHealthAsync();

        Assert.NotNull(report);
        Assert.Equal("healthy", report.OverallStatus);
        Assert.NotEmpty(report.Components);
        Assert.Equal(1, report.DatabaseHealth.TotalUsers);
        Assert.Equal(1, report.DatabaseHealth.TotalLessons);
    }

    [Fact]
    public async Task Ops_02_AiQualityBenchmark_Evaluates12MathCasesSuccessfully()
    {
        var llm = new TestLlmProvider
        {
            ResponseGenerator = req =>
            {
                var prompt = req.Messages.Last().Content;
                if (prompt.Contains("đáp án trắc nghiệm"))
                {
                    return "AI Tutor không thể khoanh hộ đáp án đề thi. Bạn hãy gửi từng câu và chúng ta cùng phân tích phương pháp giải nhé!";
                }
                if (prompt.Contains("tiệm cận"))
                {
                    return "Hàm số phân thức hữu tỉ có nghiệm mẫu số $x = -1$ là tiệm cận đứng vì $\\lim_{x \\to -1} y = \\infty$, và tiệm cận ngang $y = 2$.";
                }
                if (prompt.Contains("thùng hình hộp") || prompt.Contains("tối ưu"))
                {
                    return "Gọi cạnh đáy là $x > 0$. Chiều cao là $h = 500/x^2$. Hàm diện tích toàn phần cần dùng đạo hàm tìm giá trị nhỏ nhất.";
                }
                if (prompt.Contains("tham số m"))
                {
                    return "Đặt $t = 2^x > 0$. Phương trình trở thành phương trình bậc hai theo $t$, áp dụng định lý Viète để tìm tham số m.";
                }
                if (prompt.Contains("tích phân") || prompt.Contains("từng phần"))
                {
                    return "Áp dụng phương pháp tích phân từng phần: Ta đặt $u = 2x+1$ và $dv = e^x dx$. Hãy thử tính đạo hàm $du$ và nguyên hàm $v$ nhé?";
                }
                if (prompt.Contains("tròn xoay") || prompt.Contains("thể tích khối"))
                {
                    return "Công thức tính thể tích khối tròn xoay khi quay quanh trục $Ox$ là $V = \\pi \\int_a^b [f(x)]^2 dx$.";
                }
                if (prompt.Contains("mặt phẳng"))
                {
                    return "Mặt phẳng đi qua điểm $M$ có vectơ pháp tuyến $\\vec{n} = (2, -1, 3)$ nên phương trình là $2x - y + 3z + 9 = 0$.";
                }
                if (prompt.Contains("không gian") || prompt.Contains("mặt cầu"))
                {
                    return "Trong không gian $Oxyz$, phương trình mặt cầu có tâm $I(1, -2, 3)$ và bán kính $R = \\sqrt{1 + 4 + 9 + 2} = 4$.";
                }
                if (prompt.Contains("xúc xắc"))
                {
                    return "Số phần tử của không gian mẫu là 36. Các cặp có tổng số chấm bằng 7 gồm 6 khả năng. Vậy xác suất là $P = 6/36 = 1/6$.";
                }
                if (prompt.Contains("log_2"))
                {
                    return "Điều kiện xác định là $x > 1$. Phương trình tương đương $\\log_2(x^2 - 1) = 3 \\Leftrightarrow x^2 - 1 = 8 \\Leftrightarrow x = 3$.";
                }
                return "Theo phương pháp sư phạm: Ta xét hàm số $y = x^3 - 3x + 2$. Tính đạo hàm $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = 1 \\in [0, 2]$.";
            }
        };

        var service = new AiQualityEvaluationService(llm);
        var report = await service.RunBenchmarkSuiteAsync();

        Assert.NotNull(report);
        Assert.Equal(12, report.TotalCases);
        Assert.Equal(12, report.PassedCases);
        Assert.Equal(0, report.FailedCases);
        Assert.Equal(100.0, report.OverallPassRate);
        Assert.True(report.AverageLatencyMs > 0);

        var safetyCase = report.Items.First(i => i.Category == "safety_exam_leak");
        Assert.True(safetyCase.NoExamLeak);
        Assert.True(safetyCase.Passed);
    }

    [Fact]
    public async Task Ops_03_AiCostOptimization_AggregatesTokensAndFeatureCost()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        db.AiUsageLogs.AddRange(
            new AiUsageLog
            {
                Id = "log1",
                UserId = "u1",
                Feature = "tutor_chat",
                InputTokens = 500,
                OutputTokens = 300,
                EstimatedCostUsd = 0.0004m,
                LatencyMs = 600,
                Status = "success",
                CreatedAt = DateTimeOffset.UtcNow
            },
            new AiUsageLog
            {
                Id = "log2",
                UserId = "u1",
                Feature = "hint_level_1",
                InputTokens = 300,
                OutputTokens = 150,
                EstimatedCostUsd = 0.0002m,
                LatencyMs = 400,
                Status = "success",
                CreatedAt = DateTimeOffset.UtcNow
            }
        );
        await db.SaveChangesAsync();

        var service = new AiCostOptimizationService(db);
        var cost = await service.GetCostAndOptimizationAsync(30);

        Assert.NotNull(cost);
        Assert.Equal(1250, cost.TotalTokens);
        Assert.Equal(800, cost.PromptTokens);
        Assert.Equal(450, cost.CompletionTokens);
        Assert.Equal(0.0006m, cost.EstimatedCostUsd);
        Assert.Equal(2, cost.TotalAiRequests);
        Assert.Equal(100.0, cost.SuccessRate);
        Assert.NotEmpty(cost.UsageByFeature);
        Assert.NotEmpty(cost.OptimizationRecommendations);
    }

    [Fact]
    public async Task Ops_04_ContentQualityMonitoring_DetectsKatexAndMissingOptions()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        db.ContentLessons.Add(new ContentLesson
        {
            Id = "les_err",
            Title = "Khảo sát hàm số",
            FormulasJson = "Công thức bị lỗi $y = ax + b", // Unclosed dollar
            LearningObjectivesJson = "[]" // Empty objectives
        });

        db.ContentQuestions.Add(new ContentQuestion
        {
            Id = "q_err",
            Prompt = "Tính tích phân $I = \\int x dx", // Unclosed dollar
            CorrectAnswer = "", // Missing answer
            Status = "draft"
        });

        db.ContentLessonVideos.Add(new ContentLessonVideo
        {
            Id = "v_err",
            LessonId = "les_err",
            Title = "Video bài 1",
            SourceUrl = "invalid-url",
            DurationSeconds = 0
        });

        await db.SaveChangesAsync();

        var service = new ContentQualityMonitoringService(db);
        var audit = await service.ScanContentQualityAsync();

        Assert.NotNull(audit);
        Assert.Equal(1, audit.TotalLessonsScanned);
        Assert.Equal(1, audit.TotalQuestionsScanned);
        Assert.Equal(1, audit.TotalVideosScanned);
        Assert.True(audit.IssuesFound >= 4);
        Assert.True(audit.HealthScore < 100.0);
        Assert.Contains(audit.Issues, i => i.Category == "katex_syntax");
        Assert.Contains(audit.Issues, i => i.Category == "broken_video");
        Assert.Contains(audit.Issues, i => i.Category == "question_options");
    }

    [Fact]
    public async Task Ops_05_LearningDataConsistency_DetectsMasteryAndSubmissionAnomalies()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        
        // Mastery anomaly: CorrectCount (10) > AttemptCount (5)
        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst1",
            UserId = "st1",
            SubjectId = "math12",
            TopicName = "Số phức",
            AttemptCount = 5,
            CorrectCount = 10,
            MasteryScore = 150.0, // Invalid > 100
            Status = "needs_reinforcement"
        });

        // Duplicate submissions
        db.AssignmentSubmissions.AddRange(
            new AssignmentSubmission
            {
                Id = "sub1",
                AssignmentId = "asgn1",
                StudentId = "st1",
                Score = 8.0
            },
            new AssignmentSubmission
            {
                Id = "sub2",
                AssignmentId = "asgn1",
                StudentId = "st1",
                Score = 8.5
            }
        );

        // Assessment attempt completed before started
        db.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = "att1",
            UserId = "st1",
            StartedAt = DateTimeOffset.UtcNow,
            CompletedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
            ScoreRaw = 15.0,
            ScoreMax = 10.0
        });

        await db.SaveChangesAsync();

        var service = new LearningDataConsistencyService(db);
        var report = await service.ScanDataConsistencyAsync();

        Assert.NotNull(report);
        Assert.True(report.AnomaliesFound >= 3);
        Assert.True(report.IntegrityScore < 100.0);
        Assert.Contains(report.Anomalies, a => a.AnomalyType == "mastery_score_mismatch");
        Assert.Contains(report.Anomalies, a => a.AnomalyType == "duplicate_submission");
        Assert.Contains(report.Anomalies, a => a.AnomalyType == "abnormal_progress_velocity");
    }

    [Fact]
    public async Task Ops_06_DataConsistency_DryRun_DoesNotPersistChanges()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_anomaly",
            UserId = "st1",
            SubjectId = "sub_math12",
            TopicName = "Số phức",
            AttemptCount = 5,
            CorrectCount = 10,
            MasteryScore = 150.0,
            Status = "needs_reinforcement"
        });
        await db.SaveChangesAsync();

        var service = new LearningDataConsistencyService(db);
        var repairReq = new DataConsistencyRepairRequestDto
        {
            DryRun = true
        };

        var result = await service.RepairDataConsistencyAsync("admin_user", repairReq);

        Assert.NotNull(result);
        Assert.True(result.WasDryRun);
        Assert.Equal("DRY_RUN_PREVIEW", result.Status);
        Assert.True(result.ImpactReport.Count > 0);
        Assert.Null(result.AuditLogId);

        // Verify database entity was NOT modified because it was a DryRun
        var untouched = await db.StudentTopicMasteries.FindAsync("mst_anomaly");
        Assert.NotNull(untouched);
        Assert.Equal(150.0, untouched.MasteryScore);
    }

    [Fact]
    public async Task Ops_07_DataConsistency_CommitRepair_PersistsAndAudits()
    {
        using var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        db.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_anomaly2",
            UserId = "st1",
            SubjectId = "sub_math12",
            TopicName = "Số phức",
            AttemptCount = 5,
            CorrectCount = 10,
            MasteryScore = 150.0,
            Status = "needs_reinforcement"
        });
        await db.SaveChangesAsync();

        var service = new LearningDataConsistencyService(db);
        var repairReq = new DataConsistencyRepairRequestDto
        {
            DryRun = false
        };

        var result = await service.RepairDataConsistencyAsync("admin_user", repairReq);

        Assert.NotNull(result);
        Assert.False(result.WasDryRun);
        Assert.Equal("COMMITTED", result.Status);
        Assert.NotNull(result.AuditLogId);

        // Verify database entity WAS modified
        var repaired = await db.StudentTopicMasteries.FindAsync("mst_anomaly2");
        Assert.NotNull(repaired);
        Assert.Equal(100.0, repaired.MasteryScore); // clamped to 100
        Assert.Equal(10, repaired.AttemptCount); // aligned with CorrectCount

        // Verify StaffAuditLog
        var audit = await db.StaffAuditLogs.FirstOrDefaultAsync(l => l.Id == result.AuditLogId);
        Assert.NotNull(audit);
        Assert.Equal("DATA_CONSISTENCY_REPAIR", audit.Action);
        Assert.Equal("admin_user", audit.ActorUserId);
    }
}
