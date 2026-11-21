using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IQuestionQualityService
{
    Task<QuestionQualityAuditReportDto> AuditQuestionsQualityAsync(
        string subjectId,
        CancellationToken cancellationToken = default);

    bool ValidateLatexSyntax(string text, out string? errorReason);
}

