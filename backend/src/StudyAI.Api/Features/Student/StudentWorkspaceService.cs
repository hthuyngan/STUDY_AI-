using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Exceptions;
using StudyAI.Data;
using StudyAI.Models;

namespace StudyAI.Features.Student;

public class StudentWorkspaceService : IStudentWorkspaceService
{
    private readonly StudyAIDbContext _db;

    public StudentWorkspaceService(StudyAIDbContext db)
    {
        _db = db;
    }

    public async Task<List<StudentMistakeItemDto>> GetMistakesAsync(string userId, CancellationToken ct = default)
    {
        var wrongResponses = await _db.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == userId && r.Attempt.CompletedAt != null && r.IsCorrect == false)
            .OrderByDescending(r => r.Attempt!.StartedAt)
            .Take(200)
            .ToListAsync(ct);

        var qIds = wrongResponses.Select(r => r.QuestionId).Distinct().ToList();
        var questionsById = await _db.ContentQuestions.AsNoTracking()
            .Where(q => qIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, ct);

        return wrongResponses
            .GroupBy(r => r.QuestionId)
            .Select(g =>
            {
                var latest = g.First();
                questionsById.TryGetValue(latest.QuestionId, out var q);
                return new StudentMistakeItemDto
                {
                    ResponseId = latest.Id.ToString(),
                    QuestionId = latest.QuestionId,
                    Prompt = q?.Prompt ?? "Câu hỏi Toán 12",
                    StudentAnswer = latest.SelectedOptionIdsJson,
                    CorrectAnswer = q?.CorrectAnswer,
                    Explanation = q?.Explanation,
                    ChapterTitle = q?.ChapterId,
                    WrongCount = g.Count(),
                    LastAttemptAt = (latest.Attempt?.StartedAt ?? DateTimeOffset.UtcNow).ToString("o")
                };
            })
            .ToList();
    }

    public async Task<LearnerClassroomSummaryDto> JoinClassroomByCodeAsync(string userId, string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ValidationException("Code", "Mã lớp học không được để trống.");

        var normalized = code.Trim();
        var cls = await _db.Classrooms.FirstOrDefaultAsync(c => c.Code == normalized && c.Status == "active", ct)
            ?? throw new NotFoundException("Không tìm thấy lớp học với mã này.");

        var existing = await _db.ClassroomStudents.FirstOrDefaultAsync(cs => cs.ClassroomId == cls.Id && cs.StudentId == userId, ct);
        if (existing == null)
        {
            existing = new ClassroomStudent
            {
                Id = $"cs-{Guid.NewGuid():N}"[..12],
                ClassroomId = cls.Id,
                StudentId = userId,
                EnrolledAt = DateTimeOffset.UtcNow
            };
            _db.ClassroomStudents.Add(existing);
            await _db.SaveChangesAsync(ct);
        }

        return await BuildClassroomSummaryAsync(cls, existing.EnrolledAt, ct);
    }

    public async Task<List<LearnerClassroomSummaryDto>> GetMyClassroomsAsync(string userId, CancellationToken ct = default)
    {
        var memberships = await _db.ClassroomStudents.AsNoTracking()
            .Include(cs => cs.Classroom)
            .Where(cs => cs.StudentId == userId && cs.Classroom != null && cs.Classroom.Status == "active")
            .OrderByDescending(cs => cs.EnrolledAt)
            .ToListAsync(ct);

        var result = new List<LearnerClassroomSummaryDto>();
        foreach (var m in memberships)
        {
            if (m.Classroom != null)
            {
                result.Add(await BuildClassroomSummaryAsync(m.Classroom, m.EnrolledAt, ct));
            }
        }
        return result;
    }

    private async Task<LearnerClassroomSummaryDto> BuildClassroomSummaryAsync(Classroom cls, DateTimeOffset enrolledAt, CancellationToken ct)
    {
        var annRows = await _db.ClassroomAnnouncements.AsNoTracking()
            .Where(a => a.ClassroomId == cls.Id)
            .OrderByDescending(a => a.IsPinned)
            .ThenByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new { a.Id, a.Title, a.Body, a.IsPinned, a.CreatedAt })
            .ToListAsync(ct);

        var anns = annRows.Select(a => new LearnerClassAnnouncementDto
        {
            Id = a.Id,
            Title = a.Title,
            Body = a.Body,
            IsPinned = a.IsPinned,
            CreatedAt = a.CreatedAt.ToString("o")
        }).ToList();

        var mats = await _db.ClassroomMaterials.AsNoTracking()
            .Where(m => m.ClassroomId == cls.Id && !m.IsRevoked)
            .OrderByDescending(m => m.CreatedAt)
            .Take(20)
            .Select(m => new LearnerClassMaterialDto
            {
                Id = m.Id,
                Title = m.Title,
                FileName = m.FileName,
                StoragePathOrUrl = m.StoragePathOrUrl
            })
            .ToListAsync(ct);

        return new LearnerClassroomSummaryDto
        {
            Id = cls.Id,
            Name = cls.Name,
            Code = cls.Code,
            TeacherName = cls.TeacherName,
            EnrolledAt = enrolledAt.ToString("o"),
            Announcements = anns,
            Materials = mats
        };
    }
}
