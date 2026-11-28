using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using StudyAI.Data;
using StudyAI.Models;

namespace StudyAI.Features.Content;

public sealed class Math12DatasetImportResult
{
    public bool DryRun { get; set; }
    public int InsertCount { get; set; }
    public int UpdateCount { get; set; }
    public int UnchangedCount { get; set; }
    public int ConflictCount { get; set; }
    public int RejectedCount { get; set; }
    public List<string> ValidationErrors { get; set; } = new();
    public int LessonBlocksUpserted { get; set; }
    public int AssessmentsUpserted { get; set; }
    public int QuestionsUpserted { get; set; }
    public int MaterialsUpserted { get; set; }
    public int KnowledgeSourcesUpserted { get; set; }
    public int KnowledgeChunksUpserted { get; set; }
}

public sealed class Math12DatasetImportService
{
    private static readonly Regex CleanGuidDbRegex = new(
        @"^StudyAIDb_Clean_(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
        RegexOptions.Compiled);

    private readonly StudyAIDbContext _db;

    public Math12DatasetImportService(StudyAIDbContext db)
    {
        _db = db;
    }

    public async Task<Math12DatasetImportResult> ImportFromDirectoryAsync(
        string dataDir,
        bool dryRun = false,
        string createdByUserId = "",
        bool allowPublishInIsolatedTest = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dataDir) || !Directory.Exists(dataDir))
            throw new DirectoryNotFoundException($"Math 12 dataset directory not found: {dataDir}");

        // M12-001: Fail-closed database safety check before any read/write
        var isIsolatedCleanDb = EnsureSafeTargetDatabase(dryRun);

        // M12-003: Require explicit existing author/importer user
        if (string.IsNullOrWhiteSpace(createdByUserId) || !await _db.Users.AsNoTracking().AnyAsync(u => u.Id == createdByUserId, ct))
        {
            throw new ValidationException("CreatedByUserId", $"Importer user '{createdByUserId}' does not exist in dbo.users.");
        }

        // M12-005: Load and validate ALL dataset files in both dry-run and real mode
        var manifestPath = Path.Combine(dataDir, "manifest.json");
        var curriculumPath = Path.Combine(dataDir, "curriculum.json");
        if (!File.Exists(manifestPath) || !File.Exists(curriculumPath))
            throw new ValidationException("Manifest", "Missing required manifest.json or curriculum.json.");

        var manifest = LoadJson<ManifestSeedRoot>(manifestPath);
        if (string.IsNullOrWhiteSpace(manifest.Version) || manifest.SubjectId != "sub_math12")
            throw new ValidationException("Manifest", "Invalid manifest version or subjectId.");

        var curriculum = LoadJson<CurriculumSeedRoot>(curriculumPath);
        var blocks = LoadJson<List<BlockSeedItem>>(Path.Combine(dataDir, "lessons", "math12_lesson_blocks.json"));
        var assessments = LoadJson<List<AssessmentSeedItem>>(Path.Combine(dataDir, "assessments", "math12_assessments.json"));
        var questions = LoadJson<List<QuestionSeedItem>>(Path.Combine(dataDir, "questions", "math12_questions.json"));
        var materials = LoadJson<List<MaterialSeedItem>>(Path.Combine(dataDir, "materials", "math12_materials.json"));
        var kb = LoadJson<KnowledgeSeedRoot>(Path.Combine(dataDir, "knowledge", "math12_knowledge_base.json"));

        var result = new Math12DatasetImportResult { DryRun = dryRun };

        // Validate unique IDs & LessonContentBlock payloads via LessonContentBlockValidator
        var lessonIdSet = curriculum.Lessons.Select(l => l.Id).ToHashSet(StringComparer.Ordinal);
        var chapterIdSet = curriculum.Chapters.Select(c => c.Id).ToHashSet(StringComparer.Ordinal);
        var assessmentIdSet = assessments.Select(a => a.Id).ToHashSet(StringComparer.Ordinal);
        var seenBlockIds = new HashSet<string>(StringComparer.Ordinal);
        var seenQuestionIds = new HashSet<string>(StringComparer.Ordinal);

        for (int i = 0; i < blocks.Count; i++)
        {
            var b = blocks[i];
            if (!seenBlockIds.Add(b.Id))
                result.ValidationErrors.Add($"Duplicate block id '{b.Id}'.");
            if (!lessonIdSet.Contains(b.LessonId))
                result.ValidationErrors.Add($"Block '{b.Id}' references unknown lessonId '{b.LessonId}'.");
            try
            {
                LessonContentBlockValidator.ValidateAndNormalizePayload(
                    new LessonContentBlockInputDto(b.Id, b.BlockType, b.SchemaVersion, b.Payload, b.OrderIndex), i);
            }
            catch (ValidationException vex)
            {
                result.ValidationErrors.Add($"Block '{b.Id}': {vex.Message}");
            }
        }

        foreach (var q in questions)
        {
            if (!seenQuestionIds.Add(q.Id))
                result.ValidationErrors.Add($"Duplicate question id '{q.Id}'.");
            if (string.IsNullOrWhiteSpace(q.Prompt) || string.IsNullOrWhiteSpace(q.CorrectAnswer))
                result.ValidationErrors.Add($"Question '{q.Id}' missing prompt or correctAnswer.");
            if (!string.IsNullOrWhiteSpace(q.LessonId) && !lessonIdSet.Contains(q.LessonId))
                result.ValidationErrors.Add($"Question '{q.Id}' references unknown lessonId '{q.LessonId}'.");
            if (!string.IsNullOrWhiteSpace(q.ChapterId) && !chapterIdSet.Contains(q.ChapterId))
                result.ValidationErrors.Add($"Question '{q.Id}' references unknown chapterId '{q.ChapterId}'.");
            if (!string.IsNullOrWhiteSpace(q.AssessmentId) && !assessmentIdSet.Contains(q.AssessmentId))
                result.ValidationErrors.Add($"Question '{q.Id}' references unknown assessmentId '{q.AssessmentId}'.");
        }

        if (result.ValidationErrors.Count > 0)
        {
            result.RejectedCount = result.ValidationErrors.Count;
            throw new ValidationException("Dataset", string.Join(" | ", result.ValidationErrors.Take(5)));
        }

        // M12-004: Resolve subject strictly by unique business key Code ("MATH12") & Grade == "12"
        var existingSubject = await _db.ContentSubjects.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Code == "MATH12" && s.Grade == "12", ct);
        if (existingSubject == null && await _db.ContentSubjects.AsNoTracking().AnyAsync(s => s.Id == "sub_math12", ct))
        {
            throw new ValidationException("Subject", "Conflict: ID 'sub_math12' exists with a non-MATH12 code.");
        }
        var resolvedSubjectId = existingSubject?.Id ?? "sub_math12";

        // Publication safety: only allow published/indexed automatically in isolated StudyAIDb_Clean_{GUID} when explicitly requested
        var canPublish = isIsolatedCleanDb && allowPublishInIsolatedTest;
        string ResolveTargetStatus(string requested) =>
            canPublish && string.Equals(requested, "published", StringComparison.OrdinalIgnoreCase)
                ? "published"
                : "draft";

        // Load existing protected records for conflict/unchanged analysis (shared by dry-run and real run)
        var existingBlocks = await _db.LessonContentBlocks.ToDictionaryAsync(x => x.Id, StringComparer.Ordinal, ct);
        var existingAssessments = await _db.ContentAssessments.ToDictionaryAsync(x => x.Id, StringComparer.Ordinal, ct);
        var existingQuestions = await _db.ContentQuestions.ToDictionaryAsync(x => x.Id, StringComparer.Ordinal, ct);
        var existingMaterials = await _db.ContentMaterials.ToDictionaryAsync(x => x.Id, StringComparer.Ordinal, ct);
        var existingSources = await _db.AiKnowledgeSources.ToDictionaryAsync(x => x.Id, StringComparer.Ordinal, ct);
        var existingChunks = await _db.AiKnowledgeChunks.ToDictionaryAsync(x => x.Id, StringComparer.Ordinal, ct);

        if (dryRun)
        {
            foreach (var b in blocks)
            {
                var payloadJson = JsonSerializer.Serialize(b.Payload);
                var targetStatus = ResolveTargetStatus(b.Status);
                if (!existingBlocks.TryGetValue(b.Id, out var ex)) result.InsertCount++;
                else if (ex.Status == "published" || ex.Status == "approved")
                {
                    result.ConflictCount++;
                    result.ValidationErrors.Add($"Conflict: block '{b.Id}' is '{ex.Status}'.");
                }
                else if (ex.PayloadJson == payloadJson && ex.BlockType == b.BlockType && ex.OrderIndex == b.OrderIndex && ex.Status == targetStatus)
                    result.UnchangedCount++;
                else result.UpdateCount++;
            }
            foreach (var q in questions)
            {
                var optsJson = JsonSerializer.Serialize(q.Options ?? new List<string>());
                var targetStatus = ResolveTargetStatus(q.Status);
                if (!existingQuestions.TryGetValue(q.Id, out var ex)) result.InsertCount++;
                else if (ex.Status == "published" || ex.Status == "approved")
                {
                    result.ConflictCount++;
                    result.ValidationErrors.Add($"Conflict: question '{q.Id}' is '{ex.Status}'.");
                }
                else if (ex.Prompt == q.Prompt && ex.CorrectAnswer == q.CorrectAnswer && ex.OptionsJson == optsJson && ex.Status == targetStatus)
                    result.UnchangedCount++;
                else result.UpdateCount++;
            }
            foreach (var a in assessments)
            {
                if (!existingAssessments.TryGetValue(a.Id, out var ex)) result.InsertCount++;
                else if (ex.Status == "published" || ex.Status == "approved") result.ConflictCount++;
                else if (ex.Title == a.Title && ex.PassScore == a.PassScore && ex.DurationMinutes == a.DurationMinutes) result.UnchangedCount++;
                else result.UpdateCount++;
            }
            foreach (var m in materials)
            {
                var targetStatus = ResolveTargetStatus(m.Status);
                if (!existingMaterials.TryGetValue(m.Id, out var ex)) result.InsertCount++;
                else if (ex.Status == "published" || ex.Status == "approved") result.ConflictCount++;
                else if (ex.Title == m.Title && ex.Status == targetStatus) result.UnchangedCount++;
                else result.UpdateCount++;
            }
            foreach (var s in kb.Sources)
            {
                if (!existingSources.TryGetValue(s.Id, out var ex)) result.InsertCount++;
                else if (ex.Status == "indexed") result.ConflictCount++;
                else result.UnchangedCount++;
            }
            foreach (var c in kb.Chunks)
            {
                if (!existingChunks.TryGetValue(c.Id, out _)) result.InsertCount++;
                else result.UnchangedCount++;
            }
            return result;
        }

        var writtenFiles = new List<string>();
        async Task ExecuteImportAsync()
        {
            var now = DateTimeOffset.UtcNow;

            if (existingSubject == null)
            {
                _db.ContentSubjects.Add(new ContentSubject
                {
                    Id = resolvedSubjectId,
                    Code = "MATH12",
                    Name = "Toán 12",
                    Grade = "12",
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                });
                await _db.SaveChangesAsync(ct);
            }

            foreach (var ch in curriculum.Chapters)
            {
                if (!await _db.ContentChapters.AnyAsync(c => c.Id == ch.Id, ct))
                {
                    _db.ContentChapters.Add(new ContentChapter
                    {
                        Id = ch.Id,
                        SubjectId = resolvedSubjectId,
                        Title = ch.Title,
                        OrderIndex = ch.OrderIndex,
                        IsActive = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }
            await _db.SaveChangesAsync(ct);

            foreach (var les in curriculum.Lessons)
            {
                if (!await _db.ContentLessons.AnyAsync(l => l.Id == les.Id, ct))
                {
                    _db.ContentLessons.Add(new ContentLesson
                    {
                        Id = les.Id,
                        ChapterId = les.ChapterId,
                        Title = les.Title,
                        Slug = les.Id.Replace('_', '-'),
                        OrderIndex = les.OrderIndex,
                        Status = canPublish ? "published" : "draft",
                        AuthorId = createdByUserId,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }
            await _db.SaveChangesAsync(ct);

            // 1. Lesson content blocks
            foreach (var b in blocks)
            {
                var payloadJson = JsonSerializer.Serialize(b.Payload);
                var targetStatus = ResolveTargetStatus(b.Status);
                if (!existingBlocks.TryGetValue(b.Id, out var ex))
                {
                    _db.LessonContentBlocks.Add(new LessonContentBlock
                    {
                        Id = b.Id,
                        LessonId = b.LessonId,
                        BlockType = b.BlockType,
                        SchemaVersion = b.SchemaVersion,
                        PayloadJson = payloadJson,
                        OrderIndex = b.OrderIndex,
                        Status = targetStatus,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                    result.InsertCount++;
                    result.LessonBlocksUpserted++;
                }
                else if (ex.Status == "published" || ex.Status == "approved")
                {
                    result.ConflictCount++;
                    result.ValidationErrors.Add($"Conflict: block '{b.Id}' is '{ex.Status}'.");
                }
                else if (ex.PayloadJson == payloadJson && ex.BlockType == b.BlockType && ex.OrderIndex == b.OrderIndex && ex.Status == targetStatus)
                {
                    result.UnchangedCount++;
                }
                else
                {
                    ex.BlockType = b.BlockType;
                    ex.PayloadJson = payloadJson;
                    ex.OrderIndex = b.OrderIndex;
                    ex.Status = targetStatus;
                    ex.UpdatedAt = now;
                    result.UpdateCount++;
                    result.LessonBlocksUpserted++;
                }
            }

            // 2. Assessments
            foreach (var a in assessments)
            {
                var targetStatus = ResolveTargetStatus(a.Status);
                if (!existingAssessments.TryGetValue(a.Id, out var ex))
                {
                    _db.ContentAssessments.Add(new ContentAssessment
                    {
                        Id = a.Id,
                        LessonId = a.LessonId,
                        Title = a.Title,
                        PassScore = a.PassScore,
                        DurationMinutes = a.DurationMinutes,
                        Status = targetStatus,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                    result.InsertCount++;
                    result.AssessmentsUpserted++;
                }
                else if (ex.Status == "published" || ex.Status == "approved")
                {
                    result.ConflictCount++;
                    result.ValidationErrors.Add($"Conflict: assessment '{a.Id}' is '{ex.Status}'.");
                }
                else if (ex.Title == a.Title && ex.PassScore == a.PassScore && ex.DurationMinutes == a.DurationMinutes && ex.Status == targetStatus)
                {
                    result.UnchangedCount++;
                }
                else
                {
                    ex.Title = a.Title;
                    ex.PassScore = a.PassScore;
                    ex.DurationMinutes = a.DurationMinutes;
                    ex.Status = targetStatus;
                    ex.UpdatedAt = now;
                    result.UpdateCount++;
                    result.AssessmentsUpserted++;
                }
            }

            // 3. Questions (preserve existing published/approved and vnhsge rows)
            foreach (var q in questions)
            {
                var optionsJson = JsonSerializer.Serialize(q.Options ?? new List<string>());
                var metaJson = q.Metadata != null ? JsonSerializer.Serialize(q.Metadata) : null;
                var targetStatus = ResolveTargetStatus(q.Status);
                if (!existingQuestions.TryGetValue(q.Id, out var ex))
                {
                    _db.ContentQuestions.Add(new ContentQuestion
                    {
                        Id = q.Id,
                        AssessmentId = q.AssessmentId,
                        LessonId = q.LessonId,
                        SubjectId = resolvedSubjectId,
                        ChapterId = q.ChapterId,
                        Grade = "12",
                        Type = q.Type,
                        Difficulty = q.Difficulty,
                        Prompt = q.Prompt,
                        OptionsJson = optionsJson,
                        CorrectAnswer = q.CorrectAnswer,
                        Explanation = q.Explanation,
                        MetadataJson = metaJson,
                        Status = targetStatus,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                    result.InsertCount++;
                    result.QuestionsUpserted++;
                }
                else if (ex.Status == "published" || ex.Status == "approved")
                {
                    result.ConflictCount++;
                    result.ValidationErrors.Add($"Conflict: question '{q.Id}' is '{ex.Status}'.");
                }
                else if (ex.Prompt == q.Prompt && ex.CorrectAnswer == q.CorrectAnswer && ex.OptionsJson == optionsJson && ex.Status == targetStatus)
                {
                    result.UnchangedCount++;
                }
                else
                {
                    ex.AssessmentId = q.AssessmentId;
                    ex.LessonId = q.LessonId;
                    ex.SubjectId = resolvedSubjectId;
                    ex.Type = q.Type;
                    ex.Difficulty = q.Difficulty;
                    ex.Prompt = q.Prompt;
                    ex.OptionsJson = optionsJson;
                    ex.CorrectAnswer = q.CorrectAnswer;
                    ex.Explanation = q.Explanation;
                    ex.MetadataJson = metaJson;
                    ex.Status = targetStatus;
                    ex.UpdatedAt = now;
                    result.UpdateCount++;
                    result.QuestionsUpserted++;
                }
            }

            // 4. Real Material Files on Disk (R09-03)
            var uploadRoot = Path.Combine(AppContext.BaseDirectory, "App_Data", "uploads", "content-materials");
            Directory.CreateDirectory(uploadRoot);
            foreach (var m in materials)
            {
                var safeName = Path.GetFileName(m.FileName);
                var fileContent = $"# {m.Title}\n\n{m.ExtractedText ?? string.Empty}\n";
                var bytes = Encoding.UTF8.GetBytes(fileContent);
                var sha = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
                var targetStatus = ResolveTargetStatus(m.Status);
                var ext = Path.GetExtension(safeName);
                var safeExt = string.IsNullOrWhiteSpace(ext) ? ".bin" : Regex.Replace(ext.ToLowerInvariant(), @"[^a-z0-9.]", "");
                var physicalPath = Path.Combine(uploadRoot, $"{m.Id}{safeExt}");

                if (!File.Exists(physicalPath) || !existingMaterials.TryGetValue(m.Id, out var existingMat) || existingMat.FileHashSha256 != sha)
                {
                    await File.WriteAllBytesAsync(physicalPath, bytes, ct);
                    writtenFiles.Add(physicalPath);
                }

                if (!existingMaterials.TryGetValue(m.Id, out var ex))
                {
                    _db.ContentMaterials.Add(new ContentMaterial
                    {
                        Id = m.Id,
                        Title = m.Title,
                        Category = m.Category,
                        ChapterCode = m.ChapterCode,
                        ChapterTitle = m.ChapterTitle,
                        FileName = safeName,
                        MimeType = m.MimeType,
                        FileSizeBytes = bytes.LongLength,
                        FileHashSha256 = sha,
                        StoragePathOrUrl = $"/api/v1/content/workspace/materials/{m.Id}/download",
                        ExtractedText = m.ExtractedText,
                        Status = targetStatus,
                        CreatedByUserId = createdByUserId,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                    result.InsertCount++;
                    result.MaterialsUpserted++;
                }
                else if (ex.FileHashSha256 == sha && ex.Status == targetStatus && ex.Title == m.Title)
                {
                    result.UnchangedCount++;
                }
                else
                {
                    ex.Title = m.Title;
                    ex.ExtractedText = m.ExtractedText;
                    ex.FileSizeBytes = bytes.LongLength;
                    ex.FileHashSha256 = sha;
                    ex.Status = targetStatus;
                    ex.UpdatedAt = now;
                    result.UpdateCount++;
                    result.MaterialsUpserted++;
                }
            }

            // 5. Knowledge sources & chunks
            foreach (var s in kb.Sources)
            {
                var targetStatus = canPublish && string.Equals(s.Status, "indexed", StringComparison.OrdinalIgnoreCase) ? "indexed" : "pending";
                if (!existingSources.TryGetValue(s.Id, out var ex))
                {
                    _db.AiKnowledgeSources.Add(new AiKnowledgeSource
                    {
                        Id = s.Id,
                        SourceType = s.SourceType,
                        SourceRefId = s.SourceRefId,
                        Title = s.Title,
                        Status = targetStatus,
                        ChunkCount = s.ChunkCount,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                    result.InsertCount++;
                    result.KnowledgeSourcesUpserted++;
                }
                else if (ex.Title == s.Title && ex.Status == targetStatus && ex.ChunkCount == s.ChunkCount)
                {
                    result.UnchangedCount++;
                }
                else
                {
                    ex.Title = s.Title;
                    ex.Status = targetStatus;
                    ex.ChunkCount = s.ChunkCount;
                    ex.UpdatedAt = now;
                    result.UpdateCount++;
                    result.KnowledgeSourcesUpserted++;
                }
            }

            foreach (var c in kb.Chunks)
            {
                if (!existingChunks.TryGetValue(c.Id, out var ex))
                {
                    _db.AiKnowledgeChunks.Add(new AiKnowledgeChunk
                    {
                        Id = c.Id,
                        SourceId = c.SourceId,
                        ChunkIndex = c.ChunkIndex,
                        Title = c.Title,
                        ContentText = c.ContentText,
                        CreatedAt = now
                    });
                    result.InsertCount++;
                    result.KnowledgeChunksUpserted++;
                }
                else if (ex.Title == c.Title && ex.ContentText == c.ContentText)
                {
                    result.UnchangedCount++;
                }
                else
                {
                    ex.Title = c.Title;
                    ex.ContentText = c.ContentText;
                    result.UpdateCount++;
                    result.KnowledgeChunksUpserted++;
                }
            }

            await _db.SaveChangesAsync(ct);
        }

        try
        {
            if (_db.Database.IsRelational() && _db.Database.CurrentTransaction == null)
            {
                var strategy = _db.Database.CreateExecutionStrategy();
                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _db.Database.BeginTransactionAsync(ct);
                    await ExecuteImportAsync();
                    await tx.CommitAsync(ct);
                });
            }
            else
            {
                await ExecuteImportAsync();
            }
        }
        catch
        {
            foreach (var fp in writtenFiles)
            {
                try { if (File.Exists(fp)) File.Delete(fp); } catch { }
            }
            throw;
        }

        return result;
    }

    private bool EnsureSafeTargetDatabase(bool dryRun)
    {
        if (!_db.Database.IsRelational()) return false;
        var connStr = _db.Database.GetConnectionString() ?? string.Empty;
        var builder = new SqlConnectionStringBuilder(connStr);
        var dbName = builder.InitialCatalog ?? string.Empty;

        if (CleanGuidDbRegex.IsMatch(dbName))
            return true;

        if (dryRun)
            return false;

        throw new InvalidOperationException(
            $"DB_SAFETY_VIOLATION: Math12DatasetImportService refuses to write to '{dbName}'. Only isolated StudyAIDb_Clean_{{GUID}} is permitted.");
    }

    private static T LoadJson<T>(string path)
    {
        var json = File.ReadAllText(path, Encoding.UTF8);
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? throw new InvalidOperationException($"Failed to deserialize {path}");
    }

    private sealed class ManifestSeedRoot { public string Version { get; set; } = ""; public string SubjectId { get; set; } = ""; }
    private sealed class CurriculumSeedRoot { public List<ChapterSeedItem> Chapters { get; set; } = new(); public List<LessonSeedItem> Lessons { get; set; } = new(); }
    private sealed class ChapterSeedItem { public string Id { get; set; } = ""; public string Title { get; set; } = ""; public int OrderIndex { get; set; } }
    private sealed class LessonSeedItem { public string Id { get; set; } = ""; public string ChapterId { get; set; } = ""; public string Title { get; set; } = ""; public int OrderIndex { get; set; } }
    private sealed class BlockSeedItem { public string Id { get; set; } = ""; public string LessonId { get; set; } = ""; public string BlockType { get; set; } = "markdown"; public int SchemaVersion { get; set; } = 1; public int OrderIndex { get; set; } public string Status { get; set; } = "draft"; public JsonElement Payload { get; set; } }
    private sealed class AssessmentSeedItem { public string Id { get; set; } = ""; public string LessonId { get; set; } = ""; public string Title { get; set; } = ""; public int PassScore { get; set; } = 70; public int DurationMinutes { get; set; } = 20; public string Status { get; set; } = "draft"; }
    private sealed class QuestionSeedItem { public string Id { get; set; } = ""; public string? AssessmentId { get; set; } public string? LessonId { get; set; } public string? SubjectId { get; set; } public string? ChapterId { get; set; } public string Type { get; set; } = "multiple-choice"; public string Difficulty { get; set; } = "medium"; public string Prompt { get; set; } = ""; public List<string>? Options { get; set; } public string CorrectAnswer { get; set; } = ""; public string? Explanation { get; set; } public object? Metadata { get; set; } public string Status { get; set; } = "draft"; }
    private sealed class MaterialSeedItem { public string Id { get; set; } = ""; public string Title { get; set; } = ""; public string Category { get; set; } = "chapter_doc"; public string? ChapterCode { get; set; } public string? ChapterTitle { get; set; } public string FileName { get; set; } = ""; public string MimeType { get; set; } = "text/markdown"; public string? ExtractedText { get; set; } public string Status { get; set; } = "draft"; }
    private sealed class KnowledgeSeedRoot { public List<KnowledgeSourceSeedItem> Sources { get; set; } = new(); public List<KnowledgeChunkSeedItem> Chunks { get; set; } = new(); }
    private sealed class KnowledgeSourceSeedItem { public string Id { get; set; } = ""; public string SourceType { get; set; } = "material"; public string SourceRefId { get; set; } = ""; public string Title { get; set; } = ""; public string Status { get; set; } = "pending"; public int ChunkCount { get; set; } }
    private sealed class KnowledgeChunkSeedItem { public string Id { get; set; } = ""; public string SourceId { get; set; } = ""; public int ChunkIndex { get; set; } public string Title { get; set; } = ""; public string ContentText { get; set; } = ""; }
}
