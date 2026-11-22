using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

using StudyAI.Models;

namespace StudyAI.Common.Utilities;

public class SubjectGradeResolver : ISubjectGradeResolver
{
    private readonly IApplicationDbContext _db;
    private static readonly Regex GradeRegex = new(@"(?<!\d)(10|11|12)(?!\d)", RegexOptions.Compiled);

    public SubjectGradeResolver(IApplicationDbContext db)
    {
        _db = db;
    }

    public string? NormalizeGrade(string? rawGrade)
    {
        if (string.IsNullOrWhiteSpace(rawGrade))
            return null;

        var match = GradeRegex.Match(rawGrade);
        return match.Success ? match.Groups[1].Value : null;
    }

    public async Task<SubjectResolutionResult> ResolveSubjectAsync(
        string? requestedSubjectId = null,
        string? userGrade = null,
        string? lessonId = null,
        string? chapterId = null,
        string? questionId = null,
        string? attemptId = null,
        CancellationToken cancellationToken = default)
    {
        // Priority 1: Explicit subject ID
        if (!string.IsNullOrWhiteSpace(requestedSubjectId))
        {
            var cleanId = requestedSubjectId.Trim();
            var subject = await _db.ContentSubjects
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == cleanId || s.Code == cleanId, cancellationToken);

            if (subject != null)
            {
                if (!subject.IsActive)
                {
                    return new SubjectResolutionResult(
                        false, null, subject.Grade, subject.Name,
                        $"Môn học '{cleanId}' hiện đang bị tạm khóa.");
                }

                return new SubjectResolutionResult(
                    true, subject.Id, subject.Grade, subject.Name);
            }

            return new SubjectResolutionResult(
                false, null, null, null,
                $"Không tìm thấy môn học với mã '{cleanId}'.");
        }

        // Priority 2: Entity relations (Lesson -> Chapter -> Subject)
        if (!string.IsNullOrWhiteSpace(lessonId))
        {
            var cleanLessonId = lessonId.Trim();
            var lesson = await _db.ContentLessons
                .AsNoTracking()
                .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
                .FirstOrDefaultAsync(l => l.Id == cleanLessonId, cancellationToken);

            if (lesson != null)
            {
                if (lesson.Chapter?.Subject != null)
                {
                    var s = lesson.Chapter.Subject;
                    return new SubjectResolutionResult(true, s.Id, s.Grade, s.Name);
                }

                if (!string.IsNullOrEmpty(lesson.Chapter?.SubjectId))
                {
                    var subj = await _db.ContentSubjects
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.Id == lesson.Chapter.SubjectId, cancellationToken);
                    if (subj != null)
                    {
                        return new SubjectResolutionResult(true, subj.Id, subj.Grade, subj.Name);
                    }
                }

                return new SubjectResolutionResult(
                    false, null, null, null,
                    $"Bài học '{cleanLessonId}' không liên kết với môn học hợp lệ.");
            }

