using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Teacher;

public class TeacherStudentsService : ITeacherStudentsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public TeacherStudentsService(
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

    public async Task<List<ClassroomStudentDto>> GetClassroomStudentsAsync(
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
                throw new ForbiddenException("Bạn không có quyền xem danh sách học sinh của lớp học này.");
            if (!IsTeacherRole(userRole) && !classroom.Students.Any(s => s.StudentId == userId))
                throw new ForbiddenException("Bạn không phải học sinh của lớp học này.");
        }

        var students = await _db.ClassroomStudents
            .Where(cs => cs.ClassroomId == classroomId)
            .Include(cs => cs.Student)
            .OrderBy(cs => cs.EnrolledAt)
            .ToListAsync(cancellationToken);

        return students.Select(cs => new ClassroomStudentDto
        {
            Id = cs.Id,
            ClassroomId = cs.ClassroomId,
            StudentId = cs.StudentId,
            StudentName = cs.Student?.DisplayName ?? cs.Student?.Email ?? "Học sinh",
            StudentEmail = cs.Student?.Email,
            StudentGrade = cs.Student?.Grade,
            EnrolledAt = cs.EnrolledAt,
        }).ToList();
    }

    public async Task<ClassroomStudentDto> EnrollStudentAsync(
        string userId,
        string userRole,
        string classroomId,
        EnrollStudentRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var classroom = await _db.Classrooms.FindAsync(new object[] { classroomId }, cancellationToken);
        if (classroom == null) throw new NotFoundException("Không tìm thấy lớp học");

        if (!IsAdminRole(userRole) && classroom.TeacherId != userId)
            throw new ForbiddenException("Bạn không có quyền ghi danh học sinh vào lớp học này.");

        User? student = null;
        if (!string.IsNullOrWhiteSpace(dto.StudentId))
        {
            student = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.StudentId, cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(dto.StudentEmail))
        {
            var emailNorm = dto.StudentEmail.Trim().ToUpperInvariant();
            student = await _db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == emailNorm || u.Email == dto.StudentEmail.Trim(), cancellationToken);
        }

        if (student == null)
        {
            throw new NotFoundException("Không tìm thấy học sinh với thông tin cung cấp");
        }

        if (student.Role != "learner" && student.Role != "student")
        {
            throw new ValidationException("Chỉ có thể ghi danh người dùng có vai trò học sinh (learner) vào lớp học");
        }

        var alreadyEnrolled = await _db.ClassroomStudents.AnyAsync(
            cs => cs.ClassroomId == classroomId && cs.StudentId == student.Id,
            cancellationToken);

        if (alreadyEnrolled)
        {
            throw new ConflictException("Học sinh này đã tham gia lớp học từ trước");
        }

        var enrollment = new ClassroomStudent
        {
            Id = $"cs-{Guid.NewGuid():N}"[..12],
            ClassroomId = classroomId,
            StudentId = student.Id,
            EnrolledAt = _clock.UtcNow,
        };

        _db.ClassroomStudents.Add(enrollment);
        classroom.UpdatedAt = _clock.UtcNow;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException("Học sinh này đã tham gia lớp học từ trước");
        }

        return new ClassroomStudentDto
        {
            Id = enrollment.Id,
            ClassroomId = enrollment.ClassroomId,
            StudentId = enrollment.StudentId,
            StudentName = student.DisplayName ?? student.Email ?? "Học sinh",
            StudentEmail = student.Email,
            StudentGrade = student.Grade,
            EnrolledAt = enrollment.EnrolledAt,
        };
    }

    public async Task RemoveStudentAsync(
        string userId,
        string userRole,
        string classroomId,
        string studentId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var classroom = await _db.Classrooms.FindAsync(new object[] { classroomId }, cancellationToken);
        if (classroom == null) throw new NotFoundException("Không tìm thấy lớp học");

        if (!IsAdminRole(userRole) && classroom.TeacherId != userId)
            throw new ForbiddenException("Bạn không có quyền xóa học sinh khỏi lớp học này.");

        var enrollment = await _db.ClassroomStudents.FirstOrDefaultAsync(
            cs => cs.ClassroomId == classroomId && cs.StudentId == studentId,
            cancellationToken);

        if (enrollment == null)
        {
            throw new NotFoundException("Học sinh không có trong lớp học này");
        }

        _db.ClassroomStudents.Remove(enrollment);
        classroom.UpdatedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<ClassroomStudentDto> TransferStudentAsync(
        string userId,
        string userRole,
        string targetClassroomId,
        TransferStudentRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var targetClassroom = await _db.Classrooms.FindAsync(new object[] { targetClassroomId }, cancellationToken);
        if (targetClassroom == null) throw new NotFoundException("Không tìm thấy lớp học đích");

        if (!IsAdminRole(userRole) && targetClassroom.TeacherId != userId)
            throw new ForbiddenException("Bạn không có quyền thao tác trên lớp học đích.");

        if (string.IsNullOrWhiteSpace(dto.StudentId))
        {
            throw new ValidationException("Mã học sinh không được để trống");
        }

        if (string.IsNullOrWhiteSpace(dto.SourceClassroomId))
        {
            throw new ValidationException("Mã lớp học nguồn (sourceClassroomId) là bắt buộc để chuyển lớp.");
        }

        if (string.Equals(dto.SourceClassroomId.Trim(), targetClassroomId.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Lớp học nguồn và lớp học đích không thể trùng nhau.");
        }

        var sourceClassroom = await _db.Classrooms.FindAsync(new object[] { dto.SourceClassroomId }, cancellationToken);
        if (sourceClassroom == null)
        {
            throw new NotFoundException("Không tìm thấy lớp học nguồn.");
        }

        if (!IsAdminRole(userRole))
        {
            if (targetClassroom.TeacherId != userId || sourceClassroom.TeacherId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền quản lý cả lớp học nguồn và lớp học đích.");
            }
        }

        var student = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.StudentId, cancellationToken);
        if (student == null)
        {
            throw new NotFoundException("Không tìm thấy học sinh với mã cung cấp");
        }

        if (student.Role != "learner" && student.Role != "student")
        {
            throw new ValidationException("Chỉ có thể chuyển người dùng có vai trò học sinh (learner)");
        }

        var oldEnrollment = await _db.ClassroomStudents.FirstOrDefaultAsync(
            cs => cs.ClassroomId == sourceClassroom.Id && cs.StudentId == student.Id, cancellationToken);

        if (oldEnrollment == null)
        {
            throw new NotFoundException("Học sinh không có trong danh sách ghi danh của lớp học nguồn.");
        }

        var now = _clock.UtcNow;
        _db.ClassroomStudents.Remove(oldEnrollment);
        sourceClassroom.UpdatedAt = now;

        var targetEnrollment = await _db.ClassroomStudents.FirstOrDefaultAsync(
            cs => cs.ClassroomId == targetClassroomId && cs.StudentId == student.Id, cancellationToken);

        if (targetEnrollment == null)
        {
            targetEnrollment = new ClassroomStudent
            {
                Id = $"cs-{Guid.NewGuid():N}"[..12],
                ClassroomId = targetClassroomId,
                StudentId = student.Id,
                EnrolledAt = now,
            };
            _db.ClassroomStudents.Add(targetEnrollment);
        }

        targetClassroom.UpdatedAt = now;

        _db.StaffAuditLogs.Add(new StaffAuditLog
        {
            Id = $"log_{Guid.NewGuid():N}",
            ActorUserId = userId,
            Action = "student_class_transferred",
            TargetType = "classroom",
            TargetId = targetClassroomId,
            Payload = JsonSerializer.Serialize(new
            {
                studentId = student.Id,
                sourceClassroomId = sourceClassroom.Id,
                targetClassroomId = targetClassroom.Id
            }),
            CreatedAt = now
        });

        await _db.SaveChangesAsync(cancellationToken);

        return new ClassroomStudentDto
        {
            Id = targetEnrollment.Id,
            ClassroomId = targetEnrollment.ClassroomId,
            StudentId = targetEnrollment.StudentId,
            StudentName = student.DisplayName ?? student.Email ?? "Học sinh",
            StudentEmail = student.Email,
            StudentGrade = student.Grade,
            EnrolledAt = targetEnrollment.EnrolledAt,
        };
    }
}