using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace StudyAI.Features.Teacher;

public class TeacherClassroomsService : ITeacherClassroomsService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;
    private readonly ILogger<TeacherClassroomsService> _logger;

    public TeacherClassroomsService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator,
        ILogger<TeacherClassroomsService> logger)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
        _logger = logger;
    }

    private static bool IsAdminRole(string userRole) =>
        string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);

    private static bool IsTeacherRole(string userRole) =>
        string.Equals(userRole, "teacher", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(userRole, "admin", StringComparison.OrdinalIgnoreCase);

    public async Task<List<ClassroomDto>> ListClassroomsAsync(
        string userId,
        string userRole,
        string? teacherId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var query = _db.Classrooms
            .Include(c => c.Teacher)
            .Include(c => c.Students)
            .Include(c => c.Assignments)
            .AsNoTracking();

        if (IsAdminRole(userRole))
        {
            if (!string.IsNullOrWhiteSpace(teacherId))
            {
                query = query.Where(c => c.TeacherId == teacherId);
            }
        }
        else if (IsTeacherRole(userRole))
        {
            query = query.Where(c => c.TeacherId == userId);
        }
        else
        {
            var enrolledClassIds = await _db.ClassroomStudents
                .Where(cs => cs.StudentId == userId)
                .Select(cs => cs.ClassroomId)
                .ToListAsync(cancellationToken);

            query = query.Where(c => enrolledClassIds.Contains(c.Id));
        }

        var classrooms = await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        return classrooms.Select(c => new ClassroomDto
        {
            Id = c.Id,
            Name = c.Name,
            Code = c.Code,
            Grade = c.Grade,
            Subject = c.Subject,
            TeacherId = c.TeacherId,
            TeacherName = c.TeacherName ?? c.Teacher?.DisplayName ?? "Giáo viên",
            Description = c.Description,
            Room = c.Room,
            AcademicYear = c.AcademicYear,
            Status = c.Status,
            StudentCount = c.Students.Count,
            AssignmentCount = c.Assignments.Count,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
        }).ToList();
    }

    public async Task<ClassroomDto> CreateClassroomAsync(
        string userId,
        CreateClassroomRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ValidationException("Tên lớp học không được để trống");
        }

        var teacher = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);
        var teacherName = teacher?.DisplayName ?? teacher?.Email ?? "Giáo viên";

        var now = _clock.UtcNow;
        var classroom = new Classroom
        {
            Id = $"cls-{Guid.NewGuid():N}"[..12],
            Name = dto.Name.Trim(),
            Code = string.IsNullOrWhiteSpace(dto.Code) ? $"CLS-{now.ToUnixTimeSeconds() % 100000}" : dto.Code.Trim(),
            Grade = dto.Grade?.Trim(),
            Subject = dto.Subject?.Trim() ?? "Toán học",
            TeacherId = userId,
            TeacherName = teacherName,
            Description = dto.Description?.Trim(),
            Room = dto.Room?.Trim(),
            AcademicYear = dto.AcademicYear?.Trim() ?? "2025 - 2026",
            Status = "active",
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Classrooms.Add(classroom);
        await _db.SaveChangesAsync(cancellationToken);

        return new ClassroomDto
        {
            Id = classroom.Id,
            Name = classroom.Name,
            Code = classroom.Code,
            Grade = classroom.Grade,
            Subject = classroom.Subject,
            TeacherId = classroom.TeacherId,
            TeacherName = classroom.TeacherName,
            Description = classroom.Description,
            Room = classroom.Room,
            AcademicYear = classroom.AcademicYear,
            Status = classroom.Status,
            StudentCount = 0,
            AssignmentCount = 0,
            CreatedAt = classroom.CreatedAt,
            UpdatedAt = classroom.UpdatedAt,
        };
    }

    public async Task<ClassroomDto> GetClassroomAsync(
        string userId,
        string userRole,
        string id,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var classroom = await _db.Classrooms
            .Include(c => c.Teacher)
            .Include(c => c.Students)
            .Include(c => c.Assignments)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (classroom == null)
        {
            throw new NotFoundException("Không tìm thấy lớp học");
        }

        if (!IsAdminRole(userRole))
        {
            if (IsTeacherRole(userRole) && classroom.TeacherId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền truy cập lớp học này.");
            }
            if (!IsTeacherRole(userRole) && !classroom.Students.Any(s => s.StudentId == userId))
            {
                throw new ForbiddenException("Bạn không phải học sinh của lớp học này.");
            }
        }

        return new ClassroomDto
        {
            Id = classroom.Id,
            Name = classroom.Name,
            Code = classroom.Code,
            Grade = classroom.Grade,
            Subject = classroom.Subject,
            TeacherId = classroom.TeacherId,
            TeacherName = classroom.TeacherName ?? classroom.Teacher?.DisplayName ?? "Giáo viên",
            Description = classroom.Description,
            Room = classroom.Room,
            AcademicYear = classroom.AcademicYear,
            Status = classroom.Status,
            StudentCount = classroom.Students.Count,
            AssignmentCount = classroom.Assignments.Count,
            CreatedAt = classroom.CreatedAt,
            UpdatedAt = classroom.UpdatedAt,
        };
    }

    public async Task<ClassroomDto> UpdateClassroomAsync(
        string userId,
        string userRole,
        string id,
        UpdateClassroomRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var classroom = await _db.Classrooms
            .Include(c => c.Students)
            .Include(c => c.Assignments)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (classroom == null)
        {
            throw new NotFoundException("Không tìm thấy lớp học");
        }

        if (!IsAdminRole(userRole) && classroom.TeacherId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền cập nhật lớp học này.");
        }

        if (!string.IsNullOrWhiteSpace(dto.Name)) classroom.Name = dto.Name.Trim();
        if (dto.Code != null) classroom.Code = dto.Code.Trim();
        if (dto.Grade != null) classroom.Grade = dto.Grade.Trim();
        if (dto.Subject != null) classroom.Subject = dto.Subject.Trim();
        if (dto.Description != null) classroom.Description = dto.Description.Trim();
        if (dto.Room != null) classroom.Room = dto.Room.Trim();
        if (dto.AcademicYear != null) classroom.AcademicYear = dto.AcademicYear.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Status)) classroom.Status = dto.Status.Trim();

        classroom.UpdatedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return new ClassroomDto
        {
            Id = classroom.Id,
            Name = classroom.Name,
            Code = classroom.Code,
            Grade = classroom.Grade,
            Subject = classroom.Subject,
            TeacherId = classroom.TeacherId,
            TeacherName = classroom.TeacherName,
            Description = classroom.Description,
            Room = classroom.Room,
            AcademicYear = classroom.AcademicYear,
            Status = classroom.Status,
            StudentCount = classroom.Students.Count,
            AssignmentCount = classroom.Assignments.Count,
            CreatedAt = classroom.CreatedAt,
            UpdatedAt = classroom.UpdatedAt,
        };
    }

    public async Task<DeleteClassroomResultDto> DeleteClassroomAsync(
        string userId,
        string userRole,
        string id,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(userId)) throw new UnauthorizedException();

        var classroom = await _db.Classrooms
            .Include(c => c.Students)
            .Include(c => c.Assignments)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (classroom == null)
        {
            throw new NotFoundException("Không tìm thấy lớp học");
        }

        if (!IsAdminRole(userRole) && classroom.TeacherId != userId)
        {
            throw new ForbiddenException("Bạn không có quyền xóa lớp học này.");
        }

        var studentCount = await _db.ClassroomStudents.CountAsync(cs => cs.ClassroomId == id, cancellationToken);
        if (studentCount > 0)
        {
            throw new ValidationException($"Không thể xóa lớp đang có {studentCount} học viên. Vui lòng chuyển hoặc xóa học viên trước.");
        }

        var assignmentCount = await _db.Assignments.CountAsync(a => a.ClassroomId == id, cancellationToken);
        if (assignmentCount > 0)
        {
            classroom.Status = "archived";
            classroom.UpdatedAt = _clock.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            return new DeleteClassroomResultDto(true, "Lớp học đã có bài tập nên được chuyển sang trạng thái lưu trữ");
        }

        _db.Classrooms.Remove(classroom);
        await _db.SaveChangesAsync(cancellationToken);
        return new DeleteClassroomResultDto(false, null);
    }

    public async Task<List<ClassActivityDto>> GetClassActivitiesAsync(
        string userId,
        string userRole,
        string id,
        CancellationToken cancellationToken = default)
    {
        var classroom = await _db.Classrooms.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (classroom == null)
            throw new NotFoundException("Không tìm thấy lớp học.");

        if (!IsAdminRole(userRole) && classroom.TeacherId != userId)
        {
            var isStudent = await _db.ClassroomStudents.AnyAsync(cs => cs.ClassroomId == id && cs.StudentId == userId, cancellationToken);
            if (!isStudent) throw new ForbiddenException("Bạn không có quyền xem hoạt động của lớp học này.");
        }

        var logs = await _db.StaffAuditLogs
            .AsNoTracking()
            .Where(a => a.TargetId == id || (a.TargetType == "classroom" && a.TargetId == id))
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        var userIds = logs.Select(l => l.ActorUserId).Distinct().ToList();
        var actors = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.DisplayName, cancellationToken);

        return logs.Select(l => new ClassActivityDto
        {
            Id = l.Id,
            ClassId = id,
            Action = l.Action,
            Detail = l.Payload ?? "",
            Timestamp = l.CreatedAt.ToString("o"),
            Actor = (actors.TryGetValue(l.ActorUserId, out var name) && name != null) ? name : "Giáo viên"
        }).ToList();
    }

    public async Task<ClassActivityDto> AddClassActivityAsync(
        string userId,
        string userRole,
        string id,
        JsonObject payload,
        CancellationToken cancellationToken = default)
    {
        var classroom = await _db.Classrooms.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (classroom == null)
            throw new NotFoundException("Không tìm thấy lớp học.");

        if (!IsAdminRole(userRole) && classroom.TeacherId != userId)
            throw new ForbiddenException("Bạn không có quyền thêm hoạt động cho lớp học này.");

        var action = payload["action"]?.ToString() ?? "class_activity";
        var detail = payload["detail"]?.ToString() ?? "";
        var now = _clock.UtcNow;

        var log = new StaffAuditLog
        {
            Id = $"log_act_{Guid.NewGuid():N}",
            ActorUserId = userId,
            Action = action,
            TargetType = "classroom",
            TargetId = id,
            Payload = detail,
            CreatedAt = now
        };

        _db.StaffAuditLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);

        var actor = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);

        return new ClassActivityDto
        {
            Id = log.Id,
            ClassId = id,
            Action = log.Action,
            Detail = log.Payload,
            Timestamp = log.CreatedAt.ToString("o"),
            Actor = actor?.DisplayName ?? "Giáo viên"
        };
    }
}