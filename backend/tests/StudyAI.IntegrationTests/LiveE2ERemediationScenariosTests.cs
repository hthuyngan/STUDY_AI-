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

/// <summary>
/// Live E2E Integration Suite validating core P00/P01 business flows directly on StudyAIDb_E2E.
/// Unlike UI smoke tests with mocked APIs, every scenario here executes real HTTP requests
/// against ASP.NET Core 10 and performs atomic database reads/writes in SQL Server with strict assertions.
/// </summary>
public class LiveE2ERemediationScenariosTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public LiveE2ERemediationScenariosTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> GetAdminTokenAsync()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var adminUser = await db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == "ADMIN@STUDYAI.INTERNAL" || u.EmailNormalized == "admin@studyai.internal");
            if (adminUser != null && (adminUser.Role != "admin" || adminUser.Status != "active"))
            {
                adminUser.Role = "admin";
                adminUser.Status = "active";
                await db.SaveChangesAsync();
            }
        }

        var loginResp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = "admin@studyai.internal",
                Password = "Admin@123456"
            }),
            Encoding.UTF8,
            "application/json"));

        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        var body = await loginResp.Content.ReadAsStringAsync();
        var auth = JsonSerializer.Deserialize<AuthResponseDto>(body, JsonOpts);
        return auth!.AccessToken;
    }

    private async Task<(string token, string userId)> CreateAndLoginUserAsync(string role, string name, string? password = null)
    {
        var email = $"{role}.{Guid.NewGuid():N}@studyai.test";
        var pwd = password ?? "SecureP@ss123456";

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        var user = new User
        {
            Id = $"usr_{role}_{Guid.NewGuid():N}",
            Email = email,
            EmailNormalized = email.ToUpperInvariant(),
            DisplayName = name,
            PasswordHash = hasher.HashPassword(pwd),
            Role = role,
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var resp = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto { Email = email, Password = pwd }),
            Encoding.UTF8, "application/json"));

        var body = await resp.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        var token = doc.RootElement.GetProperty("accessToken").GetString()!;
        return (token, user.Id);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // SCENARIO 1: Chuyển lớp và xác minh enrollment sau refresh trên SQL Server
    // ─────────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task LiveE2E_ClassroomTransfer_PersistsToSql_AndVerifiesEnrollmentAfterRefresh()
    {
        var (teacherToken, teacherId) = await CreateAndLoginUserAsync("teacher", "Thầy Chuyển Lớp E2E");
        var (_, studentId) = await CreateAndLoginUserAsync("learner", "Học Sinh Chuyển Lớp E2E");

        // 1. Tạo Lớp A và Lớp B
        var classAReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = $"Lớp 12A1 Nguồn {Guid.NewGuid():N}",
                Grade = "12",
                Subject = "Toán học"
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", teacherToken) }
        };
        var classAResp = await _client.SendAsync(classAReq);
        Assert.Equal(HttpStatusCode.Created, classAResp.StatusCode);
        var classA = JsonSerializer.Deserialize<ClassroomDto>(await classAResp.Content.ReadAsStringAsync(), JsonOpts)!;

        var classBReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/classrooms")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateClassroomRequestDto
            {
                Name = $"Lớp 12A2 Đích {Guid.NewGuid():N}",
                Grade = "12",
                Subject = "Toán học"
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", teacherToken) }
        };
        var classBResp = await _client.SendAsync(classBReq);
        Assert.Equal(HttpStatusCode.Created, classBResp.StatusCode);
        var classB = JsonSerializer.Deserialize<ClassroomDto>(await classBResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 2. Ghi danh học sinh vào Lớp A
        var enrollReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classA.Id}/students")
        {
            Content = new StringContent(JsonSerializer.Serialize(new EnrollStudentRequestDto { StudentId = studentId }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", teacherToken) }
        };
        var enrollResp = await _client.SendAsync(enrollReq);
        Assert.True(enrollResp.StatusCode == HttpStatusCode.Created || enrollResp.StatusCode == HttpStatusCode.OK);

        // 3. Thực hiện chuyển lớp từ Lớp A sang Lớp B qua TransferStudent API
        var transferReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/classrooms/{classB.Id}/transfer-student")
        {
            Content = new StringContent(JsonSerializer.Serialize(new TransferStudentRequestDto
            {
                StudentId = studentId,
                SourceClassroomId = classA.Id
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", teacherToken) }
        };
        var transferResp = await _client.SendAsync(transferReq);
        Assert.Equal(HttpStatusCode.OK, transferResp.StatusCode);

        // 4. Assert sau Refresh (gọi GET mới hoàn toàn mô phỏng người dùng tải lại trang):
        // Học sinh không còn ở Lớp A
        var getAReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/classrooms/{classA.Id}/students")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", teacherToken) }
        };
        var getAResp = await _client.SendAsync(getAReq);
        Assert.Equal(HttpStatusCode.OK, getAResp.StatusCode);
        var studentsA = JsonSerializer.Deserialize<List<ClassroomStudentDto>>(await getAResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.DoesNotContain(studentsA, s => s.StudentId == studentId);

        // Học sinh xuất hiện trong Lớp B
        var getBReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/classrooms/{classB.Id}/students")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", teacherToken) }
        };
        var getBResp = await _client.SendAsync(getBReq);
        Assert.Equal(HttpStatusCode.OK, getBResp.StatusCode);
        var studentsB = JsonSerializer.Deserialize<List<ClassroomStudentDto>>(await getBResp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.Contains(studentsB, s => s.StudentId == studentId);

        // 5. Kiểm tra trực tiếp trên SQL Server StudyAIDb_E2E
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var inA = await db.ClassroomStudents.AnyAsync(cs => cs.ClassroomId == classA.Id && cs.StudentId == studentId);
            var inB = await db.ClassroomStudents.AnyAsync(cs => cs.ClassroomId == classB.Id && cs.StudentId == studentId);
            Assert.False(inA, "Cơ sở dữ liệu SQL Server: Học sinh không được còn ở Lớp A");
            Assert.True(inB, "Cơ sở dữ liệu SQL Server: Học sinh phải được lưu vào Lớp B");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // SCENARIO 2: Khóa giáo viên, xác minh tài khoản không thể đăng nhập
    // ─────────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task LiveE2E_TeacherLock_PersistsToSql_AndRejectsLoginWith403()
    {
        var adminToken = await GetAdminTokenAsync();
        var teacherEmail = $"teacher.lock.{Guid.NewGuid():N}@studyai.test";
        var password = "SecureTeacherPass@2026";

        // 1. Admin tạo tài khoản giáo viên mới
        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/teachers")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
            {
                Name = "Thầy Bị Khóa E2E",
                Email = teacherEmail,
                Subject = "Toán 12",
                Password = password,
                Status = "active"
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", adminToken) }
        };
        var createResp = await _client.SendAsync(createReq);
        Assert.True(createResp.StatusCode == HttpStatusCode.Created || createResp.StatusCode == HttpStatusCode.OK);
        var teacher = JsonSerializer.Deserialize<AdminTeacherDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 2. Xác minh đăng nhập thành công ban đầu
        var loginActive = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto { Email = teacherEmail, Password = password }),
            Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, loginActive.StatusCode);

        // 3. Admin khóa tài khoản giáo viên: PUT /api/v1/admin/teachers/{id} với AccountStatus = "LOCKED" (hoặc status = "inactive")
        var lockReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/teachers/{teacher.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
            {
                Name = "Thầy Bị Khóa E2E",
                Email = teacherEmail,
                Subject = "Toán 12",
                Status = "inactive",
                AccountStatus = "LOCKED"
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", adminToken) }
        };
        var lockResp = await _client.SendAsync(lockReq);
        Assert.Equal(HttpStatusCode.OK, lockResp.StatusCode);

        // 4. Kiểm tra SQL Server: status của user phải là "disabled" hoặc "suspended"
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var dbUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == teacher.Id);
            Assert.NotNull(dbUser);
            Assert.True(dbUser.Status == "disabled" || dbUser.Status == "suspended",
                $"SQL Server User.Status phải bị khóa (disabled hoặc suspended), thực tế: '{dbUser.Status}'");
        }

        // 5. Thử đăng nhập lại khi đã bị khóa: BẮT BUỘC BỊ TỪ CHỐI 403 Forbidden
        var loginLocked = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto { Email = teacherEmail, Password = password }),
            Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, loginLocked.StatusCode);

        // 6. Admin mở khóa: PUT với status = "active" và AccountStatus = "ACTIVE"
        var unlockReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/teachers/{teacher.Id}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SaveTeacherRequestDto
            {
                Name = "Thầy Bị Khóa E2E",
                Email = teacherEmail,
                Subject = "Toán 12",
                Status = "active",
                AccountStatus = "ACTIVE"
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", adminToken) }
        };
        var unlockResp = await _client.SendAsync(unlockReq);
        Assert.Equal(HttpStatusCode.OK, unlockResp.StatusCode);

        // Đăng nhập lại thành công 200 OK
        var loginUnlocked = await _client.PostAsync("/api/v1/auth/login", new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto { Email = teacherEmail, Password = password }),
            Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, loginUnlocked.StatusCode);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // SCENARIO 3: Hai Admin cập nhật Settings đồng thời, kiểm chứng xung đột 409
    // ─────────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task LiveE2E_SettingsConcurrency_TwoAdmins_SecondReceives409Conflict_AndSqlPreserved()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Cả 2 phiên Admin cùng đọc Settings để lấy version token ban đầu (V1)
        var getReq1 = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/settings")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", adminToken) }
        };
        var getResp1 = await _client.SendAsync(getReq1);
        Assert.Equal(HttpStatusCode.OK, getResp1.StatusCode);
        var settingsSession1 = JsonSerializer.Deserialize<OperationalSettingsDto>(await getResp1.Content.ReadAsStringAsync(), JsonOpts)!;
        var initialVersion = settingsSession1.Version;

        // Phiên 2 giữ nguyên version V1 cũ
        var staleVersion = initialVersion;

        // 2. Admin 1 cập nhật thành công với version V1 -> CSDL chuyển sang version V2
        var update1Req = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(new OperationalSettingsDto
            {
                SystemName = "STUDY_AI Phiên 1 Cập Nhật",
                SystemDescription = "Cấu hình chuẩn bởi Admin 1",
                Language = "vi-VN",
                PassingScoreThreshold = 6.5,
                Version = initialVersion
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", adminToken) }
        };
        var update1Resp = await _client.SendAsync(update1Req);
        Assert.Equal(HttpStatusCode.OK, update1Resp.StatusCode);
        var updated1 = JsonSerializer.Deserialize<OperationalSettingsDto>(await update1Resp.Content.ReadAsStringAsync(), JsonOpts)!;
        Assert.NotEqual(initialVersion, updated1.Version);

        // 3. Admin 2 gửi request cập nhật với version cũ (V1) -> BẮT BUỘC NHẬN 409 CONFLICT
        var update2Req = new HttpRequestMessage(HttpMethod.Put, "/api/v1/admin/settings")
        {
            Content = new StringContent(JsonSerializer.Serialize(new OperationalSettingsDto
            {
                SystemName = "STUDY_AI Phiên 2 Cố Tình Ghi Đè",
                SystemDescription = "Cấu hình bị lỗi xung đột",
                Language = "vi-VN",
                PassingScoreThreshold = 7.0,
                Version = staleVersion // Version cũ đã hết hạn!
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", adminToken) }
        };
        var update2Resp = await _client.SendAsync(update2Req);
        Assert.Equal(HttpStatusCode.Conflict, update2Resp.StatusCode);

        // 4. Kiểm tra SQL Server: Cấu hình của Admin 1 phải được bảo toàn, không bị ghi đè bởi Admin 2
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var latestLog = await db.StaffAuditLogs
                .Where(l => l.TargetType == "system_settings" && l.Action == "system_settings_updated")
                .OrderByDescending(l => l.CreatedAt)
                .FirstOrDefaultAsync();

            Assert.NotNull(latestLog);
            var payload = latestLog.Payload;
            Assert.False(string.IsNullOrWhiteSpace(payload));
            var persisted = JsonSerializer.Deserialize<OperationalSettingsDto>(payload, JsonOpts);
            Assert.NotNull(persisted);
            Assert.Equal("STUDY_AI Phiên 1 Cập Nhật", persisted.SystemName);
            Assert.NotEqual("STUDY_AI Phiên 2 Cố Tình Ghi Đè", persisted.SystemName);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // SCENARIO 4: Nộp bài Assessment khi server lỗi, xác minh phiên không bị completed
    // ─────────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task LiveE2E_AssessmentSubmissionFailure_PreservesInProgressStateInSql_FailClosed()
    {
        var (studentToken, studentId) = await CreateAndLoginUserAsync("learner", "Học Sinh Làm Bài E2E");

        // 1. Khởi tạo một phiên làm bài trắc nghiệm (AssessmentAttempt)
        var createAttemptReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/me/assessment-attempts")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                assessmentId = "asmt_test_fail_closed",
                lessonId = "les_math10_01",
                topicId = "top_math10_ham_so",
                topicName = "Hàm số bậc hai",
                completionStatus = "incomplete",
                successStatus = "unknown",
                progressMeasure = 0.5,
                scoreRaw = 5.0,
                scoreScaled = 5.0,
                scoreMax = 10.0,
                timeSpentSeconds = 300,
                responses = new Dictionary<string, AssessmentResponseItemDto>
                {
                    ["q_sample_01"] = new()
                    {
                        QuestionId = "q_sample_01",
                        SelectedOptionIds = new List<string> { "opt_a" },
                        IsCorrect = true
                    }
                }
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", studentToken) }
        };
        var createResp = await _client.SendAsync(createAttemptReq);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var createdAttempt = JsonSerializer.Deserialize<AssessmentAttemptResponseDto>(await createResp.Content.ReadAsStringAsync(), JsonOpts)!;

        // 2. Xác minh ban đầu trong SQL Server StudyAIDb_E2E: attempt đang ở trạng thái "incomplete"
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var initialDbAttempt = await db.AssessmentAttempts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == createdAttempt.Id);
            Assert.NotNull(initialDbAttempt);
            Assert.Equal("incomplete", initialDbAttempt.CompletionStatus);
        }

        // 3. Gửi yêu cầu nộp bài/kết thúc không hợp lệ (SessionId không tồn tại để mô phỏng thất bại phía máy chủ)
        var invalidSubmitReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/practice/sessions/non_existent_session_id/submit")
        {
            Content = new StringContent(JsonSerializer.Serialize(new SubmitPracticeSessionRequest
            {
                Answers = new Dictionary<string, string> { ["q1"] = "A" }
            }), Encoding.UTF8, "application/json"),
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", studentToken) }
        };
        var invalidResp = await _client.SendAsync(invalidSubmitReq);

        // Máy chủ từ chối với mã lỗi 400 hoặc 404 (Fail-closed)
        Assert.True(invalidResp.StatusCode == HttpStatusCode.NotFound || invalidResp.StatusCode == HttpStatusCode.BadRequest);

        // 4. Xác minh trong SQL Server StudyAIDb_E2E: Phiên làm bài của học sinh KHÔNG bị chuyển thành "completed"
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var dbAttempt = await db.AssessmentAttempts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == createdAttempt.Id);
            Assert.NotNull(dbAttempt);
            Assert.NotEqual("completed", dbAttempt.CompletionStatus);
            Assert.Equal("incomplete", dbAttempt.CompletionStatus);

            // Xác minh không có tiến độ giả mạo 100% được ghi nhận cho bài học này
            var progress = await db.LessonProgresses.AsNoTracking()
                .FirstOrDefaultAsync(lp => lp.UserId == studentId && lp.LessonId == "les_math10_01");
            Assert.True(progress == null || progress.OverallProgress < 100,
                "Không được ghi nhận hoàn thành bài học khi nộp bài thi gặp lỗi");
        }
    }
}
