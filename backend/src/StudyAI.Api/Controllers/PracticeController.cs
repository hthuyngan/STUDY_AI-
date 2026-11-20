using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/practice")]
public class PracticeController : ControllerBase
{
    private readonly StudyAIDbContext _db;
    private readonly IStudentMasteryService? _masteryService;
    private readonly IRevisionPlannerService? _revisionPlannerService;

    public PracticeController(
        StudyAIDbContext db,
        IStudentMasteryService? masteryService = null,
        IRevisionPlannerService? revisionPlannerService = null)
    {
        _db = db;
        _masteryService = masteryService;
        _revisionPlannerService = revisionPlannerService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");

    private bool IsStaffOrAdmin =>
        User.IsInRole("admin") || User.IsInRole("teacher") || User.IsInRole("content");

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. PRACTICE & EXAM SESSION ENGINE
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession([FromBody] CreatePracticeSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SubjectId))
        {
            return BadRequest(new { detail = "Mã môn học (SubjectId) là bắt buộc." });
        }

        // Query active, published questions matching criteria with verified correct answers
        var query = _db.ContentQuestions.AsNoTracking()
            .Where(q => !q.IsDeleted && q.Status == "published" && !string.IsNullOrWhiteSpace(q.CorrectAnswer));

        // Subject filter
        query = query.Where(q => q.SubjectId == request.SubjectId);

        // Optional chapter filter
        if (!string.IsNullOrWhiteSpace(request.ChapterId))
        {
            query = query.Where(q => q.ChapterId == request.ChapterId);
        }

        // Optional lesson filter
        if (!string.IsNullOrWhiteSpace(request.LessonId))
        {
            query = query.Where(q => q.LessonId == request.LessonId);
        }

        // Optional difficulty filter
        if (!string.IsNullOrWhiteSpace(request.Difficulty) && request.Difficulty != "all")
        {
            var diff = request.Difficulty.Trim().ToLowerInvariant();
            query = query.Where(q => q.Difficulty == diff ||
                (diff == "easy" && q.Difficulty == "nhan_biet") ||
                (diff == "medium" && q.Difficulty == "thong_hieu") ||
                (diff == "hard" && q.Difficulty == "van_dung") ||
                (diff == "very-hard" && q.Difficulty == "van_dung_cao"));
        }

        var totalAvailable = await query.CountAsync();
        if (totalAvailable == 0)
        {
            return NotFound(new { detail = "Không tìm thấy câu hỏi phù hợp với yêu cầu." });
        }

        var limit = Math.Clamp(request.QuestionCount > 0 ? request.QuestionCount : 10, 1, 50);

        List<ContentQuestion> selectedQuestions;
        if (request.Mode == "adaptive")
        {
            selectedQuestions = await SelectAdaptiveQuestionsAsync(request, limit, CurrentUserId);
            if (selectedQuestions.Count == 0)
            {
                selectedQuestions = await query.OrderBy(q => Guid.NewGuid()).Take(limit).ToListAsync();
            }
        }
        else
        {
            // Randomly sample questions using Guid.NewGuid() (translates to NEWID() in SQL Server)
            selectedQuestions = await query
                .OrderBy(q => Guid.NewGuid())
                .Take(limit)
                .ToListAsync();
        }

        var sessionId = $"sess_{Guid.NewGuid():N}";
        var now = DateTimeOffset.UtcNow;
        DateTimeOffset? expiresAt = null;

        var timeLimit = request.TimeLimitMinutes;
        if (request.Mode == "exam" && (!timeLimit.HasValue || timeLimit.Value <= 0))
        {
            // Default exam times: 90 mins for Math/50q, 50 mins for Physics/40q, 60 mins for others
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
            ["answers"] = new JsonObject()
        };

