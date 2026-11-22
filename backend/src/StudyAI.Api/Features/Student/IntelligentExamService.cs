using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace StudyAI.Features.Student;

public class IntelligentExamService : IIntelligentExamService
{
    private readonly StudyAIDbContext _context;
    private readonly IExamBlueprintService _blueprintService;
    private readonly ISubjectGradeResolver? _subjectResolver;
    private readonly ILogger<IntelligentExamService> _logger;

    public IntelligentExamService(
        StudyAIDbContext context,
        ILogger<IntelligentExamService> logger,
        IExamBlueprintService? blueprintService = null,
        ISubjectGradeResolver? subjectResolver = null)
    {
        _context = context;
        _logger = logger;
        _blueprintService = blueprintService ?? new ExamBlueprintService();
        _subjectResolver = subjectResolver;
    }

    public async Task<PracticeSessionResponseDto> GenerateMatrixExamAsync(
        string userId,
        ExamMatrixRequestDto request,
        CancellationToken cancellationToken = default)
    {
        string effectiveSubjectId = request.SubjectId;
        if (string.IsNullOrWhiteSpace(effectiveSubjectId))
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            if (_subjectResolver != null)
            {
                var resolved = await _subjectResolver.ResolveSubjectAsync(
                    requestedSubjectId: request.SubjectId,
                    userGrade: user?.Grade,
                    cancellationToken: cancellationToken);
                effectiveSubjectId = resolved.Success && !string.IsNullOrEmpty(resolved.SubjectId)
                    ? resolved.SubjectId
                    : "sub_math10";
            }
            else
            {
                var g = user?.Grade?.Trim();
                if (g == "10" || g?.Contains("10") == true) effectiveSubjectId = "sub_math10";
                else if (g == "11" || g?.Contains("11") == true) effectiveSubjectId = "sub_math11";
                else if (g == "12" || g?.Contains("12") == true) effectiveSubjectId = "sub_math12";
                else effectiveSubjectId = "sub_math10";
            }
        }

        // Resolve blueprint
        ExamBlueprintDto? blueprint = null;
        var requestedBlueprintId = !string.IsNullOrWhiteSpace(request.BlueprintId)
            ? request.BlueprintId
            : "moet_thpt_2025_official";

