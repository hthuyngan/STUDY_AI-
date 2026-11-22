using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Learner.Assessments;

public class LearnerAssessmentService : ILearnerAssessmentService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public LearnerAssessmentService(IApplicationDbContext db, IClock clock, IIdGenerator idGenerator)
    {
        _db = db;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    private static bool CanAccess(string requestingUserId, string targetUserId, bool isAdmin) =>
        isAdmin || string.Equals(requestingUserId, targetUserId, StringComparison.OrdinalIgnoreCase);

    public async Task<List<AssessmentAttemptResponseDto>> ListAttemptsAsync(
        string requestingUserId,
        string targetUserId,
        bool isAdmin,
        string? lessonId = null,
        CancellationToken cancellationToken = default)
    {
        if (!CanAccess(requestingUserId, targetUserId, isAdmin))
            throw new ForbiddenException("Bạn không có quyền truy cập dữ liệu làm bài của người dùng này.");

        var query = _db.AssessmentAttempts
            .Include(a => a.Responses)
            .Where(a => a.UserId == targetUserId);

        if (!string.IsNullOrEmpty(lessonId))
        {
            query = query.Where(a => a.LessonId == lessonId);
        }

        var list = await query.OrderByDescending(a => a.StartedAt).ToListAsync(cancellationToken);
        return list.Select(FormatAttempt).ToList();
    }

    public async Task<AssessmentAttemptResponseDto> GetSingleAttemptAsync(
        string requestingUserId,
        string targetUserId,
        bool isAdmin,
        string attemptId,
        CancellationToken cancellationToken = default)
    {
        if (!CanAccess(requestingUserId, targetUserId, isAdmin))
            throw new ForbiddenException("Bạn không có quyền truy cập dữ liệu làm bài của người dùng này.");

        var attempt = await _db.AssessmentAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.UserId == targetUserId && a.Id == attemptId, cancellationToken);

        if (attempt == null)
            throw new NotFoundException($"Assessment attempt '{attemptId}' not found");

        return FormatAttempt(attempt);
    }

    public async Task<AssessmentAttemptResponseDto> CreateAttemptAsync(
        string requestingUserId,
        string targetUserId,
        bool isAdmin,
        AssessmentAttemptCreateDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!CanAccess(requestingUserId, targetUserId, isAdmin))
            throw new ForbiddenException("Bạn không có quyền tạo phiên làm bài cho người dùng này.");

        var attempt = await SaveAttemptInternal(targetUserId, dto, cancellationToken);
        return FormatAttempt(attempt);
    }

    public async Task<AssessmentAttemptResponseDto> UpdateAttemptAsync(
        string requestingUserId,
        string targetUserId,
        bool isAdmin,
        string attemptId,
        AssessmentAttemptCreateDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!CanAccess(requestingUserId, targetUserId, isAdmin))
            throw new ForbiddenException("Bạn không có quyền cập nhật phiên làm bài của người dùng này.");

        dto.Id = attemptId;
        var attempt = await SaveAttemptInternal(targetUserId, dto, cancellationToken);
        return FormatAttempt(attempt);
    }

    private async Task<AssessmentAttempt> SaveAttemptInternal(string userId, AssessmentAttemptCreateDto dto, CancellationToken cancellationToken)
    {
        var id = string.IsNullOrEmpty(dto.Id) ? $"att_{Guid.NewGuid():N}" : dto.Id;
        var attempt = await _db.AssessmentAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.UserId == userId && a.Id == id, cancellationToken);

        var now = _clock.UtcNow;

        if (attempt == null)
        {
            attempt = new AssessmentAttempt
            {
                Id = id,
                UserId = userId,
                AssessmentId = dto.AssessmentId,
                LessonId = dto.LessonId,
                SubjectId = dto.SubjectId,
                AttemptNumber = dto.AttemptNumber,
                StartedAt = dto.StartedAt == default ? now : dto.StartedAt,
                LastActivityAt = dto.LastActivityAt == default ? now : dto.LastActivityAt,
                CompletedAt = dto.CompletedAt,
                CompletionStatus = dto.CompletionStatus ?? "incomplete",
                SuccessStatus = dto.SuccessStatus ?? "unknown",
                ProgressMeasure = dto.ProgressMeasure,
                ScoreRaw = dto.ScoreRaw,
                ScoreMin = dto.ScoreMin,
                ScoreMax = dto.ScoreMax,
                ScoreScaled = dto.ScoreScaled,
                SessionTimeMs = dto.SessionTimeMs,
                CurrentQuestionId = dto.CurrentQuestionId,
                ExitReason = dto.ExitReason,
                SuspendDataJson = dto.SuspendData?.ToJsonString(),
                SchemaVersion = dto.SchemaVersion
            };
            _db.AssessmentAttempts.Add(attempt);
        }
        else
        {
            if (attempt.CompletionStatus == "completed")
            {
                throw new ConflictException("Phiên làm bài đã hoàn thành không thể chỉnh sửa.");
            }

            if (!string.IsNullOrEmpty(attempt.LessonId) && !string.IsNullOrEmpty(dto.LessonId) && attempt.LessonId != dto.LessonId)
            {
                throw new ConflictException($"Không thể thay đổi bài học của phiên làm bài từ '{attempt.LessonId}' sang '{dto.LessonId}'.");
            }

            if (!string.IsNullOrEmpty(attempt.SubjectId) && !string.IsNullOrEmpty(dto.SubjectId) && attempt.SubjectId != dto.SubjectId)
            {
                throw new ConflictException($"Không thể thay đổi môn học của phiên làm bài từ '{attempt.SubjectId}' sang '{dto.SubjectId}'.");
            }

            if (string.IsNullOrEmpty(attempt.LessonId) && !string.IsNullOrEmpty(dto.LessonId)) attempt.LessonId = dto.LessonId;
            if (string.IsNullOrEmpty(attempt.SubjectId) && !string.IsNullOrEmpty(dto.SubjectId)) attempt.SubjectId = dto.SubjectId;
            if (string.IsNullOrEmpty(attempt.AssessmentId) && !string.IsNullOrEmpty(dto.AssessmentId)) attempt.AssessmentId = dto.AssessmentId;

            attempt.LastActivityAt = dto.LastActivityAt == default ? now : dto.LastActivityAt;
            attempt.CompletedAt = dto.CompletedAt ?? attempt.CompletedAt;
            attempt.CompletionStatus = dto.CompletionStatus ?? attempt.CompletionStatus;
            attempt.SuccessStatus = dto.SuccessStatus ?? attempt.SuccessStatus;
            attempt.ProgressMeasure = dto.ProgressMeasure;
            attempt.ScoreRaw = dto.ScoreRaw ?? attempt.ScoreRaw;
            attempt.ScoreMin = dto.ScoreMin;
            attempt.ScoreMax = dto.ScoreMax;
            attempt.ScoreScaled = dto.ScoreScaled ?? attempt.ScoreScaled;
            attempt.SessionTimeMs = dto.SessionTimeMs;
            attempt.CurrentQuestionId = dto.CurrentQuestionId ?? attempt.CurrentQuestionId;
            attempt.ExitReason = dto.ExitReason ?? attempt.ExitReason;
            attempt.SuspendDataJson = dto.SuspendData?.ToJsonString() ?? attempt.SuspendDataJson;
        }

        if (dto.Responses != null)
        {
            foreach (var (qId, rDto) in dto.Responses)
            {
                var resp = attempt.Responses.FirstOrDefault(r => r.QuestionId == qId);
                if (resp == null)
                {
                    resp = new AssessmentResponse
                    {
                        AttemptId = attempt.Id,
                        QuestionId = qId,
                        SelectedOptionIdsJson = JsonSerializer.Serialize(rDto.SelectedOptionIds ?? new List<string>()),
                        FirstAnsweredAt = rDto.FirstAnsweredAt,
                        LastAnsweredAt = rDto.LastAnsweredAt,
                        ChangeCount = rDto.ChangeCount,
                        TimeSpentMs = rDto.TimeSpentMs,
                        IsCorrect = rDto.IsCorrect
                    };
                    attempt.Responses.Add(resp);
                }
                else
                {
                    resp.SelectedOptionIdsJson = JsonSerializer.Serialize(rDto.SelectedOptionIds ?? new List<string>());
                    resp.FirstAnsweredAt = rDto.FirstAnsweredAt ?? resp.FirstAnsweredAt;
                    resp.LastAnsweredAt = rDto.LastAnsweredAt ?? resp.LastAnsweredAt;
                    resp.ChangeCount = rDto.ChangeCount;
                    resp.TimeSpentMs = rDto.TimeSpentMs;
                    resp.IsCorrect = rDto.IsCorrect ?? resp.IsCorrect;
                }
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return attempt;
    }

    private static AssessmentAttemptResponseDto FormatAttempt(AssessmentAttempt a)
    {
        var respDict = new Dictionary<string, AssessmentResponseItemDto>();
        foreach (var r in a.Responses ?? new List<AssessmentResponse>())
        {
            List<string> options;
            try { options = JsonSerializer.Deserialize<List<string>>(r.SelectedOptionIdsJson) ?? new List<string>(); } catch { options = new List<string>(); }

            respDict[r.QuestionId] = new AssessmentResponseItemDto
            {
                QuestionId = r.QuestionId,
                SelectedOptionIds = options,
                FirstAnsweredAt = r.FirstAnsweredAt,
                LastAnsweredAt = r.LastAnsweredAt,
                ChangeCount = r.ChangeCount,
                TimeSpentMs = r.TimeSpentMs,
                IsCorrect = r.IsCorrect
            };
        }

        JsonNode? suspendNode = null;
        if (!string.IsNullOrEmpty(a.SuspendDataJson))
        {
            try { suspendNode = JsonNode.Parse(a.SuspendDataJson); } catch { }
        }

        return new AssessmentAttemptResponseDto
        {
            Id = a.Id,
            UserId = a.UserId,
            AssessmentId = a.AssessmentId,
            LessonId = a.LessonId,
            SubjectId = a.SubjectId,
            AttemptNumber = a.AttemptNumber,
            StartedAt = a.StartedAt,
            LastActivityAt = a.LastActivityAt,
            CompletedAt = a.CompletedAt,
            CompletionStatus = a.CompletionStatus,
            SuccessStatus = a.SuccessStatus,
            ProgressMeasure = a.ProgressMeasure,
            ScoreRaw = a.ScoreRaw,
            ScoreMin = a.ScoreMin,
            ScoreMax = a.ScoreMax,
            ScoreScaled = a.ScoreScaled,
            SessionTimeMs = a.SessionTimeMs,
            CurrentQuestionId = a.CurrentQuestionId,
            ExitReason = a.ExitReason,
            SuspendData = suspendNode,
            SchemaVersion = a.SchemaVersion,
            Responses = respDict
        };
    }
}
