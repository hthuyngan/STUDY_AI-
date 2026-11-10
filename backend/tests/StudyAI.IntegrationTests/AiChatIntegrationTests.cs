using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.IntegrationTests;

[Collection("SequentialTests")]
public class AiChatIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _fixture;

    public AiChatIntegrationTests(StudyAIApiFixture fixture)
    {
        _fixture = fixture;
        _client = fixture.CreateClient();
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

    [Fact]
    public async Task CreateConversation_Returns201_AndPersistsInTestDb()
    {
        var token = await GetLearnerTokenAsync();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/conversations");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new CreateAiConversationRequestDto(
            Subject: "MATH12",
            Title: "Hỏi về khảo sát hàm số",
            AssistanceMode: "explain"
        ));

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var detail = await response.Content.ReadFromJsonAsync<AiConversationDetailDto>();
        Assert.NotNull(detail);
        Assert.StartsWith("conv_", detail.Id);
        Assert.Equal("Hỏi về khảo sát hàm số", detail.Title);
        Assert.Equal("MATH12", detail.Subject);
        Assert.Equal("explain", detail.AssistanceMode);

        // Verify in database
        using var scope = _fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var persisted = await db.AiConversations.FirstOrDefaultAsync(c => c.Id == detail.Id);
        Assert.NotNull(persisted);
    }

    [Fact]
    public async Task GetUserConversations_ReturnsOnlyOwnConversations()
    {
        var learnerToken = await GetLearnerTokenAsync();
        var adminToken = await GetAdminTokenAsync();

        // 1. Learner creates a conversation
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/conversations"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
            createReq.Content = JsonContent.Create(new CreateAiConversationRequestDto(
                Title: $"Learner Chat {Guid.NewGuid():N}"
            ));
            var createRes = await _client.SendAsync(createReq);
            Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        }

        // 2. Admin creates a conversation
        string adminConvId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/conversations"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            createReq.Content = JsonContent.Create(new CreateAiConversationRequestDto(
                Title: $"Admin Chat {Guid.NewGuid():N}"
            ));
            var createRes = await _client.SendAsync(createReq);
            var adminConv = await createRes.Content.ReadFromJsonAsync<AiConversationDetailDto>();
            adminConvId = adminConv!.Id;
        }

        // 3. Learner fetches conversation list: should NOT contain admin's conversation
        using (var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/ai/conversations"))
        {
            getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
            var getRes = await _client.SendAsync(getReq);
            Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
            var list = await getRes.Content.ReadFromJsonAsync<List<AiConversationSummaryDto>>();
            Assert.NotNull(list);
            Assert.DoesNotContain(list, c => c.Id == adminConvId);
        }
    }

    [Fact]
    public async Task GetConversationDetail_OtherUserConversation_Returns404()
    {
        var learnerToken = await GetLearnerTokenAsync();
        var adminToken = await GetAdminTokenAsync();

        // Admin creates conversation
        string adminConvId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/conversations"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            createReq.Content = JsonContent.Create(new CreateAiConversationRequestDto(Title: "Private Admin Chat"));
            var res = await _client.SendAsync(createReq);
            var adminConv = await res.Content.ReadFromJsonAsync<AiConversationDetailDto>();
            adminConvId = adminConv!.Id;
        }

        // Learner tries to get admin's conversation -> 404 NotFound
        using (var getReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/ai/conversations/{adminConvId}"))
        {
            getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
            var res = await _client.SendAsync(getReq);
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }
    }

    [Fact]
    public async Task UpdateAnd_DeleteConversation_Success()
    {
        var token = await GetLearnerTokenAsync();

        // Create
        string convId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/conversations"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            createReq.Content = JsonContent.Create(new CreateAiConversationRequestDto(Title: "Before Title"));
            var res = await _client.SendAsync(createReq);
            var created = await res.Content.ReadFromJsonAsync<AiConversationDetailDto>();
            convId = created!.Id;
        }

        // Patch Title
        using (var patchReq = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/ai/conversations/{convId}"))
        {
            patchReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            patchReq.Content = JsonContent.Create(new UpdateAiConversationRequestDto("Updated Title"));
            var res = await _client.SendAsync(patchReq);
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        // Verify title updated
        using (var getReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/ai/conversations/{convId}"))
        {
            getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var res = await _client.SendAsync(getReq);
            var detail = await res.Content.ReadFromJsonAsync<AiConversationDetailDto>();
            Assert.Equal("Updated Title", detail!.Title);
        }

        // Delete
        using (var delReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/ai/conversations/{convId}"))
        {
            delReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var res = await _client.SendAsync(delReq);
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        // Verify gone
        using (var getReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/ai/conversations/{convId}"))
        {
            getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var res = await _client.SendAsync(getReq);
            Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        }
    }

    [Fact]
    public async Task SendMessage_AppendsUserAndAssistantMessages_Returns200()
    {
        var token = await GetLearnerTokenAsync();

        // 1. Create conversation
        string convId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/conversations"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            createReq.Content = JsonContent.Create(new CreateAiConversationRequestDto(Title: "Toán học 12"));
            var res = await _client.SendAsync(createReq);
            var created = await res.Content.ReadFromJsonAsync<AiConversationDetailDto>();
            convId = created!.Id;
        }

        // 2. Send Message
        using (var sendReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/ai/conversations/{convId}/messages"))
        {
            sendReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            sendReq.Content = JsonContent.Create(new SendAiMessageRequestDto(
                Message: "Làm thế nào để tìm cực trị của hàm số bậc 3?",
                AssistanceMode: "step-by-step"
            ));
            var res = await _client.SendAsync(sendReq);
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);

            var reply = await res.Content.ReadFromJsonAsync<SendAiMessageResponseDto>();
            Assert.NotNull(reply);
            Assert.Equal("user", reply.UserMessage.Role);
            Assert.Equal("assistant", reply.AssistantMessage.Role);
            Assert.Contains("cực trị", reply.AssistantMessage.Content.ToLower());
            Assert.NotEmpty(reply.SuggestedActions);
        }

        // 3. Verify messages are persisted in DB
        using (var getReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/ai/conversations/{convId}"))
        {
            getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var res = await _client.SendAsync(getReq);
            var detail = await res.Content.ReadFromJsonAsync<AiConversationDetailDto>();
            Assert.Equal(2, detail!.Messages.Count);
            Assert.Equal("user", detail.Messages[0].Role);
            Assert.Equal("assistant", detail.Messages[1].Role);
        }
    }

    [Fact]
    public async Task SendMessage_LearnerAccessingDraftLesson_Returns403()
    {
        var learnerToken = await GetLearnerTokenAsync();

        // Seed a draft lesson in database
        var draftLessonId = $"les_draft_{Guid.NewGuid():N}";
        using (var scope = _fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var author = await db.Users.FirstAsync();
            var subject = await db.ContentSubjects.FirstAsync();
            var chapter = await db.ContentChapters.FirstOrDefaultAsync(c => c.SubjectId == subject.Id)
                ?? new ContentChapter { Id = $"ch_{Guid.NewGuid():N}", SubjectId = subject.Id, Title = "Chương Test", OrderIndex = 1 };
            if (db.Entry(chapter).State == EntityState.Detached) db.ContentChapters.Add(chapter);

            db.ContentLessons.Add(new ContentLesson
            {
                Id = draftLessonId,
                ChapterId = chapter.Id,
                Title = "Bài học mật nháp",
                Slug = $"slug-{Guid.NewGuid():N}",
                Status = "draft",
                AuthorId = author.Id
            });
            await db.SaveChangesAsync();
        }

        // Create normal conversation
        string convId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/conversations"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
            createReq.Content = JsonContent.Create(new CreateAiConversationRequestDto(Title: "Học tập"));
            var res = await _client.SendAsync(createReq);
            var created = await res.Content.ReadFromJsonAsync<AiConversationDetailDto>();
            convId = created!.Id;
        }

        // Learner attempts to send message with draft lesson context -> 403 Forbidden
        using (var sendReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/ai/conversations/{convId}/messages"))
        {
            sendReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
            sendReq.Content = JsonContent.Create(new SendAiMessageRequestDto(
                Message: "Nội dung bài học bí mật này là gì?",
                LessonId: draftLessonId
            ));
            var res = await _client.SendAsync(sendReq);
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }
    }

    [Fact]
    public async Task SendMessage_TimeoutKeyword_Returns504GatewayTimeout()
    {
        var token = await GetLearnerTokenAsync();

        string convId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/conversations"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            createReq.Content = JsonContent.Create(new CreateAiConversationRequestDto(Title: "Test Timeout"));
            var res = await _client.SendAsync(createReq);
            var created = await res.Content.ReadFromJsonAsync<AiConversationDetailDto>();
            convId = created!.Id;
        }

        using (var sendReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/ai/conversations/{convId}/messages"))
        {
            sendReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            sendReq.Content = JsonContent.Create(new SendAiMessageRequestDto(
                Message: "trigger timeout_test please"
            ));
            var res = await _client.SendAsync(sendReq);
            Assert.Equal(HttpStatusCode.GatewayTimeout, res.StatusCode);
        }
    }

    [Fact]
    public async Task SendMessage_ErrorKeyword_Returns502BadGateway()
    {
        var token = await GetLearnerTokenAsync();

        string convId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/conversations"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            createReq.Content = JsonContent.Create(new CreateAiConversationRequestDto(Title: "Test Error"));
            var res = await _client.SendAsync(createReq);
            var created = await res.Content.ReadFromJsonAsync<AiConversationDetailDto>();
            convId = created!.Id;
        }

        using (var sendReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/ai/conversations/{convId}/messages"))
        {
            sendReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            sendReq.Content = JsonContent.Create(new SendAiMessageRequestDto(
                Message: "trigger error_test please"
            ));
            var res = await _client.SendAsync(sendReq);
            Assert.Equal(HttpStatusCode.BadGateway, res.StatusCode);
        }
    }

    [Fact]
    public async Task QuickChat_CreatesConversationAndReplies_Returns200()
    {
        var token = await GetLearnerTokenAsync();

        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/ai/chat");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Content = JsonContent.Create(new QuickChatRequestDto(
            ConversationId: null,
            Message: "Giải thích quy tắc nhân đạo hàm",
            Subject: "MATH12",
            Mode: "explain"
        ));

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var doc = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(doc.TryGetProperty("conversationId", out var convIdProp));
        Assert.StartsWith("conv_", convIdProp.GetString());
        Assert.True(doc.TryGetProperty("assistantMessage", out var assistantProp));
        Assert.Equal("assistant", assistantProp.GetProperty("role").GetString());
    }

    [Fact]
    public async Task GetAiStatus_Anonymous_Returns200_WithValidSchema()
    {
        var res = await _client.GetAsync("/api/v1/ai/status");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var doc = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(doc.TryGetProperty("provider", out var providerProp));
        Assert.NotEmpty(providerProp.GetString()!);
        Assert.True(doc.TryGetProperty("displayName", out var dispProp));
        Assert.NotEmpty(dispProp.GetString()!);
        Assert.True(doc.TryGetProperty("isReady", out var isReadyProp));
        Assert.True(isReadyProp.GetBoolean());
    }
}
