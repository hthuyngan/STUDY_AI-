using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Admin.Dashboard;

public class AdminDashboardService : IAdminDashboardService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;

    public AdminDashboardService(IApplicationDbContext db, IClock clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<AdminDashboardDto> GetDashboardAsync(CancellationToken ct = default)
    {
        var sevenDaysAgo = _clock.UtcNow.AddDays(-7);

        var totalUsers = await _db.Users.CountAsync(u => !u.IsDeleted, ct);
        var activeUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "active", ct);
        var suspendedUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "suspended", ct);
        var disabledUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "disabled", ct);
        var learnersCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "learner", ct);
        var teachersCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "teacher", ct);
        var contentCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "content", ct);
        var supportCount = 0;
        var adminsCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "admin", ct);
        var recentNewUsersCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.CreatedAt >= sevenDaysAgo, ct);
        var completedLessonsTotal = await _db.LessonProgresses.CountAsync(lp => lp.OverallProgress >= 100, ct);

        var recentLogs = await _db.StaffAuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(15)
            .ToListAsync(ct);

        var activities = new List<AdminActivityDto>();
        foreach (var log in recentLogs)
        {
            var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == log.ActorUserId, ct);
            activities.Add(new AdminActivityDto
            {
                Id = log.Id,
                Action = log.Action,
                Actor = actor?.DisplayName ?? log.ActorUserId,
                TargetType = log.TargetType,
                TargetId = log.TargetId,
                Payload = log.Payload,
                Timestamp = log.CreatedAt.ToString("o")
            });
        }

        var attentionItems = new List<AdminAttentionItemDto>();
        var suspendedList = await _db.Users
            .Where(u => !u.IsDeleted && (u.Status == "suspended" || u.Status == "disabled"))
            .Take(5)
            .ToListAsync(ct);
        foreach (var sUser in suspendedList)
        {
            attentionItems.Add(new AdminAttentionItemDto
            {
                Id = $"att_user_{sUser.Id}",
                Title = $"Tài khoản {sUser.DisplayName ?? sUser.Email} đang bị {(sUser.Status == "suspended" ? "tạm khóa" : "vô hiệu hóa")}",
                Description = $"Trạng thái tài khoản: {sUser.Status}, vai trò: {sUser.Role}. Cần quản trị viên kiểm tra và xử lý.",
                Severity = "warning",
                Timestamp = sUser.UpdatedAt.ToString("o"),
                ActionUrl = $"/admin/users/{sUser.Id}"
            });
        }

        var pendingLessons = await _db.ContentLessons
            .Where(l => l.Status == "in_review" || l.Status == "draft")
            .Take(5)
            .ToListAsync(ct);
        foreach (var pLesson in pendingLessons)
        {
            attentionItems.Add(new AdminAttentionItemDto
            {
                Id = $"att_les_{pLesson.Id}",
                Title = $"Bài học '{pLesson.Title}' đang ở trạng thái {pLesson.Status}",
                Description = "Học liệu cần kiểm duyệt chuyên môn trước khi xuất bản chính thức.",
                Severity = "info",
                Timestamp = pLesson.UpdatedAt.ToString("o"),
                ActionUrl = "/content/review"
            });
        }

        return new AdminDashboardDto
        {
            Metrics = new AdminMetricsDto
            {
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                SuspendedUsers = suspendedUsers,
                DisabledUsers = disabledUsers,
                LearnersCount = learnersCount,
                TeachersCount = teachersCount,
                ContentCount = contentCount,
                SupportCount = supportCount,
                AdminsCount = adminsCount,
                RecentNewUsersCount = recentNewUsersCount,
                CompletedLessonsTotal = completedLessonsTotal,
                StaffAccounts = totalUsers - learnersCount,
                SystemStatus = "healthy"
            },
            RecentActivities = activities,
            AttentionItems = attentionItems
        };
    }

    public async Task<AdminAnalyticsResponseDto> GetAnalyticsAsync(string range = "7d", CancellationToken ct = default)
    {
        int days = range switch
        {
            "30d" => 30,
            "month" => 30,
            "all" => 90,
            _ => 7
        };
        var startDate = _clock.UtcNow.Date.AddDays(-days + 1);

        var total = await _db.Users.CountAsync(u => !u.IsDeleted, ct);
        var totalSafe = Math.Max(total, 1);
        var learnerCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "learner", ct);
        var teacherCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "teacher", ct);
        var contentCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "content", ct);
        var supportCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "support", ct);
        var adminCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Role == "admin", ct);

        var roleDistribution = new List<UserDistributionItemDto>
        {
            new() { Name = "Học viên (Learner)", Key = "learner", Count = learnerCount, Percentage = (int)Math.Round((double)learnerCount * 100 / totalSafe), Color = "#0284c7" },
            new() { Name = "Giáo viên (Teacher)", Key = "teacher", Count = teacherCount, Percentage = (int)Math.Round((double)teacherCount * 100 / totalSafe), Color = "#8b5cf6" },
            new() { Name = "Nội dung (Content)", Key = "content", Count = contentCount, Percentage = (int)Math.Round((double)contentCount * 100 / totalSafe), Color = "#f59e0b" },
            new() { Name = "Hỗ trợ (Support)", Key = "support", Count = supportCount, Percentage = (int)Math.Round((double)supportCount * 100 / totalSafe), Color = "#10b981" },
            new() { Name = "Quản trị (Admin)", Key = "admin", Count = adminCount, Percentage = (int)Math.Round((double)adminCount * 100 / totalSafe), Color = "#ef4444" },
        };

        var activeCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "active", ct);
        var suspendedCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "suspended", ct);
        var disabledCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "disabled", ct);
        var pendingCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.Status == "pending", ct);

        var statusDistribution = new List<UserDistributionItemDto>
        {
            new() { Name = "Đang hoạt động", Key = "active", Count = activeCount, Percentage = (int)Math.Round((double)activeCount * 100 / totalSafe), Color = "#16a34a" },
            new() { Name = "Chờ duyệt", Key = "pending", Count = pendingCount, Percentage = (int)Math.Round((double)pendingCount * 100 / totalSafe), Color = "#eab308" },
            new() { Name = "Tạm khóa", Key = "suspended", Count = suspendedCount, Percentage = (int)Math.Round((double)suspendedCount * 100 / totalSafe), Color = "#f97316" },
            new() { Name = "Vô hiệu hóa", Key = "disabled", Count = disabledCount, Percentage = (int)Math.Round((double)disabledCount * 100 / totalSafe), Color = "#dc2626" },
        };

        var trends = new List<AnalyticsTrendPointDto>();
        for (int i = 0; i < days; i++)
        {
            var day = startDate.AddDays(i);
            var nextDay = day.AddDays(1);
            var newUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.CreatedAt >= day && u.CreatedAt < nextDay, ct);
            var completedLessons = await _db.LessonProgresses.CountAsync(lp => lp.OverallProgress >= 100 && lp.UpdatedAt >= day && lp.UpdatedAt < nextDay, ct);
            var activeUsers = await _db.Users.CountAsync(u => !u.IsDeleted && u.LastLoginAt.HasValue && u.LastLoginAt.Value >= day && u.LastLoginAt.Value < nextDay, ct);

            trends.Add(new AnalyticsTrendPointDto
            {
                Date = day.ToString("dd/MM"),
                ActiveUsers = activeUsers,
                NewUsers = newUsers,
                CompletedLessons = completedLessons,
                LessonsCompleted = completedLessons
            });
        }

        return new AdminAnalyticsResponseDto
        {
            Trends = trends,
            RoleDistribution = roleDistribution,
            StatusDistribution = statusDistribution
        };
    }

    public async Task<LearningReportsResponseDto> GetReportsAsync(
        string timeframe = "30d",
        string? subjectId = null,
        string? classId = null,
        CancellationToken ct = default)
    {
        int days = timeframe switch
        {
            "7d" => 7,
            "term" => 90,
            _ => 30
        };
        var startDate = _clock.UtcNow.Date.AddDays(-days + 1);

        List<string>? classLearnerIds = null;
        if (!string.IsNullOrWhiteSpace(classId) && classId != "all")
        {
            classLearnerIds = await _db.ClassroomStudents
                .Where(cs => cs.ClassroomId == classId)
                .Select(cs => cs.StudentId)
                .ToListAsync(ct);
        }

        var learnersQuery = _db.Users.Where(u => u.Role == "learner" && !u.IsDeleted);
        if (classLearnerIds != null)
        {
            learnersQuery = learnersQuery.Where(u => classLearnerIds.Contains(u.Id));
        }

        var totalLearners = await learnersQuery.CountAsync(ct);
        var activeLearners = await learnersQuery.CountAsync(u => u.Status == "active", ct);

        var lessonProgressQuery = _db.LessonProgresses.AsQueryable();
        if (classLearnerIds != null)
        {
            lessonProgressQuery = lessonProgressQuery.Where(lp => classLearnerIds.Contains(lp.UserId));
        }
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            lessonProgressQuery = lessonProgressQuery.Where(lp => lp.SubjectId == subjectId || (lp.SubjectId != null && lp.SubjectId.ToLower().Contains(subjectId.ToLower())));
        }

        var completedLessons = await lessonProgressQuery.CountAsync(lp => lp.OverallProgress >= 100, ct);

        var lessonsQuery = _db.ContentLessons.Where(l => l.Status == "published");
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            lessonsQuery = lessonsQuery.Where(l => l.Chapter!.SubjectId == subjectId || (l.Chapter!.Subject != null && l.Chapter.Subject.Name.ToLower().Contains(subjectId.ToLower())));
        }
        var totalPublishedLessons = await lessonsQuery.CountAsync(ct);
        var completionRatePercent = totalPublishedLessons > 0 && totalLearners > 0
            ? Math.Round((double)completedLessons * 100 / (totalPublishedLessons * totalLearners), 1)
            : 0.0;

        var attemptsQuery = _db.AssessmentAttempts
            .Where(a => a.CompletedAt.HasValue && a.CompletedAt.Value >= startDate && (a.ScoreScaled.HasValue || a.ScoreRaw.HasValue));

        if (classLearnerIds != null)
        {
            attemptsQuery = attemptsQuery.Where(a => classLearnerIds.Contains(a.UserId));
        }
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            attemptsQuery = attemptsQuery.Where(a => a.SubjectId == subjectId || (a.SubjectId != null && a.SubjectId.ToLower().Contains(subjectId.ToLower())));
        }

        var attempts = await attemptsQuery.ToListAsync(ct);

        var normalizedScores = attempts
            .Select(GetNormalizedScore)
            .Where(s => s.HasValue)
            .Select(s => s!.Value)
            .ToList();

        double avgScore = normalizedScores.Count > 0
            ? Math.Round(normalizedScores.Average(), 1)
            : 0.0;

        var excellentCount = normalizedScores.Count(s => s >= 9.0);
        var goodCount = normalizedScores.Count(s => s >= 8.0 && s < 9.0);
        var fairCount = normalizedScores.Count(s => s >= 6.5 && s < 8.0);
        var averageCount = normalizedScores.Count(s => s < 6.5);
        int attemptsTotal = normalizedScores.Count;

        var scoreDistribution = new List<ScoreDistributionDto>
        {
            new() { Range = "Xuất sắc (9.0 - 10)", Count = excellentCount, Percent = attemptsTotal > 0 ? Math.Round((double)excellentCount * 100 / attemptsTotal, 1) : 0.0 },
            new() { Range = "Giỏi (8.0 - 8.9)", Count = goodCount, Percent = attemptsTotal > 0 ? Math.Round((double)goodCount * 100 / attemptsTotal, 1) : 0.0 },
            new() { Range = "Khá (6.5 - 7.9)", Count = fairCount, Percent = attemptsTotal > 0 ? Math.Round((double)fairCount * 100 / attemptsTotal, 1) : 0.0 },
            new() { Range = "Trung bình (< 6.5)", Count = averageCount, Percent = attemptsTotal > 0 ? Math.Round((double)averageCount * 100 / attemptsTotal, 1) : 0.0 },
        };

        var activityTrend = new List<AnalyticsTrendPointDto>();
        for (int i = 0; i < days; i++)
        {
            var day = startDate.AddDays(i);
            var nextDay = day.AddDays(1);

            var activeUsersQuery = _db.Users.Where(u => !u.IsDeleted && u.Role == "learner" && u.LastLoginAt.HasValue && u.LastLoginAt.Value >= day && u.LastLoginAt.Value < nextDay);
            if (classLearnerIds != null)
            {
                activeUsersQuery = activeUsersQuery.Where(u => classLearnerIds.Contains(u.Id));
            }
            var active = await activeUsersQuery.CountAsync(ct);

            var completedDayQuery = lessonProgressQuery.Where(lp => lp.OverallProgress >= 100 && lp.UpdatedAt >= day && lp.UpdatedAt < nextDay);
            var completed = await completedDayQuery.CountAsync(ct);

            activityTrend.Add(new AnalyticsTrendPointDto
            {
                Date = day.ToString("dd/MM"),
                ActiveUsers = active,
                CompletedLessons = completed,
                LessonsCompleted = completed
            });
        }

        var subjects = await _db.ContentSubjects.Where(s => s.IsActive).ToListAsync(ct);
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            subjects = subjects.Where(s => s.Id == subjectId || s.Name.ToLower().Contains(subjectId.ToLower())).ToList();
        }

        var subjectProgress = new List<SubjectProgressReportDto>();
        foreach (var s in subjects)
        {
            var subjectLessons = await _db.ContentLessons.CountAsync(l => l.Chapter!.SubjectId == s.Id && l.Status == "published", ct);
            var subjectCompletedQuery = _db.LessonProgresses.Where(lp => lp.SubjectId == s.Id && lp.OverallProgress >= 100);
            if (classLearnerIds != null)
            {
                subjectCompletedQuery = subjectCompletedQuery.Where(lp => classLearnerIds.Contains(lp.UserId));
            }
            var subjectCompleted = await subjectCompletedQuery.CountAsync(ct);

            var prog = subjectLessons > 0 && totalLearners > 0
                ? Math.Round((double)subjectCompleted * 100 / (subjectLessons * totalLearners), 1)
                : 0.0;

            subjectProgress.Add(new SubjectProgressReportDto
            {
                Subject = s.Name,
                Progress = prog,
                LearnersCount = totalLearners
            });
        }

        return new LearningReportsResponseDto
        {
            TotalLearners = totalLearners,
            ActiveLearners = activeLearners,
            CompletedLessons = completedLessons,
            CompletionRatePercent = completionRatePercent,
            AverageAssessmentScore = avgScore,
            ActivityTrend = activityTrend,
            SubjectProgress = subjectProgress,
            ScoreDistribution = scoreDistribution
        };
    }

    private static double? GetNormalizedScore(AssessmentAttempt attempt)
    {
        if (attempt.ScoreScaled.HasValue)
        {
            var scaled = attempt.ScoreScaled.Value;
            if (scaled <= 1.0 && attempt.ScoreMax <= 1.0)
            {
                return Math.Round(scaled * 10.0, 2);
            }
            return Math.Round(scaled, 2);
        }

        if (attempt.ScoreRaw.HasValue)
        {
            var raw = attempt.ScoreRaw.Value;
            var max = attempt.ScoreMax > 0 ? attempt.ScoreMax : 10.0;
            return Math.Round((raw / max) * 10.0, 2);
        }

        return null;
    }
}
