using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Infrastructure.Services;

public class LearningAnalyticsService : ILearningAnalyticsService
{
    private readonly StudyAIDbContext _context;
    private readonly IStudentMasteryService _masteryService;
    private readonly ILlmProvider _llmProvider;
    private readonly ILogger<LearningAnalyticsService> _logger;

    public LearningAnalyticsService(
        StudyAIDbContext context,
        IStudentMasteryService masteryService,
        ILlmProvider llmProvider,
        ILogger<LearningAnalyticsService> logger)
    {
        _context = context;
        _masteryService = masteryService;
        _llmProvider = llmProvider;
        _logger = logger;
    }

    public async Task<LearningAnalyticsOverviewDto> GetAnalyticsOverviewAsync(
        string userId,
        string? subjectId = null,
        string timeframe = "all",
        CancellationToken cancellationToken = default)
    {
        var effectiveSubjectId = string.IsNullOrWhiteSpace(subjectId) || subjectId == "all"
            ? "sub_math12"
            : subjectId;

        var emptyOverview = new LearningAnalyticsOverviewDto
        {
            UserId = userId,
            SubjectId = effectiveSubjectId,
            SubjectName = "Toán 12",
            Timeframe = timeframe
        };

        if (string.IsNullOrWhiteSpace(userId) || userId == "guest")
        {
            return emptyOverview;
        }

        // 1. Fetch Student Knowledge Profile (Unified 4-tier mastery and difficulty breakdown)
        var profile = await _masteryService.GetStudentKnowledgeProfileAsync(userId, effectiveSubjectId, cancellationToken);

        // 2. Determine timeframe cutoff for attempts
        DateTimeOffset? cutoff = timeframe switch
        {
            "7d" => DateTimeOffset.UtcNow.AddDays(-7),
            "30d" => DateTimeOffset.UtcNow.AddDays(-30),
            _ => null
        };

        var attemptsQuery = _context.AssessmentAttempts.AsNoTracking()
            .Where(a => a.UserId == userId && a.SubjectId == effectiveSubjectId && a.CompletionStatus == "completed");

        if (cutoff.HasValue)
        {
            attemptsQuery = attemptsQuery.Where(a => a.LastActivityAt >= cutoff.Value);
        }

        var completedAttempts = await attemptsQuery
            .OrderBy(a => a.LastActivityAt)
            .ToListAsync(cancellationToken);

        // 3. Query all chapters and lessons for curriculum progress
        var chapters = await _context.ContentChapters.AsNoTracking()
            .Where(c => c.SubjectId == effectiveSubjectId && c.IsActive)
            .OrderBy(c => c.OrderIndex)
            .ToListAsync(cancellationToken);

        var lessons = await _context.ContentLessons.AsNoTracking()
            .Where(l => l.Chapter != null && l.Chapter.SubjectId == effectiveSubjectId && l.Status == "published")
            .ToListAsync(cancellationToken);

        var lessonProgresses = await _context.LessonProgresses.AsNoTracking()
            .Where(lp => lp.UserId == userId && lp.SubjectId == effectiveSubjectId)
            .ToListAsync(cancellationToken);

        var topicMasteries = await _context.StudentTopicMasteries.AsNoTracking()
            .Where(m => m.UserId == userId && m.SubjectId == effectiveSubjectId)
            .ToListAsync(cancellationToken);

        // 4. Compute Chapter Mastery Items
        var chapterMasteryItems = new List<ChapterMasteryItemDto>();
        foreach (var chp in chapters)
        {
            var chpLessons = lessons.Where(l => l.ChapterId == chp.Id).ToList();
            var completedCount = chpLessons.Count(l => lessonProgresses.Any(lp => lp.LessonId == l.Id && (lp.OverallProgress >= 80 || lp.ContentProgress >= 80)));
            
            // Average topic mastery for topics in this chapter
            var chpTopicNames = chpLessons.Select(l => l.Title).ToList();
            var relevantMasteries = topicMasteries
                .Where(m => chpTopicNames.Any(title => title.Contains(m.TopicName, StringComparison.OrdinalIgnoreCase) || m.TopicName.Contains(title, StringComparison.OrdinalIgnoreCase)))
                .ToList();

            double avgMastery = relevantMasteries.Count > 0
                ? Math.Round(relevantMasteries.Average(m => m.MasteryScore), 1)
                : (completedCount > 0 ? 50.0 : 0.0);

            string status = completedCount == chpLessons.Count && chpLessons.Count > 0
                ? "completed"
                : completedCount > 0
                    ? "in_progress"
                    : "not_started";

            chapterMasteryItems.Add(new ChapterMasteryItemDto
            {
                ChapterId = chp.Id,
                ChapterTitle = chp.Title,
                OrderIndex = chp.OrderIndex,
                TotalLessons = chpLessons.Count,
                CompletedLessons = completedCount,
                AverageMasteryScore = avgMastery,
                Status = status
            });
        }

        // 5. Strengths and Weaknesses
        var activeMasteries = topicMasteries.Where(m => m.AttemptCount > 0).ToList();
        var topStrengths = activeMasteries
            .Where(m => m.MasteryScore >= 70.0)
            .OrderByDescending(m => m.MasteryScore)
            .Take(5)
            .Select(m => new TopicCompetencyItemDto
            {
                TopicId = m.Id,
                TopicName = m.TopicName,
                MasteryScore = m.MasteryScore,
                AccuracyPercent = m.AttemptCount > 0 ? Math.Round((double)m.CorrectCount / m.AttemptCount * 100.0, 1) : 0.0,
                AttemptCount = m.AttemptCount,
                Status = m.Status,
                StatusLabel = StudentMasteryService.GetStatusVietnameseLabel(m.Status)
            })
            .ToList();

        var topWeaknesses = activeMasteries
            .Where(m => m.MasteryScore < 60.0 || m.Status == "needs_reinforcement")
            .OrderBy(m => m.MasteryScore)
            .Take(5)
            .Select(m => new TopicCompetencyItemDto
            {
                TopicId = m.Id,
                TopicName = m.TopicName,
                MasteryScore = m.MasteryScore,
                AccuracyPercent = m.AttemptCount > 0 ? Math.Round((double)m.CorrectCount / m.AttemptCount * 100.0, 1) : 0.0,
                AttemptCount = m.AttemptCount,
                Status = m.Status,
                StatusLabel = StudentMasteryService.GetStatusVietnameseLabel(m.Status)
            })
            .ToList();

        // 6. Progression Timeline (by date)
        var progressionTimeline = completedAttempts
            .GroupBy(a => a.LastActivityAt.ToString("yyyy-MM-dd"))
            .Select(g =>
            {
                var attemptsInDay = g.ToList();
                int totalInDay = 0;
                int correctInDay = 0;
                foreach (var a in attemptsInDay)
                {
                    totalInDay += (int)(a.ScoreMax > 0 ? a.ScoreMax : 10);
                    correctInDay += (int)(a.ScoreRaw ?? 0);
                }
                double acc = totalInDay > 0 ? Math.Round((double)correctInDay / totalInDay * 100.0, 1) : 0.0;
                double avgScaled = attemptsInDay.Count > 0 ? Math.Round(attemptsInDay.Average(a => a.ScoreScaled ?? 0.0) * 10.0, 1) : 0.0;

                return new ProgressionDataPointDto
                {
                    Date = g.Key,
                    QuestionsAttempted = totalInDay,
                    AccuracyPercent = acc,
                    CumulativeMasteryScore = avgScaled
                };
            })
            .OrderBy(p => p.Date)
            .ToList();

        // 7. Review Frequency & Active Streak
        var last7DaysCutoff = DateTimeOffset.UtcNow.AddDays(-7);
        var last30DaysCutoff = DateTimeOffset.UtcNow.AddDays(-30);

        int sessions7d = completedAttempts.Count(a => a.LastActivityAt >= last7DaysCutoff);
        int sessions30d = completedAttempts.Count(a => a.LastActivityAt >= last30DaysCutoff);

        int activeStreak = CalculateActiveStreakDays(completedAttempts.Select(a => a.LastActivityAt.Date).Distinct().OrderByDescending(d => d).ToList());

        var reviewFrequency = new ReviewFrequencyStatsDto
        {
            SessionsLast7Days = sessions7d,
            SessionsLast30Days = sessions30d,
            ActiveStreakDays = activeStreak,
            LastActiveAt = completedAttempts.LastOrDefault()?.LastActivityAt
        };

        // 8. Exam Performance Summary
        var examAttempts = completedAttempts
            .Where(a => a.AssessmentId == "asmt_exam")
            .OrderByDescending(a => a.LastActivityAt)
            .ToList();

        var examSummary = new ExamPerformanceSummaryDto
        {
            ExamsCompletedCount = examAttempts.Count,
            AverageExamScoreScaled = examAttempts.Count > 0 ? Math.Round(examAttempts.Average(a => a.ScoreScaled ?? 0.0), 2) : 0.0,
            HighestExamScoreScaled = examAttempts.Count > 0 ? Math.Round(examAttempts.Max(a => a.ScoreScaled ?? 0.0), 2) : 0.0,
            LatestExamScoreScaled = examAttempts.Count > 0 ? Math.Round(examAttempts.First().ScoreScaled ?? 0.0, 2) : 0.0,
            LatestExamAt = examAttempts.FirstOrDefault()?.LastActivityAt
        };

        return new LearningAnalyticsOverviewDto
        {
            UserId = userId,
            SubjectId = effectiveSubjectId,
            SubjectName = "Toán 12",
            Timeframe = timeframe,
            TotalQuestionsAttempted = profile?.TotalQuestionsAttempted ?? 0,
            TotalCorrect = profile?.TotalCorrect ?? 0,
            TotalIncorrect = profile?.TotalIncorrect ?? 0,
            OverallAccuracyPercent = profile?.OverallAccuracyPercent ?? 0.0,
            TotalTimeSpentSeconds = profile?.TotalTimeSpentSeconds ?? 0,
            TotalSessionsCompleted = completedAttempts.Count,
            CurriculumProgressPercent = profile?.CurriculumProgressPercent ?? 0.0,
            CurrentMasteryTier = profile?.OverallStatus ?? "insufficient_data",
            CurrentMasteryLabel = profile?.OverallStatusLabel ?? "Chưa đủ dữ liệu",
            OverallMasteryScore = profile?.OverallMasteryScore ?? 0.0,
            DifficultyAccuracy = profile?.DifficultyBreakdown ?? new Dictionary<string, DifficultyBreakdownDto>(),
            ChapterMasteries = chapterMasteryItems,
            TopStrengths = topStrengths,
            TopWeaknesses = topWeaknesses,
            ProgressionTimeline = progressionTimeline,
            ReviewFrequency = reviewFrequency,
            ExamSummary = examSummary
        };
    }

