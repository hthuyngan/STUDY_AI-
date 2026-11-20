using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Infrastructure.Services;

public class TeacherManagementService : ITeacherManagementService
{
    private readonly StudyAIDbContext _context;
    private readonly ILogger<TeacherManagementService> _logger;

    public TeacherManagementService(
        StudyAIDbContext context,
        ILogger<TeacherManagementService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<TeacherClassroomSummaryDto>> GetTeacherClassroomsAsync(
        string teacherId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var isAdmin = string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);

        var query = _context.Classrooms.AsNoTracking().Where(c => c.Status == "active");
        if (!isAdmin)
        {
            query = query.Where(c => c.TeacherId == teacherId);
        }

        var classrooms = await query
            .Include(c => c.Students)
            .Include(c => c.Assignments)
            .ToListAsync(cancellationToken);

        var result = new List<TeacherClassroomSummaryDto>();

        foreach (var c in classrooms)
        {
            var studentIds = c.Students.Select(s => s.StudentId).ToList();
            double avgMastery = 0.0;
            int atRiskCount = 0;

            if (studentIds.Count > 0)
            {
                var cohortMasteries = await _context.StudentTopicMasteries.AsNoTracking()
                    .Where(m => studentIds.Contains(m.UserId))
                    .ToListAsync(cancellationToken);

                if (cohortMasteries.Count > 0)
                {
                    avgMastery = Math.Round(cohortMasteries.Average(m => m.MasteryScore), 1);
                    var lowStudents = cohortMasteries
                        .Where(m => m.MasteryScore < 50.0)
                        .Select(m => m.UserId)
                        .Distinct()
                        .Count();
                    atRiskCount = lowStudents;
                }
            }

            result.Add(new TeacherClassroomSummaryDto
            {
                ClassroomId = c.Id,
                Name = c.Name,
                Code = c.Code,
                Grade = c.Grade,
                Subject = c.Subject ?? "Toán 12",
                StudentCount = c.Students.Count,
                ActiveAssignmentsCount = c.Assignments.Count(a => a.Status == "active"),
                AverageMasteryPercent = avgMastery,
                AtRiskStudentCount = atRiskCount,
                CreatedAt = c.CreatedAt
            });
        }

        return result;
    }

    public async Task<ClassroomAnalyticsDto> GetClassroomAnalyticsAsync(
        string teacherId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default)
    {
        var classroom = await _context.Classrooms.AsNoTracking()
            .Include(c => c.Students)
                .ThenInclude(cs => cs.Student)
            .FirstOrDefaultAsync(c => c.Id == classroomId, cancellationToken);

        if (classroom == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy lớp học với mã '{classroomId}'.");
        }

        var isAdmin = string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);
        if (!isAdmin && classroom.TeacherId != teacherId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập dữ liệu của lớp học này.");
        }

        var studentIds = classroom.Students.Select(cs => cs.StudentId).ToList();
        var analytics = new ClassroomAnalyticsDto
        {
            ClassroomId = classroom.Id,
            ClassroomName = classroom.Name,
            Subject = classroom.Subject ?? "Toán 12",
            TotalStudents = studentIds.Count
        };

        if (studentIds.Count == 0)
        {
            return analytics;
        }

        // Fetch cohort masteries
        var masteries = await _context.StudentTopicMasteries.AsNoTracking()
            .Where(m => studentIds.Contains(m.UserId))
            .ToListAsync(cancellationToken);

