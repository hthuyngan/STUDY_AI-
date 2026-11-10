using System.IO.Compression;
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

public class CurriculumImportConfirmIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _fixture;

    public CurriculumImportConfirmIntegrationTests(StudyAIApiFixture fixture)
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

    private async Task<string> GeneratePreviewTokenAsync(string token, string content, string fileName)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/preview");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes(content)), "file", fileName);
        request.Content = form;

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var preview = await response.Content.ReadFromJsonAsync<CurriculumImportPreviewResponseDto>();
        Assert.NotNull(preview);
        return preview.PreviewToken;
    }

    private async Task<string> GeneratePreviewTokenFromBytesAsync(string token, byte[] bytes, string fileName)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/preview");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(bytes), "file", fileName);
        request.Content = form;

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var preview = await response.Content.ReadFromJsonAsync<CurriculumImportPreviewResponseDto>();
        Assert.NotNull(preview);
        return preview.PreviewToken;
    }

    [Fact]
    public async Task Confirm_WithoutAuthToken_ReturnsUnauthorized401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/content/import/confirm", new CurriculumImportConfirmRequestDto
        {
            PreviewToken = "prev_1234567890abcdef1234567890abcdef"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Confirm_AsLearner_ReturnsForbidden403()
    {
        var learnerToken = await GetLearnerTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        request.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto
        {
            PreviewToken = "prev_1234567890abcdef1234567890abcdef"
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Confirm_WithMissingOrEmptyToken_ReturnsBadRequest400()
    {
        var staffToken = await GetContentStaffTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", staffToken);
        request.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto
        {
            PreviewToken = ""
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("TOKEN_MISSING", body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Confirm_WithNonExistentToken_ReturnsNotFound404()
    {
        var staffToken = await GetContentStaffTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", staffToken);
        request.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto
        {
            PreviewToken = $"prev_{Guid.NewGuid():N}"
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("TOKEN_NOT_FOUND", body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Confirm_ActorMismatch_ReturnsForbidden403()
    {
        // Staff creates preview
        var staffToken = await GetContentStaffTokenAsync();
        var csv = """
        subjectCode,prompt,options,correctAnswer
        MATH12,"Actor mismatch test prompt","A | B",A
        """;
        var previewToken = await GeneratePreviewTokenAsync(staffToken, csv, "actor_test.csv");

        // Admin attempts to confirm Staff's preview -> Forbidden under V1 single-actor policy
        var adminToken = await GetAdminTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        request.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto
        {
            PreviewToken = previewToken
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ACTOR_MISMATCH", body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Confirm_HappyPath_ValidJsonCurriculumTree_PersistsEntitiesAndAuditLog_AllRelationshipsVerified()
    {
        var staffToken = await GetContentStaffTokenAsync();
        var uniqueSuffix = Guid.NewGuid().ToString("N")[..6];
        var subCode = $"SUB_{uniqueSuffix}";
        var chCode = $"CH_{uniqueSuffix}";
        var lesCode = $"LES_{uniqueSuffix}";

        var jsonTree = $$"""
        {
          "subject": {
            "code": "{{subCode}}",
            "name": "Toán kiểm thử {{uniqueSuffix}}",
            "grade": "12",
            "description": "Môn học kiểm thử tự động",
            "orderIndex": 1,
            "chapters": [
              {
                "code": "{{chCode}}",
                "title": "Chương Hàm số {{uniqueSuffix}}",
                "orderIndex": 1,
                "lessons": [
                  {
                    "code": "{{lesCode}}",
                    "title": "Bài học Đơn điệu {{uniqueSuffix}}",
                    "slug": "bai-hoc-don-dieu-{{uniqueSuffix}}",
                    "orderIndex": 1,
                    "introduction": "Khảo sát tính đơn điệu của hàm số",
                    "definitions": [
                      { "term": "Đồng biến", "content": "Hàm số tăng trên K" }
                    ],
                    "formulas": [
                      { "name": "Đạo hàm", "latex": "f'(x) \\ge 0" }
                    ],
                    "questions": [
                      {
                        "code": "Q01_{{uniqueSuffix}}",
                        "prompt": "Hàm số đồng biến khi nào?",
                        "options": ["A. f'(x) >= 0", "B. f'(x) < 0"],
                        "correctAnswer": "A",
                        "difficulty": "easy",
                        "type": "multiple-choice",
                        "explanation": "Định lý tính đơn điệu cơ bản"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
        """;

        // 1. Generate preview
        var previewToken = await GeneratePreviewTokenAsync(staffToken, jsonTree, "full_tree.json");

        // 2. Confirm import
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", staffToken);
        request.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto
        {
            PreviewToken = previewToken,
            AuditNote = "Integration test full tree"
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var confirmResult = await response.Content.ReadFromJsonAsync<CurriculumImportConfirmResponseDto>();
        Assert.NotNull(confirmResult);
        Assert.True(confirmResult.Success);
        Assert.Equal(previewToken, confirmResult.PreviewToken);
        Assert.NotEmpty(confirmResult.AuditLogId);
        Assert.Equal(1, confirmResult.EntityCounts.Subjects);
        Assert.Equal(1, confirmResult.EntityCounts.Chapters);
        Assert.Equal(1, confirmResult.EntityCounts.Lessons);
        Assert.Equal(1, confirmResult.EntityCounts.Questions);

        // 3. Verify Database Persistence & Referential Integrity
        using (var scope = _fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();

            var dbSub = await db.ContentSubjects.Include(s => s.Chapters).ThenInclude(c => c.Lessons).ThenInclude(l => l.Questions)
                .FirstOrDefaultAsync(s => s.Code == subCode);

            Assert.NotNull(dbSub);
            Assert.Equal($"Toán kiểm thử {uniqueSuffix}", dbSub.Name);
            Assert.Single(dbSub.Chapters);

            var dbCh = dbSub.Chapters.First();
            Assert.Equal($"Chương Hàm số {uniqueSuffix}", dbCh.Title);
            Assert.Equal(dbSub.Id, dbCh.SubjectId);
            Assert.Single(dbCh.Lessons);

            var dbLes = dbCh.Lessons.First();
            Assert.Equal($"Bài học Đơn điệu {uniqueSuffix}", dbLes.Title);
            Assert.Equal($"bai-hoc-don-dieu-{uniqueSuffix}".ToLowerInvariant(), dbLes.Slug);
            Assert.Equal(dbCh.Id, dbLes.ChapterId);
            Assert.Single(dbLes.Questions);

            var dbQ = dbLes.Questions.First();
            Assert.Equal("Hàm số đồng biến khi nào?", dbQ.Prompt);
            Assert.Equal("A", dbQ.CorrectAnswer);
            Assert.Equal(dbLes.Id, dbQ.LessonId);
            Assert.Equal(dbCh.Id, dbQ.ChapterId);
            Assert.Equal(dbSub.Id, dbQ.SubjectId);

            // Verify StaffAuditLog
            var auditLog = await db.StaffAuditLogs.FirstOrDefaultAsync(a => a.TargetId == previewToken && a.Action == "CURRICULUM_IMPORT_CONFIRM");
            Assert.NotNull(auditLog);
            Assert.Equal("CurriculumImport", auditLog.TargetType);
            Assert.Contains("Integration test full tree", auditLog.Payload ?? "");
        }
    }

    [Fact]
    public async Task Confirm_HappyPath_ValidCsvFlatQuestions_PersistsQuestionsLinkedToSubject()
    {
        var staffToken = await GetContentStaffTokenAsync();
        var uniquePrompt = $"Tích phân cơ bản tự động {Guid.NewGuid():N}";

        var csv = $"""
        subjectCode,prompt,options,correctAnswer,difficulty,type,explanation
        MATH12,"{uniquePrompt}","A. F(x) | B. f'(x)",A,easy,multiple-choice,"Định nghĩa nguyên hàm"
        """;

        var previewToken = await GeneratePreviewTokenAsync(staffToken, csv, "flat_questions.csv");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", staffToken);
        request.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto
        {
            PreviewToken = previewToken
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<CurriculumImportConfirmResponseDto>();
        Assert.NotNull(result);
        Assert.Equal(1, result.EntityCounts.Questions);

        using (var scope = _fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var q = await db.ContentQuestions.FirstOrDefaultAsync(x => x.Prompt == uniquePrompt);
            Assert.NotNull(q);
            Assert.Equal("A", q.CorrectAnswer);
        }
    }

    [Fact]
    public async Task Confirm_HappyPath_ValidXlsx_PersistsData()
    {
        var staffToken = await GetContentStaffTokenAsync();
        var uniquePrompt = $"XLSX Prompt {Guid.NewGuid():N}";

        using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            var sheet = archive.CreateEntry("xl/worksheets/sheet1.xml");
            using (var w = new StreamWriter(sheet.Open()))
            {
                w.Write($"""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <sheetData>
                    <row r="1">
                      <c r="A1" t="inlineStr"><is><t>subjectCode</t></is></c>
                      <c r="B1" t="inlineStr"><is><t>prompt</t></is></c>
                      <c r="C1" t="inlineStr"><is><t>options</t></is></c>
                      <c r="D1" t="inlineStr"><is><t>correctAnswer</t></is></c>
                    </row>
                    <row r="2">
                      <c r="A2" t="inlineStr"><is><t>MATH12</t></is></c>
                      <c r="B2" t="inlineStr"><is><t>{uniquePrompt}</t></is></c>
                      <c r="C2" t="inlineStr"><is><t>Opt1 | Opt2</t></is></c>
                      <c r="D2" t="inlineStr"><is><t>A</t></is></c>
                    </row>
                  </sheetData>
                </worksheet>
                """);
            }
        }

        var xlsxBytes = ms.ToArray();
        var previewToken = await GeneratePreviewTokenFromBytesAsync(staffToken, xlsxBytes, "test_data.xlsx");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", staffToken);
        request.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto
        {
            PreviewToken = previewToken
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var scope = _fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var q = await db.ContentQuestions.FirstOrDefaultAsync(x => x.Prompt == uniquePrompt);
            Assert.NotNull(q);
        }
    }

    [Fact]
    public async Task Confirm_InsertOnly_RejectsExistingSubjectWithConflict409()
    {
        var staffToken = await GetContentStaffTokenAsync();

        // MATH12 already exists in DB! Attempting to insert it as a new subject should return Conflict 409
        var jsonWithExistingSub = """
        {
          "subject": {
            "code": "MATH12",
            "name": "Toán 12 Đã Có",
            "chapters": []
          }
        }
        """;

        var previewToken = await GeneratePreviewTokenAsync(staffToken, jsonWithExistingSub, "dup_sub.json");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", staffToken);
        request.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto
        {
            PreviewToken = previewToken
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ENTITY_ALREADY_EXISTS", body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Confirm_DoubleConfirm_SecondAttemptReturnsNotFound404()
    {
        var staffToken = await GetContentStaffTokenAsync();
        var uniquePrompt = $"Double confirm test prompt {Guid.NewGuid():N}";

        var csv = $"""
        subjectCode,prompt,options,correctAnswer
        MATH12,"{uniquePrompt}","A | B",A
        """;

        var previewToken = await GeneratePreviewTokenAsync(staffToken, csv, "double_confirm.csv");

        // 1st Confirm: Success
        using var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        req1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", staffToken);
        req1.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto { PreviewToken = previewToken });
        var res1 = await _client.SendAsync(req1);
        Assert.Equal(HttpStatusCode.OK, res1.StatusCode);

        // 2nd Confirm with same token: Token is consumed/removed -> 404
        using var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        req2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", staffToken);
        req2.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto { PreviewToken = previewToken });
        var res2 = await _client.SendAsync(req2);
        Assert.Equal(HttpStatusCode.NotFound, res2.StatusCode);
    }

    [Fact]
    public async Task Confirm_RollbackOnConflict_GuaranteesAllOrNothingRollback()
    {
        var staffToken = await GetContentStaffTokenAsync();
        var uniqueSub = $"SUB_RB_{Guid.NewGuid():N}"[..12];
        var uniqueChTitle = $"Chương Trùng Lặp {Guid.NewGuid():N}";

        // Batch with duplicate chapter title in same subject: Chapter 1 is valid, but Chapter 2 causes collision!
        var jsonWithConflictChapters = $$"""
        {
          "subject": {
            "code": "{{uniqueSub}}",
            "name": "Môn kiểm thử Rollback",
            "grade": "12",
            "chapters": [
              {
                "code": "CH_01",
                "title": "{{uniqueChTitle}}",
                "lessons": []
              },
              {
                "code": "CH_02",
                "title": "{{uniqueChTitle}}",
                "lessons": []
              }
            ]
          }
        }
        """;

        var previewToken = await GeneratePreviewTokenAsync(staffToken, jsonWithConflictChapters, "rollback_test.json");

        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/confirm");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", staffToken);
        req.Content = JsonContent.Create(new CurriculumImportConfirmRequestDto { PreviewToken = previewToken });

        var response = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        // Verify Strict All-or-Nothing Rollback: SUB_RB_* was completely rolled back and DOES NOT exist in DB!
        using (var scope = _fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var sub = await db.ContentSubjects.FirstOrDefaultAsync(s => s.Code == uniqueSub);
            Assert.Null(sub);

            var ch = await db.ContentChapters.FirstOrDefaultAsync(c => c.Title == uniqueChTitle);
            Assert.Null(ch);
        }
    }
}
