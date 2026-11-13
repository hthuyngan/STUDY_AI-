using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using StudyAI.Application.DTOs;
using Xunit;

namespace StudyAI.IntegrationTests;

[Collection("IntegrationTests")]
public class QuestionBankIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _fixture;

    public QuestionBankIntegrationTests(StudyAIApiFixture fixture)
    {
        _fixture = fixture;
        _client = fixture.CreateClient();
    }

    private async Task<string> GetTokenAsync(string email, string password)
    {
        var loginResp = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email,
            password
        });

        loginResp.EnsureSuccessStatusCode();
        var body = await loginResp.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("accessToken").GetString()!;
    }

    [Fact]
    public async Task Content_Can_Create_All_5_Question_Types_And_Get_Statistics()
    {
        var token = await GetTokenAsync("content@studyai.internal", "Content@123456");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // 1. Single-choice (multiple-choice)
        var mcReq = new CreateQuestionRequestDto
        {
            Code = $"Q-MC-{Guid.NewGuid():N}"[..14].ToUpper(),
            Prompt = $"Trắc nghiệm đơn {Guid.NewGuid():N}: Đạo hàm của sin(x) là gì?",
            Options = new List<string> { "cos(x)", "-cos(x)", "tan(x)", "-sin(x)" },
            CorrectAnswer = "cos(x)",
            Explanation = @"Công thức đạo hàm lượng giác cơ bản: $\frac{d}{dx}\sin(x) = \cos(x)$.",
            Difficulty = "nhan_biet",
            Type = "multiple-choice",
            Grade = "12",
            Status = "draft"
        };
        var mcRes = await _client.PostAsJsonAsync("/api/v1/content/questions", mcReq);
        Assert.Equal(HttpStatusCode.Created, mcRes.StatusCode);
        var mcItem = await mcRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.NotNull(mcItem);
        Assert.Equal(mcReq.Code, mcItem.Code);
        Assert.Equal("multiple-choice", mcItem.Type);
        Assert.Equal("nhan_biet", mcItem.Difficulty);

        // 2. Multiple-select
        var msReq = new CreateQuestionRequestDto
        {
            Code = $"Q-MS-{Guid.NewGuid():N}"[..14].ToUpper(),
            Prompt = $"Trắc nghiệm nhiều đáp án {Guid.NewGuid():N}: Những hàm số nào đồng biến trên R?",
            Options = new List<string> { "y = x^3 + x", "y = 2x + 1", "y = -x^3", "y = 1/x" },
            CorrectAnswer = "y = x^3 + x, y = 2x + 1",
            Explanation = "Xét đạo hàm y' > 0 với mọi x thuộc R.",
            Difficulty = "van_dung",
            Type = "multiple-select",
            Grade = "12",
            Status = "draft"
        };
        var msRes = await _client.PostAsJsonAsync("/api/v1/content/questions", msReq);
        Assert.Equal(HttpStatusCode.Created, msRes.StatusCode);
        var msItem = await msRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.NotNull(msItem);
        Assert.Equal("multiple-select", msItem.Type);

        // 3. True-False
        var tfReq = new CreateQuestionRequestDto
        {
            Code = $"Q-TF-{Guid.NewGuid():N}"[..14].ToUpper(),
            Prompt = $"Đúng/Sai {Guid.NewGuid():N}: Hàm số y = x^2 nghịch biến trên khoảng (-vô cùng, 0).",
            Options = new List<string> { "Đúng", "Sai" },
            CorrectAnswer = "Đúng",
            Explanation = "y' = 2x < 0 với mọi x < 0 nên hàm nghịch biến.",
            Difficulty = "thong_hieu",
            Type = "true-false",
            Grade = "12",
            Status = "draft"
        };
        var tfRes = await _client.PostAsJsonAsync("/api/v1/content/questions", tfReq);
        Assert.Equal(HttpStatusCode.Created, tfRes.StatusCode);
        var tfItem = await tfRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.NotNull(tfItem);
        Assert.Equal("true-false", tfItem.Type);

        // 4. Short-Answer
        var saReq = new CreateQuestionRequestDto
        {
            Code = $"Q-SA-{Guid.NewGuid():N}"[..14].ToUpper(),
            Prompt = $"Trả lời ngắn {Guid.NewGuid():N}: Tìm giá trị nhỏ nhất của hàm số y = x^2 - 4x + 5.",
            CorrectAnswer = "1",
            Explanation = "y = (x - 2)^2 + 1 >= 1. Đẳng thức xảy ra khi x = 2.",
            Difficulty = "thong_hieu",
            Type = "short-answer",
            Grade = "12",
            Status = "draft"
        };
        var saRes = await _client.PostAsJsonAsync("/api/v1/content/questions", saReq);
        Assert.Equal(HttpStatusCode.Created, saRes.StatusCode);
        var saItem = await saRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.NotNull(saItem);
        Assert.Equal("short-answer", saItem.Type);

        // 5. Essay
        var esReq = new CreateQuestionRequestDto
        {
            Code = $"Q-ES-{Guid.NewGuid():N}"[..14].ToUpper(),
            Prompt = $"Tự luận {Guid.NewGuid():N}: Trình bày các bước khảo sát sự biến thiên và vẽ đồ thị hàm số bậc ba.",
            CorrectAnswer = "Tập xác định, đạo hàm, bảng biến thiên, đồ thị.",
            Explanation = "Bao gồm đầy đủ 4 bước chuẩn GDPT 2018.",
            Difficulty = "van_dung_cao",
            Type = "essay",
            Grade = "12",
            Status = "draft"
        };
        var esRes = await _client.PostAsJsonAsync("/api/v1/content/questions", esReq);
        Assert.Equal(HttpStatusCode.Created, esRes.StatusCode);
        var esItem = await esRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.NotNull(esItem);
        Assert.Equal("essay", esItem.Type);

        // Check statistics endpoint
        var statsRes = await _client.GetAsync("/api/v1/content/questions/statistics");
        Assert.Equal(HttpStatusCode.OK, statsRes.StatusCode);
        var stats = await statsRes.Content.ReadFromJsonAsync<QuestionStatsDto>();
        Assert.NotNull(stats);
        Assert.True(stats.TotalQuestions >= 5);
        Assert.True(stats.ByType.ContainsKey("multiple-choice"));
        Assert.True(stats.ByType.ContainsKey("multiple-select"));
        Assert.True(stats.ByType.ContainsKey("true-false"));
        Assert.True(stats.ByType.ContainsKey("short-answer"));
        Assert.True(stats.ByType.ContainsKey("essay"));
    }

    [Fact]
    public async Task Question_CRUD_And_SoftDelete_Restore_Cycle()
    {
        var token = await GetTokenAsync("content@studyai.internal", "Content@123456");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Create
        var createReq = new CreateQuestionRequestDto
        {
            Code = $"Q-CRUD-{Guid.NewGuid():N}"[..16].ToUpper(),
            Prompt = $"Test CRUD Question {Guid.NewGuid():N}",
            Options = new List<string> { "A", "B", "C", "D" },
            CorrectAnswer = "A",
            Explanation = "Giải thích mẫu",
            Difficulty = "easy",
            Type = "multiple-choice",
            Status = "draft"
        };
        var createRes = await _client.PostAsJsonAsync("/api/v1/content/questions", createReq);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.NotNull(created);
        var questionId = created.Id;

        // Read Detail
        var detailRes = await _client.GetAsync($"/api/v1/content/questions/{questionId}");
        Assert.Equal(HttpStatusCode.OK, detailRes.StatusCode);
        var detail = await detailRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.Equal(createReq.Prompt, detail!.Prompt);
        Assert.False(detail.IsDeleted);

        // Update (PUT)
        var updateReq = new UpdateQuestionRequestDto
        {
            Prompt = $"{createReq.Prompt} (Updated)",
            Topic = "Giải tích 12",
            Difficulty = "hard"
        };
        var putRes = await _client.PutAsJsonAsync($"/api/v1/content/questions/{questionId}", updateReq);
        Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);
        var updated = await putRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.Equal($"{createReq.Prompt} (Updated)", updated!.Prompt);
        Assert.Equal("hard", updated.Difficulty);
        Assert.Equal(2, updated.Version); // Version incremented

        // Soft Delete
        var delRes = await _client.DeleteAsync($"/api/v1/content/questions/{questionId}");
        Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);

        // Verify excluded from default list
        var listRes = await _client.GetAsync($"/api/v1/content/questions?search={questionId}");
        var listData = await listRes.Content.ReadFromJsonAsync<JsonElement>();
        var items = listData.GetProperty("items");
        Assert.Equal(0, items.GetArrayLength());

        // Verify included when includeDeleted=true
        var listDeletedRes = await _client.GetAsync($"/api/v1/content/questions?search={questionId}&includeDeleted=true");
        var listDeletedData = await listDeletedRes.Content.ReadFromJsonAsync<JsonElement>();
        var deletedItems = listDeletedData.GetProperty("items");
        Assert.Equal(1, deletedItems.GetArrayLength());
        Assert.True(deletedItems[0].GetProperty("isDeleted").GetBoolean());

        // Restore
        var restoreRes = await _client.PostAsync($"/api/v1/content/questions/{questionId}/restore", null);
        Assert.Equal(HttpStatusCode.OK, restoreRes.StatusCode);
        var restored = await restoreRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.False(restored!.IsDeleted);
        Assert.Equal("draft", restored.Status);
    }

    [Fact]
    public async Task Workflow_ReviewQueue_Approve_Reject_Publish_Unpublish()
    {
        var token = await GetTokenAsync("content@studyai.internal", "Content@123456");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // 1. Create draft
        var createReq = new CreateQuestionRequestDto
        {
            Prompt = $"Workflow Question {Guid.NewGuid():N}",
            Options = new List<string> { "X", "Y" },
            CorrectAnswer = "X",
            Status = "draft"
        };
        var createRes = await _client.PostAsJsonAsync("/api/v1/content/questions", createReq);
        var question = await createRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        var qId = question!.Id;

        // 2. Submit Review
        var subRes = await _client.PostAsync($"/api/v1/content/questions/{qId}/submit-review", null);
        Assert.Equal(HttpStatusCode.OK, subRes.StatusCode);
        var submitted = await subRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.Equal("in-review", submitted!.Status);

        // 3. Reject with Reason
        var rejectReq = new RejectQuestionRequestDto { Reason = "Cần bổ sung lời giải chi tiết theo chuẩn KaTeX." };
        var rejRes = await _client.PostAsJsonAsync($"/api/v1/content/questions/{qId}/reject", rejectReq);
        Assert.Equal(HttpStatusCode.OK, rejRes.StatusCode);
        var rejected = await rejRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.Equal("rejected", rejected!.Status);
        Assert.Equal(rejectReq.Reason, rejected.RejectionReason);

        // 4. Update and Approve (Content Primacy: Content role can self-approve)
        var approveRes = await _client.PostAsync($"/api/v1/content/questions/{qId}/approve", null);
        Assert.Equal(HttpStatusCode.OK, approveRes.StatusCode);
        var approved = await approveRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.Equal("approved", approved!.Status);
        Assert.Null(approved.RejectionReason);

        // 5. Publish
        var pubRes = await _client.PostAsync($"/api/v1/content/questions/{qId}/publish", null);
        Assert.Equal(HttpStatusCode.OK, pubRes.StatusCode);
        var published = await pubRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.Equal("published", published!.Status);

        // 6. Unpublish
        var unpubRes = await _client.PostAsync($"/api/v1/content/questions/{qId}/unpublish", null);
        Assert.Equal(HttpStatusCode.OK, unpubRes.StatusCode);
        var unpublished = await unpubRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.Equal("draft", unpublished!.Status);
    }

    [Fact]
    public async Task Strict_Copyright_Gate_Blocks_VNHSGE_Unverified_Publishing_And_Enforces_Server_Metadata()
    {
        var token = await GetTokenAsync("content@studyai.internal", "Content@123456");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // 1. Dry run is allowed for VNHSGE structure validation
        var dryRunReq = new QuestionImportBatchRequestDto
        {
            SourceType = "vnhsge",
            DryRun = true,
            Items = new List<QuestionImportItemDto>
            {
                new()
                {
                    Prompt = $"VNHSGE Mock Item {Guid.NewGuid():N}",
                    Options = new List<string> { "A", "B", "C", "D" },
                    CorrectAnswer = "A"
                }
            }
        };
        var dryRunRes = await _client.PostAsJsonAsync("/api/v1/content/questions/import", dryRunReq);
        Assert.Equal(HttpStatusCode.OK, dryRunRes.StatusCode);
        var dryResult = await dryRunRes.Content.ReadFromJsonAsync<QuestionImportResultDto>();
        Assert.True(dryResult!.DryRun);
        Assert.Equal(1, dryResult.ValidItems);
        Assert.Empty(dryResult.ImportedIds); // Zero writes in dry run

        // 2. Real import into test DB succeeds with server-side copyright enforcement (status='draft', copyrightStatus='pending_verification')
        var realImportReq = new QuestionImportBatchRequestDto
        {
            SourceType = "vnhsge",
            DryRun = false,
            Items = new List<QuestionImportItemDto>
            {
                new()
                {
                    Prompt = $"VNHSGE Real Item {Guid.NewGuid():N}",
                    Options = new List<string> { "A", "B", "C", "D" },
                    CorrectAnswer = "A"
                }
            }
        };
        var realImportRes = await _client.PostAsJsonAsync("/api/v1/content/questions/import", realImportReq);
        Assert.Equal(HttpStatusCode.OK, realImportRes.StatusCode);
        var realResult = await realImportRes.Content.ReadFromJsonAsync<QuestionImportResultDto>();
        Assert.NotNull(realResult);
        Assert.Single(realResult.ImportedIds);
        var importedId = realResult.ImportedIds.First();

        // 3. Verify server-controlled metadata
        var getRes = await _client.GetAsync($"/api/v1/content/questions/{importedId}");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var qItem = await getRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.Equal("draft", qItem!.Status);
        Assert.Equal("pending_verification", qItem.CopyrightStatus);
        Assert.Equal("vnhsge", qItem.SourceType);

        // 4. Server-Side Hard Gate: Attempting to publish an unverified VNHSGE question is strictly forbidden (403)
        var pubRes = await _client.PostAsync($"/api/v1/content/questions/{importedId}/publish", null);
        Assert.Equal(HttpStatusCode.Forbidden, pubRes.StatusCode);
        var pubErr = await pubRes.Content.ReadAsStringAsync();
        Assert.Contains("BẢN QUYỀN", pubErr);
    }

    [Fact]
    public async Task RBAC_Content_Primacy_Admin_And_Learner_Cannot_Approve_Or_Publish_Questions()
    {
        // 1. Content creates question and submits for review
        var contentToken = await GetTokenAsync("content@studyai.internal", "Content@123456");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);

        var createRes = await _client.PostAsJsonAsync("/api/v1/content/questions", new CreateQuestionRequestDto
        {
            Prompt = $"Content Primacy Test Question {Guid.NewGuid():N}",
            Options = new List<string> { "A", "B", "C", "D" },
            CorrectAnswer = "A",
            Status = "draft"
        });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var qItem = await createRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        var qId = qItem!.Id;

        await _client.PostAsync($"/api/v1/content/questions/{qId}/submit-review", null);

        // 2. Admin attempts to approve question -> 403 Forbidden (Content Primacy)
        var adminToken = await GetTokenAsync("admin@studyai.internal", "Admin@123456");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var adminApproveRes = await _client.PostAsync($"/api/v1/content/questions/{qId}/approve", null);
        Assert.Equal(HttpStatusCode.Forbidden, adminApproveRes.StatusCode);

        var adminPublishRes = await _client.PostAsync($"/api/v1/content/questions/{qId}/publish", null);
        Assert.Equal(HttpStatusCode.Forbidden, adminPublishRes.StatusCode);

        // 3. Learner attempts to approve question -> 403 Forbidden
        var learnerToken = await GetTokenAsync("learner@studyai.internal", "Learner@123456");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);

        var learnerApproveRes = await _client.PostAsync($"/api/v1/content/questions/{qId}/approve", null);
        Assert.Equal(HttpStatusCode.Forbidden, learnerApproveRes.StatusCode);

        // 4. Content Specialist approves question -> 200 OK (Sole authority)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var contentApproveRes = await _client.PostAsync($"/api/v1/content/questions/{qId}/approve", null);
        Assert.Equal(HttpStatusCode.OK, contentApproveRes.StatusCode);
        var approvedItem = await contentApproveRes.Content.ReadFromJsonAsync<ContentQuestionItemDto>();
        Assert.Equal("approved", approvedItem!.Status);
    }

    [Fact]
    public async Task Import_Pipeline_Deduplicates_Existing_Questions()
    {
        var token = await GetTokenAsync("content@studyai.internal", "Content@123456");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var uniquePrompt = $"Deduplication Test Prompt {Guid.NewGuid():N}";

        // Create an existing question
        await _client.PostAsJsonAsync("/api/v1/content/questions", new CreateQuestionRequestDto
        {
            Prompt = uniquePrompt,
            Options = new List<string> { "A", "B" },
            CorrectAnswer = "A"
        });

        // Attempt batch import with the same prompt
        var importReq = new QuestionImportBatchRequestDto
        {
            SourceType = "manual",
            DryRun = true,
            Items = new List<QuestionImportItemDto>
            {
                new()
                {
                    Prompt = uniquePrompt, // Duplicate
                    Options = new List<string> { "A", "B" },
                    CorrectAnswer = "A"
                },
                new()
                {
                    Prompt = $"Brand New Prompt {Guid.NewGuid():N}", // Unique
                    Options = new List<string> { "X", "Y" },
                    CorrectAnswer = "X"
                }
            }
        };

        var res = await _client.PostAsJsonAsync("/api/v1/content/questions/import", importReq);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var result = await res.Content.ReadFromJsonAsync<QuestionImportResultDto>();
        Assert.Equal(2, result!.TotalItems);
        Assert.Equal(1, result.DuplicateItems);
        Assert.Equal(1, result.ValidItems);
    }

    [Fact]
    public async Task RBAC_Learner_Cannot_Access_Content_Question_Bank_Endpoints()
    {
        // Login as learner
        var token = await GetTokenAsync("learner@studyai.internal", "Learner@123456");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // List questions in content management
        var listRes = await _client.GetAsync("/api/v1/content/questions");
        Assert.Equal(HttpStatusCode.Forbidden, listRes.StatusCode);

        // Create question
        var createRes = await _client.PostAsJsonAsync("/api/v1/content/questions", new CreateQuestionRequestDto
        {
            Prompt = "Learner question hack attempt",
            Options = new List<string> { "A", "B" },
            CorrectAnswer = "A"
        });
        Assert.Equal(HttpStatusCode.Forbidden, createRes.StatusCode);

        // Approve
        var approveRes = await _client.PostAsync("/api/v1/content/questions/qst_fake/approve", null);
        Assert.Equal(HttpStatusCode.Forbidden, approveRes.StatusCode);
    }
}
