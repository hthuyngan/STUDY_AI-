using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Student;

public class StudentPracticeService : ILearnerPracticeService
{
    private readonly IApplicationDbContext _db;
    private readonly IStudentMasteryService? _masteryService;
    private readonly IRevisionPlannerService? _revisionPlannerService;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public StudentPracticeService(
        IApplicationDbContext db,
        IClock clock,
        IIdGenerator idGenerator,
        IStudentMasteryService? masteryService = null,
        IRevisionPlannerService? revisionPlannerService = null)
    {
        _db = db;
        _clock = clock;
        _idGenerator = idGenerator;
        _masteryService = masteryService;
        _revisionPlannerService = revisionPlannerService;
    }

    private static bool IsAdminRole(string userRole) =>
        string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);

    private static bool IsTeacherRole(string userRole) =>
        string.Equals(userRole, "teacher", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);

    private async Task<bool> CanAccessAttemptAsync(AssessmentAttempt attempt, string userId, string userRole)
    {
        if (attempt.UserId == userId) return true;
        if (IsAdminRole(userRole)) return true;
        if (IsTeacherRole(userRole))
        {
            return await _db.ClassroomStudents.AnyAsync(cs =>
                cs.StudentId == attempt.UserId && cs.Classroom != null && cs.Classroom.TeacherId == userId);
        }
        return false;
    }

    private static void ExtractQuestionMetadata(ContentQuestion q, out List<string> skillIds, out string cognitiveLevel)
    {
        skillIds = new List<string>();
        cognitiveLevel = string.Empty;

        if (!string.IsNullOrEmpty(q.MetadataJson))
        {
            try
            {
                using var metaDoc = JsonDocument.Parse(q.MetadataJson);
                var root = metaDoc.RootElement;
                if (root.TryGetProperty("skillIds", out var sIds) && sIds.ValueKind == JsonValueKind.Array)
                {
                    skillIds = sIds.EnumerateArray()
                        .Select(x => x.GetString())
                        .Where(x => !string.IsNullOrEmpty(x))
                        .ToList()!;
                }
                else if (root.TryGetProperty("skills", out var skills) && skills.ValueKind == JsonValueKind.Array)
                {
                    skillIds = skills.EnumerateArray()
                        .Select(x => x.GetString())
                        .Where(x => !string.IsNullOrEmpty(x))
                        .ToList()!;
                }
                if (root.TryGetProperty("cognitiveLevel", out var cog) && cog.ValueKind == JsonValueKind.String)
                {
                    cognitiveLevel = cog.GetString() ?? string.Empty;
                }
            }
            catch { }
        }

        if (string.IsNullOrEmpty(cognitiveLevel))
        {
            cognitiveLevel = q.Difficulty switch
            {
                "easy" or "nhan_biet" => "nhan_biet",
                "medium" or "thong_hieu" => "thong_hieu",
                "hard" or "van_dung" => "van_dung",
                "very-hard" or "very_hard" or "van_dung_cao" => "van_dung_cao",
                _ => "thong_hieu"
            };
        }
    }

    private static void ExtractAttemptContext(AssessmentAttempt attempt, out string? chapterId, out string? lessonId)
    {
        chapterId = null;
        lessonId = !string.IsNullOrEmpty(attempt.LessonId) ? attempt.LessonId : null;

        if (!string.IsNullOrEmpty(attempt.SuspendDataJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(attempt.SuspendDataJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("chapterId", out var cElem) && cElem.ValueKind == JsonValueKind.String)
                {
                    chapterId = cElem.GetString();
                }
                if (string.IsNullOrEmpty(lessonId) && root.TryGetProperty("lessonId", out var lElem) && lElem.ValueKind == JsonValueKind.String)
                {
                    lessonId = lElem.GetString();
                }
            }
            catch { }
        }
    }

    private static IQueryable<ContentQuestion> ApplyQuestionFilters(
        IQueryable<ContentQuestion> query,
        string subjectId,
        string? chapterId,
        string? lessonId,
        string? difficulty,
        string? skillId,
        string? questionType,
        string? grade)
    {
        query = query.Where(q => q.SubjectId == subjectId);

        if (!string.IsNullOrWhiteSpace(grade))
        {
            query = query.Where(q => q.Grade == grade);
        }

        if (!string.IsNullOrWhiteSpace(chapterId))
        {
            query = query.Where(q => q.ChapterId == chapterId);
        }

        if (!string.IsNullOrWhiteSpace(lessonId))
        {
            query = query.Where(q => q.LessonId == lessonId);
        }

        if (!string.IsNullOrWhiteSpace(difficulty) && difficulty != "all")
        {
            var diff = difficulty.Trim().ToLowerInvariant();
            query = query.Where(q => q.Difficulty == diff ||
                (diff == "easy" && q.Difficulty == "nhan_biet") ||
                (diff == "medium" && q.Difficulty == "thong_hieu") ||
                (diff == "hard" && q.Difficulty == "van_dung") ||
                (diff == "very-hard" && q.Difficulty == "van_dung_cao") ||
                (diff == "very_hard" && q.Difficulty == "van_dung_cao") ||
                (diff == "nhan_biet" && q.Difficulty == "easy") ||
                (diff == "thong_hieu" && q.Difficulty == "medium") ||
                (diff == "van_dung" && q.Difficulty == "hard") ||
                (diff == "van_dung_cao" && (q.Difficulty == "very-hard" || q.Difficulty == "very_hard")));
        }

        if (!string.IsNullOrWhiteSpace(questionType) && questionType != "all")
        {
            var t = questionType.Trim().ToLowerInvariant().Replace("_", "-");
            if (t == "multiple-choice" || t == "mcq")
            {
                query = query.Where(q => q.Type == "multiple-choice" || q.Type == "multiple_choice" || q.Type == "multiple-select");
            }
            else if (t.Contains("true-false"))
            {
                query = query.Where(q => q.Type == "true-false" || q.Type == "true_false" || q.Type == "true_false_group");
            }
            else if (t.Contains("short-answer") || t == "short")
            {
                query = query.Where(q => q.Type == "short-answer" || q.Type == "short_answer");
            }
            else
            {
                query = query.Where(q => q.Type == questionType || q.Type == t);
            }
        }

        if (!string.IsNullOrWhiteSpace(skillId))
        {
            var skill = skillId.Trim();
            query = query.Where(q => (q.Topic != null && q.Topic.Contains(skill)) ||
                                     (q.Code != null && q.Code.Contains(skill)) ||
                                     (q.MetadataJson != null && q.MetadataJson.Contains(skill)));
        }

        return query;
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

    public async Task<QuestionCountDto> GetQuestionCountAsync(
        string subjectId,
        string? chapterId,
        string? lessonId,
        string? difficulty,
        string? mode,
        string? grade,
        string userGrade,
        string? skillId = null,
        string? type = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(subjectId))
        {
            throw new ValidationException("Mã môn học (subjectId) là bắt buộc.");
        }

        var baseQuery = _db.ContentQuestions.AsNoTracking()
            .Where(q => !q.IsDeleted && q.Status == "published" && !string.IsNullOrWhiteSpace(q.CorrectAnswer));

        var query = ApplyQuestionFilters(baseQuery, subjectId, chapterId, lessonId, difficulty, skillId, type, grade);
        var count = await query.CountAsync(cancellationToken);
        return new QuestionCountDto { Count = count, AvailableQuestions = count };
    }

    public async Task<PracticeSessionResponseDto> CreateSessionAsync(
        string userId,
        string userGrade,
        CreatePracticeSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.SubjectId))
        {
            throw new ValidationException("Mã môn học (SubjectId) là bắt buộc.");
        }

        var baseQuery = _db.ContentQuestions.AsNoTracking()
            .Where(q => !q.IsDeleted && q.Status == "published" && !string.IsNullOrWhiteSpace(q.CorrectAnswer));

        var skillId = !string.IsNullOrWhiteSpace(request.SkillId)
            ? request.SkillId
            : (request.SkillIds != null && request.SkillIds.Count > 0 ? request.SkillIds[0] : null);

        var query = ApplyQuestionFilters(
            baseQuery,
            request.SubjectId,
            request.ChapterId,
            request.LessonId,
            request.Difficulty,
            skillId,
            request.QuestionType,
            request.Grade);

        var totalAvailable = await query.CountAsync(cancellationToken);
        if (totalAvailable == 0)
        {
            throw new NotFoundException("Không tìm thấy câu hỏi phù hợp với yêu cầu.");
        }

        var limit = Math.Clamp(request.QuestionCount > 0 ? request.QuestionCount : 10, 1, 50);

        List<ContentQuestion> selectedQuestions;
        if (request.Mode == "adaptive")
        {
            selectedQuestions = await SelectAdaptiveQuestionsAsync(query, request, limit, userId, cancellationToken);
            if (selectedQuestions.Count == 0)
            {
                selectedQuestions = await query.OrderBy(q => Guid.NewGuid()).Take(limit).ToListAsync(cancellationToken);
            }
        }
        else
        {
            selectedQuestions = await query
                .OrderBy(q => Guid.NewGuid())
                .Take(limit)
                .ToListAsync(cancellationToken);
        }

        var sessionId = $"sess_{Guid.NewGuid():N}";
        var now = _clock.UtcNow;
        DateTimeOffset? expiresAt = null;

        var timeLimit = request.TimeLimitMinutes;
        if (request.Mode == "exam" && (!timeLimit.HasValue || timeLimit.Value <= 0))
        {
            timeLimit = request.SubjectId.Contains("math") ? 90 : (request.SubjectId.Contains("eng") ? 60 : 50);
        }

        if (timeLimit.HasValue && timeLimit.Value > 0)
        {
            expiresAt = now.AddMinutes(timeLimit.Value);
        }

        var questionIds = selectedQuestions.Select(q => q.Id).ToList();

        var suspendData = new JsonObject
        {
            ["mode"] = request.Mode,
            ["questionIds"] = JsonSerializer.SerializeToNode(questionIds),
            ["timeLimitMinutes"] = timeLimit,
            ["expiresAt"] = expiresAt?.ToString("o"),
            ["blueprintId"] = request.BlueprintId,
            ["chapterId"] = request.ChapterId,
            ["lessonId"] = request.LessonId,
            ["answers"] = new JsonObject()
        };

        var attempt = new AssessmentAttempt
        {
            Id = sessionId,
            UserId = userId,
            AssessmentId = request.Mode == "exam" ? "asmt_exam" : "asmt_practice",
            SubjectId = request.SubjectId,
            LessonId = request.LessonId ?? string.Empty,
            AttemptNumber = 1,
            StartedAt = now,
            LastActivityAt = now,
            CompletionStatus = "in_progress",
            SuccessStatus = "unknown",
            ProgressMeasure = 0.0,
            SessionTimeMs = 0,
            SuspendDataJson = suspendData.ToJsonString()
        };

        _db.AssessmentAttempts.Add(attempt);
        await _db.SaveChangesAsync(cancellationToken);

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
            SubjectId = request.SubjectId,
            ChapterId = request.ChapterId,
            LessonId = request.LessonId,
            Mode = request.Mode,
            QuestionCount = questionDtos.Count,
            TimeLimitMinutes = timeLimit,
            StartedAt = now,
            ExpiresAt = expiresAt,
            Status = "in_progress",
            Questions = questionDtos,
            SavedAnswers = new Dictionary<string, string>()
        };
    }

    public async Task<PracticeSessionResponseDto> GetSessionAsync(
        string userId,
        string userRole,
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _db.AssessmentAttempts.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == sessionId, cancellationToken);

        if (attempt == null)
        {
            throw new NotFoundException($"Không tìm thấy phiên luyện tập '{sessionId}'.");
        }

        if (!await CanAccessAttemptAsync(attempt, userId, userRole))
        {
            throw new ForbiddenException("Bạn không có quyền truy cập phiên luyện tập này.");
        }

        var suspendNode = string.IsNullOrEmpty(attempt.SuspendDataJson)
            ? new JsonObject()
            : JsonNode.Parse(attempt.SuspendDataJson)?.AsObject() ?? new JsonObject();

        var questionIds = suspendNode["questionIds"]?.AsArray()
            .Select(x => x?.GetValue<string>())
            .Where(x => !string.IsNullOrEmpty(x))
            .ToList()!;

        var questions = await _db.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToListAsync(cancellationToken);

        var orderedQuestions = questionIds
            .Select(id => questions.FirstOrDefault(q => q.Id == id))
            .Where(q => q != null)
            .Select(q => new PracticeQuestionDto
            {
                Id = q!.Id,
                Prompt = q.Prompt,
                Options = SafeDeserializeStringList(q.OptionsJson),
                ImageUrl = q.ImageUrl,
                Difficulty = q.Difficulty,
                Type = q.Type,
                Topic = q.Topic,
                SubjectId = q.SubjectId
            })
            .ToList();

        var savedAnswers = new Dictionary<string, string>();
        if (suspendNode.TryGetPropertyValue("answers", out var ansNode) && ansNode is JsonObject ansObj)
        {
            foreach (var kvp in ansObj)
            {
                if (kvp.Value != null) savedAnswers[kvp.Key] = kvp.Value.ToString();
            }
        }

        DateTimeOffset? expiresAt = null;
        if (DateTimeOffset.TryParse(suspendNode["expiresAt"]?.GetValue<string>(), out var parsedExp))
        {
            expiresAt = parsedExp;
        }

        ExtractAttemptContext(attempt, out var chapterId, out var lessonId);

        return new PracticeSessionResponseDto
        {
            SessionId = attempt.Id,
            SubjectId = attempt.SubjectId,
            ChapterId = chapterId,
            LessonId = lessonId,
            Mode = suspendNode["mode"]?.GetValue<string>() ?? "practice",
            QuestionCount = orderedQuestions.Count,
            TimeLimitMinutes = suspendNode["timeLimitMinutes"]?.GetValue<int?>(),
            StartedAt = attempt.StartedAt,
            ExpiresAt = expiresAt,
            Status = attempt.CompletionStatus,
            Questions = orderedQuestions,
            SavedAnswers = savedAnswers
        };
    }

    public async Task SaveAnswerAsync(
        string userId,
        string userRole,
        string sessionId,
        SaveAnswerRequest request,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _db.AssessmentAttempts
            .FirstOrDefaultAsync(a => a.Id == sessionId, cancellationToken);

        if (attempt == null)
        {
            throw new NotFoundException($"Không tìm thấy phiên luyện tập '{sessionId}'.");
        }

        if (!await CanAccessAttemptAsync(attempt, userId, userRole))
        {
            throw new ForbiddenException("Bạn không có quyền truy cập phiên luyện tập này.");
        }

        if (attempt.UserId != userId)
        {
            throw new ForbiddenException("Chỉ học sinh sở hữu phiên làm bài mới có quyền lưu câu trả lời.");
        }

        if (attempt.CompletionStatus == "completed")
        {
            throw new ValidationException("Phiên luyện tập đã kết thúc, không thể lưu câu trả lời.");
        }

        var suspendNode = string.IsNullOrEmpty(attempt.SuspendDataJson)
            ? new JsonObject()
            : JsonNode.Parse(attempt.SuspendDataJson)?.AsObject() ?? new JsonObject();

        if (!suspendNode.ContainsKey("answers"))
        {
            suspendNode["answers"] = new JsonObject();
        }

        var answersObj = suspendNode["answers"]!.AsObject();
        answersObj[request.QuestionId] = request.Answer;

        var now = _clock.UtcNow;
        attempt.SuspendDataJson = suspendNode.ToJsonString();
        attempt.LastActivityAt = now;
        attempt.SessionTimeMs += Math.Max(0, request.TimeSpentMs);

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<CheckQuestionResponse> CheckSingleQuestionAsync(
        string userId,
        string userRole,
        string sessionId,
        CheckQuestionRequest request,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _db.AssessmentAttempts.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == sessionId, cancellationToken);

        if (attempt == null)
        {
            throw new NotFoundException($"Không tìm thấy phiên luyện tập '{sessionId}'.");
        }

        if (!await CanAccessAttemptAsync(attempt, userId, userRole))
        {
            throw new ForbiddenException("Bạn không có quyền truy cập phiên luyện tập này.");
        }

        if (attempt.UserId != userId)
        {
            throw new ForbiddenException("Chỉ học sinh sở hữu phiên làm bài mới có quyền kiểm tra câu hỏi.");
        }

        var suspendNode = string.IsNullOrEmpty(attempt.SuspendDataJson)
            ? new JsonObject()
            : JsonNode.Parse(attempt.SuspendDataJson)?.AsObject() ?? new JsonObject();

        var mode = suspendNode["mode"]?.GetValue<string>() ?? "practice";
        if (mode == "exam")
        {
            throw new ForbiddenException("Chế độ thi thử không cho phép kiểm tra đáp án tức thời.");
        }

        var question = await _db.ContentQuestions.AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId && !q.IsDeleted && q.Status == "published", cancellationToken);

        if (question == null)
        {
            throw new NotFoundException($"Không tìm thấy câu hỏi published '{request.QuestionId}'.");
        }

        bool isCorrect = EvaluateAnswer(question, request.Answer);

        return new CheckQuestionResponse
        {
            QuestionId = question.Id,
            IsCorrect = isCorrect,
            CorrectAnswer = question.CorrectAnswer,
            Explanation = question.Explanation
        };
    }

    public async Task<PracticeResultDto> SubmitSessionAsync(
        string userId,
        string userRole,
        string sessionId,
        SubmitPracticeSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _db.AssessmentAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == sessionId, cancellationToken);

        if (attempt == null)
        {
            throw new NotFoundException($"Không tìm thấy phiên luyện tập '{sessionId}'.");
        }

        if (!await CanAccessAttemptAsync(attempt, userId, userRole))
        {
            throw new ForbiddenException("Bạn không có quyền nộp bài cho phiên luyện tập này.");
        }

        if (attempt.UserId != userId)
        {
            throw new ForbiddenException("Chỉ học sinh sở hữu phiên làm bài mới có quyền nộp bài cho phiên luyện tập này.");
        }

        var now = _clock.UtcNow;

        if (attempt.CompletionStatus == "completed")
        {
            return await GetSessionResultAsync(userId, userRole, sessionId, cancellationToken);
        }

        var suspendNode = string.IsNullOrEmpty(attempt.SuspendDataJson)
            ? new JsonObject()
            : JsonNode.Parse(attempt.SuspendDataJson)?.AsObject() ?? new JsonObject();

        bool isPastDeadline = false;
        if (suspendNode.TryGetPropertyValue("expiresAt", out var expNode) &&
            DateTimeOffset.TryParse(expNode?.GetValue<string>(), out var expiresAt))
        {
            if (now > expiresAt)
            {
                isPastDeadline = true;
            }
        }

        var questionIds = suspendNode["questionIds"]?.AsArray()
            .Select(x => x?.GetValue<string>())
            .Where(x => !string.IsNullOrEmpty(x))
            .ToList()!;

        var questions = await _db.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToListAsync(cancellationToken);

        int correctCount = 0;
        int incorrectCount = 0;
        int unansweredCount = 0;
        var questionResults = new List<QuestionResultItemDto>();

        foreach (var qId in questionIds)
        {
            var q = questions.FirstOrDefault(x => x.Id == qId);
            if (q == null) continue;

            string studentAns = string.Empty;
            if (!isPastDeadline && request.Answers != null && !string.IsNullOrEmpty(qId) && request.Answers.TryGetValue(qId, out var ans))
            {
                studentAns = ans?.Trim() ?? string.Empty;
            }
            else if (suspendNode.TryGetPropertyValue("answers", out var aNode) &&
                     aNode is JsonObject ansObj &&
                     !string.IsNullOrEmpty(qId) &&
                     ansObj.TryGetPropertyValue(qId, out var valNode))
            {
                studentAns = valNode?.ToString().Trim() ?? string.Empty;
            }

            bool isAnswered = !string.IsNullOrWhiteSpace(studentAns);
            bool isCorrect = isAnswered && EvaluateAnswer(q, studentAns);

            if (!isAnswered) unansweredCount++;
            else if (isCorrect) correctCount++;
            else incorrectCount++;

            ExtractQuestionMetadata(q, out var sIds, out var cogLevel);

            questionResults.Add(new QuestionResultItemDto
            {
                QuestionId = q.Id,
                Prompt = q.Prompt,
                Options = SafeDeserializeStringList(q.OptionsJson),
                StudentAnswer = studentAns,
                CorrectAnswer = q.CorrectAnswer,
                IsCorrect = isCorrect,
                Explanation = q.Explanation,
                Difficulty = q.Difficulty,
                Type = q.Type,
                QuestionType = q.Type,
                SkillIds = sIds,
                CognitiveLevel = cogLevel
            });

            var resp = attempt.Responses.FirstOrDefault(r => r.QuestionId == q.Id);
            if (resp == null)
            {
                resp = new AssessmentResponse
                {
                    AttemptId = attempt.Id,
                    QuestionId = q.Id,
                    SelectedOptionIdsJson = JsonSerializer.Serialize(new List<string> { studentAns }),
                    FirstAnsweredAt = now,
                    LastAnsweredAt = now,
                    ChangeCount = isAnswered ? 1 : 0,
                    TimeSpentMs = 0,
                    IsCorrect = isCorrect
                };
                attempt.Responses.Add(resp);
            }
            else
            {
                resp.SelectedOptionIdsJson = JsonSerializer.Serialize(new List<string> { studentAns });
                resp.LastAnsweredAt = now;
                resp.IsCorrect = isCorrect;
            }
        }

        int totalQ = questionIds.Count;
        double scoreRaw = correctCount;
        double scoreScaled = totalQ > 0 ? Math.Round((double)correctCount / totalQ * 10.0, 1) : 0.0;
        bool passed = scoreScaled >= 5.0;

        attempt.CompletionStatus = "completed";
        attempt.SuccessStatus = passed ? "passed" : "failed";
        attempt.CompletedAt = now;
        attempt.LastActivityAt = now;
        attempt.ProgressMeasure = 1.0;
        attempt.ScoreRaw = scoreRaw;
        attempt.ScoreScaled = scoreScaled;
        attempt.ScoreMin = 0.0;
        attempt.ScoreMax = attempt.ScoreMax > 0 ? attempt.ScoreMax : (totalQ > 0 ? (double)totalQ : 10.0);
        attempt.SessionTimeMs = request.SessionTimeMs > 0 ? request.SessionTimeMs : attempt.SessionTimeMs;

        suspendNode["resultBreakdown"] = JsonSerializer.SerializeToNode(questionResults);
        attempt.SuspendDataJson = suspendNode.ToJsonString();

        // 3. Update Mastery Scores & Spaced Repetition
        if (_masteryService != null)
        {
            try
            {
                await _masteryService.UpdateMasteryFromAttemptAsync(attempt.UserId, attempt.Id, cancellationToken);
            }
            catch
            {
                // Non-blocking mastery update
            }
        }

        if (_revisionPlannerService != null && attempt.AssessmentId == "asmt_exam")
        {
            try
            {
                await _revisionPlannerService.AutoAdjustPlanAfterExamAsync(attempt.UserId, attempt.SubjectId, attempt.Id, cancellationToken);
            }
            catch
            {
                // Non-blocking revision planner update
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        ExtractAttemptContext(attempt, out var chapterId, out var lessonId);

        return new PracticeResultDto
        {
            ResultId = attempt.Id,
            SessionId = attempt.Id,
            SubjectId = attempt.SubjectId,
            ChapterId = chapterId,
            LessonId = lessonId,
            Mode = suspendNode["mode"]?.GetValue<string>() ?? "practice",
            TotalQuestions = totalQ,
            CorrectCount = correctCount,
            IncorrectCount = incorrectCount,
            UnansweredCount = unansweredCount,
            ScoreRaw = scoreRaw,
            ScoreScaled = scoreScaled,
            Passed = passed,
            TimeSpentSeconds = (int)(attempt.SessionTimeMs / 1000),
            StartedAt = attempt.StartedAt,
            CompletedAt = now,
            Questions = questionResults
        };
    }

    public async Task<PracticeResultDto> GetSessionResultAsync(
        string userId,
        string userRole,
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        return await GetResultByIdAsync(userId, userRole, sessionId, cancellationToken);
    }

    public async Task<PracticeResultDto> GetResultByIdAsync(
        string userId,
        string userRole,
        string resultId,
        CancellationToken cancellationToken = default)
    {
        var cleanId = resultId.StartsWith("res_", StringComparison.OrdinalIgnoreCase) ? resultId[4..] : resultId;
        var attempt = await _db.AssessmentAttempts.AsNoTracking()
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == resultId || a.Id == cleanId, cancellationToken);

        if (attempt == null)
        {
            throw new NotFoundException($"Không tìm thấy kết quả làm bài '{resultId}'.");
        }

        if (!await CanAccessAttemptAsync(attempt, userId, userRole))
        {
            throw new ForbiddenException("Bạn không có quyền xem kết quả này.");
        }

        if (attempt.CompletionStatus != "completed")
        {
            throw new ValidationException("Bài thi chưa hoàn thành, không thể xem kết quả.");
        }

        var suspendNode = string.IsNullOrEmpty(attempt.SuspendDataJson)
            ? new JsonObject()
            : JsonNode.Parse(attempt.SuspendDataJson)?.AsObject() ?? new JsonObject();

        List<QuestionResultItemDto> questionResults = new();
        if (suspendNode.TryGetPropertyValue("resultBreakdown", out var bdNode) && bdNode != null)
        {
            try
            {
                questionResults = JsonSerializer.Deserialize<List<QuestionResultItemDto>>(bdNode.ToJsonString()) ?? new();
            }
            catch { }
        }

        if (questionResults.Count == 0)
        {
            var questionIds = suspendNode["questionIds"]?.AsArray()
                .Select(x => x?.GetValue<string>())
                .Where(x => !string.IsNullOrEmpty(x))
                .ToList()!;

            var questions = await _db.ContentQuestions.AsNoTracking()
                .Where(q => questionIds.Contains(q.Id))
                .ToListAsync(cancellationToken);

            foreach (var q in questions)
            {
                var resp = attempt.Responses?.FirstOrDefault(r => r.QuestionId == q.Id);
                string ans = string.Empty;
                if (!string.IsNullOrEmpty(resp?.SelectedOptionIdsJson))
                {
                    ans = SafeDeserializeStringList(resp.SelectedOptionIdsJson).FirstOrDefault() ?? string.Empty;
                }

                ExtractQuestionMetadata(q, out var sIds, out var cogLevel);

                questionResults.Add(new QuestionResultItemDto
                {
                    QuestionId = q.Id,
                    Prompt = q.Prompt,
                    Options = SafeDeserializeStringList(q.OptionsJson),
                    StudentAnswer = ans,
                    CorrectAnswer = q.CorrectAnswer,
                    IsCorrect = resp?.IsCorrect ?? false,
                    Explanation = q.Explanation,
                    Difficulty = q.Difficulty,
                    Type = q.Type,
                    QuestionType = q.Type,
                    SkillIds = sIds,
                    CognitiveLevel = cogLevel
                });
            }
        }

        ExtractAttemptContext(attempt, out var chapterId, out var lessonId);

        int totalQ = questionResults.Count;
        int correctCount = questionResults.Count(q => q.IsCorrect);
        int incorrectCount = questionResults.Count(q => !q.IsCorrect && !string.IsNullOrWhiteSpace(q.StudentAnswer));
        int unansweredCount = totalQ - correctCount - incorrectCount;

        return new PracticeResultDto
        {
            ResultId = attempt.Id,
            SessionId = attempt.Id,
            SubjectId = attempt.SubjectId,
            ChapterId = chapterId,
            LessonId = lessonId,
            Mode = suspendNode["mode"]?.GetValue<string>() ?? "practice",
            TotalQuestions = totalQ,
            CorrectCount = correctCount,
            IncorrectCount = incorrectCount,
            UnansweredCount = unansweredCount,
            ScoreRaw = attempt.ScoreRaw ?? correctCount,
            ScoreScaled = attempt.ScoreScaled ?? (totalQ > 0 ? Math.Round((double)correctCount / totalQ * 10.0, 1) : 0.0),
            Passed = (attempt.ScoreScaled ?? 0.0) >= 5.0,
            TimeSpentSeconds = (int)(attempt.SessionTimeMs / 1000),
            StartedAt = attempt.StartedAt,
            CompletedAt = attempt.CompletedAt ?? attempt.LastActivityAt,
            Questions = questionResults
        };
    }

    public async Task<List<MistakeItemDto>> GetMistakesAsync(
        string userId,
        string? subjectId,
        CancellationToken cancellationToken = default)
    {
        var attemptsQuery = _db.AssessmentAttempts.AsNoTracking()
            .Where(a => a.UserId == userId && a.CompletionStatus == "completed");

        if (!string.IsNullOrEmpty(subjectId))
        {
            attemptsQuery = attemptsQuery.Where(a => a.SubjectId == subjectId);
        }

        var attemptIds = await attemptsQuery.Select(a => a.Id).ToListAsync(cancellationToken);

        var wrongResponses = await _db.AssessmentResponses.AsNoTracking()
            .Where(r => attemptIds.Contains(r.AttemptId) && r.IsCorrect == false)
            .OrderByDescending(r => r.LastAnsweredAt)
            .ToListAsync(cancellationToken);

        var questionIds = wrongResponses.Select(r => r.QuestionId).Distinct().ToList();

        var questions = await _db.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id) && !q.IsDeleted && q.Status == "published")
            .ToListAsync(cancellationToken);

        var resultList = new List<MistakeItemDto>();
        var now = _clock.UtcNow;

        foreach (var q in questions)
        {
            var qResponses = wrongResponses.Where(r => r.QuestionId == q.Id).ToList();
            var lastAttempt = qResponses.Max(r => r.LastAnsweredAt) ?? now;
            int mistakeCount = qResponses.Count;

            int reviewBox = Math.Clamp(1 + (mistakeCount > 3 ? 0 : (3 - mistakeCount)), 1, 5);
            var nextReviewDate = lastAttempt.AddDays(Math.Pow(2, reviewBox - 1));
            var status = nextReviewDate <= now ? "due" : "upcoming";

            resultList.Add(new MistakeItemDto
            {
                QuestionId = q.Id,
                SubjectId = q.SubjectId ?? string.Empty,
                Prompt = q.Prompt ?? string.Empty,
                Options = SafeDeserializeStringList(q.OptionsJson),
                Difficulty = q.Difficulty ?? string.Empty,
                ImageUrl = q.ImageUrl,
                LastAttemptAt = lastAttempt,
                MistakeCount = mistakeCount,
                ReviewBox = reviewBox,
                NextReviewDate = nextReviewDate.ToString("yyyy-MM-dd"),
                Status = status
            });
        }

        return resultList;
    }

    public async Task<ReviewMistakeResponse> ReviewMistakeAsync(
        string userId,
        string questionId,
        ReviewMistakeRequest request,
        CancellationToken cancellationToken = default)
    {
        var question = await _db.ContentQuestions.AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == questionId && !q.IsDeleted && q.Status == "published", cancellationToken);

        if (question == null)
        {
            throw new NotFoundException($"Không tìm thấy câu hỏi published '{questionId}'.");
        }

        var now = _clock.UtcNow;
        var activeExamAttempts = await _db.AssessmentAttempts.AsNoTracking()
            .Where(a => a.UserId == userId &&
                        a.CompletionStatus == "in_progress" &&
                        (a.AssessmentId == "asmt_exam" || a.AssessmentId == "exam"))
            .ToListAsync(cancellationToken);

        foreach (var exam in activeExamAttempts)
        {
            if (!string.IsNullOrEmpty(exam.SuspendDataJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(exam.SuspendDataJson);
                    if (doc.RootElement.TryGetProperty("questionIds", out var qIdsElem) &&
                        qIdsElem.EnumerateArray().Any(id => id.GetString() == questionId))
                    {
                        throw new ForbiddenException("Không thể xem đáp án câu hỏi đang nằm trong bài thi thử chưa nộp.");
                    }
                }
                catch (ForbiddenException) { throw; }
                catch { }
            }
        }

        var hasMistake = await _db.AssessmentResponses.AsNoTracking()
            .AnyAsync(r => r.QuestionId == questionId &&
                           r.IsCorrect == false &&
                           _db.AssessmentAttempts.Any(a => a.Id == r.AttemptId && a.UserId == userId), cancellationToken);

        if (!hasMistake)
        {
            throw new ValidationException("Học sinh chưa từng trả lời sai câu hỏi này.");
        }

        bool isCorrect = EvaluateAnswer(question, request.Answer);
        int oldBox = 1;
        int newBox = isCorrect ? 2 : 1;
        var nextDate = now.AddDays(Math.Pow(2, newBox - 1)).ToString("yyyy-MM-dd");

        return new ReviewMistakeResponse
        {
            QuestionId = question.Id,
            IsCorrect = isCorrect,
            CorrectAnswer = question.CorrectAnswer,
            Explanation = question.Explanation,
            OldBox = oldBox,
            NewBox = newBox,
            NextReviewDate = nextDate,
            Mastered = newBox >= 5
        };
    }

    public async Task<LearnerDashboardStatsDto> GetDashboardStatsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        // 1. Completed Lessons
        var completedLessons = await _db.LessonProgresses.AsNoTracking()
            .CountAsync(p => p.UserId == userId && (p.OverallProgress >= 100 || p.ContentProgress >= 100), cancellationToken);

        // 2. Questions Practiced & Correct Answers
        var responses = await _db.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == userId)
            .ToListAsync(cancellationToken);

        int totalPracticed = responses.Count;
        int totalCorrect = responses.Count(r => r.IsCorrect == true);
        double accuracyRate = totalPracticed > 0 ? Math.Round((double)totalCorrect / totalPracticed * 100.0, 1) : 0.0;

        // 3. Mistakes & Due Reviews
        var incorrectResponses = responses.Where(r => r.IsCorrect == false).ToList();
        var mistakeQuestionIds = incorrectResponses.Select(r => r.QuestionId).Distinct().ToList();
        int totalMistakes = mistakeQuestionIds.Count;

        // Count due reviews today
        var today = _clock.UtcNow.Date;
        int dueCount = 0;
        foreach (var qId in mistakeQuestionIds)
        {
            var latestWrong = incorrectResponses
                .Where(r => r.QuestionId == qId)
                .OrderByDescending(r => r.LastAnsweredAt ?? r.FirstAnsweredAt)
                .First();
            var date = (latestWrong.LastAnsweredAt ?? latestWrong.FirstAnsweredAt ?? _clock.UtcNow).Date;
            if (date.AddDays(1) <= today)
            {
                dueCount++;
            }
        }

        // 4. Streak Days
        var activityDates = await _db.AssessmentAttempts.AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => a.StartedAt.Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToListAsync(cancellationToken);

        int streak = 0;
        var checkDate = today;
        if (!activityDates.Contains(checkDate))
        {
            checkDate = today.AddDays(-1);
        }

        while (activityDates.Contains(checkDate))
        {
            streak++;
            checkDate = checkDate.AddDays(-1);
        }

        // 5. Subject Progress
        var subjects = await _db.ContentSubjects.AsNoTracking()
            .Where(s => s.IsActive && !s.Name.StartsWith("TEST_"))
            .OrderBy(s => s.OrderIndex)
            .ToListAsync(cancellationToken);

        var subjectProgressList = new List<SubjectDashboardProgressDto>();
        foreach (var subj in subjects)
        {
            var subjCompletedLessons = await _db.LessonProgresses.AsNoTracking()
                .CountAsync(p => p.UserId == userId && p.SubjectId == subj.Id && (p.OverallProgress >= 100 || p.ContentProgress >= 100), cancellationToken);

            var subjTotalLessons = await _db.ContentLessons.AsNoTracking()
                .CountAsync(l => l.Chapter != null && l.Chapter.SubjectId == subj.Id && l.Status == "published", cancellationToken);

            var subjResponses = responses.Where(r => r.Attempt != null && r.Attempt.SubjectId == subj.Id).ToList();
            int subjPracticed = subjResponses.Count;
            int subjCorrect = subjResponses.Count(r => r.IsCorrect == true);
            double subjAccuracy = subjPracticed > 0 ? Math.Round((double)subjCorrect / subjPracticed * 100.0, 1) : 0.0;
            double progressPercent = subjTotalLessons > 0 ? Math.Round((double)subjCompletedLessons / subjTotalLessons * 100.0, 1) : 0.0;

            subjectProgressList.Add(new SubjectDashboardProgressDto
            {
                SubjectId = subj.Id,
                SubjectName = subj.Name,
                CompletedLessons = subjCompletedLessons,
                TotalLessons = subjTotalLessons,
                QuestionsPracticed = subjPracticed,
                AccuracyRate = subjAccuracy,
                ProgressPercent = progressPercent
            });
        }

        // 6. Recent Attempts
        var recentAttempts = await _db.AssessmentAttempts.AsNoTracking()
            .Where(a => a.UserId == userId && a.CompletionStatus == "completed")
            .OrderByDescending(a => a.CompletedAt ?? a.StartedAt)
            .Take(5)
            .ToListAsync(cancellationToken);

        var recentAttemptDtos = recentAttempts.Select(a => new RecentPracticeAttemptDto
        {
            AttemptId = a.Id,
            SubjectId = a.SubjectId,
            Mode = a.AssessmentId == "asmt_exam" ? "Thi thử" : "Luyện tập",
            ScoreScaled = a.ScoreScaled ?? 0.0,
            TotalQuestions = (int)(a.ScoreMax > 0 ? a.ScoreMax : 10),
            CorrectCount = (int)(a.ScoreRaw ?? 0),
            CompletedAt = a.CompletedAt ?? a.StartedAt
        }).ToList();

        long totalSessionTimeMs = await _db.AssessmentAttempts.AsNoTracking()
            .Where(a => a.UserId == userId)
            .SumAsync(a => (long)a.SessionTimeMs, cancellationToken);
        int totalStudyMinutes = (int)(totalSessionTimeMs / 60000);

        return new LearnerDashboardStatsDto
        {
            CompletedLessons = completedLessons,
            TotalQuestionsPracticed = totalPracticed,
            TotalCorrectAnswers = totalCorrect,
            AccuracyRate = accuracyRate,
            StreakDays = streak,
            TotalMistakes = totalMistakes,
            DueReviewsCount = dueCount,
            TotalStudyMinutes = totalStudyMinutes,
            SubjectProgress = subjectProgressList,
            RecentAttempts = recentAttemptDtos
        };
    }

    public async Task<List<LeaderboardItemDto>> GetLeaderboardAsync(
        string userId,
        int limit = 10,
        CancellationToken cancellationToken = default)
    {
        var users = await _db.Users.AsNoTracking()
            .Where(u => !u.IsDeleted && (u.Role == "learner" || u.Role == "student"))
            .ToListAsync(cancellationToken);

        var activeUserIds = users.Select(u => u.Id).ToList();

        var correctCounts = await _db.AssessmentResponses.AsNoTracking()
            .Where(r => r.Attempt != null && activeUserIds.Contains(r.Attempt.UserId) && r.IsCorrect == true)
            .GroupBy(r => r.Attempt!.UserId)
            .Select(g => new { UserId = g.Key, CorrectCount = g.Count() })
            .ToDictionaryAsync(g => g.UserId, g => g.CorrectCount, cancellationToken);

        var rankedList = users
            .Select(u =>
            {
                int correct = correctCounts.TryGetValue(u.Id, out var c) ? c : 0;
                int xp = correct * 10;
                return new
                {
                    User = u,
                    Xp = xp
                };
            })
            .OrderByDescending(x => x.Xp)
            .ThenBy(x => x.User.DisplayName)
            .Take(Math.Clamp(limit, 1, 50))
            .ToList();

        var result = new List<LeaderboardItemDto>();
        int rank = 1;
        foreach (var item in rankedList)
        {
            result.Add(new LeaderboardItemDto
            {
                Rank = rank++,
                Id = item.User.Id,
                Name = item.User.DisplayName ?? "Học sinh",
                Grade = item.User.Grade ?? "12",
                Xp = item.Xp,
                Streak = Math.Min(item.Xp / 50, 30),
                IsCurrentUser = item.User.Id == userId
            });
        }

        return result;
    }

    private static bool EvaluateAnswer(ContentQuestion question, string studentAnswer)
    {
        if (string.IsNullOrWhiteSpace(studentAnswer) || string.IsNullOrWhiteSpace(question.CorrectAnswer))
            return false;

        var cleanStudent = studentAnswer.Trim().ToLowerInvariant();
        var cleanCorrect = question.CorrectAnswer.Trim().ToLowerInvariant();

        if (cleanStudent == cleanCorrect) return true;

        if (question.Type == "true-false-group" || question.Type == "true_false_group")
        {
            var partsS = cleanStudent.Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries).Select(p => p.Trim()).ToList();
            var partsC = cleanCorrect.Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries).Select(p => p.Trim()).ToList();
            if (partsS.Count == partsC.Count && partsS.Count > 0)
            {
                return partsS.SequenceEqual(partsC);
            }
        }

        if (question.Type == "short-answer" || question.Type == "short_answer")
        {
            var acceptedAnswers = new List<string> { cleanCorrect };
            if (!string.IsNullOrEmpty(question.MetadataJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(question.MetadataJson);
                    if (doc.RootElement.TryGetProperty("acceptedAnswers", out var accElem) && accElem.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var a in accElem.EnumerateArray())
                        {
                            var s = a.GetString();
                            if (!string.IsNullOrEmpty(s)) acceptedAnswers.Add(s.Trim().ToLowerInvariant());
                        }
                    }
                }
                catch { }
            }

            return acceptedAnswers.Contains(cleanStudent);
        }

        return false;
    }

    private async Task<List<ContentQuestion>> SelectAdaptiveQuestionsAsync(
        IQueryable<ContentQuestion> eligibleQuery,
        CreatePracticeSessionRequest request,
        int limit,
        string currentUserId,
        CancellationToken cancellationToken)
    {
        StudentKnowledgeProfileDto? profile = null;
        if (_masteryService != null)
        {
            try
            {
                profile = await _masteryService.GetStudentKnowledgeProfileAsync(currentUserId, request.SubjectId, cancellationToken);
            }
            catch { }
        }

        var recentCutoff = _clock.UtcNow.AddDays(-3);
        var recentAnsweredIds = await _db.AssessmentResponses.AsNoTracking()
            .Where(r => r.Attempt != null && r.Attempt.UserId == currentUserId && r.Attempt.LastActivityAt >= recentCutoff)
            .Select(r => r.QuestionId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var allAvailable = await eligibleQuery.ToListAsync(cancellationToken);
        if (allAvailable.Count == 0) return new List<ContentQuestion>();

        var status = profile?.OverallStatus ?? "insufficient_data";
        var weakTopicNames = profile?.WeakTopics.Select(w => w.TopicName.ToLowerInvariant()).ToList() ?? new List<string>();

        var rng = new Random();
        var scoredList = allAvailable.Select(q =>
        {
            double score = rng.NextDouble() * 5.0;
            var qDiff = q.Difficulty?.ToLowerInvariant() ?? "thong_hieu";

            if (status == "needs_reinforcement" || (status == "progressing" && (profile?.OverallMasteryScore ?? 0) < 60))
            {
                if (qDiff == "nhan_biet" || qDiff == "easy") score += 35;
                else if (qDiff == "thong_hieu" || qDiff == "medium") score += 20;
                else score -= 20;
            }
            else if (status == "mastered" || (status == "proficient" && (profile?.OverallMasteryScore ?? 0) >= 80))
            {
                if (qDiff == "van_dung" || qDiff == "hard") score += 35;
                else if (qDiff == "van_dung_cao" || qDiff == "very-hard" || qDiff == "very_hard") score += 25;
                else if (qDiff == "thong_hieu" || qDiff == "medium") score += 15;
                else score += 5;
            }
            else
            {
                if (qDiff == "thong_hieu" || qDiff == "medium") score += 35;
                else if (qDiff == "van_dung" || qDiff == "hard") score += 20;
                else if (qDiff == "nhan_biet" || qDiff == "easy") score += 15;
            }

            if (!string.IsNullOrWhiteSpace(q.Topic) && weakTopicNames.Any(w => q.Topic.ToLowerInvariant().Contains(w)))
            {
                score += 25;
            }

            if (recentAnsweredIds.Contains(q.Id))
            {
                score -= 40;
            }

            return new { Question = q, Score = score };
        })
        .OrderByDescending(x => x.Score)
        .Take(limit)
        .Select(x => x.Question)
        .ToList();

        return scoredList;
    }
}