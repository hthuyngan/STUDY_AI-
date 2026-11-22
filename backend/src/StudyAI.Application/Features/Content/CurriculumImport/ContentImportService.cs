using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Exceptions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Features.Content.CurriculumImport;

public class ContentImportService : IContentImportService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;
    private readonly ILogger<ContentImportService>? _logger;

    public ContentImportService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IClock clock,
        ILogger<ContentImportService>? logger = null)
    {
        _db = db;
        _auditWriter = auditWriter;
        _clock = clock;
        _logger = logger;
    }

    private static string? FindCatalogFilePath()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "data", "curriculum", "math-vietnam-catalog.v1.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "data", "curriculum", "math-vietnam-catalog.v1.json"),
            "D:\\TN\\backend\\data\\curriculum\\math-vietnam-catalog.v1.json"
        };

        foreach (var path in candidates)
        {
            if (System.IO.File.Exists(path))
            {
                return Path.GetFullPath(path);
            }
        }
        return null;
    }

    public async Task<object> DryRunCurriculumImportAsync(JsonObject? body = null, CancellationToken ct = default)
    {
        var filePath = FindCatalogFilePath();
        if (filePath == null)
        {
            throw new NotFoundException("Không tìm thấy tệp danh mục 'math-vietnam-catalog.v1.json' trên máy chủ.");
        }

        var jsonText = await System.IO.File.ReadAllTextAsync(filePath, ct);
        using var doc = JsonDocument.Parse(jsonText);
        var root = doc.RootElement;

        var subjects = root.GetProperty("subjects");
        int subjectCount = subjects.GetArrayLength();
        int chapterCount = 0;
        int topicCount = 0;
        int lessonCount = 0;
        int videoCount = 0;

        var preservedLessonIds = new List<string>();

        foreach (var sub in subjects.EnumerateArray())
        {
            if (sub.TryGetProperty("chapters", out var chaps))
            {
                chapterCount += chaps.GetArrayLength();
                foreach (var ch in chaps.EnumerateArray())
                {
                    if (ch.TryGetProperty("topics", out var tops))
                    {
                        topicCount += tops.GetArrayLength();
                        foreach (var top in tops.EnumerateArray())
                        {
                            if (top.TryGetProperty("lessons", out var lesList))
                            {
                                lessonCount += lesList.GetArrayLength();
                                foreach (var les in lesList.EnumerateArray())
                                {
                                    var lId = les.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
                                    if (!string.IsNullOrEmpty(lId))
                                    {
                                        var hasProgress = await _db.LessonProgresses.AnyAsync(lp => lp.LessonId == lId, ct);
                                        if (hasProgress) preservedLessonIds.Add(lId);
                                    }

                                    if (les.TryGetProperty("videos", out var vids))
                                    {
                                        videoCount += vids.GetArrayLength();
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return new
        {
            success = true,
            mode = "dry-run",
            catalogPath = filePath,
            summary = new
            {
                subjects = subjectCount,
                chapters = chapterCount,
                topics = topicCount,
                lessons = lessonCount,
                videos = videoCount,
                preservedLessonsWithUserData = preservedLessonIds
            },
            message = $"Bản dùng thử (Dry-Run) hoàn tất: Nhận diện {subjectCount} môn học, {chapterCount} chương, {topicCount} chủ đề, {lessonCount} bài học và {videoCount} video bài giảng kiểm chứng. Không có dữ liệu nào bị ghi đè hay thay đổi."
        };
    }

    public async Task<object> ApplyCurriculumImportAsync(JsonObject? body, string currentUserId, CancellationToken ct = default)
    {
        var filePath = FindCatalogFilePath();
        if (filePath == null)
        {
            throw new NotFoundException("Không tìm thấy tệp danh mục 'math-vietnam-catalog.v1.json' trên máy chủ.");
        }

        var jsonText = await System.IO.File.ReadAllTextAsync(filePath, ct);
        using var doc = JsonDocument.Parse(jsonText);
        var root = doc.RootElement;

        var subjects = root.GetProperty("subjects");

        int upsertedSubjects = 0;
        int upsertedChapters = 0;
        int upsertedTopics = 0;
        int upsertedLessons = 0;
        int upsertedVideos = 0;

        foreach (var subElem in subjects.EnumerateArray())
        {
            var sId = subElem.GetProperty("id").GetString()!;
            var sCode = subElem.GetProperty("code").GetString()!;
            var sName = subElem.GetProperty("name").GetString()!;
            var sGrade = subElem.GetProperty("grade").GetString()!;
            var sDesc = subElem.TryGetProperty("description", out var sd) ? sd.GetString() : null;
            var sOrder = subElem.TryGetProperty("orderIndex", out var so) ? so.GetInt32() : 0;

            var existingSub = await _db.ContentSubjects.FirstOrDefaultAsync(s => s.Id == sId || s.Code == sCode, ct);
            if (existingSub == null)
            {
                existingSub = new ContentSubject
                {
                    Id = sId,
                    Code = sCode,
                    Name = sName,
                    Grade = sGrade,
                    Description = sDesc,
                    OrderIndex = sOrder,
                    IsActive = true,
                    CreatedAt = _clock.UtcNow,
                    UpdatedAt = _clock.UtcNow
                };
                _db.ContentSubjects.Add(existingSub);
            }
            else
            {
                existingSub.Name = sName;
                existingSub.Grade = sGrade;
                existingSub.Description = sDesc;
                existingSub.OrderIndex = sOrder;
                existingSub.IsActive = true;
                existingSub.UpdatedAt = _clock.UtcNow;
            }
            upsertedSubjects++;

            if (subElem.TryGetProperty("chapters", out var chapsElem))
            {
                foreach (var chElem in chapsElem.EnumerateArray())
                {
                    var cId = chElem.GetProperty("id").GetString()!;
                    var cCode = chElem.GetProperty("code").GetString()!;
                    var cTitle = chElem.GetProperty("title").GetString()!;
                    var cDesc = chElem.TryGetProperty("description", out var cd) ? cd.GetString() : null;
                    var cOrder = chElem.TryGetProperty("orderIndex", out var co) ? co.GetInt32() : 0;
                    var cSrcName = chElem.TryGetProperty("sourceName", out var csn) ? csn.GetString() : "Khan Academy Vietnam";
                    var cSrcUrl = chElem.TryGetProperty("sourceUrl", out var csu) ? csu.GetString() : null;

                    var existingCh = await _db.ContentChapters.FirstOrDefaultAsync(c => c.Id == cId || (c.SubjectId == existingSub.Id && c.Title == cTitle), ct);
                    if (existingCh == null)
                    {
                        existingCh = new ContentChapter
                        {
                            Id = cId,
                            SubjectId = existingSub.Id,
                            Title = cTitle,
                            Description = cDesc,
                            OrderIndex = cOrder,
                            IsActive = true,
                            Status = "published",
                            SourceName = cSrcName,
                            SourceUrl = cSrcUrl,
                            CreatedAt = _clock.UtcNow,
                            UpdatedAt = _clock.UtcNow
                        };
                        _db.ContentChapters.Add(existingCh);
                    }
                    else
                    {
                        existingCh.Title = cTitle;
                        existingCh.Description = cDesc;
                        existingCh.OrderIndex = cOrder;
                        existingCh.IsActive = true;
                        existingCh.Status = "published";
                        existingCh.SourceName = cSrcName;
                        existingCh.SourceUrl = cSrcUrl;
                        existingCh.UpdatedAt = _clock.UtcNow;
                    }
                    upsertedChapters++;

                    if (chElem.TryGetProperty("topics", out var topsElem))
                    {
                        foreach (var topElem in topsElem.EnumerateArray())
                        {
                            var tId = topElem.GetProperty("id").GetString()!;
                            var tTitle = topElem.GetProperty("title").GetString()!;
                            var tDesc = topElem.TryGetProperty("description", out var td) ? td.GetString() : null;
                            var tOrder = topElem.TryGetProperty("orderIndex", out var to) ? to.GetInt32() : 0;

                            var existingTop = await _db.ContentTopics.FirstOrDefaultAsync(t => t.Id == tId || (t.ChapterId == existingCh.Id && t.Title == tTitle), ct);
                            if (existingTop == null)
                            {
                                existingTop = new ContentTopic
                                {
                                    Id = tId,
                                    ChapterId = existingCh.Id,
                                    Title = tTitle,
                                    Description = tDesc,
                                    OrderIndex = tOrder,
                                    IsActive = true,
                                    CreatedAt = _clock.UtcNow,
                                    UpdatedAt = _clock.UtcNow
                                };
                                _db.ContentTopics.Add(existingTop);
                            }
                            else
                            {
                                existingTop.Title = tTitle;
                                existingTop.Description = tDesc;
                                existingTop.OrderIndex = tOrder;
                                existingTop.IsActive = true;
                                existingTop.UpdatedAt = _clock.UtcNow;
                            }
                            upsertedTopics++;

                            if (topElem.TryGetProperty("lessons", out var lesElemList))
                            {
                                foreach (var lesElem in lesElemList.EnumerateArray())
                                {
                                    var lId = lesElem.GetProperty("id").GetString()!;
                                    var lTitle = lesElem.GetProperty("title").GetString()!;
                                    var lSlug = lesElem.GetProperty("slug").GetString()!;
                                    var lOrder = lesElem.TryGetProperty("orderIndex", out var lo) ? lo.GetInt32() : 0;
                                    var lIntro = lesElem.TryGetProperty("introduction", out var li) ? li.GetString() : null;
                                    var lSrcName = lesElem.TryGetProperty("sourceName", out var lsn) ? lsn.GetString() : "Khan Academy Vietnam";
                                    var lSrcUrl = lesElem.TryGetProperty("sourceUrl", out var lsu) ? lsu.GetString() : null;
                                    var lSrcLic = lesElem.TryGetProperty("sourceLicense", out var lsl) ? lsl.GetString() : "CC BY-NC-SA 4.0";

                                    var lObjectives = lesElem.TryGetProperty("learningObjectives", out var obj) ? obj.GetRawText() : "[]";
                                    var lDefs = lesElem.TryGetProperty("definitions", out var def) ? def.GetRawText() : "[]";
                                    var lForms = lesElem.TryGetProperty("formulas", out var frm) ? frm.GetRawText() : "[]";
                                    var lExs = lesElem.TryGetProperty("examples", out var exm) ? exm.GetRawText() : "[]";
                                    var lNotes = lesElem.TryGetProperty("importantNotes", out var nts) ? nts.GetRawText() : "[]";
                                    var lSums = lesElem.TryGetProperty("summaryPoints", out var smp) ? smp.GetRawText() : "[]";

                                    var existingLes = await _db.ContentLessons.FirstOrDefaultAsync(l => l.Id == lId || (l.ChapterId == existingCh.Id && l.Slug == lSlug), ct);
                                    if (existingLes == null)
                                    {
                                        existingLes = new ContentLesson
                                        {
                                            Id = lId,
                                            ChapterId = existingCh.Id,
                                            TopicId = existingTop.Id,
                                            Title = lTitle,
                                            Slug = lSlug,
                                            OrderIndex = lOrder,
                                            Status = "published",
                                            AuthorId = currentUserId,
                                            SourceName = lSrcName,
                                            SourceUrl = lSrcUrl,
                                            SourceLicense = lSrcLic,
                                            Introduction = lIntro,
                                            LearningObjectivesJson = lObjectives,
                                            DefinitionsJson = lDefs,
                                            FormulasJson = lForms,
                                            ExamplesJson = lExs,
                                            ImportantNotesJson = lNotes,
                                            SummaryPointsJson = lSums,
                                            CreatedAt = _clock.UtcNow,
                                            UpdatedAt = _clock.UtcNow
                                        };
                                        _db.ContentLessons.Add(existingLes);
                                    }
                                    else
                                    {
                                        existingLes.ChapterId = existingCh.Id;
                                        existingLes.TopicId = existingTop.Id;
                                        existingLes.Title = lTitle;
                                        existingLes.Slug = lSlug;
                                        existingLes.OrderIndex = lOrder;
                                        existingLes.Status = "published";
                                        existingLes.SourceName = lSrcName;
                                        existingLes.SourceUrl = lSrcUrl;
                                        existingLes.SourceLicense = lSrcLic;
                                        existingLes.Introduction = lIntro;
                                        existingLes.LearningObjectivesJson = lObjectives;
                                        existingLes.DefinitionsJson = lDefs;
                                        existingLes.FormulasJson = lForms;
                                        existingLes.ExamplesJson = lExs;
                                        existingLes.ImportantNotesJson = lNotes;
                                        existingLes.SummaryPointsJson = lSums;
                                        existingLes.UpdatedAt = _clock.UtcNow;
                                    }
                                    upsertedLessons++;

                                    if (lesElem.TryGetProperty("videos", out var vidsElem))
                                    {
                                        foreach (var vidElem in vidsElem.EnumerateArray())
                                        {
                                            var vId = vidElem.GetProperty("id").GetString()!;
                                            var vTitle = vidElem.GetProperty("title").GetString()!;
                                            var vDesc = vidElem.TryGetProperty("description", out var vd) ? vd.GetString() : null;
                                            var vProv = vidElem.TryGetProperty("provider", out var vp) ? vp.GetString() ?? "youtube" : "youtube";
                                            var vSrc = vidElem.GetProperty("sourceUrl").GetString()!;
                                            var vEmbed = vidElem.TryGetProperty("embedUrl", out var ve) ? ve.GetString() : null;
                                            var vYtId = vidElem.TryGetProperty("youtubeVideoId", out var vy) ? vy.GetString() : null;
                                            var vChan = vidElem.TryGetProperty("channelName", out var vc) ? vc.GetString() : null;
                                            var vPri = vidElem.TryGetProperty("isPrimary", out var vpr) && vpr.GetBoolean();
                                            var vAttr = vidElem.TryGetProperty("attributionText", out var va) ? va.GetString() : null;
                                            var vDur = vidElem.TryGetProperty("durationSeconds", out var vdu) ? vdu.GetInt32() : 0;
                                            var vThumb = vidElem.TryGetProperty("thumbnailUrl", out var vt) ? vt.GetString() : null;
                                            var vSort = vidElem.TryGetProperty("sortOrder", out var vs) ? vs.GetInt32() : 1;
                                            var vAllowed = !vidElem.TryGetProperty("embedAllowed", out var vaa) || vaa.GetBoolean();

                                            var existingVid = await _db.ContentLessonVideos.FirstOrDefaultAsync(v => v.Id == vId || (v.LessonId == existingLes.Id && v.SourceUrl == vSrc), ct);
                                            if (existingVid == null)
                                            {
                                                existingVid = new ContentLessonVideo
                                                {
                                                    Id = vId,
                                                    LessonId = existingLes.Id,
                                                    Title = vTitle,
                                                    Description = vDesc,
                                                    Provider = vProv,
                                                    SourceUrl = vSrc,
                                                    EmbedUrl = vEmbed,
                                                    YouTubeVideoId = vYtId,
                                                    ChannelName = vChan,
                                                    IsPrimary = vPri,
                                                    AttributionText = vAttr,
                                                    Language = "vi",
                                                    DurationSeconds = vDur,
                                                    ThumbnailUrl = vThumb,
                                                    SortOrder = vSort,
                                                    EmbedAllowed = vAllowed,
                                                    VerificationStatus = "verified",
                                                    VerifiedAt = _clock.UtcNow,
                                                    LastVerifiedAt = _clock.UtcNow,
                                                    IsPublished = true,
                                                    CreatedAt = _clock.UtcNow,
                                                    UpdatedAt = _clock.UtcNow
                                                };
                                                _db.ContentLessonVideos.Add(existingVid);
                                            }
                                            else
                                            {
                                                existingVid.Title = vTitle;
                                                existingVid.Description = vDesc;
                                                existingVid.Provider = vProv;
                                                existingVid.SourceUrl = vSrc;
                                                existingVid.EmbedUrl = vEmbed;
                                                existingVid.YouTubeVideoId = vYtId;
                                                existingVid.ChannelName = vChan;
                                                existingVid.IsPrimary = vPri;
                                                existingVid.AttributionText = vAttr;
                                                existingVid.DurationSeconds = vDur;
                                                existingVid.ThumbnailUrl = vThumb;
                                                existingVid.SortOrder = vSort;
                                                existingVid.EmbedAllowed = vAllowed;
                                                existingVid.VerificationStatus = "verified";
                                                existingVid.IsPublished = true;
                                                existingVid.UpdatedAt = _clock.UtcNow;
                                            }
                                            upsertedVideos++;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        await _auditWriter.WriteStaffAuditAsync(
            "curriculum_imported",
            "curriculum_catalog",
            "math-vietnam-catalog.v1",
            null,
            JsonSerializer.Serialize(new
            {
                subjects = upsertedSubjects,
                chapters = upsertedChapters,
                topics = upsertedTopics,
                lessons = upsertedLessons,
                videos = upsertedVideos,
                importedBy = currentUserId
            }),
            ct);

        await _db.SaveChangesAsync(ct);

        return new
        {
            success = true,
            mode = "applied",
            message = "Đã áp dụng toàn bộ danh mục Toán 10, 11, 12 và video bài học kiểm chứng thành công vào cơ sở dữ liệu.",
            counts = new
            {
                subjects = upsertedSubjects,
                chapters = upsertedChapters,
                topics = upsertedTopics,
                lessons = upsertedLessons,
                videos = upsertedVideos
            }
        };
    }

    public async Task<object> AuditAndCleanupTestCurriculumAsync(bool dryRun = true, string? currentUserId = null, CancellationToken ct = default)
    {
        var testSubjects = await _db.ContentSubjects
            .Where(s => s.Code.StartsWith("TEST_") || s.Code.StartsWith("SEC_") || s.Code.StartsWith("PHYS12_") || s.Name.Contains("kiểm thử"))
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
            .ToListAsync(ct);

        var preservedLessonIds = new HashSet<string>();
        var candidateLessons = testSubjects.SelectMany(s => s.Chapters).SelectMany(c => c.Lessons).ToList();

        foreach (var l in candidateLessons)
        {
            var hasProgress = await _db.LessonProgresses.AnyAsync(lp => lp.LessonId == l.Id, ct);
            var hasAttempts = await _db.AssessmentAttempts.AnyAsync(aa => aa.LessonId == l.Id, ct);
            var hasAssessments = await _db.ContentAssessments.AnyAsync(ca => ca.LessonId == l.Id, ct);

            if (hasProgress || hasAttempts || hasAssessments)
            {
                preservedLessonIds.Add(l.Id);
            }
        }

        if (dryRun)
        {
            return new
            {
                success = true,
                dryRun = true,
                testSubjectsCount = testSubjects.Count,
                candidateLessonsCount = candidateLessons.Count,
                preservedLessonsCount = preservedLessonIds.Count,
                preservedLessons = preservedLessonIds.ToList(),
                message = $"Báo cáo kiểm toán: Phát hiện {testSubjects.Count} môn học kiểm thử/fixture ({candidateLessons.Count} bài học). Có {preservedLessonIds.Count} bài học có dữ liệu người học nên được bảo vệ an toàn."
            };
        }

        int deactivatedCount = 0;
        foreach (var s in testSubjects)
        {
            bool hasPreservedInSubject = s.Chapters.SelectMany(c => c.Lessons).Any(l => preservedLessonIds.Contains(l.Id));
            if (!hasPreservedInSubject)
            {
                s.IsActive = false;
                s.UpdatedAt = _clock.UtcNow;
                deactivatedCount++;
            }
        }

        await _db.SaveChangesAsync(ct);

        return new
        {
            success = true,
            dryRun = false,
            deactivatedSubjectsCount = deactivatedCount,
            preservedLessonsCount = preservedLessonIds.Count,
            message = $"Đã lưu trữ an toàn (IsActive = false) {deactivatedCount} môn học kiểm thử; bảo toàn toàn vẹn {preservedLessonIds.Count} bài học có lịch sử học tập."
        };
    }
}