        if (masteries.Count > 0)
        {
            analytics.CohortAverageMasteryPercent = Math.Round(masteries.Average(m => m.MasteryScore), 1);

            // Mastery distribution buckets
            int mastered = masteries.Count(m => m.MasteryScore >= 85.0);
            int proficient = masteries.Count(m => m.MasteryScore >= 70.0 && m.MasteryScore < 85.0);
            int progressing = masteries.Count(m => m.MasteryScore >= 50.0 && m.MasteryScore < 70.0);
            int needsReinforcement = masteries.Count(m => m.MasteryScore < 50.0);
            int totalM = masteries.Count;

            analytics.MasteryDistribution = new Dictionary<string, double>
            {
                ["mastered"] = Math.Round((double)mastered / totalM * 100.0, 1),
                ["proficient"] = Math.Round((double)proficient / totalM * 100.0, 1),
                ["progressing"] = Math.Round((double)progressing / totalM * 100.0, 1),
                ["needs_reinforcement"] = Math.Round((double)needsReinforcement / totalM * 100.0, 1)
            };

            // Detect difficult topics across cohort
            var topicGroups = masteries.GroupBy(m => m.TopicName);
            var difficultTopics = new List<DifficultTopicCohortDto>();

            foreach (var g in topicGroups)
            {
                double avgAcc = g.Average(m => m.MasteryScore);
                int weakCount = g.Count(m => m.MasteryScore < 60.0);
                int totalAttempts = g.Sum(m => m.AttemptCount);

                if (avgAcc < 65.0 || weakCount >= Math.Max(1, studentIds.Count / 3))
                {
                    difficultTopics.Add(new DifficultTopicCohortDto
                    {
                        TopicName = g.Key,
                        CohortAccuracyPercent = Math.Round(avgAcc, 1),
                        AffectedStudentsCount = weakCount,
                        TotalAttemptsCount = totalAttempts,
                        CognitiveLevel = avgAcc < 45.0 ? "van_dung" : "thong_hieu"
                    });
                }
            }

            analytics.DifficultTopics = difficultTopics.OrderBy(d => d.CohortAccuracyPercent).Take(6).ToList();
        }

        // Detect At-Risk Students
        var atRiskList = new List<AtRiskStudentItemDto>();
        foreach (var cs in classroom.Students)
        {
            var studentMasteries = masteries.Where(m => m.UserId == cs.StudentId).ToList();
            double studentAvg = studentMasteries.Count > 0 ? studentMasteries.Average(m => m.MasteryScore) : 0.0;
            var weakest = studentMasteries.OrderBy(m => m.MasteryScore).FirstOrDefault();

            if (studentAvg < 55.0 || (weakest != null && weakest.MasteryScore < 40.0))
            {
                atRiskList.Add(new AtRiskStudentItemDto
                {
                    StudentId = cs.StudentId,
                    FullName = cs.Student?.DisplayName ?? "Học sinh",
                    Email = cs.Student?.Email ?? string.Empty,
                    OverallMasteryPercent = Math.Round(studentAvg, 1),
                    RiskLevel = studentAvg < 40.0 ? "high" : "medium",
                    PrimaryWeakTopic = weakest?.TopicName ?? "Chưa xác định",
                    ConsecutiveMistakesCount = weakest != null ? Math.Max(0, weakest.AttemptCount - weakest.CorrectCount) : 0,
                    InterventionStatus = "needs_action"
                });
            }
        }
        analytics.AtRiskStudents = atRiskList.OrderBy(s => s.OverallMasteryPercent).ToList();

        // Calculate Mock Exam average
        var examAttempts = await _context.AssessmentAttempts.AsNoTracking()
            .Where(a => studentIds.Contains(a.UserId) && a.AssessmentId == "asmt_exam" && a.CompletionStatus == "completed")
            .ToListAsync(cancellationToken);

        if (examAttempts.Count > 0)
        {
            var avgExam = examAttempts.Average(a => a.ScoreScaled ?? ((a.ScoreRaw ?? 0.0) / Math.Max(1.0, a.ScoreMax) * 10.0));
            analytics.MockExamAverageScore = Math.Round(avgExam, 1);
        }

        // Completion rate across curriculum
        var publishedLessonsCount = await _context.ContentLessons.AsNoTracking()
            .CountAsync(l => l.Status == "published", cancellationToken);

        if (publishedLessonsCount > 0)
        {
            var completedProgresses = await _context.LessonProgresses.AsNoTracking()
                .CountAsync(p => studentIds.Contains(p.UserId) && p.OverallProgress >= 100, cancellationToken);

            int totalExpected = publishedLessonsCount * studentIds.Count;
            analytics.CurriculumCompletionRatePercent = Math.Round(((double)completedProgresses / Math.Max(1, totalExpected)) * 100.0, 1);
        }

