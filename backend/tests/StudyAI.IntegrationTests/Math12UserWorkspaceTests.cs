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

        // Mistakes endpoint returns 200
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", student1Token);
        var mistakesResp = await _client.GetAsync("/api/v1/learner/workspace/mistakes");
        Assert.Equal(HttpStatusCode.OK, mistakesResp.StatusCode);
    }
}
