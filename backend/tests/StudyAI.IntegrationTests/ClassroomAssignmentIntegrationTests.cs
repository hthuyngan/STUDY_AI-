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

    [Fact]
    public async Task Enrollment_Rejects_Non_Learner_Role_With_BadRequest()
    {
        var (teacherToken, _, _) = await CreateAndLoginUserAsync("teacher", "Thầy Chủ Nhiệm");
        var (otherTeacherToken, otherTeacherId, otherTeacherEmail) = await CreateAndLoginUserAsync("teacher", "Cô Giáo Khác");

        // Create class
        var classReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp Chuyên Sinh",
                Grade = "12",
                Subject = "Sinh học"
            }), Encoding.UTF8, "application/json")
        };
        classReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var classResp = await _client.SendAsync(classReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Try enrolling another teacher as student -> 400 BadRequest
        var enrollTeacherReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto
            {
                StudentEmail = otherTeacherEmail
            }), Encoding.UTF8, "application/json")
        };
        enrollTeacherReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var enrollResp = await _client.SendAsync(enrollTeacherReq);
        Assert.Equal(HttpStatusCode.BadRequest, enrollResp.StatusCode);
    }

    [Fact]
    public async Task Submission_Rejects_Closed_Or_Expired_Assignments()
    {
        var (teacherToken, _, _) = await CreateAndLoginUserAsync("teacher", "Thầy Toán");
        var (learnerToken, learnerId, learnerEmail) = await CreateAndLoginUserAsync("learner", "Học sinh A");

        // 1. Create class & enroll learner
        var classReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp 12 Hóa",
                Grade = "12",
                Subject = "Hóa học"
            }), Encoding.UTF8, "application/json")
        };
        classReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var classResp = await _client.SendAsync(classReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var enrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto { StudentEmail = learnerEmail }), Encoding.UTF8, "application/json")
        };
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(enrollReq);

        // 2. Create closed assignment
        var asgClosedReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/assignments")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateAssignmentRequestDto
            {
                Title = "Bài tập đã đóng",
                DueDate = DateTimeOffset.UtcNow.AddDays(2),
            }), Encoding.UTF8, "application/json")
        };
        asgClosedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var asgClosedResp = await _client.SendAsync(asgClosedReq);
        var asgClosedDto = JsonSerializer.Deserialize<AssignmentDto>(await asgClosedResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Update status to closed
        var updateStatusReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/assignments/{asgClosedDto.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new UpdateAssignmentRequestDto
            {
                Status = "closed"
            }), Encoding.UTF8, "application/json")
        };
        updateStatusReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(updateStatusReq);

        // Learner attempt to submit to closed assignment -> 400 BadRequest
        var submitClosedReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgClosedDto.Id}/submissions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateSubmissionRequestDto
            {
                Content = "Lời giải bài đã đóng"
            }), Encoding.UTF8, "application/json")
        };
        submitClosedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var submitClosedResp = await _client.SendAsync(submitClosedReq);
        Assert.Equal(HttpStatusCode.BadRequest, submitClosedResp.StatusCode);

        // 3. Create expired assignment (DueDate in the past)
        var asgExpiredReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/assignments")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateAssignmentRequestDto
            {
                Title = "Bài tập quá hạn",
                DueDate = DateTimeOffset.UtcNow.AddHours(-2),
            }), Encoding.UTF8, "application/json")
        };
        asgExpiredReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var asgExpiredResp = await _client.SendAsync(asgExpiredReq);
        var asgExpiredDto = JsonSerializer.Deserialize<AssignmentDto>(await asgExpiredResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Learner attempt to submit to expired assignment -> 400 BadRequest
        var submitExpiredReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgExpiredDto.Id}/submissions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateSubmissionRequestDto
            {
                Content = "Lời giải nộp trễ hạn"
            }), Encoding.UTF8, "application/json")
        };
        submitExpiredReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var submitExpiredResp = await _client.SendAsync(submitExpiredReq);
        Assert.Equal(HttpStatusCode.BadRequest, submitExpiredResp.StatusCode);
    }

    [Fact]
    public async Task Submission_Rejects_Draft_Assignment_With_BadRequest()
    {
        var (teacherToken, _, _) = await CreateAndLoginUserAsync("teacher", "Thầy Giáo Draft");
        var (learnerToken, learnerId, learnerEmail) = await CreateAndLoginUserAsync("learner", "Học sinh Draft");

        // 1. Create class & enroll learner
        var classReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp Nháp 10A",
                Grade = "10",
                Subject = "Toán học"
            }), Encoding.UTF8, "application/json")
        };
        classReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var classResp = await _client.SendAsync(classReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var enrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto { StudentEmail = learnerEmail }), Encoding.UTF8, "application/json")
        };
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(enrollReq);

        // 2. Create assignment
        var asgReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/assignments")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateAssignmentRequestDto
            {
                Title = "Bài tập bản nháp",
                DueDate = DateTimeOffset.UtcNow.AddDays(2),
            }), Encoding.UTF8, "application/json")
        };
        asgReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var asgResp = await _client.SendAsync(asgReq);
        var asgDto = JsonSerializer.Deserialize<AssignmentDto>(await asgResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Set status to draft
        var updateReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/assignments/{asgDto.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new UpdateAssignmentRequestDto
            {
                Status = "draft"
            }), Encoding.UTF8, "application/json")
        };
        updateReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(updateReq);

        // 3. Learner attempts to submit -> 400 BadRequest
        var submitReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateSubmissionRequestDto
            {
                Content = "Nộp bài cho bản nháp"
            }), Encoding.UTF8, "application/json")
        };
        submitReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var submitResp = await _client.SendAsync(submitReq);
        Assert.Equal(HttpStatusCode.BadRequest, submitResp.StatusCode);
        var body = await submitResp.Content.ReadAsStringAsync();
        Assert.Contains("bản nháp", body);
    }

    [Fact]
    public async Task Teacher_Can_Grade_Closed_Assignment_Successfully_And_Cannot_Grade_Archived()
    {
        var (teacherToken, _, _) = await CreateAndLoginUserAsync("teacher", "Thầy Chấm Bài");
        var (learnerToken, learnerId, learnerEmail) = await CreateAndLoginUserAsync("learner", "Học sinh Nộp");

        // 1. Create class & enroll learner
        var classReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp Ôn Thi 12",
                Grade = "12",
            }), Encoding.UTF8, "application/json")
        };
        classReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var classResp = await _client.SendAsync(classReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var enrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto { StudentEmail = learnerEmail }), Encoding.UTF8, "application/json")
        };
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(enrollReq);

        // 2. Create assignment
        var asgReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/assignments")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateAssignmentRequestDto
            {
                Title = "Bài thi thử",
                DueDate = DateTimeOffset.UtcNow.AddDays(2),
                MaxScore = 10.0
            }), Encoding.UTF8, "application/json")
        };
        asgReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var asgResp = await _client.SendAsync(asgReq);
        var asgDto = JsonSerializer.Deserialize<AssignmentDto>(await asgResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 3. Learner submits while open
        var submitReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateSubmissionRequestDto
            {
                Content = "Bài làm hoàn chỉnh"
            }), Encoding.UTF8, "application/json")
        };
        submitReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var submitResp = await _client.SendAsync(submitReq);
        Assert.Equal(HttpStatusCode.Created, submitResp.StatusCode);
        var subDto = JsonSerializer.Deserialize<SubmissionDto>(await submitResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 4. Close the assignment
        var closeReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/assignments/{asgDto.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new UpdateAssignmentRequestDto
            {
                Status = "closed"
            }), Encoding.UTF8, "application/json")
        };
        closeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(closeReq);

        // 5. Teacher grades closed assignment -> 200 OK
        var gradeClosedReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions/{subDto.Id}/grade")
        {
            Content = new StringContent(JsonSerializer.Serialize(new GradeSubmissionRequestDto
            {
                Score = 8.5,
                Feedback = "Tốt, bài đã đóng nhưng giáo viên vẫn chấm được"
            }), Encoding.UTF8, "application/json")
        };
        gradeClosedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var gradeClosedResp = await _client.SendAsync(gradeClosedReq);
        Assert.Equal(HttpStatusCode.OK, gradeClosedResp.StatusCode);
        var graded = JsonSerializer.Deserialize<SubmissionDto>(await gradeClosedResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal(8.5, graded.Score);

        // 6. Archive assignment
        var archiveReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/assignments/{asgDto.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new UpdateAssignmentRequestDto
            {
                Status = "archived"
            }), Encoding.UTF8, "application/json")
        };
        archiveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(archiveReq);

        // 7. Teacher attempts to grade archived assignment -> 400 BadRequest
        var gradeArchivedReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions/{subDto.Id}/grade")
        {
            Content = new StringContent(JsonSerializer.Serialize(new GradeSubmissionRequestDto
            {
                Score = 9.0,
                Feedback = "Chấm khi đã archived"
            }), Encoding.UTF8, "application/json")
        };
        gradeArchivedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var gradeArchivedResp = await _client.SendAsync(gradeArchivedReq);
        Assert.Equal(HttpStatusCode.BadRequest, gradeArchivedResp.StatusCode);
        var archivedBody = await gradeArchivedResp.Content.ReadAsStringAsync();
        Assert.Contains("lưu trữ", archivedBody);
    }

    [Fact]
    public async Task Delete_Assignment_Hard_Deletes_When_Empty_And_Archives_When_Submissions_Exist()
    {
        var (teacherToken, _, _) = await CreateAndLoginUserAsync("teacher", "Thầy Xóa Bài");
        var (learnerToken, learnerId, learnerEmail) = await CreateAndLoginUserAsync("learner", "Học sinh Test Xóa");

        // 1. Create class & enroll learner
        var classReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp Test Xóa",
                Grade = "11",
            }), Encoding.UTF8, "application/json")
        };
        classReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var classResp = await _client.SendAsync(classReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var enrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto { StudentEmail = learnerEmail }), Encoding.UTF8, "application/json")
        };
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(enrollReq);

        // 2. Create assignment A without submissions
        var asgAReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/assignments")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateAssignmentRequestDto
            {
                Title = "Bài tập A không có submission",
                DueDate = DateTimeOffset.UtcNow.AddDays(5),
            }), Encoding.UTF8, "application/json")
        };
        asgAReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var asgAResp = await _client.SendAsync(asgAReq);
        var asgADto = JsonSerializer.Deserialize<AssignmentDto>(await asgAResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Delete assignment A -> 204 NoContent
        var deleteAReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/assignments/{asgADto.Id}");
        deleteAReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var deleteAResp = await _client.SendAsync(deleteAReq);
        Assert.Equal(HttpStatusCode.NoContent, deleteAResp.StatusCode);

        // Verify assignment A is gone -> 404
        var getAReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/assignments/{asgADto.Id}");
        getAReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var getAResp = await _client.SendAsync(getAReq);
        Assert.Equal(HttpStatusCode.NotFound, getAResp.StatusCode);

        // 3. Create assignment B with submission
        var asgBReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/assignments")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateAssignmentRequestDto
            {
                Title = "Bài tập B có submission",
                DueDate = DateTimeOffset.UtcNow.AddDays(5),
            }), Encoding.UTF8, "application/json")
        };
        asgBReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var asgBResp = await _client.SendAsync(asgBReq);
        var asgBDto = JsonSerializer.Deserialize<AssignmentDto>(await asgBResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Submit to B
        var submitBReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgBDto.Id}/submissions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateSubmissionRequestDto
            {
                Content = "Bài làm B"
            }), Encoding.UTF8, "application/json")
        };
        submitBReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        await _client.SendAsync(submitBReq);

        // Delete assignment B -> 200 OK (soft-archived)
        var deleteBReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/assignments/{asgBDto.Id}");
        deleteBReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var deleteBResp = await _client.SendAsync(deleteBReq);
        Assert.Equal(HttpStatusCode.OK, deleteBResp.StatusCode);

        // Verify B still exists and is archived
        var getBReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/assignments/{asgBDto.Id}");
        getBReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var getBResp = await _client.SendAsync(getBReq);
        Assert.Equal(HttpStatusCode.OK, getBResp.StatusCode);
        var verifiedB = JsonSerializer.Deserialize<AssignmentDto>(await getBResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Equal("archived", verifiedB.Status);
    }

    [Fact]
    public async Task Delete_Classroom_Rejects_When_Students_Enrolled_And_Archives_When_Assignments_Exist()
    {
        var (teacherToken, _, _) = await CreateAndLoginUserAsync("teacher", "Thầy Xóa Lớp");
        var (learnerToken, learnerId, learnerEmail) = await CreateAndLoginUserAsync("learner", "Học sinh Lớp Xóa");

        // 1. Create class with enrolled student
        var classReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp có học sinh",
                Grade = "10",
            }), Encoding.UTF8, "application/json")
        };
        classReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var classResp = await _client.SendAsync(classReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var enrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto { StudentEmail = learnerEmail }), Encoding.UTF8, "application/json")
        };
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(enrollReq);

        // Attempt to delete classroom with enrolled students -> 400 BadRequest
        var deleteReq1 = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/classrooms/{classDto.Id}");
        deleteReq1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var deleteResp1 = await _client.SendAsync(deleteReq1);
        Assert.Equal(HttpStatusCode.BadRequest, deleteResp1.StatusCode);
        var body1 = await deleteResp1.Content.ReadAsStringAsync();
        Assert.Contains("học viên", body1);

        // 2. Create class with no students, but with an assignment
        var class2Req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp có bài tập không có học sinh",
                Grade = "11",
            }), Encoding.UTF8, "application/json")
        };
        class2Req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var class2Resp = await _client.SendAsync(class2Req);
        var class2Dto = JsonSerializer.Deserialize<ClassroomDto>(await class2Resp.Content.ReadAsStringAsync(), JsonOpts)!;

        var asgReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{class2Dto.Id}/assignments")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateAssignmentRequestDto
            {
                Title = "Bài tập độc lập",
                DueDate = DateTimeOffset.UtcNow.AddDays(5),
            }), Encoding.UTF8, "application/json")
        };
        asgReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(asgReq);

        // Delete class 2 -> 200 OK (soft-archived)
        var deleteReq2 = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/classrooms/{class2Dto.Id}");
        deleteReq2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var deleteResp2 = await _client.SendAsync(deleteReq2);
        Assert.Equal(HttpStatusCode.OK, deleteResp2.StatusCode);

        // 3. Create completely empty class -> 204 NoContent
        var emptyClassReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp trống rỗng",
                Grade = "12",
            }), Encoding.UTF8, "application/json")
        };
        emptyClassReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var emptyClassResp = await _client.SendAsync(emptyClassReq);
        var emptyClassDto = JsonSerializer.Deserialize<ClassroomDto>(await emptyClassResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var deleteEmptyReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/classrooms/{emptyClassDto.Id}");
        deleteEmptyReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var deleteEmptyResp = await _client.SendAsync(deleteEmptyReq);
        Assert.Equal(HttpStatusCode.NoContent, deleteEmptyResp.StatusCode);
    }

    [Fact]
    public async Task GradeSubmission_DerivesMastery_From_Classroom_Grade_And_Subject()
    {
        var (teacherToken, _, _) = await CreateAndLoginUserAsync("teacher", "Thầy Giáo Toán 10");
        var (learnerToken, learnerId, learnerEmail) = await CreateAndLoginUserAsync("learner", "Học sinh Lớp 10");

        // 1. Create a Grade 10 Math classroom
        var classReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = "Lớp 10A1 Chuyên Toán",
                Grade = "10",
                Subject = "Toán học"
            }), Encoding.UTF8, "application/json")
        };
        classReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var classResp = await _client.SendAsync(classReq);
        var classDto = JsonSerializer.Deserialize<ClassroomDto>(await classResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // Enroll learner
        var enrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto { StudentEmail = learnerEmail }), Encoding.UTF8, "application/json")
        };
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        await _client.SendAsync(enrollReq);

        // 2. Create Grade 10 assignment
        var asgReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classDto.Id}/assignments")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateAssignmentRequestDto
            {
                Title = "Bài tập Hàm số bậc hai",
                DueDate = DateTimeOffset.UtcNow.AddDays(3),
                MaxScore = 10.0
            }), Encoding.UTF8, "application/json")
        };
        asgReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var asgResp = await _client.SendAsync(asgReq);
        var asgDto = JsonSerializer.Deserialize<AssignmentDto>(await asgResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 3. Learner submits assignment
        var submitReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateSubmissionRequestDto
            {
                Content = "Em nộp bài tập hàm số bậc hai đầy đủ các bước"
            }), Encoding.UTF8, "application/json")
        };
        submitReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        var submitResp = await _client.SendAsync(submitReq);
        var subDto = JsonSerializer.Deserialize<SubmissionDto>(await submitResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 4. Teacher grades assignment with 9.0
        var gradeReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/assignments/{asgDto.Id}/submissions/{subDto.Id}/grade")
        {
            Content = new StringContent(JsonSerializer.Serialize(new GradeSubmissionRequestDto
            {
                Score = 9.0,
                Feedback = "Lời giải mạch lạc, vẽ bảng biến thiên chính xác."
            }), Encoding.UTF8, "application/json")
        };
        gradeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var gradeResp = await _client.SendAsync(gradeReq);
        Assert.Equal(HttpStatusCode.OK, gradeResp.StatusCode);

        // 5. Verify mastery record in database: MUST be attributed to sub_math10, NOT sub_math12!
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var mastery = await db.StudentTopicMasteries
                .FirstOrDefaultAsync(m => m.UserId == learnerId && m.TopicName.Contains("Hàm số bậc hai"));

            Assert.NotNull(mastery);
            Assert.Equal("sub_math10", mastery.SubjectId);
            Assert.NotEqual("sub_math12", mastery.SubjectId);
            Assert.Equal(90.0, mastery.MasteryScore);
            Assert.True(mastery.Status == "proficient" || mastery.Status == "mastered");
        }
    }
}

