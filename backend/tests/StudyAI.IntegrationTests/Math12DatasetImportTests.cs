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
    public async Task Math12Dataset_DryRun_IdempotentImport_AssessmentGrading_And_DraftIsolation_Work()
    {
        var dataDir = ResolveDatasetDir();

        // 1. Dry-run leaves database untouched
        using (var scope = _factory.Services.CreateScope())
        {
            var importer = scope.ServiceProvider.GetRequiredService<Math12DatasetImportService>();
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var beforeBlocks = await db.LessonContentBlocks.CountAsync();
            var dry = await importer.ImportFromDirectoryAsync(dataDir, dryRun: true);
            Assert.True(dry.DryRun);
            Assert.Equal(76, dry.LessonBlocksUpserted);
            Assert.Equal(68, dry.QuestionsUpserted);
            Assert.Equal(8, dry.AssessmentsUpserted);
            Assert.Equal(beforeBlocks, await db.LessonContentBlocks.CountAsync());
        }

        // 2. Real import + Idempotent re-import
        using (var scope = _factory.Services.CreateScope())
        {
            var importer = scope.ServiceProvider.GetRequiredService<Math12DatasetImportService>();
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();

            var first = await importer.ImportFromDirectoryAsync(dataDir, dryRun: false);
            Assert.False(first.DryRun);
            Assert.Equal(76, first.LessonBlocksUpserted);
            Assert.Equal(68, first.QuestionsUpserted);
            Assert.Equal(8, first.AssessmentsUpserted);
            Assert.Equal(6, first.MaterialsUpserted);
            Assert.Equal(19, first.KnowledgeChunksUpserted);

            var countAfterFirst = await db.ContentQuestions.CountAsync(q => q.Id.StartsWith("q_m12_"));
            Assert.Equal(68, countAfterFirst);

            // Second run must be idempotent (no duplicate questions or blocks)
            var second = await importer.ImportFromDirectoryAsync(dataDir, dryRun: false);
            Assert.Equal(68, await db.ContentQuestions.CountAsync(q => q.Id.StartsWith("q_m12_")));
            Assert.Equal(76, await db.LessonContentBlocks.CountAsync(b => b.Id.StartsWith("blk_les_math12_")));
        }

        // 3. Register learner and submit mixed-format assessment (MC + true-false-group + short-answer) on asm_m12_c1
        var email = $"m12_student_{Guid.NewGuid():N}@studyai.test";
        var regResp = await _client.PostAsync("/api/v1/auth/register", new StringContent(
            JsonSerializer.Serialize(new { email, password = "Password@123456", displayName = "M12 Student", grade = "12" }),
            Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, regResp.StatusCode);

        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new { email, password = "Password@123456" }),
            Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        using var loginDoc = JsonDocument.Parse(await loginResp.Content.ReadAsStringAsync());
        var token = loginDoc.RootElement.GetProperty("accessToken").GetString()!;
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

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
        Assert.Equal(7.0, attDoc.RootElement.GetProperty("scoreMax").GetDouble());
        Assert.Equal("passed", attDoc.RootElement.GetProperty("successStatus").GetString());
    }
}
