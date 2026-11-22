using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace StudyAI.Features.Student;

public class StudentCurriculumService : ILearnerCurriculumService
{
    private readonly IApplicationDbContext _db;
    private readonly IAuditWriter _auditWriter;
    private readonly IMemoryCache? _cache;
    private readonly ILogger<LearnerCurriculumService>? _logger;

    public StudentCurriculumService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IMemoryCache? cache = null,
        ILogger<LearnerCurriculumService>? logger = null)
    {
        _db = db;
        _auditWriter = auditWriter;
        _cache = cache;
        _logger = logger;
    }

    private static JsonArray SafeJsonArray(string? val)
    {
        if (string.IsNullOrEmpty(val)) return new JsonArray();
        try { return JsonNode.Parse(val) as JsonArray ?? new JsonArray(); } catch { return new JsonArray(); }
    }

    private static List<string> SafeDeserializeStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    public async Task<List<LearnerSubjectDto>> GetSubjectsAsync(string? grade = null, string? search = null, CancellationToken ct = default)
    {
        var query = _db.ContentSubjects
            .Where(s => s.IsActive && !s.Code.StartsWith("TEST_") && !s.Code.StartsWith("SEC_") && !s.Code.StartsWith("PHYS12_") && !s.Code.StartsWith("SUB_") && !s.Code.StartsWith("VID-") && !s.Code.StartsWith("PERF_") && !s.Name.Contains("kiểm thử"))
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(grade) && grade != "all")
        {
            query = query.Where(s => s.Grade == grade);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) || s.Code.ToLower().Contains(term));
        }

        var subjects = await query
            .OrderBy(s => s.OrderIndex)
            .ThenBy(s => s.Code)
            .ToListAsync(ct);

        return subjects.Select(s =>
        {
            var activeChapters = s.Chapters.Where(c => c.IsActive).ToList();
            var publishedLessonCount = activeChapters
                .SelectMany(c => c.Lessons)
                .Count(l => l.Status == "published");

            return new LearnerSubjectDto
            {
                Id = s.Id,
                Name = s.Name,
                Code = s.Code,
                Grade = s.Grade,
                Description = s.Description ?? string.Empty,
                OrderIndex = s.OrderIndex,
                ChapterCount = activeChapters.Count,
                LessonCount = publishedLessonCount
            };
        }).ToList();
    }

    public async Task<LearnerSubjectWithChaptersDto> GetSubjectDetailAsync(string subjectId, CancellationToken ct = default)
    {
        var subject = await _db.ContentSubjects
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Topics)
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
                    .ThenInclude(l => l.Topic)
            .Include(s => s.Chapters)
                .ThenInclude(c => c.Lessons)
                    .ThenInclude(l => l.Videos)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => (s.Id == subjectId || s.Code == subjectId || s.Code.ToLower() == subjectId.ToLower()) && s.IsActive, ct);

        if (subject == null)
            throw new NotFoundException($"Môn học '{subjectId}' không tồn tại hoặc đã ngừng kích hoạt.");

        var activeChapters = subject.Chapters
            .Where(c => c.IsActive)
            .OrderBy(c => c.OrderIndex)
            .Select(c =>
            {
                var publishedLessons = c.Lessons
                    .Where(l => l.Status == "published")
                    .OrderBy(l => l.OrderIndex)
                    .Select(l =>
                    {
                        var primaryVideo = l.Videos.FirstOrDefault(v => v.IsPublished && v.EmbedAllowed);
                        return new LearnerLessonSummaryDto
                        {
                            Id = l.Id,
                            TopicId = l.TopicId,
                            TopicTitle = l.Topic?.Title,
                            Title = l.Title,
                            Slug = l.Slug,
                            OrderIndex = l.OrderIndex,
                            Status = l.Status,
                            ContentType = "video",
                            HasVideo = l.Videos.Any(v => v.IsPublished),
                            VideoProvider = primaryVideo?.Provider ?? (l.Videos.Any() ? "youtube" : null),
                            YouTubeVideoId = primaryVideo?.YouTubeVideoId
                        };
                    })
                    .ToList();

                var activeTopics = c.Topics
                    .Where(t => t.IsActive)
                    .OrderBy(t => t.OrderIndex)
                    .Select(t => new LearnerTopicDto
                    {
                        Id = t.Id,
                        ChapterId = t.ChapterId,
                        Title = t.Title,
                        Description = t.Description ?? string.Empty,
                        OrderIndex = t.OrderIndex,
                        Lessons = publishedLessons.Where(l => l.TopicId == t.Id).ToList()
                    })
                    .ToList();

                return new LearnerChapterDto
                {
                    Id = c.Id,
                    SubjectId = c.SubjectId,
                    Title = c.Title,
                    Description = c.Description ?? string.Empty,
                    OrderIndex = c.OrderIndex,
                    Status = c.Status,
                    SourceName = c.SourceName,
                    SourceUrl = c.SourceUrl,
                    Topics = activeTopics,
                    Lessons = publishedLessons
                };
            })
            .ToList();

        var totalPublishedLessons = activeChapters.Sum(c => c.Lessons.Count);

        return new LearnerSubjectWithChaptersDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Code = subject.Code,
            Grade = subject.Grade,
            Description = subject.Description ?? string.Empty,
            OrderIndex = subject.OrderIndex,
            ChapterCount = activeChapters.Count,
            LessonCount = totalPublishedLessons,
            Chapters = activeChapters
        };
    }

    public async Task<List<LearnerChapterDto>> GetSubjectChaptersAsync(string subjectId, CancellationToken ct = default)
    {
        var subject = await _db.ContentSubjects
            .AsNoTracking()
            .FirstOrDefaultAsync(s => (s.Id == subjectId || s.Code == subjectId || s.Code.ToLower() == subjectId.ToLower()) && s.IsActive, ct);

        if (subject == null)
            throw new NotFoundException($"Môn học '{subjectId}' không tồn tại hoặc đã ngừng kích hoạt.");

        var chapters = await _db.ContentChapters
            .Where(c => c.SubjectId == subject.Id && c.IsActive)
            .Include(c => c.Topics)
            .Include(c => c.Lessons.Where(l => l.Status == "published"))
                .ThenInclude(l => l.Topic)
            .Include(c => c.Lessons.Where(l => l.Status == "published"))
                .ThenInclude(l => l.Videos)
            .AsNoTracking()
            .OrderBy(c => c.OrderIndex)
            .ToListAsync(ct);

        return chapters.Select(c =>
        {
            var publishedLessons = c.Lessons
                .OrderBy(l => l.OrderIndex)
                .Select(l =>
                {
                    var primaryVideo = l.Videos.FirstOrDefault(v => v.IsPublished && v.EmbedAllowed);
                    return new LearnerLessonSummaryDto
                    {
                        Id = l.Id,
                        TopicId = l.TopicId,
                        TopicTitle = l.Topic?.Title,
                        Title = l.Title,
                        Slug = l.Slug,
                        OrderIndex = l.OrderIndex,
                        Status = l.Status,
                        ContentType = "video",
                        HasVideo = l.Videos.Any(v => v.IsPublished),
                        VideoProvider = primaryVideo?.Provider ?? (l.Videos.Any() ? "youtube" : null),
                        YouTubeVideoId = primaryVideo?.YouTubeVideoId
                    };
                })
                .ToList();

            var activeTopics = c.Topics
                .Where(t => t.IsActive)
                .OrderBy(t => t.OrderIndex)
                .Select(t => new LearnerTopicDto
                {
                    Id = t.Id,
                    ChapterId = t.ChapterId,
                    Title = t.Title,
                    Description = t.Description ?? string.Empty,
                    OrderIndex = t.OrderIndex,
                    Lessons = publishedLessons.Where(l => l.TopicId == t.Id).ToList()
                })
                .ToList();

            return new LearnerChapterDto
            {
                Id = c.Id,
                SubjectId = c.SubjectId,
                Title = c.Title,
                Description = c.Description ?? string.Empty,
                OrderIndex = c.OrderIndex,
                Status = c.Status,
                SourceName = c.SourceName,
                SourceUrl = c.SourceUrl,
                Topics = activeTopics,
                Lessons = publishedLessons
            };
        }).ToList();
    }

    public async Task<LearnerChapterDto> GetChapterDetailAsync(string chapterId, CancellationToken ct = default)
    {
        var chapter = await _db.ContentChapters
            .Include(c => c.Subject)
            .Include(c => c.Topics)
            .Include(c => c.Lessons.Where(l => l.Status == "published"))
                .ThenInclude(l => l.Topic)
            .Include(c => c.Lessons.Where(l => l.Status == "published"))
                .ThenInclude(l => l.Videos)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == chapterId && c.IsActive, ct);

        if (chapter == null || chapter.Subject == null || !chapter.Subject.IsActive)
            throw new NotFoundException($"Chương '{chapterId}' không tồn tại hoặc đã ngừng kích hoạt.");

        var publishedLessons = chapter.Lessons
            .OrderBy(l => l.OrderIndex)
            .Select(l =>
            {
                var primaryVideo = l.Videos.FirstOrDefault(v => v.IsPublished && v.EmbedAllowed);
                return new LearnerLessonSummaryDto
                {
                    Id = l.Id,
                    TopicId = l.TopicId,
                    TopicTitle = l.Topic?.Title,
                    Title = l.Title,
                    Slug = l.Slug,
                    OrderIndex = l.OrderIndex,
                    Status = l.Status,
                    ContentType = "video",
                    HasVideo = l.Videos.Any(v => v.IsPublished),
                    VideoProvider = primaryVideo?.Provider ?? (l.Videos.Any() ? "youtube" : null),
                    YouTubeVideoId = primaryVideo?.YouTubeVideoId
                };
            })
            .ToList();

        var activeTopics = chapter.Topics
            .Where(t => t.IsActive)
            .OrderBy(t => t.OrderIndex)
            .Select(t => new LearnerTopicDto
            {
                Id = t.Id,
                ChapterId = t.ChapterId,
                Title = t.Title,
                Description = t.Description ?? string.Empty,
                OrderIndex = t.OrderIndex,
                Lessons = publishedLessons.Where(l => l.TopicId == t.Id).ToList()
            })
            .ToList();

        return new LearnerChapterDto
        {
            Id = chapter.Id,
            SubjectId = chapter.SubjectId,
            Title = chapter.Title,
            Description = chapter.Description ?? string.Empty,
            OrderIndex = chapter.OrderIndex,
            Status = chapter.Status,
            SourceName = chapter.SourceName,
            SourceUrl = chapter.SourceUrl,
            Topics = activeTopics,
            Lessons = publishedLessons
        };
    }

    public async Task<LearnerTopicDto> GetTopicDetailAsync(string topicId, CancellationToken ct = default)
    {
        var topic = await _db.ContentTopics
            .Include(t => t.Chapter)
                .ThenInclude(c => c!.Subject)
            .Include(t => t.Lessons.Where(l => l.Status == "published"))
                .ThenInclude(l => l.Videos)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == topicId && t.IsActive, ct);

        if (topic == null || topic.Chapter == null || !topic.Chapter.IsActive || topic.Chapter.Subject == null || !topic.Chapter.Subject.IsActive)
            throw new NotFoundException($"Chủ đề '{topicId}' không tồn tại hoặc đã ngừng kích hoạt.");

        var publishedLessons = topic.Lessons
            .OrderBy(l => l.OrderIndex)
            .Select(l =>
            {
                var primaryVideo = l.Videos.FirstOrDefault(v => v.IsPublished && v.EmbedAllowed);
                return new LearnerLessonSummaryDto
                {
                    Id = l.Id,
                    TopicId = l.TopicId,
                    TopicTitle = topic.Title,
                    Title = l.Title,
                    Slug = l.Slug,
                    OrderIndex = l.OrderIndex,
                    Status = l.Status,
                    ContentType = "video",
                    HasVideo = l.Videos.Any(v => v.IsPublished),
                    VideoProvider = primaryVideo?.Provider ?? (l.Videos.Any() ? "youtube" : null),
                    YouTubeVideoId = primaryVideo?.YouTubeVideoId
                };
            })
            .ToList();

        return new LearnerTopicDto
        {
            Id = topic.Id,
            ChapterId = topic.ChapterId,
            Title = topic.Title,
            Description = topic.Description ?? string.Empty,
            OrderIndex = topic.OrderIndex,
            Lessons = publishedLessons
        };
    }

    public async Task<List<LearnerVideoDto>> GetLessonVideosAsync(string lessonId, CancellationToken ct = default)
    {
        var lesson = await _db.ContentLessons
            .Include(l => l.Videos)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => (l.Id == lessonId || l.Slug == lessonId) && l.Status == "published", ct);

        if (lesson == null)
            throw new NotFoundException("Bài học không tồn tại hoặc chưa được xuất bản.");

        return lesson.Videos
            .Where(v => v.IsPublished)
            .OrderBy(v => v.SortOrder)
            .Select(v => new LearnerVideoDto
            {
                Id = v.Id,
                Title = v.Title,
                Description = v.Description,
                Provider = v.Provider,
                SourceUrl = v.SourceUrl,
                EmbedUrl = v.EmbedUrl,
                YouTubeVideoId = v.YouTubeVideoId,
                ChannelName = v.ChannelName,
                IsPrimary = v.IsPrimary,
                AttributionText = v.AttributionText,
                DurationSeconds = v.DurationSeconds,
                ThumbnailUrl = v.ThumbnailUrl,
                EmbedAllowed = v.EmbedAllowed,
                VerificationStatus = v.VerificationStatus
            })
            .ToList();
    }

    public async Task<LearnerLessonDetailDto> GetLessonDetailAsync(string lessonId, CancellationToken ct = default)
    {
        var lesson = await _db.ContentLessons
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .Include(l => l.Topic)
            .Include(l => l.Videos)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == lessonId || l.Slug == lessonId, ct);

        if (lesson == null || lesson.Status != "published" || lesson.Chapter == null || !lesson.Chapter.IsActive || lesson.Chapter.Subject == null || !lesson.Chapter.Subject.IsActive)
            throw new NotFoundException("Bài học không tồn tại hoặc chưa được xuất bản.");

        var publishedVideos = lesson.Videos
            .Where(v => v.IsPublished)
            .OrderBy(v => v.SortOrder)
            .Select(v => new LearnerVideoDto
            {
                Id = v.Id,
                Title = v.Title,
                Description = v.Description,
                Provider = v.Provider,
                SourceUrl = v.SourceUrl,
                EmbedUrl = v.EmbedUrl,
                YouTubeVideoId = v.YouTubeVideoId,
                ChannelName = v.ChannelName,
                IsPrimary = v.IsPrimary,
                AttributionText = v.AttributionText,
                DurationSeconds = v.DurationSeconds,
                ThumbnailUrl = v.ThumbnailUrl,
                EmbedAllowed = v.EmbedAllowed,
                VerificationStatus = v.VerificationStatus
            })
            .ToList();

        return new LearnerLessonDetailDto
        {
            Id = lesson.Id,
            ChapterId = lesson.ChapterId,
            ChapterTitle = lesson.Chapter.Title,
            TopicId = lesson.TopicId,
            TopicTitle = lesson.Topic?.Title,
            SubjectId = lesson.Chapter.SubjectId,
            SubjectName = lesson.Chapter.Subject.Name,
            Title = lesson.Title,
            Slug = lesson.Slug,
            OrderIndex = lesson.OrderIndex,
            ContentType = "video",
            SourceName = lesson.SourceName,
            SourceUrl = lesson.SourceUrl,
            SourceLicense = lesson.SourceLicense,
            Introduction = lesson.Introduction ?? string.Empty,
            LearningObjectives = SafeJsonArray(lesson.LearningObjectivesJson),
            Definitions = SafeJsonArray(lesson.DefinitionsJson),
            Formulas = SafeJsonArray(lesson.FormulasJson),
            Examples = SafeJsonArray(lesson.ExamplesJson),
            ImportantNotes = SafeJsonArray(lesson.ImportantNotesJson),
            SummaryPoints = SafeJsonArray(lesson.SummaryPointsJson),
            Videos = publishedVideos
        };
    }

    public async Task<List<LearnerQuestionDto>> GetLessonQuestionsAsync(string lessonId, CancellationToken ct = default)
    {
        var lesson = await _db.ContentLessons
            .Include(l => l.Chapter)
                .ThenInclude(c => c!.Subject)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => (l.Id == lessonId || l.Slug == lessonId) && l.Status == "published", ct);

        if (lesson == null || lesson.Chapter == null || !lesson.Chapter.IsActive || lesson.Chapter.Subject == null || !lesson.Chapter.Subject.IsActive)
            throw new NotFoundException("Bài học không tồn tại hoặc chưa được xuất bản.");

        var questions = await _db.ContentQuestions
            .Where(q => q.LessonId == lesson.Id && q.Status == "published")
            .OrderBy(q => q.OrderIndex)
            .AsNoTracking()
            .ToListAsync(ct);

        return questions.Select(q => new LearnerQuestionDto
        {
            Id = q.Id,
            LessonId = q.LessonId ?? lessonId,
            Prompt = q.Prompt,
            Options = SafeDeserializeStringList(q.OptionsJson),
            Topic = q.Topic,
            Difficulty = q.Difficulty,
            Type = q.Type,
            OrderIndex = q.OrderIndex
        }).ToList();
    }

    public async Task<CheckAnswerResponseDto> CheckQuestionAnswerAsync(
        string lessonId,
        string questionId,
        CheckAnswerRequestDto req,
        string? currentUserId,
        string clientIp,
        CancellationToken ct = default)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.SelectedOption))
            throw new ValidationException("SelectedOption", "Vui lòng chọn một đáp án.");

        var clientKey = !string.IsNullOrEmpty(currentUserId)
            ? $"usr_{currentUserId}"
            : $"ip_{clientIp}";
        var rateLimitKey = $"check_rate_{clientKey}_{questionId}";

        if (_cache != null && _cache.TryGetValue<int>(rateLimitKey, out var failedCount) && failedCount >= 3)
        {
            throw new ValidationException("RateLimit", "Bạn đã thử sai quá 3 lần đối với câu hỏi này. Vui lòng ôn lại lý thuyết bài học và thử lại sau 2 phút.");
        }

        var question = await _db.ContentQuestions
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(q => q.Id == questionId && (q.LessonId == lessonId || (q.Lesson != null && q.Lesson.Slug == lessonId)) && q.Status == "published", ct);

        if (question == null || question.Lesson == null || question.Lesson.Status != "published" ||
            question.Lesson.Chapter == null || !question.Lesson.Chapter.IsActive ||
            question.Lesson.Chapter.Subject == null || !question.Lesson.Chapter.Subject.IsActive)
        {
            throw new NotFoundException("Câu hỏi hoặc bài học không tồn tại hoặc chưa xuất bản.");
        }

        var selected = req.SelectedOption.Trim();
        var correct = question.CorrectAnswer.Trim();

        bool isCorrect = string.Equals(selected, correct, StringComparison.OrdinalIgnoreCase);

        if (!isCorrect)
        {
            var options = SafeDeserializeStringList(question.OptionsJson);
            int correctIdx = options.FindIndex(o => string.Equals(o.Trim(), correct, StringComparison.OrdinalIgnoreCase));
            if (correctIdx >= 0)
            {
                string correctLetter = ((char)('A' + correctIdx)).ToString();
                if (string.Equals(selected, correctLetter, StringComparison.OrdinalIgnoreCase))
                {
                    isCorrect = true;
                }
            }

            if (!isCorrect && selected.StartsWith("opt_"))
            {
                var parts = selected.Split('_');
                if (parts.Length >= 3 && correctIdx >= 0 && parts[2].Equals(((char)('A' + correctIdx)).ToString(), StringComparison.OrdinalIgnoreCase))
                {
                    isCorrect = true;
                }
            }
        }

        if (_cache != null)
        {
            if (isCorrect)
            {
                _cache.Remove(rateLimitKey);
            }
            else
            {
                int currentFailures = 0;
                _cache.TryGetValue<int>(rateLimitKey, out currentFailures);
                _cache.Set(rateLimitKey, currentFailures + 1, TimeSpan.FromMinutes(2));
            }
        }

        int scoreEarned = isCorrect ? (question.Difficulty switch
        {
            "hard" => 10,
            "medium" => 8,
            "easy" => 5,
            _ => 5
        }) : 0;

        await _auditWriter.WriteStaffAuditAsync(
            "question_attempt_checked",
            "content_question",
            question.Id,
            null,
            JsonSerializer.Serialize(new { lessonId, isCorrect, scoreEarned }),
            ct);

        await _db.SaveChangesAsync(ct);

        return new CheckAnswerResponseDto
        {
            QuestionId = question.Id,
            IsCorrect = isCorrect,
            CorrectAnswer = question.CorrectAnswer,
            Explanation = question.Explanation,
            ScoreEarned = scoreEarned,
            Feedback = isCorrect ? "Chính xác! Làm rất tốt." : "Chưa chính xác. Hãy xem kỹ lời giải chi tiết bên dưới."
        };
    }

    public async Task<List<object>> GetMaterialsAsync(string? category = null, string? subjectId = null, string? search = null, CancellationToken ct = default)
    {
        var query = _db.ContentLessons.AsNoTracking()
            .Include(l => l.Chapter)
            .ThenInclude(c => c!.Subject)
            .Where(l => l.Status == "published");

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            query = query.Where(l => l.Chapter != null && (l.Chapter.SubjectId == subjectId || (l.Chapter.Subject != null && l.Chapter.Subject.Code == subjectId)));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(l => l.Title.ToLower().Contains(s) || (l.Introduction != null && l.Introduction.ToLower().Contains(s)));
        }

        var lessons = await query
            .OrderBy(l => l.Chapter!.OrderIndex)
            .ThenBy(l => l.OrderIndex)
            .ToListAsync(ct);

        var materials = lessons.Select(l =>
        {
            var hasFormulas = !string.IsNullOrWhiteSpace(l.FormulasJson) && l.FormulasJson != "[]";
            var itemCategory = hasFormulas ? "Công thức" : "Tài liệu";

            return new
            {
                id = l.Id,
                title = l.Title,
                category = itemCategory,
                subjectId = l.Chapter?.SubjectId ?? (l.Chapter?.Subject?.Code != null ? $"sub_{l.Chapter.Subject.Code.ToLowerInvariant()}" : "sub_math10"),
                subjectName = l.Chapter?.Subject?.Name ?? "Toán học",
                snippet = !string.IsNullOrWhiteSpace(l.Introduction) ? l.Introduction : l.Title,
                pagesCount = Math.Max(3, (l.DefinitionsJson?.Length ?? 0) / 50 + 2),
                updatedAt = l.UpdatedAt.ToString("dd/MM/yyyy")
            };
        });

        if (!string.IsNullOrWhiteSpace(category) && category != "all" && category != "Đã lưu")
        {
            materials = materials.Where(m => m.category == category);
        }

        return materials.Cast<object>().ToList();
    }

    public async Task<object> GetQuestionBankAsync(
        string? subjectId = null,
        string? chapterId = null,
        string? lessonId = null,
        string? grade = null,
        string? difficulty = null,
        string? type = null,
        string? search = null,
        int page = 1,
        int pageSize = 50,
        bool isStaffOrAuthorized = false,
        CancellationToken ct = default)
    {
        var query = _db.ContentQuestions.AsNoTracking()
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Where(q => !q.IsDeleted && (q.Status == "published" || q.Status == "approved"));

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            var sNorm1 = subjectId.Replace("-", "_").ToLowerInvariant();
            var sNorm2 = subjectId.Replace("_", "-").ToLowerInvariant();
            if (sNorm1 == "math")
            {
                query = query.Where(q => (q.SubjectId != null && q.SubjectId.ToLower().Contains("math")) ||
                                         (q.Lesson != null && q.Lesson.Chapter != null && q.Lesson.Chapter.SubjectId.ToLower().Contains("math")));
            }
            else
            {
                query = query.Where(q => q.SubjectId == sNorm1 || q.SubjectId == sNorm2 ||
                                         (q.Lesson != null && q.Lesson.Chapter != null && (q.Lesson.Chapter.SubjectId == sNorm1 || q.Lesson.Chapter.SubjectId == sNorm2)));
            }
        }

        if (!string.IsNullOrWhiteSpace(chapterId) && chapterId != "all")
        {
            query = query.Where(q => q.ChapterId == chapterId || (q.Lesson != null && q.Lesson.ChapterId == chapterId));
        }

        if (!string.IsNullOrWhiteSpace(lessonId) && lessonId != "all")
        {
            query = query.Where(q => q.LessonId == lessonId);
        }

        if (!string.IsNullOrWhiteSpace(grade) && grade != "all")
        {
            query = query.Where(q => q.Grade == grade || (q.Lesson != null && q.Lesson.Chapter != null && q.Lesson.Chapter.Subject != null && q.Lesson.Chapter.Subject.Grade == grade));
        }

        if (!string.IsNullOrWhiteSpace(difficulty) && difficulty != "all")
        {
            var diffNormalized = difficulty.ToLowerInvariant();
            query = query.Where(q => q.Difficulty.ToLower() == diffNormalized);
        }

        if (!string.IsNullOrWhiteSpace(type) && type != "all")
        {
            var norm1 = type.Replace("_", "-").ToLowerInvariant();
            var norm2 = type.Replace("-", "_").ToLowerInvariant();
            query = query.Where(q => q.Type.ToLower() == norm1 || q.Type.ToLower() == norm2);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(q => q.Prompt.ToLower().Contains(term) || q.Id.ToLower().Contains(term) || (q.Topic != null && q.Topic.ToLower().Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 1, 100);

        var questions = await query
            .OrderBy(q => q.OrderIndex)
            .ThenBy(q => q.Id)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToListAsync(ct);

        var dtos = questions.Select(q => FormatQuestionBankItem(q, isStaffOrAuthorized)).ToList();
        return new { items = dtos, total, page = safePage, pageSize = safePageSize };
    }

    public async Task<object> GetQuestionBankStatsAsync(string? subjectId = null, string? grade = null, CancellationToken ct = default)
    {
        var query = _db.ContentQuestions.AsNoTracking()
            .Include(q => q.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .Where(q => !q.IsDeleted);

        if (!string.IsNullOrWhiteSpace(subjectId) && subjectId != "all")
        {
            var sNorm1 = subjectId.Replace("-", "_").ToLowerInvariant();
            var sNorm2 = subjectId.Replace("_", "-").ToLowerInvariant();
            if (sNorm1 == "math")
            {
                query = query.Where(q => (q.SubjectId != null && q.SubjectId.ToLower().Contains("math")) ||
                                         (q.Lesson != null && q.Lesson.Chapter != null && q.Lesson.Chapter.SubjectId.ToLower().Contains("math")));
            }
            else
            {
                query = query.Where(q => q.SubjectId == sNorm1 || q.SubjectId == sNorm2 ||
                                         (q.Lesson != null && q.Lesson.Chapter != null && (q.Lesson.Chapter.SubjectId == sNorm1 || q.Lesson.Chapter.SubjectId == sNorm2)));
            }
        }

        if (!string.IsNullOrWhiteSpace(grade) && grade != "all")
        {
            query = query.Where(q => q.Grade == grade || (q.Lesson != null && q.Lesson.Chapter != null && q.Lesson.Chapter.Subject != null && q.Lesson.Chapter.Subject.Grade == grade));
        }

        var allItems = await query.ToListAsync(ct);

        var total = allItems.Count(q => q.Status == "published" || q.Status == "approved");
        var approvedCount = total;
        var needsReviewCount = allItems.Count(q => q.Status == "in-review");
        var draftCount = allItems.Count(q => q.Status == "draft");
        var rejectedCount = allItems.Count(q => q.Status == "rejected");

        var byType = new Dictionary<string, int>
        {
            ["multiple_choice"] = allItems.Count(q => (q.Status == "published" || q.Status == "approved") && (q.Type == "multiple_choice" || q.Type == "multiple-choice")),
            ["true_false_group"] = allItems.Count(q => (q.Status == "published" || q.Status == "approved") && (q.Type == "true_false_group" || q.Type == "true-false-group")),
            ["short_answer"] = allItems.Count(q => (q.Status == "published" || q.Status == "approved") && (q.Type == "short_answer" || q.Type == "short-answer"))
        };

        var byCognitiveLevel = new Dictionary<string, int>
        {
            ["recognition"] = allItems.Count(q => (q.Status == "published" || q.Status == "approved") && (q.Difficulty == "easy" || q.Difficulty == "nhan_biet")),
            ["comprehension"] = allItems.Count(q => (q.Status == "published" || q.Status == "approved") && (q.Difficulty == "medium" || q.Difficulty == "thong_hieu")),
            ["application"] = allItems.Count(q => (q.Status == "published" || q.Status == "approved") && (q.Difficulty == "hard" || q.Difficulty == "van_dung")),
            ["high_application"] = allItems.Count(q => (q.Status == "published" || q.Status == "approved") && (q.Difficulty == "very_hard" || q.Difficulty == "van_dung_cao"))
        };

        return new
        {
            total,
            approvedCount,
            needsReviewCount,
            draftCount,
            rejectedCount,
            byType,
            byCognitiveLevel
        };
    }

    public async Task<object> GetQuestionBankDetailAsync(string questionId, bool isStaffOrAuthorized = false, CancellationToken ct = default)
    {
        var q = await _db.ContentQuestions.AsNoTracking()
            .Include(x => x.Lesson)
                .ThenInclude(l => l!.Chapter)
                    .ThenInclude(c => c!.Subject)
            .FirstOrDefaultAsync(x => x.Id == questionId && !x.IsDeleted && (x.Status == "published" || x.Status == "approved"), ct);

        if (q == null)
            throw new NotFoundException("Câu hỏi không tồn tại hoặc chưa được phê duyệt.");

        return FormatQuestionBankItem(q, isStaffOrAuthorized);
    }

    private static object FormatQuestionBankItem(ContentQuestion q, bool isStaffOrAuthorized = false)
    {
        var letters = new[] { "A", "B", "C", "D" };
        var rawOptions = SafeDeserializeStringList(q.OptionsJson);
        var options = rawOptions.Select((text, idx) => new
        {
            id = idx < letters.Length ? letters[idx] : $"O{idx + 1}",
            text = Regex.Replace(text, @"^[A-Da-d][.:)\s]+", "").Trim()
        }).ToList();

        var normalizedType = q.Type == "multiple-choice" ? "multiple_choice"
            : q.Type == "true-false-group" || q.Type == "true-false" || q.Type == "true_false" ? "true_false_group"
            : q.Type == "short-answer" ? "short_answer"
            : q.Type;

        var cognitiveLevel = q.Difficulty switch
        {
            "easy" or "nhan_biet" => "recognition",
            "medium" or "thong_hieu" => "comprehension",
            "hard" or "van_dung" => "application",
            "very_hard" or "van_dung_cao" => "high_application",
            _ => "comprehension"
        };

        var resolvedSubjectId = q.SubjectId ?? q.Lesson?.Chapter?.SubjectId ?? (q.Grade != null ? $"sub_math{q.Grade}" : "sub_math10");

        if (normalizedType == "true_false_group")
        {
            var subLetters = new[] { "a", "b", "c", "d" };
            var correctTokens = (q.CorrectAnswer ?? "").Split(new[] { ',', ';', '|', ' ' }, StringSplitOptions.RemoveEmptyEntries);
            var subItems = new List<object>();
            bool hasMetadataSubItems = false;

            if (!string.IsNullOrWhiteSpace(q.MetadataJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(q.MetadataJson);
                    if (doc.RootElement.TryGetProperty("subItems", out var subItemsEl) && subItemsEl.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var el in subItemsEl.EnumerateArray())
                        {
                            var sId = el.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
                            var sStatement = el.TryGetProperty("statement", out var statProp) ? statProp.GetString() ?? "" : "";
                            var sIsCorrect = el.TryGetProperty("isCorrect", out var corrProp) && corrProp.GetBoolean();
                            var sExplanation = el.TryGetProperty("explanation", out var expProp) ? expProp.GetString() : null;

                            if (isStaffOrAuthorized)
                            {
                                subItems.Add(new
                                {
                                    id = sId,
                                    statement = sStatement,
                                    isCorrect = sIsCorrect,
                                    explanation = sExplanation
                                });
                            }
                            else
                            {
                                subItems.Add(new
                                {
                                    id = sId,
                                    statement = sStatement
                                });
                            }
                        }
                        if (subItems.Count > 0)
                            hasMetadataSubItems = true;
                    }
                }
                catch { }
            }

            if (!hasMetadataSubItems)
            {
                for (int i = 0; i < 4; i++)
                {
                    var subId = i < subLetters.Length ? subLetters[i] : $"sub_{i + 1}";
                    var statement = i < rawOptions.Count ? rawOptions[i] : $"Mệnh đề ({subId})";
                    bool isCorrect = false;
                    if (i < correctTokens.Length)
                    {
                        var token = correctTokens[i].Trim().ToLowerInvariant();
                        isCorrect = token == "true" || token == "t" || token == "đ" || token == "dung" || token == "1";
                    }

                    if (isStaffOrAuthorized)
                    {
                        subItems.Add(new
                        {
                            id = subId,
                            statement = statement,
                            isCorrect = isCorrect,
                            explanation = (string?)null
                        });
                    }
                    else
                    {
                        subItems.Add(new
                        {
                            id = subId,
                            statement = statement
                        });
                    }
                }
            }

            if (isStaffOrAuthorized)
            {
                return new
                {
                    id = q.Id,
                    subjectId = resolvedSubjectId,
                    chapterId = q.ChapterId ?? q.Lesson?.ChapterId ?? "",
                    lessonId = q.LessonId ?? "",
                    skillIds = new List<string> { q.Topic ?? "SKILL-GENERAL" },
                    type = normalizedType,
                    stem = q.Prompt,
                    difficulty = q.Difficulty,
                    cognitiveLevel = cognitiveLevel,
                    subItems = subItems,
                    explanation = q.Explanation ?? "",
                    source = q.SourceType ?? "STUDY_AI Official",
                    reviewStatus = q.Status == "published" ? "approved" : q.Status,
                    createdAt = q.CreatedAt.ToString("o"),
                    updatedAt = q.UpdatedAt.ToString("o")
                };
            }

            return new
            {
                id = q.Id,
                subjectId = resolvedSubjectId,
                chapterId = q.ChapterId ?? q.Lesson?.ChapterId ?? "",
                lessonId = q.LessonId ?? "",
                skillIds = new List<string> { q.Topic ?? "SKILL-GENERAL" },
                type = normalizedType,
                stem = q.Prompt,
                difficulty = q.Difficulty,
                cognitiveLevel = cognitiveLevel,
                subItems = subItems,
                source = q.SourceType ?? "STUDY_AI Official",
                reviewStatus = q.Status == "published" ? "approved" : q.Status,
                createdAt = q.CreatedAt.ToString("o"),
                updatedAt = q.UpdatedAt.ToString("o")
            };
        }

        if (normalizedType == "short_answer")
        {
            var acceptedAnswers = new List<string>();
            string displayAnswer = q.CorrectAnswer ?? "";
            string? unit = null;

            if (!string.IsNullOrWhiteSpace(q.MetadataJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(q.MetadataJson);
                    if (doc.RootElement.TryGetProperty("acceptedAnswers", out var accEl) && accEl.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var el in accEl.EnumerateArray())
                        {
                            var val = el.GetString();
                            if (!string.IsNullOrWhiteSpace(val)) acceptedAnswers.Add(val);
                        }
                    }
                    if (doc.RootElement.TryGetProperty("displayAnswer", out var dispEl))
                    {
                        displayAnswer = dispEl.GetString() ?? displayAnswer;
                    }
                    if (doc.RootElement.TryGetProperty("unit", out var unitEl))
                    {
                        unit = unitEl.GetString();
                    }
                }
                catch { }
            }

            if (acceptedAnswers.Count == 0)
            {
                if (!string.IsNullOrWhiteSpace(q.CorrectAnswer))
                {
                    var tokens = q.CorrectAnswer.Split(new[] { ';', '|', ',' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var t in tokens)
                    {
                        var trimmed = t.Trim();
                        if (!string.IsNullOrWhiteSpace(trimmed) && !acceptedAnswers.Contains(trimmed))
                            acceptedAnswers.Add(trimmed);
                    }
                }
                if (acceptedAnswers.Count == 0 && rawOptions.Count > 0)
                {
                    acceptedAnswers.AddRange(rawOptions);
                }
                if (acceptedAnswers.Count == 0 && !string.IsNullOrWhiteSpace(q.CorrectAnswer))
                {
                    acceptedAnswers.Add(q.CorrectAnswer.Trim());
                }
            }
            if (string.IsNullOrWhiteSpace(displayAnswer) && acceptedAnswers.Count > 0)
            {
                displayAnswer = acceptedAnswers[0];
            }

            if (isStaffOrAuthorized)
            {
                return new
                {
                    id = q.Id,
                    subjectId = resolvedSubjectId,
                    chapterId = q.ChapterId ?? q.Lesson?.ChapterId ?? "",
                    lessonId = q.LessonId ?? "",
                    skillIds = new List<string> { q.Topic ?? "SKILL-GENERAL" },
                    type = normalizedType,
                    stem = q.Prompt,
                    difficulty = q.Difficulty,
                    cognitiveLevel = cognitiveLevel,
                    acceptedAnswers = acceptedAnswers,
                    displayAnswer = displayAnswer,
                    unit = unit,
                    explanation = q.Explanation ?? "",
                    source = q.SourceType ?? "STUDY_AI Official",
                    reviewStatus = q.Status == "published" ? "approved" : q.Status,
                    createdAt = q.CreatedAt.ToString("o"),
                    updatedAt = q.UpdatedAt.ToString("o")
                };
            }

            return new
            {
                id = q.Id,
                subjectId = resolvedSubjectId,
                chapterId = q.ChapterId ?? q.Lesson?.ChapterId ?? "",
                lessonId = q.LessonId ?? "",
                skillIds = new List<string> { q.Topic ?? "SKILL-GENERAL" },
                type = normalizedType,
                stem = q.Prompt,
                difficulty = q.Difficulty,
                cognitiveLevel = cognitiveLevel,
                unit = unit,
                source = q.SourceType ?? "STUDY_AI Official",
                reviewStatus = q.Status == "published" ? "approved" : q.Status,
                createdAt = q.CreatedAt.ToString("o"),
                updatedAt = q.UpdatedAt.ToString("o")
            };
        }

        if (isStaffOrAuthorized)
        {
            return new
            {
                id = q.Id,
                subjectId = resolvedSubjectId,
                chapterId = q.ChapterId ?? q.Lesson?.ChapterId ?? "",
                lessonId = q.LessonId ?? "",
                skillIds = new List<string> { q.Topic ?? "SKILL-GENERAL" },
                type = normalizedType,
                stem = q.Prompt,
                difficulty = q.Difficulty,
                cognitiveLevel = cognitiveLevel,
                options = options,
                correctAnswer = q.CorrectAnswer,
                explanation = q.Explanation ?? "",
                source = q.SourceType ?? "STUDY_AI Official",
                reviewStatus = q.Status == "published" ? "approved" : q.Status,
                createdAt = q.CreatedAt.ToString("o"),
                updatedAt = q.UpdatedAt.ToString("o")
            };
        }

        return new
        {
            id = q.Id,
            subjectId = resolvedSubjectId,
            chapterId = q.ChapterId ?? q.Lesson?.ChapterId ?? "",
            lessonId = q.LessonId ?? "",
            skillIds = new List<string> { q.Topic ?? "SKILL-GENERAL" },
            type = normalizedType,
            stem = q.Prompt,
            difficulty = q.Difficulty,
            cognitiveLevel = cognitiveLevel,
            options = options,
            source = q.SourceType ?? "STUDY_AI Official",
            reviewStatus = q.Status == "published" ? "approved" : q.Status,
            createdAt = q.CreatedAt.ToString("o"),
            updatedAt = q.UpdatedAt.ToString("o")
        };
    }
}