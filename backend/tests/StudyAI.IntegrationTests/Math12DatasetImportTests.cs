using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using StudyAI.Features.Content;
using StudyAI.Models;
using Xunit;

namespace StudyAI.IntegrationTests;

public class Math12DatasetImportTests : IClassFixture<StudyAIApiFixture>
{
    private readonly StudyAIApiFixture _factory;
    private readonly HttpClient _client;

    public Math12DatasetImportTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static string ResolveDatasetDir()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidate = Path.Combine(dir.FullName, "backend", "data", "math12");
            if (Directory.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("Could not locate backend/data/math12 from test base directory.");
    }

    [Fact]
    public async Task Math12Dataset_DryRun_ProtectedUpsert_RealMaterialDownload_And_Grading_Work()
    {
        var dataDir = ResolveDatasetDir();

        // Register learner & content author
        var email = $"m12_student_{Guid.NewGuid():N}@studyai.test";
        var regResp = await _client.PostAsync("/api/v1/auth/register", new StringContent(
            JsonSerializer.Serialize(new { email, password = "Password@123456", displayName = "M12 Student", grade = "12" }),
            Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, regResp.StatusCode);

        string authorUserId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            authorUserId = await db.Users.Where(u => u.EmailNormalized == email.ToUpperInvariant()).Select(u => u.Id).FirstAsync();
        }

        // 1. M12-003: Non-existent importer user must fail closed before any write
        using (var scope = _factory.Services.CreateScope())
        {
            var importer = scope.ServiceProvider.GetRequiredService<Math12DatasetImportService>();
            await Assert.ThrowsAsync<ValidationException>(() =>
                importer.ImportFromDirectoryAsync(dataDir, dryRun: true, createdByUserId: "non-existent-user"));
        }

        // 2. M12-005: Real Dry-run validates everything and leaves database untouched
        using (var scope = _factory.Services.CreateScope())
        {
            var importer = scope.ServiceProvider.GetRequiredService<Math12DatasetImportService>();
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var beforeBlocks = await db.LessonContentBlocks.CountAsync();
            var dry = await importer.ImportFromDirectoryAsync(dataDir, dryRun: true, createdByUserId: authorUserId);
            Assert.True(dry.DryRun);
            Assert.Equal(345, dry.InsertCount); // 190 blocks + 112 questions + 12 assessments + 6 materials + 6 sources + 19 chunks
            Assert.Equal(0, dry.RejectedCount);
            Assert.Equal(beforeBlocks, await db.LessonContentBlocks.CountAsync());
        }

        // 3. M12-002: Real import in isolated StudyAIDb_Clean_{GUID} with allowPublishInIsolatedTest: true
        using (var scope = _factory.Services.CreateScope())
        {
            var importer = scope.ServiceProvider.GetRequiredService<Math12DatasetImportService>();
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();

            var first = await importer.ImportFromDirectoryAsync(dataDir, dryRun: false, createdByUserId: authorUserId, allowPublishInIsolatedTest: true);
            Assert.False(first.DryRun);
            Assert.Equal(190, first.LessonBlocksUpserted);
            Assert.Equal(112, first.QuestionsUpserted);
            Assert.Equal(12, first.AssessmentsUpserted);
            Assert.Equal(6, first.MaterialsUpserted);
            Assert.Equal(19, first.KnowledgeChunksUpserted);

            // Second run reports conflicts on published records without mutating them
            var second = await importer.ImportFromDirectoryAsync(dataDir, dryRun: false, createdByUserId: authorUserId, allowPublishInIsolatedTest: true);
            Assert.True(second.ConflictCount > 0);
            Assert.Equal(112, await db.ContentQuestions.CountAsync(q => q.Id.StartsWith("q_m12_")));
            Assert.Equal(190, await db.LessonContentBlocks.CountAsync(b => b.Id.StartsWith("blk_les_math12_")));
        }

        // 4. Login learner, verify real material download (R09-03), and submit mixed-format assessment
        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new { email, password = "Password@123456" }),
            Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        using var loginDoc = JsonDocument.Parse(await loginResp.Content.ReadAsStringAsync());
        var token = loginDoc.RootElement.GetProperty("accessToken").GetString()!;
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var dlResp = await _client.GetAsync("/api/v1/content/workspace/materials/mat_orig_m12-c1/download");
        Assert.Equal(HttpStatusCode.OK, dlResp.StatusCode);
        var dlText = await dlResp.Content.ReadAsStringAsync();
        Assert.Contains("Ứng dụng đạo hàm", dlText);

        var attemptPayload = new
        {
            assessmentId = "asm_m12_c1",
            lessonId = "les_math12_c1_b1",
            subjectId = "sub_math12",
            completionStatus = "completed",
            responses = new Dictionary<string, object>
            {
                ["q_m12_c1_01"] = new { questionId = "q_m12_c1_01", selectedOptionIds = new[] { "$(0; 2)$" } },
                ["q_m12_c1_03"] = new { questionId = "q_m12_c1_03", selectedOptionIds = new[] { "$3$" } },
                ["q_m12_c1_05"] = new { questionId = "q_m12_c1_05", selectedOptionIds = new[] { "$y = 2$" } },
                ["q_m12_c1_07"] = new { questionId = "q_m12_c1_07", selectedOptionIds = new[] { "$(1; 0)$" } },
                ["q_m12_c1_09"] = new { questionId = "q_m12_c1_09", selectedOptionIds = new[] { "$25\\text{ m}^2$" } },
                ["q_m12_c1_11"] = new { questionId = "q_m12_c1_11", selectedOptionIds = new[] { "Đúng,Sai,Đúng,Đúng" } },
                ["q_m12_c1_13"] = new { questionId = "q_m12_c1_13", selectedOptionIds = new[] { "3.0" } }
            }
        };
        var attResp = await _client.PostAsync("/api/v1/me/assessment-attempts", new StringContent(
            JsonSerializer.Serialize(attemptPayload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, attResp.StatusCode);
        using var attDoc = JsonDocument.Parse(await attResp.Content.ReadAsStringAsync());
        Assert.Equal(7.0, attDoc.RootElement.GetProperty("scoreRaw").GetDouble());
        Assert.Equal(13.0, attDoc.RootElement.GetProperty("scoreMax").GetDouble());
        Assert.Equal("failed", attDoc.RootElement.GetProperty("successStatus").GetString());
    }
}
