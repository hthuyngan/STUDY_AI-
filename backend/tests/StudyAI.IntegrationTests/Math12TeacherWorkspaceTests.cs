using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using StudyAI.Features.Teacher;
using StudyAI.Models;
using Xunit;

namespace StudyAI.IntegrationTests;

public class Math12TeacherWorkspaceTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public Math12TeacherWorkspaceTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string UserId, string Token)> CreateUserWithRoleAsync(string prefix, string role)
    {
        var email = $"{prefix}_{Guid.NewGuid():N}@studyai.test";
        var regResp = await _client.PostAsync("/api/v1/auth/register", new StringContent(
            JsonSerializer.Serialize(new { email, password = "Password@123456", displayName = prefix, grade = "12" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, regResp.StatusCode);

        string userId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var user = await db.Users.FirstAsync(u => u.EmailNormalized == email.ToUpperInvariant());
            user.Role = role;
            userId = user.Id;
            await db.SaveChangesAsync();
        }

        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new { email, password = "Password@123456" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        using var doc = JsonDocument.Parse(await loginResp.Content.ReadAsStringAsync());
        return (userId, doc.RootElement.GetProperty("accessToken").GetString()!);
    }

    [Fact]
    public async Task TeacherWorkspace_Ownership_Exams_Materials_Announcements_And_AiAssistant_Work()
    {
        var (teacher1Id, teacher1Token) = await CreateUserWithRoleAsync("tch1", "teacher");
        var (_, teacher2Token) = await CreateUserWithRoleAsync("tch2", "teacher");
        var (_, learnerToken) = await CreateUserWithRoleAsync("lrn_t", "learner");

        var classId = $"cls-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            db.Classrooms.Add(new Classroom
            {
                Id = classId,
                Name = "Lớp 12A1 Toán",
                Code = $"12A1-{Guid.NewGuid():N}".Substring(0, 12),
                Grade = "12",
                Subject = "Toán 12",
                TeacherId = teacher1Id,
                Status = "active"
            });
            await db.SaveChangesAsync();
        }

        // Learner cannot access teacher workspace -> 403
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/teacher/workspace/exams")).StatusCode);

        // Teacher 2 cannot create exam or material in Teacher 1's classroom -> 403
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", teacher2Token);
        var crossExamResp = await _client.PostAsync("/api/v1/teacher/workspace/exams", new StringContent(
            JsonSerializer.Serialize(new CreateTeacherExamRequestDto { ClassroomId = classId, Title = "Cross Exam", DurationMinutes = 45 }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, crossExamResp.StatusCode);

        // Seed published ContentAssessment with 1 question for valid exam publishing
        var srcSubjId = $"subj-{Guid.NewGuid():N}";
        var srcChapId = $"chap-{Guid.NewGuid():N}";
        var srcLesId = $"les-{Guid.NewGuid():N}";
        var srcAssessmentId = $"asm-src-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            db.ContentSubjects.Add(new ContentSubject
            {
                Id = srcSubjId,
                Name = "Toán 12",
                Code = $"M12-{Guid.NewGuid():N}"[..10],
                Grade = "12"
            });
            db.ContentChapters.Add(new ContentChapter
            {
                Id = srcChapId,
                SubjectId = srcSubjId,
                Title = "Chương 1"
            });
            db.ContentLessons.Add(new ContentLesson
            {
                Id = srcLesId,
                ChapterId = srcChapId,
                AuthorId = teacher1Id,
                Title = "Bài 1",
                Status = "published"
            });
            db.ContentAssessments.Add(new ContentAssessment
            {
                Id = srcAssessmentId,
                LessonId = srcLesId,
                Title = "Đề mẫu Chương 1",
                Status = "published"
            });
            db.ContentQuestions.Add(new ContentQuestion
            {
                Id = $"q-{Guid.NewGuid():N}",
                AssessmentId = srcAssessmentId,
                SubjectId = srcSubjId,
                ChapterId = srcChapId,
                Prompt = "Tìm cực đại của hàm số y = x^3 - 3x.",
                CorrectAnswer = "x = -1"
            });
            await db.SaveChangesAsync();
        }

        // Teacher 1 cannot publish a source-less exam -> 400 BadRequest
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", teacher1Token);
        var emptyExamResp = await _client.PostAsync("/api/v1/teacher/workspace/exams", new StringContent(
            JsonSerializer.Serialize(new CreateTeacherExamRequestDto { ClassroomId = classId, Title = "Đề rỗng", DurationMinutes = 45 }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, emptyExamResp.StatusCode);
        var emptyExam = JsonSerializer.Deserialize<TeacherExamDto>(await emptyExamResp.Content.ReadAsStringAsync(), JsonOpts)!;
        var badPub = await _client.PatchAsync($"/api/v1/teacher/workspace/exams/{emptyExam.Id}/status", new StringContent(
            JsonSerializer.Serialize(new UpdateTeacherExamStatusRequestDto { Status = "published" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, badPub.StatusCode);

        // Teacher 1 creates & publishes exam backed by published ContentAssessment with questions -> 200 OK
        var examResp = await _client.PostAsync("/api/v1/teacher/workspace/exams", new StringContent(
            JsonSerializer.Serialize(new CreateTeacherExamRequestDto { ClassroomId = classId, SourceAssessmentId = srcAssessmentId, Title = "Kiểm tra Chương 1", DurationMinutes = 45 }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, examResp.StatusCode);
        var exam = JsonSerializer.Deserialize<TeacherExamDto>(await examResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var pubExam = await _client.PatchAsync($"/api/v1/teacher/workspace/exams/{exam.Id}/status", new StringContent(
            JsonSerializer.Serialize(new UpdateTeacherExamStatusRequestDto { Status = "published" }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, pubExam.StatusCode);

        var matResp = await _client.PostAsync("/api/v1/teacher/workspace/materials", new StringContent(
            JsonSerializer.Serialize(new CreateClassroomMaterialRequestDto
            {
                ClassroomId = classId,
                Title = "Bài giảng Cực trị",
                FileName = "cuc-tri.pdf",
                FileSizeBytes = 10240,
                StoragePathOrUrl = "https://cdn.studyai.vn/cuc-tri.pdf"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, matResp.StatusCode);
        var mat = JsonSerializer.Deserialize<ClassroomMaterialDto>(await matResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal(HttpStatusCode.OK, (await _client.DeleteAsync($"/api/v1/teacher/workspace/materials/{mat.Id}")).StatusCode);

        var annResp = await _client.PostAsync("/api/v1/teacher/workspace/announcements", new StringContent(
            JsonSerializer.Serialize(new CreateClassroomAnnouncementRequestDto
            {
                ClassroomId = classId,
                Title = "Nhắc lịch kiểm tra",
                Body = "Thứ 6 kiểm tra Chương 1.",
                IsPinned = true
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.Created, annResp.StatusCode);

        var schedResp = await _client.GetAsync("/api/v1/teacher/workspace/schedule");
        Assert.Equal(HttpStatusCode.OK, schedResp.StatusCode);

        var aiResp = await _client.PostAsync("/api/v1/teacher/workspace/ai-assistant", new StringContent(
            JsonSerializer.Serialize(new TeacherAiAssistantRequestDto
            {
                ClassroomId = classId,
                Mode = "lesson_plan",
                Prompt = "Gợi ý giáo án cực trị"
            }),
            Encoding.UTF8,
            "application/json"));
        Assert.Equal(HttpStatusCode.OK, aiResp.StatusCode);
        var aiDto = JsonSerializer.Deserialize<TeacherAiAssistantResponseDto>(await aiResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.True(aiDto.RequiresTeacherConfirmation);
    }
}
