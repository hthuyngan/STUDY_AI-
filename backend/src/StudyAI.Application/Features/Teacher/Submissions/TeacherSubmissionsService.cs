using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Teacher.Submissions;

public class TeacherSubmissionsService : ITeacherSubmissionsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public TeacherSubmissionsService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    private static bool IsAdminRole(string userRole) =>
        string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);

    private static bool IsTeacherRole(string userRole) =>
        string.Equals(userRole, "teacher", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);

    public async Task<SubmissionDto> SubmitAssignmentAsync(
        string userId,
        string userRole,
        string assignmentId,
        CreateSubmissionRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        if (string.IsNullOrWhiteSpace(dto.Content))
        {
            throw new ValidationException("Nội dung bài làm không được để trống");
        }

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
            .FirstOrDefaultAsync(a => a.Id == assignmentId, cancellationToken);

        if (assignment == null)
        {
            throw new NotFoundException("Không tìm thấy bài tập");
        }

        if (assignment.Status == "draft" || assignment.Status == "closed" || assignment.Status == "archived")
        {
            throw new ValidationException(assignment.Status == "draft"
                ? "Bài tập đang ở trạng thái bản nháp, chưa được phát hành"
                : "Bài tập đã đóng hoặc được lưu trữ, không nhận thêm bài nộp");
        }

        var now = _clock.UtcNow;
        if (now > assignment.DueDate)
        {
            throw new ValidationException("Hạn nộp bài tập đã kết thúc");
        }

        if (!IsAdminRole(userRole))
        {
            var isEnrolled = await _db.ClassroomStudents.AnyAsync(
                cs => cs.ClassroomId == assignment.ClassroomId && cs.StudentId == userId,
                cancellationToken);

            if (!isEnrolled)
            {
                throw new ForbiddenException("Bạn không phải học sinh của lớp học này.");
            }
        }

        var existingSubmission = await _db.AssignmentSubmissions
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == userId, cancellationToken);

        if (existingSubmission != null)
        {
            if (existingSubmission.Status == "graded")
            {
                throw new ValidationException("Bài tập đã được giáo viên chấm điểm, không thể nộp lại");
            }

            existingSubmission.Content = dto.Content.Trim();
            existingSubmission.SubmittedAt = now;
            existingSubmission.Status = "submitted";

            await _db.SaveChangesAsync(cancellationToken);

            return new SubmissionDto
            {
                Id = existingSubmission.Id,
                AssignmentId = existingSubmission.AssignmentId,
                AssignmentTitle = assignment.Title,
                StudentId = existingSubmission.StudentId,
                Content = existingSubmission.Content,
                SubmittedAt = existingSubmission.SubmittedAt,
                Status = existingSubmission.Status,
                Score = existingSubmission.Score,
                Feedback = existingSubmission.Feedback,
                GradedAt = existingSubmission.GradedAt,
                GradedByTeacherId = existingSubmission.GradedByTeacherId,
            };
        }

        var student = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);

        var submission = new AssignmentSubmission
        {
            Id = $"sub-{Guid.NewGuid():N}"[..12],
            AssignmentId = assignmentId,
            StudentId = userId,
            Content = dto.Content.Trim(),
            SubmittedAt = now,
            Status = "submitted",
        };

        _db.AssignmentSubmissions.Add(submission);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException("Bài nộp đã tồn tại hoặc xảy ra xung đột khi lưu");
        }

        return new SubmissionDto
        {
            Id = submission.Id,
            AssignmentId = submission.AssignmentId,
            AssignmentTitle = assignment.Title,
            StudentId = submission.StudentId,
            StudentName = student?.DisplayName ?? student?.Email ?? "Học sinh",
            StudentEmail = student?.Email,
            Content = submission.Content,
            SubmittedAt = submission.SubmittedAt,
            Status = submission.Status,
            Score = null,
            Feedback = null,
        };
    }

    public async Task<SubmissionDto> GetMySubmissionAsync(
        string userId,
        string assignmentId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var assignment = await _db.Assignments.FindAsync(new object[] { assignmentId }, cancellationToken);
        if (assignment == null) throw new NotFoundException("Không tìm thấy bài tập");

        var submission = await _db.AssignmentSubmissions
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == userId, cancellationToken);

        if (submission == null)
        {
            throw new NotFoundException("Chưa có bài nộp nào cho bài tập này");
        }

        return new SubmissionDto
        {
            Id = submission.Id,
            AssignmentId = submission.AssignmentId,
            AssignmentTitle = assignment.Title,
            StudentId = submission.StudentId,
            StudentName = submission.Student?.DisplayName ?? submission.Student?.Email ?? "Học sinh",
            StudentEmail = submission.Student?.Email,
            Content = submission.Content,
            SubmittedAt = submission.SubmittedAt,
            Status = submission.Status,
            Score = submission.Score,
            Feedback = submission.Feedback,
            GradedAt = submission.GradedAt,
            GradedByTeacherId = submission.GradedByTeacherId,
        };
    }

    public async Task<List<SubmissionDto>> GetAssignmentSubmissionsAsync(
        string userId,
        string userRole,
        string assignmentId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
            .FirstOrDefaultAsync(a => a.Id == assignmentId, cancellationToken);

        if (assignment == null) throw new NotFoundException("Không tìm thấy bài tập");

        if (!IsAdminRole(userRole) && assignment.CreatedByTeacherId != userId && assignment.Classroom?.TeacherId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền xem danh sách bài nộp của bài tập này.");
        }

        var submissions = await _db.AssignmentSubmissions
            .Where(s => s.AssignmentId == assignmentId)
            .Include(s => s.Student)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync(cancellationToken);

        return submissions.Select(s => new SubmissionDto
        {
            Id = s.Id,
            AssignmentId = s.AssignmentId,
            AssignmentTitle = assignment.Title,
            StudentId = s.StudentId,
            StudentName = s.Student?.DisplayName ?? s.Student?.Email ?? "Học sinh",
            StudentEmail = s.Student?.Email,
            Content = s.Content,
            SubmittedAt = s.SubmittedAt,
            Status = s.Status,
            Score = s.Score,
            Feedback = s.Feedback,
            GradedAt = s.GradedAt,
            GradedByTeacherId = s.GradedByTeacherId,
        }).ToList();
    }

    public async Task<SubmissionDto> GradeSubmissionAsync(
        string userId,
        string userRole,
        string assignmentId,
        string submissionId,
        GradeSubmissionRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
            .FirstOrDefaultAsync(a => a.Id == assignmentId, cancellationToken);

        if (assignment == null) throw new NotFoundException("Không tìm thấy bài tập");

        if (!IsAdminRole(userRole) && assignment.CreatedByTeacherId != userId && assignment.Classroom?.TeacherId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền chấm bài tập này.");
        }

        if (assignment.Status == "archived")
        {
            throw new ValidationException("Bài tập đã được lưu trữ, không thể chấm điểm.");
        }

        if (dto.Score < 0 || dto.Score > assignment.MaxScore)
        {
            throw new ValidationException($"Điểm số phải nằm trong khoảng từ 0 đến {assignment.MaxScore}");
        }

        var submission = await _db.AssignmentSubmissions
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.Id == submissionId && s.AssignmentId == assignmentId, cancellationToken);

        if (submission == null)
        {
            throw new NotFoundException("Không tìm thấy bài nộp");
        }

        var now = _clock.UtcNow;
        bool isRegrade = submission.Status == "graded" && submission.Score.HasValue;
        double? previousScore = submission.Score;

        submission.Score = dto.Score;
        submission.Feedback = dto.Feedback?.Trim();
        submission.Status = "graded";
        submission.GradedAt = now;
        submission.GradedByTeacherId = userId;

        // Auto-update student topic mastery upon grading attributed to canonical subject
        var rawTopic = assignment.Title.Replace("[Can thiệp bổ trợ]", "").Trim();
        if (!string.IsNullOrWhiteSpace(rawTopic))
        {
            string resolvedSubjectId = "sub_math10";
            var classroom = assignment.Classroom;
            if (classroom != null)
            {
                var rawGrade = (classroom.Grade ?? string.Empty).Trim();
                var rawSubject = (classroom.Subject ?? string.Empty).Trim().ToLowerInvariant();

                if (rawSubject.StartsWith("sub_"))
                {
                    resolvedSubjectId = rawSubject;
                }
                else
                {
                    string gradeNum = "10";
                    if (rawGrade.Contains("10") || rawSubject.Contains("10") || assignment.Title.Contains("10")) gradeNum = "10";
                    else if (rawGrade.Contains("11") || rawSubject.Contains("11") || assignment.Title.Contains("11")) gradeNum = "11";
                    else if (rawGrade.Contains("12") || rawSubject.Contains("12") || assignment.Title.Contains("12")) gradeNum = "12";
                    else
                    {
                        var student = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == submission.StudentId, cancellationToken);
                        if (student?.Grade?.Contains("11") == true) gradeNum = "11";
                        else if (student?.Grade?.Contains("12") == true) gradeNum = "12";
                        else gradeNum = "10";
                    }

                    if (rawSubject.Contains("toán") || rawSubject.Contains("math") || assignment.Title.ToLowerInvariant().Contains("toán"))
                    {
                        resolvedSubjectId = $"sub_math{gradeNum}";
                    }
                    else if (rawSubject.Contains("vật") || rawSubject.Contains("lí") || rawSubject.Contains("phys"))
                    {
                        resolvedSubjectId = $"sub_phys{gradeNum}";
                    }
                    else if (rawSubject.Contains("hóa") || rawSubject.Contains("chem"))
                    {
                        resolvedSubjectId = $"sub_chem{gradeNum}";
                    }
                    else if (rawSubject.Contains("sinh") || rawSubject.Contains("bio"))
                    {
                        resolvedSubjectId = $"sub_bio{gradeNum}";
                    }
                    else if (rawSubject.Contains("anh") || rawSubject.Contains("eng"))
                    {
                        resolvedSubjectId = $"sub_eng{gradeNum}";
                    }
                    else
                    {
                        resolvedSubjectId = $"sub_math{gradeNum}";
                    }
                }
            }

            var subjectExists = await _db.ContentSubjects.AnyAsync(s => s.Id == resolvedSubjectId, cancellationToken);
            if (!subjectExists && resolvedSubjectId.StartsWith("sub_math"))
            {
                string g = resolvedSubjectId.Replace("sub_math", "");
                _db.ContentSubjects.Add(new ContentSubject
                {
                    Id = resolvedSubjectId,
                    Name = $"Toán {g}",
                    Code = $"MATH{g}",
                    Grade = g,
                    Description = $"Chương trình Toán học Lớp {g} theo chuẩn GDPT 2018",
                    IsActive = true,
                    CreatedAt = now
                });
                await _db.SaveChangesAsync(cancellationToken);
            }

            var mastery = await _db.StudentTopicMasteries
                .FirstOrDefaultAsync(m => m.UserId == submission.StudentId &&
                                          m.SubjectId == resolvedSubjectId &&
                                          (m.TopicName.Contains(rawTopic) || rawTopic.Contains(m.TopicName)), cancellationToken);

            double scorePercentage = assignment.MaxScore > 0 ? (dto.Score / assignment.MaxScore) * 100.0 : 100.0;
            double oldPercentage = (isRegrade && previousScore.HasValue && assignment.MaxScore > 0)
                ? (previousScore.Value / assignment.MaxScore) * 100.0
                : 0.0;

            if (mastery != null)
            {
                if (!isRegrade)
                {
                    mastery.AttemptCount += 1;
                    if (scorePercentage >= 70.0) mastery.CorrectCount += 1;
                    mastery.MasteryScore = Math.Round((mastery.MasteryScore * 0.4) + (scorePercentage * 0.6), 1);
                }
                else
                {
                    if (oldPercentage < 70.0 && scorePercentage >= 70.0)
                    {
                        mastery.CorrectCount += 1;
                    }
                    else if (oldPercentage >= 70.0 && scorePercentage < 70.0)
                    {
                        mastery.CorrectCount = Math.Max(0, mastery.CorrectCount - 1);
                    }
                    mastery.MasteryScore = Math.Round((mastery.MasteryScore * 0.5) + (scorePercentage * 0.5), 1);
                }

                mastery.Status = mastery.MasteryScore >= 85.0 ? "mastered"
                    : mastery.MasteryScore >= 70.0 ? "proficient"
                    : mastery.MasteryScore >= 50.0 ? "progressing" : "needs_reinforcement";
                mastery.LastAttemptAt = now;
                mastery.UpdatedAt = now;
            }
            else
            {
                _db.StudentTopicMasteries.Add(new StudentTopicMastery
                {
                    Id = $"stm_{Guid.NewGuid():N}"[..12],
                    UserId = submission.StudentId,
                    SubjectId = resolvedSubjectId,
                    TopicName = rawTopic,
                    AttemptCount = 1,
                    CorrectCount = scorePercentage >= 70.0 ? 1 : 0,
                    MasteryScore = Math.Round(scorePercentage, 1),
                    Status = scorePercentage >= 70.0 ? "proficient" : "needs_reinforcement",
                    LastAttemptAt = now,
                    UpdatedAt = now
                });
            }
        }

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}"[..12],
            ActorUserId = userId,
            Action = isRegrade ? "regrade_submission" : "grade_submission",
            TargetType = "submission",
            TargetId = submission.Id,
            Payload = JsonSerializer.Serialize(new
            {
                assignmentId,
                studentId = submission.StudentId,
                score = dto.Score,
                previousScore = isRegrade ? previousScore : null,
                isRegrade
            }),
            CreatedAt = now
        });

        await _db.SaveChangesAsync(cancellationToken);

        return new SubmissionDto
        {
            Id = submission.Id,
            AssignmentId = submission.AssignmentId,
            AssignmentTitle = assignment.Title,
            StudentId = submission.StudentId,
            StudentName = submission.Student?.DisplayName ?? submission.Student?.Email ?? "Học sinh",
            StudentEmail = submission.Student?.Email,
            Content = submission.Content,
            SubmittedAt = submission.SubmittedAt,
            Status = submission.Status,
            Score = submission.Score,
            Feedback = submission.Feedback,
            GradedAt = submission.GradedAt,
            GradedByTeacherId = submission.GradedByTeacherId,
        };
    }

    public async Task<List<TeacherSubmissionListItemDto>> GetTeacherSubmissionsAsync(
        string userId,
        string userRole,
        string? classId = null,
        string? assignmentId = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var teacherClassrooms = IsAdminRole(userRole)
            ? await _db.Classrooms.AsNoTracking().ToListAsync(cancellationToken)
            : await _db.Classrooms.AsNoTracking().Where(c => c.TeacherId == userId).ToListAsync(cancellationToken);

        var classroomIds = teacherClassrooms.Select(c => c.Id).ToList();
        if (!string.IsNullOrWhiteSpace(classId) && classId != "all")
        {
            if (!IsAdminRole(userRole) && !classroomIds.Contains(classId))
            {
                throw new ForbiddenException("Bạn không có quyền xem bài nộp của lớp học này.");
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

        return submissions.Select(s => new TeacherSubmissionListItemDto
        {
            Id = s.Id,
            AssignmentId = s.AssignmentId,
            AssignmentTitle = s.Assignment?.Title ?? "",
            StudentId = s.StudentId,
            StudentName = s.Student?.DisplayName ?? "Học sinh",
            StudentEmail = s.Student?.Email ?? "",
            ClassName = s.Assignment?.Classroom?.Name ?? "",
            SubmittedAt = s.SubmittedAt.ToString("o"),
            Status = s.Status,
            Score = s.Score,
            MaxScore = 10.0,
            Feedback = s.Feedback,
            GradedBy = s.GradedByTeacherId,
            Content = s.Content
        }).ToList();
    }

    public async Task<List<TeacherGradeListItemDto>> GetGradesAsync(
        string userId,
        string userRole,
        string? classId = null,
        string? assignmentId = null,
        CancellationToken cancellationToken = default)
    {
        var teacherClassrooms = IsAdminRole(userRole)
            ? await _db.Classrooms.AsNoTracking().ToListAsync(cancellationToken)
            : await _db.Classrooms.AsNoTracking().Where(c => c.TeacherId == userId).ToListAsync(cancellationToken);

        var classroomIds = teacherClassrooms.Select(c => c.Id).ToList();
        if (!string.IsNullOrWhiteSpace(classId) && classId != "all")
        {
            if (!IsAdminRole(userRole) && !classroomIds.Contains(classId))
            {
                throw new ForbiddenException("Bạn không có quyền xem bảng điểm của lớp học này.");
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

        return submissions.Select(sub => new TeacherGradeListItemDto
        {
            Id = $"grd-{sub.Id}",
            SubmissionId = sub.Id,
            StudentId = sub.StudentId,
            StudentName = sub.Student?.DisplayName ?? "Học sinh",
            StudentCode = sub.StudentId,
            ClassId = sub.Assignment?.ClassroomId ?? "",
            ClassName = sub.Assignment?.Classroom?.Name ?? "",
            SubjectName = sub.Assignment?.Classroom?.Subject ?? "Toán học",
            ActivityTitle = sub.Assignment?.Title ?? "Bài tập",
            ActivityType = "assignment",
            Score = sub.Score ?? 0.0,
            MaxScore = 10.0,
            Passed = (sub.Score ?? 0.0) >= 5.0,
            Date = sub.SubmittedAt.ToString("o"),
            Feedback = sub.Feedback
        }).ToList();
    }
}
