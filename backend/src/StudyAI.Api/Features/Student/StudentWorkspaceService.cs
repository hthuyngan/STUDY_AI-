using System.Text.Json;
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
        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedException();

        var wrongResponses = await _db.AssessmentResponses.AsNoTracking()
            .Include(r => r.Attempt)
            .Where(r => r.Attempt != null && r.Attempt.UserId == userId && r.Attempt.CompletedAt != null && r.IsCorrect == false)
            .OrderByDescending(r => r.Attempt!.StartedAt)
            .Take(200)
            .ToListAsync(ct);

        var attemptAssessmentIds = wrongResponses
            .Select(r => r.Attempt?.AssessmentId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        // Respect TeacherExam result-release policy scoped to classrooms this learner is enrolled in (R07-02)
        var enrolledClassIds = await _db.ClassroomStudents.AsNoTracking()
            .Where(cs => cs.StudentId == userId)
            .Select(cs => cs.ClassroomId)
            .ToListAsync(ct);

        var unreleasedAssessmentIds = (attemptAssessmentIds.Count == 0 || enrolledClassIds.Count == 0)
            ? new HashSet<string>()
            : (await _db.TeacherExams.AsNoTracking()
                .Where(e => enrolledClassIds.Contains(e.ClassroomId) && e.SourceAssessmentId != null && attemptAssessmentIds.Contains(e.SourceAssessmentId) && !e.PublishResults)
                .Select(e => e.SourceAssessmentId!)
                .ToListAsync(ct))
                .ToHashSet(StringComparer.Ordinal);

        var qIds = wrongResponses.Select(r => r.QuestionId).Distinct().ToList();
        var questionsById = await _db.ContentQuestions.AsNoTracking()
            .Where(q => qIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, ct);

        var chapterIds = questionsById.Values
            .Select(q => q.ChapterId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();
        var chaptersById = chapterIds.Count == 0
            ? new Dictionary<string, string>()
            : await _db.ContentChapters.AsNoTracking()
                .Where(c => chapterIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Title, ct);

        return wrongResponses
            .GroupBy(r => r.QuestionId)
            .Select(g =>
            {
                var latest = g.First();
                var isUnreleased = latest.Attempt != null && unreleasedAssessmentIds.Contains(latest.Attempt.AssessmentId);
                questionsById.TryGetValue(latest.QuestionId, out var q);
                var snap = TryReadQuestionSnapshot(latest.Attempt?.SuspendDataJson, latest.QuestionId);
                string? chapterTitle = null;
                if (q?.ChapterId != null && chaptersById.TryGetValue(q.ChapterId, out var resolvedTitle))
                    chapterTitle = resolvedTitle;
                return new StudentMistakeItemDto
                {
                    ResponseId = latest.Id.ToString(),
                    QuestionId = latest.QuestionId,
                    Prompt = snap?.Prompt ?? q?.Prompt ?? "Câu hỏi Toán 12",
                    StudentAnswer = latest.SelectedOptionIdsJson,
                    CorrectAnswer = isUnreleased ? null : (snap?.CorrectAnswer ?? q?.CorrectAnswer),
                    Explanation = isUnreleased ? "Kết quả chưa được giáo viên công bố." : (snap?.Explanation ?? q?.Explanation),
                    ChapterTitle = chapterTitle,
                    WrongCount = g.Count(),
                    IsResolved = latest.IsMistakeResolved,
                    LastAttemptAt = (latest.Attempt?.StartedAt ?? DateTimeOffset.UtcNow).ToString("o")
                };
            })
            .ToList();
    }

    public async Task ResolveMistakeAsync(string userId, int responseId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedException();
        var response = await _db.AssessmentResponses
            .Include(r => r.Attempt)
            .FirstOrDefaultAsync(r => r.Id == responseId && r.Attempt != null && r.Attempt.UserId == userId, ct)
            ?? throw new NotFoundException("Không tìm thấy câu sai cần đánh dấu.");
        if (response.Attempt?.CompletedAt == null || response.IsCorrect != false)
            throw new ValidationException("ResponseId", "Chỉ được đánh dấu đã khắc phục cho câu trả lời sai trong bài đã nộp.");
        response.IsMistakeResolved = true;
        await _db.SaveChangesAsync(ct);
    }

    private sealed record QuestionSnapshotItem(string? Prompt, string? CorrectAnswer, string? Explanation);

    private static QuestionSnapshotItem? TryReadQuestionSnapshot(string? suspendDataJson, string questionId)
    {
        if (string.IsNullOrWhiteSpace(suspendDataJson)) return null;
        try
        {
            using var doc = JsonDocument.Parse(suspendDataJson);
            if (doc.RootElement.TryGetProperty("questionSnapshots", out var snaps) &&
                snaps.ValueKind == JsonValueKind.Object &&
                snaps.TryGetProperty(questionId, out var qEl) &&
                qEl.ValueKind == JsonValueKind.Object)
            {
                var prompt = qEl.TryGetProperty("prompt", out var p) ? p.GetString() : null;
                var correct = qEl.TryGetProperty("correctAnswer", out var c) ? c.GetString() : null;
                var expl = qEl.TryGetProperty("explanation", out var e) ? e.GetString() : null;
                return new QuestionSnapshotItem(prompt, correct, expl);
            }
        }
        catch { }
        return null;
    }

    public async Task<LearnerClassroomSummaryDto> JoinClassroomByCodeAsync(string userId, string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedException();
        if (string.IsNullOrWhiteSpace(code))
            throw new ValidationException("Code", "Mã lớp học không được để trống.");

        var normalized = code.Trim();
        if (normalized.Length < 4 || normalized.Length > 32)
            throw new ValidationException("Code", "Mã lớp học phải có độ dài từ 4 đến 32 ký tự.");

        var cls = await _db.Classrooms.FirstOrDefaultAsync(c => c.Code == normalized && c.Status == "active", ct)
            ?? throw new NotFoundException("Không tìm thấy lớp học với mã này hoặc lớp đã đóng.");

        if (!string.IsNullOrWhiteSpace(cls.Grade) && !string.Equals(cls.Grade.Trim(), "12", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("Code", "Lớp học này không thuộc phạm vi Toán lớp 12.");

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
            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // Concurrent join race: detach failed insert and re-read existing membership
                _db.Entry(existing).State = EntityState.Detached;
                existing = await _db.ClassroomStudents.AsNoTracking()
                    .FirstOrDefaultAsync(cs => cs.ClassroomId == cls.Id && cs.StudentId == userId, ct)
                    ?? throw new InvalidOperationException("Không thể ghi nhận tham gia lớp học.");
            }
        }

        return await BuildClassroomSummaryAsync(cls, existing.EnrolledAt, ct);
    }

    public async Task<List<LearnerClassroomSummaryDto>> GetMyClassroomsAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedException();
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
