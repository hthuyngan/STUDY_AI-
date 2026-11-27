using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Admin;

public class AdminDashboardService : IAdminDashboardService
{
    private readonly IApplicationDbContext _db;
    private readonly IClock _clock;

    public AdminDashboardService(IApplicationDbContext db, IClock clock)
    {
        _db = db;
        _clock = clock;
    }

    private static readonly TimeSpan BangkokOffset = TimeSpan.FromHours(7);

    private (DateTimeOffset StartUtc, DateTimeOffset EndUtc, DateTime StartLocalDate, int Days) ResolveRange(
        string range,
        DateTimeOffset? from,
        DateTimeOffset? to)
    {
        var nowUtc = _clock.UtcNow;
        var nowLocal = nowUtc.ToOffset(BangkokOffset);

        if (range == "custom" && from.HasValue && to.HasValue && to.Value >= from.Value)
        {
            var startLocalDate = from.Value.ToOffset(BangkokOffset).Date;
            var rawEndLocalDate = to.Value.ToOffset(BangkokOffset).Date;
            var days = Math.Clamp((rawEndLocalDate - startLocalDate).Days + 1, 1, 365);
            var normalizedEndLocalDate = startLocalDate.AddDays(days - 1);
            var startUtc = new DateTimeOffset(startLocalDate, BangkokOffset).ToUniversalTime();
            var endUtc = new DateTimeOffset(normalizedEndLocalDate.AddDays(1), BangkokOffset).ToUniversalTime();
            return (startUtc, endUtc, startLocalDate, days);
        }

        int resolvedDays = range switch
        {
            "30d" or "month" => 30,
            "90d" or "term" or "all" => 90,
            _ => 7
        };

        var localStart = nowLocal.Date.AddDays(-resolvedDays + 1);
        var resolvedStartUtc = new DateTimeOffset(localStart, BangkokOffset).ToUniversalTime();
        var resolvedEndUtc = new DateTimeOffset(nowLocal.Date.AddDays(1), BangkokOffset).ToUniversalTime();
        return (resolvedStartUtc, resolvedEndUtc, localStart, resolvedDays);
    }

