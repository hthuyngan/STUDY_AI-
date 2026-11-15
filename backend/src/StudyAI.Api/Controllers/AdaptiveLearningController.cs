using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/ai")]
public class AdaptiveLearningController : ControllerBase
{
    private readonly StudyAIDbContext _db;

    public AdaptiveLearningController(StudyAIDbContext db)
    {
        _db = db;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub") ??
        "guest_student";

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. MULTI-LEVEL HINT LADDER (3 CẤP ĐỘ GỢI Ý SOCRATIC)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpPost("hints")]
    public async Task<IActionResult> GetHint([FromBody] HintRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.QuestionId))
        {
            return BadRequest(new { detail = "Mã câu hỏi (QuestionId) là bắt buộc." });
        }

        var question = await _db.ContentQuestions.AsNoTracking()
            .Include(q => q.Lesson)
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId);

        if (question == null)
        {
            return NotFound(new { detail = $"Không tìm thấy câu hỏi '{request.QuestionId}'." });
        }

        int level = Math.Clamp(request.HintLevel, 1, 3);
        string levelName = level switch
        {
            1 => "Gợi ý định hướng (Cấp độ 1 - Khái niệm cốt lõi)",
            2 => "Gợi ý phương pháp (Cấp độ 2 - Hướng dẫn biến đổi)",
            _ => "Gợi ý bước then chốt (Cấp độ 3 - Mấu chốt kết quả)"
        };

        var mathFormulas = new List<string>();
        var nextSteps = new List<string>();
        string hintText;

        // Extract LaTeX math from question prompt
        var latexMatches = Regex.Matches(question.Prompt, @"(\$[^$]+\$|\$\$[^$]+\$\$)");
        foreach (Match m in latexMatches)
        {
            if (!mathFormulas.Contains(m.Value)) mathFormulas.Add(m.Value);
        }

        string topic = !string.IsNullOrWhiteSpace(question.Topic) ? question.Topic : "Kiến thức trọng tâm";

        if (level == 1)
        {
            hintText = $"💡 **Gợi ý định hướng:**\n" +
                       $"Hãy nhớ lại định lý hoặc tính chất liên quan đến chủ đề **{topic}**.\n" +
                       $"Quan sát kỹ giả thiết trong đề bài và xác định xem đại lượng nào là hằng số, đại lượng nào biến thiên.";
            nextSteps.Add("Xác định đại lượng cần tính");
            nextSteps.Add("Tra cứu lại định nghĩa liên quan");
        }
        else if (level == 2)
        {
            hintText = $"📐 **Gợi ý phương pháp:**\n" +
                       $"Để giải bài toán này, hãy thực hiện theo các bước:\n" +
                       $"1. Viết công thức tổng quát liên hệ giữa các đại lượng.\n" +
                       $"2. Thay các giá trị đã biết vào biểu thức.\n" +
                       $"3. Rút gọn hoặc biến đổi tương đương để đưa về phương trình cơ bản.";
            nextSteps.Add("Biến đổi biểu thức");
            nextSteps.Add("Loại trừ các phương án không phù hợp");
        }
        else
        {
            // Level 3: Point to critical step without giving away answer directly
            var explanationSnippet = !string.IsNullOrWhiteSpace(question.Explanation)
                ? question.Explanation.Split('\n').FirstOrDefault() ?? "Chú ý bước biến đổi then chốt."
                : "Tính toán bước cuối cùng để chọn đáp án tương ứng.";

            hintText = $"🎯 **Gợi ý bước then chốt:**\n" +
                       $"{explanationSnippet}\n" +
                       $"So sánh kết quả thu được với 4 phương án đề bài cho để chọn đáp án chính xác.";
            nextSteps.Add("Thực hiện phép tính cuối cùng");
            nextSteps.Add("Đối chiếu và chọn đáp án");
        }

        return Ok(new HintResponseDto
        {
            QuestionId = question.Id,
            HintLevel = level,
            HintLevelName = levelName,
            HintText = hintText,
            MathFormulas = mathFormulas,
            SuggestedNextSteps = nextSteps
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. SKILL MASTERY ENGINE (ĐÁNH GIÁ NĂNG LỰC GDPT 2018)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("mastery")]
    public async Task<IActionResult> GetSkillMastery([FromQuery] string? subjectId = null)
    {
        var userId = CurrentUserId;

        var query = _db.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == userId);

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            query = query.Where(r => r.Attempt!.SubjectId == subjectId);
        }

        var responses = await query.ToListAsync();

        if (responses.Count == 0)
        {
            return Ok(new SkillMasteryResponseDto
            {
                UserId = userId,
                OverallMasteryScore = 0.0,
                SkillsEvaluated = 0,
                SkillsMastered = 0,
                Skills = new List<SkillMasteryItemDto>()
            });
        }

        var questionIds = responses.Select(r => r.QuestionId).Distinct().ToList();
        var questions = await _db.ContentQuestions.AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id);

        // Group responses by Subject/Topic
        var groupedBySkill = responses
            .GroupBy(r =>
            {
                if (questions.TryGetValue(r.QuestionId, out var q))
                {
                    return !string.IsNullOrWhiteSpace(q.Topic) ? q.Topic : (q.SubjectId ?? "Chung");
                }
                return "Chung";
            })
            .ToList();

        var skillItems = new List<SkillMasteryItemDto>();

        foreach (var group in groupedBySkill)
        {
            var skillName = group.Key;
            var groupList = group.ToList();

            int total = groupList.Count;
            int correct = groupList.Count(r => r.IsCorrect == true);
            double masteryScore = total > 0 ? Math.Round((double)correct / total * 100.0, 1) : 0.0;

            string status = masteryScore switch
            {
                >= 90.0 => "mastered",
                >= 70.0 => "proficient",
                >= 40.0 => "developing",
                _ => "novice"
            };

            // Cognitive Level Breakdown (nhan_biet, thong_hieu, van_dung, van_dung_cao)
            var cogBreakdown = new Dictionary<string, CognitiveBreakdownDto>();
            var cogLevels = new[] { "nhan_biet", "thong_hieu", "van_dung", "van_dung_cao" };

            foreach (var cog in cogLevels)
            {
                var cogResponses = groupList.Where(r =>
                {
                    if (questions.TryGetValue(r.QuestionId, out var q))
                    {
                        var diff = q.Difficulty?.ToLowerInvariant();
                        return diff == cog ||
                               (cog == "nhan_biet" && diff == "easy") ||
                               (cog == "thong_hieu" && diff == "medium") ||
                               (cog == "van_dung" && diff == "hard") ||
                               (cog == "van_dung_cao" && diff == "very-hard");
                    }
                    return false;
                }).ToList();

                int cTotal = cogResponses.Count;
                int cCorrect = cogResponses.Count(r => r.IsCorrect == true);
                cogBreakdown[cog] = new CognitiveBreakdownDto
                {
                    Total = cTotal,
                    Correct = cCorrect,
                    AccuracyPercent = cTotal > 0 ? Math.Round((double)cCorrect / cTotal * 100.0, 1) : 0.0
                };
            }

            var latestAttempt = groupList.Max(r => r.LastAnsweredAt ?? r.FirstAnsweredAt);

            skillItems.Add(new SkillMasteryItemDto
            {
                SkillId = $"sk_{Math.Abs(skillName.GetHashCode())}",
                SkillName = skillName,
                SubjectId = subjectId ?? "sub_math12",
                MasteryScore = masteryScore,
                Status = status,
                TotalAttempted = total,
                TotalCorrect = correct,
                CognitiveBreakdown = cogBreakdown,
                LastAttemptAt = latestAttempt
            });
        }

        double overall = skillItems.Count > 0 ? Math.Round(skillItems.Average(s => s.MasteryScore), 1) : 0.0;
        int masteredCount = skillItems.Count(s => s.Status == "mastered");

        return Ok(new SkillMasteryResponseDto
        {
            UserId = userId,
            OverallMasteryScore = overall,
            SkillsEvaluated = skillItems.Count,
            SkillsMastered = masteredCount,
            Skills = skillItems
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. KNOWLEDGE GAP DETECTION (PHÁT HIỆN LỖ HỔNG KIẾN THỨC)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("knowledge-gaps")]
    public async Task<IActionResult> GetKnowledgeGaps([FromQuery] string? subjectId = null)
    {
        var userId = CurrentUserId;

        var query = _db.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == userId);

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            query = query.Where(r => r.Attempt!.SubjectId == subjectId);
        }

        var responses = await query.ToListAsync();

        if (responses.Count == 0)
        {
            return Ok(new List<KnowledgeGapDto>());
        }

        var questionIds = responses.Select(r => r.QuestionId).Distinct().ToList();
        var questions = await _db.ContentQuestions.AsNoTracking()
            .Include(q => q.Lesson)
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id);

        // Group by Topic/Skill
        var groups = responses
            .GroupBy(r =>
            {
                if (questions.TryGetValue(r.QuestionId, out var q))
                {
                    return !string.IsNullOrWhiteSpace(q.Topic) ? q.Topic : (q.SubjectId ?? "Chung");
                }
                return "Chung";
            })
            .ToList();

        var gaps = new List<KnowledgeGapDto>();

        foreach (var group in groups)
        {
            var list = group.ToList();
            int total = list.Count;
            int wrong = list.Count(r => r.IsCorrect == false);

            if (wrong == 0) continue; // No mistakes, no gap

            double accuracy = Math.Round((double)(total - wrong) / total * 100.0, 1);

            // A knowledge gap is detected if accuracy < 70% or repeat mistakes >= 2
            if (accuracy >= 70.0 && wrong < 2) continue;

            string severity = "minor";
            if (accuracy < 30.0 || wrong >= 3) severity = "critical";
            else if (accuracy < 50.0 || wrong >= 2) severity = "moderate";

            // Find related lesson if any
            var firstWrongQId = list.FirstOrDefault(r => r.IsCorrect == false)?.QuestionId;
            questions.TryGetValue(firstWrongQId ?? "", out var sampleQ);

            var lessonId = sampleQ?.LessonId;
            var lessonTitle = sampleQ?.Lesson?.Title ?? "Bài học liên quan";

            var actions = new List<string>
            {
                $"Ôn lại lý thuyết bài \"{lessonTitle}\"",
                $"Thực hiện 5 bài tập luyện tập chuyên sâu cho kỹ năng \"{group.Key}\"",
                "Hỏi Gia sư AI Tutor để được hướng dẫn giải thích từng bước"
            };

            gaps.Add(new KnowledgeGapDto
            {
                Id = $"gap_{Math.Abs(group.Key.GetHashCode())}",
                SkillId = $"sk_{Math.Abs(group.Key.GetHashCode())}",
                SkillName = group.Key,
                SubjectId = subjectId ?? sampleQ?.SubjectId ?? "sub_math12",
                Severity = severity,
                AccuracyPercent = accuracy,
                MistakeCount = wrong,
                EvidenceSummary = $"Trả lời chưa đúng {wrong}/{total} lần luyện tập về kỹ năng {group.Key} (Độ chính xác: {accuracy}%).",
                RecommendedLessonId = lessonId,
                RecommendedLessonTitle = lessonTitle,
                ActionSteps = actions,
                DetectedAt = list.Max(r => r.LastAnsweredAt ?? r.FirstAnsweredAt) ?? DateTimeOffset.UtcNow
            });
        }

        // Sort by severity (critical first)
        gaps = gaps.OrderBy(g => g.Severity == "critical" ? 0 : (g.Severity == "moderate" ? 1 : 2)).ToList();

        return Ok(gaps);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. ADAPTIVE LEARNING PATH (LỘ TRÌNH HỌC THÍCH ỨNG)
    // ─────────────────────────────────────────────────────────────────────────────

    [HttpGet("learning-path")]
    public async Task<IActionResult> GetAdaptiveLearningPath([FromQuery] string? subjectId = null)
    {
        var effectiveSubjectId = string.IsNullOrWhiteSpace(subjectId) || subjectId == "all"
            ? "sub_math12"
            : subjectId;

        // Retrieve gaps and completed lessons
        var gapResult = await GetKnowledgeGaps(effectiveSubjectId);
        var gaps = (gapResult as OkObjectResult)?.Value as List<KnowledgeGapDto> ?? new List<KnowledgeGapDto>();

        var completedLessonsCount = await _db.LessonProgresses.AsNoTracking()
            .CountAsync(p => p.UserId == CurrentUserId && p.SubjectId == effectiveSubjectId && (p.OverallProgress >= 100 || p.ContentProgress >= 100));

        var steps = new List<AdaptiveStepDto>();
        int stepNum = 1;
        string stage = "progressing";
        string stageDesc = "Đang tiến bước trong chương trình học chuẩn GDPT 2018.";

        if (gaps.Count > 0 && gaps.Any(g => g.Severity == "critical" || g.Severity == "moderate"))
        {
            stage = "remediation";
            var topGap = gaps.First();
            stageDesc = $"Phát hiện {gaps.Count} lỗ hổng kiến thức cần củng cố ưu tiên, đặc biệt là \"{topGap.SkillName}\".";

            steps.Add(new AdaptiveStepDto
            {
                StepNumber = stepNum++,
                Title = $"Ôn tập lý thuyết: {topGap.SkillName}",
                Objective = $"Đọc lại định nghĩa, công thức cốt lõi và các ví dụ minh họa.",
                ActionType = "review_lesson",
                TargetRoute = topGap.RecommendedLessonId != null ? $"/lessons/{topGap.RecommendedLessonId}" : $"/subjects/{effectiveSubjectId}",
                LessonId = topGap.RecommendedLessonId,
                SkillId = topGap.SkillId,
                Priority = "high",
                IsCompleted = false
            });

            steps.Add(new AdaptiveStepDto
            {
                StepNumber = stepNum++,
                Title = $"Luyện tập khắc phục: {topGap.SkillName}",
                Objective = "Làm bài tập 5 câu hỏi có phản hồi giải thích từng bước.",
                ActionType = "practice_skill",
                TargetRoute = $"/exercises?subjectId={effectiveSubjectId}&limit=5",
                SkillId = topGap.SkillId,
                Priority = "high",
                IsCompleted = false
            });
        }

        // Add next lesson in curriculum
        steps.Add(new AdaptiveStepDto
        {
            StepNumber = stepNum++,
            Title = "Tiến độ bài học tiếp theo theo GDPT 2018",
            Objective = "Học bài mới và hoàn thành bài kiểm tra đánh giá đạt >= 80%.",
            ActionType = "next_lesson",
            TargetRoute = $"/subjects/{effectiveSubjectId}",
            Priority = "medium",
            IsCompleted = false
        });

        // Add practice / challenge exam step
        steps.Add(new AdaptiveStepDto
        {
            StepNumber = stepNum++,
            Title = "Thi thử THPT Quốc Gia định kỳ",
            Objective = "Làm đề thi chuẩn GDPT 2018 có bấm giờ để đánh giá năng lực toàn diện.",
            ActionType = "diagnostic_practice",
            TargetRoute = $"/exercises?subjectId={effectiveSubjectId}&mode=exam",
            Priority = "standard",
            IsCompleted = false
        });

        return Ok(new AdaptiveLearningPathDto
        {
            Id = $"alp_{CurrentUserId}_{effectiveSubjectId}",
            UserId = CurrentUserId,
            SubjectId = effectiveSubjectId,
            CurrentStage = stage,
            StageDescription = stageDesc,
            Steps = steps,
            GeneratedAt = DateTimeOffset.UtcNow
        });
    }
}

