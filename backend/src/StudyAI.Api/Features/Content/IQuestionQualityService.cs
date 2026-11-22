
namespace StudyAI.Features.Content;

public interface IQuestionQualityService
{
    Task<QuestionQualityAuditReportDto> AuditQuestionsQualityAsync(
        string subjectId,
        CancellationToken cancellationToken = default);

    bool ValidateLatexSyntax(string text, out string? errorReason);
}