        try
        {
            blueprint = await _blueprintService.GetBlueprintByIdAsync(requestedBlueprintId, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve blueprint {BlueprintId}, falling back to default.", requestedBlueprintId);
        }

        int totalCount = request.TotalQuestions > 0
            ? Math.Clamp(request.TotalQuestions, 10, 100)
            : (blueprint?.TotalQuestions ?? 34);

        int durationMinutes = request.DurationMinutes > 0
            ? Math.Clamp(request.DurationMinutes, 15, 180)
            : (blueprint?.DurationMinutes ?? 90);

        var examTitle = !string.IsNullOrWhiteSpace(request.Title)
            ? request.Title
            : (blueprint?.Title ?? "Đề thi thử Tốt nghiệp THPT Toán 12");

        // Fetch candidate questions from verified question bank
        var query = _context.ContentQuestions.AsNoTracking()
            .Where(q => !q.IsDeleted && q.Status == "published" && !string.IsNullOrWhiteSpace(q.CorrectAnswer) && q.SubjectId == effectiveSubjectId);

        if (!string.IsNullOrWhiteSpace(request.ChapterId))
        {
            query = query.Where(q => q.ChapterId == request.ChapterId);
        }

        var allAvailable = await query.ToListAsync(cancellationToken);
        if (allAvailable.Count == 0)
        {
            throw new InvalidOperationException($"Không tìm thấy câu hỏi đã duyệt cho môn học '{effectiveSubjectId}'.");
        }

        // Determine target cognitive distribution
        Dictionary<string, int> targetDistribution;
        if (request.CognitiveDistribution != null && request.CognitiveDistribution.Count > 0)
        {
            targetDistribution = request.CognitiveDistribution;
        }
        else if (blueprint != null && blueprint.Sections.Count > 0)
        {
            // Aggregate target distribution from blueprint sections
            targetDistribution = new Dictionary<string, int>();
            foreach (var section in blueprint.Sections)
            {
                foreach (var (level, cnt) in section.TargetCognitiveDistribution)
                {
                    targetDistribution[level] = targetDistribution.GetValueOrDefault(level, 0) + cnt;
                }
            }
        }
        else
        {
            // GDPT 2018 4-level standard: 40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao
            targetDistribution = new Dictionary<string, int>
            {
                ["nhan_biet"] = (int)Math.Round(totalCount * 0.4),
                ["thong_hieu"] = (int)Math.Round(totalCount * 0.3),
                ["van_dung"] = (int)Math.Round(totalCount * 0.2),
                ["van_dung_cao"] = Math.Max(1, totalCount - (int)Math.Round(totalCount * 0.4) - (int)Math.Round(totalCount * 0.3) - (int)Math.Round(totalCount * 0.2))
            };
        }

        var selectedQuestions = new List<ContentQuestion>();
        var rng = new Random();

        foreach (var (levelKey, count) in targetDistribution)
        {
            var matching = allAvailable
                .Where(q => q.Difficulty == levelKey ||
                    (levelKey == "nhan_biet" && q.Difficulty == "easy") ||
                    (levelKey == "thong_hieu" && q.Difficulty == "medium") ||
                    (levelKey == "van_dung" && q.Difficulty == "hard") ||
                    (levelKey == "van_dung_cao" && (q.Difficulty == "very-hard" || q.Difficulty == "very_hard")))
                .Where(q => !selectedQuestions.Contains(q))
                .OrderBy(_ => rng.Next())
                .Take(count)
                .ToList();

            selectedQuestions.AddRange(matching);
        }

        // Fill remaining if some levels have fewer questions
        if (selectedQuestions.Count < totalCount)
        {
            int deficit = totalCount - selectedQuestions.Count;
            var fillCandidates = allAvailable
                .Where(q => !selectedQuestions.Contains(q))
                .OrderBy(_ => rng.Next())
                .Take(deficit)
                .ToList();

            selectedQuestions.AddRange(fillCandidates);
        }

        // Final random shuffle to blend questions across cognitive levels
        selectedQuestions = selectedQuestions.OrderBy(_ => rng.Next()).ToList();

        var sessionId = $"exam_{Guid.NewGuid():N}";
        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.AddMinutes(durationMinutes);
        var questionIds = selectedQuestions.Select(q => q.Id).ToList();

        var suspendData = new JsonObject
        {
            ["mode"] = "exam",
            ["title"] = examTitle,
            ["blueprintId"] = blueprint?.BlueprintId ?? "custom",
            ["blueprintTitle"] = blueprint?.Title ?? "Tùy biến",
            ["regulationSource"] = blueprint?.RegulationSource ?? string.Empty,
            ["isOfficialStandard"] = blueprint?.IsOfficialStandard ?? false,
            ["questionIds"] = JsonSerializer.SerializeToNode(questionIds),
            ["timeLimitMinutes"] = durationMinutes,
            ["expiresAt"] = expiresAt.ToString("o"),
            ["answers"] = new JsonObject()
        };

        var attempt = new AssessmentAttempt
        {
            Id = sessionId,
            UserId = userId,
            AssessmentId = "asmt_exam",
            SubjectId = effectiveSubjectId,
            LessonId = string.Empty,
            AttemptNumber = 1,
            StartedAt = now,
            LastActivityAt = now,
            CompletionStatus = "in_progress",
            ScoreMax = selectedQuestions.Count,
            SessionTimeMs = 0,
            SuspendDataJson = suspendData.ToJsonString()
        };

        _context.AssessmentAttempts.Add(attempt);
        await _context.SaveChangesAsync(cancellationToken);

        var questionDtos = selectedQuestions.Select(q => new PracticeQuestionDto
        {
            Id = q.Id,
            Prompt = q.Prompt,
            Options = SafeDeserializeStringList(q.OptionsJson),
            ImageUrl = q.ImageUrl,
            Difficulty = q.Difficulty,
            Type = q.Type,
            Topic = q.Topic,
            SubjectId = q.SubjectId
        }).ToList();

        return new PracticeSessionResponseDto
        {
            SessionId = sessionId,
            SubjectId = effectiveSubjectId,
            ChapterId = request.ChapterId,
            Mode = "exam",
            QuestionCount = questionDtos.Count,
            TimeLimitMinutes = durationMinutes,
            StartedAt = now,
            ExpiresAt = expiresAt,
            Status = "in_progress",
            Questions = questionDtos,
            SavedAnswers = new Dictionary<string, string>()
        };
    }

