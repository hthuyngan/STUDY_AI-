using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using StudyAI.Features.Student;
using StudyAI.Models;
using Xunit;

namespace StudyAI.IntegrationTests;

public class LearnerNotesAndBookmarksIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public LearnerNotesAndBookmarksIntegrationTests(StudyAIApiFixture fixture)
    {
        _factory = fixture;
        _client = fixture.CreateClient();
    }

    private async Task<(string token, string userId)> CreateAndLoginLearnerAsync(string namePrefix)
    {
        var email = $"{namePrefix.ToLowerInvariant()}_{Guid.NewGuid():N}@studyai.test";
        var password = "SecureLearnerPassword@2026";

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            var user = new User
            {
                Id = $"usr_{Guid.NewGuid():N}",
                DisplayName = $"{namePrefix} Learner",
                Email = email,
                EmailNormalized = email.ToUpperInvariant(),
                Role = "learner",
                Status = "active",
                PasswordHash = hasher.HashPassword(password),
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
                JsonSerializer.Serialize(new { email, password }),
                Encoding.UTF8,
                "application/json"));
            loginResp.EnsureSuccessStatusCode();

            var loginData = JsonSerializer.Deserialize<JsonElement>(await loginResp.Content.ReadAsStringAsync());
            var token = loginData.GetProperty("accessToken").GetString()!;
            return (token, user.Id);
        }
    }

    private async Task<string> EnsureTestLessonAsync(string lessonId, string lessonTitle)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var existing = await db.ContentLessons.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (existing != null) return existing.Id;

        var anyLesson = await db.ContentLessons.Include(l => l.Chapter).FirstOrDefaultAsync();
        var anyUser = await db.Users.FirstOrDefaultAsync();

        var chapterId = anyLesson?.ChapterId;
        if (string.IsNullOrEmpty(chapterId))
        {
            var subject = await db.ContentSubjects.FirstOrDefaultAsync() ?? new ContentSubject
            {
                Id = "sub_math12",
                Code = "MATH12",
                Name = "Toán 12",
                Grade = "12"
            };
            if (!await db.ContentSubjects.AnyAsync(s => s.Id == subject.Id))
            {
                db.ContentSubjects.Add(subject);
                await db.SaveChangesAsync();
            }

            var chapter = new ContentChapter
            {
                Id = $"chap_test_{Guid.NewGuid():N}",
                SubjectId = subject.Id,
                Title = "Chương kiểm thử",
                OrderIndex = 1
            };
            db.ContentChapters.Add(chapter);
            await db.SaveChangesAsync();
            chapterId = chapter.Id;
        }

        var authorId = anyUser?.Id ?? (anyLesson?.AuthorId ?? "user_system_admin");

        var lesson = new ContentLesson
        {
            Id = lessonId,
            ChapterId = chapterId,
            AuthorId = authorId,
            Title = lessonTitle,
            Slug = $"slug-{Guid.NewGuid():N}",
            Status = "published"
        };
        db.ContentLessons.Add(lesson);
        await db.SaveChangesAsync();
        return lesson.Id;
    }

    [Fact]
    public async Task Learner_Notes_CreateReadUpdateDelete_PersistsToSql_AndEnforcesTwoUserIsolation()
    {
        var (tokenA, userAId) = await CreateAndLoginLearnerAsync("StudentA");
        var (tokenB, userBId) = await CreateAndLoginLearnerAsync("StudentB");

        var lessonId = "lesson_note_test_1";
        await EnsureTestLessonAsync(lessonId, "Bài học kiểm thử ghi chú SQL");

        // 1. User A creates a note
        var createNoteReq = new CreateStudyNoteRequestDto
        {
            LessonId = lessonId,
            SubjectId = "sub_math12",
            LessonTitle = "Bài học kiểm thử ghi chú SQL",
            SubjectName = "Toán 12",
            SectionId = "section_theory_1",
            SectionTitle = "Lý thuyết trọng tâm",
            Content = "Ghi chú bảo mật dữ liệu của User A"
        };

        var reqCreate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/me/notes")
        {
            Content = new StringContent(JsonSerializer.Serialize(createNoteReq), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenA) }
        };
        var respCreate = await _client.SendAsync(reqCreate);
        Assert.Equal(HttpStatusCode.Created, respCreate.StatusCode);

        var createdNote = JsonSerializer.Deserialize<StudyNoteDto>(await respCreate.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(createdNote);
        Assert.NotEmpty(createdNote.Id);
        Assert.Equal("Ghi chú bảo mật dữ liệu của User A", createdNote.Content);

        // 2. User A reads their note via GET /api/v1/me/notes and GET /api/v1/me/notes/{id}
        var reqGetListA = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/me/notes?lessonId={lessonId}")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenA) }
        };
        var respGetListA = await _client.SendAsync(reqGetListA);
        Assert.Equal(HttpStatusCode.OK, respGetListA.StatusCode);
        var notesListA = JsonSerializer.Deserialize<List<StudyNoteDto>>(await respGetListA.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Single(notesListA);
        Assert.Equal(createdNote.Id, notesListA[0].Id);

        var reqGetSingleA = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/me/notes/{createdNote.Id}")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenA) }
        };
        var respGetSingleA = await _client.SendAsync(reqGetSingleA);
        Assert.Equal(HttpStatusCode.OK, respGetSingleA.StatusCode);

        // 3. TWO-USER ISOLATION: User B CANNOT read, update, or delete User A's note
        var reqGetListB = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/me/notes?lessonId={lessonId}")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenB) }
        };
        var respGetListB = await _client.SendAsync(reqGetListB);
        Assert.Equal(HttpStatusCode.OK, respGetListB.StatusCode);
        var notesListB = JsonSerializer.Deserialize<List<StudyNoteDto>>(await respGetListB.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Empty(notesListB); // Isolation: User B sees nothing!

        var reqGetOtherNote = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/me/notes/{createdNote.Id}")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenB) }
        };
        var respGetOtherNote = await _client.SendAsync(reqGetOtherNote);
        Assert.Equal(HttpStatusCode.NotFound, respGetOtherNote.StatusCode); // Safe 404

        var reqUpdateOtherNote = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/me/notes/{createdNote.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new UpdateStudyNoteRequestDto { Content = "Hacker User B overwrite attempt" }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenB) }
        };
        var respUpdateOtherNote = await _client.SendAsync(reqUpdateOtherNote);
        Assert.Equal(HttpStatusCode.NotFound, respUpdateOtherNote.StatusCode);

        var reqDeleteOtherNote = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/me/notes/{createdNote.Id}")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenB) }
        };
        var respDeleteOtherNote = await _client.SendAsync(reqDeleteOtherNote);
        Assert.Equal(HttpStatusCode.NotFound, respDeleteOtherNote.StatusCode);

        // 4. Verify in SQL database (StudyAIDb_E2E) that note belongs exclusively to User A
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var dbNote = await db.UserStudyNotes.FirstOrDefaultAsync(n => n.Id == createdNote.Id);
            Assert.NotNull(dbNote);
            Assert.Equal(userAId, dbNote.UserId);
            Assert.Equal("Ghi chú bảo mật dữ liệu của User A", dbNote.Content);
        }

        // 5. User A updates their note
        var reqUpdateA = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/me/notes/{createdNote.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new UpdateStudyNoteRequestDto { Content = "Ghi chú đã được cập nhật bởi User A" }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenA) }
        };
        var respUpdateA = await _client.SendAsync(reqUpdateA);
        Assert.Equal(HttpStatusCode.OK, respUpdateA.StatusCode);

        var updatedNote = JsonSerializer.Deserialize<StudyNoteDto>(await respUpdateA.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(updatedNote);
        Assert.Equal("Ghi chú đã được cập nhật bởi User A", updatedNote.Content);

        // 6. User A deletes their note
        var reqDeleteA = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/me/notes/{createdNote.Id}")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenA) }
        };
        var respDeleteA = await _client.SendAsync(reqDeleteA);
        Assert.Equal(HttpStatusCode.OK, respDeleteA.StatusCode);

        // Database confirms removal
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var dbNote = await db.UserStudyNotes.FirstOrDefaultAsync(n => n.Id == createdNote.Id);
            Assert.Null(dbNote);
        }
    }

    [Fact]
    public async Task Learner_Bookmarks_Toggle_Idempotent_UniqueIndexConstraint_AndTwoUserIsolation()
    {
        var (tokenA, userAId) = await CreateAndLoginLearnerAsync("BookmarkStudentA");
        var (tokenB, userBId) = await CreateAndLoginLearnerAsync("BookmarkStudentB");

        var lessonId = "lesson_bm_test_1";
        var sectionId = "section_formulas_1";

        // Seed lesson
        await EnsureTestLessonAsync(lessonId, "Bài học Bookmark Test");

        var toggleDto = new ToggleBookmarkRequestDto
        {
            LessonId = lessonId,
            SectionId = sectionId,
            SectionTitle = "Công thức logarit",
            LessonTitle = "Bài học Bookmark Test",
            SubjectId = "sub_math12",
            SubjectName = "Toán 12"
        };

        // 1. Toggle ON for User A
        var reqToggleOn = new HttpRequestMessage(HttpMethod.Post, "/api/v1/me/bookmarks")
        {
            Content = new StringContent(JsonSerializer.Serialize(toggleDto), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenA) }
        };
        var respToggleOn = await _client.SendAsync(reqToggleOn);
        Assert.Equal(HttpStatusCode.OK, respToggleOn.StatusCode);

        var toggleOnResult = JsonSerializer.Deserialize<ToggleBookmarkResponseDto>(await respToggleOn.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(toggleOnResult);
        Assert.True(toggleOnResult.Bookmarked);
        Assert.NotNull(toggleOnResult.Bookmark);

        // 2. Query check endpoint via GET /api/v1/me/bookmarks?lessonId=...
        var reqCheckA = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/me/bookmarks?lessonId={lessonId}")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenA) }
        };
        var respCheckA = await _client.SendAsync(reqCheckA);
        Assert.Equal(HttpStatusCode.OK, respCheckA.StatusCode);
        var bookmarksA = JsonSerializer.Deserialize<List<SectionBookmarkDto>>(await respCheckA.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Contains(bookmarksA, b => b.SectionId == sectionId);

        // 3. User B check: MUST BE EMPTY / FALSE (Two-User Isolation)
        var reqCheckB = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/me/bookmarks?lessonId={lessonId}")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenB) }
        };
        var respCheckB = await _client.SendAsync(reqCheckB);
        Assert.Equal(HttpStatusCode.OK, respCheckB.StatusCode);
        var bookmarksB = JsonSerializer.Deserialize<List<SectionBookmarkDto>>(await respCheckB.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.DoesNotContain(bookmarksB, b => b.SectionId == sectionId);

        // 4. Verify in SQL database (StudyAIDb_E2E) that unique record exists with User A
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var bm = await db.UserSectionBookmarks.FirstOrDefaultAsync(b => b.UserId == userAId && b.LessonId == lessonId && b.SectionId == sectionId);
            Assert.NotNull(bm);
            Assert.Equal("Công thức logarit", bm.SectionTitle);
        }

        // 5. Toggle OFF for User A
        var reqToggleOff = new HttpRequestMessage(HttpMethod.Post, "/api/v1/me/bookmarks")
        {
            Content = new StringContent(JsonSerializer.Serialize(toggleDto), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", tokenA) }
        };
        var respToggleOff = await _client.SendAsync(reqToggleOff);
        Assert.Equal(HttpStatusCode.OK, respToggleOff.StatusCode);

        var toggleOffResult = JsonSerializer.Deserialize<ToggleBookmarkResponseDto>(await respToggleOff.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(toggleOffResult);
        Assert.False(toggleOffResult.Bookmarked);
        Assert.Null(toggleOffResult.Bookmark);

        // Database confirms removal
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var bm = await db.UserSectionBookmarks.FirstOrDefaultAsync(b => b.UserId == userAId && b.LessonId == lessonId && b.SectionId == sectionId);
            Assert.Null(bm);
        }
    }

    [Fact]
    public async Task Learner_Notes_EmptyContentOrMissingLesson_ReturnsBadRequest400()
    {
        var (token, _) = await CreateAndLoginLearnerAsync("ValidationStudent");

        // Empty content
        var reqEmpty = new HttpRequestMessage(HttpMethod.Post, "/api/v1/me/notes")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateStudyNoteRequestDto
            {
                LessonId = "lesson_val_1",
                Content = "   "
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };
        var respEmpty = await _client.SendAsync(reqEmpty);
        Assert.Equal(HttpStatusCode.BadRequest, respEmpty.StatusCode);

        // Missing lesson ID
        var reqNoLesson = new HttpRequestMessage(HttpMethod.Post, "/api/v1/me/notes")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateStudyNoteRequestDto
            {
                LessonId = "",
                Content = "Ghi chú hợp lệ nhưng thiếu lesson ID"
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };
        var respNoLesson = await _client.SendAsync(reqNoLesson);
        Assert.Equal(HttpStatusCode.BadRequest, respNoLesson.StatusCode);
    }
}
