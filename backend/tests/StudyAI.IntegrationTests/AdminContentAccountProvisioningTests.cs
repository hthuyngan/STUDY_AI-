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

[Collection("IntegrationTests")]
public class AdminContentAccountProvisioningTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;
    private readonly StudyAIApiFixture _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    // Standard credential handling: passwords provided by project owner securely
    private readonly string _adminPassword = Environment.GetEnvironmentVariable("ADMIN_PROVISION_PASSWORD") ?? "admin";
    private readonly string _contentPassword = Environment.GetEnvironmentVariable("CONTENT_PROVISION_PASSWORD") ?? "content";

    public AdminContentAccountProvisioningTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task EnsureProvisionedAccountsExistAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        // 1. Provision admin@gmail.com on StudyAIDb_E2E if not present
        var admin = await db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == "ADMIN@GMAIL.COM");
        if (admin == null)
        {
            admin = new User
            {
                Id = $"usr_adm_{Guid.NewGuid():N}"[..16],
                Email = "admin@gmail.com",
                EmailNormalized = "ADMIN@GMAIL.COM",
                PasswordHash = passwordHasher.HashPassword(_adminPassword),
                DisplayName = "Quản trị viên Hệ thống",
                Role = "admin",
                Status = "active",
                IsDeleted = false,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Users.Add(admin);
        }
        else
        {
            admin.Role = "admin";
            admin.Status = "active";
            admin.IsDeleted = false;
            admin.PasswordHash = passwordHasher.HashPassword(_adminPassword);
        }

        // 2. Provision content@gmail.com on StudyAIDb_E2E if not present
        var content = await db.Users.FirstOrDefaultAsync(u => u.EmailNormalized == "CONTENT@GMAIL.COM");
        if (content == null)
        {
            content = new User
            {
                Id = $"usr_cnt_{Guid.NewGuid():N}"[..16],
                Email = "content@gmail.com",
                EmailNormalized = "CONTENT@GMAIL.COM",
                PasswordHash = passwordHasher.HashPassword(_contentPassword),
                DisplayName = "Biên tập viên Chuyên môn (Content)",
                Role = "content",
                Status = "active",
                IsDeleted = false,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Users.Add(content);
        }
        else
        {
            content.Role = "content";
            content.Status = "active";
            content.IsDeleted = false;
            content.PasswordHash = passwordHasher.HashPassword(_contentPassword);
        }

        await db.SaveChangesAsync();
    }

    private async Task<string> LoginAsync(string email, string password)
    {
        var loginPayload = new StringContent(
            JsonSerializer.Serialize(new UserLoginRequestDto
            {
                Email = email,
                Password = password
            }),
            Encoding.UTF8,
            "application/json");

        var resp = await _client.PostAsync("/api/v1/auth/login", loginPayload);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("accessToken").GetString()!;
    }

    [Fact]
    public async Task Provisioning_AdminAndContentAccounts_AuthenticateSuccessfullyWithExpectedRoles()
    {
        await EnsureProvisionedAccountsExistAsync();

        // 1. Authenticate Admin
        var adminToken = await LoginAsync("admin@gmail.com", _adminPassword);
        Assert.False(string.IsNullOrWhiteSpace(adminToken));

        // Admin can access admin dashboard
        using var adminReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/dashboard");
        adminReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var adminResp = await _client.SendAsync(adminReq);
        Assert.Equal(HttpStatusCode.OK, adminResp.StatusCode);

        // 2. Authenticate Content
        var contentToken = await LoginAsync("content@gmail.com", _contentPassword);
        Assert.False(string.IsNullOrWhiteSpace(contentToken));

        // Content can access content subjects
        using var contentReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/content/subjects");
        contentReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var contentResp = await _client.SendAsync(contentReq);
        Assert.Equal(HttpStatusCode.OK, contentResp.StatusCode);
    }

    [Fact]
    public async Task ContentRole_IsFinalApprover_CanApprovePublishUnpublishWithoutAdminApproval()
    {
        await EnsureProvisionedAccountsExistAsync();
        var contentToken = await LoginAsync("content@gmail.com", _contentPassword);

        // Seed a test lesson in draft status
        string lessonId = $"les_test_{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var contentUser = await db.Users.FirstAsync(u => u.EmailNormalized == "CONTENT@GMAIL.COM");
            var sub = await db.ContentSubjects.Include(s => s.Chapters).FirstOrDefaultAsync();
            Assert.NotNull(sub);
            var ch = sub.Chapters.FirstOrDefault();
            Assert.NotNull(ch);

            var lesson = new ContentLesson
            {
                Id = lessonId,
                ChapterId = ch.Id,
                Title = "Bài học thử nghiệm phân quyền Content",
                Slug = $"bai-hoc-thu-nghiem-{Guid.NewGuid():N}",
                Status = "draft",
                AuthorId = contentUser.Id,
                Introduction = "Giới thiệu bài học kiểm thử quyền Content",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.ContentLessons.Add(lesson);
            await db.SaveChangesAsync();
        }

        // Content role can directly approve and publish the lesson
        using var approveReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/approve");
        approveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var approveResp = await _client.SendAsync(approveReq);
        Assert.Equal(HttpStatusCode.OK, approveResp.StatusCode);

        var approvedJson = await approveResp.Content.ReadAsStringAsync();
        using var approvedDoc = JsonDocument.Parse(approvedJson);
        Assert.Equal("published", approvedDoc.RootElement.GetProperty("status").GetString());

        // Content role can unpublish the lesson
        using var unpublishReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/unpublish");
        unpublishReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var unpublishResp = await _client.SendAsync(unpublishReq);
        Assert.Equal(HttpStatusCode.OK, unpublishResp.StatusCode);

        var unpublishedJson = await unpublishResp.Content.ReadAsStringAsync();
        using var unpubDoc = JsonDocument.Parse(unpublishedJson);
        Assert.Equal("draft", unpubDoc.RootElement.GetProperty("status").GetString());

        // Content role can publish via dedicated endpoint
        using var publishReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/publish");
        publishReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var publishResp = await _client.SendAsync(publishReq);
        Assert.Equal(HttpStatusCode.OK, publishResp.StatusCode);

        // Content role can reject / request changes
        using var rejectReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/reject");
        rejectReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var rejectResp = await _client.SendAsync(rejectReq);
        Assert.Equal(HttpStatusCode.OK, rejectResp.StatusCode);
    }

    [Fact]
    public async Task ContentRole_CannotAccessAdminUserManagement_Returns403Forbidden()
    {
        await EnsureProvisionedAccountsExistAsync();
        var contentToken = await LoginAsync("content@gmail.com", _contentPassword);

        // Content cannot list users in Admin
        using var listUsersReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/users");
        listUsersReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var listUsersResp = await _client.SendAsync(listUsersReq);
        Assert.Equal(HttpStatusCode.Forbidden, listUsersResp.StatusCode);

        // Content cannot view admin dashboard
        using var dashboardReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/dashboard");
        dashboardReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var dashboardResp = await _client.SendAsync(dashboardReq);
        Assert.Equal(HttpStatusCode.Forbidden, dashboardResp.StatusCode);

        // Content cannot create new users
        using var createUserReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/users")
        {
            Content = new StringContent(JsonSerializer.Serialize(new CreateUserRequestDto
            {
                Email = "elevate@gmail.com",
                DisplayName = "Elevate Attempt",
                Role = "admin"
            }), Encoding.UTF8, "application/json")
        };
        createUserReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var createUserResp = await _client.SendAsync(createUserReq);
        Assert.Equal(HttpStatusCode.Forbidden, createUserResp.StatusCode);
    }

    [Fact]
    public async Task TeacherAndLearner_CannotAccessContentApproval_Returns403Forbidden()
    {
        // 1. Create teacher account
        string teacherEmail = $"teacher_{Guid.NewGuid():N}@studyai.internal";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
            db.Users.Add(new User
            {
                Id = $"usr_tch_{Guid.NewGuid():N}"[..16],
                Email = teacherEmail,
                EmailNormalized = teacherEmail.ToUpperInvariant(),
                PasswordHash = passwordHasher.HashPassword("Teacher@123"),
                DisplayName = "Giáo viên",
                Role = "teacher",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var teacherToken = await LoginAsync(teacherEmail, "Teacher@123");

        // Teacher cannot approve content
        using var approveReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/lessons/any-id/approve");
        approveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var approveResp = await _client.SendAsync(approveReq);
        Assert.Equal(HttpStatusCode.Forbidden, approveResp.StatusCode);

        // Teacher cannot access curriculum import
        using var importReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/import/preview");
        importReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teacherToken);
        var importResp = await _client.SendAsync(importReq);
        Assert.Equal(HttpStatusCode.Forbidden, importResp.StatusCode);
    }

    [Fact]
    public async Task ContentApproval_CannotBypassVnhsgeCopyrightGate_Returns403Forbidden()
    {
        await EnsureProvisionedAccountsExistAsync();
        var contentToken = await LoginAsync("content@gmail.com", _contentPassword);

        // Seed a VNHSGE lesson
        string lessonId = $"les_vnh_{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var contentUser = await db.Users.FirstAsync(u => u.EmailNormalized == "CONTENT@GMAIL.COM");
            var sub = await db.ContentSubjects.Include(s => s.Chapters).FirstOrDefaultAsync();
            var ch = sub!.Chapters.First();

            var lesson = new ContentLesson
            {
                Id = lessonId,
                ChapterId = ch.Id,
                Title = "Đề thi thử tốt nghiệp THPT VNHSGE 2023",
                Slug = $"vnhsge-exam-{Guid.NewGuid():N}",
                Status = "draft",
                AuthorId = contentUser.Id,
                Introduction = "Dữ liệu khảo cứu VNHSGE (arXiv:2305.12199)",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.ContentLessons.Add(lesson);
            await db.SaveChangesAsync();
        }

        // Attempting to publish VNHSGE content without rights must be rejected by backend
        using var publishReq = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/lessons/{lessonId}/publish");
        publishReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", contentToken);
        var publishResp = await _client.SendAsync(publishReq);

        Assert.Equal(HttpStatusCode.Forbidden, publishResp.StatusCode);
        var errorBody = await publishResp.Content.ReadAsStringAsync();
        Assert.Contains("VNHSGE", errorBody);
        Assert.Contains("khóa bản quyền học thuật", errorBody);
    }

    [Fact]
    public async Task UnauthenticatedAccess_Returns401Unauthorized()
    {
        // Unauthenticated call to content
        using var contentReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/content/subjects");
        var contentResp = await _client.SendAsync(contentReq);
        Assert.Equal(HttpStatusCode.Unauthorized, contentResp.StatusCode);

        // Unauthenticated call to admin
        using var adminReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/dashboard");
        var adminResp = await _client.SendAsync(adminReq);
        Assert.Equal(HttpStatusCode.Unauthorized, adminResp.StatusCode);
    }
}
