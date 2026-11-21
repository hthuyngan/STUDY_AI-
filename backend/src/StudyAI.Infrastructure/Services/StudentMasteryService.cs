using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Infrastructure.Services;

public class StudentMasteryService : IStudentMasteryService
{
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, SemaphoreSlim> AttemptLocks = new();
    private readonly IApplicationDbContext _context;
    private readonly ISubjectGradeResolver? _subjectResolver;
    private readonly ILogger<StudentMasteryService> _logger;

    public StudentMasteryService(
        IApplicationDbContext context,
        ILogger<StudentMasteryService> logger,
        ISubjectGradeResolver? subjectResolver = null)
    {
        _context = context;
        _logger = logger;
        _subjectResolver = subjectResolver;
    }

    public async Task<SkillMasteryResponseDto> GetStudentMasteryAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new SkillMasteryResponseDto
            {
                UserId = "guest",
                OverallMasteryScore = 0.0,
                SkillsEvaluated = 0,
                SkillsMastered = 0,
                Skills = new List<SkillMasteryItemDto>()
            };
        }

        // 1. Check existing records in persistent student_topic_mastery table
        var masteriesQuery = _context.StudentTopicMasteries
            .AsNoTracking()
            .Where(m => m.UserId == userId);

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            masteriesQuery = masteriesQuery.Where(m => m.SubjectId == subjectId);
        }

        var savedMasteries = await masteriesQuery.ToListAsync(cancellationToken);

        // If no records in persistent table yet, compute from completed AssessmentResponses
        if (savedMasteries.Count == 0)
        {
            await ComputeAndPersistAllMasteriesAsync(userId, subjectId, cancellationToken);
            savedMasteries = await masteriesQuery.ToListAsync(cancellationToken);
        }

        var skillItems = savedMasteries.Select(m => new SkillMasteryItemDto
        {
            SkillId = m.Id,
            SkillName = m.TopicName,
            SubjectId = m.SubjectId,
            MasteryScore = m.MasteryScore,
            Status = m.Status,
            TotalAttempted = m.AttemptCount,
            TotalCorrect = m.CorrectCount,
            LastAttemptAt = m.LastAttemptAt
        }).ToList();

        double overall = skillItems.Count > 0 ? Math.Round(skillItems.Average(s => s.MasteryScore), 1) : 0.0;
        int masteredCount = skillItems.Count(s => s.Status == "mastered");

        return new SkillMasteryResponseDto
        {
            UserId = userId,
            OverallMasteryScore = overall,
            SkillsEvaluated = skillItems.Count,
            SkillsMastered = masteredCount,
            Skills = skillItems
        };
    }

    public async Task<StudentKnowledgeProfileDto> GetStudentKnowledgeProfileAsync(
        string userId,
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        string effectiveSubjectId = subjectId ?? "";
        if (string.IsNullOrWhiteSpace(effectiveSubjectId) || effectiveSubjectId == "all")
        {
            if (!string.IsNullOrWhiteSpace(userId) && userId != "guest")
            {
                var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
                if (_subjectResolver != null)
                {
                    var resolved = await _subjectResolver.ResolveSubjectAsync(
                        requestedSubjectId: null,
                        userGrade: user?.Grade,
                        cancellationToken: cancellationToken);
                    if (resolved.Success && !string.IsNullOrEmpty(resolved.SubjectId))
                    {
                        effectiveSubjectId = resolved.SubjectId;
                    }
                }

                if (string.IsNullOrWhiteSpace(effectiveSubjectId))
                {
                    var studentSubject = await _context.StudentTopicMasteries.AsNoTracking()
                        .Where(m => m.UserId == userId && !string.IsNullOrEmpty(m.SubjectId))
                        .Select(m => m.SubjectId)
                        .FirstOrDefaultAsync(cancellationToken);
                    if (!string.IsNullOrEmpty(studentSubject))
                    {
                        effectiveSubjectId = studentSubject;
                    }
                }
            }
            if (string.IsNullOrWhiteSpace(effectiveSubjectId))
            {
                effectiveSubjectId = "sub_math10";
            }
        }

        var dynamicSubjectName = effectiveSubjectId == "sub_math10" ? "Toán học 10" : effectiveSubjectId == "sub_math11" ? "Toán học 11" : effectiveSubjectId == "sub_math12" ? "Toán học 12" : effectiveSubjectId;

        if (string.IsNullOrWhiteSpace(userId))
        {
            return new StudentKnowledgeProfileDto
            {
                UserId = "guest",
                SubjectId = effectiveSubjectId,
                SubjectName = dynamicSubjectName,
                ScoringExplanation = GetScoringExplanation()
            };
        }

        // 1. Ensure masteries are persisted or calculated
        var masteriesQuery = _context.StudentTopicMasteries
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.SubjectId == effectiveSubjectId);

        var savedMasteries = await masteriesQuery.ToListAsync(cancellationToken);
        if (savedMasteries.Count == 0)
        {
            await ComputeAndPersistAllMasteriesAsync(userId, effectiveSubjectId, cancellationToken);
            savedMasteries = await masteriesQuery.ToListAsync(cancellationToken);
        }

        // 2. Fetch completed attempts and responses for verified statistics
        var completedAttempts = await _context.AssessmentAttempts
            .AsNoTracking()
            .Include(a => a.Responses)
            .Where(a => a.UserId == userId &&
                        (a.SubjectId == effectiveSubjectId || a.SubjectId == null) &&
                        a.CompletionStatus == "completed")
            .OrderByDescending(a => a.CompletedAt ?? a.LastActivityAt)
            .ToListAsync(cancellationToken);

        int totalSessions = completedAttempts.Count;
        int totalQuestions = completedAttempts.Sum(a => a.Responses.Count);
        int totalCorrect = completedAttempts.Sum(a => a.Responses.Count(r => r.IsCorrect == true));
        int totalIncorrect = Math.Max(0, totalQuestions - totalCorrect);
        int totalTimeSpent = completedAttempts.Sum(a => a.SessionTimeMs) / 1000;
        double overallAccuracy = totalQuestions > 0
            ? Math.Round((double)totalCorrect / totalQuestions * 100.0, 1)
            : 0.0;

        // 3. Difficulty Breakdown from verified responses
        var questionIds = completedAttempts.SelectMany(a => a.Responses.Select(r => r.QuestionId)).Distinct().ToList();
        var questionsMap = await _context.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, cancellationToken);

        var difficultyStats = InitializeDifficultyBreakdown();
        foreach (var attempt in completedAttempts)
        {
            foreach (var resp in attempt.Responses)
            {
                if (!questionsMap.TryGetValue(resp.QuestionId, out var q)) continue;
                var rawDiff = q.Difficulty?.ToLowerInvariant() ?? "thong_hieu";
                var key = NormalizeDifficultyKey(rawDiff);
                if (difficultyStats.TryGetValue(key, out var stat))
                {
                    stat.TotalQuestions++;
                    if (resp.IsCorrect == true) stat.CorrectCount++;
                }
            }
        }
        foreach (var stat in difficultyStats.Values)
        {
            stat.AccuracyPercent = stat.TotalQuestions > 0
                ? Math.Round((double)stat.CorrectCount / stat.TotalQuestions * 100.0, 1)
                : 0.0;
        }

        // 4. Curriculum / Lesson Progress
        var allLessons = await _context.ContentLessons.AsNoTracking()
            .Include(l => l.Chapter)
            .Where(l => l.Chapter != null && l.Chapter.SubjectId == effectiveSubjectId && l.Status == "published")
            .ToListAsync(cancellationToken);

        var lessonProgresses = await _context.LessonProgresses.AsNoTracking()
            .Where(p => p.UserId == userId && p.SubjectId == effectiveSubjectId)
            .ToListAsync(cancellationToken);

        int totalLessonsCount = allLessons.Count;
        int completedLessonsCount = lessonProgresses.Count(p => p.OverallProgress >= 100 || p.ContentProgress >= 100);
        double curriculumProgress = totalLessonsCount > 0
            ? Math.Round((double)completedLessonsCount / totalLessonsCount * 100.0, 1)
            : 0.0;

        // 5. Map Topic Masteries
        var topicDetails = savedMasteries.Select(m =>
        {
            var matchedLessons = allLessons
                .Where(l => l.Title.Contains(m.TopicName, StringComparison.OrdinalIgnoreCase) ||
                            (l.Topic != null && l.Topic.Title.Contains(m.TopicName, StringComparison.OrdinalIgnoreCase)))
                .Select(l => l.Id)
                .ToList();

            return new TopicMasteryDetailDto
            {
                TopicId = m.Id,
                TopicName = m.TopicName,
                SubjectId = m.SubjectId,
                AttemptCount = m.AttemptCount,
                CorrectCount = m.CorrectCount,
                HintCount = m.HintCount,
                MasteryScore = m.MasteryScore,
                Status = m.Status,
                StatusLabel = GetStatusVietnameseLabel(m.Status),
                LastAttemptAt = m.LastAttemptAt,
                RecommendedLessonIds = matchedLessons
            };
        }).OrderBy(t => t.MasteryScore).ToList();

        var weakTopics = topicDetails
            .Where(t => t.Status == "needs_reinforcement" || (t.Status == "progressing" && t.MasteryScore < 60))
            .ToList();

        var masteredTopics = topicDetails
            .Where(t => t.Status == "mastered" || (t.Status == "proficient" && t.MasteryScore >= 80))
            .ToList();

        // 6. Overall Score and Status
        double overallScore = topicDetails.Count > 0
            ? Math.Round(topicDetails.Average(t => t.MasteryScore), 1)
            : overallAccuracy;

        string overallStatus;
        if (totalQuestions < 5)
        {
            overallStatus = "insufficient_data";
        }
        else if (overallScore >= 90.0)
        {
            overallStatus = "mastered";
        }
        else if (overallScore >= 70.0)
        {
            overallStatus = "proficient";
        }
        else if (overallScore >= 50.0)
        {
            overallStatus = "progressing";
        }
        else
        {
            overallStatus = "needs_reinforcement";
        }

        // 7. Recent Sessions (last 5)
        var recentSessions = completedAttempts.Take(5).Select(a => new RecentSessionSummaryDto
        {
            SessionId = a.Id,
            Mode = a.AssessmentId == "asmt_exam" ? "Thi thử THPT" : "Luyện tập",
            CompletedAt = a.CompletedAt ?? a.LastActivityAt,
            TotalQuestions = a.Responses.Count,
            CorrectCount = a.Responses.Count(r => r.IsCorrect == true),
            ScoreScaled = a.ScoreScaled ?? 0.0,
            TimeSpentSeconds = a.SessionTimeMs / 1000
        }).ToList();

        return new StudentKnowledgeProfileDto
        {
            UserId = userId,
            SubjectId = effectiveSubjectId,
            SubjectName = "Toán học 12",
            OverallMasteryScore = overallScore,
            OverallStatus = overallStatus,
            OverallStatusLabel = GetStatusVietnameseLabel(overallStatus),
            TotalQuestionsAttempted = totalQuestions,
            TotalCorrect = totalCorrect,
            TotalIncorrect = totalIncorrect,
            OverallAccuracyPercent = overallAccuracy,
            TotalTimeSpentSeconds = totalTimeSpent,
            TotalSessionsCompleted = totalSessions,
            LessonsCompletedCount = completedLessonsCount,
            TotalLessonsCount = totalLessonsCount,
            CurriculumProgressPercent = curriculumProgress,
            DifficultyBreakdown = difficultyStats,
            TopicMasteries = topicDetails,
            WeakTopics = weakTopics,
            MasteredTopics = masteredTopics,
            RecentSessions = recentSessions,
            ScoringExplanation = GetScoringExplanation()
        };
    }

    private static Dictionary<string, DifficultyBreakdownDto> InitializeDifficultyBreakdown()
    {
        return new Dictionary<string, DifficultyBreakdownDto>
        {
            ["nhan_biet"] = new() { LevelKey = "nhan_biet", LevelName = "Nhận biết", TotalQuestions = 0, CorrectCount = 0, AccuracyPercent = 0.0 },
            ["thong_hieu"] = new() { LevelKey = "thong_hieu", LevelName = "Thông hiểu", TotalQuestions = 0, CorrectCount = 0, AccuracyPercent = 0.0 },
            ["van_dung"] = new() { LevelKey = "van_dung", LevelName = "Vận dụng", TotalQuestions = 0, CorrectCount = 0, AccuracyPercent = 0.0 },
            ["van_dung_cao"] = new() { LevelKey = "van_dung_cao", LevelName = "Vận dụng cao", TotalQuestions = 0, CorrectCount = 0, AccuracyPercent = 0.0 }
        };
    }

    private static string NormalizeDifficultyKey(string raw)
    {
        return raw switch
        {
            "easy" or "nhan_biet" => "nhan_biet",
            "medium" or "thong_hieu" => "thong_hieu",
            "hard" or "van_dung" => "van_dung",
            "very_hard" or "very-hard" or "van_dung_cao" => "van_dung_cao",
            _ => "thong_hieu"
        };
    }

    public static string GetStatusVietnameseLabel(string status)
    {
        return status switch
        {
            "mastered" => "Thành thạo",
            "proficient" => "Đạt yêu cầu",
            "progressing" => "Cần củng cố",
            "needs_reinforcement" => "Chưa nắm vững",
            "insufficient_data" => "Chưa đủ dữ liệu",
            _ => "Chưa đủ dữ liệu"
        };
    }

    public static string GetScoringExplanation()
    {
        return "Điểm năng lực (Mastery Score) được tính dựa trên tỷ lệ làm đúng trên số lượt câu hỏi thực tế của từng dạng bài, có tính toán hệ số giảm nhẹ khi sử dụng gợi ý (tối đa 15%) và yêu cầu tối thiểu 3 câu để xác định mức độ tin cậy. Phân loại 4 cấp độ: Chưa nắm vững (<50%), Cần củng cố (50-69%), Đạt yêu cầu (70-89%) và Thành thạo (≥90% với ≥5 câu).";
    }

    public async Task UpdateMasteryFromAttemptAsync(
        string userId,
        string attemptId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(attemptId)) return;

        var attemptLock = AttemptLocks.GetOrAdd(attemptId, _ => new SemaphoreSlim(1, 1));
        await attemptLock.WaitAsync(cancellationToken);
        try
        {
            await ProcessAttemptMasteryInternalAsync(userId, attemptId, cancellationToken);
        }
        finally
        {
            attemptLock.Release();
            if (attemptLock.CurrentCount == 1)
            {
                AttemptLocks.TryRemove(attemptId, out _);
            }
        }
    }

    private async Task ProcessAttemptMasteryInternalAsync(
        string userId,
        string attemptId,
        CancellationToken cancellationToken)
    {
        // Fetch attempt with tracking to allow atomic idempotency flag update
        var attempt = await _context.AssessmentAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == attemptId, cancellationToken);

        if (attempt == null || attempt.Responses.Count == 0) return;

        // 1. User Isolation Guard: Prevent updating mastery of the wrong user
        if (!string.Equals(attempt.UserId, userId, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException($"Attempt '{attemptId}' does not belong to user '{userId}'.");
        }

        // 2. Status & Scoring Guard: Only completed, graded attempts can contribute to student mastery
        if (attempt.CompletionStatus != "completed" || !attempt.ScoreScaled.HasValue)
        {
            _logger.LogWarning("Attempt {AttemptId} is not completed or scored. Status: {Status}", attemptId, attempt.CompletionStatus);
            return;
        }

        // 3. Idempotency Guard: Check if this attempt has already been processed for mastery
        JsonObject suspendNode;
        try
        {
            suspendNode = !string.IsNullOrWhiteSpace(attempt.SuspendDataJson)
                ? (JsonNode.Parse(attempt.SuspendDataJson) as JsonObject ?? new JsonObject())
                : new JsonObject();
        }
        catch
        {
            suspendNode = new JsonObject();
        }

        if (suspendNode["masteryProcessed"]?.GetValue<bool>() == true)
        {
            _logger.LogInformation("Attempt {AttemptId} has already been processed for mastery. Skipping idempotent update.", attemptId);
            return;
        }

        var questionIds = attempt.Responses.Select(r => r.QuestionId).Distinct().ToList();
        var questions = await _context.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, cancellationToken);

        var subjectId = attempt.SubjectId;
        if (string.IsNullOrWhiteSpace(subjectId))
        {
            var firstWithSub = questions.Values.FirstOrDefault(q => !string.IsNullOrWhiteSpace(q.SubjectId));
            if (firstWithSub != null)
            {
                subjectId = firstWithSub.SubjectId;
            }
            else
            {
                var student = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
                var g = student?.Grade?.Trim();
                if (!string.IsNullOrWhiteSpace(g))
                {
                    subjectId = await _context.ContentSubjects.AsNoTracking()
                        .Where(s => s.IsActive && s.Grade == g)
                        .OrderBy(s => s.OrderIndex)
                        .Select(s => s.Id)
                        .FirstOrDefaultAsync(cancellationToken);
                }
            }
        }

        if (string.IsNullOrWhiteSpace(subjectId))
        {
            _logger.LogWarning(
                "Cannot update mastery for attempt {AttemptId}: no subject is linked to the attempt, its questions, or the student's grade.",
                attemptId);
            return;
        }

        // Group responses by Topic
        var groupedResponses = attempt.Responses
            .GroupBy(r => questions.TryGetValue(r.QuestionId, out var q) && !string.IsNullOrWhiteSpace(q.Topic)
                ? q.Topic
                : "Kiến thức trọng tâm");

        foreach (var group in groupedResponses)
        {
            var topicName = group.Key;
            var groupQuestionIds = group.Select(r => r.QuestionId).ToList();

            // 4. Scoped Hint Counting: ONLY count hints used in THIS specific attempt session
            int hintCount = await _context.AiHintUsages
                .CountAsync(h => h.UserId == userId && h.SessionId == attemptId && groupQuestionIds.Contains(h.QuestionId), cancellationToken);

            var existing = await _context.StudentTopicMasteries
                .FirstOrDefaultAsync(m => m.UserId == userId && m.SubjectId == subjectId && m.TopicName == topicName, cancellationToken);

            int totalAttempt = group.Count();
            int totalCorrect = group.Count(r => r.IsCorrect == true);

            if (existing != null)
            {
                existing.AttemptCount += totalAttempt;
                existing.CorrectCount += totalCorrect;
                existing.HintCount += hintCount;
                existing.LastAttemptAt = DateTimeOffset.UtcNow;
                existing.UpdatedAt = DateTimeOffset.UtcNow;

                var (score, status) = CalculateScoreAndStatus(existing.AttemptCount, existing.CorrectCount, existing.HintCount);
                existing.MasteryScore = score;
                existing.Status = status;
            }
            else
            {
                var (score, status) = CalculateScoreAndStatus(totalAttempt, totalCorrect, hintCount);
                var newMastery = new StudentTopicMastery
                {
                    Id = $"mst_{Guid.NewGuid():N}",
                    UserId = userId,
                    SubjectId = subjectId,
                    TopicName = topicName,
                    AttemptCount = totalAttempt,
                    CorrectCount = totalCorrect,
                    HintCount = hintCount,
                    MasteryScore = score,
                    Status = status,
                    LastAttemptAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.StudentTopicMasteries.Add(newMastery);
            }
        }

        // 5. Mark attempt as processed to guarantee strict idempotency
        suspendNode["masteryProcessed"] = true;
        attempt.SuspendDataJson = suspendNode.ToJsonString();

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task ComputeAndPersistAllMasteriesAsync(
        string userId,
        string? subjectId,
        CancellationToken cancellationToken)
    {
        // Only include completed and graded attempts
        var responsesQuery = _context.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == userId && r.Attempt.CompletionStatus == "completed");

        var responses = await responsesQuery.ToListAsync(cancellationToken);
        if (responses.Count == 0) return;

        var questionIds = responses.Select(r => r.QuestionId).Distinct().ToList();
        var questions = await _context.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, cancellationToken);

        var requestedSubjectId = !string.IsNullOrWhiteSpace(subjectId) && subjectId != "all"
            ? subjectId
            : null;

        string? gradeSubjectId = null;
        if (responses.Any(r => string.IsNullOrWhiteSpace(r.Attempt?.SubjectId)) || requestedSubjectId == null)
        {
            var student = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            var g = student?.Grade?.Trim();
            if (!string.IsNullOrWhiteSpace(g))
            {
                gradeSubjectId = await _context.ContentSubjects.AsNoTracking()
                    .Where(s => s.IsActive && s.Grade == g)
                    .OrderBy(s => s.OrderIndex)
                    .Select(s => s.Id)
                    .FirstOrDefaultAsync(cancellationToken);
            }
        }

        var resolvedResponses = responses
            .Select(response =>
            {
                questions.TryGetValue(response.QuestionId, out var question);
                var resolvedSubjectId = !string.IsNullOrWhiteSpace(response.Attempt?.SubjectId)
                    ? response.Attempt.SubjectId
                    : !string.IsNullOrWhiteSpace(question?.SubjectId)
                        ? question.SubjectId
                        : gradeSubjectId;
                var topicName = !string.IsNullOrWhiteSpace(question?.Topic)
                    ? question.Topic
                    : "Kiến thức trọng tâm";

                return new { Response = response, SubjectId = resolvedSubjectId, TopicName = topicName };
            })
            .Where(item => !string.IsNullOrWhiteSpace(item.SubjectId))
            .Where(item => requestedSubjectId == null || item.SubjectId == requestedSubjectId)
            .ToList();

        if (resolvedResponses.Count == 0)
        {
            _logger.LogWarning(
                "Cannot compute mastery for user {UserId} and subject {SubjectId}: no matching subject could be resolved from attempts, questions, or grade.",
                userId,
                requestedSubjectId ?? "all");
            return;
        }

        var groups = resolvedResponses.GroupBy(item => new
        {
            SubjectId = item.SubjectId!,
            item.TopicName
        });

        foreach (var group in groups)
        {
            var groupQuestionIds = group.Select(item => item.Response.QuestionId).Distinct().ToList();
            var completedAttemptIds = group.Select(item => item.Response.AttemptId).Distinct().ToList();

            // Count hints strictly scoped to these completed attempts
            int hintCount = await _context.AiHintUsages
                .CountAsync(h => h.UserId == userId && h.SessionId != null && completedAttemptIds.Contains(h.SessionId) && groupQuestionIds.Contains(h.QuestionId), cancellationToken);

            int total = group.Count();
            int correct = group.Count(item => item.Response.IsCorrect == true);

            var (score, status) = CalculateScoreAndStatus(total, correct, hintCount);

            var entry = new StudentTopicMastery
            {
                Id = $"mst_{Guid.NewGuid():N}",
                UserId = userId,
                SubjectId = group.Key.SubjectId,
                TopicName = group.Key.TopicName,
                AttemptCount = total,
                CorrectCount = correct,
                HintCount = hintCount,
                MasteryScore = score,
                Status = status,
                LastAttemptAt = group.Max(item => item.Response.LastAnsweredAt ?? item.Response.FirstAnsweredAt) ?? DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _context.StudentTopicMasteries.Add(entry);
        }

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi lưu bảng năng lực mastery ban đầu: {Message}", ex.Message);
        }
    }

    public static (double Score, string Status) CalculateScoreAndStatus(int attemptCount, int correctCount, int hintCount)
    {
        if (attemptCount < 3)
        {
            double baseScore = attemptCount > 0 ? Math.Round((double)correctCount / attemptCount * 100.0, 1) : 0.0;
            return (baseScore, "insufficient_data");
        }

        double accuracy = (double)correctCount / attemptCount * 100.0;
        // Minor penalty for over-reliance on hints (max 15% deduction)
        double hintPenalty = Math.Min(15.0, (double)hintCount / attemptCount * 5.0);
        double finalScore = Math.Clamp(Math.Round(accuracy - hintPenalty, 1), 0.0, 100.0);

        string status;
        if (finalScore >= 90.0 && attemptCount >= 5)
        {
            status = "mastered";
        }
        else if (finalScore >= 70.0)
        {
            status = "proficient";
        }
        else if (finalScore >= 50.0)
        {
            status = "progressing";
        }
        else
        {
            status = "needs_reinforcement";
        }

        return (finalScore, status);
    }
}