            return new SubjectResolutionResult(
                false, null, null, null,
                $"Không tìm thấy bài học '{cleanLessonId}'.");
        }

        // Priority 3: Chapter relation
        if (!string.IsNullOrWhiteSpace(chapterId))
        {
            var cleanChapterId = chapterId.Trim();
            var chapter = await _db.ContentChapters
                .AsNoTracking()
                .Include(c => c.Subject)
                .FirstOrDefaultAsync(c => c.Id == cleanChapterId, cancellationToken);

            if (chapter != null)
            {
                if (chapter.Subject != null)
                {
                    var s = chapter.Subject;
                    return new SubjectResolutionResult(true, s.Id, s.Grade, s.Name);
                }

                if (!string.IsNullOrEmpty(chapter.SubjectId))
                {
                    var subj = await _db.ContentSubjects
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.Id == chapter.SubjectId, cancellationToken);
                    if (subj != null)
                    {
                        return new SubjectResolutionResult(true, subj.Id, subj.Grade, subj.Name);
                    }
                }

                return new SubjectResolutionResult(
                    false, null, null, null,
                    $"Chương '{cleanChapterId}' không liên kết với môn học hợp lệ.");
            }

            return new SubjectResolutionResult(
                false, null, null, null,
                $"Không tìm thấy chương '{cleanChapterId}'.");
        }

        // Priority 4: Question relation
        if (!string.IsNullOrWhiteSpace(questionId))
        {
            var cleanQuestionId = questionId.Trim();
            var question = await _db.ContentQuestions
                .AsNoTracking()
                .FirstOrDefaultAsync(q => q.Id == cleanQuestionId, cancellationToken);

            if (question != null)
            {
                if (!string.IsNullOrEmpty(question.SubjectId))
                {
                    var subj = await _db.ContentSubjects
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.Id == question.SubjectId, cancellationToken);
                    if (subj != null)
                    {
                        return new SubjectResolutionResult(true, subj.Id, subj.Grade, subj.Name);
                    }
                }

                if (!string.IsNullOrEmpty(question.LessonId))
                {
                    return await ResolveSubjectAsync(null, null, question.LessonId, null, null, null, cancellationToken);
                }

                return new SubjectResolutionResult(
                    false, null, null, null,
                    $"Câu hỏi '{cleanQuestionId}' không liên kết với môn học hợp lệ.");
            }

            return new SubjectResolutionResult(
                false, null, null, null,
                $"Không tìm thấy câu hỏi '{cleanQuestionId}'.");
        }

        // Priority 5: Assessment attempt relation
        if (!string.IsNullOrWhiteSpace(attemptId))
        {
            var cleanAttemptId = attemptId.Trim();
            var attempt = await _db.AssessmentAttempts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == cleanAttemptId, cancellationToken);

            if (attempt != null)
            {
                if (!string.IsNullOrEmpty(attempt.SubjectId))
                {
                    var subj = await _db.ContentSubjects
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.Id == attempt.SubjectId, cancellationToken);
                    if (subj != null)
                    {
                        return new SubjectResolutionResult(true, subj.Id, subj.Grade, subj.Name);
                    }
                }

                if (!string.IsNullOrEmpty(attempt.LessonId))
                {
                    return await ResolveSubjectAsync(null, null, attempt.LessonId, null, null, null, cancellationToken);
                }

                return new SubjectResolutionResult(
                    false, null, null, null,
                    $"Lượt luyện tập '{cleanAttemptId}' không liên kết với môn học hợp lệ.");
            }

            return new SubjectResolutionResult(
                false, null, null, null,
                $"Không tìm thấy lượt luyện tập '{cleanAttemptId}'.");
        }

        // Priority 6: User's authenticated grade
        if (!string.IsNullOrWhiteSpace(userGrade))
        {
            var normalized = NormalizeGrade(userGrade);
            if (normalized != null)
            {
                var subj = await _db.ContentSubjects
                    .AsNoTracking()
                    .Where(s => s.IsActive && (s.Grade == normalized || s.Id == $"sub_math{normalized}" || s.Code == $"MATH{normalized}"))
                    .OrderBy(s => s.OrderIndex)
                    .FirstOrDefaultAsync(cancellationToken);

                if (subj != null)
                {
                    return new SubjectResolutionResult(true, subj.Id, subj.Grade, subj.Name);
                }

                return new SubjectResolutionResult(
                    false, null, normalized, null,
                    $"Không tìm thấy môn học nào đang kích hoạt cho khối lớp {normalized}.");
            }

            return new SubjectResolutionResult(
                false, null, null, null,
                $"Khối lớp '{userGrade}' không hợp lệ (hệ thống hỗ trợ lớp 10, 11, 12).");
        }

        // Fallback: Never silently default to Grade 12 or sub_math12!
        return new SubjectResolutionResult(
            false, null, null, null,
            "Không thể xác định môn học từ yêu cầu, ngữ cảnh bài học hoặc khối lớp của người dùng.");
    }

    public async Task<string?> ResolveSubjectIdOrNullAsync(
        string? requestedSubjectId = null,
        string? userGrade = null,
        string? lessonId = null,
        string? chapterId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await ResolveSubjectAsync(
            requestedSubjectId, userGrade, lessonId, chapterId,
            cancellationToken: cancellationToken);
        return result.Success ? result.SubjectId : null;
    }
}
