using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Exceptions;
using StudyAI.Common.Utilities;
using StudyAI.Data;
using StudyAI.Models;

namespace StudyAI.Features.Content;

public class ContentCatalogService : IContentCatalogService
{
    private const int MinAcademicYear = 1990;
    private const int MaxAcademicYear = 2100;

    private static readonly HashSet<string> CanonicalStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "draft", "in-review", "approved", "published", "archived", "changes-requested"
    };

    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public ContentCatalogService(IApplicationDbContext db, IAuditWriter auditWriter, IClock clock)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    // ─── Shared Helpers ──────────────────────────────────────────────────────

    private static (int Page, int PageSize, bool Desc) NormalizePaging(CatalogListQueryDto q)
    {
        var page = q.Page < 1 ? 1 : q.Page;
        var pageSize = q.PageSize < 1 ? 20 : (q.PageSize > 100 ? 100 : q.PageSize);
        var desc = string.Equals(q.Direction, "desc", StringComparison.OrdinalIgnoreCase);
        return (page, pageSize, desc);
    }

    private static string NormalizeCode(string? raw, string fieldName = "Code")
    {
        if (string.IsNullOrWhiteSpace(raw))
            throw new ValidationException(fieldName, $"{fieldName} không được để trống.");

        var normalized = raw.Trim().ToUpperInvariant();
        if (normalized.Contains(' '))
            throw new ValidationException(fieldName, $"{fieldName} không được chứa khoảng trắng.");

        return normalized;
    }

    private static string RequireText(string? raw, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(raw))
            throw new ValidationException(fieldName, $"{fieldName} không được để trống.");
        return raw.Trim();
    }

    private static string? NormalizeOptional(string? raw)
    {
        return string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();
    }

    private static string? NormalizeStatusFilter(string? status)
    {
        if (string.IsNullOrWhiteSpace(status) || string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
            return null;

        var s = status.Trim().ToLowerInvariant();
        if (!CanonicalStatuses.Contains(s))
            throw new ValidationException("Status", $"Trạng thái '{status}' không hợp lệ.");
        return s;
    }

    private static void ValidateAcademicYears(int? from, int? to)
    {
        if (from.HasValue && (from.Value < MinAcademicYear || from.Value > MaxAcademicYear))
            throw new ValidationException("AcademicYearFrom", $"Năm học bắt đầu phải nằm trong khoảng {MinAcademicYear}–{MaxAcademicYear}.");

        if (to.HasValue && (to.Value < MinAcademicYear || to.Value > MaxAcademicYear))
            throw new ValidationException("AcademicYearTo", $"Năm học kết thúc phải nằm trong khoảng {MinAcademicYear}–{MaxAcademicYear}.");

        if (from.HasValue && to.HasValue && to.Value < from.Value)
            throw new ValidationException("AcademicYearTo", "Năm học kết thúc phải lớn hơn hoặc bằng năm học bắt đầu.");
    }

    private static void ValidatePublicationYear(int? year)
    {
        if (year.HasValue && (year.Value < MinAcademicYear || year.Value > MaxAcademicYear))
            throw new ValidationException("PublicationYear", $"Năm xuất bản phải nằm trong khoảng {MinAcademicYear}–{MaxAcademicYear}.");
    }

    private static void ValidateOptionalUrl(string? url, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(url)) return;
        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var parsed) ||
            (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
        {
            throw new ValidationException(fieldName, $"{fieldName} phải là URL http:// hoặc https:// hợp lệ.");
        }
    }

    private static string EncodeRowVersion(byte[]? rowVersion)
    {
        return rowVersion == null || rowVersion.Length == 0
            ? string.Empty
            : Convert.ToBase64String(rowVersion);
    }

    private void ApplyExpectedRowVersion<TEntity>(TEntity entity, byte[] actualRowVersion, string? expectedBase64)
        where TEntity : class
    {
        if (string.IsNullOrWhiteSpace(expectedBase64))
            throw new ValidationException("RowVersion", "Thiếu mã phiên bản đồng thời (RowVersion).");

        byte[] expectedBytes;
        try
        {
            expectedBytes = Convert.FromBase64String(expectedBase64.Trim());
        }
        catch (FormatException)
        {
            throw new ValidationException("RowVersion", "RowVersion không đúng định dạng Base64.");
        }

        if (!actualRowVersion.SequenceEqual(expectedBytes))
            throw new ConflictException("Dữ liệu đã được cập nhật bởi người dùng khác. Vui lòng tải lại trước khi lưu.");

        _db.Entry(entity).Property("RowVersion").OriginalValue = expectedBytes;
    }

    private async Task SaveChangesWithConflictGuardAsync(string duplicateMessage, CancellationToken ct)
    {
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Dữ liệu đã được cập nhật bởi người dùng khác. Vui lòng tải lại.");
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw new ConflictException(duplicateMessage);
        }
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        if (ex.InnerException is SqlException sqlEx)
            return sqlEx.Number == 2601 || sqlEx.Number == 2627;

        var msg = ex.InnerException?.Message ?? ex.Message;
        return msg.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) ||
               msg.Contains("duplicate key", StringComparison.OrdinalIgnoreCase);
    }

    private async Task WriteAuditAsync(string action, string targetType, string targetId, object? before, object? after, CancellationToken ct)
    {
        var beforeJson = before == null ? null : JsonSerializer.Serialize(before);
        var afterJson = after == null ? null : JsonSerializer.Serialize(after);
        await _auditWriter.WriteStaffAuditAsync(action, targetType, targetId, beforeJson, afterJson, ct);
    }

    // ─── GradeLevels ─────────────────────────────────────────────────────────

    public async Task<CatalogPagedResponseDto<GradeLevelDto>> ListGradeLevelsAsync(CatalogListQueryDto query, CancellationToken ct = default)
    {
        var (page, pageSize, desc) = NormalizePaging(query);
        var status = NormalizeStatusFilter(query.Status);

        var q = _db.GradeLevels.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(x => x.Name.ToLower().Contains(term) || x.Code.ToLower().Contains(term));
        }

        if (status != null)
            q = q.Where(x => x.Status == status);

        var sortKey = (query.Sort ?? "orderIndex").Trim().ToLowerInvariant();
        q = sortKey switch
        {
            "code" => desc ? q.OrderByDescending(x => x.Code) : q.OrderBy(x => x.Code),
            "name" => desc ? q.OrderByDescending(x => x.Name) : q.OrderBy(x => x.Name),
            "status" => desc ? q.OrderByDescending(x => x.Status).ThenBy(x => x.OrderIndex) : q.OrderBy(x => x.Status).ThenBy(x => x.OrderIndex),
            "updatedat" => desc ? q.OrderByDescending(x => x.UpdatedAt) : q.OrderBy(x => x.UpdatedAt),
            _ => desc ? q.OrderByDescending(x => x.OrderIndex).ThenBy(x => x.Code) : q.OrderBy(x => x.OrderIndex).ThenBy(x => x.Code)
        };

        var total = await q.CountAsync(ct);
        var rows = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new CatalogPagedResponseDto<GradeLevelDto>(
            rows.Select(ToGradeDto).ToList(), total, page, pageSize);
    }

    public async Task<GradeLevelDto> GetGradeLevelAsync(string id, CancellationToken ct = default)
    {
        var row = await _db.GradeLevels.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy khối lớp '{id}'.");
        return ToGradeDto(row);
    }

    public async Task<GradeLevelDto> CreateGradeLevelAsync(CreateGradeLevelRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var code = NormalizeCode(req.Code);
        var name = RequireText(req.Name, "Name");

        if (await _db.GradeLevels.AnyAsync(x => x.Code == code, ct))
            throw new ConflictException($"Mã khối lớp '{code}' đã tồn tại.");

        var now = _clock.UtcNow;
        var entity = new GradeLevel
        {
            Id = $"grd_{Guid.NewGuid():N}"[..20],
            Code = code,
            Name = name,
            OrderIndex = req.OrderIndex,
            Status = "draft",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.GradeLevels.Add(entity);
        await SaveChangesWithConflictGuardAsync($"Mã khối lớp '{code}' đã tồn tại.", ct);
        await WriteAuditAsync("catalog_grade_created", "GradeLevel", entity.Id, null, new { entity.Code, entity.Name, entity.Status, actorUserId }, ct);
        return ToGradeDto(entity);
    }

    public async Task<GradeLevelDto> UpdateGradeLevelAsync(string id, UpdateGradeLevelRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.GradeLevels.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy khối lớp '{id}'.");

        ApplyExpectedRowVersion(entity, entity.RowVersion, req.RowVersion);
        var before = new { entity.Code, entity.Name, entity.OrderIndex, entity.Status };

        if (req.Code != null)
        {
            var code = NormalizeCode(req.Code);
            if (code != entity.Code && await _db.GradeLevels.AnyAsync(x => x.Code == code && x.Id != id, ct))
                throw new ConflictException($"Mã khối lớp '{code}' đã tồn tại.");
            entity.Code = code;
        }
        if (req.Name != null) entity.Name = RequireText(req.Name, "Name");
        if (req.OrderIndex.HasValue) entity.OrderIndex = req.OrderIndex.Value;
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Mã khối lớp bị trùng lặp.", ct);
        await WriteAuditAsync("catalog_grade_updated", "GradeLevel", entity.Id, before, new { entity.Code, entity.Name, entity.OrderIndex, actorUserId }, ct);
        return ToGradeDto(entity);
    }

    public async Task<GradeLevelDto> ArchiveGradeLevelAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.GradeLevels.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy khối lớp '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status == "archived")
            return ToGradeDto(entity);

        if (await _db.Curricula.AnyAsync(c => c.GradeLevelId == id && c.Status != "archived", ct))
            throw new ConflictException("Không thể lưu trữ khối lớp đang có chương trình học hoạt động.");

        var before = new { entity.Status };
        entity.Status = "archived";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Xung đột khi lưu trữ khối lớp.", ct);
        await WriteAuditAsync("catalog_grade_archived", "GradeLevel", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToGradeDto(entity);
    }

    public async Task<GradeLevelDto> ReactivateGradeLevelAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.GradeLevels.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy khối lớp '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status != "archived")
            throw new ValidationException("Status", "Chỉ có thể khôi phục khối lớp đang ở trạng thái 'archived'.");

        var before = new { entity.Status };
        entity.Status = "draft";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Xung đột khi khôi phục khối lớp.", ct);
        await WriteAuditAsync("catalog_grade_reactivated", "GradeLevel", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToGradeDto(entity);
    }

    // ─── CatalogSubjects ─────────────────────────────────────────────────────

    public async Task<CatalogPagedResponseDto<CatalogSubjectDto>> ListSubjectsAsync(CatalogListQueryDto query, CancellationToken ct = default)
    {
        var (page, pageSize, desc) = NormalizePaging(query);
        var status = NormalizeStatusFilter(query.Status);

        var q = _db.CatalogSubjects.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(x => x.Name.ToLower().Contains(term) || x.Code.ToLower().Contains(term));
        }

        if (status != null)
            q = q.Where(x => x.Status == status);

        var sortKey = (query.Sort ?? "name").Trim().ToLowerInvariant();
        q = sortKey switch
        {
            "code" => desc ? q.OrderByDescending(x => x.Code) : q.OrderBy(x => x.Code),
            "status" => desc ? q.OrderByDescending(x => x.Status).ThenBy(x => x.Name) : q.OrderBy(x => x.Status).ThenBy(x => x.Name),
            "updatedat" => desc ? q.OrderByDescending(x => x.UpdatedAt) : q.OrderBy(x => x.UpdatedAt),
            _ => desc ? q.OrderByDescending(x => x.Name).ThenBy(x => x.Code) : q.OrderBy(x => x.Name).ThenBy(x => x.Code)
        };

        var total = await q.CountAsync(ct);
        var rows = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new CatalogPagedResponseDto<CatalogSubjectDto>(
            rows.Select(ToSubjectDto).ToList(), total, page, pageSize);
    }

    public async Task<CatalogSubjectDto> GetSubjectAsync(string id, CancellationToken ct = default)
    {
        var row = await _db.CatalogSubjects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy môn học '{id}'.");
        return ToSubjectDto(row);
    }

    public async Task<CatalogSubjectDto> CreateSubjectAsync(CreateCatalogSubjectRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var code = NormalizeCode(req.Code);
        var name = RequireText(req.Name, "Name");

        if (await _db.CatalogSubjects.AnyAsync(x => x.Code == code, ct))
            throw new ConflictException($"Mã môn học '{code}' đã tồn tại.");

        var now = _clock.UtcNow;
        var entity = new CatalogSubject
        {
            Id = $"subj_{Guid.NewGuid():N}"[..20],
            Code = code,
            Name = name,
            Description = NormalizeOptional(req.Description),
            Status = "draft",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.CatalogSubjects.Add(entity);
        await SaveChangesWithConflictGuardAsync($"Mã môn học '{code}' đã tồn tại.", ct);
        await WriteAuditAsync("catalog_subject_created", "CatalogSubject", entity.Id, null, new { entity.Code, entity.Name, entity.Status, actorUserId }, ct);
        return ToSubjectDto(entity);
    }

    public async Task<CatalogSubjectDto> UpdateSubjectAsync(string id, UpdateCatalogSubjectRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.CatalogSubjects.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy môn học '{id}'.");

        ApplyExpectedRowVersion(entity, entity.RowVersion, req.RowVersion);
        var before = new { entity.Code, entity.Name, entity.Description };

        if (req.Code != null)
        {
            var code = NormalizeCode(req.Code);
            if (code != entity.Code && await _db.CatalogSubjects.AnyAsync(x => x.Code == code && x.Id != id, ct))
                throw new ConflictException($"Mã môn học '{code}' đã tồn tại.");
            entity.Code = code;
        }
        if (req.Name != null) entity.Name = RequireText(req.Name, "Name");
        if (req.Description != null) entity.Description = NormalizeOptional(req.Description);
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Mã môn học bị trùng lặp.", ct);
        await WriteAuditAsync("catalog_subject_updated", "CatalogSubject", entity.Id, before, new { entity.Code, entity.Name, entity.Description, actorUserId }, ct);
        return ToSubjectDto(entity);
    }

    public async Task<CatalogSubjectDto> ArchiveSubjectAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.CatalogSubjects.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy môn học '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status == "archived")
            return ToSubjectDto(entity);

        if (await _db.Curricula.AnyAsync(c => c.SubjectId == id && c.Status != "archived", ct))
            throw new ConflictException("Không thể lưu trữ môn học đang có chương trình học hoạt động.");

        var before = new { entity.Status };
        entity.Status = "archived";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Xung đột khi lưu trữ môn học.", ct);
        await WriteAuditAsync("catalog_subject_archived", "CatalogSubject", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToSubjectDto(entity);
    }

    public async Task<CatalogSubjectDto> ReactivateSubjectAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.CatalogSubjects.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy môn học '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status != "archived")
            throw new ValidationException("Status", "Chỉ có thể khôi phục môn học đang ở trạng thái 'archived'.");

        var before = new { entity.Status };
        entity.Status = "draft";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Xung đột khi khôi phục môn học.", ct);
        await WriteAuditAsync("catalog_subject_reactivated", "CatalogSubject", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToSubjectDto(entity);
    }

    // ─── Curricula ───────────────────────────────────────────────────────────

    public async Task<CatalogPagedResponseDto<CurriculumDto>> ListCurriculaAsync(CatalogListQueryDto query, CancellationToken ct = default)
    {
        var (page, pageSize, desc) = NormalizePaging(query);
        var status = NormalizeStatusFilter(query.Status);

        var q = _db.Curricula
            .AsNoTracking()
            .Include(x => x.GradeLevel)
            .Include(x => x.Subject)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(x => x.Name.ToLower().Contains(term) || x.Code.ToLower().Contains(term) || x.Framework.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(query.GradeLevelId))
            q = q.Where(x => x.GradeLevelId == query.GradeLevelId);

        if (!string.IsNullOrWhiteSpace(query.SubjectId))
            q = q.Where(x => x.SubjectId == query.SubjectId);

        if (status != null)
            q = q.Where(x => x.Status == status);

        var sortKey = (query.Sort ?? "name").Trim().ToLowerInvariant();
        q = sortKey switch
        {
            "code" => desc ? q.OrderByDescending(x => x.Code) : q.OrderBy(x => x.Code),
            "framework" => desc ? q.OrderByDescending(x => x.Framework) : q.OrderBy(x => x.Framework),
            "status" => desc ? q.OrderByDescending(x => x.Status).ThenBy(x => x.Name) : q.OrderBy(x => x.Status).ThenBy(x => x.Name),
            "updatedat" => desc ? q.OrderByDescending(x => x.UpdatedAt) : q.OrderBy(x => x.UpdatedAt),
            _ => desc ? q.OrderByDescending(x => x.Name).ThenBy(x => x.Code) : q.OrderBy(x => x.Name).ThenBy(x => x.Code)
        };

        var total = await q.CountAsync(ct);
        var rows = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new CatalogPagedResponseDto<CurriculumDto>(
            rows.Select(ToCurriculumDto).ToList(), total, page, pageSize);
    }

    public async Task<CurriculumDto> GetCurriculumAsync(string id, CancellationToken ct = default)
    {
        var row = await _db.Curricula
            .AsNoTracking()
            .Include(x => x.GradeLevel)
            .Include(x => x.Subject)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy chương trình '{id}'.");
        return ToCurriculumDto(row);
    }

    public async Task<CurriculumDto> CreateCurriculumAsync(CreateCurriculumRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var code = NormalizeCode(req.Code);
        var name = RequireText(req.Name, "Name");
        var framework = RequireText(req.Framework, "Framework");
        ValidateAcademicYears(req.AcademicYearFrom, req.AcademicYearTo);
        ValidateOptionalUrl(req.SourceUrl, "SourceUrl");

        var grade = await _db.GradeLevels.AsNoTracking().FirstOrDefaultAsync(g => g.Id == req.GradeLevelId, ct)
            ?? throw new ValidationException("GradeLevelId", $"Khối lớp '{req.GradeLevelId}' không tồn tại.");
        var subject = await _db.CatalogSubjects.AsNoTracking().FirstOrDefaultAsync(s => s.Id == req.SubjectId, ct)
            ?? throw new ValidationException("SubjectId", $"Môn học '{req.SubjectId}' không tồn tại.");

        if (await _db.Curricula.AnyAsync(c => c.Code == code, ct))
            throw new ConflictException($"Mã chương trình '{code}' đã tồn tại.");

        var duplicateActive = await _db.Curricula.AnyAsync(c =>
            c.Status != "archived" &&
            c.GradeLevelId == grade.Id &&
            c.SubjectId == subject.Id &&
            c.Framework == framework &&
            c.AcademicYearFrom == req.AcademicYearFrom &&
            c.AcademicYearTo == req.AcademicYearTo, ct);

        if (duplicateActive)
            throw new ConflictException("Đã tồn tại chương trình hoạt động cho cùng Khối lớp, Môn học, Khung chương trình và Niên khóa.");

        var now = _clock.UtcNow;
        var entity = new Curriculum
        {
            Id = $"cur_{Guid.NewGuid():N}"[..20],
            Code = code,
            GradeLevelId = grade.Id,
            SubjectId = subject.Id,
            Name = name,
            Framework = framework,
            AcademicYearFrom = req.AcademicYearFrom,
            AcademicYearTo = req.AcademicYearTo,
            Status = "draft",
            SourceName = NormalizeOptional(req.SourceName),
            SourceUrl = NormalizeOptional(req.SourceUrl),
            SourceLicense = NormalizeOptional(req.SourceLicense),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Curricula.Add(entity);
        await SaveChangesWithConflictGuardAsync("Chương trình học bị trùng mã hoặc trùng khóa nghiệp vụ.", ct);
        await WriteAuditAsync("catalog_curriculum_created", "Curriculum", entity.Id, null, new { entity.Code, entity.GradeLevelId, entity.SubjectId, entity.Framework, actorUserId }, ct);

        return new CurriculumDto(
            entity.Id, entity.Code, entity.GradeLevelId, grade.Name, entity.SubjectId, subject.Name,
            entity.Name, entity.Framework, entity.AcademicYearFrom, entity.AcademicYearTo, entity.Status,
            entity.SourceName, entity.SourceUrl, entity.SourceLicense, EncodeRowVersion(entity.RowVersion),
            entity.CreatedAt, entity.UpdatedAt);
    }

    public async Task<CurriculumDto> UpdateCurriculumAsync(string id, UpdateCurriculumRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.Curricula
            .Include(x => x.GradeLevel)
            .Include(x => x.Subject)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy chương trình '{id}'.");

        ApplyExpectedRowVersion(entity, entity.RowVersion, req.RowVersion);
        var before = new { entity.Code, entity.GradeLevelId, entity.SubjectId, entity.Name, entity.Framework, entity.AcademicYearFrom, entity.AcademicYearTo };

        if (req.Code != null)
        {
            var code = NormalizeCode(req.Code);
            if (code != entity.Code && await _db.Curricula.AnyAsync(x => x.Code == code && x.Id != id, ct))
                throw new ConflictException($"Mã chương trình '{code}' đã tồn tại.");
            entity.Code = code;
        }

        if (req.GradeLevelId != null && req.GradeLevelId != entity.GradeLevelId)
        {
            var grade = await _db.GradeLevels.AsNoTracking().FirstOrDefaultAsync(g => g.Id == req.GradeLevelId, ct)
                ?? throw new ValidationException("GradeLevelId", $"Khối lớp '{req.GradeLevelId}' không tồn tại.");
            entity.GradeLevelId = grade.Id;
        }

        if (req.SubjectId != null && req.SubjectId != entity.SubjectId)
        {
            var subject = await _db.CatalogSubjects.AsNoTracking().FirstOrDefaultAsync(s => s.Id == req.SubjectId, ct)
                ?? throw new ValidationException("SubjectId", $"Môn học '{req.SubjectId}' không tồn tại.");
            entity.SubjectId = subject.Id;
        }

        if (req.Name != null) entity.Name = RequireText(req.Name, "Name");
        if (req.Framework != null) entity.Framework = RequireText(req.Framework, "Framework");
        if (req.AcademicYearFrom.HasValue) entity.AcademicYearFrom = req.AcademicYearFrom;
        if (req.AcademicYearTo.HasValue) entity.AcademicYearTo = req.AcademicYearTo;
        ValidateAcademicYears(entity.AcademicYearFrom, entity.AcademicYearTo);

        if (req.SourceUrl != null) ValidateOptionalUrl(req.SourceUrl, "SourceUrl");
        if (req.SourceName != null) entity.SourceName = NormalizeOptional(req.SourceName);
        if (req.SourceUrl != null) entity.SourceUrl = NormalizeOptional(req.SourceUrl);
        if (req.SourceLicense != null) entity.SourceLicense = NormalizeOptional(req.SourceLicense);
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Chương trình học bị trùng mã hoặc trùng khóa nghiệp vụ.", ct);
        await WriteAuditAsync("catalog_curriculum_updated", "Curriculum", entity.Id, before, new { entity.Code, entity.GradeLevelId, entity.SubjectId, entity.Name, entity.Framework, actorUserId }, ct);
        return ToCurriculumDto(entity);
    }

    public async Task<CurriculumDto> ArchiveCurriculumAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.Curricula
            .Include(x => x.GradeLevel)
            .Include(x => x.Subject)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy chương trình '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status == "archived")
            return ToCurriculumDto(entity);

        if (await _db.CurriculumEditions.AnyAsync(e => e.CurriculumId == id && e.Status != "archived", ct))
            throw new ConflictException("Không thể lưu trữ chương trình đang có phiên bản sách/chương trình hoạt động.");

        var before = new { entity.Status };
        entity.Status = "archived";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Xung đột khi lưu trữ chương trình.", ct);
        await WriteAuditAsync("catalog_curriculum_archived", "Curriculum", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToCurriculumDto(entity);
    }

    public async Task<CurriculumDto> ReactivateCurriculumAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.Curricula
            .Include(x => x.GradeLevel)
            .Include(x => x.Subject)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy chương trình '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status != "archived")
            throw new ValidationException("Status", "Chỉ có thể khôi phục chương trình đang ở trạng thái 'archived'.");

        var before = new { entity.Status };
        entity.Status = "draft";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Trùng khóa nghiệp vụ khi khôi phục chương trình.", ct);
        await WriteAuditAsync("catalog_curriculum_reactivated", "Curriculum", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToCurriculumDto(entity);
    }

    // ─── TextbookSeries ──────────────────────────────────────────────────────

    public async Task<CatalogPagedResponseDto<TextbookSeriesDto>> ListTextbookSeriesAsync(CatalogListQueryDto query, CancellationToken ct = default)
    {
        var (page, pageSize, desc) = NormalizePaging(query);
        var status = NormalizeStatusFilter(query.Status);

        var q = _db.TextbookSeries.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(x => x.Name.ToLower().Contains(term) || x.Code.ToLower().Contains(term) || x.Publisher.ToLower().Contains(term));
        }

        if (status != null)
            q = q.Where(x => x.Status == status);

        var sortKey = (query.Sort ?? "name").Trim().ToLowerInvariant();
        q = sortKey switch
        {
            "code" => desc ? q.OrderByDescending(x => x.Code) : q.OrderBy(x => x.Code),
            "publisher" => desc ? q.OrderByDescending(x => x.Publisher) : q.OrderBy(x => x.Publisher),
            "status" => desc ? q.OrderByDescending(x => x.Status).ThenBy(x => x.Name) : q.OrderBy(x => x.Status).ThenBy(x => x.Name),
            "updatedat" => desc ? q.OrderByDescending(x => x.UpdatedAt) : q.OrderBy(x => x.UpdatedAt),
            _ => desc ? q.OrderByDescending(x => x.Name).ThenBy(x => x.Code) : q.OrderBy(x => x.Name).ThenBy(x => x.Code)
        };

        var total = await q.CountAsync(ct);
        var rows = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new CatalogPagedResponseDto<TextbookSeriesDto>(
            rows.Select(ToSeriesDto).ToList(), total, page, pageSize);
    }

    public async Task<TextbookSeriesDto> GetTextbookSeriesAsync(string id, CancellationToken ct = default)
    {
        var row = await _db.TextbookSeries.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy bộ sách '{id}'.");
        return ToSeriesDto(row);
    }

    public async Task<TextbookSeriesDto> CreateTextbookSeriesAsync(CreateTextbookSeriesRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var code = NormalizeCode(req.Code);
        var name = RequireText(req.Name, "Name");
        var publisher = RequireText(req.Publisher, "Publisher");
        ValidateOptionalUrl(req.SourceUrl, "SourceUrl");

        if (await _db.TextbookSeries.AnyAsync(x => x.Code == code, ct))
            throw new ConflictException($"Mã bộ sách '{code}' đã tồn tại.");

        var now = _clock.UtcNow;
        var entity = new TextbookSeries
        {
            Id = $"tbs_{Guid.NewGuid():N}"[..20],
            Code = code,
            Name = name,
            Publisher = publisher,
            Description = NormalizeOptional(req.Description),
            Status = "draft",
            SourceName = NormalizeOptional(req.SourceName),
            SourceUrl = NormalizeOptional(req.SourceUrl),
            SourceLicense = NormalizeOptional(req.SourceLicense),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.TextbookSeries.Add(entity);
        await SaveChangesWithConflictGuardAsync($"Mã bộ sách '{code}' đã tồn tại.", ct);
        await WriteAuditAsync("catalog_series_created", "TextbookSeries", entity.Id, null, new { entity.Code, entity.Name, entity.Publisher, actorUserId }, ct);
        return ToSeriesDto(entity);
    }

    public async Task<TextbookSeriesDto> UpdateTextbookSeriesAsync(string id, UpdateTextbookSeriesRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.TextbookSeries.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy bộ sách '{id}'.");

        ApplyExpectedRowVersion(entity, entity.RowVersion, req.RowVersion);
        var before = new { entity.Code, entity.Name, entity.Publisher, entity.Description };

        if (req.Code != null)
        {
            var code = NormalizeCode(req.Code);
            if (code != entity.Code && await _db.TextbookSeries.AnyAsync(x => x.Code == code && x.Id != id, ct))
                throw new ConflictException($"Mã bộ sách '{code}' đã tồn tại.");
            entity.Code = code;
        }
        if (req.Name != null) entity.Name = RequireText(req.Name, "Name");
        if (req.Publisher != null) entity.Publisher = RequireText(req.Publisher, "Publisher");
        if (req.Description != null) entity.Description = NormalizeOptional(req.Description);
        if (req.SourceUrl != null) ValidateOptionalUrl(req.SourceUrl, "SourceUrl");
        if (req.SourceName != null) entity.SourceName = NormalizeOptional(req.SourceName);
        if (req.SourceUrl != null) entity.SourceUrl = NormalizeOptional(req.SourceUrl);
        if (req.SourceLicense != null) entity.SourceLicense = NormalizeOptional(req.SourceLicense);
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Mã bộ sách bị trùng lặp.", ct);
        await WriteAuditAsync("catalog_series_updated", "TextbookSeries", entity.Id, before, new { entity.Code, entity.Name, entity.Publisher, actorUserId }, ct);
        return ToSeriesDto(entity);
    }

    public async Task<TextbookSeriesDto> ArchiveTextbookSeriesAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.TextbookSeries.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy bộ sách '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status == "archived")
            return ToSeriesDto(entity);

        if (await _db.CurriculumEditions.AnyAsync(e => e.TextbookSeriesId == id && e.Status != "archived", ct))
            throw new ConflictException("Không thể lưu trữ bộ sách đang được sử dụng bởi phiên bản chương trình hoạt động.");

        var before = new { entity.Status };
        entity.Status = "archived";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Xung đột khi lưu trữ bộ sách.", ct);
        await WriteAuditAsync("catalog_series_archived", "TextbookSeries", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToSeriesDto(entity);
    }

    public async Task<TextbookSeriesDto> ReactivateTextbookSeriesAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.TextbookSeries.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy bộ sách '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status != "archived")
            throw new ValidationException("Status", "Chỉ có thể khôi phục bộ sách đang ở trạng thái 'archived'.");

        var before = new { entity.Status };
        entity.Status = "draft";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Xung đột khi khôi phục bộ sách.", ct);
        await WriteAuditAsync("catalog_series_reactivated", "TextbookSeries", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToSeriesDto(entity);
    }

    // ─── CurriculumEditions ──────────────────────────────────────────────────

    public async Task<CatalogPagedResponseDto<CurriculumEditionDto>> ListEditionsAsync(CatalogListQueryDto query, CancellationToken ct = default)
    {
        var (page, pageSize, desc) = NormalizePaging(query);
        var status = NormalizeStatusFilter(query.Status);

        var q = _db.CurriculumEditions
            .AsNoTracking()
            .Include(x => x.Curriculum)
            .Include(x => x.TextbookSeries)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(x => x.EditionName.ToLower().Contains(term) || x.Code.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(query.CurriculumId))
            q = q.Where(x => x.CurriculumId == query.CurriculumId);

        if (!string.IsNullOrWhiteSpace(query.TextbookSeriesId))
            q = q.Where(x => x.TextbookSeriesId == query.TextbookSeriesId);

        if (query.PublicationYear.HasValue)
            q = q.Where(x => x.PublicationYear == query.PublicationYear.Value);

        if (status != null)
            q = q.Where(x => x.Status == status);

        var sortKey = (query.Sort ?? "editionName").Trim().ToLowerInvariant();
        q = sortKey switch
        {
            "code" => desc ? q.OrderByDescending(x => x.Code) : q.OrderBy(x => x.Code),
            "publicationyear" => desc ? q.OrderByDescending(x => x.PublicationYear) : q.OrderBy(x => x.PublicationYear),
            "status" => desc ? q.OrderByDescending(x => x.Status).ThenBy(x => x.EditionName) : q.OrderBy(x => x.Status).ThenBy(x => x.EditionName),
            "updatedat" => desc ? q.OrderByDescending(x => x.UpdatedAt) : q.OrderBy(x => x.UpdatedAt),
            _ => desc ? q.OrderByDescending(x => x.EditionName).ThenBy(x => x.Code) : q.OrderBy(x => x.EditionName).ThenBy(x => x.Code)
        };

        var total = await q.CountAsync(ct);
        var rows = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new CatalogPagedResponseDto<CurriculumEditionDto>(
            rows.Select(ToEditionDto).ToList(), total, page, pageSize);
    }

    public async Task<CurriculumEditionDto> GetEditionAsync(string id, CancellationToken ct = default)
    {
        var row = await _db.CurriculumEditions
            .AsNoTracking()
            .Include(x => x.Curriculum)
            .Include(x => x.TextbookSeries)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy phiên bản chương trình '{id}'.");
        return ToEditionDto(row);
    }

    public async Task<CurriculumEditionDto> CreateEditionAsync(CreateCurriculumEditionRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var code = NormalizeCode(req.Code);
        var editionName = RequireText(req.EditionName, "EditionName");
        ValidatePublicationYear(req.PublicationYear);
        ValidateOptionalUrl(req.SourceUrl, "SourceUrl");

        var curriculum = await _db.Curricula.AsNoTracking().FirstOrDefaultAsync(c => c.Id == req.CurriculumId, ct)
            ?? throw new ValidationException("CurriculumId", $"Chương trình '{req.CurriculumId}' không tồn tại.");

        TextbookSeries? series = null;
        if (!string.IsNullOrWhiteSpace(req.TextbookSeriesId))
        {
            series = await _db.TextbookSeries.AsNoTracking().FirstOrDefaultAsync(s => s.Id == req.TextbookSeriesId, ct)
                ?? throw new ValidationException("TextbookSeriesId", $"Bộ sách '{req.TextbookSeriesId}' không tồn tại.");
        }

        if (await _db.CurriculumEditions.AnyAsync(e => e.Code == code, ct))
            throw new ConflictException($"Mã phiên bản '{code}' đã tồn tại.");

        var volume = NormalizeOptional(req.Volume);
        var version = NormalizeOptional(req.Version);

        var duplicateActive = await _db.CurriculumEditions.AnyAsync(e =>
            e.Status != "archived" &&
            e.CurriculumId == curriculum.Id &&
            e.TextbookSeriesId == (series == null ? null : series.Id) &&
            e.Version == version &&
            e.Volume == volume &&
            e.PublicationYear == req.PublicationYear, ct);

        if (duplicateActive)
            throw new ConflictException("Đã tồn tại phiên bản hoạt động cho cùng Chương trình, Bộ sách, Phiên bản/Tập và Năm xuất bản.");

        var now = _clock.UtcNow;
        var entity = new CurriculumEdition
        {
            Id = $"ced_{Guid.NewGuid():N}"[..20],
            Code = code,
            CurriculumId = curriculum.Id,
            TextbookSeriesId = series?.Id,
            EditionName = editionName,
            Volume = volume,
            Version = version,
            PublicationYear = req.PublicationYear,
            Status = "draft",
            SourceName = NormalizeOptional(req.SourceName),
            SourceUrl = NormalizeOptional(req.SourceUrl),
            SourceLicense = NormalizeOptional(req.SourceLicense),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.CurriculumEditions.Add(entity);
        await SaveChangesWithConflictGuardAsync("Phiên bản chương trình bị trùng mã hoặc trùng khóa nghiệp vụ.", ct);
        await WriteAuditAsync("catalog_edition_created", "CurriculumEdition", entity.Id, null, new { entity.Code, entity.CurriculumId, entity.TextbookSeriesId, entity.EditionName, actorUserId }, ct);

        return new CurriculumEditionDto(
            entity.Id, entity.Code, entity.CurriculumId, curriculum.Name,
            entity.TextbookSeriesId, series?.Name,
            entity.EditionName, entity.Volume, entity.Version, entity.PublicationYear, entity.Status,
            entity.SourceName, entity.SourceUrl, entity.SourceLicense, EncodeRowVersion(entity.RowVersion),
            entity.CreatedAt, entity.UpdatedAt);
    }

    public async Task<CurriculumEditionDto> UpdateEditionAsync(string id, UpdateCurriculumEditionRequestDto req, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.CurriculumEditions
            .Include(x => x.Curriculum)
            .Include(x => x.TextbookSeries)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy phiên bản chương trình '{id}'.");

        ApplyExpectedRowVersion(entity, entity.RowVersion, req.RowVersion);
        var before = new { entity.Code, entity.CurriculumId, entity.TextbookSeriesId, entity.EditionName, entity.Volume, entity.Version, entity.PublicationYear };

        if (req.Code != null)
        {
            var code = NormalizeCode(req.Code);
            if (code != entity.Code && await _db.CurriculumEditions.AnyAsync(x => x.Code == code && x.Id != id, ct))
                throw new ConflictException($"Mã phiên bản '{code}' đã tồn tại.");
            entity.Code = code;
        }

        if (req.CurriculumId != null && req.CurriculumId != entity.CurriculumId)
        {
            var curriculum = await _db.Curricula.AsNoTracking().FirstOrDefaultAsync(c => c.Id == req.CurriculumId, ct)
                ?? throw new ValidationException("CurriculumId", $"Chương trình '{req.CurriculumId}' không tồn tại.");
            entity.CurriculumId = curriculum.Id;
        }

        if (req.TextbookSeriesId != null)
        {
            if (string.IsNullOrWhiteSpace(req.TextbookSeriesId))
            {
                entity.TextbookSeriesId = null;
            }
            else if (req.TextbookSeriesId != entity.TextbookSeriesId)
            {
                var series = await _db.TextbookSeries.AsNoTracking().FirstOrDefaultAsync(s => s.Id == req.TextbookSeriesId, ct)
                    ?? throw new ValidationException("TextbookSeriesId", $"Bộ sách '{req.TextbookSeriesId}' không tồn tại.");
                entity.TextbookSeriesId = series.Id;
            }
        }

        if (req.EditionName != null) entity.EditionName = RequireText(req.EditionName, "EditionName");
        if (req.Volume != null) entity.Volume = NormalizeOptional(req.Volume);
        if (req.Version != null) entity.Version = NormalizeOptional(req.Version);
        if (req.PublicationYear.HasValue)
        {
            ValidatePublicationYear(req.PublicationYear);
            entity.PublicationYear = req.PublicationYear;
        }

        if (req.SourceUrl != null) ValidateOptionalUrl(req.SourceUrl, "SourceUrl");
        if (req.SourceName != null) entity.SourceName = NormalizeOptional(req.SourceName);
        if (req.SourceUrl != null) entity.SourceUrl = NormalizeOptional(req.SourceUrl);
        if (req.SourceLicense != null) entity.SourceLicense = NormalizeOptional(req.SourceLicense);
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Phiên bản chương trình bị trùng mã hoặc trùng khóa nghiệp vụ.", ct);
        await WriteAuditAsync("catalog_edition_updated", "CurriculumEdition", entity.Id, before, new { entity.Code, entity.CurriculumId, entity.TextbookSeriesId, entity.EditionName, actorUserId }, ct);
        return ToEditionDto(entity);
    }

    public async Task<CurriculumEditionDto> ArchiveEditionAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.CurriculumEditions
            .Include(x => x.Curriculum)
            .Include(x => x.TextbookSeries)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy phiên bản chương trình '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status == "archived")
            return ToEditionDto(entity);

        var before = new { entity.Status };
        entity.Status = "archived";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Xung đột khi lưu trữ phiên bản.", ct);
        await WriteAuditAsync("catalog_edition_archived", "CurriculumEdition", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToEditionDto(entity);
    }

    public async Task<CurriculumEditionDto> ReactivateEditionAsync(string id, CatalogStatusActionDto? action, string actorUserId, CancellationToken ct = default)
    {
        var entity = await _db.CurriculumEditions
            .Include(x => x.Curriculum)
            .Include(x => x.TextbookSeries)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException($"Không tìm thấy phiên bản chương trình '{id}'.");

        if (!string.IsNullOrWhiteSpace(action?.RowVersion))
            ApplyExpectedRowVersion(entity, entity.RowVersion, action.RowVersion);

        if (entity.Status != "archived")
            throw new ValidationException("Status", "Chỉ có thể khôi phục phiên bản đang ở trạng thái 'archived'.");

        var before = new { entity.Status };
        entity.Status = "draft";
        entity.UpdatedAt = _clock.UtcNow;

        await SaveChangesWithConflictGuardAsync("Trùng khóa nghiệp vụ khi khôi phục phiên bản.", ct);
        await WriteAuditAsync("catalog_edition_reactivated", "CurriculumEdition", entity.Id, before, new { entity.Status, reason = action?.Reason, actorUserId }, ct);
        return ToEditionDto(entity);
    }

    // ─── Read-Only Compatibility Mapping Report ──────────────────────────────

    public async Task<CompatibilityMappingReportDto> GetCompatibilityMappingReportAsync(CancellationToken ct = default)
    {
        var legacySubjects = await _db.ContentSubjects.AsNoTracking().OrderBy(s => s.OrderIndex).ThenBy(s => s.Code).ToListAsync(ct);
        var grades = await _db.GradeLevels.AsNoTracking().ToListAsync(ct);
        var catalogSubjects = await _db.CatalogSubjects.AsNoTracking().ToListAsync(ct);
        var curricula = await _db.Curricula.AsNoTracking().Where(c => c.Status != "archived").ToListAsync(ct);

        var candidates = new List<LegacySubjectMappingCandidateDto>();
        int mapped = 0, unmapped = 0, conflicts = 0;

        foreach (var legacy in legacySubjects)
        {
            var storedGrade = (legacy.Grade ?? string.Empty).Trim();
            var normalizedCode = (legacy.Code ?? string.Empty).Trim().ToUpperInvariant();

            string? conflictReason = null;
            if (string.IsNullOrWhiteSpace(storedGrade))
            {
                conflictReason = "Stored Grade is empty; cannot derive GradeLevel without guessing.";
            }

            var candidateGradeCode = storedGrade.ToUpperInvariant();
            var (candidateSubCode, candidateSubName) = DeriveGenericSubjectCandidate(normalizedCode, legacy.Name, storedGrade);

            // Detect grade mismatch between stored Grade and trailing digits in legacy Code if both exist
            var digitsAtEnd = new string(normalizedCode.Reverse().TakeWhile(char.IsDigit).Reverse().ToArray());
            if (!string.IsNullOrEmpty(digitsAtEnd) && !string.IsNullOrEmpty(storedGrade) && digitsAtEnd != storedGrade)
            {
                conflictReason = $"Stored Grade '{storedGrade}' conflicts with code suffix '{digitsAtEnd}'.";
            }

            var matchedGrade = grades.FirstOrDefault(g => string.Equals(g.Code, candidateGradeCode, StringComparison.OrdinalIgnoreCase));
            var matchedSubject = catalogSubjects.FirstOrDefault(s => string.Equals(s.Code, candidateSubCode, StringComparison.OrdinalIgnoreCase));
            var matchedCurriculum = (matchedGrade != null && matchedSubject != null)
                ? curricula.FirstOrDefault(c => c.GradeLevelId == matchedGrade.Id && c.SubjectId == matchedSubject.Id)
                : null;

            string status;
            if (conflictReason != null)
            {
                status = "conflict";
                conflicts++;
            }
            else if (matchedGrade != null && matchedSubject != null && matchedCurriculum != null)
            {
                status = "mapped";
                mapped++;
            }
            else
            {
                status = "unmapped";
                unmapped++;
            }

            candidates.Add(new LegacySubjectMappingCandidateDto(
                LegacySubjectId: legacy.Id,
                LegacyCode: legacy.Code ?? string.Empty,
                LegacyName: legacy.Name ?? string.Empty,
                StoredGrade: storedGrade,
                CandidateGradeCode: candidateGradeCode,
                CandidateSubjectCode: candidateSubCode,
                CandidateSubjectName: candidateSubName,
                MappingStatus: status,
                ConflictReason: conflictReason,
                MatchedGradeLevelId: matchedGrade?.Id,
                MatchedCatalogSubjectId: matchedSubject?.Id,
                MatchedCurriculumId: matchedCurriculum?.Id));
        }

        return new CompatibilityMappingReportDto(
            LegacySubjectCount: legacySubjects.Count,
            MappedCount: mapped,
            UnmappedCount: unmapped,
            ConflictCount: conflicts,
            Candidates: candidates);
    }

    private static (string Code, string Name) DeriveGenericSubjectCandidate(string normalizedLegacyCode, string? legacyName, string storedGrade)
    {
        var strippedCode = string.IsNullOrEmpty(storedGrade)
            ? normalizedLegacyCode
            : normalizedLegacyCode.EndsWith(storedGrade, StringComparison.OrdinalIgnoreCase)
                ? normalizedLegacyCode[..^storedGrade.Length].TrimEnd('_', '-')
                : normalizedLegacyCode;

        if (string.IsNullOrWhiteSpace(strippedCode))
            strippedCode = normalizedLegacyCode;

        var cleanName = (legacyName ?? strippedCode).Trim();
        if (!string.IsNullOrEmpty(storedGrade) && cleanName.EndsWith($" {storedGrade}", StringComparison.OrdinalIgnoreCase))
            cleanName = cleanName[..^(storedGrade.Length + 1)].Trim();

        return (strippedCode, cleanName);
    }

    // ─── DTO Mappers ─────────────────────────────────────────────────────────

    private static GradeLevelDto ToGradeDto(GradeLevel e) => new(
        e.Id, e.Code, e.Name, e.OrderIndex, e.Status, EncodeRowVersion(e.RowVersion), e.CreatedAt, e.UpdatedAt);

    private static CatalogSubjectDto ToSubjectDto(CatalogSubject e) => new(
        e.Id, e.Code, e.Name, e.Description, e.Status, EncodeRowVersion(e.RowVersion), e.CreatedAt, e.UpdatedAt);

    private static CurriculumDto ToCurriculumDto(Curriculum e) => new(
        e.Id, e.Code, e.GradeLevelId, e.GradeLevel?.Name ?? string.Empty, e.SubjectId, e.Subject?.Name ?? string.Empty,
        e.Name, e.Framework, e.AcademicYearFrom, e.AcademicYearTo, e.Status,
        e.SourceName, e.SourceUrl, e.SourceLicense, EncodeRowVersion(e.RowVersion), e.CreatedAt, e.UpdatedAt);

    private static TextbookSeriesDto ToSeriesDto(TextbookSeries e) => new(
        e.Id, e.Code, e.Name, e.Publisher, e.Description, e.Status,
        e.SourceName, e.SourceUrl, e.SourceLicense, EncodeRowVersion(e.RowVersion), e.CreatedAt, e.UpdatedAt);

    private static CurriculumEditionDto ToEditionDto(CurriculumEdition e) => new(
        e.Id, e.Code, e.CurriculumId, e.Curriculum?.Name ?? string.Empty,
        e.TextbookSeriesId, e.TextbookSeries?.Name,
        e.EditionName, e.Volume, e.Version, e.PublicationYear, e.Status,
        e.SourceName, e.SourceUrl, e.SourceLicense, EncodeRowVersion(e.RowVersion), e.CreatedAt, e.UpdatedAt);
}
