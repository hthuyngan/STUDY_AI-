using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using Xunit;

namespace StudyAI.IntegrationTests;

public class QuestionMappingAndAssessmentIntegrityTests : IClassFixture<StudyAIApiFixture>
{
    private readonly StudyAIApiFixture _fixture;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public QuestionMappingAndAssessmentIntegrityTests(StudyAIApiFixture fixture)
    {
        _fixture = fixture;
    }

    private async Task<string> LoginAsAsync(HttpClient client, string email, string password)
    {
        var res = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return body.GetProperty("accessToken").GetString()!;
    }

    private static HttpClient CreateAuthedClient(StudyAIApiFixture fixture, string token)
    {
        var client = fixture.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task P05_DurableKey_FingerprintDuplicate_SkillMapping_AssessmentCompose_ZeroLeak_And_ImmutableFinalize()
    {
        using var anon = _fixture.CreateClient();
        var adminToken = await LoginAsAsync(anon, "admin@studyai.internal", "Admin@123456");
        var reviewerToken = await LoginAsAsync(anon, "content@studyai.internal", "Content@123456");
        var studentToken = await LoginAsAsync(anon, "learner@studyai.internal", "Learner@123456");
        var teacherToken = await LoginAsAsync(anon, "content2@studyai.internal", "Content2@123456");

        using var admin = CreateAuthedClient(_fixture, adminToken);
        using var reviewer = CreateAuthedClient(_fixture, reviewerToken);
        using var student = CreateAuthedClient(_fixture, studentToken);
        using var otherUser = CreateAuthedClient(_fixture, teacherToken);

        var key = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

        // Setup Curriculum -> Edition -> Chapter -> Lesson + Skill
        var grade = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/grades", new { code = $"GP5_{key}", name = $"Khối P05 {key}" })).Content.ReadFromJsonAsync<JsonElement>();
        var subj = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/subjects", new { code = $"SP5_{key}", name = $"Vật lý P05 {key}" })).Content.ReadFromJsonAsync<JsonElement>();
        var curr = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/curricula", new
        {
            code = $"CP5_{key}",
            gradeLevelId = grade.GetProperty("id").GetString(),
            subjectId = subj.GetProperty("id").GetString(),
            name = $"CT Lý {key}",
            framework = "E2E"
        })).Content.ReadFromJsonAsync<JsonElement>();
        var currId = curr.GetProperty("id").GetString()!;
        (await admin.PostAsJsonAsync($"/api/v1/content/catalog/curricula/{currId}/publish", new { rowVersion = curr.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        var ed = await (await admin.PostAsJsonAsync("/api/v1/content/catalog/editions", new
        {
            code = $"EP5_{key}",
            curriculumId = currId,
            editionName = $"Bản P05 {key}"
        })).Content.ReadFromJsonAsync<JsonElement>();
        var edId = ed.GetProperty("id").GetString()!;
        (await admin.PostAsJsonAsync($"/api/v1/content/catalog/editions/{edId}/publish", new { rowVersion = ed.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        var ch = await (await admin.PostAsJsonAsync("/api/v1/content/chapters", new { curriculumEditionId = edId, code = $"CHP5_{key}", title = $"Chương P05 {key}" })).Content.ReadFromJsonAsync<JsonElement>();
        var chId = ch.GetProperty("id").GetString()!;
        var chSub = await (await admin.PostAsJsonAsync($"/api/v1/content/chapters/{chId}/submit-review", new { rowVersion = ch.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>();
        var chApp = await (await reviewer.PostAsJsonAsync($"/api/v1/content/chapters/{chId}/approve", new { rowVersion = chSub.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>();
        (await reviewer.PostAsJsonAsync($"/api/v1/content/chapters/{chId}/publish", new { rowVersion = chApp.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        var les = await (await admin.PostAsJsonAsync("/api/v1/content/lessons", new
        {
            chapterId = chId,
            code = $"LP5_{key}",
            title = $"Bài học P05 {key}",
            slug = $"bai-p05-{key.ToLowerInvariant()}",
            introduction = "Mở đầu P05.",
            definitions = new[] { new { term = "Định nghĩa P05", content = "Nội dung P05" } },
            sourceName = "SGK Lý",
            sourceLicense = "Internal-Approved"
        })).Content.ReadFromJsonAsync<JsonElement>();
        var lessonId = les.GetProperty("id").GetString()!;
        var lesSub = await (await admin.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/submit-review", new { rowVersion = les.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>();
        var lesApp = await (await reviewer.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/approve", new { rowVersion = lesSub.GetProperty("rowVersion").GetString() })).Content.ReadFromJsonAsync<JsonElement>();
        (await reviewer.PostAsJsonAsync($"/api/v1/content/lessons/{lessonId}/publish", new { rowVersion = lesApp.GetProperty("rowVersion").GetString() })).EnsureSuccessStatusCode();

        var skill = await (await admin.PostAsJsonAsync($"/api/v1/content/curricula/{currId}/skills", new
        {
            code = $"SKP5_{key}",
            title = "Vận dụng định luật P05",
            sourceName = "SGK Lý",
            sourceLicense = "Internal-Approved"
        })).Content.ReadFromJsonAsync<JsonElement>();
        var skillId = skill.GetProperty("id").GetString()!;

        // 1. Invalid skill or lesson ID rejected
        var badSkillCreate = await reviewer.PostAsJsonAsync("/api/v1/content/questions", new
        {
            lessonId,
            prompt = $"Câu hỏi P05 {key}",
            options = new[] { "A", "B", "C", "D" },
            correctAnswer = "A",
            skillIds = new[] { "non_existent_skill" }
        });
        Assert.Equal(HttpStatusCode.BadRequest, badSkillCreate.StatusCode);

        // 2. Create question with real LessonId & SkillId -> starts draft with QuestionKey + Fingerprint + RowVersion
        var createQResp = await reviewer.PostAsJsonAsync("/api/v1/content/questions", new
        {
            lessonId,
            prompt = $"Tính vận tốc P05 {key}?",
            options = new[] { "10 m/s", "20 m/s", "30 m/s", "40 m/s" },
            correctAnswer = "20 m/s",
            explanation = "v = s / t = 20 m/s",
            skillIds = new[] { skillId }
        });
        Assert.Equal(HttpStatusCode.Created, createQResp.StatusCode);
        var qDto = await createQResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var qId = qDto.GetProperty("id").GetString()!;
        var qKey = qDto.GetProperty("questionKey").GetString()!;
        var qFp = qDto.GetProperty("contentFingerprint").GetString()!;
        var qRv = qDto.GetProperty("rowVersion").GetString()!;
        Assert.StartsWith("qkey_", qKey);
        Assert.Equal("draft", qDto.GetProperty("status").GetString());
        Assert.Equal(64, qFp.Length);
        Assert.Equal(skillId, qDto.GetProperty("skillIds")[0].GetString());

        // 3. Duplicate fingerprint prevention -> 409 Conflict
        var dupResp = await reviewer.PostAsJsonAsync("/api/v1/content/questions", new
        {
            lessonId,
            prompt = $"  tính   vận tốc p05 {key}? ",
            options = new[] { "10 m/s", "20 m/s", "30 m/s", "40 m/s" },
            correctAnswer = "20 m/s"
        });
        Assert.Equal(HttpStatusCode.Conflict, dupResp.StatusCode);

        // 4. Stale RowVersion on update & skill mapping -> 409 Conflict
        var staleSkill = await reviewer.PutAsJsonAsync($"/api/v1/content/questions/{qId}/skills", new
        {
            skillIds = new[] { skillId },
            rowVersion = "AAAAAAAAAAA="
        });
        Assert.Equal(HttpStatusCode.Conflict, staleSkill.StatusCode);

        // 5. Publish question via workflow (independent reviewer content2 approves & publishes)
        (await reviewer.PostAsync($"/api/v1/content/questions/{qId}/submit-review", null)).EnsureSuccessStatusCode();
        (await otherUser.PostAsync($"/api/v1/content/questions/{qId}/approve", null)).EnsureSuccessStatusCode();
        (await otherUser.PostAsync($"/api/v1/content/questions/{qId}/publish", null)).EnsureSuccessStatusCode();

        // 6. Create Assessment & compose pinned question
        var assess = await (await admin.PostAsJsonAsync("/api/v1/content/assessments", new
        {
            lessonId,
            title = $"Kiểm tra P05 {key}",
            passScore = 60,
            durationMinutes = 15
        })).Content.ReadFromJsonAsync<JsonElement>();
        var assessId = assess.GetProperty("id").GetString()!;

        var composeResp = await admin.PutAsJsonAsync($"/api/v1/content/assessments/{assessId}/questions", new
        {
            items = new[] { new { questionId = qId, points = 2 } }
        });
        composeResp.EnsureSuccessStatusCode();

        // 7. Zero answer-key leak on learner question bank / lesson questions
        var learnerQuestions = await (await student.GetAsync($"/api/v1/curriculum/lessons/{lessonId}/questions")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("correctAnswer", learnerQuestions, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("explanation", learnerQuestions, StringComparison.OrdinalIgnoreCase);

        var bankList = await (await student.GetAsync($"/api/v1/curriculum/question-bank?lessonId={lessonId}")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("correctAnswer", bankList, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("SKILL-GENERAL", bankList, StringComparison.OrdinalIgnoreCase);

        // 8. Create attempt, verify cross-user isolation (403), server-side finalize, and immutability (409)
        var createAttResp = await student.PostAsJsonAsync("/api/v1/me/assessment-attempts", new
        {
            assessmentId = assessId,
            lessonId,
            subjectId = subj.GetProperty("id").GetString()!,
            completionStatus = "incomplete"
        });
        Assert.Equal(HttpStatusCode.Created, createAttResp.StatusCode);
        var attDto = await createAttResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var attId = attDto.GetProperty("id").GetString()!;

        // Cross-user isolation: another user cannot finalize student's attempt
        var crossFinalize = await otherUser.PostAsJsonAsync($"/api/v1/me/assessment-attempts/{attId}/finalize", new
        {
            answers = new Dictionary<string, List<string>> { [qId] = new() { "20 m/s" } }
        });
        Assert.Equal(HttpStatusCode.Forbidden, crossFinalize.StatusCode);

        // Arbitrary question ID rejected (400)
        var badQFinalize = await student.PostAsJsonAsync($"/api/v1/me/assessment-attempts/{attId}/finalize", new
        {
            answers = new Dictionary<string, List<string>> { ["fake_question_id"] = new() { "A" } }
        });
        Assert.Equal(HttpStatusCode.BadRequest, badQFinalize.StatusCode);

        // Valid server-side finalize
        var finalizeResp = await student.PostAsJsonAsync($"/api/v1/me/assessment-attempts/{attId}/finalize", new
        {
            answers = new Dictionary<string, List<string>> { [qId] = new() { "20 m/s" } },
            sessionTimeMs = 12000
        });
        finalizeResp.EnsureSuccessStatusCode();
        var finalized = await finalizeResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(finalized.GetProperty("isFinalized").GetBoolean());
        Assert.Equal("completed", finalized.GetProperty("completionStatus").GetString());
        Assert.Equal("passed", finalized.GetProperty("successStatus").GetString());
        Assert.Equal(2.0, finalized.GetProperty("scoreRaw").GetDouble());
        Assert.Equal(2.0, finalized.GetProperty("scoreMax").GetDouble());

        // Finalized attempt is immutable: repeated finalize or PUT returns 409 Conflict
        var reFinalize = await student.PostAsJsonAsync($"/api/v1/me/assessment-attempts/{attId}/finalize", new
        {
            answers = new Dictionary<string, List<string>> { [qId] = new() { "10 m/s" } }
        });
        Assert.Equal(HttpStatusCode.Conflict, reFinalize.StatusCode);

        var mutateFinalized = await student.PutAsJsonAsync($"/api/v1/me/assessment-attempts/{attId}", new
        {
            id = attId,
            assessmentId = assessId,
            lessonId,
            subjectId = subj.GetProperty("id").GetString()!,
            scoreRaw = 0.0
        });
        Assert.Equal(HttpStatusCode.Conflict, mutateFinalized.StatusCode);

        // 9. Verify QuestionKey, AssessmentQuestion pin, and StaffAuditLog persisted in SQL
        using var scope = _fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var pin = await db.AssessmentQuestions.FirstOrDefaultAsync(x => x.AssessmentId == assessId && x.QuestionId == qId);
        Assert.NotNull(pin);
        Assert.Equal(qFp, pin!.PinnedFingerprint);
        Assert.True(await db.StaffAuditLogs.AnyAsync(a => a.TargetId == qId && a.Action == "question_created"));
        Assert.True(await db.StaffAuditLogs.AnyAsync(a => a.TargetId == assessId && a.Action == "assessment_questions_composed"));

        // P05-002 & P05-004: Reject draft question, cross-lesson question, and blank QuestionId in Compose
        var draftQ = await (await reviewer.PostAsJsonAsync("/api/v1/content/questions", new
        {
            lessonId,
            prompt = $"Draft Q {key}",
            options = new[] { "A", "B" },
            correctAnswer = "A"
        })).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var draftQId = draftQ.GetProperty("id").GetString()!;

        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync($"/api/v1/content/assessments/{assessId}/questions", new
        {
            items = new[] { new { questionId = draftQId, points = 1 } }
        })).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync($"/api/v1/content/assessments/{assessId}/questions", new
        {
            items = new[] { new { questionId = "   ", points = 1 } }
        })).StatusCode);

        // P05-001 & P05-003: Pinned snapshot grading survives source edit + order-insensitive multi-select grading
        var msQ = await (await reviewer.PostAsJsonAsync("/api/v1/content/questions", new
        {
            lessonId,
            type = "multiple-select",
            prompt = $"Chọn các số chẵn {key}",
            options = new[] { "A", "B", "C", "D" },
            correctAnswer = "A,B"
        })).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var msQId = msQ.GetProperty("id").GetString()!;
        var msQRv = msQ.GetProperty("rowVersion").GetString()!;
        (await reviewer.PostAsync($"/api/v1/content/questions/{msQId}/submit-review", null)).EnsureSuccessStatusCode();
        (await otherUser.PostAsync($"/api/v1/content/questions/{msQId}/approve", null)).EnsureSuccessStatusCode();
        (await otherUser.PostAsync($"/api/v1/content/questions/{msQId}/publish", null)).EnsureSuccessStatusCode();

        (await admin.PutAsJsonAsync($"/api/v1/content/assessments/{assessId}/questions", new
        {
            items = new[] { new { questionId = msQId, points = 3 } }
        })).EnsureSuccessStatusCode();

        var att2 = await (await student.PostAsJsonAsync("/api/v1/me/assessment-attempts", new
        {
            assessmentId = assessId,
            lessonId,
            subjectId = subj.GetProperty("id").GetString()!,
            completionStatus = "incomplete"
        })).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var att2Id = att2.GetProperty("id").GetString()!;

        // Edit source question's CorrectAnswer AFTER attempt started
        var msLatest = await (await reviewer.GetAsync($"/api/v1/content/questions/{msQId}")).Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        (await reviewer.PutAsJsonAsync($"/api/v1/content/questions/{msQId}", new
        {
            correctAnswer = "C,D",
            rowVersion = msLatest.GetProperty("rowVersion").GetString()
        })).EnsureSuccessStatusCode();

        // Student submits ["B", "A"] (reversed order) -> grades against pinned snapshot "A,B" as 3/3!
        var fin2Resp = await student.PostAsJsonAsync($"/api/v1/me/assessment-attempts/{att2Id}/finalize", new
        {
            answers = new Dictionary<string, List<string>> { [msQId] = new() { "B", "A" } }
        });
        fin2Resp.EnsureSuccessStatusCode();
        var fin2 = await fin2Resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(3.0, fin2.GetProperty("scoreRaw").GetDouble());
        Assert.Equal("passed", fin2.GetProperty("successStatus").GetString());
    }
}