        var attempt = new AssessmentAttempt
        {
            Id = sessionId,
            UserId = CurrentUserId,
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
        await _db.SaveChangesAsync();

        // Return ZERO-LEAK questions (no correct answers or explanations)
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

        return Ok(new PracticeSessionResponseDto
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
        });
    }

    [HttpGet("sessions/{sessionId}")]
    public async Task<IActionResult> GetSession(string sessionId)
    {
        var attempt = await _db.AssessmentAttempts.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == sessionId);

        if (attempt == null)
        {
            return NotFound(new { detail = $"Không tìm thấy phiên làm bài '{sessionId}'." });
        }

        if (attempt.UserId != CurrentUserId && !IsStaffOrAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền truy cập phiên làm bài của người khác." });
        }

        List<string> questionIds = new();
        var savedAnswers = new Dictionary<string, string>();
        int? timeLimit = null;
        DateTimeOffset? expiresAt = null;
        string mode = "practice";

        if (!string.IsNullOrEmpty(attempt.SuspendDataJson))
        {
            try
            {
                var doc = JsonDocument.Parse(attempt.SuspendDataJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("mode", out var m)) mode = m.GetString() ?? "practice";
                if (root.TryGetProperty("timeLimitMinutes", out var tl) && tl.ValueKind == JsonValueKind.Number)
                    timeLimit = tl.GetInt32();
                if (root.TryGetProperty("expiresAt", out var exp) && exp.ValueKind == JsonValueKind.String)
                {
                    if (DateTimeOffset.TryParse(exp.GetString(), out var expParsed)) expiresAt = expParsed;
                }
                if (root.TryGetProperty("questionIds", out var qIdsElem) && qIdsElem.ValueKind == JsonValueKind.Array)
                {
                    foreach (var elem in qIdsElem.EnumerateArray())
                    {
                        var s = elem.GetString();
                        if (!string.IsNullOrEmpty(s)) questionIds.Add(s);
                    }
                }
                if (root.TryGetProperty("answers", out var ansElem) && ansElem.ValueKind == JsonValueKind.Object)
                {
                    foreach (var prop in ansElem.EnumerateObject())
                    {
                        savedAnswers[prop.Name] = prop.Value.GetString() ?? string.Empty;
                    }
                }
            }
            catch { }
        }

        var questionsFromDb = await _db.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id);

        // Maintain order of questionIds
        var questionDtos = questionIds
            .Where(id => questionsFromDb.ContainsKey(id))
            .Select(id =>
            {
                var q = questionsFromDb[id];
                return new PracticeQuestionDto
                {
                    Id = q.Id,
                    Prompt = q.Prompt,
                    Options = SafeDeserializeStringList(q.OptionsJson),
                    ImageUrl = q.ImageUrl,
                    Difficulty = q.Difficulty,
                    Type = q.Type,
                    Topic = q.Topic,
                    SubjectId = q.SubjectId
                };
            }).ToList();

        return Ok(new PracticeSessionResponseDto
        {
            SessionId = attempt.Id,
            SubjectId = attempt.SubjectId,
            LessonId = attempt.LessonId,
            Mode = mode,
            QuestionCount = questionDtos.Count,
            TimeLimitMinutes = timeLimit,
            StartedAt = attempt.StartedAt,
            ExpiresAt = expiresAt,
            Status = attempt.CompletionStatus,
            Questions = questionDtos,
            SavedAnswers = savedAnswers
        });
    }

    [HttpPost("sessions/{sessionId}/answer")]
    public async Task<IActionResult> SaveAnswer(string sessionId, [FromBody] SaveAnswerRequest request)
    {
        var attempt = await _db.AssessmentAttempts
            .FirstOrDefaultAsync(a => a.Id == sessionId);

        if (attempt == null)
        {
            return NotFound(new { detail = $"Không tìm thấy phiên làm bài '{sessionId}'." });
        }

        if (attempt.UserId != CurrentUserId && !IsStaffOrAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền chỉnh sửa phiên làm bài của người khác." });
        }

        if (attempt.CompletionStatus != "in_progress")
        {
            return BadRequest(new { detail = $"Phiên làm bài đã ở trạng thái '{attempt.CompletionStatus}', không thể sửa câu trả lời." });
        }

        // Time Expiration Guard (Allow 2 minutes grace period for network jitter)
        if (!string.IsNullOrEmpty(attempt.SuspendDataJson))
        {
            try
            {
                var doc = JsonDocument.Parse(attempt.SuspendDataJson);
                if (doc.RootElement.TryGetProperty("expiresAt", out var expElem) &&
                    expElem.ValueKind == JsonValueKind.String &&
                    DateTimeOffset.TryParse(expElem.GetString(), out var expParsed) &&
                    DateTimeOffset.UtcNow > expParsed.AddMinutes(2))
                {
                    return BadRequest(new { detail = "Thời gian làm bài thi đã hết. Vui lòng nộp bài để hoàn tất phiên thi." });
                }
            }
            catch { }
        }

        JsonObject suspendObj;
        try
        {
            suspendObj = !string.IsNullOrEmpty(attempt.SuspendDataJson)
                ? (JsonObject.Parse(attempt.SuspendDataJson) as JsonObject ?? new JsonObject())
                : new JsonObject();
        }
        catch
        {
            suspendObj = new JsonObject();
        }

        if (!suspendObj.ContainsKey("answers") || suspendObj["answers"] is not JsonObject)
        {
            suspendObj["answers"] = new JsonObject();
        }

        var answersObj = (JsonObject)suspendObj["answers"]!;
        answersObj[request.QuestionId] = request.Answer;

        attempt.SuspendDataJson = suspendObj.ToJsonString();
        attempt.LastActivityAt = DateTimeOffset.UtcNow;
        if (request.TimeSpentMs > 0)
        {
            attempt.SessionTimeMs += request.TimeSpentMs;
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, savedCount = answersObj.Count });
    }

    [HttpPost("sessions/{sessionId}/check-question")]
    public async Task<IActionResult> CheckSingleQuestion(string sessionId, [FromBody] CheckQuestionRequest request)
    {
        var attempt = await _db.AssessmentAttempts.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == sessionId);

        if (attempt == null)
        {
            return NotFound(new { detail = $"Không tìm thấy phiên làm bài '{sessionId}'." });
        }

        if (attempt.UserId != CurrentUserId && !IsStaffOrAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền truy cập phiên làm bài này." });
        }

        // ANTI-CHEAT: In exam mode, students CANNOT view answers before submitting!
        if (attempt.AssessmentId == "asmt_exam")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Không được phép xem đáp án trong chế độ thi thử trước khi nộp bài." });
        }

        if (attempt.CompletionStatus != "in_progress")
        {
            return BadRequest(new { detail = $"Phiên làm bài ở trạng thái '{attempt.CompletionStatus}', không thể kiểm tra câu hỏi." });
        }

        // Validate question belongs to this session
        if (!string.IsNullOrEmpty(attempt.SuspendDataJson))
        {
            try
            {
                var doc = JsonDocument.Parse(attempt.SuspendDataJson);
                if (doc.RootElement.TryGetProperty("questionIds", out var qIdsElem) && qIdsElem.ValueKind == JsonValueKind.Array)
                {
                    var qIds = qIdsElem.EnumerateArray().Select(x => x.GetString()).Where(x => !string.IsNullOrEmpty(x)).ToList();
                    if (!qIds.Contains(request.QuestionId))
                    {
                        return BadRequest(new { detail = "Câu hỏi không thuộc phiên làm bài này." });
                    }
                }
            }
            catch { }
        }

        var question = await _db.ContentQuestions.AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId && !q.IsDeleted && q.Status == "published");
        if (question == null)
        {
            return NotFound(new { detail = $"Không tìm thấy câu hỏi published '{request.QuestionId}'." });
        }

        var options = SafeDeserializeStringList(question.OptionsJson);
        var isCorrect = CheckQuestionAnswer(question, request.Answer, options);

        return Ok(new CheckQuestionResponse
        {
            QuestionId = question.Id,
            IsCorrect = isCorrect,
            CorrectAnswer = question.CorrectAnswer,
            Explanation = question.Explanation
        });
    }

    [HttpPost("sessions/{sessionId}/submit")]
    public async Task<IActionResult> SubmitSession(string sessionId, [FromBody] SubmitPracticeSessionRequest request)
    {
        var attempt = await _db.AssessmentAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == sessionId);

        if (attempt == null)
        {
            return NotFound(new { detail = $"Không tìm thấy phiên làm bài '{sessionId}'." });
        }

        if (attempt.UserId != CurrentUserId && !IsStaffOrAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền nộp bài cho học sinh khác." });
        }

        // Anti double-submit: if already completed, compute from existing responses
        if (attempt.CompletionStatus == "completed")
        {
            return await BuildCompletedResult(attempt);
        }

        List<string> questionIds = new();
        string mode = "practice";
        DateTimeOffset? expiresAt = null;
        var savedAnswersBeforeDeadline = new Dictionary<string, string>();

        if (!string.IsNullOrEmpty(attempt.SuspendDataJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(attempt.SuspendDataJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("mode", out var m)) mode = m.GetString() ?? "practice";
                if (root.TryGetProperty("expiresAt", out var expElem) &&
                    expElem.ValueKind == JsonValueKind.String &&
                    DateTimeOffset.TryParse(expElem.GetString(), out var expParsed))
                {
                    expiresAt = expParsed;
                }
                if (root.TryGetProperty("answers", out var ansElem) && ansElem.ValueKind == JsonValueKind.Object)
                {
                    foreach (var prop in ansElem.EnumerateObject())
                    {
                        var val = prop.Value.GetString();
                        if (!string.IsNullOrEmpty(val))
                        {
                            savedAnswersBeforeDeadline[prop.Name] = val;
                        }
                    }
                }
                if (root.TryGetProperty("questionIds", out var qIdsElem) && qIdsElem.ValueKind == JsonValueKind.Array)
                {
                    foreach (var elem in qIdsElem.EnumerateArray())
                    {
                        var s = elem.GetString();
                        if (!string.IsNullOrEmpty(s)) questionIds.Add(s);
                    }
                }
            }
            catch { }
        }

        // Deadline Guard: Enforce exam time limit with a 2-minute network grace period
        bool isTimedExam = (mode == "exam" || attempt.AssessmentId == "asmt_exam") && expiresAt.HasValue;
        var gracePeriod = TimeSpan.FromMinutes(2);
        bool isSubmissionPastDeadline = isTimedExam && (DateTimeOffset.UtcNow > expiresAt!.Value + gracePeriod);

        // If submitted past deadline + grace period, strictly restrict grading to answers autosaved before expiration
        var effectiveAnswers = isSubmissionPastDeadline ? savedAnswersBeforeDeadline : request.Answers;

        if (questionIds.Count == 0 && effectiveAnswers.Count > 0)
        {
            questionIds = effectiveAnswers.Keys.ToList();
        }

        var questions = await _db.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id);

        int correctCount = 0;
        int incorrectCount = 0;
        int unansweredCount = 0;
        var detailedResults = new List<QuestionResultItemDto>();
        var perfByDiff = new Dictionary<string, (int correct, int total)>();

        var now = DateTimeOffset.UtcNow;

        foreach (var qId in questionIds)
        {
            if (!questions.TryGetValue(qId, out var q)) continue;

            var options = SafeDeserializeStringList(q.OptionsJson);
            effectiveAnswers.TryGetValue(qId, out var studentAns);
            studentAns ??= string.Empty;

            bool isAnswered = !string.IsNullOrWhiteSpace(studentAns);
            bool isCorrect = false;

            if (isAnswered)
            {
                isCorrect = CheckQuestionAnswer(q, studentAns, options);
                if (isCorrect) correctCount++;
                else incorrectCount++;
            }
            else
            {
                unansweredCount++;
            }

            var diff = string.IsNullOrWhiteSpace(q.Difficulty) ? "medium" : q.Difficulty.ToLowerInvariant();
            if (!perfByDiff.ContainsKey(diff)) perfByDiff[diff] = (0, 0);
            perfByDiff[diff] = (perfByDiff[diff].correct + (isCorrect ? 1 : 0), perfByDiff[diff].total + 1);

            detailedResults.Add(new QuestionResultItemDto
            {
                QuestionId = q.Id,
                Prompt = q.Prompt,
                Options = options,
                StudentAnswer = studentAns,
                CorrectAnswer = q.CorrectAnswer,
                IsCorrect = isCorrect,
                Explanation = q.Explanation,
                Difficulty = q.Difficulty
            });

            // Record into AssessmentResponse
            var resp = attempt.Responses.FirstOrDefault(r => r.QuestionId == qId);
            if (resp == null)
            {
                resp = new AssessmentResponse
                {
                    AttemptId = attempt.Id,
                    QuestionId = qId,
                    SelectedOptionIdsJson = JsonSerializer.Serialize(new List<string> { studentAns }),
                    FirstAnsweredAt = now,
                    LastAnsweredAt = now,
                    ChangeCount = 1,
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

        int totalCount = detailedResults.Count;
        double scoreRaw = correctCount;
        double scoreScaled = totalCount > 0 ? Math.Round((double)correctCount / totalCount * 10.0, 2) : 0.0;
        bool passed = scoreScaled >= 5.0;

        attempt.CompletionStatus = "completed";
        attempt.SuccessStatus = passed ? "passed" : "failed";
        attempt.ScoreRaw = scoreRaw;
        attempt.ScoreMin = 0.0;
        attempt.ScoreMax = totalCount > 0 ? (double)totalCount : 10.0;
        attempt.ScoreScaled = scoreScaled;
        attempt.ProgressMeasure = 1.0;
        attempt.CompletedAt = now;
        attempt.LastActivityAt = now;
        if (request.SessionTimeMs > 0)
        {
            attempt.SessionTimeMs = request.SessionTimeMs;
        }

        await _db.SaveChangesAsync();

        if (_masteryService != null)
        {
            try
            {
                await _masteryService.UpdateMasteryFromAttemptAsync(attempt.UserId, attempt.Id);
            }
            catch
            {
                // Non-blocking mastery update
            }
        }

        if (_revisionPlannerService != null && (mode == "exam" || attempt.AssessmentId == "asmt_exam"))
        {
            try
            {
                await _revisionPlannerService.AutoAdjustPlanAfterExamAsync(attempt.UserId, attempt.SubjectId, attempt.Id);
            }
            catch
            {
                // Non-blocking revision plan auto adjustment
            }
        }

        var diffStats = perfByDiff.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.total > 0 ? Math.Round((double)kvp.Value.correct / kvp.Value.total * 100.0, 1) : 0.0
        );

        return Ok(new PracticeResultDto
        {
            ResultId = $"res_{attempt.Id}",
            SessionId = attempt.Id,
            SubjectId = attempt.SubjectId,
            Mode = mode,
            TotalQuestions = totalCount,
            CorrectCount = correctCount,
            IncorrectCount = incorrectCount,
            UnansweredCount = unansweredCount,
            ScoreRaw = scoreRaw,
            ScoreScaled = scoreScaled,
            Passed = passed,
            TimeSpentSeconds = attempt.SessionTimeMs / 1000,
            CompletedAt = now,
            Questions = detailedResults,
            PerformanceByDifficulty = diffStats
        });
    }

    private async Task<IActionResult> BuildCompletedResult(AssessmentAttempt attempt)
    {
        var responses = attempt.Responses.ToList();
        var qIds = responses.Select(r => r.QuestionId).ToList();
        var questions = await _db.ContentQuestions.AsNoTracking()
            .Where(q => qIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id);

        var detailedResults = new List<QuestionResultItemDto>();
        int correct = 0;
        int incorrect = 0;
        int unanswered = 0;

        foreach (var r in responses)
        {
            if (!questions.TryGetValue(r.QuestionId, out var q)) continue;
            var opts = SafeDeserializeStringList(q.OptionsJson);
            var selectedList = SafeDeserializeStringList(r.SelectedOptionIdsJson);
            var studentAns = selectedList.FirstOrDefault() ?? string.Empty;
            bool isCorrect = r.IsCorrect ?? false;
            if (string.IsNullOrEmpty(studentAns)) unanswered++;
            else if (isCorrect) correct++;
            else incorrect++;

            detailedResults.Add(new QuestionResultItemDto
            {
                QuestionId = q.Id,
                Prompt = q.Prompt,
                Options = opts,
                StudentAnswer = studentAns,
                CorrectAnswer = q.CorrectAnswer,
                IsCorrect = isCorrect,
                Explanation = q.Explanation,
                Difficulty = q.Difficulty
            });
        }

        return Ok(new PracticeResultDto
        {
            ResultId = $"res_{attempt.Id}",
            SessionId = attempt.Id,
            SubjectId = attempt.SubjectId,
            Mode = attempt.AssessmentId == "asmt_exam" ? "exam" : "practice",
            TotalQuestions = detailedResults.Count,
            CorrectCount = correct,
            IncorrectCount = incorrect,
            UnansweredCount = unanswered,
            ScoreRaw = attempt.ScoreRaw ?? correct,
            ScoreScaled = attempt.ScoreScaled ?? (detailedResults.Count > 0 ? Math.Round((double)correct / detailedResults.Count * 10.0, 2) : 0),
            Passed = (attempt.ScoreScaled ?? 0) >= 5.0,
            TimeSpentSeconds = attempt.SessionTimeMs / 1000,
            CompletedAt = attempt.CompletedAt ?? DateTimeOffset.UtcNow,
            Questions = detailedResults
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. MISTAKE BOOK & SMART REVIEW (SPACED REPETITION / LEITNER SYSTEM)
    // ─────────────────────────────────────────────────────────────────────────────

    private static readonly int[] LeitnerIntervalsDays = { 1, 3, 7, 14, 30 };

    [HttpGet("mistakes")]
    public async Task<IActionResult> GetMistakes([FromQuery] string? subjectId = null)
    {
        // Find questions where the user had an incorrect answer
        var query = _db.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == CurrentUserId && r.IsCorrect == false);

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            query = query.Where(r => r.Attempt!.SubjectId == subjectId);
        }

        var responses = await query
            .OrderByDescending(r => r.LastAnsweredAt ?? r.FirstAnsweredAt)
            .ToListAsync();

        if (responses.Count == 0)
        {
            return Ok(new List<MistakeItemDto>());
        }

        // Group by QuestionId to get latest attempt and mistake count
        var grouped = responses
            .GroupBy(r => r.QuestionId)
            .Select(g => new
            {
                QuestionId = g.Key,
                Count = g.Count(),
                LatestResponse = g.First()
            })
            .ToList();

        var qIds = grouped.Select(g => g.QuestionId).ToList();
        var questions = await _db.ContentQuestions.AsNoTracking()
            .Where(q => qIds.Contains(q.Id) && !q.IsDeleted && q.Status == "published")
            .ToDictionaryAsync(q => q.Id);

        var today = DateTimeOffset.UtcNow.Date;
        var resultList = new List<MistakeItemDto>();

        foreach (var item in grouped)
        {
            if (!questions.TryGetValue(item.QuestionId, out var q)) continue;

            var lastAttemptDate = item.LatestResponse.LastAnsweredAt ?? item.LatestResponse.FirstAnsweredAt ?? DateTimeOffset.UtcNow;
            
            // Calculate Leitner Box (1..5) based on repeat mistakes
            int box = Math.Clamp(1, 1, 5);
            int intervalDays = LeitnerIntervalsDays[box - 1];
            var nextDueDate = lastAttemptDate.Date.AddDays(intervalDays);

            string status = "due";
            if (nextDueDate < today) status = "overdue";
            else if (nextDueDate == today) status = "due";
            else status = "upcoming";

            resultList.Add(new MistakeItemDto
            {
                QuestionId = q.Id,
                SubjectId = q.SubjectId ?? string.Empty,
                Prompt = q.Prompt,
                Options = SafeDeserializeStringList(q.OptionsJson),
                Difficulty = q.Difficulty,
                ImageUrl = q.ImageUrl,
                LastAttemptAt = lastAttemptDate,
                MistakeCount = item.Count,
                ReviewBox = box,
                NextReviewDate = nextDueDate.ToString("yyyy-MM-dd"),
                Status = status
            });
        }

        return Ok(resultList);
    }

    [HttpPost("mistakes/{questionId}/review")]
    public async Task<IActionResult> ReviewMistake(string questionId, [FromBody] ReviewMistakeRequest request)
    {
        var userId = CurrentUserId;
        var question = await _db.ContentQuestions.AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == questionId && !q.IsDeleted && q.Status == "published");
        if (question == null)
        {
            return NotFound(new { detail = $"Không tìm thấy câu hỏi published '{questionId}'." });
        }

        // 1. Assessment Integrity Guard: Prevent students from obtaining answers during an active exam
        var now = DateTimeOffset.UtcNow;
        var activeExamAttempts = await _db.AssessmentAttempts.AsNoTracking()
            .Where(a => a.UserId == userId &&
                        a.CompletionStatus == "in_progress" &&
                        (a.AssessmentId == "asmt_exam" || a.AssessmentId == "exam"))
            .ToListAsync();

        foreach (var exam in activeExamAttempts)
        {
            if (!string.IsNullOrEmpty(exam.SuspendDataJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(exam.SuspendDataJson);
                    var root = doc.RootElement;
                    DateTimeOffset? expiresAt = null;
                    if (root.TryGetProperty("expiresAt", out var expElem) &&
                        expElem.ValueKind == JsonValueKind.String &&
                        DateTimeOffset.TryParse(expElem.GetString(), out var expParsed))
                    {
                        expiresAt = expParsed;
                    }

                    if (!expiresAt.HasValue || expiresAt.Value > now)
                    {
                        if (root.TryGetProperty("questionIds", out var qIdsElem) && qIdsElem.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var elem in qIdsElem.EnumerateArray())
                            {
                                if (elem.GetString() == questionId)
                                {
                                    return StatusCode(StatusCodes.Status403Forbidden, new
                                    {
                                        detail = "Không thể xem đáp án hoặc ôn tập câu hỏi khi đang trong phiên làm bài thi kích hoạt."
                                    });
                                }
                            }
                        }
                    }
                }
                catch { }
            }
        }

        // 2. Review Eligibility Guard: Student must have previously answered this question incorrectly
        var hasPriorMistake = await _db.AssessmentResponses.AsNoTracking()
            .AnyAsync(r => r.Attempt != null && r.Attempt.UserId == userId && r.QuestionId == questionId && r.IsCorrect == false);

        if (!hasPriorMistake)
        {
            return BadRequest(new
            {
                detail = "Chỉ được phép ôn tập câu hỏi mà học sinh đã từng trả lời sai trong hệ thống."
            });
        }

        var options = SafeDeserializeStringList(question.OptionsJson);
        bool isCorrect = CheckQuestionAnswer(question, request.Answer, options);

        int oldBox = 1;
        int newBox = isCorrect ? Math.Min(oldBox + 1, 5) : 1;

        int intervalDays = LeitnerIntervalsDays[newBox - 1];
        var nextReviewDate = DateTimeOffset.UtcNow.Date.AddDays(intervalDays).ToString("yyyy-MM-dd");
        bool mastered = newBox >= 5 && isCorrect;

        // Record response
        var reviewAttemptId = $"att_rev_{Guid.NewGuid():N}";
        var reviewAttempt = new AssessmentAttempt
        {
            Id = reviewAttemptId,
            UserId = CurrentUserId,
            AssessmentId = "asmt_smart_review",
            SubjectId = question.SubjectId ?? "sub_math12",
            LessonId = question.LessonId ?? string.Empty,
            AttemptNumber = 1,
            StartedAt = DateTimeOffset.UtcNow,
            CompletedAt = DateTimeOffset.UtcNow,
            CompletionStatus = "completed",
            SuccessStatus = isCorrect ? "passed" : "failed",
            ScoreRaw = isCorrect ? 1.0 : 0.0,
            ScoreScaled = isCorrect ? 10.0 : 0.0,
            Responses = new List<AssessmentResponse>
            {
                new AssessmentResponse
                {
                    AttemptId = reviewAttemptId,
                    QuestionId = questionId,
                    SelectedOptionIdsJson = JsonSerializer.Serialize(new List<string> { request.Answer }),
                    FirstAnsweredAt = DateTimeOffset.UtcNow,
                    LastAnsweredAt = DateTimeOffset.UtcNow,
                    IsCorrect = isCorrect
                }
            }
        };

        _db.AssessmentAttempts.Add(reviewAttempt);
        await _db.SaveChangesAsync();

        return Ok(new ReviewMistakeResponse
        {
            QuestionId = questionId,
            IsCorrect = isCorrect,
            CorrectAnswer = question.CorrectAnswer,
            Explanation = question.Explanation,
            OldBox = oldBox,
            NewBox = newBox,
            NextReviewDate = nextReviewDate,
            Mastered = mastered
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. LEARNER DASHBOARD STATS AGGREGATION
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("dashboard-stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var userId = CurrentUserId;

        // 1. Completed Lessons
        var completedLessons = await _db.LessonProgresses.AsNoTracking()
            .CountAsync(p => p.UserId == userId && (p.OverallProgress >= 100 || p.ContentProgress >= 100));

        // 2. Questions Practiced & Correct Answers
        var responses = await _db.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == userId)
            .ToListAsync();

        int totalPracticed = responses.Count;
        int totalCorrect = responses.Count(r => r.IsCorrect == true);
        double accuracyRate = totalPracticed > 0 ? Math.Round((double)totalCorrect / totalPracticed * 100.0, 1) : 0.0;

        // 3. Mistakes & Due Reviews
        var incorrectResponses = responses.Where(r => r.IsCorrect == false).ToList();
        var mistakeQuestionIds = incorrectResponses.Select(r => r.QuestionId).Distinct().ToList();
        int totalMistakes = mistakeQuestionIds.Count;

        // Count due reviews today
        var today = DateTimeOffset.UtcNow.Date;
        int dueCount = 0;
        foreach (var qId in mistakeQuestionIds)
        {
            var latestWrong = incorrectResponses
                .Where(r => r.QuestionId == qId)
                .OrderByDescending(r => r.LastAnsweredAt ?? r.FirstAnsweredAt)
                .First();
            var date = (latestWrong.LastAnsweredAt ?? latestWrong.FirstAnsweredAt ?? DateTimeOffset.UtcNow).Date;
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
            .ToListAsync();

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
            .ToListAsync();

        var subjectProgressList = new List<SubjectDashboardProgressDto>();
        foreach (var subj in subjects)
        {
            var subjCompletedLessons = await _db.LessonProgresses.AsNoTracking()
                .CountAsync(p => p.UserId == userId && p.SubjectId == subj.Id && (p.OverallProgress >= 100 || p.ContentProgress >= 100));

            var subjTotalLessons = await _db.ContentLessons.AsNoTracking()
                .CountAsync(l => l.Chapter != null && l.Chapter.SubjectId == subj.Id && l.Status == "published");

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
            .ToListAsync();

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

        return Ok(new LearnerDashboardStatsDto
        {
            CompletedLessons = completedLessons,
            TotalQuestionsPracticed = totalPracticed,
            TotalCorrectAnswers = totalCorrect,
            AccuracyRate = accuracyRate,
            StreakDays = streak,
            TotalMistakes = totalMistakes,
            DueReviewsCount = dueCount,
            SubjectProgress = subjectProgressList,
            RecentAttempts = recentAttemptDtos
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    private static List<string> SafeDeserializeStringList(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            try
            {
                var sanitized = Regex.Replace(json, @"\\(?![\\""/bfnrtu])", @"\\\\");
                return JsonSerializer.Deserialize<List<string>>(sanitized) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }
    }

    private static bool CheckQuestionAnswer(ContentQuestion question, string studentAnswer, List<string> options)
    {
        if (string.IsNullOrWhiteSpace(studentAnswer) || string.IsNullOrWhiteSpace(question.CorrectAnswer))
            return false;

        string normStudent = NormalizeAnswer(studentAnswer);
        string normCorrect = NormalizeAnswer(question.CorrectAnswer);

        if (normStudent == normCorrect) return true;

        var optMatch = Regex.Match(studentAnswer, @"opt_\d+_([A-Da-d])");
        if (optMatch.Success)
        {
            string letter = optMatch.Groups[1].Value.ToUpperInvariant();
            if (letter == normCorrect.ToUpperInvariant()) return true;

            int letterIndex = letter[0] - 'A';
            if (letterIndex >= 0 && letterIndex < options.Count)
            {
                if (NormalizeAnswer(options[letterIndex]) == normCorrect) return true;
            }
        }

        if (studentAnswer.Length == 1 && char.IsLetter(studentAnswer[0]))
        {
            string studentLetter = studentAnswer.ToUpperInvariant();
            if (studentLetter == normCorrect.ToUpperInvariant()) return true;

            int letterIndex = studentLetter[0] - 'A';
            if (letterIndex >= 0 && letterIndex < options.Count)
            {
                if (NormalizeAnswer(options[letterIndex]) == normCorrect) return true;
            }
        }

        if (normCorrect.Length == 1 && char.IsLetter(normCorrect[0]))
        {
            int correctIndex = char.ToUpperInvariant(normCorrect[0]) - 'A';
            if (correctIndex >= 0 && correctIndex < options.Count)
            {
                if (NormalizeAnswer(options[correctIndex]) == normStudent) return true;
            }
        }

        return false;
    }

    private static string NormalizeAnswer(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var t = text.Trim().ToLowerInvariant();
        t = Regex.Replace(t, @"^[a-d][\.\:\)\s]+", string.Empty);
        t = Regex.Replace(t, @"\s+", " ");
        t = t.TrimEnd('.', ';', ',');
        return t;
    }

    private async Task<List<ContentQuestion>> SelectAdaptiveQuestionsAsync(
        CreatePracticeSessionRequest request,
        int limit,
        string currentUserId)
    {
        StudentKnowledgeProfileDto? profile = null;
        if (_masteryService != null)
        {
            try
            {
                profile = await _masteryService.GetStudentKnowledgeProfileAsync(currentUserId, request.SubjectId);
            }
            catch { }
        }

        // Anti-repetition: fetch questions answered in recent 3 days
        var recentCutoff = DateTimeOffset.UtcNow.AddDays(-3);
        var recentAnsweredIds = await _db.AssessmentResponses.AsNoTracking()
            .Where(r => r.Attempt != null && r.Attempt.UserId == currentUserId && r.Attempt.LastActivityAt >= recentCutoff)
            .Select(r => r.QuestionId)
            .Distinct()
            .ToListAsync();

        var baseQuery = _db.ContentQuestions.AsNoTracking()
            .Where(q => !q.IsDeleted && q.Status == "published" && !string.IsNullOrWhiteSpace(q.CorrectAnswer) && q.SubjectId == request.SubjectId);

        if (!string.IsNullOrWhiteSpace(request.ChapterId))
        {
            baseQuery = baseQuery.Where(q => q.ChapterId == request.ChapterId);
        }
        if (!string.IsNullOrWhiteSpace(request.LessonId))
        {
            baseQuery = baseQuery.Where(q => q.LessonId == request.LessonId);
        }

        var allAvailable = await baseQuery.ToListAsync();
        if (allAvailable.Count == 0) return new List<ContentQuestion>();

        var status = profile?.OverallStatus ?? "insufficient_data";
        var weakTopicNames = profile?.WeakTopics.Select(w => w.TopicName.ToLowerInvariant()).ToList() ?? new List<string>();

        var rng = new Random();
        var scoredList = allAvailable.Select(q =>
        {
            double score = rng.NextDouble() * 5.0; // Random jitter for diversity
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

            // Weak topic prioritization
            if (!string.IsNullOrWhiteSpace(q.Topic) && weakTopicNames.Any(w => q.Topic.ToLowerInvariant().Contains(w)))
            {
                score += 25;
            }

            // Anti-repetition penalty
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
