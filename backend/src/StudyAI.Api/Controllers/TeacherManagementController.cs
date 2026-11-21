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

        var classroomIds = teacherClassrooms.Select(c => c.Id).Distinct().ToList();
        var studentIds = teacherClassrooms.SelectMany(c => c.Students).Select(cs => cs.StudentId).Distinct().ToList();

        // 1. Scan for any learning events not yet in ClassroomAlerts
        var alertEvents = await _db.LearningEvents
            .AsNoTracking()
            .Where(e => e.Type == "learning_alert" && (studentIds.Contains(e.UserId) || string.IsNullOrEmpty(e.UserId)))
            .OrderByDescending(e => e.Timestamp)
            .Take(50)
            .ToListAsync(cancellationToken);

        var existingAlertIds = await _db.ClassroomAlerts
            .Where(a => classroomIds.Contains(a.ClassroomId))
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);

        var newAlertsToAdd = new List<ClassroomAlert>();

        foreach (var ev in alertEvents)
        {
            if (existingAlertIds.Contains(ev.Id)) continue;

            var studentClass = teacherClassrooms.FirstOrDefault(c => c.Students.Any(cs => cs.StudentId == ev.UserId));
            if (studentClass == null) continue;

            var alert = new ClassroomAlert
            {
                Id = ev.Id,
                ClassroomId = studentClass.Id,
                StudentId = ev.UserId ?? string.Empty,
                Severity = "high",
                Type = "falling_behind",
                Message = ev.PayloadJson ?? "Cần chú ý tiến độ học tập",
                CreatedAt = ev.Timestamp,
                UpdatedAt = ev.Timestamp,
                Status = "new"
            };
            newAlertsToAdd.Add(alert);
            existingAlertIds.Add(alert.Id);
        }

        // 2. Scan low score attempts
        var lowScoreAttempts = await _db.AssessmentAttempts
            .AsNoTracking()
            .Where(a => studentIds.Contains(a.UserId) && a.ScoreScaled.HasValue && a.ScoreScaled.Value < 5.0)
            .OrderByDescending(a => a.CompletedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var attempt in lowScoreAttempts)
        {
            var alertId = $"alt_asmt_{attempt.Id}";
            if (existingAlertIds.Contains(alertId)) continue;

            var studentClass = teacherClassrooms.FirstOrDefault(c => c.Students.Any(cs => cs.StudentId == attempt.UserId));
            if (studentClass == null) continue;

            var alert = new ClassroomAlert
            {
                Id = alertId,
                ClassroomId = studentClass.Id,
                StudentId = attempt.UserId,
                Severity = (attempt.ScoreScaled ?? 0.0) < 3.5 ? "high" : "medium",
                Type = "low_score",
                Message = $"Điểm bài luyện tập '{attempt.AssessmentId}' dưới trung bình ({(attempt.ScoreScaled ?? 0.0):F1}/10.0)",
                CreatedAt = attempt.CompletedAt ?? attempt.StartedAt,
                UpdatedAt = attempt.CompletedAt ?? attempt.StartedAt,
                Status = "new"
            };
            newAlertsToAdd.Add(alert);
            existingAlertIds.Add(alert.Id);
        }

        if (newAlertsToAdd.Count > 0)
        {
            try
            {
                _db.ClassroomAlerts.AddRange(newAlertsToAdd);
                await _db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                // Concurrency resilience: If concurrent requests generate alerts simultaneously, detach conflicting entries.
                foreach (var entry in newAlertsToAdd)
                {
                    _db.Entry(entry).State = EntityState.Detached;
                }
            }
        }

        // 3. Query all alerts from classroom_alerts for the teacher's classrooms
        var persistedAlerts = await _db.ClassroomAlerts
            .AsNoTracking()
            .Include(a => a.Student)
            .Include(a => a.Classroom)
            .Where(a => classroomIds.Contains(a.ClassroomId))
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        var result = persistedAlerts.Select(a => new
        {
            id = a.Id,
            studentId = a.StudentId,
            studentName = a.Student?.DisplayName ?? "Học viên",
            classId = a.ClassroomId,
            className = a.Classroom?.Name ?? "",
            severity = a.Severity,
            type = a.Type,
            message = a.Message,
            createdAt = a.CreatedAt.ToString("o"),
            status = a.Status,
            resolutionNote = a.ResolutionNote
        }).ToList();

        return Ok(result);
    }

    [HttpGet("grades")]
    public async Task<IActionResult> GetGrades(
        [FromQuery] string? classId = null,
        [FromQuery] string? assignmentId = null,
        CancellationToken cancellationToken = default)
    {
        var teacherClassrooms = CurrentUserRole == "admin"
            ? await _db.Classrooms.AsNoTracking().ToListAsync(cancellationToken)
            : await _db.Classrooms.AsNoTracking().Where(c => c.TeacherId == CurrentUserId).ToListAsync(cancellationToken);

        var classroomIds = teacherClassrooms.Select(c => c.Id).ToList();
        if (!string.IsNullOrWhiteSpace(classId) && classId != "all")
        {
            if (CurrentUserRole != "admin" && !classroomIds.Contains(classId))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền xem bảng điểm của lớp học này." });
            }
            classroomIds = classroomIds.Where(id => id == classId).ToList();
        }

        var query = _db.AssignmentSubmissions
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Assignment)
                .ThenInclude(a => a!.Classroom)
            .Where(s => s.Assignment != null && classroomIds.Contains(s.Assignment.ClassroomId))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(assignmentId) && assignmentId != "all")
        {
            query = query.Where(s => s.AssignmentId == assignmentId);
        }

        var submissions = await query
            .OrderByDescending(s => s.SubmittedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        var result = submissions.Select(sub => new
        {
            id = $"grd-{sub.Id}",
            submissionId = sub.Id,
            studentId = sub.StudentId,
            studentName = sub.Student?.DisplayName ?? "Học sinh",
            studentCode = sub.StudentId,
            classId = sub.Assignment?.ClassroomId ?? "",
            className = sub.Assignment?.Classroom?.Name ?? "",
            subjectName = sub.Assignment?.Classroom?.Subject ?? "Toán học",
            activityTitle = sub.Assignment?.Title ?? "Bài tập",
            activityType = "assignment",
            score = sub.Score ?? 0.0,
            maxScore = 10.0,
            passed = (sub.Score ?? 0.0) >= 5.0,
            date = sub.SubmittedAt.ToString("o"),
            feedback = sub.Feedback
        }).ToList();

        return Ok(result);
    }

    [HttpGet("submissions")]
    public async Task<IActionResult> GetTeacherSubmissions(
        [FromQuery] string? classId = null,
        [FromQuery] string? assignmentId = null,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var teacherClassrooms = CurrentUserRole == "admin"
            ? await _db.Classrooms.AsNoTracking().ToListAsync(cancellationToken)
            : await _db.Classrooms.AsNoTracking().Where(c => c.TeacherId == CurrentUserId).ToListAsync(cancellationToken);

        var classroomIds = teacherClassrooms.Select(c => c.Id).ToList();
        if (!string.IsNullOrWhiteSpace(classId) && classId != "all")
        {
            if (CurrentUserRole != "admin" && !classroomIds.Contains(classId))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền xem bài nộp của lớp học này." });
            }
            classroomIds = classroomIds.Where(id => id == classId).ToList();
        }

        var query = _db.AssignmentSubmissions
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Assignment)
                .ThenInclude(a => a!.Classroom)
            .Where(s => s.Assignment != null && classroomIds.Contains(s.Assignment.ClassroomId))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(assignmentId) && assignmentId != "all")
        {
            query = query.Where(s => s.AssignmentId == assignmentId);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(s => s.Status == status);
        }

        var submissions = await query
            .OrderByDescending(s => s.SubmittedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        var result = submissions.Select(s => new
        {
            id = s.Id,
            assignmentId = s.AssignmentId,
            assignmentTitle = s.Assignment?.Title ?? "",
            studentId = s.StudentId,
            studentName = s.Student?.DisplayName ?? "Học sinh",
            studentEmail = s.Student?.Email ?? "",
            className = s.Assignment?.Classroom?.Name ?? "",
            submittedAt = s.SubmittedAt.ToString("o"),
            status = s.Status,
            score = s.Score,
            maxScore = 10.0,
            feedback = s.Feedback,
            gradedBy = s.GradedByTeacherId,
            content = s.Content
        }).ToList();

        return Ok(result);
    }

    [HttpPut("alerts/{alertId}")]
    public async Task<IActionResult> UpdateAlert(string alertId, [FromBody] System.Text.Json.Nodes.JsonObject payload, CancellationToken cancellationToken)
    {
        var status = payload["status"]?.ToString() ?? "resolved";
        var note = payload["resolutionNote"]?.ToString() ?? "Đã xử lý";

        var validStatuses = new[] { "new", "pending", "in_progress", "resolved", "dismissed" };
        var normalizedStatus = status.Trim().ToLowerInvariant();
        if (!validStatuses.Contains(normalizedStatus))
        {
            return BadRequest(new { detail = $"Trạng thái cảnh báo '{status}' không hợp lệ. Giá trị cho phép: new, pending, in_progress, resolved, dismissed." });
        }

        var alert = await _db.ClassroomAlerts
            .Include(a => a.Classroom)
            .FirstOrDefaultAsync(a => a.Id == alertId, cancellationToken);

        if (alert == null)
        {
            return NotFound(new { detail = "Không tìm thấy cảnh báo học tập." });
        }

        if (CurrentUserRole != "admin" && alert.Classroom?.TeacherId != CurrentUserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Bạn không có quyền xử lý cảnh báo của lớp học khác." });
        }

        alert.Status = normalizedStatus;
        alert.ResolutionNote = note;
        if (normalizedStatus == "resolved")
        {
            alert.ResolvedByTeacherId = CurrentUserId;
            alert.ResolvedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            alert.ResolvedByTeacherId = null;
            alert.ResolvedAt = null;
        }
        alert.UpdatedAt = DateTimeOffset.UtcNow;

        var log = new StaffAuditLog
        {
            Id = $"log_alt_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "alert_resolved",
            TargetType = "learning_alert",
            TargetId = alertId,
            Payload = JsonSerializer.Serialize(new { status, resolutionNote = note, classroomId = alert.ClassroomId }),
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = alert.Id,
            status = alert.Status,
            resolutionNote = alert.ResolutionNote
        });
    }

    [HttpPost("alerts/resolve-all")]
    public async Task<IActionResult> ResolveAllAlerts(CancellationToken cancellationToken)
    {
        var teacherClassrooms = CurrentUserRole == "admin"
            ? await _db.Classrooms.ToListAsync(cancellationToken)
            : await _db.Classrooms.Where(c => c.TeacherId == CurrentUserId).ToListAsync(cancellationToken);

        var classroomIds = teacherClassrooms.Select(c => c.Id).Distinct().ToList();

        var pendingAlerts = await _db.ClassroomAlerts
            .Where(a => classroomIds.Contains(a.ClassroomId) && a.Status != "resolved")
            .ToListAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        foreach (var alert in pendingAlerts)
        {
            alert.Status = "resolved";
            alert.ResolutionNote ??= "Đã giải quyết tất cả cảnh báo";
            alert.ResolvedByTeacherId = CurrentUserId;
            alert.ResolvedAt = now;
            alert.UpdatedAt = now;
        }

        var log = new StaffAuditLog
        {
            Id = $"log_alt_{Guid.NewGuid():N}",
            ActorUserId = CurrentUserId,
            Action = "alerts_resolved_all",
            TargetType = "learning_alert",
            TargetId = "all",
            Payload = JsonSerializer.Serialize(new { count = pendingAlerts.Count, classroomIds }),
            CreatedAt = now
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, resolvedCount = pendingAlerts.Count });
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

