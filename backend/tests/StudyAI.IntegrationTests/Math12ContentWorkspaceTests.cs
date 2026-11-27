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

public class Math12ContentWorkspaceTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public Math12ContentWorkspaceTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> CreateUserWithRoleAsync(string prefix, string role)
    {
        var email = $"{prefix}_{Guid.NewGuid():N}@studyai.test";
        var regResp = await _client.PostAsync("/api/v1/auth/register", new StringContent(
            JsonSerializer.Serialize(new { email, password = "Password@123456", displayName = prefix, grade = "12" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, regResp.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var user = await db.Users.FirstAsync(u => u.EmailNormalized == email.ToUpperInvariant());
            user.Role = role;
            await db.SaveChangesAsync();
        }

        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new { email, password = "Password@123456" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        using var doc = JsonDocument.Parse(await loginResp.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("accessToken").GetString()!;
    }

    [Fact]
    public async Task ContentWorkspace_Materials_KnowledgeBase_And_RBAC_WorkEndToEnd()
    {
        var contentToken = await CreateUserWithRoleAsync("cnt_ws", "content");
        var learnerToken = await CreateUserWithRoleAsync("lrn_ws", "learner");
        var teacherToken = await CreateUserWithRoleAsync("tch_ws", "teacher");

        // 1. Learner & Teacher cannot access Content workspace dashboard or materials -> 403
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/content/workspace/dashboard")).StatusCode);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/content/workspace/knowledge-sources")).StatusCode);

        // 2. Content creates material with valid metadata
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var matResp = await _client.PostAsync("/api/v1/content/workspace/materials", new StringContent(
            JsonSerializer.Serialize(new CreateContentMaterialRequestDto
            {
                Title = "Bảng công thức Nguyên hàm Toán 12",
                Category = "formula_sheet",
                ChapterCode = "M12-C4",
                ChapterTitle = "Nguyên hàm và tích phân",
                FileName = "nguyen-ham-12.pdf",
                MimeType = "application/pdf",
                FileSizeBytes = 102400,
                Base64Header = Convert.ToBase64String(Encoding.ASCII.GetBytes("%PDF-1.7")),
                StoragePathOrUrl = "https://cdn.studyai.vn/math12/nguyen-ham-12.pdf"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, matResp.StatusCode);
        var mat = JsonSerializer.Deserialize<ContentMaterialDto>(await matResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("draft", mat.Status);

        // Unpublished material cannot be added to AI Knowledge Base
        var badRagResp = await _client.PostAsync("/api/v1/content/workspace/knowledge-sources", new StringContent(
            JsonSerializer.Serialize(new RegisterAiKnowledgeSourceRequestDto { SourceType = "material", SourceRefId = mat.Id }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, badRagResp.StatusCode);

        // Publish material -> register in AI Knowledge Base -> retrieve -> revoke
        var pubResp = await _client.PatchAsync($"/api/v1/content/workspace/materials/{mat.Id}/status", new StringContent(
            JsonSerializer.Serialize(new UpdateContentMaterialStatusRequestDto { Status = "published" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, pubResp.StatusCode);

        // Published material without extracted text -> marked failed, NOT indexed
        var noTextRagResp = await _client.PostAsync("/api/v1/content/workspace/knowledge-sources", new StringContent(
            JsonSerializer.Serialize(new RegisterAiKnowledgeSourceRequestDto { SourceType = "material", SourceRefId = mat.Id }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, noTextRagResp.StatusCode);
        var noTextRag = JsonSerializer.Deserialize<AiKnowledgeSourceDto>(await noTextRagResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("failed", noTextRag.Status);
        Assert.Equal(0, noTextRag.ChunkCount);

        // Published material WITH extracted text -> indexed and retrievable
        var ragResp = await _client.PostAsync("/api/v1/content/workspace/knowledge-sources", new StringContent(
            JsonSerializer.Serialize(new RegisterAiKnowledgeSourceRequestDto
            {
                SourceType = "material",
                SourceRefId = mat.Id,
                ExtractedText = "Công thức Nguyên hàm cơ bản Toán 12: nguyên hàm của x^n là x^(n+1)/(n+1) + C."
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, ragResp.StatusCode);
        var rag = JsonSerializer.Deserialize<AiKnowledgeSourceDto>(await ragResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("indexed", rag.Status);
        Assert.True(rag.ChunkCount >= 1);

        var retResp = await _client.PostAsync("/api/v1/content/workspace/knowledge-sources/retrieve-test", new StringContent(
            JsonSerializer.Serialize(new RetrieveKnowledgeTestRequestDto { Query = "Nguyên hàm", TopK = 5 }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, retResp.StatusCode);
        var chunks = JsonSerializer.Deserialize<List<RetrievedKnowledgeChunkDto>>(await retResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Contains(chunks, c => c.SourceId == rag.Id);

        // Revoke removes chunks
        var revResp = await _client.DeleteAsync($"/api/v1/content/workspace/knowledge-sources/{rag.Id}");
        Assert.Equal(HttpStatusCode.OK, revResp.StatusCode);
        var retAfter = await _client.PostAsync("/api/v1/content/workspace/knowledge-sources/retrieve-test", new StringContent(
            JsonSerializer.Serialize(new RetrieveKnowledgeTestRequestDto { Query = "Nguyên hàm", TopK = 5 }),
            Encoding.UTF8,
            "application/json"));
        var chunksAfter = JsonSerializer.Deserialize<List<RetrievedKnowledgeChunkDto>>(await retAfter.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.DoesNotContain(chunksAfter, c => c.SourceId == rag.Id);

        // 3. Learner submits content error report, Content triages it
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var errCreate = await _client.PostAsync("/api/v1/content/workspace/error-reports", new StringContent(
            JsonSerializer.Serialize(new CreateContentErrorReportRequestDto
            {
                TargetType = "formula",
                Title = "Sai dấu công thức tích phân",
                Description = "Cận tích phân bị đảo dấu.",
                Severity = "high"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, errCreate.StatusCode);
    }
}
