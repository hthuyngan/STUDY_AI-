using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Models;

namespace StudyAI.Features.Content;

public class LessonResourcesService : ILessonResourcesService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly IIdGenerator _idGenerator;

    public LessonResourcesService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IClock clock,
        IIdGenerator idGenerator)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
        _idGenerator = idGenerator;
    }

    public static LessonResourceItemDto MapToDto(ContentLessonVideo r, string lessonTitle)
    {
        return new LessonResourceItemDto
        {
            Id = r.Id,
            LessonId = r.LessonId,
            LessonTitle = lessonTitle,
            ResourceType = string.IsNullOrWhiteSpace(r.ResourceType) ? LessonResourceTypes.Video : r.ResourceType,
            Status = string.IsNullOrWhiteSpace(r.Status) ? DeriveStatus(r) : r.Status,
            Title = r.Title,
            Description = r.Description ?? string.Empty,
            Provider = r.Provider,
            SourceUrl = r.SourceUrl,
            EmbedUrl = r.EmbedUrl,
            YouTubeVideoId = r.YouTubeVideoId,
            ChannelName = r.ChannelName,
            IsPrimary = r.IsPrimary,
            AttributionText = r.AttributionText,
            SourceName = r.SourceName,
            SourceLicense = r.SourceLicense,
            MimeType = r.MimeType,
            StorageKey = r.StorageKey,
            Checksum = r.Checksum,
            Language = r.Language,
            DurationSeconds = r.DurationSeconds,
            ThumbnailUrl = r.ThumbnailUrl,
            SortOrder = r.SortOrder,
            EmbedAllowed = r.EmbedAllowed,
            VerificationStatus = r.VerificationStatus,
            VerifiedAt = r.VerifiedAt?.ToString("o"),
            LastVerifiedAt = (r.LastVerifiedAt ?? r.VerifiedAt)?.ToString("o"),
            ReviewedBy = r.ReviewedBy,
            ReviewedAt = r.ReviewedAt?.ToString("o"),
            RejectionReason = r.RejectionReason,
            IsPublished = r.IsPublished,
            IsArchived = r.IsArchived,
            ArchivedAt = r.ArchivedAt?.ToString("o"),
            CreatedBy = r.CreatedBy,
            CreatedAt = r.CreatedAt.ToString("o"),
            UpdatedAt = r.UpdatedAt.ToString("o"),
            RowVersion = r.RowVersion is { Length: > 0 } ? Convert.ToBase64String(r.RowVersion) : string.Empty
        };
    }

    private static string DeriveStatus(ContentLessonVideo r)
    {
        if (r.IsArchived) return LessonResourceStatuses.Archived;
        if (r.IsPublished && r.VerificationStatus == "verified") return LessonResourceStatuses.Published;
        if (r.VerificationStatus == "verified") return LessonResourceStatuses.Verified;
        if (r.VerificationStatus == "rejected") return LessonResourceStatuses.Rejected;
        return LessonResourceStatuses.Draft;
    }

    public async Task<object> ListLessonResourcesAsync(string lessonId, bool includeArchived = false, CancellationToken ct = default)
    {
        var lesson = await _db.ContentLessons.AsNoTracking().FirstOrDefaultAsync(l => l.Id == lessonId, ct);
        if (lesson == null)
            throw new NotFoundException("Bài học không tồn tại.");

        var query = _db.ContentLessonVideos
            .AsNoTracking()
            .Where(r => r.LessonId == lessonId);

        if (!includeArchived)
            query = query.Where(r => !r.IsArchived);

        var items = await query
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync(ct);

        var dtos = items.Select(r => MapToDto(r, lesson.Title)).ToList();
        return new { items = dtos, total = dtos.Count };
    }

    public async Task<LessonResourceItemDto> AddLessonResourceAsync(
        string lessonId,
        CreateLessonResourceRequestDto req,
        string currentUserId,
        CancellationToken ct = default)
    {
        var lesson = await _db.ContentLessons.FirstOrDefaultAsync(l => l.Id == lessonId, ct);
        if (lesson == null)
            throw new NotFoundException("Bài học không tồn tại.");

        if (string.IsNullOrWhiteSpace(req.Title))
            throw new ValidationException("Title", "Tiêu đề tài nguyên không được để trống.");

        var validated = LessonResourceValidator.ValidateAndNormalize(
            req.ResourceType,
            req.SourceUrl,
            req.Provider,
            req.EmbedUrl,
            req.YouTubeVideoId,
            req.ThumbnailUrl,
            req.MimeType,
            req.StorageKey,
            req.EmbedAllowed);

        var nextOrder = req.SortOrder > 0
            ? req.SortOrder
            : (await _db.ContentLessonVideos
                .Where(r => r.LessonId == lessonId && !r.IsArchived)
                .Select(r => (int?)r.SortOrder)
                .MaxAsync(ct) ?? 0) + 1;

        var now = _clock.UtcNow;
        var entity = new ContentLessonVideo
        {
            Id = _idGenerator.NewId("res"),
            LessonId = lessonId,
            ResourceType = validated.ResourceType,
            Status = LessonResourceStatuses.Draft,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            Provider = validated.Provider,
            SourceUrl = validated.NormalizedUrl,
            EmbedUrl = validated.EmbedUrl,
            YouTubeVideoId = validated.YouTubeVideoId,
            ChannelName = req.ChannelName?.Trim(),
            IsPrimary = req.IsPrimary,
            AttributionText = req.AttributionText?.Trim(),
            SourceName = req.SourceName?.Trim(),
            SourceLicense = req.SourceLicense?.Trim(),
            MimeType = req.MimeType?.Trim(),
            StorageKey = req.StorageKey?.Trim(),
            Checksum = req.Checksum?.Trim(),
            Language = string.IsNullOrWhiteSpace(req.Language) ? "vi" : req.Language.Trim(),
            DurationSeconds = Math.Max(0, req.DurationSeconds),
            ThumbnailUrl = validated.ThumbnailUrl,
            SortOrder = nextOrder,
            EmbedAllowed = validated.EmbedAllowed,
            VerificationStatus = "pending",
            IsPublished = false,
            IsArchived = false,
            CreatedBy = currentUserId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ContentLessonVideos.Add(entity);

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_resource_created",
            "lesson_resource",
            entity.Id,
            null,
            JsonSerializer.Serialize(new
            {
                lessonId = entity.LessonId,
                resourceType = entity.ResourceType,
                title = entity.Title,
                status = entity.Status,
                actor = currentUserId
            }),
            ct);

        await SaveChangesMappingConflictsAsync(ct);
        return MapToDto(entity, lesson.Title);
    }

    public async Task<LessonResourceItemDto> UpdateLessonResourceAsync(
        string resourceId,
        UpdateLessonResourceRequestDto req,
        string currentUserId,
        CancellationToken ct = default)
    {
        var entity = await _db.ContentLessonVideos
            .Include(r => r.Lesson)
            .FirstOrDefaultAsync(r => r.Id == resourceId, ct);

        if (entity == null)
            throw new NotFoundException("Tài nguyên bài học không tồn tại.");

        VerifyRowVersion(entity, req.RowVersion);

        if (entity.IsArchived)
            throw new ConflictException("Không thể chỉnh sửa tài nguyên đã lưu trữ.");

        if (entity.IsPublished)
            throw new ConflictException("Không thể chỉnh sửa tài nguyên đang xuất bản. Vui lòng gỡ xuất bản trước.");

        var beforeState = new
        {
            entity.ResourceType,
            entity.Title,
            entity.SourceUrl,
            entity.Status,
            entity.VerificationStatus
        };

        var targetType = !string.IsNullOrWhiteSpace(req.ResourceType)
            ? LessonResourceValidator.NormalizeResourceType(req.ResourceType)
            : entity.ResourceType;

        var targetUrl = req.SourceUrl != null ? req.SourceUrl.Trim() : entity.SourceUrl;
        var urlOrTypeChanged = !string.Equals(targetType, entity.ResourceType, StringComparison.OrdinalIgnoreCase) ||
                               !string.Equals(targetUrl, entity.SourceUrl, StringComparison.OrdinalIgnoreCase);

        if (urlOrTypeChanged || req.ThumbnailUrl != null || req.MimeType != null || req.StorageKey != null)
        {
            var validated = LessonResourceValidator.ValidateAndNormalize(
                targetType,
                targetUrl,
                req.Provider ?? entity.Provider,
                req.EmbedUrl ?? entity.EmbedUrl,
                req.YouTubeVideoId ?? entity.YouTubeVideoId,
                req.ThumbnailUrl ?? entity.ThumbnailUrl,
                req.MimeType ?? entity.MimeType,
                req.StorageKey ?? entity.StorageKey,
                req.EmbedAllowed ?? entity.EmbedAllowed);

            entity.ResourceType = validated.ResourceType;
            entity.Provider = validated.Provider;
            entity.SourceUrl = validated.NormalizedUrl;
            entity.EmbedUrl = validated.EmbedUrl;
            entity.YouTubeVideoId = validated.YouTubeVideoId;
            entity.ThumbnailUrl = validated.ThumbnailUrl;
            entity.EmbedAllowed = validated.EmbedAllowed;
        }

        if (urlOrTypeChanged)
        {
            entity.VerificationStatus = "pending";
            entity.Status = LessonResourceStatuses.Draft;
            entity.VerifiedAt = null;
            entity.LastVerifiedAt = null;
            entity.IsPublished = false;
        }

        if (!string.IsNullOrWhiteSpace(req.Title)) entity.Title = req.Title.Trim();
        if (req.Description != null) entity.Description = req.Description.Trim();
        if (req.ChannelName != null) entity.ChannelName = req.ChannelName.Trim();
        if (req.IsPrimary.HasValue) entity.IsPrimary = req.IsPrimary.Value;
        if (req.AttributionText != null) entity.AttributionText = req.AttributionText.Trim();
        if (req.SourceName != null) entity.SourceName = req.SourceName.Trim();
        if (req.SourceLicense != null) entity.SourceLicense = req.SourceLicense.Trim();
        if (req.MimeType != null) entity.MimeType = req.MimeType.Trim();
        if (req.StorageKey != null) entity.StorageKey = req.StorageKey.Trim();
        if (req.Checksum != null) entity.Checksum = req.Checksum.Trim();
        if (!string.IsNullOrWhiteSpace(req.Language)) entity.Language = req.Language.Trim();
        if (req.DurationSeconds.HasValue) entity.DurationSeconds = Math.Max(0, req.DurationSeconds.Value);
        if (req.SortOrder.HasValue && req.SortOrder.Value > 0) entity.SortOrder = req.SortOrder.Value;

        entity.UpdatedAt = _clock.UtcNow;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_resource_updated",
            "lesson_resource",
            entity.Id,
            JsonSerializer.Serialize(beforeState),
            JsonSerializer.Serialize(new
            {
                entity.LessonId,
                entity.ResourceType,
                entity.Title,
                entity.SourceUrl,
                entity.Status,
                entity.VerificationStatus,
                actor = currentUserId
            }),
            ct);

        await SaveChangesMappingConflictsAsync(ct);
        return MapToDto(entity, entity.Lesson?.Title ?? string.Empty);
    }

    public async Task<IReadOnlyList<LessonResourceItemDto>> ReorderLessonResourcesAsync(
        ReorderLessonResourcesRequestDto req,
        string currentUserId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.LessonId))
            throw new ValidationException("LessonId", "LessonId không được để trống khi sắp xếp tài nguyên.");

        var orderedIds = req.Items is { Count: > 0 }
            ? req.Items.Select(i => i.ResourceId).ToList()
            : req.ResourceIds;

        if (orderedIds == null || orderedIds.Count == 0)
            throw new ValidationException("ResourceIds", "Danh sách tài nguyên không được rỗng.");

        if (orderedIds.Distinct(StringComparer.Ordinal).Count() != orderedIds.Count)
            throw new ValidationException("ResourceIds", "Danh sách tài nguyên chứa mã trùng lặp.");

        var lesson = await _db.ContentLessons.AsNoTracking().FirstOrDefaultAsync(l => l.Id == req.LessonId, ct);
        if (lesson == null)
            throw new NotFoundException("Bài học không tồn tại.");

        var resources = await _db.ContentLessonVideos
            .Where(r => r.LessonId == req.LessonId && !r.IsArchived)
            .ToListAsync(ct);

        if (resources.Count != orderedIds.Count)
            throw new ValidationException("ResourceIds", $"Số lượng tài nguyên gửi lên ({orderedIds.Count}) không khớp với số tài nguyên hiện có ({resources.Count}).");

        var map = resources.ToDictionary(r => r.Id);
        foreach (var id in orderedIds)
        {
            if (!map.ContainsKey(id))
                throw new ValidationException("ResourceIds", $"Tài nguyên '{id}' không thuộc bài học này.");
        }

        if (req.Items is { Count: > 0 })
        {
            foreach (var item in req.Items)
            {
                VerifyRowVersion(map[item.ResourceId], item.RowVersion);
            }
        }

        var now = _clock.UtcNow;
        for (int i = 0; i < orderedIds.Count; i++)
        {
            var r = map[orderedIds[i]];
            r.SortOrder = i + 1;
            r.UpdatedAt = now;
        }

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_resources_reordered",
            "lesson_resource",
            req.LessonId,
            null,
            JsonSerializer.Serialize(new { lessonId = req.LessonId, orderedIds, actor = currentUserId }),
            ct);

        await SaveChangesMappingConflictsAsync(ct);
        return orderedIds.Select(id => MapToDto(map[id], lesson.Title)).ToList();
    }

    public async Task<LessonResourceItemDto> ArchiveLessonResourceAsync(
        string resourceId,
        LessonResourceActionRequestDto req,
        string currentUserId,
        CancellationToken ct = default)
    {
        var entity = await _db.ContentLessonVideos
            .Include(r => r.Lesson)
            .FirstOrDefaultAsync(r => r.Id == resourceId, ct);

        if (entity == null)
            throw new NotFoundException("Tài nguyên bài học không tồn tại.");

        VerifyRowVersion(entity, req.RowVersion);

        if (entity.IsPublished)
            throw new ConflictException("Không thể lưu trữ tài nguyên đang xuất bản. Vui lòng gỡ xuất bản trước.");

        if (entity.IsArchived)
            return MapToDto(entity, entity.Lesson?.Title ?? string.Empty);

        var now = _clock.UtcNow;
        var previousStatus = entity.Status;
        entity.IsArchived = true;
        entity.Status = LessonResourceStatuses.Archived;
        entity.ArchivedAt = now;
        entity.ArchivedBy = currentUserId;
        entity.UpdatedAt = now;

        await _auditWriter.WriteStaffAuditAsync(
            "lesson_resource_archived",
            "lesson_resource",
            entity.Id,
            JsonSerializer.Serialize(new { status = previousStatus, isArchived = false }),
            JsonSerializer.Serialize(new { entity.LessonId, status = entity.Status, isArchived = true, reason = req.Reason, actor = currentUserId }),
            ct);

        await SaveChangesMappingConflictsAsync(ct);
        return MapToDto(entity, entity.Lesson?.Title ?? string.Empty);
    }

    public Task<LessonResourceItemDto> VerifyLessonResourceAsync(
        string resourceId,
        LessonResourceActionRequestDto req,
        string currentUserId,
        bool isAuthorizedReviewer,
        CancellationToken ct = default)
        => TransitionWorkflowAsync(resourceId, req, currentUserId, isAuthorizedReviewer, "verify", ct);

    public Task<LessonResourceItemDto> RejectLessonResourceAsync(
        string resourceId,
        LessonResourceActionRequestDto req,
        string currentUserId,
        bool isAuthorizedReviewer,
        CancellationToken ct = default)
        => TransitionWorkflowAsync(resourceId, req, currentUserId, isAuthorizedReviewer, "reject", ct);

    public Task<LessonResourceItemDto> PublishLessonResourceAsync(
        string resourceId,
        LessonResourceActionRequestDto req,
        string currentUserId,
        bool isAuthorizedReviewer,
        CancellationToken ct = default)
        => TransitionWorkflowAsync(resourceId, req, currentUserId, isAuthorizedReviewer, "publish", ct);

    public Task<LessonResourceItemDto> UnpublishLessonResourceAsync(
        string resourceId,
        LessonResourceActionRequestDto req,
        string currentUserId,
        bool isAuthorizedReviewer,
        CancellationToken ct = default)
        => TransitionWorkflowAsync(resourceId, req, currentUserId, isAuthorizedReviewer, "unpublish", ct);

    private async Task<LessonResourceItemDto> TransitionWorkflowAsync(
        string resourceId,
        LessonResourceActionRequestDto req,
        string currentUserId,
        bool isAuthorizedReviewer,
        string action,
        CancellationToken ct)
    {
        if (!isAuthorizedReviewer)
            throw new ForbiddenException("Chỉ người kiểm duyệt có thẩm quyền mới có quyền thực hiện thao tác kiểm duyệt/xuất bản.");

        var entity = await _db.ContentLessonVideos
            .Include(r => r.Lesson)
            .FirstOrDefaultAsync(r => r.Id == resourceId, ct);

        if (entity == null)
            throw new NotFoundException("Tài nguyên bài học không tồn tại.");

        VerifyRowVersion(entity, req.RowVersion);

        if (entity.IsArchived)
            throw new ConflictException("Không thể thay đổi trạng thái tài nguyên đã lưu trữ.");

        var before = new
        {
            entity.Status,
            entity.VerificationStatus,
            entity.IsPublished
        };

        var now = _clock.UtcNow;
        string auditAction;

        switch (action)
        {
            case "verify":
                // Re-validate URL safety before marking verified
                LessonResourceValidator.ValidateAndNormalize(
                    entity.ResourceType,
                    entity.SourceUrl,
                    entity.Provider,
                    entity.EmbedUrl,
                    entity.YouTubeVideoId,
                    entity.ThumbnailUrl,
                    entity.MimeType,
                    entity.StorageKey,
                    entity.EmbedAllowed,
                    resolveDns: false);
                entity.VerificationStatus = "verified";
                entity.Status = entity.IsPublished ? LessonResourceStatuses.Published : LessonResourceStatuses.Verified;
                entity.VerifiedAt = now;
                entity.LastVerifiedAt = now;
                entity.ReviewedBy = currentUserId;
                entity.ReviewedAt = now;
                entity.RejectionReason = null;
                auditAction = "lesson_resource_verified";
                break;

            case "reject":
                entity.VerificationStatus = "rejected";
                entity.Status = LessonResourceStatuses.Rejected;
                entity.VerifiedAt = null;
                entity.IsPublished = false;
                entity.ReviewedBy = currentUserId;
                entity.ReviewedAt = now;
                entity.RejectionReason = req.Reason?.Trim();
                auditAction = "lesson_resource_rejected";
                break;

            case "publish":
                if (entity.VerificationStatus != "verified")
                    throw new ValidationException("VerificationStatus", "Chỉ có thể xuất bản tài nguyên đã được xác minh.");
                entity.IsPublished = true;
                entity.Status = LessonResourceStatuses.Published;
                auditAction = "lesson_resource_published";
                break;

            case "unpublish":
                entity.IsPublished = false;
                entity.Status = entity.VerificationStatus == "verified"
                    ? LessonResourceStatuses.Verified
                    : LessonResourceStatuses.Draft;
                auditAction = "lesson_resource_unpublished";
                break;

            default:
                throw new InvalidOperationException($"Unsupported workflow action '{action}'.");
        }

        entity.UpdatedAt = now;

        await _auditWriter.WriteStaffAuditAsync(
            auditAction,
            "lesson_resource",
            entity.Id,
            JsonSerializer.Serialize(before),
            JsonSerializer.Serialize(new
            {
                entity.LessonId,
                entity.Status,
                entity.VerificationStatus,
                entity.IsPublished,
                reason = req.Reason,
                actor = currentUserId
            }),
            ct);

        await SaveChangesMappingConflictsAsync(ct);
        return MapToDto(entity, entity.Lesson?.Title ?? string.Empty);
    }

    private static void VerifyRowVersion(ContentLessonVideo entity, string? rowVersionBase64)
    {
        if (string.IsNullOrWhiteSpace(rowVersionBase64))
            throw new ConflictException("Thiếu RowVersion để kiểm tra xung đột đồng thời.");

        byte[] clientVersion;
        try
        {
            clientVersion = Convert.FromBase64String(rowVersionBase64.Trim());
        }
        catch (FormatException)
        {
            throw new ValidationException("RowVersion", "RowVersion không đúng định dạng Base64.");
        }

        if (entity.RowVersion.Length == 0 || !entity.RowVersion.SequenceEqual(clientVersion))
            throw new ConflictException("Tài nguyên đã được cập nhật bởi phiên khác (xung đột RowVersion). Vui lòng tải lại.");
    }

    private async Task SaveChangesMappingConflictsAsync(CancellationToken ct)
    {
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Xung đột đồng thời khi lưu tài nguyên (RowVersion). Vui lòng tải lại.");
        }
    }
}
