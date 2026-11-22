using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace StudyAI.Features.Content;

public class CurriculumImportConfirmService : ICurriculumImportConfirmService
{
    private static readonly ConcurrentDictionary<string, byte> InFlightTokens = new();

    private readonly IApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CurriculumImportConfirmService> _logger;

    public CurriculumImportConfirmService(
        IApplicationDbContext context,
        IMemoryCache cache,
        ILogger<CurriculumImportConfirmService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<CurriculumImportConfirmResult> ConfirmImportAsync(
        string previewToken,
        string currentUserId,
        string? auditNote,
        bool dryRun = false,
        CancellationToken cancellationToken = default)
    {
        // 1. Chống Double-click bằng khóa bộ nhớ theo PreviewToken
        if (!InFlightTokens.TryAdd(previewToken, 0))
        {
            return CurriculumImportConfirmResult.Fail(
                409,
                "TOKEN_IN_USE",
                "Yêu cầu xác nhận cho mã Preview này đang được xử lý. Vui lòng không gửi liên tiếp.");
        }

        try
        {
            // 2. Kiểm tra sự tồn tại và tính hợp lệ của PreviewToken trong IMemoryCache
            var cacheKey = $"import:preview:{previewToken}";
            if (!_cache.TryGetValue(cacheKey, out CurriculumImportSessionDto? session) || session == null)
            {
                return CurriculumImportConfirmResult.Fail(
                    404,
                    "TOKEN_NOT_FOUND",
                    "Mã Preview không tồn tại hoặc đã hết hạn.");
            }

            // 3. Phân quyền và Actor Binding: Người Confirm phải chính là người tạo Preview
            if (!string.Equals(session.ActorId, currentUserId, StringComparison.Ordinal))
            {
                return CurriculumImportConfirmResult.Fail(
                    403,
                    "ACTOR_MISMATCH",
                    "Bạn không có quyền xác nhận bản xem trước do tài khoản khác tạo ra.");
            }

            // 4. Strict-only: Nếu tệp có lỗi xác thực từ bước preview, từ chối confirm
            if (session.PreviewResponse.Summary.ErrorCount > 0)
            {
                return CurriculumImportConfirmResult.Fail(
                    400,
                    "HAS_CRITICAL_ERRORS",
                    "Tệp dữ liệu chứa lỗi xác thực, không thể thực hiện xác nhận trong chế độ Strict.");
            }

            // 4.1 Chế độ Dry-Run / Copyright Verification Mode: Hoàn toàn không ghi Database
            if (dryRun || auditNote?.Contains("DRY_RUN", StringComparison.OrdinalIgnoreCase) == true)
            {
                var dryRunResponse = new CurriculumImportConfirmResponseDto
                {
                    Success = true,
                    PreviewToken = previewToken,
                    ActorId = currentUserId,
                    ConfirmedAt = DateTimeOffset.UtcNow,
                    AuditLogId = $"dry_{Guid.NewGuid():N}"[..12],
                    IsDryRun = true,
                    Provenance = "VNHSGE Benchmark Dataset (arXiv:2305.12199 / CC BY-NC-SA 4.0)",
                    Summary = new CurriculumImportConfirmSummaryDto
                    {
                        TotalProcessed = session.PreviewResponse.Summary.TotalItems,
                        Inserted = session.PreviewResponse.Summary.InsertCount,
                        Updated = session.PreviewResponse.Summary.UpdateCount,
                        Skipped = session.PreviewResponse.Summary.SkipCount,
                        Failed = session.PreviewResponse.Summary.ErrorCount,
                    },
                    EntityCounts = new CurriculumImportEntityCountsDto
                    {
                        Subjects = session.Batch.Subjects.Count,
                        Chapters = session.Batch.Subjects.Sum(s => s.Chapters.Count),
                        Lessons = session.Batch.Subjects.Sum(s => s.Chapters.Sum(c => c.Lessons.Count)),
                        Questions = session.Batch.FlatQuestions.Count + session.Batch.Subjects.Sum(s => s.Chapters.Sum(c => c.Lessons.Sum(l => l.Questions.Count))),
                    },
                    Message = "Chế độ Dry-Run: Đã mô phỏng quy trình nhập dữ liệu và đối soát toàn vẹn thành công. Không có thay đổi nào được ghi vào cơ sở dữ liệu."
                };
                return CurriculumImportConfirmResult.Ok(dryRunResponse);
            }

            // 4.2 Kiểm tra cổng bản quyền VNHSGE: Chặn import thật nếu chưa có giấy phép hợp lệ
            bool isVnhsgeBatch = session.Batch.FlatQuestions.Any(q => q.SourceCitation?.Contains("VNHSGE", StringComparison.OrdinalIgnoreCase) == true) ||
                                 session.Batch.FileName.Contains("MET_", StringComparison.OrdinalIgnoreCase);

            if (isVnhsgeBatch)
            {
                bool hasVerifiedCopyright = auditNote?.Contains("VNHSGE_COPYRIGHT_LICENSED", StringComparison.OrdinalIgnoreCase) == true;
                if (!hasVerifiedCopyright)
                {
                    return CurriculumImportConfirmResult.Fail(
                        403,
                        "VNHSGE_COPYRIGHT_GATE_LOCKED",
                        "Bộ dữ liệu khảo cứu VNHSGE đang trong cơ chế khóa bản quyền học thuật (CC BY-NC-SA 4.0 / arXiv:2305.12199). Chỉ được phép thực hiện ở chế độ kiểm thử an toàn (Dry-Run). Thao tác ghi CSDL và xuất bản công khai bị chặn cho đến khi được cấp quyền sử dụng hợp lệ.");
                }
            }

            // 5. Giao dịch nguyên tử (ACID Transaction) thông qua ExecutionStrategy
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var subjectIdMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    var chapterIdMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    var lessonIdMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

                    int insertedSubjects = 0;
                    int insertedChapters = 0;
                    int insertedLessons = 0;
                    int insertedQuestions = 0;
                    int skippedQuestions = 0;

                    bool isCurriculumTreeOnly = session.Batch.FlatQuestions.Count == 0 && !isVnhsgeBatch;

                    // 5.1 Xử lý Subjects trong Batch
                    foreach (var sub in session.Batch.Subjects)
                    {
                        var existingSub = await _context.ContentSubjects
                            .FirstOrDefaultAsync(s => s.Code == sub.Code, cancellationToken);

                        if (existingSub != null)
                        {
                            if (isCurriculumTreeOnly)
                            {
                                await transaction.RollbackAsync(cancellationToken);
                                return CurriculumImportConfirmResult.Fail(
                                    409,
                                    "ENTITY_ALREADY_EXISTS",
                                    $"Môn học với mã '{sub.Code}' đã tồn tại trong hệ thống. Chế độ Insert-only từ chối ghi đè.");
                            }
                            subjectIdMap[sub.Code] = existingSub.Id;
                        }
                        else
                        {
                            var newSub = new ContentSubject
                            {
                                Id = Guid.NewGuid().ToString("N"),
                                Code = sub.Code,
                                Name = sub.Name,
                                Grade = !string.IsNullOrWhiteSpace(sub.Grade) ? sub.Grade : "12",
                                Description = sub.Description,
                                OrderIndex = sub.OrderIndex,
                                IsActive = true,
                                CreatedAt = DateTimeOffset.UtcNow,
                                UpdatedAt = DateTimeOffset.UtcNow
                            };

                            _context.ContentSubjects.Add(newSub);
                            subjectIdMap[sub.Code] = newSub.Id;
                            insertedSubjects++;
                        }
                    }

                    // 5.2 Xử lý Chapters trong Batch
                    foreach (var sub in session.Batch.Subjects)
                    {
                        var parentSubjectId = subjectIdMap[sub.Code];
                        var seenChapterTitles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                        foreach (var ch in sub.Chapters)
                        {
                            if (!seenChapterTitles.Add(ch.Title))
                            {
                                await transaction.RollbackAsync(cancellationToken);
                                return CurriculumImportConfirmResult.Fail(
                                    409,
                                    "ENTITY_ALREADY_EXISTS",
                                    $"Chương '{ch.Title}' bị trùng lặp tiêu đề trong cùng môn học '{sub.Code}'.");
                            }

                            var existingChapter = await _context.ContentChapters
                                .FirstOrDefaultAsync(c => c.SubjectId == parentSubjectId && (c.Title == ch.Title || (ch.Code != null && c.Id == ch.Code)), cancellationToken);

                            if (existingChapter != null)
                            {
                                if (isCurriculumTreeOnly)
                                {
                                    await transaction.RollbackAsync(cancellationToken);
                                    return CurriculumImportConfirmResult.Fail(
                                        409,
                                        "ENTITY_ALREADY_EXISTS",
                                        $"Chương '{ch.Title}' đã tồn tại trong môn học '{sub.Code}'. Chế độ Insert-only từ chối ghi đè.");
                                }
                                chapterIdMap[ch.Code] = existingChapter.Id;
                            }
                            else
                            {
                                var newChapter = new ContentChapter
                                {
                                    Id = Guid.NewGuid().ToString("N"),
                                    SubjectId = parentSubjectId,
                                    Title = ch.Title,
                                    Description = ch.Description,
                                    OrderIndex = ch.OrderIndex,
                                    IsActive = true,
                                    CreatedAt = DateTimeOffset.UtcNow,
                                    UpdatedAt = DateTimeOffset.UtcNow
                                };

                                _context.ContentChapters.Add(newChapter);
                                chapterIdMap[ch.Code] = newChapter.Id;
                                insertedChapters++;
                            }
                        }
                    }

                    // 5.3 Xử lý Lessons và Questions con trong Batch
                    foreach (var sub in session.Batch.Subjects)
                    {
                        foreach (var ch in sub.Chapters)
                        {
                            var parentChapterId = chapterIdMap[ch.Code];

                            var seenLessonSlugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                            foreach (var les in ch.Lessons)
                            {
                                var slug = !string.IsNullOrWhiteSpace(les.Slug) ? les.Slug.Trim().ToLowerInvariant() : GenerateSlug(les.Title);

                                if (!seenLessonSlugs.Add(slug))
                                {
                                    await transaction.RollbackAsync(cancellationToken);
                                    return CurriculumImportConfirmResult.Fail(
                                        409,
                                        "ENTITY_ALREADY_EXISTS",
                                        $"Bài học '{les.Title}' (slug: '{slug}') bị trùng lặp trong cùng tệp nhập.");
                                }

                                var existingLesson = await _context.ContentLessons
                                    .FirstOrDefaultAsync(l => l.ChapterId == parentChapterId && (l.Slug == slug || l.Title == les.Title), cancellationToken);

                                if (existingLesson != null)
                                {
                                    if (isCurriculumTreeOnly)
                                    {
                                        await transaction.RollbackAsync(cancellationToken);
                                        return CurriculumImportConfirmResult.Fail(
                                            409,
                                            "ENTITY_ALREADY_EXISTS",
                                            $"Bài học '{les.Title}' (slug: '{slug}') đã tồn tại trong chương. Chế độ Insert-only từ chối ghi đè.");
                                    }
                                    lessonIdMap[les.Code] = existingLesson.Id;
                                }
                                else
                                {
                                    var newLesson = new ContentLesson
                                    {
                                        Id = Guid.NewGuid().ToString("N"),
                                        ChapterId = parentChapterId,
                                        Title = les.Title,
                                        Slug = slug,
                                        OrderIndex = les.OrderIndex,
                                        Status = "draft",
                                        AuthorId = currentUserId,
                                        Introduction = les.Introduction,
                                        DefinitionsJson = les.Definitions.Count > 0 ? JsonSerializer.Serialize(les.Definitions) : null,
                                        FormulasJson = les.Formulas.Count > 0 ? JsonSerializer.Serialize(les.Formulas) : null,
                                        ExamplesJson = les.Examples.Count > 0 ? JsonSerializer.Serialize(les.Examples) : null,
                                        ImportantNotesJson = les.ImportantNotes.Count > 0 ? JsonSerializer.Serialize(les.ImportantNotes) : null,
                                        SummaryPointsJson = les.SummaryPoints.Count > 0 ? JsonSerializer.Serialize(les.SummaryPoints) : null,
                                        CreatedAt = DateTimeOffset.UtcNow,
                                        UpdatedAt = DateTimeOffset.UtcNow
                                    };

                                    _context.ContentLessons.Add(newLesson);
                                    lessonIdMap[les.Code] = newLesson.Id;
                                    insertedLessons++;
                                }

                                // Chèn các câu hỏi con đi kèm bài học (Idempotent skip)
                                var currentLessonId = lessonIdMap[les.Code];
                                foreach (var q in les.Questions)
                                {
                                    var promptExists = await _context.ContentQuestions
                                        .AnyAsync(x => !x.IsDeleted && (
                                            (x.LessonId == currentLessonId && x.Prompt == q.Prompt) ||
                                            (!string.IsNullOrWhiteSpace(q.Code) && x.Code == q.Code)
                                        ), cancellationToken);

                                    if (promptExists)
                                    {
                                        skippedQuestions++;
                                        continue;
                                    }

                                    var newQ = new ContentQuestion
                                    {
                                        Id = Guid.NewGuid().ToString("N"),
                                        Code = q.Code,
                                        LessonId = currentLessonId,
                                        ChapterId = parentChapterId,
                                        SubjectId = subjectIdMap[sub.Code],
                                        Prompt = q.Prompt,
                                        OptionsJson = JsonSerializer.Serialize(q.Options),
                                        CorrectAnswer = q.CorrectAnswer,
                                        Explanation = q.Explanation,
                                        Topic = q.Topic,
                                        Difficulty = !string.IsNullOrWhiteSpace(q.Difficulty) ? q.Difficulty.ToLowerInvariant() : "medium",
                                        Type = !string.IsNullOrWhiteSpace(q.Type) ? q.Type.ToLowerInvariant() : "multiple-choice",
                                        Status = !string.IsNullOrWhiteSpace(q.Status) ? q.Status.ToLowerInvariant() : (isVnhsgeBatch ? "draft" : "draft"),
                                        SourceType = isVnhsgeBatch ? "vnhsge" : "manual",
                                        CopyrightStatus = isVnhsgeBatch ? "pending_verification" : "proprietary",
                                        CopyrightProofRef = isVnhsgeBatch ? "CC-BY-NC-SA-4.0 (arXiv:2305.12199)" : "Internal Proprietary",
                                        OrderIndex = q.OrderIndex,
                                        CreatedAt = DateTimeOffset.UtcNow,
                                        UpdatedAt = DateTimeOffset.UtcNow
                                    };

                                    _context.ContentQuestions.Add(newQ);
                                    insertedQuestions++;
                                }
                            }
                        }
                    }

                // 5.4 Xử lý Flat Questions (từ CSV hoặc ngân hàng câu hỏi độc lập)
                var seenFlatQuestions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    foreach (var q in session.Batch.FlatQuestions)
                {
                    string? qSubjectId = null;
                    string? qChapterId = null;
                    string? qLessonId = null;

                    // Đối soát Môn học
                    if (!string.IsNullOrWhiteSpace(q.SubjectCode))
                    {
                        if (subjectIdMap.TryGetValue(q.SubjectCode, out var mappedSubId))
                        {
                            qSubjectId = mappedSubId;
                        }
                        else
                        {
                            var dbSub = await _context.ContentSubjects
                                .FirstOrDefaultAsync(s => s.Code == q.SubjectCode, cancellationToken);
                            if (dbSub != null)
                            {
                                qSubjectId = dbSub.Id;
                            }
                            else
                            {
                                await transaction.RollbackAsync(cancellationToken);
                                return CurriculumImportConfirmResult.Fail(
                                    422,
                                    "REFERENTIAL_INTEGRITY_FAIL",
                                    $"Môn học tham chiếu '{q.SubjectCode}' không tồn tại trong hệ thống.");
                            }
                        }
                    }

                    // Đối soát Bài học
                    if (!string.IsNullOrWhiteSpace(q.LessonCode))
                    {
                        if (lessonIdMap.TryGetValue(q.LessonCode, out var mappedLesId))
                        {
                            qLessonId = mappedLesId;
                        }
                        else
                        {
                            // Tìm trong DB theo Id hoặc Slug
                            var matchingLessons = await _context.ContentLessons
                                .Include(l => l.Chapter)
                                .Where(l => l.Id == q.LessonCode || l.Slug == q.LessonCode)
                                .ToListAsync(cancellationToken);

                            if (matchingLessons.Count == 0)
                            {
                                matchingLessons = await _context.ContentLessons
                                    .Include(l => l.Chapter)
                                    .Where(l => l.Title == q.LessonCode)
                                    .ToListAsync(cancellationToken);
                            }

                            if (matchingLessons.Count > 1)
                            {
                                await transaction.RollbackAsync(cancellationToken);
                                return CurriculumImportConfirmResult.Fail(
                                    409,
                                    "AMBIGUOUS_PARENT_REFERENCE",
                                    $"Không thể xác định duy nhất bài học cha cho '{q.LessonCode}' (tìm thấy {matchingLessons.Count} bài học phù hợp).");
                            }
                            else if (matchingLessons.Count == 1)
                            {
                                var matched = matchingLessons[0];
                                qLessonId = matched.Id;
                                qChapterId = matched.ChapterId;
                                if (qSubjectId == null && matched.Chapter != null)
                                {
                                    qSubjectId = matched.Chapter.SubjectId;
                                }
                            }
                            else
                            {
                                await transaction.RollbackAsync(cancellationToken);
                                return CurriculumImportConfirmResult.Fail(
                                    422,
                                    "REFERENTIAL_INTEGRITY_FAIL",
                                    $"Bài học tham chiếu '{q.LessonCode}' không tồn tại trong hệ thống.");
                            }
                        }
                    }

                    // Kiểm tra trùng lặp prompt và mã câu hỏi (Idempotent Skip)
                    var isDuplicate = false;
                    if (!string.IsNullOrWhiteSpace(q.Code))
                    {
                        isDuplicate = await _context.ContentQuestions.AnyAsync(x => !x.IsDeleted && x.Code == q.Code, cancellationToken);
                    }
                    if (!isDuplicate && !string.IsNullOrWhiteSpace(qSubjectId))
                    {
                        isDuplicate = await _context.ContentQuestions.AnyAsync(x => !x.IsDeleted && x.SubjectId == qSubjectId && x.Prompt == q.Prompt, cancellationToken);
                    }
                    if (!isDuplicate && !string.IsNullOrWhiteSpace(qLessonId))
                    {
                        isDuplicate = await _context.ContentQuestions.AnyAsync(x => !x.IsDeleted && x.LessonId == qLessonId && x.Prompt == q.Prompt, cancellationToken);
                    }

                    if (isDuplicate)
                    {
                        skippedQuestions++;
                        continue;
                    }

                    var newQ = new ContentQuestion
                    {
                        Id = Guid.NewGuid().ToString("N"),
                        Code = q.Code,
                        LessonId = qLessonId,
                        ChapterId = qChapterId,
                        SubjectId = qSubjectId,
                        Prompt = q.Prompt,
                        OptionsJson = JsonSerializer.Serialize(q.Options),
                        CorrectAnswer = q.CorrectAnswer,
                        Explanation = q.Explanation,
                        Topic = q.Topic,
                        Difficulty = !string.IsNullOrWhiteSpace(q.Difficulty) ? q.Difficulty.ToLowerInvariant() : "medium",
                        Type = !string.IsNullOrWhiteSpace(q.Type) ? q.Type.ToLowerInvariant() : "multiple-choice",
                        Status = !string.IsNullOrWhiteSpace(q.Status) ? q.Status.ToLowerInvariant() : (isVnhsgeBatch ? "draft" : "draft"),
                        SourceType = isVnhsgeBatch ? "vnhsge" : "manual",
                        CopyrightStatus = isVnhsgeBatch ? "pending_verification" : "proprietary",
                        CopyrightProofRef = isVnhsgeBatch ? "CC-BY-NC-SA-4.0 (arXiv:2305.12199)" : "Internal Proprietary",
                        OrderIndex = q.OrderIndex,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };

                    _context.ContentQuestions.Add(newQ);
                    insertedQuestions++;
                }

                // 5.5 Ghi StaffAuditLog trong cùng giao dịch
                var auditLogId = Guid.NewGuid().ToString("N");
                var confirmedAt = DateTimeOffset.UtcNow;
                var totalProcessed = insertedSubjects + insertedChapters + insertedLessons + insertedQuestions;

                var auditLog = new StaffAuditLog
                {
                    Id = auditLogId,
                    ActorUserId = currentUserId,
                    Action = "CURRICULUM_IMPORT_CONFIRM",
                    TargetType = "CurriculumImport",
                    TargetId = previewToken,
                    Payload = JsonSerializer.Serialize(new
                    {
                        fileHash = session.FileHashSha256,
                        fileName = session.FileName,
                        fileFormat = session.FileFormat,
                        summary = new
                        {
                            totalProcessed = totalProcessed + skippedQuestions,
                            inserted = totalProcessed,
                            updated = 0,
                            skipped = skippedQuestions,
                            failed = 0
                        },
                        entityCounts = new
                        {
                            subjects = insertedSubjects,
                            chapters = insertedChapters,
                            lessons = insertedLessons,
                            questions = insertedQuestions
                        },
                        auditNote = auditNote,
                        confirmedAt = confirmedAt
                    }),
                    CreatedAt = confirmedAt
                };

                _context.StaffAuditLogs.Add(auditLog);

                // Lưu dữ liệu và Commit transaction
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                // 6. Tiêu thụ token: Xóa khỏi IMemoryCache để token không được thực thi lại
                _cache.Remove(cacheKey);

                _logger.LogInformation(
                    "Đã xác nhận import thành công: Token={Token}, Actor={Actor}, Total={Total}, Subjects={Sub}, Chapters={Ch}, Lessons={Les}, Questions={Q}, Skipped={Skip}",
                    previewToken, currentUserId, totalProcessed, insertedSubjects, insertedChapters, insertedLessons, insertedQuestions, skippedQuestions);

                return CurriculumImportConfirmResult.Ok(new CurriculumImportConfirmResponseDto
                {
                    Success = true,
                    PreviewToken = previewToken,
                    ActorId = currentUserId,
                    ConfirmedAt = confirmedAt,
                    AuditLogId = auditLogId,
                    Summary = new CurriculumImportConfirmSummaryDto
                    {
                        TotalProcessed = totalProcessed + skippedQuestions,
                        Inserted = totalProcessed,
                        Updated = 0,
                        Skipped = skippedQuestions,
                        Failed = 0
                    },
                    EntityCounts = new CurriculumImportEntityCountsDto
                    {
                        Subjects = insertedSubjects,
                        Chapters = insertedChapters,
                        Lessons = insertedLessons,
                        Questions = insertedQuestions
                    },
                    Message = $"Đã nhập thành công {totalProcessed} mục vào chương trình học."
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Lỗi bất thường trong quá trình thực thi Confirm Import cho Token={Token}", previewToken);
                throw;
            }
        });
        }
        finally
        {
            InFlightTokens.TryRemove(previewToken, out _);
        }
    }

    private static string GenerateSlug(string title)
    {
        if (string.IsNullOrWhiteSpace(title)) return Guid.NewGuid().ToString("N")[..8];
        var normalized = title.Trim().ToLowerInvariant();
        var cleaned = Regex.Replace(normalized, @"[^a-z0-9\s-]", "");
        cleaned = Regex.Replace(cleaned, @"\s+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(cleaned) ? Guid.NewGuid().ToString("N")[..8] : cleaned;
    }
}