    public async Task<AdminDashboardDto> GetDashboardAsync(
        string range = "7d",
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        CancellationToken ct = default)
    {
        var (startUtc, endUtc, _, _) = ResolveRange(range, from, to);

        var roleCounts = await _db.Users
            .Where(u => !u.IsDeleted)
            .GroupBy(u => new { u.Role, u.Status })
            .Select(g => new { g.Key.Role, g.Key.Status, Count = g.Count() })
            .ToListAsync(ct);

        var totalUsers = roleCounts.Sum(x => x.Count);
        var activeUsers = roleCounts.Where(x => x.Status == "active").Sum(x => x.Count);
        var suspendedUsers = roleCounts.Where(x => x.Status == "suspended").Sum(x => x.Count);
        var disabledUsers = roleCounts.Where(x => x.Status == "disabled").Sum(x => x.Count);
        var learnersCount = roleCounts.Where(x => x.Role == "learner").Sum(x => x.Count);
        var teachersCount = roleCounts.Where(x => x.Role == "teacher").Sum(x => x.Count);
        var contentCount = roleCounts.Where(x => x.Role == "content").Sum(x => x.Count);
        var supportCount = roleCounts.Where(x => x.Role == "support").Sum(x => x.Count);
        var adminsCount = roleCounts.Where(x => x.Role == "admin").Sum(x => x.Count);

        var newUsersInRange = await _db.Users.CountAsync(
            u => !u.IsDeleted && u.CreatedAt >= startUtc && u.CreatedAt < endUtc, ct);

        var activeLearnersInRange = await _db.Users.CountAsync(
            u => !u.IsDeleted && u.Role == "learner" && u.LastLoginAt.HasValue && u.LastLoginAt.Value >= startUtc && u.LastLoginAt.Value < endUtc, ct);

        var completedLessonsTotal = await _db.LessonProgresses.CountAsync(lp => lp.OverallProgress >= 100, ct);

        var practiceSessionsInRange = await _db.LearningEvents.CountAsync(
            e => e.Timestamp >= startUtc && e.Timestamp < endUtc && (e.Type == "practice_completed" || e.Type == "practice_session"), ct);

        var assessmentAttemptsInRange = await _db.AssessmentAttempts.CountAsync(
            a => a.StartedAt >= startUtc && a.StartedAt < endUtc, ct);

        var aiLogsSummary = await _db.AiUsageLogs
            .Where(l => l.CreatedAt >= startUtc && l.CreatedAt < endUtc)
            .GroupBy(l => l.Status)
            .Select(g => new
            {
                Status = g.Key,
                Count = g.Count(),
                Tokens = g.Sum(x => (long)x.InputTokens + x.OutputTokens)
            })
            .ToListAsync(ct);

        var aiRequestsInRange = aiLogsSummary.Sum(x => x.Count);
        var aiTotalTokensInRange = aiLogsSummary.Sum(x => x.Tokens);
        var aiErrorCountInRange = aiLogsSummary.Where(x => x.Status != "success").Sum(x => x.Count);
        var aiErrorRatePercent = aiRequestsInRange > 0
            ? Math.Round((double)aiErrorCountInRange * 100.0 / aiRequestsInRange, 2)
            : 0.0;

        var recentLogs = await _db.StaffAuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(15)
            .ToListAsync(ct);

        var actorIds = recentLogs.Select(l => l.ActorUserId).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        var actorNames = await _db.Users
            .Where(u => actorIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName ?? u.Email ?? u.Id, ct);

        var activities = recentLogs.Select(log => new AdminActivityDto
        {
            Id = log.Id,
            Action = log.Action,
            Actor = actorNames.TryGetValue(log.ActorUserId, out var name) ? name : log.ActorUserId,
            TargetType = log.TargetType,
            TargetId = log.TargetId,
            Payload = log.Payload,
            Timestamp = log.CreatedAt.ToString("o")
        }).ToList();

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

        var openSupportTicketsCount = await _db.SupportTickets.CountAsync(
            t => t.Status == "OPEN" || t.Status == "IN_PROGRESS" || t.Status == "WAITING_FOR_USER", ct);

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
                RecentNewUsersCount = newUsersInRange,
                NewUsersInRange = newUsersInRange,
                ActiveLearnersInRange = activeLearnersInRange,
                CompletedLessonsTotal = completedLessonsTotal,
                PracticeSessionsInRange = practiceSessionsInRange,
                AssessmentAttemptsInRange = assessmentAttemptsInRange,
                AiRequestsInRange = aiRequestsInRange,
                AiTotalTokensInRange = aiTotalTokensInRange,
                AiErrorCountInRange = aiErrorCountInRange,
                AiErrorRatePercent = aiErrorRatePercent,
                OpenSupportTicketsCount = openSupportTicketsCount,
                SubscriptionsModuleAvailable = false,
                ActiveSubscriptionsCount = null,
                ActualRevenueVnd = null,
                StaffAccounts = totalUsers - learnersCount,
                SystemStatus = "healthy",
                Timezone = "Asia/Bangkok",
                RangeStartUtc = startUtc.ToString("o"),
                RangeEndUtc = endUtc.ToString("o")
            },
            RecentActivities = activities,
            AttentionItems = attentionItems
        };
    }

    public async Task<AdminAnalyticsResponseDto> GetAnalyticsAsync(
        string range = "7d",
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        CancellationToken ct = default)
    {
        var (startUtc, endUtc, startLocalDate, days) = ResolveRange(range, from, to);

        var roleCounts = await _db.Users
            .Where(u => !u.IsDeleted)
            .GroupBy(u => u.Role)
            .Select(g => new { Role = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var total = roleCounts.Sum(x => x.Count);
        var totalSafe = Math.Max(total, 1);
        int GetRoleCount(string r) => roleCounts.FirstOrDefault(x => x.Role == r)?.Count ?? 0;

        var learnerCount = GetRoleCount("learner");
        var teacherCount = GetRoleCount("teacher");
        var contentCount = GetRoleCount("content");
        var supportCount = GetRoleCount("support");
        var adminCount = GetRoleCount("admin");

        var roleDistribution = new List<UserDistributionItemDto>
        {
            new() { Name = "Học viên (Learner)", Key = "learner", Count = learnerCount, Percentage = (int)Math.Round((double)learnerCount * 100 / totalSafe), Color = "#1D4ED8" },
            new() { Name = "Giáo viên (Teacher)", Key = "teacher", Count = teacherCount, Percentage = (int)Math.Round((double)teacherCount * 100 / totalSafe), Color = "#0284C7" },
            new() { Name = "Nội dung (Content)", Key = "content", Count = contentCount, Percentage = (int)Math.Round((double)contentCount * 100 / totalSafe), Color = "#D97706" },
            new() { Name = "Hỗ trợ (Support)", Key = "support", Count = supportCount, Percentage = (int)Math.Round((double)supportCount * 100 / totalSafe), Color = "#16A34A" },
            new() { Name = "Quản trị (Admin)", Key = "admin", Count = adminCount, Percentage = (int)Math.Round((double)adminCount * 100 / totalSafe), Color = "#DC2626" },
        };

        var statusCounts = await _db.Users
            .Where(u => !u.IsDeleted)
            .GroupBy(u => u.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        int GetStatusCount(string s) => statusCounts.FirstOrDefault(x => x.Status == s)?.Count ?? 0;
        var activeCount = GetStatusCount("active");
        var suspendedCount = GetStatusCount("suspended");
        var disabledCount = GetStatusCount("disabled");
        var pendingCount = GetStatusCount("pending");

        var statusDistribution = new List<UserDistributionItemDto>
        {
            new() { Name = "Đang hoạt động", Key = "active", Count = activeCount, Percentage = (int)Math.Round((double)activeCount * 100 / totalSafe), Color = "#16A34A" },
            new() { Name = "Chờ duyệt", Key = "pending", Count = pendingCount, Percentage = (int)Math.Round((double)pendingCount * 100 / totalSafe), Color = "#D97706" },
            new() { Name = "Tạm khóa", Key = "suspended", Count = suspendedCount, Percentage = (int)Math.Round((double)suspendedCount * 100 / totalSafe), Color = "#F97316" },
            new() { Name = "Vô hiệu hóa", Key = "disabled", Count = disabledCount, Percentage = (int)Math.Round((double)disabledCount * 100 / totalSafe), Color = "#DC2626" },
        };

        var newUserDates = await _db.Users
            .Where(u => !u.IsDeleted && u.CreatedAt >= startUtc && u.CreatedAt < endUtc)
            .Select(u => u.CreatedAt)
            .ToListAsync(ct);

        var activeUserDates = await _db.Users
            .Where(u => !u.IsDeleted && u.LastLoginAt.HasValue && u.LastLoginAt.Value >= startUtc && u.LastLoginAt.Value < endUtc)
            .Select(u => u.LastLoginAt!.Value)
            .ToListAsync(ct);

        var completedLessonDates = await _db.LessonProgresses
            .Where(lp => lp.OverallProgress >= 100 && lp.UpdatedAt >= startUtc && lp.UpdatedAt < endUtc)
            .Select(lp => lp.UpdatedAt)
            .ToListAsync(ct);

        var practiceEventDates = await _db.LearningEvents
            .Where(e => e.Timestamp >= startUtc && e.Timestamp < endUtc && (e.Type == "practice_completed" || e.Type == "practice_session"))
            .Select(e => e.Timestamp)
            .ToListAsync(ct);

        var attemptDates = await _db.AssessmentAttempts
            .Where(a => a.StartedAt >= startUtc && a.StartedAt < endUtc)
            .Select(a => a.StartedAt)
            .ToListAsync(ct);

        var aiLogRows = await _db.AiUsageLogs
            .Where(l => l.CreatedAt >= startUtc && l.CreatedAt < endUtc)
            .Select(l => new { l.CreatedAt, l.InputTokens, l.OutputTokens, l.Status })
            .ToListAsync(ct);

        var newUsersByDay = newUserDates.GroupBy(d => d.ToOffset(BangkokOffset).Date).ToDictionary(g => g.Key, g => g.Count());
        var activeUsersByDay = activeUserDates.GroupBy(d => d.ToOffset(BangkokOffset).Date).ToDictionary(g => g.Key, g => g.Count());
        var completedByDay = completedLessonDates.GroupBy(d => d.ToOffset(BangkokOffset).Date).ToDictionary(g => g.Key, g => g.Count());
        var practiceByDay = practiceEventDates.GroupBy(d => d.ToOffset(BangkokOffset).Date).ToDictionary(g => g.Key, g => g.Count());
        var attemptsByDay = attemptDates.GroupBy(d => d.ToOffset(BangkokOffset).Date).ToDictionary(g => g.Key, g => g.Count());
        var aiByDay = aiLogRows.GroupBy(l => l.CreatedAt.ToOffset(BangkokOffset).Date).ToDictionary(
            g => g.Key,
            g => new
            {
                Requests = g.Count(),
                Tokens = g.Sum(x => (long)x.InputTokens + x.OutputTokens),
                Errors = g.Count(x => x.Status != "success")
            });

        var trends = new List<AnalyticsTrendPointDto>();
        for (int i = 0; i < days; i++)
        {
            var day = startLocalDate.AddDays(i);
            var completed = completedByDay.GetValueOrDefault(day, 0);
            var aiDay = aiByDay.TryGetValue(day, out var aiVal) ? aiVal : null;

            trends.Add(new AnalyticsTrendPointDto
            {
                Date = day.ToString("dd/MM"),
                ActiveUsers = activeUsersByDay.GetValueOrDefault(day, 0),
                NewUsers = newUsersByDay.GetValueOrDefault(day, 0),
                CompletedLessons = completed,
                LessonsCompleted = completed,
                PracticeSessions = practiceByDay.GetValueOrDefault(day, 0),
                AssessmentAttempts = attemptsByDay.GetValueOrDefault(day, 0),
                AiRequests = aiDay?.Requests ?? 0,
                AiTokens = aiDay?.Tokens ?? 0,
                AiErrors = aiDay?.Errors ?? 0
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