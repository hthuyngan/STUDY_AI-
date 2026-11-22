using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Learner.Progress;

public class LearnerProgressService : ILearnerProgressService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;

    public LearnerProgressService(IApplicationDbContext db, IClock clock)
    {
        _db = db;
        _clock = clock;
    }

    private static bool CanAccess(string requestingUserId, string targetUserId, bool isAdmin) =>
        isAdmin || string.Equals(requestingUserId, targetUserId, StringComparison.OrdinalIgnoreCase);

    public async Task<List<LessonProgressResponseDto>> ListUserProgressAsync(
        string requestingUserId,
        string targetUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        if (!CanAccess(requestingUserId, targetUserId, isAdmin))
            throw new ForbiddenException("Bạn không có quyền xem tiến độ học tập của người dùng này.");

        var list = await _db.LessonProgresses
            .Where(p => p.UserId == targetUserId)
            .OrderByDescending(p => p.UpdatedAt)
            .ToListAsync(cancellationToken);

        return list.Select(FormatLessonProgress).ToList();
    }

    public async Task<LessonProgressResponseDto> GetSingleProgressAsync(
        string requestingUserId,
        string targetUserId,
        bool isAdmin,
        string lessonId,
        CancellationToken cancellationToken = default)
    {
        if (!CanAccess(requestingUserId, targetUserId, isAdmin))
            throw new ForbiddenException("Bạn không có quyền xem tiến độ học tập của người dùng này.");

        var progress = await _db.LessonProgresses
            .FirstOrDefaultAsync(p => p.UserId == targetUserId && p.LessonId == lessonId, cancellationToken);

        if (progress == null)
            throw new NotFoundException($"Lesson progress for '{lessonId}' not found");

        return FormatLessonProgress(progress);
    }

    public async Task<LessonProgressResponseDto> PutLessonProgressAsync(
        string requestingUserId,
        string targetUserId,
        bool isAdmin,
        string lessonId,
        LessonProgressCreateOrUpdateDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!CanAccess(requestingUserId, targetUserId, isAdmin))
            throw new ForbiddenException("Bạn không có quyền cập nhật tiến độ học tập của người dùng này.");

        var progress = await _db.LessonProgresses
            .FirstOrDefaultAsync(p => p.UserId == targetUserId && p.LessonId == lessonId, cancellationToken);

        var now = _clock.UtcNow;

        if (progress == null)
        {
            progress = new LessonProgress
            {
                UserId = targetUserId,
                LessonId = lessonId,
                SubjectId = dto.SubjectId,
                ContentProgress = dto.ContentProgress,
                OverallProgress = dto.OverallProgress,
                AssessmentStatus = dto.AssessmentStatus,
                AssessmentAttemptId = dto.AssessmentAttemptId,
                AssessmentScore = dto.AssessmentScore,
                CompletedSectionIdsJson = JsonSerializer.Serialize(dto.CompletedSectionIds ?? new List<string>()),
                UpdatedAt = now
            };
            _db.LessonProgresses.Add(progress);
        }
        else
        {
            progress.SubjectId = string.IsNullOrEmpty(dto.SubjectId) ? progress.SubjectId : dto.SubjectId;
            progress.ContentProgress = dto.ContentProgress;
            progress.OverallProgress = dto.OverallProgress;
            progress.AssessmentStatus = dto.AssessmentStatus;
            progress.AssessmentAttemptId = dto.AssessmentAttemptId;
            progress.AssessmentScore = dto.AssessmentScore;
            progress.CompletedSectionIdsJson = JsonSerializer.Serialize(dto.CompletedSectionIds ?? new List<string>());
            progress.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return FormatLessonProgress(progress);
    }

    private static LessonProgressResponseDto FormatLessonProgress(LessonProgress p)
    {
        List<string> completedSectionIds;
        try
        {
            completedSectionIds = JsonSerializer.Deserialize<List<string>>(p.CompletedSectionIdsJson) ?? new List<string>();
        }
        catch
        {
            completedSectionIds = new List<string>();
        }

        return new LessonProgressResponseDto
        {
            UserId = p.UserId,
            LessonId = p.LessonId,
            SubjectId = p.SubjectId,
            ContentProgress = p.ContentProgress,
            OverallProgress = p.OverallProgress,
            AssessmentStatus = p.AssessmentStatus,
            AssessmentAttemptId = p.AssessmentAttemptId,
            AssessmentScore = p.AssessmentScore,
            CompletedSectionIds = completedSectionIds,
            UpdatedAt = p.UpdatedAt
        };
    }
}
