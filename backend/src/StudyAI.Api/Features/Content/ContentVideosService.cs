using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Content;

public class ContentVideosService : IContentVideosService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;
    private readonly IVideoVerificationService? _videoVerificationService;

    public ContentVideosService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator,
        IVideoVerificationService? videoVerificationService = null)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
        _videoVerificationService = videoVerificationService;
    }

    private static (string? provider, string? videoId, string? embedUrl) ParseVideoUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return ("external", null, null);
        url = url.Trim();
        var ytMatch = Regex.Match(url, @"(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})");
        if (ytMatch.Success)
        {
            var vid = ytMatch.Groups[1].Value;
            return ("youtube", vid, $"https://www.youtube-nocookie.com/embed/{vid}");
        }
        var khanMatch = Regex.Match(url, @"khanacademy\.org");
        if (khanMatch.Success)
        {
            return ("khan_academy", null, url);
        }
        return ("external", null, url);
    }

    private static ContentLessonVideoItemDto MapToVideoDto(ContentLessonVideo v, string lessonTitle)
    {
        return new ContentLessonVideoItemDto
        {
            Id = v.Id,
            LessonId = v.LessonId,
            LessonTitle = lessonTitle,
            Title = v.Title,
            Description = v.Description ?? "",
            Provider = v.Provider,
            SourceUrl = v.SourceUrl,
            EmbedUrl = v.EmbedUrl,
            YouTubeVideoId = v.YouTubeVideoId,
            ChannelName = v.ChannelName,
            IsPrimary = v.IsPrimary,
            AttributionText = v.AttributionText,
            Language = v.Language,
            DurationSeconds = v.DurationSeconds,
            ThumbnailUrl = v.ThumbnailUrl,
            SortOrder = v.SortOrder,
            EmbedAllowed = v.EmbedAllowed,
            VerificationStatus = v.VerificationStatus,
            VerifiedAt = v.VerifiedAt?.ToString("o"),
            LastVerifiedAt = (v.LastVerifiedAt ?? v.VerifiedAt)?.ToString("o"),
            IsPublished = v.IsPublished,
            CreatedAt = v.CreatedAt.ToString("o"),
            UpdatedAt = v.UpdatedAt.ToString("o")
        };
    }

    public async Task<object> ListLessonVideosAsync(string lessonId, CancellationToken ct = default)
    {
        var les = await _db.ContentLessons.FindAsync(new object[] { lessonId }, ct);
        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");

        var videos = await _db.ContentLessonVideos
            .Where(v => v.LessonId == lessonId)
            .OrderBy(v => v.SortOrder)
            .ThenBy(v => v.CreatedAt)
            .ToListAsync(ct);

        var result = videos.Select(v => MapToVideoDto(v, les.Title)).ToList();
        return new { items = result, total = result.Count };
    }

    public async Task<ContentLessonVideoItemDto> AddLessonVideoAsync(
        string lessonId,
        CreateLessonVideoRequestDto req,
        string currentUserId,
        bool isAuthorizedReviewer,
        CancellationToken ct = default)
    {
        var les = await _db.ContentLessons.FindAsync(new object[] { lessonId }, ct);
        if (les == null)
            throw new NotFoundException("Bài học không tồn tại.");

        if (string.IsNullOrWhiteSpace(req.SourceUrl) || string.IsNullOrWhiteSpace(req.Title))
            throw new ValidationException("SourceUrl/Title", "Tiêu đề và Đường dẫn URL video không được để trống.");

        if (_videoVerificationService != null)
        {
            var verifyResult = await _videoVerificationService.VerifyVideoUrlAsync(req.SourceUrl, ct);
            if (!verifyResult.IsValid)
            {
                throw new ValidationException("SourceUrl", verifyResult.ErrorMessage ?? "URL video không hợp lệ hoặc bị từ chối bởi cơ chế an toàn.");
            }
        }

        var vStatus = !string.IsNullOrWhiteSpace(req.VerificationStatus)
            ? req.VerificationStatus.Trim().ToLowerInvariant()
            : "pending";

        if (vStatus != "pending" && vStatus != "verified" && vStatus != "rejected")
        {
            throw new ValidationException("VerificationStatus", "Trạng thái xác minh không hợp lệ. Chỉ chấp nhận: pending, verified, rejected.");
        }

        if (vStatus == "verified" && !isAuthorizedReviewer)
        {
            throw new ForbiddenException("Chỉ người kiểm duyệt có thẩm quyền mới có quyền xác minh video.");
        }

        if (req.IsPublished)
        {
            if (!isAuthorizedReviewer)
            {
                throw new ForbiddenException("Chỉ người kiểm duyệt có thẩm quyền mới có quyền xuất bản video.");
            }
            if (vStatus != "verified")
            {
                throw new ValidationException("IsPublished", "Không thể xuất bản video chưa được xác minh (VerificationStatus phải là 'verified').");
            }
        }

        var (detectedProvider, ytId, embedUrl) = ParseVideoUrl(req.SourceUrl);
        var provider = !string.IsNullOrWhiteSpace(req.Provider) ? req.Provider : detectedProvider;
        var finalEmbedUrl = !string.IsNullOrWhiteSpace(req.EmbedUrl) ? req.EmbedUrl : embedUrl;
        var finalYtId = !string.IsNullOrWhiteSpace(req.YouTubeVideoId) ? req.YouTubeVideoId : ytId;
        var thumb = !string.IsNullOrWhiteSpace(req.ThumbnailUrl)
            ? req.ThumbnailUrl
            : (finalYtId != null ? $"https://i.ytimg.com/vi/{finalYtId}/hqdefault.jpg" : null);

        var now = _clock.UtcNow;
        DateTimeOffset? vAt = (vStatus == "verified") ? now : null;

        var video = new ContentLessonVideo
        {
            Id = _idGenerator.NewId("vid"),
            LessonId = lessonId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            Provider = provider ?? "youtube",
            SourceUrl = req.SourceUrl.Trim(),
            EmbedUrl = finalEmbedUrl,
            YouTubeVideoId = finalYtId,
            ChannelName = req.ChannelName,
            IsPrimary = req.IsPrimary,
            AttributionText = req.AttributionText,
            Language = !string.IsNullOrWhiteSpace(req.Language) ? req.Language : "vi",
            DurationSeconds = req.DurationSeconds,
            ThumbnailUrl = thumb,
            SortOrder = req.SortOrder,
            EmbedAllowed = req.EmbedAllowed,
            VerificationStatus = vStatus,
            VerifiedAt = vAt,
            LastVerifiedAt = vAt,
            IsPublished = req.IsPublished,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentLessonVideos.Add(video);

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_video_added",
            "content_lesson_video",
            video.Id,
            null,
            JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, provider = video.Provider, status = video.VerificationStatus }),
            ct);

        if (video.VerificationStatus == "verified")
        {
            await _auditWriter.WriteStaffAuditAsync(
                "lesson_video_verified",
                "content_lesson_video",
                video.Id,
                null,
                JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, verifiedBy = currentUserId }),
                ct);
        }

        if (video.IsPublished)
        {
            await _auditWriter.WriteStaffAuditAsync(
                "lesson_video_published",
                "content_lesson_video",
                video.Id,
                null,
                JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, publishedBy = currentUserId }),
                ct);
        }

        await _db.SaveChangesAsync(ct);
        return MapToVideoDto(video, les.Title);
    }

    public async Task<ContentLessonVideoItemDto> UpdateLessonVideoAsync(
        string videoId,
        UpdateLessonVideoRequestDto req,
        string currentUserId,
        bool isAuthorizedReviewer,
        CancellationToken ct = default)
    {
        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId, ct);
        if (video == null)
            throw new NotFoundException("Video không tồn tại.");

        string previousVerificationStatus = video.VerificationStatus;
        bool previousIsPublished = video.IsPublished;

        if (!string.IsNullOrWhiteSpace(req.VerificationStatus))
        {
            var st = req.VerificationStatus.Trim().ToLowerInvariant();
            if (st != "pending" && st != "verified" && st != "rejected")
            {
                throw new ValidationException("VerificationStatus", "Trạng thái xác minh không hợp lệ. Chỉ chấp nhận: pending, verified, rejected.");
            }

            if (st != video.VerificationStatus)
            {
                if (!isAuthorizedReviewer)
                {
                    throw new ForbiddenException("Chỉ người kiểm duyệt có thẩm quyền mới có quyền thay đổi trạng thái xác minh video.");
                }
                video.VerificationStatus = st;
                video.VerifiedAt = (st == "verified") ? _clock.UtcNow : null;
            }
        }

        if (req.IsPublished.HasValue && req.IsPublished.Value != video.IsPublished)
        {
            if (!isAuthorizedReviewer)
            {
                throw new ForbiddenException("Chỉ người kiểm duyệt có thẩm quyền mới có quyền thay đổi trạng thái xuất bản video.");
            }
            video.IsPublished = req.IsPublished.Value;
        }

        if (video.IsPublished && video.VerificationStatus != "verified")
        {
            throw new ValidationException("IsPublished", "Không thể xuất bản video chưa được xác minh (VerificationStatus phải là 'verified').");
        }

        if (video.VerificationStatus != "verified" && video.IsPublished)
        {
            video.IsPublished = false;
        }

        if (!string.IsNullOrWhiteSpace(req.Title)) video.Title = req.Title.Trim();
        if (req.Description != null) video.Description = req.Description.Trim();
        if (req.Provider != null) video.Provider = req.Provider;
        if (!string.IsNullOrWhiteSpace(req.SourceUrl))
        {
            var trimmedSource = req.SourceUrl.Trim();
            if (!string.Equals(trimmedSource, video.SourceUrl, StringComparison.OrdinalIgnoreCase))
            {
                if (_videoVerificationService != null)
                {
                    var verifyResult = await _videoVerificationService.VerifyVideoUrlAsync(trimmedSource, ct);
                    if (!verifyResult.IsValid)
                    {
                        throw new ValidationException("SourceUrl", verifyResult.ErrorMessage ?? "URL video không hợp lệ hoặc bị từ chối bởi cơ chế an toàn.");
                    }
                }

                video.SourceUrl = trimmedSource;
                var (_, ytId, embedUrl) = ParseVideoUrl(trimmedSource);
                if (ytId != null) video.YouTubeVideoId = ytId;
                if (embedUrl != null) video.EmbedUrl = embedUrl;

                // When source URL changes, reset verification status and unpublish
                video.VerificationStatus = "pending";
                video.VerifiedAt = null;
                video.LastVerifiedAt = null;
                video.IsPublished = false;
            }
        }
        if (req.EmbedUrl != null) video.EmbedUrl = req.EmbedUrl;
        if (req.YouTubeVideoId != null) video.YouTubeVideoId = req.YouTubeVideoId;
        if (req.ChannelName != null) video.ChannelName = req.ChannelName.Trim();
        if (req.IsPrimary.HasValue) video.IsPrimary = req.IsPrimary.Value;
        if (req.AttributionText != null) video.AttributionText = req.AttributionText.Trim();
        if (req.Language != null) video.Language = req.Language;
        if (req.DurationSeconds.HasValue) video.DurationSeconds = req.DurationSeconds.Value;
        if (req.ThumbnailUrl != null) video.ThumbnailUrl = req.ThumbnailUrl;
        if (req.SortOrder.HasValue) video.SortOrder = req.SortOrder.Value;
        if (req.EmbedAllowed.HasValue) video.EmbedAllowed = req.EmbedAllowed.Value;

        video.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_video_updated",
            "content_lesson_video",
            video.Id,
            null,
            JsonSerializer.Serialize(new { title = video.Title, previousStatus = previousVerificationStatus, currentStatus = video.VerificationStatus }),
            ct);

        if (previousVerificationStatus != "verified" && video.VerificationStatus == "verified")
        {
            await _auditWriter.WriteStaffAuditAsync(
                "lesson_video_verified",
                "content_lesson_video",
                video.Id,
                null,
                JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, verifiedBy = currentUserId }),
                ct);
        }
        else if (previousVerificationStatus != "rejected" && video.VerificationStatus == "rejected")
        {
            await _auditWriter.WriteStaffAuditAsync(
                "lesson_video_rejected",
                "content_lesson_video",
                video.Id,
                null,
                JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, rejectedBy = currentUserId }),
                ct);
        }

        if (!previousIsPublished && video.IsPublished)
        {
            await _auditWriter.WriteStaffAuditAsync(
                "lesson_video_published",
                "content_lesson_video",
                video.Id,
                null,
                JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, publishedBy = currentUserId }),
                ct);
        }
        else if (previousIsPublished && !video.IsPublished)
        {
            await _auditWriter.WriteStaffAuditAsync(
                "lesson_video_unpublished",
                "content_lesson_video",
                video.Id,
                null,
                JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, unpublishedBy = currentUserId }),
                ct);
        }

        await _db.SaveChangesAsync(ct);
        return MapToVideoDto(video, video.Lesson?.Title ?? "");
    }

    public async Task<ContentLessonVideoItemDto> VerifyLessonVideoAsync(string videoId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ người kiểm duyệt có thẩm quyền mới có quyền xác minh video.");

        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId, ct);
        if (video == null)
            throw new NotFoundException("Video không tồn tại.");

        video.VerificationStatus = "verified";
        video.VerifiedAt = _clock.UtcNow;
        video.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_video_verified",
            "content_lesson_video",
            video.Id,
            null,
            JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, verifiedBy = currentUserId }),
            ct);

        await _db.SaveChangesAsync(ct);
        return MapToVideoDto(video, video.Lesson?.Title ?? "");
    }

    public async Task<ContentLessonVideoItemDto> RejectLessonVideoAsync(string videoId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ người kiểm duyệt có thẩm quyền mới có quyền từ chối video.");

        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId, ct);
        if (video == null)
            throw new NotFoundException("Video không tồn tại.");

        bool wasPublished = video.IsPublished;
        video.VerificationStatus = "rejected";
        video.VerifiedAt = null;
        video.IsPublished = false;
        video.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_video_rejected",
            "content_lesson_video",
            video.Id,
            null,
            JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, rejectedBy = currentUserId }),
            ct);

        if (wasPublished)
        {
            await _auditWriter.WriteStaffAuditAsync(
                "lesson_video_unpublished",
                "content_lesson_video",
                video.Id,
                null,
                JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, reason = "rejected" }),
                ct);
        }

        await _db.SaveChangesAsync(ct);
        return MapToVideoDto(video, video.Lesson?.Title ?? "");
    }

    public async Task<ContentLessonVideoItemDto> PublishLessonVideoAsync(string videoId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ người kiểm duyệt có thẩm quyền mới có quyền xuất bản video.");

        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId, ct);
        if (video == null)
            throw new NotFoundException("Video không tồn tại.");

        if (video.VerificationStatus != "verified")
            throw new ValidationException("VerificationStatus", "Không thể xuất bản video chưa được xác minh (VerificationStatus phải là 'verified').");

        video.IsPublished = true;
        video.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_video_published",
            "content_lesson_video",
            video.Id,
            null,
            JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, publishedBy = currentUserId }),
            ct);

        await _db.SaveChangesAsync(ct);
        return MapToVideoDto(video, video.Lesson?.Title ?? "");
    }

    public async Task<ContentLessonVideoItemDto> UnpublishLessonVideoAsync(string videoId, string currentUserId, bool isAuthorizedReviewer, CancellationToken ct = default)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ người kiểm duyệt có thẩm quyền mới có quyền gỡ xuất bản video.");

        var video = await _db.ContentLessonVideos.Include(v => v.Lesson).FirstOrDefaultAsync(v => v.Id == videoId, ct);
        if (video == null)
            throw new NotFoundException("Video không tồn tại.");

        video.IsPublished = false;
        video.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_video_unpublished",
            "content_lesson_video",
            video.Id,
            null,
            JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId, unpublishedBy = currentUserId }),
            ct);

        await _db.SaveChangesAsync(ct);
        return MapToVideoDto(video, video.Lesson?.Title ?? "");
    }

    public async Task<bool> DeleteLessonVideoAsync(string videoId, string currentUserId, CancellationToken ct = default)
    {
        var video = await _db.ContentLessonVideos.FindAsync(new object[] { videoId }, ct);
        if (video == null)
            throw new NotFoundException("Video không tồn tại.");

        _db.ContentLessonVideos.Remove(video);

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_video_deleted",
            "content_lesson_video",
            videoId,
            null,
            JsonSerializer.Serialize(new { title = video.Title, lessonId = video.LessonId }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ReorderVideosAsync(ReorderVideosRequestDto req, string currentUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.LessonId))
            throw new ValidationException("LessonId", "LessonId không được để trống khi sắp xếp video.");

        if (req.VideoIds == null || req.VideoIds.Count == 0)
            throw new ValidationException("VideoIds", "Danh sách videoIds không được rỗng.");

        if (req.VideoIds.Distinct().Count() != req.VideoIds.Count)
            throw new ValidationException("VideoIds", "Danh sách videoIds chứa mã video trùng lặp.");

        var videos = await _db.ContentLessonVideos
            .Where(v => v.LessonId == req.LessonId)
            .ToListAsync(ct);

        if (videos.Count != req.VideoIds.Count)
        {
            throw new ValidationException("VideoIds", $"Số lượng video gửi lên ({req.VideoIds.Count}) không khớp với tổng số video của bài học ({videos.Count}).");
        }

        var map = videos.ToDictionary(v => v.Id);
        foreach (var id in req.VideoIds)
        {
            if (!map.ContainsKey(id))
                throw new ValidationException("VideoIds", $"Mã video '{id}' không thuộc bài học này.");
        }

        for (int i = 0; i < req.VideoIds.Count; i++)
        {
            var v = map[req.VideoIds[i]];
            v.SortOrder = i + 1;
            v.UpdatedAt = _clock.UtcNow;
        }

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_videos_reordered",
            "content_lesson_video",
            req.LessonId,
            null,
            JsonSerializer.Serialize(new { lessonId = req.LessonId, count = req.VideoIds.Count }),
            ct);

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<VideoPreviewResponseDto> PreviewVideoMetadataAsync(VideoPreviewRequestDto req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Url))
            throw new ValidationException("Url", "URL video không được để trống.");

        if (_videoVerificationService != null)
        {
            var res = await _videoVerificationService.VerifyVideoUrlAsync(req.Url, ct);
            if (!res.IsValid)
            {
                throw new ValidationException("Url", res.ErrorMessage ?? "URL video không hợp lệ hoặc bị từ chối bởi cơ chế an toàn SSRF.");
            }
            return res;
        }

        var (provider, ytId, embedUrl) = ParseVideoUrl(req.Url);
        return new VideoPreviewResponseDto
        {
            IsValid = !string.IsNullOrEmpty(ytId),
            Provider = provider ?? "youtube",
            VideoId = ytId,
            Title = !string.IsNullOrEmpty(ytId) ? $"Video {ytId}" : "Video bài giảng",
            EmbedUrl = embedUrl,
            EmbedAllowed = true,
            ThumbnailUrl = ytId != null ? $"https://i.ytimg.com/vi/{ytId}/hqdefault.jpg" : null,
            AttributionText = "Nguồn: YouTube"
        };
    }
}