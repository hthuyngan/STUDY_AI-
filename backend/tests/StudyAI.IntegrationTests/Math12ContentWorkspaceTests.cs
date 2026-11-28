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

        // CONTENT-001: Re-index published material, then archive material -> chunks automatically revoked & not retrievable
        var rag2Resp = await _client.PostAsync("/api/v1/content/workspace/knowledge-sources", new StringContent(
            JsonSerializer.Serialize(new RegisterAiKnowledgeSourceRequestDto
            {
                SourceType = "material",
                SourceRefId = mat.Id,
                ExtractedText = "Định lý cơ bản của giải tích Toán 12."
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, rag2Resp.StatusCode);
        var rag2 = JsonSerializer.Deserialize<AiKnowledgeSourceDto>(await rag2Resp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("indexed", rag2.Status);

        var archiveResp = await _client.PatchAsync($"/api/v1/content/workspace/materials/{mat.Id}/status", new StringContent(
            JsonSerializer.Serialize(new UpdateContentMaterialStatusRequestDto { Status = "archived" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, archiveResp.StatusCode);

        var retAfterArchive = await _client.PostAsync("/api/v1/content/workspace/knowledge-sources/retrieve-test", new StringContent(
            JsonSerializer.Serialize(new RetrieveKnowledgeTestRequestDto { Query = "giải tích", TopK = 5 }),
            Encoding.UTF8,
            "application/json"));
        var chunksAfterArchive = JsonSerializer.Deserialize<List<RetrievedKnowledgeChunkDto>>(await retAfterArchive.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.DoesNotContain(chunksAfterArchive, c => c.SourceId == rag2.Id);

        // Verify SQL projection endpoints with real rows (materials, knowledge-sources)
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/v1/content/workspace/materials")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/v1/content/workspace/knowledge-sources")).StatusCode);

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

        // CW-002: Unsupported TargetType or Severity returns 400 BadRequest
        var badErr = await _client.PostAsync("/api/v1/content/workspace/error-reports", new StringContent(
            JsonSerializer.Serialize(new CreateContentErrorReportRequestDto
            {
                TargetType = "invalid_target",
                Title = "Lỗi không hợp lệ",
                Description = "Chi tiết",
                Severity = "critical"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, badErr.StatusCode);

        // CONTENT-002 & CW-004: Multipart upload computes real byte SHA-256, extracts text, and enforces download auth
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        using var form1 = new MultipartFormDataContent();
        form1.Add(new StringContent("Tài liệu Giải tích Upload"), "title");
        form1.Add(new StringContent("chapter_doc"), "category");
        var fc1 = new ByteArrayContent(Encoding.UTF8.GetBytes("Tích phân từng phần Toán 12."));
        fc1.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        form1.Add(fc1, "file", "giai-tich-1.txt");
        var up1 = await _client.PostAsync("/api/v1/content/workspace/materials/upload", form1);
        Assert.Equal(HttpStatusCode.Created, up1.StatusCode);
        var up1Dto = JsonSerializer.Deserialize<ContentMaterialDto>(await up1.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.False(string.IsNullOrWhiteSpace(up1Dto.FileHashSha256));
        Assert.True(up1Dto.HasExtractedText);

        using var form2 = new MultipartFormDataContent();
        form2.Add(new StringContent("Tài liệu Giải tích Upload 2"), "title");
        form2.Add(new StringContent("chapter_doc"), "category");
        var fc2 = new ByteArrayContent(Encoding.UTF8.GetBytes("Nội dung khác hoàn toàn."));
        fc2.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        form2.Add(fc2, "file", "giai-tich-1.txt");
        var up2 = await _client.PostAsync("/api/v1/content/workspace/materials/upload", form2);
        var up2Dto = JsonSerializer.Deserialize<ContentMaterialDto>(await up2.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.NotEqual(up1Dto.FileHashSha256, up2Dto.FileHashSha256);

        // Learner cannot download draft material (403), can download after publish (200)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync($"/api/v1/content/workspace/materials/{up1Dto.Id}/download")).StatusCode);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        Assert.Equal(HttpStatusCode.OK, (await _client.PatchAsync($"/api/v1/content/workspace/materials/{up1Dto.Id}/status", new StringContent(
            JsonSerializer.Serialize(new UpdateContentMaterialStatusRequestDto { Status = "published" }), Encoding.UTF8, "application/json"))).StatusCode);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync($"/api/v1/content/workspace/materials/{up1Dto.Id}/download")).StatusCode);

        // CW-003: Idempotent knowledge registration reuses the same source without duplicates
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var syncA = await _client.PostAsync("/api/v1/content/workspace/knowledge-sources", new StringContent(
            JsonSerializer.Serialize(new RegisterAiKnowledgeSourceRequestDto { SourceType = "material", SourceRefId = up1Dto.Id }),
            Encoding.UTF8, "application/json"));
        var syncB = await _client.PostAsync("/api/v1/content/workspace/knowledge-sources", new StringContent(
            JsonSerializer.Serialize(new RegisterAiKnowledgeSourceRequestDto { SourceType = "material", SourceRefId = up1Dto.Id }),
            Encoding.UTF8, "application/json"));
        var srcA = JsonSerializer.Deserialize<AiKnowledgeSourceDto>(await syncA.Content.ReadAsStringAsync(), JsonOpts)!;
        var srcB = JsonSerializer.Deserialize<AiKnowledgeSourceDto>(await syncB.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal(srcA.Id, srcB.Id);
    }
}
