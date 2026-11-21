namespace StudyAI.Application.Common.Interfaces;

public record SubjectResolutionResult(
    bool Success,
    string? SubjectId,
    string? Grade,
    string? SubjectName,
    string? ErrorMessage = null
);

public interface ISubjectGradeResolver
{
    Task<SubjectResolutionResult> ResolveSubjectAsync(
        string? requestedSubjectId = null,
        string? userGrade = null,
        string? lessonId = null,
        string? chapterId = null,
        string? questionId = null,
        string? attemptId = null,
        CancellationToken cancellationToken = default);

    Task<string?> ResolveSubjectIdOrNullAsync(
        string? requestedSubjectId = null,
        string? userGrade = null,
        string? lessonId = null,
        string? chapterId = null,
        CancellationToken cancellationToken = default);

    string? NormalizeGrade(string? rawGrade);
}
