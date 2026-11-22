
namespace StudyAI.Features.Content;

public interface IVideoVerificationService
{
    Task<VideoPreviewResponseDto> VerifyVideoUrlAsync(string url, CancellationToken cancellationToken = default);
}