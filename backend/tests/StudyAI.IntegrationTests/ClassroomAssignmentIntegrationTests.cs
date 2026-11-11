using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.IntegrationTests;

public class ClassroomAssignmentIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public ClassroomAssignmentIntegrationTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, string UserId, string Email)> CreateAndLoginUserAsync(string role, string? displayName = null)
    {
        var email = $"{role}_{Guid.NewGuid():N}@studyai.internal";
        var password = "Password@123";

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            var user = new User
            {
                Id = $"usr-{Guid.NewGuid():N}"[..12],
                Email = email,
                EmailNormalized = email.ToUpperInvariant(),
                PasswordHash = passwordHasher.HashPassword(password),
                DisplayName = displayName ?? $"User {role}",
                Role = role,
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = email,
                Password = password
            }),
            Encoding.UTF8,
            "application/json"));

        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        var body = await loginResp.Content.ReadAsStringAsync();
        var auth = JsonSerializer.Deserialize<AuthResponseDto>(body, JsonOpts);
        Assert.NotNull(auth);

        return (auth.AccessToken, auth.User.Id, email);
    }

    [Fact]
    public async Task Teacher_Can_Create_Classroom_And_Learner_Cannot()
    {
        var (teacherToken, teacherId, _) = await CreateAndLoginUserAsync("teacher", "Thầy Minh");
        var (learnerToken, _, _) = await CreateAndLoginUserAsync("learner", "Em Nam");

        // Learner attempt to create classroom -> 403 Forbidden
        var learnerReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp 12A Forbidden",
                Grade = "12",
                Subject = "Toán học"
            }), Encoding.UTF8, "application/json")
        };
        learnerReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var learnerResp = await _client.SendAsync(learnerReq);
        Assert.Equal(HttpStatusCode.Forbidden, learnerResp.StatusCode);

        // Teacher create classroom -> 201 Created
        var teacherReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp 12A1 Chuyên Toán",
                Grade = "12",
                Subject = "Toán học",
                Room = "P.301"
            }), Encoding.UTF8, "application/json")
        };
        teacherReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var teacherResp = await _client.SendAsync(teacherReq);
        Assert.Equal(HttpStatusCode.Created, teacherResp.StatusCode);

        var createdClass = JsonSerializer.Deserialize<ClassroomDto>(await teacherResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(createdClass);
        Assert.Equal("Lớp 12A1 Chuyên Toán", createdClass.Name);
        Assert.Equal(teacherId, createdClass.TeacherId);
    }

    [Fact]
    public async Task Classroom_Enrollment_And_Duplicate_Conflict_Guard()
    {
        var (teacherToken, _, _) = await CreateAndLoginUserAsync("teacher", "Cô Lan");
        var (learnerToken, learnerId, learnerEmail) = await CreateAndLoginUserAsync("learner", "Em Hoa");

        // 1. Create class
        var createClassReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp 11B2",
                Grade = "11"
            }), Encoding.UTF8, "application/json")
        };
        createClassReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var classResp = await _client.SendAsync(createClassReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(classDto);

        // 2. Enroll learner
        var enrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto
            {
                StudentId = learnerId
            }), Encoding.UTF8, "application/json")
        };
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var enrollResp = await _client.SendAsync(enrollReq);
        Assert.Equal(HttpStatusCode.Created, enrollResp.StatusCode);

        // 3. Duplicate enrollment -> 409 Conflict
        var dupEnrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto
            {
                StudentEmail = learnerEmail
            }), Encoding.UTF8, "application/json")
        };
        dupEnrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var dupResp = await _client.SendAsync(dupEnrollReq);
        Assert.Equal(HttpStatusCode.Conflict, dupResp.StatusCode);

        // 4. Verify learner can see this classroom
        var learnerListReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/classrooms");
        learnerListReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var learnerListResp = await _client.SendAsync(learnerListReq);
        Assert.Equal(HttpStatusCode.OK, learnerListResp.StatusCode);
        var learnerClasses = JsonSerializer.Deserialize<List<ClassroomDto>>(await learnerListResp.Content.ReadAsStringAsync(), JsonOpts);
        Assert.NotNull(learnerClasses);
        Assert.Contains(learnerClasses, c => c.Id == classDto.Id);
    }

    [Fact]
    public async Task End_To_End_Assignment_Submission_Grading_Workflow()
    {
        var (teacherToken, teacherId, _) = await CreateAndLoginUserAsync("teacher", "Thầy Tuấn");
        var (learnerToken, learnerId, _) = await CreateAndLoginUserAsync("learner", "Em Bình");
        var (outsiderToken, _, _) = await CreateAndLoginUserAsync("learner", "Em Ngoài Lớp");

        // 1. Teacher creates classroom
        var createClassReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp 12 Chuyên Giải Tích",
                Grade = "12"
            }), Encoding.UTF8, "application/json")
        };
        createClassReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var classResp = await _client.SendAsync(createClassReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 2. Teacher enrolls learner
        var enrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto
            {
                StudentId = learnerId
            }), Encoding.UTF8, "application/json")
        };
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(enrollReq);

        // 3. Teacher creates assignment
        var createAsgReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/assignments")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateAssignmentRequestDto
            {
                Title = "Bài tập Đạo hàm & Khảo sát hàm số",
                Description = "Giải các bài toán khảo sát tính đơn điệu trong SGK",
                Instructions = "Trình bày các bước lập bảng biến thiên chi tiết",
                DueDate = DateTimeOffset.UtcNow.AddDays(3),
                MaxScore = 10.0
            }), Encoding.UTF8, "application/json")
        };
        createAsgReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var asgResp = await _client.SendAsync(createAsgReq);
        Assert.Equal(HttpStatusCode.Created, asgResp.StatusCode);
        var asgDto = JsonSerializer.Deserialize<AssignmentDto>(await asgResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 4. Outsider learner tries to submit -> 403 Forbidden
        var outsiderSubReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateSubmissionRequestDto
            {
                Content = "Em nộp bài chui"
            }), Encoding.UTF8, "application/json")
        };
        outsiderSubReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", outsiderToken);
        var outsiderResp = await _client.SendAsync(outsiderSubReq);
        Assert.Equal(HttpStatusCode.Forbidden, outsiderResp.StatusCode);

        // 5. Enrolled learner submits assignment -> 201 Created
        var submitReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateSubmissionRequestDto
            {
                Content = "Bước 1: Tập xác định D = R. Bước 2: y' = 3x^2 - 6x. Nghiệm y' = 0 tại x = 0, x = 2."
            }), Encoding.UTF8, "application/json")
        };
        submitReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var submitResp = await _client.SendAsync(submitReq);
        Assert.Equal(HttpStatusCode.Created, submitResp.StatusCode);
        var subDto = JsonSerializer.Deserialize<SubmissionDto>(await submitResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("submitted", subDto.Status);

        // 6. Teacher views submissions
        var listSubsReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/assignments/{asgDto.Id}/submissions");
        listSubsReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var listSubsResp = await _client.SendAsync(listSubsReq);
        Assert.Equal(HttpStatusCode.OK, listSubsResp.StatusCode);
        var subs = JsonSerializer.Deserialize<List<SubmissionDto>>(await listSubsResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Single(subs);
        Assert.Equal(subDto.Id, subs[0].Id);

        // 7. Teacher grades submission
        var gradeReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions/{subDto.Id}/grade")
        {
            Content = new StringContent(JsonSerializer.Serialize(new GradeSubmissionRequestDto
            {
                Score = 9.5,
                Feedback = "Lời giải chi tiết và chính xác, lập bảng biến thiên rõ ràng!"
            }), Encoding.UTF8, "application/json")
        };
        gradeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var gradeResp = await _client.SendAsync(gradeReq);
        Assert.Equal(HttpStatusCode.OK, gradeResp.StatusCode);
        var gradedDto = JsonSerializer.Deserialize<SubmissionDto>(await gradeResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("graded", gradedDto.Status);
        Assert.Equal(9.5, gradedDto.Score);
        Assert.Equal("Lời giải chi tiết và chính xác, lập bảng biến thiên rõ ràng!", gradedDto.Feedback);

        // 8. Learner verifies graded status
        var mySubReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/assignments/{asgDto.Id}/my-submission");
        mySubReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var mySubResp = await _client.SendAsync(mySubReq);
        Assert.Equal(HttpStatusCode.OK, mySubResp.StatusCode);
        var learnerViewSub = JsonSerializer.Deserialize<SubmissionDto>(await mySubResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal(9.5, learnerViewSub.Score);

        // 9. Resubmission blocked after grading -> 400 BadRequest
        var resubmitReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateSubmissionRequestDto
            {
                Content = "Nộp đè sau khi đã chấm"
            }), Encoding.UTF8, "application/json")
        };
        resubmitReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var resubmitResp = await _client.SendAsync(resubmitReq);
        Assert.Equal(HttpStatusCode.BadRequest, resubmitResp.StatusCode);
    }

    [Fact]
    public async Task Cross_Teacher_Isolation_Prevents_Unauthorized_Grading_And_Viewing()
    {
        var (teacherA, _, _) = await CreateAndLoginUserAsync("teacher", "Thầy A");
        var (teacherB, _, _) = await CreateAndLoginUserAsync("teacher", "Thầy B");

        // Teacher A creates class and assignment
        var classReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp Riêng Thầy A"
            }), Encoding.UTF8, "application/json")
        };
        classReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherA);
        var classResp = await _client.SendAsync(classReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Teacher B tries to view Teacher A's classroom -> 403 Forbidden
        var bViewClassReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/classrooms/{classDto.Id}");
        bViewClassReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherB);
        var bViewResp = await _client.SendAsync(bViewClassReq);
        Assert.Equal(HttpStatusCode.Forbidden, bViewResp.StatusCode);
    }
}

