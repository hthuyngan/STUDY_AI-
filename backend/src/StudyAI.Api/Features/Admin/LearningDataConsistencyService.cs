using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Admin;

public class LearningDataConsistencyService : ILearningDataConsistencyService
{
    private readonly IApplicationDbContext _db;

    public LearningDataConsistencyService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<DataConsistencyReportDto> ScanDataConsistencyAsync(CancellationToken cancellationToken = default)
    {
        var anomalies = new List<ConsistencyAnomalyItemDto>();

        // 1. Scan Student Topic Mastery
        var masteries = await _db.StudentTopicMasteries
            .Select(m => new
            {
                m.Id,
                m.UserId,
                m.TopicName,
                m.AttemptCount,
                m.CorrectCount,
                m.MasteryScore,
                m.Status
            })
            .ToListAsync(cancellationToken);

        int totalStudents = masteries.Select(m => m.UserId).Distinct().Count();

        foreach (var m in masteries)
        {
            if (m.CorrectCount > m.AttemptCount && m.AttemptCount > 0)
            {
                anomalies.Add(new ConsistencyAnomalyItemDto
                {
                    AnomalyType = "mastery_score_mismatch",
                    Severity = "high",
                    EntityId = m.Id,
                    StudentId = m.UserId,
                    Description = $"Chủ đề '{m.TopicName}': Số câu đúng ({m.CorrectCount}) lớn hơn số lần thử ({m.AttemptCount}).",
                    AutoRepairable = true
                });
            }

            if (m.MasteryScore < 0 || m.MasteryScore > 100.0)
            {
                anomalies.Add(new ConsistencyAnomalyItemDto
                {
                    AnomalyType = "mastery_score_mismatch",
                    Severity = "high",
                    EntityId = m.Id,
                    StudentId = m.UserId,
                    Description = $"Điểm năng lực {m.MasteryScore} vượt ngoài khoảng hợp lệ [0, 100].",
                    AutoRepairable = true
                });
            }

            // Inconsistent status
            if (m.MasteryScore >= 80.0 && m.Status == "needs_reinforcement")
            {
                anomalies.Add(new ConsistencyAnomalyItemDto
                {
                    AnomalyType = "mastery_score_mismatch",
                    Severity = "medium",
                    EntityId = m.Id,
                    StudentId = m.UserId,
                    Description = $"Điểm năng lực {m.MasteryScore} cao nhưng trạng thái ghi 'needs_reinforcement'.",
                    AutoRepairable = true
                });
            }
        }

        // 2. Scan Assignment Submissions (Check for duplicate student-assignment records)
        var submissions = await _db.AssignmentSubmissions
            .Select(s => new
            {
                s.Id,
                s.AssignmentId,
                s.StudentId,
                s.Score
            })
            .ToListAsync(cancellationToken);

        var duplicateGroups = submissions
            .GroupBy(s => new { s.AssignmentId, s.StudentId })
            .Where(g => g.Count() > 1);

        foreach (var grp in duplicateGroups)
        {
            anomalies.Add(new ConsistencyAnomalyItemDto
            {
                AnomalyType = "duplicate_submission",
                Severity = "medium",
                EntityId = grp.Key.AssignmentId,
                StudentId = grp.Key.StudentId,
                Description = $"Phát hiện {grp.Count()} bản nộp bài trùng lặp cho cùng một bài tập.",
                AutoRepairable = false
            });
        }

        // 3. Scan Assessment Attempts
        var attempts = await _db.AssessmentAttempts
            .Select(a => new
            {
                a.Id,
                a.UserId,
                a.StartedAt,
                a.CompletedAt,
                a.ScoreRaw,
                a.ScoreMax
            })
            .ToListAsync(cancellationToken);

        foreach (var att in attempts)
        {
            if (att.CompletedAt.HasValue && att.CompletedAt.Value < att.StartedAt)
            {
                anomalies.Add(new ConsistencyAnomalyItemDto
                {
                    AnomalyType = "abnormal_progress_velocity",
                    Severity = "high",
                    EntityId = att.Id,
                    StudentId = att.UserId,
                    Description = "Thời điểm nộp bài xảy ra trước thời điểm bắt đầu làm bài.",
                    AutoRepairable = true
                });
            }

            if (att.ScoreRaw.HasValue && att.ScoreRaw.Value > att.ScoreMax && att.ScoreMax > 0)
            {
                anomalies.Add(new ConsistencyAnomalyItemDto
                {
                    AnomalyType = "mastery_score_mismatch",
                    Severity = "high",
                    EntityId = att.Id,
                    StudentId = att.UserId,
                    Description = $"Điểm số ({att.ScoreRaw.Value}) vượt quá điểm tối đa ({att.ScoreMax}).",
                    AutoRepairable = true
                });
            }
        }

        double deductions = anomalies.Count(a => a.Severity == "high") * 5.0 + anomalies.Count(a => a.Severity == "medium") * 2.0;
        double integrityScore = Math.Clamp(Math.Round(100.0 - deductions, 1), 0.0, 100.0);

        return new DataConsistencyReportDto
        {
            AuditedAt = DateTimeOffset.UtcNow,
            TotalStudentsScanned = totalStudents,
            TotalMasteryRecordsScanned = masteries.Count,
            TotalAttemptsScanned = attempts.Count,
            AnomaliesFound = anomalies.Count,
            IntegrityScore = integrityScore,
            Anomalies = anomalies
        };
    }

