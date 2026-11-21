using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using StudyAI.Api.Controllers;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;
using Xunit;

namespace StudyAI.UnitTests;

public class TeacherManagementAlertsAndAcademicTests
{
    private (StudyAIDbContext Context, TeacherManagementController Controller, ClassroomsController ClassroomsController)
        CreateContextAndControllers(string teacherId = "usr_teacher_A", string role = "teacher")
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase(databaseName: $"StudyAI_TeacherMgmt_Test_{Guid.NewGuid():N}")
            .Options;

        var context = new StudyAIDbContext(options);

        // Seed teachers
        var teacherA = new User { Id = "usr_teacher_A", Email = "teachera@studyai.edu.vn", DisplayName = "Thầy A", Role = "teacher", PasswordHash = "h" };
        var teacherB = new User { Id = "usr_teacher_B", Email = "teacherb@studyai.edu.vn", DisplayName = "Thầy B", Role = "teacher", PasswordHash = "h" };
        var student1 = new User { Id = "usr_student_1", Email = "student1@studyai.edu.vn", DisplayName = "Học sinh 1", Role = "student", PasswordHash = "h" };
        var student2 = new User { Id = "usr_student_2", Email = "student2@studyai.edu.vn", DisplayName = "Học sinh 2", Role = "student", PasswordHash = "h" };

        context.Users.AddRange(teacherA, teacherB, student1, student2);

