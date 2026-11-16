using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IQuestionQualityService
{
    Task<QuestionQualityAuditReportDto> AuditQuestionsQualityAsync(
        string subjectId = "sub_math12",
        CancellationToken cancellationToken = default);

    bool ValidateLatexSyntax(string text, out string? errorReason);
}