    public async Task<DataConsistencyRepairReportDto> RepairDataConsistencyAsync(
        string adminUserId,
        DataConsistencyRepairRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var opId = Guid.NewGuid().ToString("N")[..12];

        if (request.DryRun)
        {
            var impactList = new List<RepairImpactItemDto>();
            var masteries = await _db.StudentTopicMasteries.AsNoTracking().ToListAsync(cancellationToken);
            foreach (var m in masteries)
            {
                if (request.AnomalyEntityIds != null && request.AnomalyEntityIds.Count > 0 && !request.AnomalyEntityIds.Contains(m.Id))
                {
                    continue;
                }

                if (m.MasteryScore < 0 || m.MasteryScore > 100.0)
                {
                    impactList.Add(new RepairImpactItemDto
                    {
                        EntityType = "StudentTopicMastery",
                        EntityId = m.Id,
                        AnomalyType = "mastery_score_mismatch",
                        FieldModified = "MasteryScore",
                        OldValue = m.MasteryScore.ToString("F1"),
                        NewValue = Math.Clamp(m.MasteryScore, 0.0, 100.0).ToString("F1"),
                        Explanation = "Hiệu chỉnh điểm năng lực về khoảng hợp lệ [0, 100]"
                    });
                }

                if (m.CorrectCount > m.AttemptCount && m.AttemptCount > 0)
                {
                    impactList.Add(new RepairImpactItemDto
                    {
                        EntityType = "StudentTopicMastery",
                        EntityId = m.Id,
                        AnomalyType = "mastery_score_mismatch",
                        FieldModified = "AttemptCount",
                        OldValue = m.AttemptCount.ToString(),
                        NewValue = m.CorrectCount.ToString(),
                        Explanation = "Điều chỉnh số lần thử bằng số câu đúng để bảo đảm logic đếm"
                    });
                }
            }

            var attempts = await _db.AssessmentAttempts.AsNoTracking().ToListAsync(cancellationToken);
            foreach (var att in attempts)
            {
                if (request.AnomalyEntityIds != null && request.AnomalyEntityIds.Count > 0 && !request.AnomalyEntityIds.Contains(att.Id))
                {
                    continue;
                }

                if (att.CompletedAt.HasValue && att.CompletedAt.Value < att.StartedAt)
                {
                    impactList.Add(new RepairImpactItemDto
                    {
                        EntityType = "AssessmentAttempt",
                        EntityId = att.Id,
                        AnomalyType = "abnormal_progress_velocity",
                        FieldModified = "CompletedAt",
                        OldValue = att.CompletedAt.Value.ToString("o"),
                        NewValue = att.StartedAt.AddMinutes(1).ToString("o"),
                        Explanation = "Căn chỉnh thời điểm hoàn thành sau thời điểm bắt đầu"
                    });
                }

                if (att.ScoreRaw.HasValue && att.ScoreRaw.Value > att.ScoreMax && att.ScoreMax > 0)
                {
                    impactList.Add(new RepairImpactItemDto
                    {
                        EntityType = "AssessmentAttempt",
                        EntityId = att.Id,
                        AnomalyType = "mastery_score_mismatch",
                        FieldModified = "ScoreRaw",
                        OldValue = att.ScoreRaw.Value.ToString("F1"),
                        NewValue = att.ScoreMax.ToString("F1"),
                        Explanation = "Giới hạn điểm thô không vượt quá điểm tối đa của bài thi"
                    });
                }
            }

            return new DataConsistencyRepairReportDto
            {
                OperationId = opId,
                WasDryRun = true,
                Status = "DRY_RUN_PREVIEW",
                ExecutedAt = DateTimeOffset.UtcNow,
                AnomaliesScanned = impactList.Count,
                AnomaliesAddressed = impactList.Count,
                ImpactReport = impactList,
                AuditLogId = null
            };
        }

        async Task<DataConsistencyRepairReportDto> ExecuteLiveRepairAsync()
        {
            var liveImpact = new List<RepairImpactItemDto>();
            var masteries = await _db.StudentTopicMasteries.ToListAsync(cancellationToken);
            foreach (var m in masteries)
            {
                if (request.AnomalyEntityIds != null && request.AnomalyEntityIds.Count > 0 && !request.AnomalyEntityIds.Contains(m.Id))
                {
                    continue;
                }

                if (m.MasteryScore < 0 || m.MasteryScore > 100.0)
                {
                    double oldScore = m.MasteryScore;
                    m.MasteryScore = Math.Clamp(m.MasteryScore, 0.0, 100.0);
                    liveImpact.Add(new RepairImpactItemDto
                    {
                        EntityType = "StudentTopicMastery",
                        EntityId = m.Id,
                        AnomalyType = "mastery_score_mismatch",
                        FieldModified = "MasteryScore",
                        OldValue = oldScore.ToString("F1"),
                        NewValue = m.MasteryScore.ToString("F1"),
                        Explanation = "Hiệu chỉnh điểm năng lực về khoảng hợp lệ [0, 100]"
                    });
                }

                if (m.CorrectCount > m.AttemptCount && m.AttemptCount > 0)
                {
                    int oldAttempt = m.AttemptCount;
                    m.AttemptCount = m.CorrectCount;
                    liveImpact.Add(new RepairImpactItemDto
                    {
                        EntityType = "StudentTopicMastery",
                        EntityId = m.Id,
                        AnomalyType = "mastery_score_mismatch",
                        FieldModified = "AttemptCount",
                        OldValue = oldAttempt.ToString(),
                        NewValue = m.CorrectCount.ToString(),
                        Explanation = "Điều chỉnh số lần thử bằng số câu đúng để bảo đảm logic đếm"
                    });
                }
            }

            var attempts = await _db.AssessmentAttempts.ToListAsync(cancellationToken);
            foreach (var att in attempts)
            {
                if (request.AnomalyEntityIds != null && request.AnomalyEntityIds.Count > 0 && !request.AnomalyEntityIds.Contains(att.Id))
                {
                    continue;
                }

                if (att.CompletedAt.HasValue && att.CompletedAt.Value < att.StartedAt)
                {
                    var oldCompleted = att.CompletedAt.Value;
                    att.CompletedAt = att.StartedAt.AddMinutes(1);
                    liveImpact.Add(new RepairImpactItemDto
                    {
                        EntityType = "AssessmentAttempt",
                        EntityId = att.Id,
                        AnomalyType = "abnormal_progress_velocity",
                        FieldModified = "CompletedAt",
                        OldValue = oldCompleted.ToString("o"),
                        NewValue = att.CompletedAt.Value.ToString("o"),
                        Explanation = "Căn chỉnh thời điểm hoàn thành sau thời điểm bắt đầu"
                    });
                }

                if (att.ScoreRaw.HasValue && att.ScoreRaw.Value > att.ScoreMax && att.ScoreMax > 0)
                {
                    double oldScore = att.ScoreRaw.Value;
                    att.ScoreRaw = att.ScoreMax;
                    liveImpact.Add(new RepairImpactItemDto
                    {
                        EntityType = "AssessmentAttempt",
                        EntityId = att.Id,
                        AnomalyType = "mastery_score_mismatch",
                        FieldModified = "ScoreRaw",
                        OldValue = oldScore.ToString("F1"),
                        NewValue = att.ScoreMax.ToString("F1"),
                        Explanation = "Giới hạn điểm thô không vượt quá điểm tối đa của bài thi"
                    });
                }
            }

            string auditLogId = $"log_{Guid.NewGuid():N}"[..12];
            _db.StaffAuditLogs.Add(new StaffAuditLog
            {
                Id = auditLogId,
                ActorUserId = adminUserId,
                Action = "DATA_CONSISTENCY_REPAIR",
                TargetType = "SystemDatabase",
                TargetId = opId,
                Payload = System.Text.Json.JsonSerializer.Serialize(new
                {
                    operationId = opId,
                    recordsRepaired = liveImpact.Count,
                    dryRun = false
                }),
                CreatedAt = DateTimeOffset.UtcNow
            });

            await _db.SaveChangesAsync(cancellationToken);

            return new DataConsistencyRepairReportDto
            {
                OperationId = opId,
                WasDryRun = false,
                Status = "COMMITTED",
                ExecutedAt = DateTimeOffset.UtcNow,
                AnomaliesScanned = liveImpact.Count,
                AnomaliesAddressed = liveImpact.Count,
                ImpactReport = liveImpact,
                AuditLogId = auditLogId
            };
        }

        if (_db.Database.IsRelational())
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var report = await ExecuteLiveRepairAsync();
                    await transaction.CommitAsync(cancellationToken);
                    return report;
                }
                catch
                {
                    await transaction.RollbackAsync(cancellationToken);
                    throw;
                }
            });
        }
        else
        {
            return await ExecuteLiveRepairAsync();
        }
    }
}