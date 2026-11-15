using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Infrastructure.Services;

public class StudentMasteryService : IStudentMasteryService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<StudentMasteryService> _logger;

    public StudentMasteryService(
        IApplicationDbContext context,
        ILogger<StudentMasteryService> logger)
    {
        _context = context;
        _logger = logger;
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

        // 1. Check existing records in student_topic_mastery
        var masteriesQuery = _context.StudentTopicMasteries
            .AsNoTracking()
            .Where(m => m.UserId == userId);

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            masteriesQuery = masteriesQuery.Where(m => m.SubjectId == subjectId);
        }

        var savedMasteries = await masteriesQuery.ToListAsync(cancellationToken);

        // If no records in persistent table yet, compute from AssessmentResponses
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

    public async Task UpdateMasteryFromAttemptAsync(
        string userId,
        string attemptId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(attemptId)) return;

        var attempt = await _context.AssessmentAttempts
            .AsNoTracking()
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == attemptId, cancellationToken);

        if (attempt == null || attempt.Responses.Count == 0) return;

        var questionIds = attempt.Responses.Select(r => r.QuestionId).Distinct().ToList();
        var questions = await _context.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, cancellationToken);

        var subjectId = attempt.SubjectId ?? "sub_math12";

        // Group responses by Topic
        var groupedResponses = attempt.Responses
            .GroupBy(r => questions.TryGetValue(r.QuestionId, out var q) && !string.IsNullOrWhiteSpace(q.Topic)
                ? q.Topic
                : "Kiến thức trọng tâm");

        foreach (var group in groupedResponses)
        {
            var topicName = group.Key;
            var groupQuestionIds = group.Select(r => r.QuestionId).ToList();

            // Count hint usage for this student & these questions
            int hintCount = await _context.AiHintUsages
                .CountAsync(h => h.UserId == userId && groupQuestionIds.Contains(h.QuestionId), cancellationToken);

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

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task ComputeAndPersistAllMasteriesAsync(
        string userId,
        string? subjectId,
        CancellationToken cancellationToken)
    {
        var responsesQuery = _context.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == userId);

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            responsesQuery = responsesQuery.Where(r => r.Attempt!.SubjectId == subjectId);
        }

        var responses = await responsesQuery.ToListAsync(cancellationToken);
        if (responses.Count == 0) return;

        var questionIds = responses.Select(r => r.QuestionId).Distinct().ToList();
        var questions = await _context.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, cancellationToken);

        var effectiveSubjectId = subjectId ?? "sub_math12";

        var groups = responses
            .GroupBy(r => questions.TryGetValue(r.QuestionId, out var q) && !string.IsNullOrWhiteSpace(q.Topic)
                ? q.Topic
                : "Kiến thức trọng tâm");

        foreach (var group in groups)
        {
            var topicName = group.Key;
            var groupQuestionIds = group.Select(r => r.QuestionId).ToList();

            int hintCount = await _context.AiHintUsages
                .CountAsync(h => h.UserId == userId && groupQuestionIds.Contains(h.QuestionId), cancellationToken);

            int total = group.Count();
            int correct = group.Count(r => r.IsCorrect == true);

            var (score, status) = CalculateScoreAndStatus(total, correct, hintCount);

            var entry = new StudentTopicMastery
            {
                Id = $"mst_{Guid.NewGuid():N}",
                UserId = userId,
                SubjectId = effectiveSubjectId,
                TopicName = topicName,
                AttemptCount = total,
                CorrectCount = correct,
                HintCount = hintCount,
                MasteryScore = score,
                Status = status,
                LastAttemptAt = responses.Max(r => r.LastAnsweredAt ?? r.FirstAnsweredAt) ?? DateTimeOffset.UtcNow,
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

    private static (double Score, string Status) CalculateScoreAndStatus(int attemptCount, int correctCount, int hintCount)
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
