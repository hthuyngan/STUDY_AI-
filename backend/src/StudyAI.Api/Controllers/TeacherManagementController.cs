using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Api.Controllers;

[ApiController]
[Route("api/v1/teacher")]
[Authorize(Roles = "teacher,admin")]
public class TeacherManagementController : ControllerBase
{
    private readonly ITeacherManagementService _teacherManagementService;
    private readonly ITeachingRecommendationService _recommendationService;
    private readonly StudyAIDbContext _db;
    private readonly ILogger<TeacherManagementController> _logger;

    public TeacherManagementController(
        ITeacherManagementService teacherManagementService,
        ITeachingRecommendationService recommendationService,
        StudyAIDbContext db,
        ILogger<TeacherManagementController> logger)
    {
        _teacherManagementService = teacherManagementService;
        _recommendationService = recommendationService;
        _db = db;
        _logger = logger;
    }

    private string CurrentUserId =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("Người dùng chưa được xác thực.");

    private string CurrentUserRole =>
        User.FindFirst(ClaimTypes.Role)?.Value ?? "teacher";

    [HttpGet("classrooms")]
    public async Task<ActionResult<List<TeacherClassroomSummaryDto>>> GetClassrooms(
        CancellationToken cancellationToken)
    {
        var classrooms = await _teacherManagementService.GetTeacherClassroomsAsync(
            CurrentUserId, CurrentUserRole, cancellationToken);
        return Ok(classrooms);
    }

