using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Infrastructure.Services;

public class VideoVerificationService : IVideoVerificationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<VideoVerificationService> _logger;

    private static readonly HashSet<string> AllowedHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
        "khanacademy.org",
        "www.khanacademy.org",
        "vi.khanacademy.org"
    };

    private static readonly Regex YouTubeIdRegex = new(
        @"(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public VideoVerificationService(HttpClient httpClient, ILogger<VideoVerificationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<VideoPreviewResponseDto> VerifyVideoUrlAsync(string url, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return new VideoPreviewResponseDto
            {
                IsValid = false,
                ErrorMessage = "URL video không được để trống."
            };
        }

        url = url.Trim();

        // 1. Validate URI format and enforce HTTPS
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            return new VideoPreviewResponseDto
            {
                IsValid = false,
                ErrorMessage = "URL không hợp lệ. Hệ thống chỉ chấp nhận giao thức bảo mật https://."
            };
        }

        // 2. Validate host against domain allowlist
        var host = uri.Host.ToLowerInvariant();
        bool isAllowedHost = AllowedHosts.Contains(host) || AllowedHosts.Any(h => host.EndsWith("." + h, StringComparison.OrdinalIgnoreCase));
        if (!isAllowedHost)
        {
            return new VideoPreviewResponseDto
            {
                IsValid = false,
                ErrorMessage = $"Tên miền '{uri.Host}' không nằm trong danh sách được phép. Chỉ hỗ trợ YouTube và Khan Academy."
            };
        }

        // 3. SSRF Protection: Resolve DNS and reject loopback/private/link-local IP addresses
        try
        {
            var addresses = await Dns.GetHostAddressesAsync(uri.DnsSafeHost, cancellationToken);
            if (addresses == null || addresses.Length == 0)
            {
                return new VideoPreviewResponseDto
                {
                    IsValid = false,
                    ErrorMessage = "Không thể phân giải địa chỉ IP của tên miền."
                };
            }

            foreach (var ip in addresses)
            {
                if (IsPrivateOrReservedIp(ip))
                {
                    _logger.LogWarning("SSRF attempt blocked for host {Host} resolving to private IP {IP}", uri.Host, ip);
                    return new VideoPreviewResponseDto
                    {
                        IsValid = false,
                        ErrorMessage = "Địa chỉ máy chủ không hợp lệ hoặc nằm trong mạng nội bộ."
                    };
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DNS resolution failed for video URL host: {Host}", uri.Host);
            return new VideoPreviewResponseDto
            {
                IsValid = false,
                ErrorMessage = $"Không thể kết nối đến máy chủ video: {ex.Message}"
            };
        }

        // 4. Handle Khan Academy
        if (host.Contains("khanacademy.org"))
        {
            return VerifyKhanAcademyUrl(uri);
        }

        // 5. Handle YouTube
        return await VerifyYouTubeUrlAsync(url, uri, cancellationToken);
    }

    private static VideoPreviewResponseDto VerifyKhanAcademyUrl(Uri uri)
    {
        var path = uri.AbsolutePath.Trim('/');
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var titleSlug = segments.Length > 0 ? segments[^1].Replace('-', ' ') : "Bài giảng Khan Academy";

        return new VideoPreviewResponseDto
        {
            IsValid = true,
            Provider = "khan_academy",
            Title = char.ToUpperInvariant(titleSlug[0]) + titleSlug[1..],
            Description = "Bài giảng chính thức từ nền tảng giáo dục mở Khan Academy Vietnam.",
            ChannelName = "Khan Academy Vietnam",
            ThumbnailUrl = "https://cdn.kastatic.org/images/khan-logo-dark-background-2.png",
            EmbedUrl = null,
            EmbedAllowed = false,
            AttributionText = "Nguồn: Khan Academy Vietnam (CC BY-NC-SA 4.0)"
        };
    }

    private async Task<VideoPreviewResponseDto> VerifyYouTubeUrlAsync(string rawUrl, Uri uri, CancellationToken cancellationToken)
    {
        var match = YouTubeIdRegex.Match(rawUrl);
        if (!match.Success)
        {
            return new VideoPreviewResponseDto
            {
                IsValid = false,
                ErrorMessage = "Không tìm thấy YouTube Video ID (11 ký tự) hợp lệ trong đường dẫn."
            };
        }

        var videoId = match.Groups[1].Value;
        var oEmbedUrl = $"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={videoId}&format=json";

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(6));

            using var response = await _httpClient.GetAsync(oEmbedUrl, cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                return new VideoPreviewResponseDto
                {
                    IsValid = false,
                    Provider = "youtube",
                    VideoId = videoId,
                    ErrorMessage = $"Video YouTube (ID: {videoId}) không tồn tại, ở chế độ riêng tư hoặc bị tắt tính năng nhúng (HTTP {(int)response.StatusCode})."
                };
            }

            var json = await response.Content.ReadAsStringAsync(cts.Token);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var title = root.TryGetProperty("title", out var titleProp) ? titleProp.GetString() ?? $"Video {videoId}" : $"Video {videoId}";
            var authorName = root.TryGetProperty("author_name", out var authorProp) ? authorProp.GetString() : "YouTube";
            var thumbnailUrl = root.TryGetProperty("thumbnail_url", out var thumbProp) ? thumbProp.GetString() : $"https://i.ytimg.com/vi/{videoId}/hqdefault.jpg";

            return new VideoPreviewResponseDto
            {
                IsValid = true,
                Provider = "youtube",
                VideoId = videoId,
                Title = title,
                ChannelName = authorName,
                ThumbnailUrl = thumbnailUrl,
                EmbedUrl = $"https://www.youtube-nocookie.com/embed/{videoId}",
                EmbedAllowed = true,
                AttributionText = $"Nguồn: YouTube / Kênh {authorName}"
            };
        }
        catch (TaskCanceledException)
        {
            return new VideoPreviewResponseDto
            {
                IsValid = false,
                Provider = "youtube",
                VideoId = videoId,
                ErrorMessage = "Quá thời gian kết nối (timeout) khi kiểm tra tính hợp lệ của video YouTube."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xác minh video YouTube ID {VideoId}", videoId);
            return new VideoPreviewResponseDto
            {
                IsValid = false,
                Provider = "youtube",
                VideoId = videoId,
                ErrorMessage = $"Lỗi kết nối khi xác thực video: {ex.Message}"
            };
        }
    }

    private static bool IsPrivateOrReservedIp(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip)) return true;

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            return ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.Equals(IPAddress.IPv6Loopback) || ip.Equals(IPAddress.IPv6Any);
        }

        var bytes = ip.GetAddressBytes();
        // 0.0.0.0/8
        if (bytes[0] == 0) return true;
        // 10.0.0.0/8
        if (bytes[0] == 10) return true;
        // 127.0.0.0/8
        if (bytes[0] == 127) return true;
        // 169.254.0.0/16
        if (bytes[0] == 169 && bytes[1] == 254) return true;
        // 172.16.0.0/12
        if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
        // 192.168.0.0/16
        if (bytes[0] == 192 && bytes[1] == 168) return true;
        // Broadcast / Multicast
        if (bytes[0] >= 224) return true;

        return false;
    }
}
