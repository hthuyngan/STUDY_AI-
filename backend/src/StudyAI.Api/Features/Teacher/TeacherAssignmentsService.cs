using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Teacher;

public class TeacherAssignmentsService : ITeacherAssignmentsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public TeacherAssignmentsService(
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

    public async Task<List<AssignmentDto>> ListAssignmentsAsync(
        string userId,
        string userRole,
        string? classroomId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var query = _db.Assignments
            .Include(a => a.Classroom)
                .ThenInclude(c => c!.Students)
            .Include(a => a.CreatedByTeacher)
            .Include(a => a.Submissions)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(classroomId))
        {
            query = query.Where(a => a.ClassroomId == classroomId);
        }

        if (IsAdminRole(userRole))
        {
            // Admin sees all
        }
        else if (IsTeacherRole(userRole))
        {
            query = query.Where(a => a.CreatedByTeacherId == userId || (a.Classroom != null && a.Classroom.TeacherId == userId));
        }
        else
        {
            var enrolledClassIds = await _db.ClassroomStudents
                .Where(cs => cs.StudentId == userId)
                .Select(cs => cs.ClassroomId)
                .ToListAsync(cancellationToken);

            query = query.Where(a => enrolledClassIds.Contains(a.ClassroomId));
        }

        var assignments = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return assignments.Select(a =>
        {
            SubmissionDto? mySubmissionDto = null;
            if (!IsTeacherRole(userRole))
            {
                var mySub = a.Submissions.FirstOrDefault(s => s.StudentId == userId);
                if (mySub != null)
                {
                    mySubmissionDto = new SubmissionDto
                    {
                        Id = mySub.Id,
                        AssignmentId = mySub.AssignmentId,
                        AssignmentTitle = a.Title,
                        StudentId = mySub.StudentId,
                        Content = mySub.Content,
                        SubmittedAt = mySub.SubmittedAt,
                        Status = mySub.Status,
                        Score = mySub.Score,
                        Feedback = mySub.Feedback,
                        GradedAt = mySub.GradedAt,
                        GradedByTeacherId = mySub.GradedByTeacherId,
                    };
                }
            }

            return new AssignmentDto
            {
                Id = a.Id,
                ClassroomId = a.ClassroomId,
                ClassroomName = a.Classroom?.Name,
                Subject = a.Classroom?.Subject,
                Grade = a.Classroom?.Grade,
                Title = a.Title,
                Description = a.Description,
                Instructions = a.Instructions,
                DueDate = a.DueDate,
                MaxScore = a.MaxScore,
                Status = a.Status,
                CreatedByTeacherId = a.CreatedByTeacherId,
                CreatedByTeacherName = a.CreatedByTeacher?.DisplayName ?? "Giáo viên",
                SubmissionsCount = a.Submissions.Count,
                TotalStudents = a.Classroom?.Students.Count ?? 0,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                MySubmission = mySubmissionDto,
            };
        }).ToList();
    }

    public async Task<AssignmentDto> GetAssignmentAsync(
        string userId,
        string userRole,
        string id,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
                .ThenInclude(c => c!.Students)
            .Include(a => a.CreatedByTeacher)
            .Include(a => a.Submissions)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null)
        {
            throw new NotFoundException("Không tìm thấy bài tập");
        }

        if (!IsAdminRole(userRole))
        {
            if (IsTeacherRole(userRole) && assignment.CreatedByTeacherId != userId && assignment.Classroom?.TeacherId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền truy cập bài tập này.");
            }
            if (!IsTeacherRole(userRole) && !(assignment.Classroom?.Students.Any(s => s.StudentId == userId) ?? false))
            {
                throw new ForbiddenException("Bạn không thuộc lớp học có bài tập này.");
            }
        }

        SubmissionDto? mySubmissionDto = null;
        if (!IsTeacherRole(userRole))
        {
            var mySub = assignment.Submissions.FirstOrDefault(s => s.StudentId == userId);
            if (mySub != null)
            {
                mySubmissionDto = new SubmissionDto
                {
                    Id = mySub.Id,
                    AssignmentId = mySub.AssignmentId,
                    AssignmentTitle = assignment.Title,
                    StudentId = mySub.StudentId,
                    Content = mySub.Content,
                    SubmittedAt = mySub.SubmittedAt,
                    Status = mySub.Status,
                    Score = mySub.Score,
                    Feedback = mySub.Feedback,
                    GradedAt = mySub.GradedAt,
                    GradedByTeacherId = mySub.GradedByTeacherId,
                };
            }
        }

        return new AssignmentDto
        {
            Id = assignment.Id,
            ClassroomId = assignment.ClassroomId,
            ClassroomName = assignment.Classroom?.Name,
            Subject = assignment.Classroom?.Subject,
            Grade = assignment.Classroom?.Grade,
            Title = assignment.Title,
            Description = assignment.Description,
            Instructions = assignment.Instructions,
            DueDate = assignment.DueDate,
            MaxScore = assignment.MaxScore,
            Status = assignment.Status,
            CreatedByTeacherId = assignment.CreatedByTeacherId,
            CreatedByTeacherName = assignment.CreatedByTeacher?.DisplayName ?? "Giáo viên",
            SubmissionsCount = assignment.Submissions.Count,
            TotalStudents = assignment.Classroom?.Students.Count ?? 0,
            CreatedAt = assignment.CreatedAt,
            UpdatedAt = assignment.UpdatedAt,
            MySubmission = mySubmissionDto,
        };
    }

    public async Task<AssignmentDto> CreateClassroomAssignmentAsync(
        string userId,
        string userRole,
        string classroomId,
        CreateAssignmentRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var classroom = await _db.Classrooms
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == classroomId, cancellationToken);

        if (classroom == null) throw new NotFoundException("Không tìm thấy lớp học");

        if (!IsAdminRole(userRole) && classroom.TeacherId != userId)
            throw new ForbiddenException("Bạn không có quyền tạo bài tập trong lớp học này.");

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            throw new ValidationException("Tiêu đề bài tập không được để trống");
        }

        var teacher = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);
        var now = _clock.UtcNow;

        var assignment = new Assignment
        {
            Id = $"asg-{Guid.NewGuid():N}"[..12],
            ClassroomId = classroomId,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            Instructions = dto.Instructions?.Trim(),
            DueDate = dto.DueDate == default ? now.AddDays(7) : dto.DueDate,
            MaxScore = dto.MaxScore <= 0 ? 10.0 : dto.MaxScore,
            Status = "active",
            CreatedByTeacherId = userId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Assignments.Add(assignment);
        classroom.UpdatedAt = now;
        await _db.SaveChangesAsync(cancellationToken);

        return new AssignmentDto
        {
            Id = assignment.Id,
            ClassroomId = assignment.ClassroomId,
            ClassroomName = classroom.Name,
            Title = assignment.Title,
            Description = assignment.Description,
            Instructions = assignment.Instructions,
            DueDate = assignment.DueDate,
            MaxScore = assignment.MaxScore,
            Status = assignment.Status,
            CreatedByTeacherId = assignment.CreatedByTeacherId,
            CreatedByTeacherName = teacher?.DisplayName ?? "Giáo viên",
            SubmissionsCount = 0,
            TotalStudents = classroom.Students.Count,
            CreatedAt = assignment.CreatedAt,
            UpdatedAt = assignment.UpdatedAt,
        };
    }

    public async Task<AssignmentDto> UpdateAssignmentAsync(
        string userId,
        string userRole,
        string id,
        UpdateAssignmentRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
                .ThenInclude(c => c!.Students)
            .Include(a => a.Submissions)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null)
        {
            throw new NotFoundException("Không tìm thấy bài tập");
        }

        if (!IsAdminRole(userRole) && assignment.CreatedByTeacherId != userId && assignment.Classroom?.TeacherId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền cập nhật bài tập này.");
        }

        if (!string.IsNullOrWhiteSpace(dto.Title)) assignment.Title = dto.Title.Trim();
        if (dto.Description != null) assignment.Description = dto.Description.Trim();
        if (dto.Instructions != null) assignment.Instructions = dto.Instructions.Trim();
        if (dto.DueDate.HasValue) assignment.DueDate = dto.DueDate.Value;
        if (dto.MaxScore.HasValue && dto.MaxScore.Value > 0) assignment.MaxScore = dto.MaxScore.Value;
        if (!string.IsNullOrWhiteSpace(dto.Status)) assignment.Status = dto.Status.Trim();

        assignment.UpdatedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return new AssignmentDto
        {
            Id = assignment.Id,
            ClassroomId = assignment.ClassroomId,
            ClassroomName = assignment.Classroom?.Name,
            Subject = assignment.Classroom?.Subject,
            Grade = assignment.Classroom?.Grade,
            Title = assignment.Title,
            Description = assignment.Description,
            Instructions = assignment.Instructions,
            DueDate = assignment.DueDate,
            MaxScore = assignment.MaxScore,
            Status = assignment.Status,
            CreatedByTeacherId = assignment.CreatedByTeacherId,
            SubmissionsCount = assignment.Submissions.Count,
            TotalStudents = assignment.Classroom?.Students.Count ?? 0,
            CreatedAt = assignment.CreatedAt,
            UpdatedAt = assignment.UpdatedAt,
        };
    }

    public async Task<DeleteAssignmentResultDto> DeleteAssignmentAsync(
        string userId,
        string userRole,
        string id,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
            .Include(a => a.Submissions)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null)
        {
            throw new NotFoundException("Không tìm thấy bài tập");
        }

        if (!IsAdminRole(userRole) && assignment.CreatedByTeacherId != userId && assignment.Classroom?.TeacherId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền xóa bài tập này.");
        }

        var hasSubmissions = await _db.AssignmentSubmissions.AnyAsync(s => s.AssignmentId == id, cancellationToken);
        if (hasSubmissions)
        {
            assignment.Status = "archived";
            assignment.UpdatedAt = _clock.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            return new DeleteAssignmentResultDto(true, "Bài tập đã có bài làm của học sinh nên được chuyển sang trạng thái lưu trữ");
        }

        _db.Assignments.Remove(assignment);
        await _db.SaveChangesAsync(cancellationToken);
        return new DeleteAssignmentResultDto(false, null);
    }

    public async Task<List<AssignmentDto>> GetClassroomAssignmentsAsync(
        string userId,
        string userRole,
        string classroomId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var classroom = await _db.Classrooms
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == classroomId, cancellationToken);

        if (classroom == null) throw new NotFoundException("Không tìm thấy lớp học");

        if (!IsAdminRole(userRole))
        {
            if (IsTeacherRole(userRole) && classroom.TeacherId != userId)
                throw new ForbiddenException("Bạn không có quyền xem bài tập của lớp học này.");
            if (!IsTeacherRole(userRole) && !classroom.Students.Any(s => s.StudentId == userId))
                throw new ForbiddenException("Bạn không phải học sinh của lớp học này.");
        }

        var assignments = await _db.Assignments
            .Where(a => a.ClassroomId == classroomId)
            .Include(a => a.CreatedByTeacher)
            .Include(a => a.Submissions)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        var totalStudents = classroom.Students.Count;

        return assignments.Select(a =>
        {
            SubmissionDto? mySubmissionDto = null;
            if (!IsTeacherRole(userRole))
            {
                var mySub = a.Submissions.FirstOrDefault(s => s.StudentId == userId);
                if (mySub != null)
                {
                    mySubmissionDto = new SubmissionDto
                    {
                        Id = mySub.Id,
                        AssignmentId = mySub.AssignmentId,
                        AssignmentTitle = a.Title,
                        StudentId = mySub.StudentId,
                        Content = mySub.Content,
                        SubmittedAt = mySub.SubmittedAt,
                        Status = mySub.Status,
                        Score = mySub.Score,
                        Feedback = mySub.Feedback,
                        GradedAt = mySub.GradedAt,
                        GradedByTeacherId = mySub.GradedByTeacherId,
                    };
                }
            }

            return new AssignmentDto
            {
                Id = a.Id,
                ClassroomId = a.ClassroomId,
                ClassroomName = classroom.Name,
                Title = a.Title,
                Description = a.Description,
                Instructions = a.Instructions,
                DueDate = a.DueDate,
                MaxScore = a.MaxScore,
                Status = a.Status,
                CreatedByTeacherId = a.CreatedByTeacherId,
                CreatedByTeacherName = a.CreatedByTeacher?.DisplayName ?? "Giáo viên",
                SubmissionsCount = a.Submissions.Count,
                TotalStudents = totalStudents,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                MySubmission = mySubmissionDto,
            };
        }).ToList();
    }
}