        // Classrooms
        var classA = new Classroom
        {
            Id = "cls_A",
            Name = "Lớp 10A",
            Grade = "10",
            TeacherId = "usr_teacher_A",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var classB = new Classroom
        {
            Id = "cls_B",
            Name = "Lớp 11B",
            Grade = "11",
            TeacherId = "usr_teacher_B",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        context.Classrooms.AddRange(classA, classB);

        // ClassroomStudents
        context.ClassroomStudents.Add(new ClassroomStudent
        {
            Id = "cs_1",
            ClassroomId = "cls_A",
            StudentId = "usr_student_1",
            EnrolledAt = DateTimeOffset.UtcNow
        });
        context.ClassroomStudents.Add(new ClassroomStudent
        {
            Id = "cs_2",
            ClassroomId = "cls_B",
            StudentId = "usr_student_2",
            EnrolledAt = DateTimeOffset.UtcNow
        });

        // Seed genuine lesson progress for student1
        context.LessonProgresses.Add(new LessonProgress
        {
            Id = 1,
            UserId = "usr_student_1",
            LessonId = "les_m10_b1",
            SubjectId = "sub_math10",
            OverallProgress = 85,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        // Seed genuine attempt for student1 with low score (triggering alert)
        context.AssessmentAttempts.Add(new AssessmentAttempt
        {
            Id = "att_low_1",
            UserId = "usr_student_1",
            AssessmentId = "asmt_quiz_1",
            SubjectId = "sub_math10",
            ScoreScaled = 4.0,
            CompletedAt = DateTimeOffset.UtcNow
        });

        // Seed topic mastery
        context.StudentTopicMasteries.Add(new StudentTopicMastery
        {
            Id = "mst_1",
            UserId = "usr_student_1",
            SubjectId = "sub_math10",
            TopicName = "Mệnh đề logic",
            MasteryScore = 45.0,
            LastAttemptAt = DateTimeOffset.UtcNow
        });

        context.SaveChanges();

        var teacherController = new TeacherManagementController(
            null!,
            null!,
            context,
            NullLogger<TeacherManagementController>.Instance);

        var classroomsController = new ClassroomsController(
            context,
            NullLogger<ClassroomsController>.Instance);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, teacherId),
            new Claim("sub", teacherId),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        teacherController.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
        classroomsController.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        return (context, teacherController, classroomsController);
    }

    [Fact]
    public async Task GetAlerts_ReturnsAlertsForTeacherClassroomStudents()
    {
        var (_, controller, _) = CreateContextAndControllers(teacherId: "usr_teacher_A");

        var result = await controller.GetAlerts(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var alerts = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okResult.Value);
        Assert.NotEmpty(alerts);
    }

    [Fact]
    public async Task GetStudentAcademicDetail_ForTeacherEnrolledStudent_ReturnsAuthenticData()
    {
        var (_, controller, _) = CreateContextAndControllers(teacherId: "usr_teacher_A");

        var result = await controller.GetStudentAcademicDetail("usr_student_1", CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetStudentAcademicDetail_ForNonEnrolledStudent_ReturnsForbidden()
    {
        // Teacher A attempts to view student 2 (enrolled in Teacher B's class)
        var (_, controller, _) = CreateContextAndControllers(teacherId: "usr_teacher_A");

        var result = await controller.GetStudentAcademicDetail("usr_student_2", CancellationToken.None);

        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, objResult.StatusCode);
    }

    [Fact]
    public async Task GetStudentAcademicDetail_WithNoHistory_ReturnsHonestEmptyCollections()
    {
        // Student 2 has no progress/attempts yet. Teacher B views Student 2.
        var (_, controller, _) = CreateContextAndControllers(teacherId: "usr_teacher_B");

        var result = await controller.GetStudentAcademicDetail("usr_student_2", CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
        var node = System.Text.Json.Nodes.JsonNode.Parse(json);
        Assert.NotNull(node);
        Assert.Empty(node["recentLessons"]!.AsArray());
        Assert.Empty(node["assessmentAttempts"]!.AsArray());
        Assert.Empty(node["weakAreas"]!.AsArray());
    }

    [Fact]
    public async Task ClassActivities_AddAndGet_PersistsRealAuditLog()
    {
        var (_, _, classroomsController) = CreateContextAndControllers(teacherId: "usr_teacher_A");

        var payload = new JsonObject
        {
            ["action"] = "exam_assigned",
            ["detail"] = "Giao bài kiểm tra 15 phút"
        };

        var addResult = await classroomsController.AddClassActivity("cls_A", payload, CancellationToken.None);
        Assert.IsType<OkObjectResult>(addResult);

        var getResult = await classroomsController.GetClassActivities("cls_A", CancellationToken.None);
        var okGet = Assert.IsType<OkObjectResult>(getResult);
        var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okGet.Value);
        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task UpdateAlert_PersistsResolvedStatus_AcrossSubsequentQueries()
    {
        var (context, controller, _) = CreateContextAndControllers(teacherId: "usr_teacher_A");

        // 1. Get alerts (this populates and persists ClassroomAlerts from low score attempts)
        var initialResult = await controller.GetAlerts(CancellationToken.None);
        var initialOk = Assert.IsType<OkObjectResult>(initialResult);
        var initialAlerts = Assert.IsAssignableFrom<System.Collections.IEnumerable>(initialOk.Value);
        Assert.NotEmpty(initialAlerts);

        var firstAlertId = "alt_asmt_att_low_1";

        // 2. Resolve alert
        var updatePayload = new JsonObject
        {
            ["status"] = "resolved",
            ["resolutionNote"] = "Đã hướng dẫn lại kiến thức"
        };
        var updateResult = await controller.UpdateAlert(firstAlertId, updatePayload, CancellationToken.None);
        Assert.IsType<OkObjectResult>(updateResult);

        // 3. Query again (simulating reload)
        var reloadResult = await controller.GetAlerts(CancellationToken.None);
        var reloadOk = Assert.IsType<OkObjectResult>(reloadResult);
        var json = System.Text.Json.JsonSerializer.Serialize(reloadOk.Value);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var array = doc.RootElement.EnumerateArray().ToList();
        var targetAlert = array.FirstOrDefault(a => a.GetProperty("id").GetString() == firstAlertId);
        Assert.True(targetAlert.ValueKind != System.Text.Json.JsonValueKind.Undefined);
        Assert.Equal("resolved", targetAlert.GetProperty("status").GetString());
        Assert.Equal("Đã hướng dẫn lại kiến thức", targetAlert.GetProperty("resolutionNote").GetString());
    }

    [Fact]
    public async Task UpdateAlert_ByDifferentTeacher_Returns403()
    {
        var (context, controllerA, _) = CreateContextAndControllers(teacherId: "usr_teacher_A");
        await controllerA.GetAlerts(CancellationToken.None);

        // Teacher B tries to resolve alert in Teacher A's classroom on the same database
        var controllerB = new TeacherManagementController(
            null!,
            null!,
            context,
            NullLogger<TeacherManagementController>.Instance);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "usr_teacher_B"),
            new Claim("sub", "usr_teacher_B"),
            new Claim(ClaimTypes.Role, "teacher"),
            new Claim("role", "teacher")
        };
        controllerB.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };

        var updatePayload = new JsonObject
        {
            ["status"] = "resolved",
            ["resolutionNote"] = "Unauthorized resolve"
        };

        var result = await controllerB.UpdateAlert("alt_asmt_att_low_1", updatePayload, CancellationToken.None);
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task UpdateAlert_UnknownId_Returns404()
    {
        var (_, controller, _) = CreateContextAndControllers(teacherId: "usr_teacher_A");
        var updatePayload = new JsonObject
        {
            ["status"] = "resolved"
        };

        var result = await controller.UpdateAlert("nonexistent_alert_id", updatePayload, CancellationToken.None);
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task ResolveAllAlerts_ResolvesOnlyTeacherOwnedAlerts()
    {
        var (context, controllerA, _) = CreateContextAndControllers(teacherId: "usr_teacher_A");

        // Seed alert in class B
        context.ClassroomAlerts.Add(new ClassroomAlert
        {
            Id = "alt_class_b_1",
            ClassroomId = "cls_B",
            StudentId = "usr_student_2",
            Type = "low_score",
            Severity = "medium",
            Message = "Alert in class B",
            Status = "new",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await context.SaveChangesAsync();

        // Populate class A alerts
        await controllerA.GetAlerts(CancellationToken.None);

        // Teacher A calls ResolveAllAlerts
        var result = await controllerA.ResolveAllAlerts(CancellationToken.None);
        Assert.IsType<OkObjectResult>(result);

        // Verify Class A alert is resolved
        var classAAlert = await context.ClassroomAlerts.FindAsync("alt_asmt_att_low_1");
        Assert.NotNull(classAAlert);
        Assert.Equal("resolved", classAAlert.Status);

        // Verify Class B alert remains "new"
        var classBAlert = await context.ClassroomAlerts.FindAsync("alt_class_b_1");
        Assert.NotNull(classBAlert);
        Assert.Equal("new", classBAlert.Status);
    }
}
