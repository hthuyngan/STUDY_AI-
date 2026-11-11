using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/classrooms")]
public class ClassroomsController : ControllerBase
{
    private readonly StudyAIDbContext _db;
    private readonly ILogger<ClassroomsController> _logger;

    public ClassroomsController(StudyAIDbContext db, ILogger<ClassroomsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "learner";
    private bool IsAdmin => User.IsInRole("admin");
    private bool IsTeacher => User.IsInRole("teacher") || User.IsInRole("admin");

    /// <summary>
    /// Danh sách lớp học:
    /// - Admin: Xem tất cả hoặc lọc theo teacherId
    /// - Teacher: Xem các lớp do mình phụ trách
    /// - Learner: Xem các lớp mình đã tham gia
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListClassrooms([FromQuery] string? teacherId = null, CancellationToken cancellationToken = default)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var query = _db.Classrooms
            .Include(c => c.Teacher)
            .Include(c => c.Students)
            .Include(c => c.Assignments)
            .AsNoTracking();

        if (IsAdmin)
        {
            if (!string.IsNullOrWhiteSpace(teacherId))
            {
                query = query.Where(c => c.TeacherId == teacherId);
            }
        }
        else if (IsTeacher)
        {
            query = query.Where(c => c.TeacherId == userId);
        }
        else
        {
            // Learner: Only enrolled classes
            var enrolledClassIds = await _db.ClassroomStudents
                .Where(cs => cs.StudentId == userId)
                .Select(cs => cs.ClassroomId)
                .ToListAsync(cancellationToken);

            query = query.Where(c => enrolledClassIds.Contains(c.Id));
        }

        var classrooms = await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        var result = classrooms.Select(c => new ClassroomDto
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

        return Ok(result);
    }

    /// <summary>
    /// Tạo mới một lớp học (Chỉ Teacher và Admin)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> CreateClassroom([FromBody] CreateClassroomRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Tên lớp học không được để trống" });
        }

