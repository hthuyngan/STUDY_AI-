using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using StudyAI.Features.Student;
using StudyAI.Models;
using Xunit;

namespace StudyAI.IntegrationTests;

public class Math12UserWorkspaceTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public Math12UserWorkspaceTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string UserId, string Token)> RegisterLearnerAsync(string prefix)
    {
        var email = $"{prefix}_{Guid.NewGuid():N}@studyai.test";
        var resp = await _client.PostAsync("/api/v1/auth/register", new StringContent(
            JsonSerializer.Serialize(new { email, password = "Password@123456", displayName = prefix, grade = "12" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        return (doc.RootElement.GetProperty("user").GetProperty("id").GetString()!, doc.RootElement.GetProperty("accessToken").GetString()!);
    }

    [Fact]
    public async Task Learner_JoinClassroomByCode_And_Mistakes_WorkWithOwnership()
    {
        var (student1Id, student1Token) = await RegisterLearnerAsync("stu1");
        var (_, student2Token) = await RegisterLearnerAsync("stu2");
        var code = $"M12-{Guid.NewGuid():N}".Substring(0, 10);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var teacher = new User
            {
                Id = $"tch-{Guid.NewGuid():N}",
                Email = $"tch_{Guid.NewGuid():N}@studyai.test",
                EmailNormalized = $"TCH_{Guid.NewGuid():N}@STUDYAI.TEST",
                DisplayName = "Giáo viên Toán 12",
                Role = "teacher",
                Status = "active",
                PasswordHash = "hash"
            };
            db.Users.Add(teacher);
            var cls = new Classroom
            {
                Id = $"cls-{Guid.NewGuid():N}",
                Name = "12A2 Toán",
                Code = code,
                Grade = "12",
                Subject = "Toán 12",
                TeacherId = teacher.Id,
                TeacherName = teacher.DisplayName,
                Status = "active"
            };
            db.Classrooms.Add(cls);
            db.ClassroomAnnouncements.Add(new ClassroomAnnouncement
            {
                Id = $"ann-{Guid.NewGuid():N}",
                ClassroomId = cls.Id,
                TeacherId = teacher.Id,
                Title = "Lịch ôn tập",
                Body = "Ôn tập Chương 1",
                IsPinned = true
            });
            await db.SaveChangesAsync();
        }

        // Student 1 joins by code
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", student1Token);
        var joinResp = await _client.PostAsync("/api/v1/learner/workspace/classrooms/join", new StringContent(
            JsonSerializer.Serialize(new JoinClassroomRequestDto { Code = code }),
            Encoding.UTF8,
            "application/json"));
        var joinBody = await joinResp.Content.ReadAsStringAsync();
        Assert.True(joinResp.StatusCode == HttpStatusCode.OK, $"Expected 200 OK, got {(int)joinResp.StatusCode}: {joinBody}");
        var joined = JsonSerializer.Deserialize<LearnerClassroomSummaryDto>(joinBody, JsonOpts)!;
        Assert.Equal("12A2 Toán", joined.Name);
        Assert.Single(joined.Announcements);

        // Student 2 has NOT joined -> sees empty classrooms
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", student2Token);
        var s2Classes = JsonSerializer.Deserialize<List<LearnerClassroomSummaryDto>>(
            await (await _client.GetAsync("/api/v1/learner/workspace/classrooms")).Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.DoesNotContain(s2Classes, c => c.Id == joined.Id);

        // Seed one unsubmitted wrong response (must NOT leak), one completed unreleased TeacherExam wrong response (CorrectAnswer masked), and one completed released wrong response
        var unsubmittedQuestionId = $"q-unsub-{Guid.NewGuid():N}";
        var unreleasedQuestionId = $"q-unrel-{Guid.NewGuid():N}";
        var submittedQuestionId = $"q-sub-{Guid.NewGuid():N}";
        var unreleasedAsmId = $"asm-unrel-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var seedSubjId = $"subj-{Guid.NewGuid():N}";
            var seedChapId = $"chap-{Guid.NewGuid():N}";
            var seedLessonId = $"les-{Guid.NewGuid():N}";
            db.ContentQuestions.AddRange(
                new ContentQuestion
                {
                    Id = unreleasedQuestionId,
                    SubjectId = "math-12",
                    ChapterId = seedChapId,
                    Prompt = "Câu hỏi chưa công bố đáp án",
                    CorrectAnswer = "C",
                    Explanation = "Giải thích bí mật"
                },
                new ContentQuestion
                {
                    Id = submittedQuestionId,
                    SubjectId = "math-12",
                    ChapterId = seedChapId,
                    Prompt = "Câu hỏi đã công bố đáp án",
                    CorrectAnswer = "D",
                    Explanation = "Giải thích công khai"
                });
            db.ContentSubjects.Add(new ContentSubject { Id = seedSubjId, Code = $"MATH12-{seedSubjId[..6]}", Name = "Toán 12", Grade = "12" });
            db.ContentChapters.Add(new ContentChapter { Id = seedChapId, SubjectId = seedSubjId, Title = "Chương 1", OrderIndex = 1 });
            db.ContentLessons.Add(new ContentLesson { Id = seedLessonId, ChapterId = seedChapId, AuthorId = student1Id, Title = "Bài 1", Status = "published" });
            db.ContentAssessments.Add(new ContentAssessment
            {
                Id = unreleasedAsmId,
                LessonId = seedLessonId,
                Title = "Đề mẫu chưa công bố điểm",
                Status = "published"
            });
            db.TeacherExams.Add(new TeacherExam
            {
                Id = $"texam-unrel-{Guid.NewGuid():N}",
                ClassroomId = joined.Id,
                TeacherId = "tch-1",
                SourceAssessmentId = unreleasedAsmId,
                Title = "Đề chưa công bố điểm",
                PublishResults = false,
                Status = "published"
            });
            var unsubAttempt = new AssessmentAttempt
            {
                Id = $"att-{Guid.NewGuid():N}",
                UserId = student1Id,
                AssessmentId = "asm-test",
                LessonId = "les-test",
                SubjectId = "math-12",
                StartedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
                CompletedAt = null
            };
            var unrelAttempt = new AssessmentAttempt
            {
                Id = $"att-{Guid.NewGuid():N}",
                UserId = student1Id,
                AssessmentId = unreleasedAsmId,
                LessonId = "les-test",
                SubjectId = "math-12",
                StartedAt = DateTimeOffset.UtcNow.AddMinutes(-12),
                CompletedAt = DateTimeOffset.UtcNow.AddMinutes(-8)
            };
            var subAttempt = new AssessmentAttempt
            {
                Id = $"att-{Guid.NewGuid():N}",
                UserId = student1Id,
                AssessmentId = "asm-test",
                LessonId = "les-test",
                SubjectId = "math-12",
                StartedAt = DateTimeOffset.UtcNow.AddMinutes(-20),
                CompletedAt = DateTimeOffset.UtcNow.AddMinutes(-15)
            };
            db.AssessmentAttempts.AddRange(unsubAttempt, unrelAttempt, subAttempt);
            db.AssessmentResponses.AddRange(
                new AssessmentResponse
                {
                    AttemptId = unsubAttempt.Id,
                    QuestionId = unsubmittedQuestionId,
                    SelectedOptionIdsJson = "[\"A\"]",
                    IsCorrect = false
                },
                new AssessmentResponse
                {
                    AttemptId = unrelAttempt.Id,
                    QuestionId = unreleasedQuestionId,
                    SelectedOptionIdsJson = "[\"A\"]",
                    IsCorrect = false
                },
                new AssessmentResponse
                {
                    AttemptId = subAttempt.Id,
                    QuestionId = submittedQuestionId,
                    SelectedOptionIdsJson = "[\"B\"]",
                    IsCorrect = false
                });
            await db.SaveChangesAsync();
        }

        // Mistakes endpoint returns 200, excludes unsubmitted attempts, and masks CorrectAnswer for unreleased TeacherExam
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", student1Token);
        var mistakesResp = await _client.GetAsync("/api/v1/learner/workspace/mistakes");
        Assert.Equal(HttpStatusCode.OK, mistakesResp.StatusCode);
        var mistakes = JsonSerializer.Deserialize<List<StudentMistakeItemDto>>(
            await mistakesResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.DoesNotContain(mistakes, m => m.QuestionId == unsubmittedQuestionId);
        var unreleasedItem = Assert.Single(mistakes, m => m.QuestionId == unreleasedQuestionId);
        Assert.Null(unreleasedItem.CorrectAnswer);
        var releasedItem = Assert.Single(mistakes, m => m.QuestionId == submittedQuestionId);
        Assert.Equal("D", releasedItem.CorrectAnswer);
        Assert.False(releasedItem.IsResolved);

        // SW-002: ChapterTitle must be human-readable ContentChapter.Title, not opaque ChapterId
        Assert.Equal("Chương 1", releasedItem.ChapterTitle);

        // MYNOTES-001: Resolve mistake persists across reload
        var resolveResp = await _client.PatchAsync($"/api/v1/learner/workspace/mistakes/{releasedItem.ResponseId}/resolve", new StringContent("{}", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.NoContent, resolveResp.StatusCode);
        var mistakesAfter = JsonSerializer.Deserialize<List<StudentMistakeItemDto>>(
            await (await _client.GetAsync("/api/v1/learner/workspace/mistakes")).Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.True(Assert.Single(mistakesAfter, m => m.QuestionId == submittedQuestionId).IsResolved);

        // R07-01: Server-side assessment authority ignores tampered ScoreRaw/IsCorrect/SuccessStatus and enforces immutability
        string authQId;
        string authLesId;
        string authAsmId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var anyLesson = await db.ContentLessons.FirstAsync();
            authLesId = anyLesson.Id;
            authAsmId = $"asm-r07-{Guid.NewGuid():N}";
            authQId = $"q-r07-{Guid.NewGuid():N}";
            db.ContentAssessments.Add(new ContentAssessment { Id = authAsmId, LessonId = authLesId, Title = "Đề R07", PassScore = 80, Status = "published" });
            db.ContentQuestions.Add(new ContentQuestion
            {
                Id = authQId,
                AssessmentId = authAsmId,
                LessonId = authLesId,
                SubjectId = "math-12",
                ChapterId = anyLesson.ChapterId,
                Prompt = "Đạo hàm của x^2 là gì?",
                OptionsJson = "[\"2x\", \"x\", \"2\", \"x^2\"]",
                CorrectAnswer = "2x",
                Status = "published"
            });
            await db.SaveChangesAsync();
        }
        var tamperedPayload = new
        {
            assessmentId = authAsmId,
            lessonId = authLesId,
            subjectId = "math-12",
            completionStatus = "completed",
            successStatus = "passed",
            scoreRaw = 100.0,
            scoreScaled = 1.0,
            responses = new Dictionary<string, object>
            {
                [authQId] = new { questionId = authQId, selectedOptionIds = new[] { "x" }, isCorrect = true }
            }
        };
        var attResp = await _client.PostAsync("/api/v1/me/assessment-attempts", new StringContent(JsonSerializer.Serialize(tamperedPayload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, attResp.StatusCode);
        using (var attDoc = JsonDocument.Parse(await attResp.Content.ReadAsStringAsync()))
        {
            Assert.Equal(0.0, attDoc.RootElement.GetProperty("scoreRaw").GetDouble());
            Assert.Equal("failed", attDoc.RootElement.GetProperty("successStatus").GetString());
            Assert.False(attDoc.RootElement.GetProperty("responses").GetProperty(authQId).GetProperty("isCorrect").GetBoolean());
            var attId = attDoc.RootElement.GetProperty("id").GetString();
            // Completed attempt is immutable -> 409 Conflict
            var mutateResp = await _client.PutAsync($"/api/v1/me/assessment-attempts/{attId}", new StringContent(JsonSerializer.Serialize(tamperedPayload), Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.Conflict, mutateResp.StatusCode);
        }

        // Invalid short join code returns 400 BadRequest
        var badJoin = await _client.PostAsync("/api/v1/learner/workspace/classrooms/join", new StringContent(
            JsonSerializer.Serialize(new JoinClassroomRequestDto { Code = "AB" }), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, badJoin.StatusCode);
    }
}