    [HttpGet("classrooms/{classroomId}/analytics")]
    public async Task<ActionResult<ClassroomAnalyticsDto>> GetClassroomAnalytics(
        string classroomId,
        CancellationToken cancellationToken)
    {
        try
        {
            var analytics = await _teacherManagementService.GetClassroomAnalyticsAsync(
                CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(analytics);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpGet("classrooms/{classroomId}/recommendations")]
    public async Task<ActionResult<List<TeachingRecommendationDto>>> GetRecommendations(
        string classroomId,
        CancellationToken cancellationToken)
    {
        try
        {
            var recs = await _recommendationService.GetCohortTeachingRecommendationsAsync(
                CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(recs);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpPost("interventions")]
    public async Task<ActionResult<RemedialInterventionOutcomeDto>> AssignIntervention(
        [FromBody] CreateRemedialInterventionRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var outcome = await _teacherManagementService.AssignRemedialInterventionAsync(
                CurrentUserId, CurrentUserRole, request, cancellationToken);
            return Ok(outcome);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("classrooms/{classroomId}/interventions")]
    public async Task<ActionResult<List<RemedialInterventionOutcomeDto>>> GetInterventions(
        string classroomId,
        CancellationToken cancellationToken)
    {
        try
        {
            var list = await _teacherManagementService.GetClassroomInterventionsAsync(
                CurrentUserId, CurrentUserRole, classroomId, cancellationToken);
            return Ok(list);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts(CancellationToken cancellationToken)
    {
        var teacherClassrooms = CurrentUserRole == "admin"
            ? await _db.Classrooms.Include(c => c.Students).ThenInclude(cs => cs.Student).ToListAsync(cancellationToken)
            : await _db.Classrooms.Where(c => c.TeacherId == CurrentUserId).Include(c => c.Students).ThenInclude(cs => cs.Student).ToListAsync(cancellationToken);

        var studentIds = teacherClassrooms.SelectMany(c => c.Students).Select(cs => cs.StudentId).Distinct().ToList();

        var alertEvents = await _db.LearningEvents
            .AsNoTracking()
            .Where(e => e.Type == "learning_alert" && (studentIds.Contains(e.UserId) || string.IsNullOrEmpty(e.UserId)))
            .OrderByDescending(e => e.Timestamp)
            .Take(50)
            .ToListAsync(cancellationToken);

        var alerts = new List<object>();

        foreach (var ev in alertEvents)
        {
            var studentClass = teacherClassrooms.FirstOrDefault(c => c.Students.Any(cs => cs.StudentId == ev.UserId));
            var student = studentClass?.Students.FirstOrDefault(cs => cs.StudentId == ev.UserId)?.Student;

            alerts.Add(new
            {
                id = ev.Id,
                studentId = ev.UserId,
                studentName = student?.DisplayName ?? "Học viên",
                classId = studentClass?.Id ?? "",
                className = studentClass?.Name ?? "",
                severity = "high",
                type = "falling_behind",
                message = ev.PayloadJson ?? "Cần chú ý tiến độ học tập",
                createdAt = ev.Timestamp.ToString("o"),
                status = "new",
                resolutionNote = (string?)null
            });
        }

        var lowScoreAttempts = await _db.AssessmentAttempts
            .AsNoTracking()
            .Where(a => studentIds.Contains(a.UserId) && a.ScoreScaled.HasValue && a.ScoreScaled.Value < 5.0)
            .OrderByDescending(a => a.CompletedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var attempt in lowScoreAttempts)
        {
            var studentClass = teacherClassrooms.FirstOrDefault(c => c.Students.Any(cs => cs.StudentId == attempt.UserId));
            var student = studentClass?.Students.FirstOrDefault(cs => cs.StudentId == attempt.UserId)?.Student;

            var alertId = $"alt_asmt_{attempt.Id}";
            alerts.Add(new
            {
                id = alertId,
                studentId = attempt.UserId,
                studentName = student?.DisplayName ?? "Học viên",
                classId = studentClass?.Id ?? "",
                className = studentClass?.Name ?? "",
                severity = (attempt.ScoreScaled ?? 0.0) < 3.5 ? "high" : "medium",
                type = "low_score",
                message = $"Điểm bài luyện tập '{attempt.AssessmentId}' dưới trung bình ({(attempt.ScoreScaled ?? 0.0):F1}/10.0)",
                createdAt = attempt.CompletedAt?.ToString("o") ?? attempt.StartedAt.ToString("o"),
                status = "new",
                resolutionNote = (string?)null
            });
        }

        return Ok(alerts);
    }

    [HttpPut("alerts/{alertId}")]
    public async Task<IActionResult> UpdateAlert(string alertId, [FromBody] System.Text.Json.Nodes.JsonObject payload, CancellationToken cancellationToken)
    {
        var status = payload["status"]?.ToString() ?? "resolved";
        var note = payload["resolutionNote"]?.ToString() ?? "Đã xử lý";

        var log = new StaffAuditLog
        {
            Id = $"log_alt_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "alert_resolved",
            TargetType = "learning_alert",
            TargetId = alertId,
            Payload = JsonSerializer.Serialize(new { status, resolutionNote = note }),
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = alertId,
            status,
            resolutionNote = note
        });
    }

    [HttpPost("alerts/resolve-all")]
    public async Task<IActionResult> ResolveAllAlerts(CancellationToken cancellationToken)
    {
        var log = new StaffAuditLog
        {
            Id = $"log_alt_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "alerts_resolved_all",
            TargetType = "learning_alert",
            TargetId = "all",
            Payload = "Đã giải quyết tất cả cảnh báo",
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true });
    }

    [HttpGet("students/{studentId}/academic-detail")]
    public async Task<IActionResult> GetStudentAcademicDetail(string studentId, CancellationToken cancellationToken)
    {
        if (CurrentUserRole != "admin")
        {
            var teachesStudent = await _db.ClassroomStudents.AnyAsync(cs =>
                cs.StudentId == studentId && cs.Classroom != null && cs.Classroom.TeacherId == CurrentUserId,
                cancellationToken);

            if (!teachesStudent && studentId != CurrentUserId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền xem thông tin học vụ của học viên này." });
            }
        }

        var student = await _db.Users.FirstOrDefaultAsync(u => u.Id == studentId, cancellationToken);
        if (student == null)
            return NotFound(new { message = "Không tìm thấy học viên." });

        var classroomStudent = await _db.ClassroomStudents
            .Include(cs => cs.Classroom)
            .FirstOrDefaultAsync(cs => cs.StudentId == studentId, cancellationToken);

        var progresses = await _db.LessonProgresses
            .AsNoTracking()
            .Where(p => p.UserId == studentId)
            .OrderByDescending(p => p.UpdatedAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        var lessonIds = progresses.Select(p => p.LessonId).Distinct().ToList();
        var lessonsDict = await _db.ContentLessons
            .AsNoTracking()
            .Where(l => lessonIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Title, cancellationToken);

        var recentLessons = progresses.Select(p => new
        {
            id = p.LessonId,
            title = lessonsDict.TryGetValue(p.LessonId, out var title) ? title : p.LessonId,
            progress = p.OverallProgress,
            lastActive = p.UpdatedAt.ToString("o")
        }).ToList();

        var attempts = await _db.AssessmentAttempts
            .AsNoTracking()
            .Where(a => a.UserId == studentId)
            .OrderByDescending(a => a.CompletedAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        var assessmentAttempts = attempts.Select(a => new
        {
            id = a.Id,
            title = !string.IsNullOrEmpty(a.SubjectId) ? $"Luyện tập: {a.SubjectId}" : "Bài luyện tập",
            score = a.ScoreScaled ?? 0.0,
            passed = (a.ScoreScaled ?? 0.0) >= 5.0,
            date = a.CompletedAt?.ToString("o") ?? a.StartedAt.ToString("o")
        }).ToList();

        var weakMasteries = await _db.StudentTopicMasteries
            .AsNoTracking()
            .Where(m => m.UserId == studentId && m.MasteryScore < 60.0)
            .OrderBy(m => m.MasteryScore)
            .Take(5)
            .ToListAsync(cancellationToken);

        var weakAreas = weakMasteries.Select(m => $"{m.TopicName} ({m.MasteryScore:F0}%)").ToList();

        var scoredAttempts = attempts.Where(a => a.ScoreScaled.HasValue).Select(a => a.ScoreScaled!.Value).ToList();
        var avgScore = scoredAttempts.Count > 0 ? scoredAttempts.Average() : 0.0;
        var avgProgress = progresses.Count > 0 ? progresses.Average(p => (double)p.OverallProgress) : 0.0;

        return Ok(new
        {
            student = new
            {
                id = student.Id,
                name = student.DisplayName,
                code = student.Id,
                email = student.Email,
                classId = classroomStudent?.ClassroomId ?? "",
                className = classroomStudent?.Classroom?.Name ?? "Chưa phân lớp",
                progress = Math.Round(avgProgress),
                averageScore = Math.Round(avgScore, 1),
                lastActive = attempts.FirstOrDefault()?.CompletedAt?.ToString("o") ?? student.UpdatedAt.ToString("o")
            },
            overallProgress = Math.Round(avgProgress),
            averageAssessmentScore = Math.Round(avgScore * 10, 1),
            recentLessons,
            assessmentAttempts,
            weakAreas
        });
    }
}