        var teacher = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);
        var teacherName = teacher?.DisplayName ?? teacher?.Email ?? "Giáo viên";

        var classroom = new Classroom
        {
            Id = $"cls-{Guid.NewGuid():N}"[..12],
            Name = dto.Name.Trim(),
            Code = string.IsNullOrWhiteSpace(dto.Code) ? $"CLS-{DateTimeOffset.UtcNow.ToUnixTimeSeconds() % 100000}" : dto.Code.Trim(),
            Grade = dto.Grade?.Trim(),
            Subject = dto.Subject?.Trim() ?? "Toán học",
            TeacherId = userId,
            TeacherName = teacherName,
            Description = dto.Description?.Trim(),
            Room = dto.Room?.Trim(),
            AcademicYear = dto.AcademicYear?.Trim() ?? "2025 - 2026",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        _db.Classrooms.Add(classroom);
        await _db.SaveChangesAsync(cancellationToken);

        var result = new ClassroomDto
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

        return CreatedAtAction(nameof(GetClassroom), new { id = classroom.Id }, result);
    }

    /// <summary>
    /// Lấy chi tiết lớp học theo ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetClassroom(string id, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var classroom = await _db.Classrooms
            .Include(c => c.Teacher)
            .Include(c => c.Students)
            .Include(c => c.Assignments)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (classroom == null)
        {
            return NotFound(new { message = "Không tìm thấy lớp học" });
        }

        // RBAC check
        if (!IsAdmin)
        {
            if (IsTeacher && classroom.TeacherId != userId)
            {
                return Forbid();
            }
            if (!IsTeacher && !classroom.Students.Any(s => s.StudentId == userId))
            {
                return Forbid();
            }
        }

        var result = new ClassroomDto
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

        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin lớp học (Chỉ giáo viên phụ trách hoặc Admin)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> UpdateClassroom(string id, [FromBody] UpdateClassroomRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var classroom = await _db.Classrooms
            .Include(c => c.Students)
            .Include(c => c.Assignments)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (classroom == null)
        {
            return NotFound(new { message = "Không tìm thấy lớp học" });
        }

        if (!IsAdmin && classroom.TeacherId != userId)
        {
            return Forbid();
        }

        if (!string.IsNullOrWhiteSpace(dto.Name)) classroom.Name = dto.Name.Trim();
        if (dto.Code != null) classroom.Code = dto.Code.Trim();
        if (dto.Grade != null) classroom.Grade = dto.Grade.Trim();
        if (dto.Subject != null) classroom.Subject = dto.Subject.Trim();
        if (dto.Description != null) classroom.Description = dto.Description.Trim();
        if (dto.Room != null) classroom.Room = dto.Room.Trim();
        if (dto.AcademicYear != null) classroom.AcademicYear = dto.AcademicYear.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Status)) classroom.Status = dto.Status.Trim();

        classroom.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var result = new ClassroomDto
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

        return Ok(result);
    }

    /// <summary>
    /// Danh sách học sinh trong lớp
    /// </summary>
    [HttpGet("{id}/students")]
    public async Task<IActionResult> GetClassroomStudents(string id, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var classroom = await _db.Classrooms
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (classroom == null) return NotFound(new { message = "Không tìm thấy lớp học" });

        if (!IsAdmin)
        {
            if (IsTeacher && classroom.TeacherId != userId) return Forbid();
            if (!IsTeacher && !classroom.Students.Any(s => s.StudentId == userId)) return Forbid();
        }

        var students = await _db.ClassroomStudents
            .Where(cs => cs.ClassroomId == id)
            .Include(cs => cs.Student)
            .OrderBy(cs => cs.EnrolledAt)
            .ToListAsync(cancellationToken);

        var result = students.Select(cs => new ClassroomStudentDto
        {
            Id = cs.Id,
            ClassroomId = cs.ClassroomId,
            StudentId = cs.StudentId,
            StudentName = cs.Student?.DisplayName ?? cs.Student?.Email ?? "Học sinh",
            StudentEmail = cs.Student?.Email,
            StudentGrade = cs.Student?.Grade,
            EnrolledAt = cs.EnrolledAt,
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Thêm học sinh vào lớp học
    /// </summary>
    [HttpPost("{id}/students")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> EnrollStudent(string id, [FromBody] EnrollStudentRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var classroom = await _db.Classrooms.FindAsync(new object[] { id }, cancellationToken);
        if (classroom == null) return NotFound(new { message = "Không tìm thấy lớp học" });

        if (!IsAdmin && classroom.TeacherId != userId) return Forbid();

        // Tìm học sinh theo StudentId hoặc Email
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
            return NotFound(new { message = "Không tìm thấy học sinh với thông tin cung cấp" });
        }

        // Đảm bảo đối tượng được ghi danh là học sinh (learner)
        if (student.Role != "learner" && student.Role != "student")
        {
            return BadRequest(new { message = "Chỉ có thể ghi danh người dùng có vai trò học sinh (learner) vào lớp học" });
        }

        // Kiểm tra xem đã tham gia lớp chưa
        var alreadyEnrolled = await _db.ClassroomStudents.AnyAsync(
            cs => cs.ClassroomId == id && cs.StudentId == student.Id,
            cancellationToken);

        if (alreadyEnrolled)
        {
            return Conflict(new { message = "Học sinh này đã tham gia lớp học từ trước" });
        }

        var enrollment = new ClassroomStudent
        {
            Id = $"cs-{Guid.NewGuid():N}"[..12],
            ClassroomId = id,
            StudentId = student.Id,
            EnrolledAt = DateTimeOffset.UtcNow,
        };

        _db.ClassroomStudents.Add(enrollment);
        classroom.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var result = new ClassroomStudentDto
        {
            Id = enrollment.Id,
            ClassroomId = enrollment.ClassroomId,
            StudentId = enrollment.StudentId,
            StudentName = student.DisplayName ?? student.Email ?? "Học sinh",
            StudentEmail = student.Email,
            StudentGrade = student.Grade,
            EnrolledAt = enrollment.EnrolledAt,
        };

        return CreatedAtAction(nameof(GetClassroomStudents), new { id }, result);
    }

    /// <summary>
    /// Xóa học sinh khỏi lớp
    /// </summary>
    [HttpDelete("{id}/students/{studentId}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> RemoveStudent(string id, string studentId, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var classroom = await _db.Classrooms.FindAsync(new object[] { id }, cancellationToken);
        if (classroom == null) return NotFound(new { message = "Không tìm thấy lớp học" });

        if (!IsAdmin && classroom.TeacherId != userId) return Forbid();

        var enrollment = await _db.ClassroomStudents.FirstOrDefaultAsync(
            cs => cs.ClassroomId == id && cs.StudentId == studentId,
            cancellationToken);

        if (enrollment == null)
        {
            return NotFound(new { message = "Học sinh không có trong lớp học này" });
        }

        _db.ClassroomStudents.Remove(enrollment);
        classroom.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    /// <summary>
    /// Danh sách bài tập trong lớp
    /// </summary>
    [HttpGet("{id}/assignments")]
    public async Task<IActionResult> GetClassroomAssignments(string id, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var classroom = await _db.Classrooms
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (classroom == null) return NotFound(new { message = "Không tìm thấy lớp học" });

        if (!IsAdmin)
        {
            if (IsTeacher && classroom.TeacherId != userId) return Forbid();
            if (!IsTeacher && !classroom.Students.Any(s => s.StudentId == userId)) return Forbid();
        }

        var assignments = await _db.Assignments
            .Where(a => a.ClassroomId == id)
            .Include(a => a.CreatedByTeacher)
            .Include(a => a.Submissions)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        var totalStudents = classroom.Students.Count;

        var result = assignments.Select(a =>
        {
            SubmissionDto? mySubmissionDto = null;
            if (!IsTeacher)
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

        return Ok(result);
    }

    /// <summary>
    /// Tạo bài tập mới trong lớp
    /// </summary>
    [HttpPost("{id}/assignments")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> CreateClassroomAssignment(string id, [FromBody] CreateAssignmentRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var classroom = await _db.Classrooms
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (classroom == null) return NotFound(new { message = "Không tìm thấy lớp học" });

        if (!IsAdmin && classroom.TeacherId != userId) return Forbid();

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { message = "Tiêu đề bài tập không được để trống" });
        }

        var teacher = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);

        var assignment = new Assignment
        {
            Id = $"asg-{Guid.NewGuid():N}"[..12],
            ClassroomId = id,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            Instructions = dto.Instructions?.Trim(),
            DueDate = dto.DueDate == default ? DateTimeOffset.UtcNow.AddDays(7) : dto.DueDate,
            MaxScore = dto.MaxScore <= 0 ? 10.0 : dto.MaxScore,
            Status = "active",
            CreatedByTeacherId = userId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        _db.Assignments.Add(assignment);
        classroom.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var result = new AssignmentDto
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

        return CreatedAtAction("GetAssignment", "Assignments", new { id = assignment.Id }, result);
    }
}

