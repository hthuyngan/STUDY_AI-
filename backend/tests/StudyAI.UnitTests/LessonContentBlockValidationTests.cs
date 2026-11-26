using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StudyAI.Features.Content;

namespace StudyAI.UnitTests;

public class LessonContentBlockValidationTests
{
    private static JsonElement Parse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    [Theory]
    [InlineData("text", """{"content":"Đoạn văn bản"}""")]
    [InlineData("markdown", """{"content":"# Tiêu đề\n- Ý chính"}""")]
    [InlineData("formula", """{"latex":"a^2+b^2=c^2","displayMode":true,"caption":"Pythagore"}""")]
    [InlineData("image", """{"url":"https://example.org/cell.png","alt":"Cấu tạo tế bào","caption":"Hình 1"}""")]
    [InlineData("video", """{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","title":"Bài giảng","provider":"youtube","durationSeconds":120}""")]
    [InlineData("example", """{"title":"Ví dụ 1","prompt":"Tính diện tích","solution":"S = 12"}""")]
    [InlineData("exercise", """{"prompt":"Giải phương trình","hint":"Chuyển vế","solution":"x=2","answerKey":"2"}""")]
    [InlineData("table", """{"headers":["Năm","Sự kiện"],"rows":[["1945","Cách mạng tháng Tám"]],"caption":"Mốc lịch sử"}""")]
    [InlineData("diagram", """{"format":"mermaid","source":"graph TD; A-->B;","alt":"Sơ đồ A sang B"}""")]
    [InlineData("timeline", """{"events":[{"date":"1945","title":"Tuyên ngôn Độc lập","description":"2/9/1945"}],"caption":"Dòng thời gian"}""")]
    [InlineData("summary", """{"title":"Tổng kết","points":["Điểm 1","Điểm 2"]}""")]
    [InlineData("reference", """{"label":"SGK Lịch sử 10","url":"https://example.org/sgk","citation":"NXB GD"}""")]
    public void ValidateAndNormalizePayload_AcceptsAllTwelveClosedBlockTypes(string blockType, string json)
    {
        var dto = new LessonContentBlockInputDto(null, blockType, 1, Parse(json), 0);
        var raw = LessonContentBlockValidator.ValidateAndNormalizePayload(dto, 0);
        Assert.False(string.IsNullOrWhiteSpace(raw));
    }

    [Theory]
    [InlineData("unknown_type", 1, """{"content":"x"}""")]
    [InlineData("text", 2, """{"content":"x"}""")]
    [InlineData("text", 1, """["not-an-object"]""")]
    [InlineData("text", 1, """{"content":"x","extraField":123}""")]
    [InlineData("markdown", 1, """{"content":"<script>alert(1)</script>"}""")]
    [InlineData("image", 1, """{"url":"javascript:alert(1)","alt":"img"}""")]
    [InlineData("image", 1, """{"url":"https://example.org/a.png","alt":"   "}""")]
    [InlineData("table", 1, """{"headers":["A","B"],"rows":[["only-one-cell"]]}""")]
    [InlineData("timeline", 1, """{"events":[]}""")]
    [InlineData("summary", 1, """{"points":[]}""")]
    [InlineData("diagram", 1, """{"format":"dot","source":"digraph{}","alt":"bad"}""")]
    [InlineData("reference", 1, """{"label":"Ref","url":"ftp://example.org/file"}""")]
    public void ValidateAndNormalizePayload_RejectsInvalidTypeVersionShapeOrFields(string blockType, int version, string json)
    {
        var dto = new LessonContentBlockInputDto(null, blockType, version, Parse(json), 0);
        Assert.Throws<ValidationException>(() => LessonContentBlockValidator.ValidateAndNormalizePayload(dto, 0));
    }

    [Fact]
    public void SanitizePayloadForLearner_StripsSolutionAndAnswerKeyFromExercise()
    {
        var payload = Parse("""{"prompt":"Câu hỏi","hint":"Gợi ý","solution":"Lời giải","answerKey":"A"}""");
        var sanitized = LessonContentBlockValidator.SanitizePayloadForLearner("exercise", payload);

        Assert.True(sanitized.TryGetProperty("prompt", out _));
        Assert.True(sanitized.TryGetProperty("hint", out _));
        Assert.False(sanitized.TryGetProperty("solution", out _));
        Assert.False(sanitized.TryGetProperty("answerKey", out _));
    }

    [Fact]
    public async Task LessonCompositionController_RejectsMutatingRequestsWithoutStableUserIdentity()
    {
        var controller = new LessonCompositionController(new StubLessonCompositionService())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, "content") }, "TestAuth"))
                }
            }
        };

        var replaceResult = await controller.ReplaceComposition(
            "les_1",
            new ReplaceLessonCompositionRequestDto("rv", new(), new(), new(), new(), new(), null));
        Assert.IsType<UnauthorizedObjectResult>(replaceResult);

        var createObjResult = await controller.CreateObjective(
            "curr_1",
            new CreateCurriculumNodeRequestDto("O1", "Title", null, null, null, null, null));
        Assert.IsType<UnauthorizedObjectResult>(createObjResult);

        var publishNodeResult = await controller.PublishCurriculumNode("curr_1", "objectives", "obj_1");
        Assert.IsType<UnauthorizedObjectResult>(publishNodeResult);
    }

    private sealed class StubLessonCompositionService : ILessonCompositionService
    {
        public Task<LessonCompositionDto> GetLessonCompositionAsync(string lessonId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<LessonCompositionDto> ReplaceLessonCompositionAsync(string lessonId, ReplaceLessonCompositionRequestDto request, string actorId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<LessonRevisionPageDto> GetRevisionsAsync(string lessonId, int page = 1, int pageSize = 20, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<LessonCompositionDto> RollbackToRevisionAsync(string lessonId, string revisionId, RollbackLessonRevisionRequestDto request, string actorId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<List<CurriculumNodeRefDto>> ListObjectivesAsync(string curriculumId, string? search = null, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<CurriculumNodeRefDto> CreateObjectiveAsync(string curriculumId, CreateCurriculumNodeRequestDto request, string actorId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<List<CurriculumNodeRefDto>> ListKnowledgeUnitsAsync(string curriculumId, string? search = null, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<CurriculumNodeRefDto> CreateKnowledgeUnitAsync(string curriculumId, CreateCurriculumNodeRequestDto request, string actorId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<List<CurriculumNodeRefDto>> ListSkillsAsync(string curriculumId, string? search = null, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<CurriculumNodeRefDto> CreateSkillAsync(string curriculumId, CreateCurriculumNodeRequestDto request, string actorId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<CurriculumNodeRefDto> PublishCurriculumNodeAsync(string curriculumId, string nodeType, string nodeId, string reviewerId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<List<PrerequisiteLessonDto>> ListCurriculumLessonsAsync(string curriculumId, string? excludeLessonId = null, string? search = null, CancellationToken ct = default) => throw new NotImplementedException();
    }
}
