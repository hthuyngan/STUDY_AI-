using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public class CurriculumImportConfirmResult
{
    public bool Success { get; set; }
    public int StatusCode { get; set; } = 200;
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public CurriculumImportConfirmResponseDto? Response { get; set; }

    public static CurriculumImportConfirmResult Ok(CurriculumImportConfirmResponseDto response)
    {
        return new CurriculumImportConfirmResult
        {
            Success = true,
            StatusCode = 200,
            Response = response
        };
    }

    public static CurriculumImportConfirmResult Fail(int statusCode, string errorCode, string errorMessage)
    {
        return new CurriculumImportConfirmResult
        {
            Success = false,
            StatusCode = statusCode,
            ErrorCode = errorCode,
            ErrorMessage = errorMessage
        };
    }
}

public interface ICurriculumImportConfirmService
{
    Task<CurriculumImportConfirmResult> ConfirmImportAsync(
        string previewToken,
        string currentUserId,
        string? auditNote,
        CancellationToken cancellationToken = default);
}