    public async Task<List<LearningRiskDto>> GetLearningRisksAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveSubjectId = string.IsNullOrWhiteSpace(subjectId) || subjectId == "all"
            ? "sub_math12"
            : subjectId;

        if (string.IsNullOrWhiteSpace(userId) || userId == "guest")
        {
            return new List<LearningRiskDto>();
        }

        var risks = new List<LearningRiskDto>();

        var masteries = await _context.StudentTopicMasteries.AsNoTracking()
            .Where(m => m.UserId == userId && m.SubjectId == effectiveSubjectId)
            .ToListAsync(cancellationToken);

        var recentResponses = await _context.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == userId && r.Attempt.SubjectId == effectiveSubjectId)
            .OrderByDescending(r => r.Attempt!.LastActivityAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        var qIds = recentResponses.Select(r => r.QuestionId).Distinct().ToList();
        var questionMap = await _context.ContentQuestions.AsNoTracking()
            .Where(q => qIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, cancellationToken);

        // 1. RISK: Consecutive Mistakes (3+ consecutive wrong on a topic)
        var responsesByTopic = recentResponses
            .Where(r => questionMap.TryGetValue(r.QuestionId, out var q) && !string.IsNullOrWhiteSpace(q.Topic))
            .GroupBy(r => questionMap[r.QuestionId].Topic!);

        foreach (var group in responsesByTopic)
        {
            var orderedTopicResponses = group.Take(5).ToList();
            if (orderedTopicResponses.Count >= 3 && orderedTopicResponses.Take(3).All(r => r.IsCorrect != true))
            {
                var firstQ = questionMap.TryGetValue(orderedTopicResponses[0].QuestionId, out var fq) ? fq : null;
                risks.Add(new LearningRiskDto
                {
                    Id = $"risk_consec_{Guid.NewGuid():N}",
                    RiskType = "consecutive_mistakes",
                    RiskLevel = "high",
                    Title = $"Lặp lại sai sót trong chủ đề \"{group.Key}\"",
                    TopicName = group.Key,
                    LessonId = firstQ?.LessonId,
                    RootCauseEvidence = $"Học sinh đã trả lời chưa chính xác 3 lượt câu hỏi liên tiếp gần nhất trong chủ đề này.",
                    RecommendedAction = "Tạm dừng làm bài tập mới, mở lại phần lý thuyết và ví dụ mẫu trong bài học tương ứng để củng cố phương pháp giải.",
                    DetectedAt = DateTimeOffset.UtcNow
                });
            }
        }

        // 2. RISK: Declining Mastery (đo xu hướng suy giảm thực tế qua thời gian)
        // & Unremediated Gap (Lỗ hổng kiến thức nghiêm trọng kéo dài)
        foreach (var m in masteries.Where(m => m.AttemptCount >= 4))
        {
            // Kiểm tra Unremediated Gap trước: Điểm luôn thấp nghiêm trọng (< 35%) qua >= 4 lượt
            if (m.Status == "needs_reinforcement" && m.MasteryScore < 35.0)
            {
                risks.Add(new LearningRiskDto
                {
                    Id = $"risk_gap_{m.Id}",
                    RiskType = "unremediated_gap",
                    RiskLevel = "high",
                    Title = $"Lỗ hổng kiến thức nghiêm trọng: \"{m.TopicName}\"",
                    TopicName = m.TopicName,
                    RootCauseEvidence = $"Điểm năng lực chỉ đạt {m.MasteryScore}% sau {m.AttemptCount} lượt làm bài ({m.CorrectCount} câu đúng).",
                    RecommendedAction = "Sử dụng chế độ Luyện tập thích ứng AI để làm 5 câu mức độ Nhận biết, sau đó yêu cầu AI Tutor hướng dẫn chi tiết.",
                    DetectedAt = m.UpdatedAt
                });
                continue;
            }

            // Đo xu hướng suy giảm thực tế theo thời gian (Declining Mastery)
            // Lấy toàn bộ phản hồi của chủ đề này từ các phiên làm bài, sắp xếp theo thời gian tăng dần
            var topicResponses = recentResponses
                .Where(r => questionMap.TryGetValue(r.QuestionId, out var q) && string.Equals(q.Topic, m.TopicName, StringComparison.OrdinalIgnoreCase))
                .OrderBy(r => r.Attempt != null ? (r.Attempt.CompletedAt ?? r.Attempt.StartedAt) : DateTimeOffset.MinValue)
                .ToList();

            // Yêu cầu tối thiểu 4 câu hỏi trải qua ít nhất 2 thời điểm khác nhau để có 2 mốc so sánh
            if (topicResponses.Count >= 4)
            {
                int splitIndex = topicResponses.Count / 2;
                var earlierHalf = topicResponses.Take(splitIndex).ToList();
                var recentHalf = topicResponses.Skip(splitIndex).ToList();

                double earlierAcc = earlierHalf.Count > 0 ? (double)earlierHalf.Count(r => r.IsCorrect == true) / earlierHalf.Count * 100.0 : 0.0;
                double recentAcc = recentHalf.Count > 0 ? (double)recentHalf.Count(r => r.IsCorrect == true) / recentHalf.Count * 100.0 : 0.0;

                // Suy giảm thực sự: Nửa trước có tỷ lệ đúng tốt (>= 60%), nhưng nửa gần đây tụt giảm mạnh (<= 40%), độ chênh lệch giảm >= 25%
                if (earlierAcc >= 60.0 && recentAcc <= 40.0 && (earlierAcc - recentAcc) >= 25.0)
                {
                    risks.Add(new LearningRiskDto
                    {
                        Id = $"risk_decl_{m.Id}",
                        RiskType = "declining_mastery",
                        RiskLevel = "high",
                        Title = $"Năng lực suy giảm rõ rệt ở chủ đề \"{m.TopicName}\"",
                        TopicName = m.TopicName,
                        RootCauseEvidence = $"Tỷ lệ chính xác suy giảm từ {Math.Round(earlierAcc, 1)}% ở các bài trước xuống còn {Math.Round(recentAcc, 1)}% ở các bài gần đây (giảm {Math.Round(earlierAcc - recentAcc, 1)}%).",
                        RecommendedAction = "Học sinh có dấu hiệu quên kiến thức hoặc gặp dạng bài phức tạp hơn; cần xem lại phần giải thích chi tiết các câu sai gần đây.",
                        DetectedAt = m.UpdatedAt
                    });
                }
            }
        }

        // 3. RISK: Decay Unreviewed (> 14 days since last attempt for incomplete topics)
        var decayCutoff = DateTimeOffset.UtcNow.AddDays(-14);
        foreach (var m in masteries.Where(m => m.AttemptCount > 0 && m.MasteryScore < 85.0))
        {
            var lastActivity = m.LastAttemptAt ?? m.UpdatedAt;
            if (lastActivity < decayCutoff)
            {
                var daysAgo = (int)(DateTimeOffset.UtcNow - lastActivity).TotalDays;
                risks.Add(new LearningRiskDto
                {
                    Id = $"risk_decay_{m.Id}",
                    RiskType = "decay_unreviewed",
                    RiskLevel = "medium",
                    Title = $"Chủ đề lâu chưa ôn tập: \"{m.TopicName}\"",
                    TopicName = m.TopicName,
                    RootCauseEvidence = $"Đã {daysAgo} ngày kể từ phiên làm bài gần nhất. Theo đường cong quên lãng Ebbinghaus, kiến thức đang bị suy giảm.",
                    RecommendedAction = "Dành 10 phút làm bài ôn tập nhanh (Smart Review) để chuyển kiến thức vào trí nhớ dài hạn.",
                    DetectedAt = DateTimeOffset.UtcNow
                });
            }
        }

        return risks
            .OrderByDescending(r => r.RiskLevel == "high" ? 3 : (r.RiskLevel == "medium" ? 2 : 1))
            .Take(8)
            .ToList();
    }

    public async Task<AiLearningReportDto> GetAiLearningReportAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveSubjectId = string.IsNullOrWhiteSpace(subjectId) || subjectId == "all"
            ? "sub_math12"
            : subjectId;

        var overview = await GetAnalyticsOverviewAsync(userId, effectiveSubjectId, "all", cancellationToken);
        var risks = await GetLearningRisksAsync(userId, effectiveSubjectId, cancellationToken);

        var strengths = overview.TopStrengths.Select(s => $"{s.TopicName} (Thành thạo {s.MasteryScore}%)").ToList();
        var gaps = overview.TopWeaknesses.Select(w => $"{w.TopicName} ({w.StatusLabel}, đúng {w.AccuracyPercent}%)").ToList();

        var mistakePatterns = risks.Select(r => r.Title).Distinct().Take(4).ToList();
        if (mistakePatterns.Count == 0 && overview.TotalIncorrect > 0)
        {
            mistakePatterns.Add("Cần chú ý cẩn thận hơn ở các bước tính toán đạo hàm và đọc bảng biến thiên.");
        }

        var goals = new List<string>
        {
            $"Hoàn thành củng cố 100% các chủ đề ở mức Chưa nắm vững.",
            $"Nâng tỷ lệ chính xác mức độ Thông hiểu lên tối thiểu 80%.",
            $"Duy trì chuỗi học tập đều đặn ít nhất 3 phiên luyện tập mỗi tuần."
        };

        var studyPlan = new List<string>
        {
            overview.TopWeaknesses.Count > 0
                ? $"Ưu tiên 1: Xem lại bài giảng và ví dụ mẫu của bài \"{overview.TopWeaknesses.First().TopicName}\"."
                : "Ưu tiên 1: Tiếp tục bài học kế tiếp trong chương trình Toán 12.",
            "Ưu tiên 2: Làm 10 câu hỏi thích ứng mức độ Nhận biết và Thông hiểu.",
            "Ưu tiên 3: Làm 1 đề thi thử định kỳ 50 câu để đánh giá mức độ tiến bộ tổng thể."
        };

        string overallEval = overview.CurrentMasteryTier switch
        {
            "mastered" => "Học sinh có năng lực Toán 12 xuất sắc, làm chủ các dạng toán vận dụng cao và duy trì độ ổn định ấn tượng.",
            "proficient" => "Học sinh nắm vững kiến thức trọng tâm GDPT 2018, hoàn thành tốt các câu hỏi nhận biết và thông hiểu.",
            "progressing" => "Học sinh có nền tảng cơ bản nhưng cần củng cố thêm các dạng toán phân loại và tăng cường tốc độ giải.",
            "needs_reinforcement" => "Học sinh đang gặp khó khăn ở một số khái niệm trọng tâm, cần tập trung lấp lỗ hổng kiến thức trước khi làm câu khó.",
            _ => "Học sinh mới bắt đầu học tập, hệ thống đang thu thập thêm dữ liệu để đánh giá năng lực một cách khách quan nhất."
        };

        // Generate narrative using Gemini LLM if available, else local pedagogical fallback
        string narrative = string.Empty;
        string provider = "LocalPedagogicalEngine";
        bool isFallback = true;

        var prompt = $"Bạn là Cố vấn học tập AI môn Toán 12. Hãy viết một đoạn nhận xét sư phạm ngắn (150-180 từ), khách quan, khích lệ và thực tế dựa trên hồ sơ sau:\n" +
            $"- Năng lực tổng thể: {overview.OverallMasteryScore}/100 ({overview.CurrentMasteryLabel})\n" +
            $"- Tỷ lệ chính xác: {overview.OverallAccuracyPercent}% ({overview.TotalCorrect}/{overview.TotalQuestionsAttempted} câu)\n" +
            $"- Điểm mạnh: {(strengths.Count > 0 ? string.Join(", ", strengths) : "Đang tích lũy")}\n" +
            $"- Điểm cần củng cố: {(gaps.Count > 0 ? string.Join(", ", gaps) : "Chưa có lỗ hổng lớn")}\n" +
            $"- Số phiên thi thử: {overview.ExamSummary.ExamsCompletedCount} đề (Điểm TB: {overview.ExamSummary.AverageExamScoreScaled}/10)\n" +
            $"Yêu cầu: Không bịa đặt số liệu, tập trung vào giải pháp hành động cụ thể cho kỳ thi tốt nghiệp THPT.";

        try
        {
            var llmReq = new LlmCompletionRequest(
                new[] { new LlmChatMessage("user", prompt) },
                CancellationToken: cancellationToken);
            var llmResponse = await _llmProvider.GenerateCompletionAsync(llmReq);
            if (!string.IsNullOrWhiteSpace(llmResponse.Content) && !llmResponse.Content.Contains("mock", StringComparison.OrdinalIgnoreCase))
            {
                narrative = llmResponse.Content.Trim();
                provider = !string.IsNullOrWhiteSpace(llmResponse.Provider) ? llmResponse.Provider : _llmProvider.ProviderName;
                isFallback = llmResponse.IsFallback;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM provider failed for learning report narrative, using local pedagogical engine.");
        }

        if (string.IsNullOrWhiteSpace(narrative))
        {
            narrative = $"Dựa trên kết quả thực tế qua {overview.TotalQuestionsAttempted} câu hỏi đã làm, bạn đang ở mức \"{overview.CurrentMasteryLabel}\" với điểm số năng lực {overview.OverallMasteryScore}%. " +
                (strengths.Count > 0 ? $"Bạn thể hiện phong độ tốt nhất ở phần {string.Join(", ", strengths.Take(2))}. " : "") +
                (gaps.Count > 0 ? $"Tuy nhiên, để bứt phá điểm số trong kỳ thi tốt nghiệp THPT, bạn cần dành thời gian củng cố ngay phần {string.Join(", ", gaps.Take(2))}. " : "") +
                $"Hãy bám sát kế hoạch ôn tập ngắn hạn và hỏi AI Tutor bất cứ khi nào bạn gặp câu hỏi chưa rõ phương pháp giải.";
            provider = "LocalPedagogicalEngine";
            isFallback = true;
        }

        return new AiLearningReportDto
        {
            ReportId = $"rep_{Guid.NewGuid():N}",
            UserId = userId,
            SubjectId = effectiveSubjectId,
            SubjectName = "Toán 12",
            GeneratedAt = DateTimeOffset.UtcNow,
            OverallMasteryScore = overview.OverallMasteryScore,
            CurrentCompetencyTier = overview.CurrentMasteryLabel,
            AccuracyPercent = overview.OverallAccuracyPercent,
            TotalQuestionsAttempted = overview.TotalQuestionsAttempted,
            CurriculumProgressPercent = overview.CurriculumProgressPercent,
            OverallEvaluation = overallEval,
            KeyStrengths = strengths,
            CriticalGaps = gaps,
            RecentProgressSummary = $"Hoàn thành {overview.TotalSessionsCompleted} phiên học tập ({overview.ReviewFrequency.SessionsLast7Days} phiên trong 7 ngày qua), chuỗi hoạt động {overview.ReviewFrequency.ActiveStreakDays} ngày.",
            CommonMistakePatterns = mistakePatterns,
            RecommendedGoals = goals,
            ShortTermStudyPlan = studyPlan,
            PedagogicalNarrative = narrative,
            Provider = provider,
            IsFallbackNarrative = isFallback
        };
    }

    private static int CalculateActiveStreakDays(List<DateTime> distinctActiveDates)
    {
        if (distinctActiveDates.Count == 0) return 0;

        var today = DateTime.UtcNow.Date;
        var yesterday = today.AddDays(-1);

        // If not active today or yesterday, streak is broken
        if (distinctActiveDates[0] != today && distinctActiveDates[0] != yesterday)
        {
            return 0;
        }

        int streak = 1;
        var current = distinctActiveDates[0];

        for (int i = 1; i < distinctActiveDates.Count; i++)
        {
            if (distinctActiveDates[i] == current.AddDays(-1))
            {
                streak++;
                current = distinctActiveDates[i];
            }
            else
            {
                break;
            }
        }

        return streak;
    }
}