    public async Task<ExamReviewAnalyticsDto> GetExamReviewAnalyticsAsync(
        string userId,
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _context.AssessmentAttempts.AsNoTracking()
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == sessionId, cancellationToken);

        if (attempt == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy bài thi với mã '{sessionId}'.");
        }

        if (attempt.UserId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập kết quả thi của học sinh khác.");
        }

        if (attempt.CompletionStatus != "completed")
        {
            throw new InvalidOperationException("Bài thi chưa được nộp hoặc chưa hoàn thành. Không thể xem phân tích kết quả khi đang làm bài.");
        }

        var responses = attempt.Responses.ToList();
        var questionIds = responses.Select(r => r.QuestionId).ToList();

        var questions = await _context.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToListAsync(cancellationToken);

        var chapters = await _context.ContentChapters.AsNoTracking()
            .Where(c => c.SubjectId == attempt.SubjectId)
            .ToListAsync(cancellationToken);

        var lessons = await _context.ContentLessons.AsNoTracking()
            .Where(l => l.Chapter != null && l.Chapter.SubjectId == attempt.SubjectId && l.Status == "published")
            .ToListAsync(cancellationToken);

        int totalQ = (int)(attempt.ScoreMax > 0 ? attempt.ScoreMax : questions.Count);
        int correctCount = (int)(attempt.ScoreRaw ?? responses.Count(r => r.IsCorrect == true));
        int incorrectCount = responses.Count(r => r.IsCorrect != true);
        int unansweredCount = Math.Max(0, totalQ - responses.Count);

        // Cognitive Breakdown
        var cognitiveBreakdown = new Dictionary<string, DifficultyBreakdownDto>
        {
            ["nhan_biet"] = new() { LevelKey = "nhan_biet", LevelName = "Nhận biết" },
            ["thong_hieu"] = new() { LevelKey = "thong_hieu", LevelName = "Thông hiểu" },
            ["van_dung"] = new() { LevelKey = "van_dung", LevelName = "Vận dụng" },
            ["van_dung_cao"] = new() { LevelKey = "van_dung_cao", LevelName = "Vận dụng cao" }
        };

        foreach (var q in questions)
        {
            var level = NormalizeDifficultyKey(q.Difficulty);
            if (!cognitiveBreakdown.ContainsKey(level))
            {
                cognitiveBreakdown[level] = new DifficultyBreakdownDto { LevelKey = level, LevelName = level };
            }

            var stat = cognitiveBreakdown[level];
            stat.TotalQuestions++;

            var resp = responses.FirstOrDefault(r => r.QuestionId == q.Id);
            if (resp != null && resp.IsCorrect == true)
            {
                stat.CorrectCount++;
            }
        }

        foreach (var kvp in cognitiveBreakdown)
        {
            kvp.Value.AccuracyPercent = kvp.Value.TotalQuestions > 0
                ? Math.Round((double)kvp.Value.CorrectCount / kvp.Value.TotalQuestions * 100.0, 1)
                : 0.0;
        }

