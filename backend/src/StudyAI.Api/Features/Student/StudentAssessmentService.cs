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
        var unreleased = await GetUnreleasedAssessmentIdsAsync(targetUserId, list.Select(a => a.AssessmentId), cancellationToken);
        return list.Select(a => FormatAttempt(a, unreleased.Contains(a.AssessmentId))).ToList();
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

        var unreleased = await GetUnreleasedAssessmentIdsAsync(targetUserId, [attempt.AssessmentId], cancellationToken);
        return FormatAttempt(attempt, unreleased.Contains(attempt.AssessmentId));
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
        var unreleased = await GetUnreleasedAssessmentIdsAsync(targetUserId, [attempt.AssessmentId], cancellationToken);
        return FormatAttempt(attempt, unreleased.Contains(attempt.AssessmentId));
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
        var unreleased = await GetUnreleasedAssessmentIdsAsync(targetUserId, [attempt.AssessmentId], cancellationToken);
        return FormatAttempt(attempt, unreleased.Contains(attempt.AssessmentId));
    }

    private async Task<HashSet<string>> GetUnreleasedAssessmentIdsAsync(string userId, IEnumerable<string> assessmentIds, CancellationToken ct)
    {
        var ids = assessmentIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0) return new HashSet<string>(StringComparer.Ordinal);

        var enrolledClassIds = await _db.ClassroomStudents.AsNoTracking()
            .Where(cs => cs.StudentId == userId)
            .Select(cs => cs.ClassroomId)
            .ToListAsync(ct);

        if (enrolledClassIds.Count == 0) return new HashSet<string>(StringComparer.Ordinal);

        return (await _db.TeacherExams.AsNoTracking()
            .Where(e => enrolledClassIds.Contains(e.ClassroomId) && e.SourceAssessmentId != null && ids.Contains(e.SourceAssessmentId) && !e.PublishResults)
            .Select(e => e.SourceAssessmentId!)
            .ToListAsync(ct))
            .ToHashSet(StringComparer.Ordinal);
    }

    private async Task<AssessmentAttempt> SaveAttemptInternal(string userId, AssessmentAttemptCreateDto dto, CancellationToken cancellationToken)
    {
        var id = string.IsNullOrEmpty(dto.Id) ? $"att_{Guid.NewGuid():N}" : dto.Id;
        var attempt = await _db.AssessmentAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.UserId == userId && a.Id == id, cancellationToken);

        var now = _clock.UtcNow;
        var isCompleting = string.Equals(dto.CompletionStatus, "completed", StringComparison.OrdinalIgnoreCase) || dto.CompletedAt.HasValue;

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
                LastActivityAt = now,
                CompletedAt = null,
                CompletionStatus = "incomplete",
                SuccessStatus = "unknown",
                ProgressMeasure = isCompleting ? 1.0 : Math.Clamp(dto.ProgressMeasure, 0.0, 1.0),
                ScoreRaw = null,
                ScoreMin = 0.0,
                ScoreMax = 1.0,
                ScoreScaled = null,
                SessionTimeMs = Math.Max(0, dto.SessionTimeMs),
                CurrentQuestionId = dto.CurrentQuestionId,
                ExitReason = dto.ExitReason,
                SuspendDataJson = SanitizeClientSuspendData(dto.SuspendData),
                SchemaVersion = dto.SchemaVersion
            };
            _db.AssessmentAttempts.Add(attempt);
        }
        else
        {
            if (attempt.CompletionStatus == "completed" || attempt.CompletedAt.HasValue)
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

            attempt.LastActivityAt = now;
            attempt.ProgressMeasure = isCompleting ? 1.0 : Math.Clamp(dto.ProgressMeasure, 0.0, 1.0);
            attempt.SessionTimeMs = Math.Max(0, dto.SessionTimeMs);
            attempt.CurrentQuestionId = dto.CurrentQuestionId ?? attempt.CurrentQuestionId;
            attempt.ExitReason = dto.ExitReason ?? attempt.ExitReason;
            if (dto.SuspendData != null)
                attempt.SuspendDataJson = SanitizeClientSuspendData(dto.SuspendData);
        }

        // Load authoritative published questions for this assessment/lesson
        var assessmentMeta = !string.IsNullOrWhiteSpace(attempt.AssessmentId)
            ? await _db.ContentAssessments.AsNoTracking().FirstOrDefaultAsync(a => a.Id == attempt.AssessmentId, cancellationToken)
            : null;

        var scopeQuestions = await _db.ContentQuestions.AsNoTracking()
            .Where(q => q.Status == "published" &&
                        ((!string.IsNullOrWhiteSpace(attempt.AssessmentId) && q.AssessmentId == attempt.AssessmentId) ||
                         (!string.IsNullOrWhiteSpace(attempt.LessonId) && q.LessonId == attempt.LessonId)))
            .ToDictionaryAsync(q => q.Id, StringComparer.Ordinal, cancellationToken);

        if (dto.Responses != null)
        {
            foreach (var (qId, rDto) in dto.Responses)
            {
                if (scopeQuestions.Count > 0 && !scopeQuestions.ContainsKey(qId))
                {
                    throw new ValidationException("QuestionId", $"Câu hỏi '{qId}' không hợp lệ hoặc không thuộc đề kiểm tra.");
                }

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
                        IsCorrect = null // Never trust client IsCorrect before server grading
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
                }
            }
        }

        if (isCompleting)
        {
            attempt.CompletionStatus = "completed";
            attempt.CompletedAt = now;

            if (scopeQuestions.Count > 0)
            {
                int correctCount = 0;
                var snapshotDict = new Dictionary<string, object>();
                foreach (var resp in attempt.Responses)
                {
                    if (scopeQuestions.TryGetValue(resp.QuestionId, out var q))
                    {
                        List<string> selected;
                        try { selected = JsonSerializer.Deserialize<List<string>>(resp.SelectedOptionIdsJson) ?? new List<string>(); }
                        catch { selected = new List<string>(); }

                        var graded = EvaluateAnswerServerSide(q, selected);
                        resp.IsCorrect = graded;
                        if (graded) correctCount++;

                        snapshotDict[q.Id] = new
                        {
                            prompt = q.Prompt,
                            correctAnswer = q.CorrectAnswer,
                            explanation = q.Explanation
                        };
                    }
                }

                var totalQ = Math.Max(scopeQuestions.Count, 1);
                attempt.ScoreRaw = correctCount;
                attempt.ScoreMin = 0.0;
                attempt.ScoreMax = totalQ;
                attempt.ScoreScaled = Math.Round((double)correctCount / totalQ, 4);
                var passThreshold = (assessmentMeta?.PassScore ?? 80) / 100.0;
                attempt.SuccessStatus = attempt.ScoreScaled >= passThreshold ? "passed" : "failed";

                // Persist server-owned immutable questionSnapshots
                JsonObject suspObj;
                try { suspObj = !string.IsNullOrWhiteSpace(attempt.SuspendDataJson) ? (JsonNode.Parse(attempt.SuspendDataJson)?.AsObject() ?? new JsonObject()) : new JsonObject(); }
                catch { suspObj = new JsonObject(); }
                suspObj["questionSnapshots"] = JsonSerializer.SerializeToNode(snapshotDict);
                attempt.SuspendDataJson = suspObj.ToJsonString();
            }
            else
            {
                attempt.ScoreRaw = 0;
                attempt.ScoreMin = 0.0;
                attempt.ScoreMax = Math.Max(attempt.Responses.Count, 1);
                attempt.ScoreScaled = 0.0;
                attempt.SuccessStatus = "failed";
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return attempt;
    }

    private static string? SanitizeClientSuspendData(JsonNode? node)
    {
        if (node == null) return null;
        if (node is JsonObject obj)
        {
            var clone = obj.DeepClone().AsObject();
            clone.Remove("questionSnapshots");
            return clone.ToJsonString();
        }
        return node.ToJsonString();
    }

    private static bool EvaluateAnswerServerSide(Models.ContentQuestion question, List<string> selectedOptions)
    {
        if (selectedOptions.Count == 0 || string.IsNullOrWhiteSpace(question.CorrectAnswer)) return false;
        var correct = question.CorrectAnswer.Trim();

        List<string> options;
        try { options = JsonSerializer.Deserialize<List<string>>(question.OptionsJson) ?? new List<string>(); }
        catch { options = new List<string>(); }

        if (selectedOptions.Count == 1)
        {
            var sel = selectedOptions[0].Trim();
            if (string.Equals(sel, correct, StringComparison.OrdinalIgnoreCase)) return true;

            int correctIdx = options.FindIndex(o => string.Equals(o.Trim(), correct, StringComparison.OrdinalIgnoreCase));
            if (correctIdx >= 0)
            {
                string letter = ((char)('A' + correctIdx)).ToString();
                if (string.Equals(sel, letter, StringComparison.OrdinalIgnoreCase)) return true;
                if (sel.StartsWith("opt_", StringComparison.OrdinalIgnoreCase))
                {
                    var parts = sel.Split('_');
                    if (parts.Length >= 3 && string.Equals(parts[2], letter, StringComparison.OrdinalIgnoreCase)) return true;
                }
            }
            return false;
        }

        var expectedSet = correct.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var actualSet = selectedOptions.Select(s => s.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return expectedSet.Count > 0 && expectedSet.SetEquals(actualSet);
    }

    private static AssessmentAttemptResponseDto FormatAttempt(AssessmentAttempt a, bool maskAnswers = false)
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
                IsCorrect = maskAnswers ? null : r.IsCorrect
            };
        }

        JsonNode? suspendNode = null;
        if (!string.IsNullOrEmpty(a.SuspendDataJson))
        {
            try
            {
                suspendNode = JsonNode.Parse(a.SuspendDataJson);
                if (maskAnswers && suspendNode is JsonObject obj)
                {
                    obj.Remove("questionSnapshots");
                }
            }
            catch { }
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
            SuccessStatus = maskAnswers ? "pending_release" : a.SuccessStatus,
            ProgressMeasure = a.ProgressMeasure,
            ScoreRaw = maskAnswers ? null : a.ScoreRaw,
            ScoreMin = a.ScoreMin,
            ScoreMax = a.ScoreMax,
            ScoreScaled = maskAnswers ? null : a.ScoreScaled,
            SessionTimeMs = a.SessionTimeMs,
            CurrentQuestionId = a.CurrentQuestionId,
            ExitReason = a.ExitReason,
            SuspendData = suspendNode,
            SchemaVersion = a.SchemaVersion,
            Responses = respDict
        };
    }
}