        return analytics;
    }

    public async Task<RemedialInterventionOutcomeDto> AssignRemedialInterventionAsync(
        string teacherId,
        string userRole,
        CreateRemedialInterventionRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var classroom = await _context.Classrooms
            .FirstOrDefaultAsync(c => c.Id == request.ClassroomId, cancellationToken);

        if (classroom == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy lớp học với mã '{request.ClassroomId}'.");
        }

        var isAdmin = string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);
        if (!isAdmin && classroom.TeacherId != teacherId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền giao bài can thiệp cho lớp học này.");
        }

        if (request.TargetStudentIds.Count == 0)
        {
            throw new ArgumentException("Danh sách học sinh nhận can thiệp không được để trống.", nameof(request.TargetStudentIds));
        }

        // Cross-tenant security check: Ensure all target student IDs belong to the specified classroom
        var enrolledCount = await _context.ClassroomStudents.AsNoTracking()
            .CountAsync(cs => cs.ClassroomId == request.ClassroomId && request.TargetStudentIds.Contains(cs.StudentId), cancellationToken);

        if (enrolledCount != request.TargetStudentIds.Count)
        {
            throw new InvalidOperationException("Một hoặc nhiều học sinh không thuộc danh sách lớp học được chỉ định (Ngăn chặn truy cập chéo học sinh).");
        }

        var assignmentTitle = !string.IsNullOrWhiteSpace(request.Title)
            ? (request.Title.Contains("[Can thiệp") ? request.Title : $"[Can thiệp bổ trợ] {request.Title}")
            : $"[Can thiệp bổ trợ] {request.TargetTopic}";

        var assignment = new Assignment
        {
            Id = $"asgn_remedial_{Guid.NewGuid():N}",
            ClassroomId = request.ClassroomId,
            Title = assignmentTitle,
            Description = $"Nhiệm vụ ôn tập tăng cường kiến thức trọng tâm: {request.TargetTopic}",
            Instructions = request.Instructions ?? "Hoàn thành các bài tập củng cố để cải thiện chỉ số thành thạo chuyên đề.",
            DueDate = request.DueDate > DateTimeOffset.UtcNow ? request.DueDate : DateTimeOffset.UtcNow.AddDays(7),
            MaxScore = 10.0,
            Status = "active",
            CreatedByTeacherId = teacherId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Assignments.Add(assignment);

        // Record intervention learning event for the primary target student
        var targetStudentId = request.TargetStudentIds.First();
        var student = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == targetStudentId, cancellationToken);

        var mastery = await _context.StudentTopicMasteries.AsNoTracking()
            .FirstOrDefaultAsync(m => m.UserId == targetStudentId && m.TopicName.Contains(request.TargetTopic), cancellationToken);

        double initialScore = mastery?.MasteryScore ?? 35.0;

        var interventionPayload = new
        {
            assignmentId = assignment.Id,
            classroomId = request.ClassroomId,
            teacherId = teacherId,
            topicName = request.TargetTopic,
            initialScore = initialScore,
            targetStudentIds = request.TargetStudentIds
        };

        var interventionEvent = new LearningEvent
        {
            Id = $"ev_intervention_{Guid.NewGuid():N}",
            UserId = targetStudentId,
            SubjectId = "sub_math12",
            LessonId = string.Empty,
            Timestamp = DateTimeOffset.UtcNow,
            Type = "teacher_intervention",
            PayloadJson = JsonSerializer.Serialize(interventionPayload),
            SchemaVersion = 1
        };

        _context.LearningEvents.Add(interventionEvent);

        // Audit Log
        _context.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"audit_{Guid.NewGuid():N}",
            ActorUserId = teacherId,
            Action = "assign_remedial_intervention",
            TargetType = "classroom",
            TargetId = request.ClassroomId,
            Payload = JsonSerializer.Serialize(new { assignmentId = assignment.Id, topic = request.TargetTopic, count = request.TargetStudentIds.Count }),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return new RemedialInterventionOutcomeDto
        {
            InterventionId = assignment.Id,
            ClassroomId = request.ClassroomId,
            StudentId = targetStudentId,
            StudentName = student?.DisplayName ?? "Học sinh",
            TopicName = request.TargetTopic,
            InitialMasteryScore = initialScore,
            CurrentMasteryScore = initialScore,
            Status = "assigned",
            AssignedAt = DateTimeOffset.UtcNow
        };
    }

    public async Task<List<RemedialInterventionOutcomeDto>> GetClassroomInterventionsAsync(
        string teacherId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default)
    {
        var classroom = await _context.Classrooms.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == classroomId, cancellationToken);

        if (classroom == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy lớp học với mã '{classroomId}'.");
        }

        var isAdmin = string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);
        if (!isAdmin && classroom.TeacherId != teacherId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập dữ liệu của lớp học này.");
        }

        var assignments = await _context.Assignments.AsNoTracking()
            .Where(a => a.ClassroomId == classroomId && (a.Title.Contains("[Can thiệp") || (a.Description != null && a.Description.Contains("ôn tập tăng cường"))))
            .Include(a => a.Submissions)
                .ThenInclude(s => s.Student)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        var list = new List<RemedialInterventionOutcomeDto>();

        // Load learning events for intervention details
        var interventionEvents = await _context.LearningEvents.AsNoTracking()
            .Where(e => e.Type == "teacher_intervention")
            .ToListAsync(cancellationToken);

        foreach (var asgn in assignments)
        {
            var cleanedTopic = asgn.Title.Replace("[Can thiệp bổ trợ]", "").Trim();

            // Find matching learning event if any
            var matchingEvent = interventionEvents.FirstOrDefault(e => e.PayloadJson != null && e.PayloadJson.Contains(asgn.Id));
            string targetStudentId = matchingEvent?.UserId ?? string.Empty;
            string targetTopic = cleanedTopic;
            double recordedInitialScore = 35.0;

            if (matchingEvent != null && !string.IsNullOrWhiteSpace(matchingEvent.PayloadJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(matchingEvent.PayloadJson);
                    if (doc.RootElement.TryGetProperty("initialScore", out var initElem))
                    {
                        recordedInitialScore = initElem.GetDouble();
                    }
                    if (doc.RootElement.TryGetProperty("topicName", out var topicElem) && !string.IsNullOrWhiteSpace(topicElem.GetString()))
                    {
                        targetTopic = topicElem.GetString()!;
                    }
                }
                catch
                {
                    // Ignore parse fallback
                }
            }

            if (asgn.Submissions.Count > 0)
            {
                foreach (var sub in asgn.Submissions)
                {
                    var mastery = await _context.StudentTopicMasteries.AsNoTracking()
                        .FirstOrDefaultAsync(m => m.UserId == sub.StudentId && (m.TopicName.Contains(targetTopic) || targetTopic.Contains(m.TopicName)), cancellationToken);

                    double currentScore = mastery?.MasteryScore ?? 60.0;
                    double initialScore = recordedInitialScore > 0 ? recordedInitialScore : Math.Max(20.0, currentScore - 15.0);

                    list.Add(new RemedialInterventionOutcomeDto
                    {
                        InterventionId = asgn.Id,
                        ClassroomId = classroomId,
                        StudentId = sub.StudentId,
                        StudentName = sub.Student?.DisplayName ?? "Học sinh",
                        TopicName = targetTopic,
                        InitialMasteryScore = initialScore,
                        CurrentMasteryScore = currentScore,
                        Status = sub.Status == "graded" ? (currentScore > initialScore ? "improved" : "not_improved") : "in_progress",
                        AssignedAt = asgn.CreatedAt,
                        CompletedAt = sub.SubmittedAt
                    });
                }
            }
            else if (!string.IsNullOrEmpty(targetStudentId))
            {
                var student = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == targetStudentId, cancellationToken);
                var mastery = await _context.StudentTopicMasteries.AsNoTracking()
                    .FirstOrDefaultAsync(m => m.UserId == targetStudentId && (m.TopicName.Contains(targetTopic) || targetTopic.Contains(m.TopicName)), cancellationToken);

                double currentScore = mastery?.MasteryScore ?? recordedInitialScore;

                list.Add(new RemedialInterventionOutcomeDto
                {
                    InterventionId = asgn.Id,
                    ClassroomId = classroomId,
                    StudentId = targetStudentId,
                    StudentName = student?.DisplayName ?? "Học sinh",
                    TopicName = targetTopic,
                    InitialMasteryScore = recordedInitialScore,
                    CurrentMasteryScore = currentScore,
                    Status = currentScore > recordedInitialScore + 10.0 ? "improved" : "assigned",
                    AssignedAt = asgn.CreatedAt,
                    CompletedAt = null
                });
            }
        }

        return list;
    }
}
