using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Student;

public class StudentAssessmentService : ILearnerAssessmentService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public StudentAssessmentService(IApplicationDbContext db, IClock clock, IIdGenerator idGenerator)
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
            if (attempt.IsFinalized || attempt.CompletionStatus == "completed")
            {
                throw new ConflictException("Phiên làm bài đã hoàn thành/chốt điểm không thể chỉnh sửa.");
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
            IsFinalized = a.IsFinalized || a.CompletionStatus == "completed",
            FinalizedAt = a.FinalizedAt,
            RowVersion = a.RowVersion is { Length: > 0 } ? Convert.ToBase64String(a.RowVersion) : string.Empty,
            Responses = respDict
        };
    }

    public async Task<AssessmentAttemptResponseDto> FinalizeAttemptAsync(
        string requestingUserId,
        string targetUserId,
        string attemptId,
        FinalizeAssessmentAttemptDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(requestingUserId, targetUserId, StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenException("Chỉ học sinh sở hữu phiên làm bài mới có quyền nộp và chốt điểm.");

        var attempt = await _db.AssessmentAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == attemptId, cancellationToken);

        if (attempt == null)
            throw new NotFoundException($"Không tìm thấy phiên làm bài '{attemptId}'.");

        if (!string.Equals(attempt.UserId, requestingUserId, StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenException("Bạn không có quyền nộp bài cho phiên làm bài của người dùng khác.");

        if (attempt.IsFinalized || attempt.CompletionStatus == "completed")
            throw new ConflictException("Phiên làm bài đã được chốt điểm và không thể nộp lại hoặc sửa đổi.");

        if (!string.IsNullOrWhiteSpace(dto.RowVersion))
        {
            byte[] clientVer;
            try { clientVer = Convert.FromBase64String(dto.RowVersion.Trim()); }
            catch (FormatException) { throw new ValidationException("RowVersion", "RowVersion không đúng định dạng Base64."); }
            if (attempt.RowVersion.Length == 0 || !attempt.RowVersion.SequenceEqual(clientVer))
                throw new ConflictException("Phiên làm bài đã bị thay đổi đồng thời (xung đột RowVersion).");
        }

        // Load authoritative question set for this assessment or lesson
        var pinnedLinks = !string.IsNullOrWhiteSpace(attempt.AssessmentId)
            ? await _db.AssessmentQuestions
                .AsNoTracking()
                .Include(aq => aq.Question)
                .Where(aq => aq.AssessmentId == attempt.AssessmentId)
                .OrderBy(aq => aq.OrderIndex)
                .ToListAsync(cancellationToken)
            : new List<AssessmentQuestion>();

        List<ContentQuestion> authoritativeQuestions;
        Dictionary<string, int> pointsByQuestion;
        if (pinnedLinks.Count > 0)
        {
            authoritativeQuestions = pinnedLinks
                .Where(l => l.Question != null)
                .Select(l => l.Question!)
                .ToList();
            pointsByQuestion = pinnedLinks.ToDictionary(l => l.QuestionId, l => Math.Max(1, l.Points));
        }
        else
        {
            authoritativeQuestions = await _db.ContentQuestions
                .AsNoTracking()
                .Where(q => !q.IsDeleted && q.Status == "published" &&
                            ((!string.IsNullOrEmpty(attempt.AssessmentId) && q.AssessmentId == attempt.AssessmentId) ||
                             (!string.IsNullOrEmpty(attempt.LessonId) && q.LessonId == attempt.LessonId)))
                .OrderBy(q => q.OrderIndex)
                .ToListAsync(cancellationToken);
            pointsByQuestion = authoritativeQuestions.ToDictionary(q => q.Id, _ => 1);
        }

        if (authoritativeQuestions.Count == 0)
            throw new ValidationException("AssessmentId", "Bài đánh giá không có câu hỏi hợp lệ để chấm điểm.");

        var qMap = authoritativeQuestions.ToDictionary(q => q.Id);
        if (dto.Answers != null)
        {
            foreach (var qid in dto.Answers.Keys)
            {
                if (!qMap.ContainsKey(qid))
                    throw new ValidationException("Answers", $"Câu hỏi '{qid}' không thuộc bài đánh giá/bài học này.");
            }
        }

        var now = _clock.UtcNow;
        double earned = 0;
        double totalPoints = pointsByQuestion.Values.Sum();

        foreach (var q in authoritativeQuestions)
        {
            var selected = (dto.Answers != null && dto.Answers.TryGetValue(q.Id, out var ansList))
                ? (ansList ?? new List<string>())
                : new List<string>();
            var studentAnswer = string.Join(",", selected.Select(s => s?.Trim() ?? string.Empty).Where(s => s.Length > 0));
            var isCorrect = !string.IsNullOrWhiteSpace(studentAnswer) &&
                            string.Equals(studentAnswer, q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase);

            if (isCorrect)
            {
                earned += pointsByQuestion.GetValueOrDefault(q.Id, 1);
            }

            var resp = attempt.Responses.FirstOrDefault(r => r.QuestionId == q.Id);
            if (resp == null)
            {
                resp = new AssessmentResponse
                {
                    AttemptId = attempt.Id,
                    QuestionId = q.Id,
                    SelectedOptionIdsJson = JsonSerializer.Serialize(selected),
                    FirstAnsweredAt = now,
                    LastAnsweredAt = now,
                    ChangeCount = 0,
                    TimeSpentMs = 0,
                    IsCorrect = isCorrect
                };
                attempt.Responses.Add(resp);
            }
            else
            {
                resp.SelectedOptionIdsJson = JsonSerializer.Serialize(selected);
                resp.LastAnsweredAt = now;
                resp.IsCorrect = isCorrect;
            }
        }

        var passScorePercent = 50.0;
        if (!string.IsNullOrWhiteSpace(attempt.AssessmentId))
        {
            var assessment = await _db.ContentAssessments.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == attempt.AssessmentId, cancellationToken);
            if (assessment != null) passScorePercent = assessment.PassScore;
        }

        var scaled = totalPoints > 0 ? Math.Round(earned / totalPoints, 4) : 0.0;
        attempt.ScoreRaw = earned;
        attempt.ScoreMin = 0;
        attempt.ScoreMax = totalPoints;
        attempt.ScoreScaled = scaled;
        attempt.ProgressMeasure = 1.0;
        attempt.SessionTimeMs = Math.Max(attempt.SessionTimeMs, dto.SessionTimeMs);
        attempt.CompletionStatus = "completed";
        attempt.SuccessStatus = (scaled * 100.0) >= passScorePercent ? "passed" : "failed";
        attempt.IsFinalized = true;
        attempt.FinalizedAt = now;
        attempt.CompletedAt = now;
        attempt.LastActivityAt = now;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Phiên làm bài đã được chốt điểm đồng thời bởi yêu cầu khác.");
        }

        return FormatAttempt(attempt);
    }
}