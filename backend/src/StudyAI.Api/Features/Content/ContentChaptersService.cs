using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Content;

public class ContentChaptersService(IApplicationDbContext db, IAuditWriter audit, IClock clock, IIdGenerator ids) : IContentChaptersService
{
    private static readonly string[] AllStatuses = ["draft", "in-review", "changes-requested", "approved", "published", "archived"];

    public async Task<ContentChapterListResponseDto> ListChaptersAsync(string? subjectId = null, string? curriculumEditionId = null,
        string? status = null, string? search = null, string sort = "orderIndex", string direction = "asc",
        int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        page = Math.Max(page, 1); pageSize = Math.Clamp(pageSize, 1, 100);
        var q = Query().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all") q = q.Where(x => x.SubjectId == subjectId || x.CurriculumEdition!.Curriculum!.SubjectId == subjectId);
        if (!string.IsNullOrWhiteSpace(curriculumEditionId) && curriculumEditionId != "all") q = q.Where(x => x.CurriculumEditionId == curriculumEditionId);
        if (!string.IsNullOrWhiteSpace(status) && status != "all") q = q.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(search)) { var term = search.Trim(); q = q.Where(x => x.Title.Contains(term) || (x.Code != null && x.Code.Contains(term))); }
        var total = await q.CountAsync(ct); var desc = direction.Equals("desc", StringComparison.OrdinalIgnoreCase);
        IOrderedQueryable<Models.ContentChapter> ordered = sort.ToLowerInvariant() switch
        {
            "title" => desc ? q.OrderByDescending(x => x.Title) : q.OrderBy(x => x.Title),
            "status" => desc ? q.OrderByDescending(x => x.Status) : q.OrderBy(x => x.Status),
            "updatedat" => desc ? q.OrderByDescending(x => x.UpdatedAt) : q.OrderBy(x => x.UpdatedAt),
            _ => desc ? q.OrderByDescending(x => x.OrderIndex) : q.OrderBy(x => x.OrderIndex)
        };
        var rows = await ordered.ThenBy(x => x.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new() { Items = rows.Select(Map).ToList(), Page = page, PageSize = pageSize, Total = total };
    }

