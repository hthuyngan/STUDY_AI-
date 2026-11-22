using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace StudyAI.Features.Student;

public class ExamReadinessService : IExamReadinessService
{
    private readonly StudyAIDbContext _context;
    private readonly ILogger<ExamReadinessService> _logger;

    private static readonly Dictionary<string, string[]> GradeCriticalTopics = new()
    {
        ["10"] = new[]
        {
            "Mệnh đề và tập hợp",
            "Bất phương trình bậc nhất hai ẩn",
            "Hàm số bậc hai",
            "Hệ thức lượng trong tam giác",
            "Vectơ",
            "Thống kê"
        },
        ["11"] = new[]
        {
            "Hàm số lượng giác",
            "Dãy số, cấp số cộng, cấp số nhân",
            "Giới hạn, hàm số liên tục",
            "Đạo hàm",
            "Quan hệ vuông góc trong không gian",
            "Xác suất"
        },
        ["12"] = new[]
        {
            "Tính đơn điệu của hàm số",
            "Cực trị của hàm số",
            "Giá trị lớn nhất và nhỏ nhất của hàm số",
            "Khảo sát sự biến thiên và vẽ đồ thị hàm số",
            "Vectơ trong không gian",
            "Toạ độ của điểm và vectơ trong không gian"
        }
    };

    public ExamReadinessService(
        StudyAIDbContext context,
        ILogger<ExamReadinessService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ExamReadinessDto> AssessReadinessAsync(
        string userId,
        string subjectId,
        CancellationToken cancellationToken = default)
    {
        // 1. Fetch user topic masteries
        var masteries = await _context.StudentTopicMasteries.AsNoTracking()
            .Where(m => m.UserId == userId && m.SubjectId == subjectId)
            .ToListAsync(cancellationToken);

        // Fetch curriculum total topics
        var totalCurriculumLessons = await _context.ContentLessons.AsNoTracking()
            .CountAsync(l => l.Chapter!.SubjectId == subjectId && l.Status == "published", cancellationToken);

        int totalTopicsCount = Math.Max(totalCurriculumLessons, Math.Max(masteries.Count, 10));

        // Covered topics (mastery >= 50%)
        int coveredCount = masteries.Count(m => m.MasteryScore >= 50.0);
        double curriculumCoverage = Math.Round(((double)coveredCount / totalTopicsCount) * 100.0, 1);
        curriculumCoverage = Math.Clamp(curriculumCoverage, 0.0, 100.0);

        // 2. Critical Topics Mastery
        var gradeKey = subjectId.Contains("10") ? "10" : subjectId.Contains("11") ? "11" : "12";
        var criticalTopics = GradeCriticalTopics.TryGetValue(gradeKey, out var topics) ? topics : GradeCriticalTopics["12"];

        var criticalDict = new Dictionary<string, double>();
        double criticalSum = 0.0;
        foreach (var critTopic in criticalTopics)
        {
            var match = masteries.FirstOrDefault(m => m.TopicName.Contains(critTopic, StringComparison.OrdinalIgnoreCase) ||
                                                      critTopic.Contains(m.TopicName, StringComparison.OrdinalIgnoreCase));
            double score = match?.MasteryScore ?? 0.0;
            criticalDict[critTopic] = Math.Round(score, 1);
            criticalSum += score;
        }
        double criticalAvg = criticalTopics.Length > 0 ? criticalSum / criticalTopics.Length : 0.0;

        // 3. Exam Score Stability & History
        var completedExams = await _context.AssessmentAttempts.AsNoTracking()
            .Where(a => a.UserId == userId &&
                        a.SubjectId == subjectId &&
                        a.AssessmentId == "asmt_exam" &&
                        a.CompletionStatus == "completed")
            .OrderByDescending(a => a.LastActivityAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        double stabilityPercent;
        double predictedMin;
        double predictedMax;
        string tier;

        if (completedExams.Count < 2)
        {
            tier = "insufficient_data";
            stabilityPercent = 0.0;
            predictedMin = 0.0;
            predictedMax = 0.0;
        }
        else
        {
            var scores = completedExams.Select(e => e.ScoreScaled ?? ((e.ScoreRaw ?? 0.0) / Math.Max(1.0, e.ScoreMax) * 10.0)).ToList();
            double avgScore = scores.Average();

            // Calculate standard deviation
            double variance = scores.Select(s => Math.Pow(s - avgScore, 2)).Average();
            double stdDev = Math.Sqrt(variance);

            stabilityPercent = Math.Clamp(Math.Round(100.0 - (stdDev * 15.0), 1), 20.0, 100.0);
            predictedMin = Math.Max(1.0, Math.Round(avgScore - Math.Max(0.5, stdDev * 0.8), 1));
            predictedMax = Math.Min(10.0, Math.Round(avgScore + Math.Max(0.5, stdDev * 0.8), 1));

            // Weight composite score
            double readinessScore = (curriculumCoverage * 0.35) + (criticalAvg * 0.40) + (stabilityPercent * 0.25);
            if (readinessScore >= 80.0)
            {
                tier = "exam_ready";
            }
            else if (readinessScore >= 60.0)
            {
                tier = "progressing";
            }
            else
            {
                tier = "needs_reinforcement";
            }
        }

        double finalReadinessScore = completedExams.Count < 2
            ? Math.Round((curriculumCoverage * 0.4) + (criticalAvg * 0.6), 1)
            : Math.Round((curriculumCoverage * 0.35) + (criticalAvg * 0.40) + (stabilityPercent * 0.25), 1);
        finalReadinessScore = Math.Clamp(finalReadinessScore, 0.0, 100.0);

        string recommendation = tier switch
        {
            "exam_ready" => "Năng lực của bạn đang ở mức rất tốt! Hãy duy trì luyện đề bấm giờ và rà soát các câu vận dụng cao.",
            "progressing" => "Tiến độ khả quan. Cần tập trung củng cố 1-2 chuyên đề trọng điểm còn thiếu sót để bứt phá điểm số.",
            "needs_reinforcement" => "Cần ưu tiên ôn tập lại các chuyên đề cốt lõi và hoàn thành lịch Spaced Repetition hàng ngày trước khi thi thử.",
            _ => "Bạn cần hoàn thành thêm ít nhất 2 đề thi thử mô phỏng để hệ thống có đủ dữ liệu đo lường năng lực tin cậy."
        };

        return new ExamReadinessDto
        {
            UserId = userId,
            SubjectId = subjectId,
            AssessedAt = DateTimeOffset.UtcNow,
            ReadinessScorePercent = finalReadinessScore,
            ReadinessTier = tier,
            CurriculumCoveragePercent = curriculumCoverage,
            ExamScoreStabilityPercent = stabilityPercent,
            PredictedScoreMin = predictedMin,
            PredictedScoreMax = predictedMax,
            CriticalTopicsMastery = criticalDict,
            Disclaimer = "Chỉ số đánh giá độ sẵn sàng ôn tập nội bộ mang tính chất tham khảo dựa trên dữ liệu học tập cá nhân, không cấu thành cam kết hay dự báo điểm thi chính thức của Bộ GD&ĐT.",
            RecommendedAction = recommendation
        };
    }
}