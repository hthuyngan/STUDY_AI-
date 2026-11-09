using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Application.DTOs;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.IntegrationTests;

public class CurriculumImportPreviewIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _fixture;

    public CurriculumImportPreviewIntegrationTests(StudyAIApiFixture fixture)
    {
        _fixture = fixture;
        _client = fixture.CreateClient();
    }

    private async Task<string> GetAdminTokenAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "admin@studyai.internal",
            password = "Admin@123456"
        });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("accessToken").GetString()!;
    }

    private async Task<string> GetContentStaffTokenAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "content@studyai.internal",
            password = "Content@123456"
        });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("accessToken").GetString()!;
    }

    private async Task<string> GetLearnerTokenAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "learner@studyai.internal",
            password = "Learner@123456"
        });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("accessToken").GetString()!;
    }

    [Fact]
    public async Task Preview_WithoutToken_ReturnsUnauthorized401()
    {
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("test")), "file", "test.csv");

        var response = await _client.PostAsync("/api/v1/content/import/preview", form);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Preview_AsLearner_ReturnsForbidden403()
    {
        var token = await GetLearnerTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/preview");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("test")), "file", "test.csv");
        request.Content = form;

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Preview_WithEmptyFile_ReturnsBadRequest400()
    {
        var token = await GetContentStaffTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/preview");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Array.Empty<byte>()), "file", "empty.csv");
        request.Content = form;

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("FILE_EMPTY", body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Preview_WithUnsupportedExtension_ReturnsBadRequest400()
    {
        var token = await GetContentStaffTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/preview");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("sample text")), "file", "document.txt");
        request.Content = form;

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("UNSUPPORTED_FORMAT", body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Preview_WithMalformedJson_ReturnsBadRequest400()
    {
        var token = await GetContentStaffTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/preview");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("{ broken json: true ")), "file", "corrupt.json");
        request.Content = form;

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("MALFORMED_JSON", body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Preview_WithEmptyOrMissingStructureCsv_ReturnsBadRequest400()
    {
        var token = await GetContentStaffTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/preview");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Header only, no data rows
        var emptyCsv = "subjectCode,prompt,options,correctAnswer\n";
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes(emptyCsv)), "file", "nodata.csv");
        request.Content = form;

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("PARSE_ERROR", body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Preview_ValidCurriculumFile_ReturnsPreviewTokenAndSummary_AndNeverModifiesDatabase()
    {
        // 1. Measure initial database counts (Read-only guarantee test)
        int initialSubjects, initialChapters, initialLessons, initialQuestions;
        using (var scope = _fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            initialSubjects = await db.ContentSubjects.CountAsync();
            initialChapters = await db.ContentChapters.CountAsync();
            initialLessons = await db.ContentLessons.CountAsync();
            initialQuestions = await db.ContentQuestions.CountAsync();
        }

        // 2. Prepare valid CSV upload
        var csvContent = """
        subjectCode,prompt,options,correctAnswer,difficulty,type,explanation
        MATH12,"Hàm số $y = x^3 - 3x$ nghịch biến trên khoảng nào?","A. $(-1; 1)$ | B. $(-\infty; -1)$ | C. $(1; +\infty)$ | D. $\mathbb{R}$",A,medium,multiple-choice,"Đạo hàm $y' = 3x^2 - 3 < 0 \iff x \in (-1; 1)$."
        """;

        var token = await GetContentStaffTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/preview");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes(csvContent)), "file", "math12_preview.csv");
        request.Content = form;

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var preview = await response.Content.ReadFromJsonAsync<CurriculumImportPreviewResponseDto>();
        Assert.NotNull(preview);
        Assert.StartsWith("prev_", preview.PreviewToken);
        Assert.NotEmpty(preview.FileHashSha256);
        Assert.Equal("csv", preview.FileFormat);
        Assert.Equal("math12_preview.csv", preview.FileName);
        Assert.Equal(1, preview.Summary.TotalItems);
        Assert.Single(preview.PreviewItems);
        Assert.True(preview.ExpiresAt > DateTimeOffset.UtcNow);

        // 3. STRICT READ-ONLY INVARIANT: Database counts after preview must remain strictly identical
        using (var scope = _fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            int afterSubjects = await db.ContentSubjects.CountAsync();
            int afterChapters = await db.ContentChapters.CountAsync();
            int afterLessons = await db.ContentLessons.CountAsync();
            int afterQuestions = await db.ContentQuestions.CountAsync();

            Assert.Equal(initialSubjects, afterSubjects);
            Assert.Equal(initialChapters, afterChapters);
            Assert.Equal(initialLessons, afterLessons);
            Assert.Equal(initialQuestions, afterQuestions);
        }
    }
}