    public async Task<ContentChapterItemDto> GetChapterDetailAsync(string id, CancellationToken ct = default)
        => Map(await Query().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Chương học không tồn tại."));

    public async Task<ContentChapterItemDto> CreateChapterAsync(CreateChapterRequestDto req, string actor, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Title)) throw new ValidationException("Title", "Tiêu đề chương không được để trống.");
        Models.CurriculumEdition? edition = null; Models.ContentSubject? legacySubject = null;
        if (!string.IsNullOrWhiteSpace(req.CurriculumEditionId))
        {
            edition = await db.CurriculumEditions.Include(x => x.Curriculum).FirstOrDefaultAsync(x => x.Id == req.CurriculumEditionId, ct)
                ?? throw new ValidationException("CurriculumEditionId", "Phiên bản giáo trình không tồn tại.");
            if (edition.Status == "archived" || edition.Curriculum?.Status == "archived") throw new ValidationException("CurriculumEditionId", "Giáo trình đã lưu trữ.");
            if (string.IsNullOrWhiteSpace(req.Code)) throw new ValidationException("Code", "Mã chương là bắt buộc.");
        }
        else if (!string.IsNullOrWhiteSpace(req.SubjectId))
            legacySubject = await db.ContentSubjects.FindAsync([req.SubjectId], ct) ?? throw new ValidationException("SubjectId", "Môn học legacy không tồn tại.");
        else throw new ValidationException("CurriculumEditionId", "Phải chọn phiên bản giáo trình.");
        var code = Code(req.Code);
        if (edition != null && await db.ContentChapters.AnyAsync(x => x.CurriculumEditionId == edition.Id && x.Code == code && x.Status != "archived", ct)) throw new ConflictException("Mã chương đã tồn tại.");
        var now = clock.UtcNow;
        var e = new Models.ContentChapter { Id = ids.NewId("chp"), SubjectId = legacySubject?.Id, CurriculumEditionId = edition?.Id, Code = code,
            Title = req.Title.Trim(), Description = req.Description?.Trim(), OrderIndex = req.OrderIndex, IsActive = req.IsActive,
            Status = edition == null ? "published" : "draft", SourceName = req.SourceName?.Trim(), SourceUrl = req.SourceUrl?.Trim(), CreatedAt = now, UpdatedAt = now };
        db.ContentChapters.Add(e);
        await SaveWithAuditAsync(() => WriteAudit("chapter_created", e, actor, null, ct), ct);
        e.Subject = legacySubject; e.CurriculumEdition = edition; return Map(e);
    }

    public async Task<ContentChapterItemDto> UpdateChapterAsync(string id, UpdateChapterRequestDto req, string actor, CancellationToken ct = default)
    {
        var e = await Query().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Chương học không tồn tại."); CheckVersion(e, req.RowVersion);
        if (!string.IsNullOrWhiteSpace(req.Title)) e.Title = req.Title.Trim();
        if (req.Code != null) { var code = Code(req.Code); if (e.CurriculumEditionId != null && code == null) throw new ValidationException("Code", "Mã chương là bắt buộc.");
            if (e.CurriculumEditionId != null && await db.ContentChapters.AnyAsync(x => x.Id != e.Id && x.CurriculumEditionId == e.CurriculumEditionId && x.Code == code && x.Status != "archived", ct)) throw new ConflictException("Mã chương đã tồn tại."); e.Code = code; }
        if (req.Description != null) e.Description = req.Description.Trim(); if (req.OrderIndex.HasValue) e.OrderIndex = req.OrderIndex.Value;
        if (req.IsActive.HasValue) e.IsActive = req.IsActive.Value; if (req.SourceName != null) e.SourceName = req.SourceName.Trim(); if (req.SourceUrl != null) e.SourceUrl = req.SourceUrl.Trim();
        e.UpdatedAt = clock.UtcNow; await SaveWithAuditAsync(() => WriteAudit("chapter_updated", e, actor, null, ct), ct); return Map(e);
    }

    public Task<ContentChapterItemDto> SubmitReviewAsync(string id, ContentStatusActionDto? a, string actor, CancellationToken ct = default) => Transition(id, a, actor, ["draft", "changes-requested"], "in-review", false, ct);
    public Task<ContentChapterItemDto> ApproveAsync(string id, ContentStatusActionDto? a, string actor, CancellationToken ct = default) => Transition(id, a, actor, ["in-review"], "approved", true, ct);
    public Task<ContentChapterItemDto> PublishAsync(string id, ContentStatusActionDto? a, string actor, CancellationToken ct = default) => Transition(id, a, actor, ["approved"], "published", true, ct);
    public Task<ContentChapterItemDto> UnpublishAsync(string id, ContentStatusActionDto? a, string actor, CancellationToken ct = default) => Transition(id, a, actor, ["published"], "approved", false, ct);
    public Task<ContentChapterItemDto> RequestChangesAsync(string id, ContentStatusActionDto? a, string actor, CancellationToken ct = default) => Transition(id, a, actor, ["in-review", "approved", "published"], "changes-requested", true, ct);
    public Task<ContentChapterItemDto> ArchiveAsync(string id, ContentStatusActionDto? a, string actor, CancellationToken ct = default) => Transition(id, a, actor, AllStatuses.Where(x => x != "archived").ToArray(), "archived", false, ct);
    public Task<ContentChapterItemDto> ReactivateAsync(string id, ContentStatusActionDto? a, string actor, CancellationToken ct = default) => Transition(id, a, actor, ["archived"], "draft", false, ct);

    private async Task<ContentChapterItemDto> Transition(string id, ContentStatusActionDto? a, string actor, string[] from, string to, bool reviewer, CancellationToken ct)
    {
        var e = await Query().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Chương học không tồn tại."); CheckVersion(e, a?.RowVersion);
        if (!from.Contains(e.Status)) throw new ValidationException("Status", $"Không thể chuyển từ '{e.Status}' sang '{to}'.");
        if (reviewer) { var author = await db.StaffAuditLogs.AsNoTracking().Where(x => x.TargetId == id && (x.Action == "chapter_created" || x.Action == "chapter_updated" || x.Action == "chapter_submitted")).OrderByDescending(x => x.CreatedAt).Select(x => x.ActorUserId).FirstOrDefaultAsync(ct); if (author == actor) throw new ForbiddenException("Quy tắc four-eyes: người biên soạn không được tự kiểm duyệt."); }
        if (to == "published" && e.CurriculumEditionId != null && (e.CurriculumEdition?.Status != "published" || e.CurriculumEdition.Curriculum?.Status != "published")) throw new ValidationException("CurriculumEditionId", "Giáo trình và phiên bản phải được xuất bản trước chương.");
        if (to == "draft" && e.CurriculumEditionId != null && !string.IsNullOrWhiteSpace(e.Code) && await db.ContentChapters.AnyAsync(x => x.Id != e.Id && x.CurriculumEditionId == e.CurriculumEditionId && x.Code == e.Code && x.Status != "archived", ct)) throw new ConflictException("Mã chương đã tồn tại trong cùng phiên bản giáo trình.");
        e.Status = to; e.IsActive = to != "archived"; e.UpdatedAt = clock.UtcNow; await SaveWithAuditAsync(() => WriteAudit($"chapter_{to.Replace('-', '_')}", e, actor, a?.Reason, ct), ct); return Map(e);
    }

    public async Task<bool> ReorderChaptersAsync(ReorderChaptersRequestDto req, string actor, CancellationToken ct = default)
    {
        if (req.ChapterIds.Count == 0 || req.ChapterIds.Distinct().Count() != req.ChapterIds.Count) throw new ValidationException("ChapterIds", "Danh sách chương không hợp lệ.");
        var q = db.ContentChapters.Where(x => x.Status != "archived"); q = !string.IsNullOrWhiteSpace(req.CurriculumEditionId) ? q.Where(x => x.CurriculumEditionId == req.CurriculumEditionId) : q.Where(x => x.SubjectId == req.SubjectId);
        var rows = await q.ToListAsync(ct); if (rows.Count != req.ChapterIds.Count || rows.Any(x => !req.ChapterIds.Contains(x.Id))) throw new ValidationException("ChapterIds", "Phải gửi đúng toàn bộ chương trong cùng phạm vi.");
        if (req.RowVersions is { Count: > 0 })
        {
            foreach (var r in rows) { if (!req.RowVersions.TryGetValue(r.Id, out var rv)) throw new ValidationException("RowVersion", $"Thiếu RowVersion cho chương '{r.Id}'."); CheckVersion(r, rv); }
        }
        else if (!string.IsNullOrWhiteSpace(req.RowVersion))
        {
            CheckVersion(rows.Single(x => x.Id == req.ChapterIds[0]), req.RowVersion);
        }
        else if (rows.Any(x => x.CurriculumEditionId != null))
        {
            throw new ValidationException("RowVersion", "Thiếu RowVersion khi sắp xếp chương.");
        }
        for (var i = 0; i < req.ChapterIds.Count; i++) { var e = rows.Single(x => x.Id == req.ChapterIds[i]); e.OrderIndex = i + 1; e.UpdatedAt = clock.UtcNow; }
        await audit.WriteStaffAuditAsync("chapters_reordered", "content_chapter", req.CurriculumEditionId ?? req.SubjectId, null, JsonSerializer.Serialize(new { actor, req.ChapterIds }), ct); await Save(ct); return true;
    }

    public async Task<bool> DeleteChapterAsync(string id, string actor, CancellationToken ct = default)
    {
        var e = await db.ContentChapters.Include(x => x.Lessons).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Chương học không tồn tại.");
        if (e.CurriculumEditionId != null) throw new ValidationException("Chapter", "Chương giáo trình chỉ được lưu trữ, không xóa vật lý.");
        if (e.Lessons.Count > 0) throw new ValidationException("Chapter", "Không thể xóa chương đang có bài học."); db.ContentChapters.Remove(e); await WriteAudit("chapter_deleted", e, actor, null, ct); await db.SaveChangesAsync(ct); return true;
    }

    private IQueryable<Models.ContentChapter> Query() => db.ContentChapters.Include(x => x.Subject).Include(x => x.CurriculumEdition).ThenInclude(x => x!.Curriculum).ThenInclude(x => x!.Subject).Include(x => x.Lessons);
    private static string? Code(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim().ToUpperInvariant();
    private static string Version(byte[]? b) => b is { Length: > 0 } ? Convert.ToBase64String(b) : "";
    private static ContentChapterItemDto Map(Models.ContentChapter x) => new() { Id = x.Id, SubjectId = x.SubjectId ?? x.CurriculumEdition?.Curriculum?.SubjectId, SubjectName = x.Subject?.Name ?? x.CurriculumEdition?.Curriculum?.Subject?.Name ?? "", CurriculumEditionId = x.CurriculumEditionId, CurriculumEditionName = x.CurriculumEdition?.EditionName, Code = x.Code, Title = x.Title, Description = x.Description ?? "", OrderIndex = x.OrderIndex, IsActive = x.IsActive, Status = x.Status, SourceName = x.SourceName, SourceUrl = x.SourceUrl, LessonCount = x.Lessons.Count, CreatedAt = x.CreatedAt.ToString("o"), UpdatedAt = x.UpdatedAt.ToString("o"), RowVersion = Version(x.RowVersion) };
    private void CheckVersion(Models.ContentChapter e, string? expected) { if ((e.RowVersion.Length == 0 || e.CurriculumEditionId == null) && string.IsNullOrWhiteSpace(expected)) return; if (string.IsNullOrWhiteSpace(expected)) throw new ValidationException("RowVersion", "Thiếu RowVersion."); byte[] b; try { b = Convert.FromBase64String(expected); } catch { throw new ValidationException("RowVersion", "RowVersion không đúng Base64."); } if (!e.RowVersion.SequenceEqual(b)) throw new ConflictException("Dữ liệu đã được thay đổi bởi người dùng khác."); db.Entry(e).Property(nameof(e.RowVersion)).OriginalValue = b; }
    private async Task SaveWithAuditAsync(Func<Task> writeAudit, CancellationToken ct)
    {
        try
        {
            await writeAudit();
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException) { throw new ConflictException("Dữ liệu đã được thay đổi bởi người dùng khác."); }
        catch (DbUpdateException ex) when (
            (ex.GetBaseException() is Microsoft.Data.SqlClient.SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627)) ||
            (ex.GetBaseException().Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) ||
             ex.GetBaseException().Message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase)))
        {
            throw new ConflictException("Mã chương đã tồn tại trong cùng phiên bản giáo trình.");
        }
    }

    private async Task Save(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { throw new ConflictException("Dữ liệu đã được thay đổi bởi người dùng khác."); }
        catch (DbUpdateException ex) when (
            (ex.GetBaseException() is Microsoft.Data.SqlClient.SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627)) ||
            (ex.GetBaseException().Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) ||
             ex.GetBaseException().Message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase)))
        {
            throw new ConflictException("Mã chương đã tồn tại trong cùng phiên bản giáo trình.");
        }
    }
    private Task WriteAudit(string action, Models.ContentChapter e, string actor, string? reason, CancellationToken ct) => audit.WriteStaffAuditAsync(action, "content_chapter", e.Id, null, JsonSerializer.Serialize(new { actorUserId = actor, e.Title, e.Code, e.CurriculumEditionId, reason }), ct);
}
