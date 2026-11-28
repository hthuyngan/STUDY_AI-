using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StudyAI.Data;
using StudyAI.Models;

namespace StudyAI.Features.Content;

public sealed class Math12DatasetImportResult
{
    public bool DryRun { get; set; }
    public int LessonBlocksUpserted { get; set; }
    public int AssessmentsUpserted { get; set; }
    public int QuestionsUpserted { get; set; }
    public int MaterialsUpserted { get; set; }
    public int KnowledgeSourcesUpserted { get; set; }
    public int KnowledgeChunksUpserted { get; set; }
}

public sealed class Math12DatasetImportService
{
    private readonly StudyAIDbContext _db;

    public Math12DatasetImportService(StudyAIDbContext db)
    {
        _db = db;
    }

    public async Task<Math12DatasetImportResult> ImportFromDirectoryAsync(
        string dataDir,
        bool dryRun = false,
        string createdByUserId = "system-importer",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dataDir) || !Directory.Exists(dataDir))
            throw new DirectoryNotFoundException($"Math 12 dataset directory not found: {dataDir}");

        var blocks = LoadJson<List<BlockSeedItem>>(Path.Combine(dataDir, "lessons", "math12_lesson_blocks.json"));
        var assessments = LoadJson<List<AssessmentSeedItem>>(Path.Combine(dataDir, "assessments", "math12_assessments.json"));
        var questions = LoadJson<List<QuestionSeedItem>>(Path.Combine(dataDir, "questions", "math12_questions.json"));
        var materials = LoadJson<List<MaterialSeedItem>>(Path.Combine(dataDir, "materials", "math12_materials.json"));
        var kb = LoadJson<KnowledgeSeedRoot>(Path.Combine(dataDir, "knowledge", "math12_knowledge_base.json"));

        var result = new Math12DatasetImportResult { DryRun = dryRun };

        if (dryRun)
        {
            result.LessonBlocksUpserted = blocks.Count;
            result.AssessmentsUpserted = assessments.Count;
            result.QuestionsUpserted = questions.Count;
            result.MaterialsUpserted = materials.Count;
            result.KnowledgeSourcesUpserted = kb.Sources.Count;
            result.KnowledgeChunksUpserted = kb.Chunks.Count;
            return result;
        }

        async Task ExecuteImportAsync()
        {
            var now = DateTimeOffset.UtcNow;

            // Ensure subject & chapters/lessons exist if running against a fresh isolated DB
            if (!await _db.ContentSubjects.AnyAsync(s => s.Id == "sub_math12", ct))
            {
                _db.ContentSubjects.Add(new ContentSubject
                {
                    Id = "sub_math12",
                    Code = "MATH12",
                    Name = "Toán 12",
                    Grade = "12",
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                });
                await _db.SaveChangesAsync(ct);
            }

            var curriculum = LoadJson<CurriculumSeedRoot>(Path.Combine(dataDir, "curriculum.json"));
            foreach (var ch in curriculum.Chapters)
            {
                if (!await _db.ContentChapters.AnyAsync(c => c.Id == ch.Id, ct))
                {
                    _db.ContentChapters.Add(new ContentChapter
                    {
                        Id = ch.Id,
                        SubjectId = "sub_math12",
                        Title = ch.Title,
                        OrderIndex = ch.OrderIndex,
                        IsActive = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }
            await _db.SaveChangesAsync(ct);

            var fallbackAuthorId = await _db.Users.Select(u => u.Id).FirstOrDefaultAsync(ct);
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
                        Status = "published",
                        AuthorId = fallbackAuthorId,
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
                var existing = await _db.LessonContentBlocks.FirstOrDefaultAsync(x => x.Id == b.Id, ct);
                if (existing == null)
                {
                    _db.LessonContentBlocks.Add(new LessonContentBlock
                    {
                        Id = b.Id,
                        LessonId = b.LessonId,
                        BlockType = b.BlockType,
                        SchemaVersion = b.SchemaVersion,
                        PayloadJson = payloadJson,
                        OrderIndex = b.OrderIndex,
                        Status = b.Status,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
                else
                {
                    existing.BlockType = b.BlockType;
                    existing.PayloadJson = payloadJson;
                    existing.OrderIndex = b.OrderIndex;
                    existing.Status = b.Status;
                    existing.UpdatedAt = now;
                }
                result.LessonBlocksUpserted++;
            }

            // 2. Assessments
            foreach (var a in assessments)
            {
                var existing = await _db.ContentAssessments.FirstOrDefaultAsync(x => x.Id == a.Id, ct);
                if (existing == null)
                {
                    _db.ContentAssessments.Add(new ContentAssessment
                    {
                        Id = a.Id,
                        LessonId = a.LessonId,
                        Title = a.Title,
                        PassScore = a.PassScore,
                        DurationMinutes = a.DurationMinutes,
                        Status = a.Status,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
                else
                {
                    existing.Title = a.Title;
                    existing.PassScore = a.PassScore;
                    existing.DurationMinutes = a.DurationMinutes;
                    existing.Status = a.Status;
                    existing.UpdatedAt = now;
                }
                result.AssessmentsUpserted++;
            }

            // 3. Questions (never touch vnhsge draft rows)
            foreach (var q in questions)
            {
                var optionsJson = JsonSerializer.Serialize(q.Options ?? new List<string>());
                var metaJson = q.Metadata != null ? JsonSerializer.Serialize(q.Metadata) : null;
                var existing = await _db.ContentQuestions.FirstOrDefaultAsync(x => x.Id == q.Id, ct);
                if (existing == null)
                {
                    _db.ContentQuestions.Add(new ContentQuestion
                    {
                        Id = q.Id,
                        AssessmentId = q.AssessmentId,
                        LessonId = q.LessonId,
                        SubjectId = q.SubjectId,
                        ChapterId = q.ChapterId,
                        Grade = "12",
                        Type = q.Type,
                        Difficulty = q.Difficulty,
                        Prompt = q.Prompt,
                        OptionsJson = optionsJson,
                        CorrectAnswer = q.CorrectAnswer,
                        Explanation = q.Explanation,
                        MetadataJson = metaJson,
                        Status = q.Status,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
                else
                {
                    existing.AssessmentId = q.AssessmentId;
                    existing.LessonId = q.LessonId;
                    existing.Type = q.Type;
                    existing.Difficulty = q.Difficulty;
                    existing.Prompt = q.Prompt;
                    existing.OptionsJson = optionsJson;
                    existing.CorrectAnswer = q.CorrectAnswer;
                    existing.Explanation = q.Explanation;
                    existing.MetadataJson = metaJson;
                    existing.Status = q.Status;
                    existing.UpdatedAt = now;
                }
                result.QuestionsUpserted++;
            }

            // 4. Materials
            foreach (var m in materials)
            {
                var bytes = Encoding.UTF8.GetBytes(m.ExtractedText ?? string.Empty);
                var sha = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
                var existing = await _db.ContentMaterials.FirstOrDefaultAsync(x => x.Id == m.Id, ct);
                if (existing == null)
                {
                    _db.ContentMaterials.Add(new ContentMaterial
                    {
                        Id = m.Id,
                        Title = m.Title,
                        Category = m.Category,
                        ChapterCode = m.ChapterCode,
                        ChapterTitle = m.ChapterTitle,
                        FileName = m.FileName,
                        MimeType = m.MimeType,
                        FileSizeBytes = bytes.LongLength,
                        FileHashSha256 = sha,
                        StoragePathOrUrl = $"/api/v1/content/workspace/materials/{m.Id}/download",
                        ExtractedText = m.ExtractedText,
                        Status = m.Status,
                        CreatedByUserId = createdByUserId,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
                else
                {
                    existing.Title = m.Title;
                    existing.ExtractedText = m.ExtractedText;
                    existing.Status = m.Status;
                    existing.UpdatedAt = now;
                }
                result.MaterialsUpserted++;
            }

            // 5. Knowledge sources & chunks
            foreach (var s in kb.Sources)
            {
                var existing = await _db.AiKnowledgeSources.FirstOrDefaultAsync(x => x.Id == s.Id, ct);
                if (existing == null)
                {
                    _db.AiKnowledgeSources.Add(new AiKnowledgeSource
                    {
                        Id = s.Id,
                        SourceType = s.SourceType,
                        SourceRefId = s.SourceRefId,
                        Title = s.Title,
                        Status = s.Status,
                        ChunkCount = s.ChunkCount,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
                else
                {
                    existing.Title = s.Title;
                    existing.Status = s.Status;
                    existing.ChunkCount = s.ChunkCount;
                    existing.UpdatedAt = now;
                }
                result.KnowledgeSourcesUpserted++;
            }

            foreach (var c in kb.Chunks)
            {
                var existing = await _db.AiKnowledgeChunks.FirstOrDefaultAsync(x => x.Id == c.Id, ct);
                if (existing == null)
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
                }
                else
                {
                    existing.Title = c.Title;
                    existing.ContentText = c.ContentText;
                }
                result.KnowledgeChunksUpserted++;
            }

            await _db.SaveChangesAsync(ct);
        }

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

        return result;
    }

    private static T LoadJson<T>(string path)
    {
        var json = File.ReadAllText(path, Encoding.UTF8);
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? throw new InvalidOperationException($"Failed to deserialize {path}");
    }

    private sealed class CurriculumSeedRoot
    {
        public List<ChapterSeedItem> Chapters { get; set; } = new();
        public List<LessonSeedItem> Lessons { get; set; } = new();
    }
    private sealed class ChapterSeedItem { public string Id { get; set; } = ""; public string Title { get; set; } = ""; public int OrderIndex { get; set; } }
    private sealed class LessonSeedItem { public string Id { get; set; } = ""; public string ChapterId { get; set; } = ""; public string Title { get; set; } = ""; public int OrderIndex { get; set; } }
    private sealed class BlockSeedItem { public string Id { get; set; } = ""; public string LessonId { get; set; } = ""; public string BlockType { get; set; } = "markdown"; public int SchemaVersion { get; set; } = 1; public int OrderIndex { get; set; } public string Status { get; set; } = "published"; public JsonElement Payload { get; set; } }
    private sealed class AssessmentSeedItem { public string Id { get; set; } = ""; public string LessonId { get; set; } = ""; public string Title { get; set; } = ""; public int PassScore { get; set; } = 70; public int DurationMinutes { get; set; } = 20; public string Status { get; set; } = "published"; }
    private sealed class QuestionSeedItem { public string Id { get; set; } = ""; public string? AssessmentId { get; set; } public string? LessonId { get; set; } public string? SubjectId { get; set; } public string? ChapterId { get; set; } public string Type { get; set; } = "multiple-choice"; public string Difficulty { get; set; } = "medium"; public string Prompt { get; set; } = ""; public List<string>? Options { get; set; } public string CorrectAnswer { get; set; } = ""; public string? Explanation { get; set; } public object? Metadata { get; set; } public string Status { get; set; } = "published"; }
    private sealed class MaterialSeedItem { public string Id { get; set; } = ""; public string Title { get; set; } = ""; public string Category { get; set; } = "chapter_doc"; public string? ChapterCode { get; set; } public string? ChapterTitle { get; set; } public string FileName { get; set; } = ""; public string MimeType { get; set; } = "text/markdown"; public string? ExtractedText { get; set; } public string Status { get; set; } = "published"; }
    private sealed class KnowledgeSeedRoot { public List<KnowledgeSourceSeedItem> Sources { get; set; } = new(); public List<KnowledgeChunkSeedItem> Chunks { get; set; } = new(); }
    private sealed class KnowledgeSourceSeedItem { public string Id { get; set; } = ""; public string SourceType { get; set; } = "material"; public string SourceRefId { get; set; } = ""; public string Title { get; set; } = ""; public string Status { get; set; } = "indexed"; public int ChunkCount { get; set; } }
    private sealed class KnowledgeChunkSeedItem { public string Id { get; set; } = ""; public string SourceId { get; set; } = ""; public int ChunkIndex { get; set; } public string Title { get; set; } = ""; public string ContentText { get; set; } = ""; }
}
