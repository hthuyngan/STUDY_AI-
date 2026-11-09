using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Application.Services;

namespace StudyAI.Api.Controllers;

[Authorize(Roles = "content,admin")]
[ApiController]
[Route("api/v1/content/import")]
public class CurriculumImportController : ControllerBase
{
    private readonly ICurriculumImportParser _parser;
    private readonly ICurriculumImportValidator _validator;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CurriculumImportController> _logger;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".json", ".csv", ".xlsx"
    };

    public CurriculumImportController(
        ICurriculumImportParser parser,
        ICurriculumImportValidator validator,
        IMemoryCache cache,
        ILogger<CurriculumImportController> logger)
    {
        _parser = parser;
        _validator = validator;
        _cache = cache;
        _logger = logger;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
    private string CurrentUserEmail => User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? "unknown@studyai.internal";

    /// <summary>
    /// Preview API — Hoàn toàn Read-Only.
    /// Parse và validate tệp import, tính toán trước các thao tác (Insert/Update/Skip/Conflict)
    /// và cấp phát PreviewToken an toàn gắn liền với Actor và FileHash.
    /// Không thực hiện bất kỳ thao tác ghi nào vào Database.
    /// </summary>
    [HttpPost("preview")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(CurriculumImportPreviewResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> PreviewImport([FromForm] IFormFile? file, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra sự tồn tại và tính hợp lệ của tệp
        if (file == null || file.Length == 0)
        {
            return BadRequest(new
            {
                errorCode = "FILE_EMPTY",
                message = "Vui lòng chọn tệp dữ liệu không rỗng để tải lên."
            });
        }

        if (file.Length > CurriculumImportParser.MaxFileSizeBytes)
        {
            return BadRequest(new
            {
                errorCode = "FILE_TOO_LARGE",
                message = $"Dung lượng tệp ({file.Length} bytes) vượt quá giới hạn tối đa cho phép ({CurriculumImportParser.MaxFileSizeBytes / 1024 / 1024}MB)."
            });
        }

        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
        {
            return BadRequest(new
            {
                errorCode = "UNSUPPORTED_FORMAT",
                message = $"Định dạng tệp '{ext}' không được hỗ trợ. Chỉ chấp nhận các định dạng: .json, .csv, .xlsx."
            });
        }

        // 2. Parse tệp dữ liệu bằng Engine bảo mật
        CurriculumImportBatchDto batch;
        try
        {
            using var stream = file.OpenReadStream();
            batch = await _parser.ParseAsync(stream, file.FileName, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Lỗi phân tích cú pháp tệp import {FileName}", file.FileName);
            return BadRequest(new
            {
                errorCode = "PARSE_ERROR",
                message = ex.Message
            });
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Lỗi cú pháp JSON trong tệp {FileName}", file.FileName);
            return BadRequest(new
            {
                errorCode = "MALFORMED_JSON",
                message = $"Tệp JSON không đúng cú pháp: {ex.Message}"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi không xác định khi parse tệp {FileName}", file.FileName);
            return BadRequest(new
            {
                errorCode = "FILE_READ_FAILED",
                message = $"Không thể đọc tệp tin: {ex.Message}"
            });
        }

        // 3. Thực hiện kiểm định an toàn (Hoàn toàn Read-Only đối soát với CSDL)
        var validationResult = await _validator.ValidateBatchAsync(batch, cancellationToken);

        // 4. Tạo PreviewToken an toàn gắn liền với Actor, FileHash và thời hạn sử dụng
        var previewToken = $"prev_{Guid.NewGuid():N}";
        var expiresAt = DateTimeOffset.UtcNow.AddHours(1);

        var previewResponse = new CurriculumImportPreviewResponseDto
        {
            PreviewToken = previewToken,
            FileHashSha256 = batch.FileHashSha256,
            FileName = batch.FileName,
            FileFormat = batch.SourceFormat.ToString().ToLowerInvariant(),
            Summary = validationResult.Summary,
            Errors = validationResult.Errors,
            Warnings = validationResult.Warnings,
            PreviewItems = validationResult.Previews,
            ExpiresAt = expiresAt
        };

        // 5. Lưu phiên Preview vào cache an toàn để dùng cho bước Confirm/Transaction (Mốc B phần 2)
        var session = new CurriculumImportSessionDto
        {
            PreviewToken = previewToken,
            ActorId = CurrentUserId,
            ActorEmail = CurrentUserEmail,
            FileHashSha256 = batch.FileHashSha256,
            FileName = batch.FileName,
            FileFormat = previewResponse.FileFormat,
            Batch = batch,
            PreviewResponse = previewResponse,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = expiresAt
        };

        _cache.Set($"import:preview:{previewToken}", session, new MemoryCacheEntryOptions
        {
            AbsoluteExpiration = expiresAt
        });

        _logger.LogInformation("Đã khởi tạo Preview import thành công: Token={Token}, Actor={Actor}, TotalItems={TotalItems}, Errors={Errors}",
            previewToken, CurrentUserEmail, previewResponse.Summary.TotalItems, previewResponse.Summary.ErrorCount);

        return Ok(previewResponse);
    }
}
