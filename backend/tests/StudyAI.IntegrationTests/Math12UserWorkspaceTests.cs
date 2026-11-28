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

        // SW-003: Partial submission (1 correct out of 2 published questions) must score 1/2 (failed), not 1/1
        var authQ2Id = $"q-r07-2-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var anyLesson = await db.ContentLessons.FirstAsync();
            db.ContentQuestions.Add(new ContentQuestion
            {
                Id = authQ2Id,
                AssessmentId = authAsmId,
                LessonId = authLesId,
                SubjectId = "math-12",
                ChapterId = anyLesson.ChapterId,
                Prompt = "Nguyên hàm của 2x là gì?",
                OptionsJson = "[\"x^2\", \"2\", \"x\"]",
                CorrectAnswer = "x^2",
                Status = "published"
            });
            await db.SaveChangesAsync();
        }
        var partialPayload = new
        {
            assessmentId = authAsmId,
            lessonId = authLesId,
            subjectId = "math-12",
            completionStatus = "completed",
            responses = new Dictionary<string, object>
            {
                [authQId] = new { questionId = authQId, selectedOptionIds = new[] { "2x" } }
            }
        };
        var partialResp = await _client.PostAsync("/api/v1/me/assessment-attempts", new StringContent(JsonSerializer.Serialize(partialPayload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, partialResp.StatusCode);
        using (var pDoc = JsonDocument.Parse(await partialResp.Content.ReadAsStringAsync()))
        {
            Assert.Equal(1.0, pDoc.RootElement.GetProperty("scoreRaw").GetDouble());
            Assert.Equal(2.0, pDoc.RootElement.GetProperty("scoreMax").GetDouble());
            Assert.Equal("failed", pDoc.RootElement.GetProperty("successStatus").GetString());
        }

        // Invalid short join code returns 400 BadRequest
        var badJoin = await _client.PostAsync("/api/v1/learner/workspace/classrooms/join", new StringContent(
            JsonSerializer.Serialize(new JoinClassroomRequestDto { Code = "AB" }), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, badJoin.StatusCode);

        // SYS-03 (R2): Targeted ContentAssessment scopes strictly to AssessmentId (does not leak other LessonId questions)
        var targetedAsmId = $"asm-sys03-{Guid.NewGuid():N}";
        var targetedQId = $"q-sys03-tf-{Guid.NewGuid():N}";
        var shortQId = $"q-sys03-sa-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var anyLesson = await db.ContentLessons.FirstAsync();
            db.ContentAssessments.Add(new ContentAssessment
            {
                Id = targetedAsmId,
                LessonId = authLesId,
                Title = "Đề kiểm tra mục tiêu SYS-03",
                Status = "published",
                PassScore = 50
            });
            db.ContentQuestions.AddRange(
                new ContentQuestion
                {
                    Id = targetedQId,
                    AssessmentId = targetedAsmId,
                    LessonId = authLesId,
                    SubjectId = "math-12",
                    ChapterId = anyLesson.ChapterId,
                    Type = "true-false-group",
                    Prompt = "Xét tính đúng sai các mệnh đề sau.",
                    OptionsJson = "[\"a\",\"b\",\"c\",\"d\"]",
                    CorrectAnswer = "true,false,true,false",
                    Status = "published"
                },
                new ContentQuestion
                {
                    Id = shortQId,
                    AssessmentId = targetedAsmId,
                    LessonId = authLesId,
                    SubjectId = "math-12",
                    ChapterId = anyLesson.ChapterId,
                    Type = "short-answer",
                    Prompt = "Tính giá trị cực đại của hàm số.",
                    OptionsJson = "[]",
                    CorrectAnswer = "2.5",
                    Status = "published"
                });
            await db.SaveChangesAsync();
        }

        // Submitting an unrelated lesson question into targeted assessment must return 400 BadRequest
        var leakPayload = new
        {
            assessmentId = targetedAsmId,
            lessonId = authLesId,
            subjectId = "math-12",
            completionStatus = "completed",
            responses = new Dictionary<string, object>
            {
                [authQId] = new { questionId = authQId, selectedOptionIds = new[] { "2x" } }
            }
        };
        var leakResp = await _client.PostAsync("/api/v1/me/assessment-attempts", new StringContent(JsonSerializer.Serialize(leakPayload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, leakResp.StatusCode);

        // True-false-group ("Đúng,Sai,Đúng,Sai") and short-answer ("5/2" == "2.5") both grade as correct; scoreMax == 2 (not 4)
        var validTargetedPayload = new
        {
            assessmentId = targetedAsmId,
            lessonId = authLesId,
            subjectId = "math-12",
            completionStatus = "completed",
            responses = new Dictionary<string, object>
            {
                [targetedQId] = new { questionId = targetedQId, selectedOptionIds = new[] { "Đúng,Sai,Đúng,Sai" } },
                [shortQId] = new { questionId = shortQId, selectedOptionIds = new[] { "5/2" } }
            }
        };
        var targetedResp = await _client.PostAsync("/api/v1/me/assessment-attempts", new StringContent(JsonSerializer.Serialize(validTargetedPayload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, targetedResp.StatusCode);
        using (var tDoc = JsonDocument.Parse(await targetedResp.Content.ReadAsStringAsync()))
        {
            Assert.Equal(2.0, tDoc.RootElement.GetProperty("scoreRaw").GetDouble());
            Assert.Equal(2.0, tDoc.RootElement.GetProperty("scoreMax").GetDouble());
            Assert.Equal("passed", tDoc.RootElement.GetProperty("successStatus").GetString());
        }

        // A2-001: Non-asm_ lesson/practice attempt ID (e.g. "asmt_exam") with no ContentAssessment falls back to LessonId
        var practiceCompatPayload = new
        {
            assessmentId = "asmt_exam",
            lessonId = authLesId,
            subjectId = "math-12",
            completionStatus = "completed",
            responses = new Dictionary<string, object>
            {
                [authQId] = new { questionId = authQId, selectedOptionIds = new[] { "2x" } }
            }
        };
        var compatResp = await _client.PostAsync("/api/v1/me/assessment-attempts", new StringContent(JsonSerializer.Serialize(practiceCompatPayload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, compatResp.StatusCode);
        using (var cDoc = JsonDocument.Parse(await compatResp.Content.ReadAsStringAsync()))
        {
            Assert.Equal(1.0, cDoc.RootElement.GetProperty("scoreRaw").GetDouble());
            Assert.True(cDoc.RootElement.GetProperty("scoreMax").GetDouble() >= 2.0);
        }

        // A2-002: short-answer with >1 values (["5/2", "999"]) must grade as false
        var multiShortPayload = new
        {
            assessmentId = targetedAsmId,
            lessonId = authLesId,
            subjectId = "math-12",
            completionStatus = "completed",
            responses = new Dictionary<string, object>
            {
                [shortQId] = new { questionId = shortQId, selectedOptionIds = new[] { "5/2", "999" } }
            }
        };
        var multiShortResp = await _client.PostAsync("/api/v1/me/assessment-attempts", new StringContent(JsonSerializer.Serialize(multiShortPayload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, multiShortResp.StatusCode);
        using (var mDoc = JsonDocument.Parse(await multiShortResp.Content.ReadAsStringAsync()))
        {
            Assert.Equal(0.0, mDoc.RootElement.GetProperty("scoreRaw").GetDouble());
            Assert.False(mDoc.RootElement.GetProperty("responses").GetProperty(shortQId).GetProperty("isCorrect").GetBoolean());
        }
    }
}
