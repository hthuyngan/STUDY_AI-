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
[Route("api/v1/assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly StudyAIDbContext _db;
    private readonly ILogger<AssignmentsController> _logger;

    public AssignmentsController(StudyAIDbContext db, ILogger<AssignmentsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role) ?? "learner";
    private bool IsAdmin => User.IsInRole("admin");
    private bool IsTeacher => User.IsInRole("teacher") || User.IsInRole("admin");

    /// <summary>
    /// Danh sách bài tập:
    /// - Admin: Xem tất cả hoặc theo classroomId
    /// - Teacher: Xem bài tập do mình tạo hoặc thuộc các lớp mình quản lý
    /// - Learner: Xem bài tập thuộc các lớp mình đang tham gia (kèm trạng thái nộp bài cá nhân)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListAssignments([FromQuery] string? classroomId = null, CancellationToken cancellationToken = default)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

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

        if (IsAdmin)
        {
            // Admin sees all
        }
        else if (IsTeacher)
        {
            query = query.Where(a => a.CreatedByTeacherId == userId || (a.Classroom != null && a.Classroom.TeacherId == userId));
        }
        else
        {
            // Learner
            var enrolledClassIds = await _db.ClassroomStudents
                .Where(cs => cs.StudentId == userId)
                .Select(cs => cs.ClassroomId)
                .ToListAsync(cancellationToken);

            query = query.Where(a => enrolledClassIds.Contains(a.ClassroomId));
        }

        var assignments = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

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
                ClassroomName = a.Classroom?.Name,
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

        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết bài tập theo ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetAssignment(string id, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
                .ThenInclude(c => c!.Students)
            .Include(a => a.CreatedByTeacher)
            .Include(a => a.Submissions)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null)
        {
            return NotFound(new { message = "Không tìm thấy bài tập" });
        }

        // RBAC check
        if (!IsAdmin)
        {
            if (IsTeacher && assignment.CreatedByTeacherId != userId && assignment.Classroom?.TeacherId != userId)
            {
                return Forbid();
            }
            if (!IsTeacher && !(assignment.Classroom?.Students.Any(s => s.StudentId == userId) ?? false))
            {
                return Forbid();
            }
        }

        SubmissionDto? mySubmissionDto = null;
        if (!IsTeacher)
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

        var result = new AssignmentDto
        {
            Id = assignment.Id,
            ClassroomId = assignment.ClassroomId,
            ClassroomName = assignment.Classroom?.Name,
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

        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin bài tập (Chỉ giáo viên tạo hoặc Admin)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> UpdateAssignment(string id, [FromBody] UpdateAssignmentRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
                .ThenInclude(c => c!.Students)
            .Include(a => a.Submissions)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null)
        {
            return NotFound(new { message = "Không tìm thấy bài tập" });
        }

        if (!IsAdmin && assignment.CreatedByTeacherId != userId && assignment.Classroom?.TeacherId != userId)
        {
            return Forbid();
        }

        if (!string.IsNullOrWhiteSpace(dto.Title)) assignment.Title = dto.Title.Trim();
        if (dto.Description != null) assignment.Description = dto.Description.Trim();
        if (dto.Instructions != null) assignment.Instructions = dto.Instructions.Trim();
        if (dto.DueDate.HasValue) assignment.DueDate = dto.DueDate.Value;
        if (dto.MaxScore.HasValue && dto.MaxScore.Value > 0) assignment.MaxScore = dto.MaxScore.Value;
        if (!string.IsNullOrWhiteSpace(dto.Status)) assignment.Status = dto.Status.Trim();

        assignment.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var result = new AssignmentDto
        {
            Id = assignment.Id,
            ClassroomId = assignment.ClassroomId,
            ClassroomName = assignment.Classroom?.Name,
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

        return Ok(result);
    }

    /// <summary>
    /// Nộp bài tập (Dành cho học sinh thuộc lớp)
    /// </summary>
    [HttpPost("{id}/submissions")]
    [Authorize(Roles = "learner,admin")]
    public async Task<IActionResult> SubmitAssignment(string id, [FromBody] CreateSubmissionRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Content))
        {
            return BadRequest(new { message = "Nội dung bài làm không được để trống" });
        }

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null)
        {
            return NotFound(new { message = "Không tìm thấy bài tập" });
        }

        // Kiểm tra trạng thái bài tập: không cho nộp khi bài đã đóng hoặc lưu trữ
        if (assignment.Status == "closed" || assignment.Status == "archived")
        {
            return BadRequest(new { message = "Bài tập đã đóng hoặc được lưu trữ, không nhận thêm bài nộp" });
        }

        // Kiểm tra hạn nộp bài tập
        if (DateTimeOffset.UtcNow > assignment.DueDate)
        {
            return BadRequest(new { message = "Hạn nộp bài tập đã kết thúc" });
        }

        // Kiểm tra học sinh có trong lớp không
        if (!IsAdmin)
        {
            var isEnrolled = await _db.ClassroomStudents.AnyAsync(
                cs => cs.ClassroomId == assignment.ClassroomId && cs.StudentId == userId,
                cancellationToken);

            if (!isEnrolled)
            {
                return Forbid();
            }
        }

        var existingSubmission = await _db.AssignmentSubmissions
            .FirstOrDefaultAsync(s => s.AssignmentId == id && s.StudentId == userId, cancellationToken);

        if (existingSubmission != null)
        {
            if (existingSubmission.Status == "graded")
            {
                return BadRequest(new { message = "Bài tập đã được giáo viên chấm điểm, không thể nộp lại" });
            }

            // Cho phép nộp lại khi chưa chấm
            existingSubmission.Content = dto.Content.Trim();
            existingSubmission.SubmittedAt = DateTimeOffset.UtcNow;
            existingSubmission.Status = "submitted";

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new SubmissionDto
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
            });
        }

        var student = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);

        var submission = new AssignmentSubmission
        {
            Id = $"sub-{Guid.NewGuid():N}"[..12],
            AssignmentId = id,
            StudentId = userId,
            Content = dto.Content.Trim(),
            SubmittedAt = DateTimeOffset.UtcNow,
            Status = "submitted",
        };

        _db.AssignmentSubmissions.Add(submission);
        await _db.SaveChangesAsync(cancellationToken);

        var result = new SubmissionDto
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

        return CreatedAtAction(nameof(GetMySubmission), new { id }, result);
    }

    /// <summary>
    /// Lấy bài nộp của chính người dùng hiện tại
    /// </summary>
    [HttpGet("{id}/my-submission")]
    [Authorize]
    public async Task<IActionResult> GetMySubmission(string id, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var assignment = await _db.Assignments.FindAsync(new object[] { id }, cancellationToken);
        if (assignment == null) return NotFound(new { message = "Không tìm thấy bài tập" });

        var submission = await _db.AssignmentSubmissions
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.AssignmentId == id && s.StudentId == userId, cancellationToken);

        if (submission == null)
        {
            return NotFound(new { message = "Chưa có bài nộp nào cho bài tập này" });
        }

        var result = new SubmissionDto
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

        return Ok(result);
    }

    /// <summary>
    /// Danh sách toàn bộ bài nộp của học sinh cho bài tập này (Dành cho Giáo viên / Admin)
    /// </summary>
    [HttpGet("{id}/submissions")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GetAssignmentSubmissions(string id, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null) return NotFound(new { message = "Không tìm thấy bài tập" });

        if (!IsAdmin && assignment.CreatedByTeacherId != userId && assignment.Classroom?.TeacherId != userId)
        {
            return Forbid();
        }

        var submissions = await _db.AssignmentSubmissions
            .Where(s => s.AssignmentId == id)
            .Include(s => s.Student)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync(cancellationToken);

        var result = submissions.Select(s => new SubmissionDto
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

        return Ok(result);
    }

    /// <summary>
    /// Chấm điểm bài nộp của học sinh (Giáo viên phụ trách hoặc Admin)
    /// </summary>
    [HttpPost("{id}/submissions/{submissionId}/grade")]
    [Authorize(Roles = "teacher,admin")]
    public async Task<IActionResult> GradeSubmission(string id, string submissionId, [FromBody] GradeSubmissionRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var assignment = await _db.Assignments
            .Include(a => a.Classroom)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (assignment == null) return NotFound(new { message = "Không tìm thấy bài tập" });

        if (!IsAdmin && assignment.CreatedByTeacherId != userId && assignment.Classroom?.TeacherId != userId)
        {
            return Forbid();
        }

        if (dto.Score < 0 || dto.Score > assignment.MaxScore)
        {
            return BadRequest(new { message = $"Điểm số phải nằm trong khoảng từ 0 đến {assignment.MaxScore}" });
        }

        var submission = await _db.AssignmentSubmissions
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.Id == submissionId && s.AssignmentId == id, cancellationToken);

        if (submission == null)
        {
            return NotFound(new { message = "Không tìm thấy bài nộp" });
        }

        submission.Score = dto.Score;
        submission.Feedback = dto.Feedback?.Trim();
        submission.Status = "graded";
        submission.GradedAt = DateTimeOffset.UtcNow;
        submission.GradedByTeacherId = userId;

        await _db.SaveChangesAsync(cancellationToken);

        var result = new SubmissionDto
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

        return Ok(result);
    }
}
