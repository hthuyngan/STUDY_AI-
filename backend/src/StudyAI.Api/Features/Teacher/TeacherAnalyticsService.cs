using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Teacher;

public class TeacherAnalyticsService : ITeacherAnalyticsService
{
    private readonly IApplicationDbContext _db;
    private readonly ITeacherManagementService _teacherManagementService;
    private readonly ITeachingRecommendationService _recommendationService;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public TeacherAnalyticsService(
        IApplicationDbContext db,
        ITeacherManagementService teacherManagementService,
        ITeachingRecommendationService recommendationService,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _teacherManagementService = teacherManagementService;
        _recommendationService = recommendationService;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    private static bool IsAdminRole(string userRole) =>
        string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);

    public async Task<List<TeacherClassroomSummaryDto>> GetClassroomsAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        return await _teacherManagementService.GetTeacherClassroomsAsync(userId, userRole, cancellationToken);
    }

    public async Task<ClassroomAnalyticsDto> GetClassroomAnalyticsAsync(
        string userId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _teacherManagementService.GetClassroomAnalyticsAsync(userId, userRole, classroomId, cancellationToken);
        }
        catch (KeyNotFoundException ex)
        {
            throw new NotFoundException(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            throw new ForbiddenException(ex.Message);
        }
    }

    public async Task<List<TeachingRecommendationDto>> GetRecommendationsAsync(
        string userId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _recommendationService.GetCohortTeachingRecommendationsAsync(userId, userRole, classroomId, cancellationToken);
        }
        catch (KeyNotFoundException ex)
        {
            throw new NotFoundException(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            throw new ForbiddenException(ex.Message);
        }
    }

    public async Task<RemedialInterventionOutcomeDto> AssignInterventionAsync(
        string userId,
        string userRole,
        CreateRemedialInterventionRequestDto request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _teacherManagementService.AssignRemedialInterventionAsync(userId, userRole, request, cancellationToken);
        }
        catch (KeyNotFoundException ex)
        {
            throw new NotFoundException(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            throw new ForbiddenException(ex.Message);
        }
        catch (ArgumentException ex)
        {
            throw new ValidationException(ex.Message);
        }
    }

    public async Task<List<RemedialInterventionOutcomeDto>> GetInterventionsAsync(
        string userId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _teacherManagementService.GetClassroomInterventionsAsync(userId, userRole, classroomId, cancellationToken);
        }
        catch (KeyNotFoundException ex)
        {
            throw new NotFoundException(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            throw new ForbiddenException(ex.Message);
        }
    }

    public async Task<List<TeacherAlertItemDto>> GetAlertsAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var teacherClassrooms = IsAdminRole(userRole)
            ? await _db.Classrooms.Include(c => c.Students).ThenInclude(cs => cs.Student).ToListAsync(cancellationToken)
            : await _db.Classrooms.Where(c => c.TeacherId == userId).Include(c => c.Students).ThenInclude(cs => cs.Student).ToListAsync(cancellationToken);

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

        return persistedAlerts.Select(a => new TeacherAlertItemDto
        {
            Id = a.Id,
            StudentId = a.StudentId,
            StudentName = a.Student?.DisplayName ?? "Học viên",
            ClassId = a.ClassroomId,
            ClassName = a.Classroom?.Name ?? "",
            Severity = a.Severity,
            Type = a.Type,
            Message = a.Message,
            CreatedAt = a.CreatedAt.ToString("o"),
            Status = a.Status,
            ResolutionNote = a.ResolutionNote
        }).ToList();
    }

    public async Task<TeacherAlertUpdateResultDto> UpdateAlertAsync(
        string userId,
        string userRole,
        string alertId,
        JsonObject payload,
        CancellationToken cancellationToken = default)
    {
        var status = payload["status"]?.ToString() ?? "resolved";
        var note = payload["resolutionNote"]?.ToString() ?? "Đã xử lý";

        var validStatuses = new[] { "new", "pending", "in_progress", "resolved", "dismissed" };
        var normalizedStatus = status.Trim().ToLowerInvariant();
        if (!validStatuses.Contains(normalizedStatus))
        {
            throw new ValidationException($"Trạng thái cảnh báo '{status}' không hợp lệ. Giá trị cho phép: new, pending, in_progress, resolved, dismissed.");
        }

        var alert = await _db.ClassroomAlerts
            .Include(a => a.Classroom)
            .FirstOrDefaultAsync(a => a.Id == alertId, cancellationToken);

        if (alert == null)
        {
            throw new NotFoundException("Không tìm thấy cảnh báo học tập.");
        }

        if (!IsAdminRole(userRole) && alert.Classroom?.TeacherId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền xử lý cảnh báo của lớp học khác.");
        }

        var now = _clock.UtcNow;
        alert.Status = normalizedStatus;
        alert.ResolutionNote = note;
        if (normalizedStatus == "resolved")
        {
            alert.ResolvedByTeacherId = userId;
            alert.ResolvedAt = now;
        }
        else
        {
            alert.ResolvedByTeacherId = null;
            alert.ResolvedAt = null;
        }
        alert.UpdatedAt = now;

        var log = new StaffAuditLog
        {
            Id = $"log_alt_{Guid.NewGuid():N}",
            ActorUserId = userId,
            Action = "alert_resolved",
            TargetType = "learning_alert",
            TargetId = alertId,
            Payload = JsonSerializer.Serialize(new { status, resolutionNote = note, classroomId = alert.ClassroomId }),
            CreatedAt = now
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);

        return new TeacherAlertUpdateResultDto
        {
            Id = alert.Id,
            Status = alert.Status,
            ResolutionNote = alert.ResolutionNote
        };
    }

    public async Task<TeacherAlertResolveAllResultDto> ResolveAllAlertsAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var teacherClassrooms = IsAdminRole(userRole)
            ? await _db.Classrooms.ToListAsync(cancellationToken)
            : await _db.Classrooms.Where(c => c.TeacherId == userId).ToListAsync(cancellationToken);

        var classroomIds = teacherClassrooms.Select(c => c.Id).Distinct().ToList();

        var pendingAlerts = await _db.ClassroomAlerts
            .Where(a => classroomIds.Contains(a.ClassroomId) && a.Status != "resolved")
            .ToListAsync(cancellationToken);

        var now = _clock.UtcNow;
        foreach (var alert in pendingAlerts)
        {
            alert.Status = "resolved";
            alert.ResolutionNote ??= "Đã giải quyết tất cả cảnh báo";
            alert.ResolvedByTeacherId = userId;
            alert.ResolvedAt = now;
            alert.UpdatedAt = now;
        }

        var log = new StaffAuditLog
        {
            Id = $"log_alt_{Guid.NewGuid():N}",
            ActorUserId = userId,
            Action = "alerts_resolved_all",
            TargetType = "learning_alert",
            TargetId = "all",
            Payload = JsonSerializer.Serialize(new { count = pendingAlerts.Count, classroomIds }),
            CreatedAt = now
        };
        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);

        return new TeacherAlertResolveAllResultDto
        {
            Success = true,
            ResolvedCount = pendingAlerts.Count
        };
    }

    public async Task<TeacherStudentAcademicDetailDto> GetStudentAcademicDetailAsync(
        string userId,
        string userRole,
        string studentId,
        CancellationToken cancellationToken = default)
    {
        if (!IsAdminRole(userRole))
        {
            var teachesStudent = await _db.ClassroomStudents.AnyAsync(cs =>
                cs.StudentId == studentId && cs.Classroom != null && cs.Classroom.TeacherId == userId,
                cancellationToken);

            if (!teachesStudent && studentId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền xem thông tin học vụ của học viên này.");
            }
        }

        var student = await _db.Users.FirstOrDefaultAsync(u => u.Id == studentId, cancellationToken);
        if (student == null)
            throw new NotFoundException("Không tìm thấy học viên.");

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

        var recentLessons = progresses.Select(p => new AcademicRecentLessonDto
        {
            Id = p.LessonId,
            Title = lessonsDict.TryGetValue(p.LessonId, out var title) ? title : p.LessonId,
            Progress = p.OverallProgress,
            LastActive = p.UpdatedAt.ToString("o")
        }).ToList();

        var attempts = await _db.AssessmentAttempts
            .AsNoTracking()
            .Where(a => a.UserId == studentId)
            .OrderByDescending(a => a.CompletedAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        var assessmentAttempts = attempts.Select(a => new AcademicAssessmentAttemptDto
        {
            Id = a.Id,
            Title = !string.IsNullOrEmpty(a.SubjectId) ? $"Luyện tập: {a.SubjectId}" : "Bài luyện tập",
            Score = a.ScoreScaled ?? 0.0,
            Passed = (a.ScoreScaled ?? 0.0) >= 5.0,
            Date = a.CompletedAt?.ToString("o") ?? a.StartedAt.ToString("o")
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

        return new TeacherStudentAcademicDetailDto
        {
            Student = new AcademicStudentSummaryDto
            {
                Id = student.Id,
                Name = student.DisplayName ?? string.Empty,
                Code = student.Id,
                Email = student.Email ?? string.Empty,
                ClassId = classroomStudent?.ClassroomId ?? "",
                ClassName = classroomStudent?.Classroom?.Name ?? "Chưa phân lớp",
                Progress = Math.Round(avgProgress),
                AverageScore = Math.Round(avgScore, 1),
                LastActive = attempts.FirstOrDefault()?.CompletedAt?.ToString("o") ?? student.UpdatedAt.ToString("o")
            },
            OverallProgress = Math.Round(avgProgress),
            AverageAssessmentScore = Math.Round(avgScore * 10, 1),
            RecentLessons = recentLessons,
            AssessmentAttempts = assessmentAttempts,
            WeakAreas = weakAreas
        };
    }
}