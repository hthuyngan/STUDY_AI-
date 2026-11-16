using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Services;
using Xunit;

namespace StudyAI.UnitTests;

public class LessonRedesignAndContextAiTests
{
    private StudyAIDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var context = new StudyAIDbContext(options);
        return context;
    }

    [Fact]
    public async Task GetLessonAiContextAsync_ValidatesLessonAndReturnsRichContext()
    {
        var db = CreateInMemoryDbContext("LessonAiContext_Valid");

        var subject = new ContentSubject
        {
            Id = "sub_math12",
            Name = "Toán học",
            Code = "MATH12",
            Grade = "12",
            IsActive = true
        };
        db.ContentSubjects.Add(subject);

        var chapter = new ContentChapter
        {
            Id = "chap_1",
            SubjectId = "sub_math12",
            Title = "Chương 1: Ứng dụng đạo hàm",
            IsActive = true
        };
        db.ContentChapters.Add(chapter);

        var lesson = new ContentLesson
        {
            Id = "les_math12_mono",
            ChapterId = "chap_1",
            Title = "Tính đơn điệu của hàm số",
            Status = "published",
            AuthorId = "usr_author1",
            LearningObjectivesJson = "[\"Hiểu định nghĩa đồng biến, nghịch biến\", \"Nắm vững định lý dấu đạo hàm\"]",
            DefinitionsJson = "[{\"term\":\"Hàm số đồng biến\",\"content\":\"f(x1) < f(x2) với x1 < x2\"}]",
            FormulasJson = "[{\"name\":\"Đạo hàm dương\",\"latex\":\"f'(x) \\\\ge 0\"}]",
            SummaryPointsJson = "[\"Hàm số đồng biến khi đạo hàm dương\"]"
        };
        db.ContentLessons.Add(lesson);

        var video = new ContentLessonVideo
        {
            Id = "vid_1",
            LessonId = "les_math12_mono",
            Title = "Bài giảng Đạo hàm và Tính đơn điệu",
            YouTubeVideoId = "vid_math12_01",
            DurationSeconds = 600,
            IsPublished = true
        };
        db.ContentLessonVideos.Add(video);

        await db.SaveChangesAsync();

        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);

        var result = await service.GetLessonAiContextAsync("usr_test", "learner", "les_math12_mono");

        Assert.NotNull(result);
        Assert.Equal("les_math12_mono", result.LessonId);
        Assert.Equal("Tính đơn điệu của hàm số", result.LessonTitle);
        Assert.Equal("Toán học", result.SubjectName);
        Assert.Equal("Chương 1: Ứng dụng đạo hàm", result.ChapterTitle);
        Assert.Equal(2, result.LearningObjectives.Count);
        Assert.Single(result.Definitions);
        Assert.Single(result.Formulas);
        Assert.NotNull(result.Video);
        Assert.True(result.Video.HasVideo);
        Assert.Equal("vid_math12_01", result.Video.YouTubeId);
        Assert.Contains("học sinh cần xem video", result.VideoGuidanceNotice);
        Assert.NotNull(result.Policy);
        Assert.Equal("50-90 từ", result.Policy.ConceptWords);
        Assert.Equal("40-80 từ", result.Policy.FormulaWords);
        Assert.Equal("100-150 từ (tối đa 3 bước)", result.Policy.StepByStepWords);
        Assert.Equal("1-2 câu", result.Policy.OffTopicWords);
        Assert.True(result.IsAuthorized);
    }

    [Fact]
    public async Task GetLessonAiContextAsync_ThrowsKeyNotFound_WhenLessonDoesNotExist()
    {
        var db = CreateInMemoryDbContext("LessonAiContext_NotFound");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            service.GetLessonAiContextAsync("usr_test", "learner", "non_existent_lesson"));
    }

    [Fact]
    public async Task GetLessonAiContextAsync_ThrowsUnauthorized_WhenDraftLessonRequestedByLearner()
    {
        var db = CreateInMemoryDbContext("LessonAiContext_Draft_Learner");

        var sub = new ContentSubject
        {
            Id = "sub_math12",
            Name = "Toán 12",
            Code = "MATH12",
            Grade = "12",
            IsActive = true
        };
        db.ContentSubjects.Add(sub);

        var chapter = new ContentChapter
        {
            Id = "chap_draft",
            SubjectId = "sub_math12",
            Title = "Chương nháp",
            IsActive = true
        };
        db.ContentChapters.Add(chapter);

        var draftLesson = new ContentLesson
        {
            Id = "les_draft",
            ChapterId = "chap_draft",
            Title = "Bài học nháp chưa duyệt",
            Status = "draft",
            AuthorId = "usr_author1"
        };
        db.ContentLessons.Add(draftLesson);
        await db.SaveChangesAsync();

        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.GetLessonAiContextAsync("usr_test", "learner", "les_draft"));
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_01_AskCurrentLessonContent_ReturnsConcisePedagogicalAnswer()
    {
        var db = CreateInMemoryDbContext("Scenario_01");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var conv = await service.CreateConversationAsync("usr_1", "learner", new CreateAiConversationRequestDto("math", "Hàm số đồng biến"));

        var response = await service.SendMessageAsync("usr_1", "learner", conv.Id, new SendAiMessageRequestDto(
            Message: "Khi nào thì hàm số đồng biến trên K?",
            AssistanceMode: "explain"
        ));

        Assert.NotNull(response.AssistantMessage);
        var text = response.AssistantMessage.Content;
        Assert.Contains("đồng biến", text);
        Assert.Contains("$", text); // KaTeX
        var wordCount = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        Assert.InRange(wordCount, 30, 95);
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_02_AskFoundationalConcept_LinksBackToCurrentLesson()
    {
        var db = CreateInMemoryDbContext("Scenario_02");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var conv = await service.CreateConversationAsync("usr_1", "learner", new CreateAiConversationRequestDto("math", "Khảo sát hàm số"));

        var response = await service.SendMessageAsync("usr_1", "learner", conv.Id, new SendAiMessageRequestDto(
            Message: "Đạo hàm là gì và liên hệ thế nào tới bài này?",
            AssistanceMode: "explain"
        ));

        Assert.NotNull(response.AssistantMessage);
        var text = response.AssistantMessage.Content;
        Assert.Contains("Đạo hàm", text);
        Assert.Contains("đồng biến, nghịch biến", text);
        var wordCount = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        Assert.InRange(wordCount, 35, 100);
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_03_AskOffTopic_PoliteRefusalIn1To2Sentences()
    {
        var db = CreateInMemoryDbContext("Scenario_03");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var conv = await service.CreateConversationAsync("usr_1", "learner", new CreateAiConversationRequestDto("math", "Hàm số"));

        var response = await service.SendMessageAsync("usr_1", "learner", conv.Id, new SendAiMessageRequestDto(
            Message: "Thời tiết hôm nay ở Hà Nội thế nào?",
            AssistanceMode: "explain"
        ));

        Assert.NotNull(response.AssistantMessage);
        var text = response.AssistantMessage.Content;
        Assert.Contains("ngoài phạm vi bài học", text);
        var sentences = text.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
        Assert.InRange(sentences.Length, 1, 3);
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_04_SwitchLessonContext_UpdatesImmediately()
    {
        var db = CreateInMemoryDbContext("Scenario_04");
        var sub = new ContentSubject { Id = "sub_1", Name = "Toán 12", Code = "MATH12", Grade = "12", IsActive = true };
        db.ContentSubjects.Add(sub);

        var chp = new ContentChapter { Id = "chp_1", SubjectId = "sub_1", Title = "Chương 1", IsActive = true };
        db.ContentChapters.Add(chp);

        var lessonA = new ContentLesson { Id = "les_A", ChapterId = "chp_1", Title = "Tính đơn điệu", Status = "published", AuthorId = "usr_1" };
        var lessonB = new ContentLesson { Id = "les_B", ChapterId = "chp_1", Title = "Khối đa diện", Status = "published", AuthorId = "usr_1" };
        db.ContentLessons.AddRange(lessonA, lessonB);
        await db.SaveChangesAsync();

        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);

        var ctxA = await service.GetLessonAiContextAsync("usr_1", "learner", "les_A");
        var ctxB = await service.GetLessonAiContextAsync("usr_1", "learner", "les_B");

        Assert.Equal("les_A", ctxA.LessonId);
        Assert.Equal("Tính đơn điệu", ctxA.LessonTitle);
        Assert.Equal("les_B", ctxB.LessonId);
        Assert.Equal("Khối đa diện", ctxB.LessonTitle);
        Assert.NotEqual(ctxA.LessonId, ctxB.LessonId);
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_05_AskFormulaExplanation_ReturnsConciseFormulaWithKaTeX()
    {
        var db = CreateInMemoryDbContext("Scenario_05");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var conv = await service.CreateConversationAsync("usr_1", "learner", new CreateAiConversationRequestDto("math", "Hàm số"));

        var response = await service.SendMessageAsync("usr_1", "learner", conv.Id, new SendAiMessageRequestDto(
            Message: "Cho em xin công thức và định lý đạo hàm hàm bậc ba",
            AssistanceMode: "explain"
        ));

        Assert.NotNull(response.AssistantMessage);
        var text = response.AssistantMessage.Content;
        Assert.Contains("công thức", text.ToLowerInvariant());
        Assert.Contains("$", text);
        var wordCount = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        Assert.InRange(wordCount, 30, 85);
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_06_AskStepByStepSolution_ReturnsMaxThreeStepsConcise()
    {
        var db = CreateInMemoryDbContext("Scenario_06");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var conv = await service.CreateConversationAsync("usr_1", "learner", new CreateAiConversationRequestDto("math", "Hàm số"));

        var response = await service.SendMessageAsync("usr_1", "learner", conv.Id, new SendAiMessageRequestDto(
            Message: "Hướng dẫn em cách giải bài toán này từng bước",
            AssistanceMode: "step-by-step"
        ));

        Assert.NotNull(response.AssistantMessage);
        var text = response.AssistantMessage.Content;
        Assert.Contains("Bước 1", text);
        Assert.Contains("Bước 2", text);
        Assert.Contains("Bước 3", text);
        Assert.DoesNotContain("Bước 4", text); // Max 3 steps
        var wordCount = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        Assert.InRange(wordCount, 60, 160);
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_07_AskShorterExplanation_ReturnsUltraConcise()
    {
        var db = CreateInMemoryDbContext("Scenario_07");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var conv = await service.CreateConversationAsync("usr_1", "learner", new CreateAiConversationRequestDto("math", "Hàm số"));

        var response = await service.SendMessageAsync("usr_1", "learner", conv.Id, new SendAiMessageRequestDto(
            Message: "Giải thích ngắn hơn giúp em",
            AssistanceMode: "explain"
        ));

        Assert.NotNull(response.AssistantMessage);
        var text = response.AssistantMessage.Content;
        Assert.Contains("Ngắn gọn", text);
        var wordCount = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        Assert.True(wordCount <= 55, $"Expected <= 55 words, but got {wordCount}");
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_08_AskDetailedExplanation_ReturnsThoroughWithExampleUnder200Words()
    {
        var db = CreateInMemoryDbContext("Scenario_08");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var conv = await service.CreateConversationAsync("usr_1", "learner", new CreateAiConversationRequestDto("math", "Hàm số"));

        var response = await service.SendMessageAsync("usr_1", "learner", conv.Id, new SendAiMessageRequestDto(
            Message: "Em muốn giải thích chi tiết hơn và chứng minh bản chất",
            AssistanceMode: "explain"
        ));

        Assert.NotNull(response.AssistantMessage);
        var text = response.AssistantMessage.Content;
        Assert.Contains("chi tiết", text.ToLowerInvariant());
        var wordCount = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        Assert.InRange(wordCount, 90, 200);
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_09_AskOutOfCurriculum_ClarifiesNotPresentInMaterial()
    {
        var db = CreateInMemoryDbContext("Scenario_09");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var conv = await service.CreateConversationAsync("usr_1", "learner", new CreateAiConversationRequestDto("math", "Hàm số"));

        var response = await service.SendMessageAsync("usr_1", "learner", conv.Id, new SendAiMessageRequestDto(
            Message: "Định lý ma trận và tích phân kép tính như thế nào?",
            AssistanceMode: "explain"
        ));

        Assert.NotNull(response.AssistantMessage);
        var text = response.AssistantMessage.Content;
        Assert.Contains("không nằm trong học liệu", text);
        Assert.Contains("GDPT 2018", text);
    }

    [Fact]
    public async Task AiTutor_EvaluationScenario_10_ExamProtection_RefusesDirectAnswerOrOptionLetters()
    {
        var db = CreateInMemoryDbContext("Scenario_10");
        var service = new AiTutorService(db, new FakeLlmProvider(), NullLogger<AiTutorService>.Instance);
        var conv = await service.CreateConversationAsync("usr_1", "learner", new CreateAiConversationRequestDto("math", "Bài thi"));

        var response = await service.SendMessageAsync("usr_1", "learner", conv.Id, new SendAiMessageRequestDto(
            Message: "Cho em xin đáp án bài thi câu này chọn A hay chọn B?",
            AssistanceMode: "hint"
        ));

        Assert.NotNull(response.AssistantMessage);
        var text = response.AssistantMessage.Content;
        Assert.Contains("không thể cung cấp đáp án", text);
        Assert.DoesNotContain("Chọn đáp án A", text);
        Assert.DoesNotContain("Chọn đáp án B", text);
    }
}