        // Chapter Breakdown
        var chapterBreakdown = new List<ChapterMasteryItemDto>();
        var questionsByChapter = questions.GroupBy(q => q.ChapterId ?? string.Empty);

        foreach (var chpGroup in questionsByChapter)
        {
            var chapter = chapters.FirstOrDefault(c => c.Id == chpGroup.Key);
            int chpTotal = chpGroup.Count();
            int chpCorrect = chpGroup.Count(q => responses.Any(r => r.QuestionId == q.Id && r.IsCorrect == true));

            chapterBreakdown.Add(new ChapterMasteryItemDto
            {
                ChapterId = chpGroup.Key,
                ChapterTitle = chapter?.Title ?? "Chương bổ trợ",
                OrderIndex = chapter?.OrderIndex ?? 99,
                TotalLessons = chpTotal,
                CompletedLessons = chpCorrect,
                AverageMasteryScore = chpTotal > 0 ? Math.Round((double)chpCorrect / chpTotal * 100.0, 1) : 0.0,
                Status = chpCorrect == chpTotal ? "completed" : "in_progress"
            });
        }

        // Mistake Topics & Recommended Lessons
        var mistakeQuestions = questions.Where(q => responses.Any(r => r.QuestionId == q.Id && r.IsCorrect != true)).ToList();
        var mistakeTopics = mistakeQuestions
            .Where(q => !string.IsNullOrWhiteSpace(q.Topic))
            .Select(q => q.Topic!)
            .Distinct()
            .ToList();

        var recommendedLessons = new List<RecommendedReviewItemDto>();
        foreach (var topic in mistakeTopics)
        {
            var matched = lessons.FirstOrDefault(l =>
                l.Title.Contains(topic, StringComparison.OrdinalIgnoreCase) ||
                (l.Topic != null && l.Topic.Title.Contains(topic, StringComparison.OrdinalIgnoreCase)));

            if (matched != null && !recommendedLessons.Any(r => r.LessonId == matched.Id))
            {
                var chp = chapters.FirstOrDefault(c => c.Id == matched.ChapterId);
                recommendedLessons.Add(new RecommendedReviewItemDto
                {
                    LessonId = matched.Id,
                    LessonTitle = matched.Title,
                    ChapterTitle = chp?.Title ?? "Toán 12",
                    Reason = $"Bạn có câu trả lời chưa chính xác trong chủ đề \"{topic}\"."
                });
            }
        }

        return new ExamReviewAnalyticsDto
        {
            SessionId = sessionId,
            SubjectId = attempt.SubjectId,
            ExamTitle = "Đề thi thử THPT Quốc gia - Toán 12",
            ScoreScaled = attempt.ScoreScaled ?? (totalQ > 0 ? Math.Round((double)correctCount / totalQ * 10.0, 2) : 0.0),
            ScoreRaw = correctCount,
            ScoreMax = totalQ,
            TotalQuestions = totalQ,
            CorrectCount = correctCount,
            IncorrectCount = incorrectCount,
            UnansweredCount = unansweredCount,
            TimeSpentSeconds = attempt.SessionTimeMs / 1000,
            CompletedAt = attempt.CompletedAt ?? attempt.LastActivityAt,
            ByCognitiveBreakdown = cognitiveBreakdown,
            ByChapterBreakdown = chapterBreakdown.OrderBy(c => c.OrderIndex).ToList(),
            MistakeTopics = mistakeTopics,
            RecommendedLessons = recommendedLessons
        };
    }

    private static string NormalizeDifficultyKey(string? difficulty)
    {
        var d = difficulty?.ToLowerInvariant().Trim() ?? "thong_hieu";
        return d switch
        {
            "easy" or "nhan_biet" => "nhan_biet",
            "medium" or "thong_hieu" => "thong_hieu",
            "hard" or "van_dung" => "van_dung",
            "very-hard" or "very_hard" or "van_dung_cao" => "van_dung_cao",
            _ => "thong_hieu"
        };
    }

    private static List<string> SafeDeserializeStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }
}