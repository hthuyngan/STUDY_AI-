using StudyAI.Application.DTOs;

namespace StudyAI.Application.Common.Interfaces;

public interface IVideoVerificationService
{
    Task<VideoPreviewResponseDto> VerifyVideoUrlAsync(string url, CancellationToken cancellationToken = default);
}
