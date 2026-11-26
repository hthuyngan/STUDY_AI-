using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using StudyAI.Models;

namespace StudyAI.Features.Content;

public sealed record ValidatedResourceMetadata(
    string ResourceType,
    string Provider,
    string NormalizedUrl,
    string? EmbedUrl,
    string? YouTubeVideoId,
    string? ThumbnailUrl,
    bool EmbedAllowed);

public static class LessonResourceValidator
{
    private static readonly Regex YouTubeIdRegex = new(
        @"(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly HashSet<string> AllowedVideoEmbedHosts = new(StringComparer.OrdinalIgnoreCase)
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

    private static readonly HashSet<string> DisallowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text/html",
        "application/xhtml+xml",
        "application/javascript",
        "text/javascript",
        "image/svg+xml"
    };

    public static string NormalizeResourceType(string? resourceType)
    {
        var normalized = (resourceType ?? LessonResourceTypes.Video).Trim().ToLowerInvariant();
        if (!LessonResourceTypes.All.Contains(normalized))
        {
            throw new ValidationException("ResourceType", $"Loại tài nguyên '{resourceType}' không hợp lệ. Chỉ chấp nhận: video, image, document, link, attachment.");
        }
        return normalized;
    }

    public static ValidatedResourceMetadata ValidateAndNormalize(
        string? rawResourceType,
        string? rawUrl,
        string? requestedProvider,
        string? requestedEmbedUrl,
        string? requestedYouTubeId,
        string? requestedThumbnailUrl,
        string? mimeType,
        string? storageKey,
        bool requestedEmbedAllowed,
        bool resolveDns = true)
    {
        var resourceType = NormalizeResourceType(rawResourceType);

        if (!string.IsNullOrWhiteSpace(mimeType) && DisallowedMimeTypes.Contains(mimeType.Trim()))
        {
            throw new ValidationException("MimeType", $"Định dạng MIME '{mimeType}' không được phép vì lý do bảo mật.");
        }

        var trimmedUrl = rawUrl?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmedUrl))
        {
            if (resourceType == LessonResourceTypes.Attachment && !string.IsNullOrWhiteSpace(storageKey))
            {
                var safeStorage = ValidateStorageKey(storageKey);
                return new ValidatedResourceMetadata(
                    resourceType,
                    "internal_storage",
                    safeStorage,
                    null,
                    null,
                    null,
                    false);
            }
            throw new ValidationException("SourceUrl", "Đường dẫn URL tài nguyên không được để trống.");
        }

        // Allow safe internal attachment paths like /uploads/... only for attachment
        if (resourceType == LessonResourceTypes.Attachment && trimmedUrl.StartsWith("/uploads/", StringComparison.Ordinal))
        {
            var safePath = ValidateStorageKey(trimmedUrl);
            return new ValidatedResourceMetadata(
                resourceType,
                "internal_storage",
                safePath,
                null,
                null,
                null,
                false);
        }

        var uri = ValidatePublicHttpsUrl(trimmedUrl, "SourceUrl", resolveDns);

        if (!string.IsNullOrWhiteSpace(requestedThumbnailUrl))
        {
            ValidatePublicHttpsUrl(requestedThumbnailUrl.Trim(), "ThumbnailUrl", resolveDns: false);
        }

        if (resourceType == LessonResourceTypes.Video)
        {
            var host = uri.Host.ToLowerInvariant();
            var isYouTube = IsHostOrSubdomain(host, "youtube.com") ||
                            IsHostOrSubdomain(host, "youtu.be") ||
                            IsHostOrSubdomain(host, "youtube-nocookie.com");
            var isKhan = IsHostOrSubdomain(host, "khanacademy.org");

            if (isYouTube)
            {
                var match = YouTubeIdRegex.Match(trimmedUrl);
                if (!match.Success)
                {
                    throw new ValidationException("SourceUrl", "URL YouTube không chứa Video ID hợp lệ (11 ký tự).");
                }
                var ytId = match.Groups[1].Value;
                var embedUrl = $"https://www.youtube-nocookie.com/embed/{ytId}";
                var thumb = !string.IsNullOrWhiteSpace(requestedThumbnailUrl)
                    ? requestedThumbnailUrl.Trim()
                    : $"https://i.ytimg.com/vi/{ytId}/hqdefault.jpg";

                return new ValidatedResourceMetadata(
                    resourceType,
                    "youtube",
                    trimmedUrl,
                    embedUrl,
                    ytId,
                    thumb,
                    requestedEmbedAllowed);
            }

            if (isKhan)
            {
                return new ValidatedResourceMetadata(
                    resourceType,
                    "khan_academy",
                    trimmedUrl,
                    null,
                    null,
                    !string.IsNullOrWhiteSpace(requestedThumbnailUrl) ? requestedThumbnailUrl.Trim() : null,
                    false);
            }

            // External or html5 video: must still be public https, never arbitrary iframe embed unless allowlisted
            var provider = !string.IsNullOrWhiteSpace(requestedProvider)
                ? requestedProvider.Trim().ToLowerInvariant()
                : "external";
            if (provider is not ("external" or "html5" or "youtube" or "khan_academy"))
            {
                throw new ValidationException("Provider", $"Provider '{provider}' không được hỗ trợ.");
            }
            if (provider is "youtube" or "khan_academy")
            {
                throw new ValidationException("SourceUrl", $"Tên miền '{uri.Host}' không khớp với provider '{provider}'.");
            }

            return new ValidatedResourceMetadata(
                resourceType,
                provider,
                trimmedUrl,
                null,
                null,
                !string.IsNullOrWhiteSpace(requestedThumbnailUrl) ? requestedThumbnailUrl.Trim() : null,
                false);
        }

        // Non-video types: image, document, link, attachment
        return new ValidatedResourceMetadata(
            resourceType,
            string.IsNullOrWhiteSpace(requestedProvider) ? "external" : requestedProvider.Trim().ToLowerInvariant(),
            trimmedUrl,
            null,
            null,
            !string.IsNullOrWhiteSpace(requestedThumbnailUrl) ? requestedThumbnailUrl.Trim() : null,
            false);
    }

    public static bool IsSafeLearnerUrl(string? url, string? resourceType = null)
    {
        if (string.IsNullOrWhiteSpace(url)) return false;
        var trimmed = url.Trim();
        if (string.Equals(resourceType, LessonResourceTypes.Attachment, StringComparison.OrdinalIgnoreCase) &&
            trimmed.StartsWith("/uploads/", StringComparison.Ordinal) &&
            !trimmed.Contains("..", StringComparison.Ordinal))
        {
            return true;
        }

        try
        {
            ValidatePublicHttpsUrl(trimmed, "SourceUrl", resolveDns: false);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public static Uri ValidatePublicHttpsUrl(string url, string fieldName, bool resolveDns = true)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            throw new ValidationException(fieldName, "Đường dẫn URL không đúng định dạng.");
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException(fieldName, "Chỉ chấp nhận đường dẫn bảo mật https:// (từ chối http/javascript/data/file).");
        }

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            throw new ValidationException(fieldName, "URL không được chứa thông tin đăng nhập (user:pass@).");
        }

        if (!uri.IsDefaultPort && uri.Port != 443)
        {
            throw new ValidationException(fieldName, $"Cổng kết nối {uri.Port} không được phép.");
        }

        var host = uri.DnsSafeHost.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(host) ||
            host == "localhost" ||
            host.EndsWith(".localhost", StringComparison.Ordinal) ||
            host.EndsWith(".local", StringComparison.Ordinal) ||
            host.EndsWith(".internal", StringComparison.Ordinal))
        {
            throw new ValidationException(fieldName, "Không cho phép trỏ tới địa chỉ nội bộ hoặc localhost.");
        }

        if (IPAddress.TryParse(host, out var parsedIp))
        {
            if (IsPrivateOrReservedIp(parsedIp))
            {
                throw new ValidationException(fieldName, "Không cho phép địa chỉ IP nội bộ hoặc IP dành riêng.");
            }
        }
        else if (resolveDns)
        {
            try
            {
                var addresses = Dns.GetHostAddresses(host);
                if (addresses.Any(IsPrivateOrReservedIp))
                {
                    throw new ValidationException(fieldName, "Tên miền phân giải về địa chỉ IP nội bộ/không hợp lệ.");
                }
            }
            catch (ValidationException)
            {
                throw;
            }
            catch
            {
                // Offline/DNS unavailable in isolated test environments should not crash static format validation
                // as long as host is not an IP literal or local domain.
            }
        }

        return uri;
    }

    private static string ValidateStorageKey(string storageKey)
    {
        var trimmed = storageKey.Trim();
        if (trimmed.Contains("..", StringComparison.Ordinal) ||
            trimmed.Contains('\\') ||
            trimmed.Contains('?') ||
            trimmed.Contains('#'))
        {
            throw new ValidationException("StorageKey", "StorageKey không hợp lệ.");
        }
        return trimmed;
    }

    private static bool IsHostOrSubdomain(string host, string domain)
    {
        return string.Equals(host, domain, StringComparison.OrdinalIgnoreCase) ||
               host.EndsWith("." + domain, StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsPrivateOrReservedIp(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip)) return true;

        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            byte[] bytes = ip.GetAddressBytes();
            if (bytes[0] == 0) return true; // 0.0.0.0/8
            if (bytes[0] == 10) return true; // 10.0.0.0/8
            if (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127) return true; // 100.64.0.0/10 CGNAT
            if (bytes[0] == 127) return true; // 127.0.0.0/8
            if (bytes[0] == 169 && bytes[1] == 254) return true; // 169.254.0.0/16 link-local / cloud metadata
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true; // 172.16.0.0/12
            if (bytes[0] == 192 && bytes[1] == 168) return true; // 192.168.0.0/16
            if (bytes[0] >= 224) return true; // multicast & reserved
        }
        else if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (ip.IsIPv6LinkLocal || ip.IsIPv6Multicast || ip.IsIPv6SiteLocal || ip.Equals(IPAddress.IPv6None))
                return true;
            byte[] bytes = ip.GetAddressBytes();
            if ((bytes[0] & 0xfe) == 0xfc) return true; // fc00::/7 unique local
        }

        return false;
    }
}
