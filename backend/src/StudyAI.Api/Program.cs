using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using StudyAI.Models;
using StudyAI.Data;
using StudyAI.Common.Authorization;
using StudyAI.Common.Exceptions;
using StudyAI.Common.Security;
using StudyAI.Common.Utilities;
using StudyAI.Common.Middleware;
using StudyAI.Features.Auth;
using StudyAI.Features.Public;
using StudyAI.Features.Content;
using StudyAI.Features.Teacher;
using StudyAI.Features.Student;
using StudyAI.Features.Admin;
using StudyAI.Features.AI;

var builder = WebApplication.CreateBuilder(args);

// Configuration
var configuration = builder.Configuration;
var connectionString = configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;TrustServerCertificate=True";

// 1. Database Context
builder.Services.AddDbContext<StudyAIDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
    });
    options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

builder.Services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<StudyAIDbContext>());
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// 2. Security & Token Services
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

// Common Foundation Services (Modular Monolith)
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<IIdGenerator, IdGenerator>();
builder.Services.AddScoped<IAuditWriter, AuditWriter>();
builder.Services.AddScoped<ISubjectGradeResolver, SubjectGradeResolver>();

// Auth & Public Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IHealthService, HealthService>();

// Admin Services
builder.Services.AddScoped<IAdminDashboardService, AdminDashboardService>();
builder.Services.AddScoped<IAdminUsersService, AdminUsersService>();
builder.Services.AddScoped<IAdminTeachersService, AdminTeachersService>();
builder.Services.AddScoped<IAdminAuditService, AdminAuditService>();
builder.Services.AddScoped<IAdminAnnouncementsService, AdminAnnouncementsService>();
builder.Services.AddScoped<IAdminSettingsService, AdminSettingsService>();
builder.Services.AddScoped<IAdminOperationsService, AdminOperationsService>();
builder.Services.AddScoped<IAdminSystemService, AdminSystemService>();
builder.Services.AddScoped<ISystemHealthService, SystemHealthService>();
builder.Services.AddScoped<IAiCostOptimizationService, AiCostOptimizationService>();
builder.Services.AddScoped<IAiQualityEvaluationService, AiQualityEvaluationService>();
builder.Services.AddScoped<IContentQualityMonitoringService, ContentQualityMonitoringService>();
builder.Services.AddScoped<ILearningDataConsistencyService, LearningDataConsistencyService>();

// Content Services
builder.Services.AddScoped<IContentSubjectsService, ContentSubjectsService>();
builder.Services.AddScoped<IContentChaptersService, ContentChaptersService>();
builder.Services.AddScoped<IContentTopicsService, ContentTopicsService>();
builder.Services.AddScoped<IContentVideosService, ContentVideosService>();
builder.Services.AddScoped<IContentLessonsService, ContentLessonsService>();
builder.Services.AddScoped<IContentQuestionsService, ContentQuestionsService>();
builder.Services.AddScoped<IContentAssessmentsService, ContentAssessmentsService>();
builder.Services.AddScoped<IContentReviewService, ContentReviewService>();
builder.Services.AddScoped<IContentImportService, ContentImportService>();
builder.Services.AddScoped<IContentGovernanceService, ContentGovernanceService>();
builder.Services.AddScoped<ICurriculumImportParser, CurriculumImportParser>();
builder.Services.AddScoped<ICurriculumImportValidator, CurriculumImportValidator>();
builder.Services.AddScoped<ICurriculumImportConfirmService, CurriculumImportConfirmService>();
builder.Services.AddScoped<IQuestionQualityService, QuestionQualityService>();
builder.Services.AddHttpClient<IVideoVerificationService, VideoVerificationService>();

// Student Services (Modular Monolith with backward compatibility)
builder.Services.AddScoped<StudentCurriculumService>();
builder.Services.AddScoped<IStudentCurriculumService>(sp => sp.GetRequiredService<StudentCurriculumService>());
builder.Services.AddScoped<ILearnerCurriculumService>(sp => sp.GetRequiredService<StudentCurriculumService>());

builder.Services.AddScoped<StudentProgressService>();
builder.Services.AddScoped<IStudentProgressService>(sp => sp.GetRequiredService<StudentProgressService>());
builder.Services.AddScoped<ILearnerProgressService>(sp => sp.GetRequiredService<StudentProgressService>());

builder.Services.AddScoped<StudentAssessmentService>();
builder.Services.AddScoped<IStudentAssessmentService>(sp => sp.GetRequiredService<StudentAssessmentService>());
builder.Services.AddScoped<ILearnerAssessmentService>(sp => sp.GetRequiredService<StudentAssessmentService>());

builder.Services.AddScoped<StudentEventsService>();
builder.Services.AddScoped<IStudentEventsService>(sp => sp.GetRequiredService<StudentEventsService>());
builder.Services.AddScoped<ILearnerEventsService>(sp => sp.GetRequiredService<StudentEventsService>());

builder.Services.AddScoped<StudentProfileService>();
builder.Services.AddScoped<IStudentProfileService>(sp => sp.GetRequiredService<StudentProfileService>());
builder.Services.AddScoped<ILearnerProfileService>(sp => sp.GetRequiredService<StudentProfileService>());
builder.Services.AddScoped<IStudentNotesService, StudentNotesService>();

builder.Services.AddScoped<StudentPracticeService>();
builder.Services.AddScoped<IStudentPracticeService>(sp => sp.GetRequiredService<StudentPracticeService>());
builder.Services.AddScoped<ILearnerPracticeService>(sp => sp.GetRequiredService<StudentPracticeService>());
builder.Services.AddScoped<IStudentMasteryService, StudentMasteryService>();
builder.Services.AddScoped<IExamBlueprintService, ExamBlueprintService>();
builder.Services.AddScoped<IRevisionPlannerService, RevisionPlannerService>();
builder.Services.AddScoped<ISpacedRepetitionService, SpacedRepetitionService>();
builder.Services.AddScoped<ILearningAnalyticsService, LearningAnalyticsService>();
builder.Services.AddScoped<ILearningRecommendationService, LearningRecommendationService>();
builder.Services.AddScoped<IIntelligentExamService, IntelligentExamService>();
builder.Services.AddScoped<IExamReadinessService, ExamReadinessService>();

// Teacher Services
builder.Services.AddScoped<ITeacherClassroomsService, TeacherClassroomsService>();
builder.Services.AddScoped<ITeacherStudentsService, TeacherStudentsService>();
builder.Services.AddScoped<ITeacherAssignmentsService, TeacherAssignmentsService>();
builder.Services.AddScoped<ITeacherSubmissionsService, TeacherSubmissionsService>();
builder.Services.AddScoped<ITeacherAnalyticsService, TeacherAnalyticsService>();
builder.Services.AddScoped<ITeacherManagementService, TeacherManagementService>();
builder.Services.AddScoped<ITeachingRecommendationService, TeachingRecommendationService>();

// AI Tutor Services
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<OpenAiLlmProvider>(client =>
{
    client.Timeout = Timeout.InfiniteTimeSpan;
});
var llmProviderConfig = (configuration["Llm:Provider"] ?? configuration["Llm:ProviderName"])?.Trim().ToLowerInvariant();
var llmApiKey = configuration["Llm:ApiKey"] ?? Environment.GetEnvironmentVariable("STUDY_AI_LLM_API_KEY");
var allowDemoInProduction = configuration.GetValue<bool>("Llm:AllowDemoInProduction", false);

if (builder.Environment.IsProduction())
{
    if (llmProviderConfig is "openai" or "gemini" or "custom")
    {
        if (string.IsNullOrWhiteSpace(llmApiKey))
        {
            throw new InvalidOperationException(
                $"FATAL: LLM provider is explicitly configured as '{llmProviderConfig}' in production but 'Llm:ApiKey' (or STUDY_AI_LLM_API_KEY) is missing or empty.");
        }
        builder.Services.AddScoped<ILlmProvider>(sp => sp.GetRequiredService<OpenAiLlmProvider>());
    }
    else if (llmProviderConfig == "fake")
    {
        if (!allowDemoInProduction)
        {
            throw new InvalidOperationException(
                "FATAL: Fake LLM provider is strictly forbidden in production unless explicitly authorized via 'Llm:AllowDemoInProduction=true'.");
        }
        builder.Services.AddScoped<ILlmProvider, FakeLlmProvider>();
    }
    else
    {
        builder.Services.AddScoped<ILlmProvider, UnconfiguredLlmProvider>();
    }
}
else
{
    if (llmProviderConfig is "openai" or "gemini" or "custom" || (!string.IsNullOrWhiteSpace(llmApiKey) && llmProviderConfig != "fake" && llmProviderConfig != "none"))
    {
        if (string.IsNullOrWhiteSpace(llmApiKey))
        {
            builder.Services.AddScoped<ILlmProvider, UnconfiguredLlmProvider>();
        }
        else
        {
            builder.Services.AddScoped<ILlmProvider>(sp => sp.GetRequiredService<OpenAiLlmProvider>());
        }
    }
    else if (llmProviderConfig is "none" or "unconfigured")
    {
        builder.Services.AddScoped<ILlmProvider, UnconfiguredLlmProvider>();
    }
    else
    {
        builder.Services.AddScoped<ILlmProvider, FakeLlmProvider>();
    }
}

builder.Services.AddScoped<IAiModelRouter, AiModelRouter>();
builder.Services.AddScoped<IAiTutorService, AiTutorService>();
builder.Services.AddScoped<IAiUsageService, AiUsageService>();
builder.Services.AddScoped<IAiHintService, AiHintService>();
builder.Services.AddScoped<IAiAnalysisService, AiAnalysisService>();
builder.Services.AddScoped<IAiLessonAuthoringService, AiLessonAuthoringService>();

// 3. JWT Secret Validation & Authentication
var jwtSecret = configuration["Jwt:SecretKey"]
    ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
    ?? Environment.GetEnvironmentVariable("Jwt__SecretKey");

if (builder.Environment.IsProduction())
{
    if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
    {
        throw new InvalidOperationException("FATAL: In production, Jwt:SecretKey must be securely configured via environment variable (JWT_SECRET_KEY) or secret manager with at least 32 characters.");
    }

    var weakPatterns = new[] { "development", "change_in_production", "test", "demo", "placeholder", "secret_key_minimum_32_characters", "study_ai_development", "123456" };
    if (weakPatterns.Any(p => jwtSecret.Contains(p, StringComparison.OrdinalIgnoreCase)))
    {
        throw new InvalidOperationException("FATAL: Insecure default or placeholder Jwt:SecretKey cannot be used in a production environment!");
    }
}
else
{
    if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
    {
        throw new InvalidOperationException("FATAL: Jwt:SecretKey must be configured with at least 32 characters.");
    }
}

builder.Configuration["Jwt:SecretKey"] = jwtSecret;

var key = Encoding.UTF8.GetBytes(jwtSecret);
var issuer = configuration["Jwt:Issuer"] ?? JwtTokenService.DefaultIssuer;
var audience = configuration["Jwt:Audience"] ?? JwtTokenService.DefaultAudience;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = builder.Environment.IsProduction();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = issuer,
        ValidateAudience = true,
        ValidAudience = audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30)
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var tokenType = context.Principal?.FindFirst("type")?.Value;
            if (tokenType != "access")
            {
                context.Fail("Token type is invalid for API access.");
                return;
            }

            var userId = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? context.Principal?.FindFirst("sub")?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                var db = context.HttpContext.RequestServices.GetRequiredService<StudyAIDbContext>();
                var user = await db.Users.FindAsync(userId);
                if (user == null || user.Status is "suspended" or "disabled")
                {
                    context.Fail("Tài khoản đã bị vô hiệu hóa hoặc không tồn tại trên hệ thống.");
                }
            }
        }
    };
});

// 4. Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
    options.AddPolicy("StaffOnly", policy => policy.RequireRole("admin", "teacher", "content"));
    options.AddPolicy("ContentStaff", policy => policy.RequireRole("admin", "content"));
    options.AddPolicy("ContentAdminOnly", policy => policy.RequireRole("admin", "content_admin", "content"));
    options.AddPolicy("ContentAuthor", policy => policy.RequireRole("admin", "content_admin", "content", "content_creator", "author"));
    options.AddPolicy("ContentReviewer", policy => policy.RequireAssertion(ctx =>
        ctx.User.IsInRole("admin") ||
        ctx.User.IsInRole("content_admin") ||
        ctx.User.IsInRole("content") ||
        ctx.User.HasClaim("permission", "content.approve")));
    options.AddPolicy("ContentPublisher", policy => policy.RequireAssertion(ctx =>
        ctx.User.IsInRole("admin") ||
        ctx.User.IsInRole("content_admin") ||
        ctx.User.HasClaim("permission", "content.publish")));
});

// 5. CORS
var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[]
{
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
};

builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(origin =>
            {
                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return uri.Host is "localhost" or "127.0.0.1";
                }
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// 6. Controllers & JSON Options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never;
    });

// 7. OpenAPI & Swagger Documentation
builder.Services.AddOpenApi("v1", options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "STUDY_AI Intelligent Learning Platform API",
            Version = "v1",
            Description = "Hệ thống API nền tảng học tập thông minh STUDY_AI theo chuẩn GDPT 2018 (Ngân hàng câu hỏi VNHSGE, Lộ trình thích ứng, AI Tutor, Lớp học & Bài tập)",
            Contact = new OpenApiContact
            {
                Name = "STUDY_AI Engineering Team",
                Email = "engineering@studyai.internal"
            }
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        var scheme = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Nhập JWT Access Token để xác thực các API phân quyền. Định dạng: {token} (không cần gõ tiền tố Bearer)",
            In = ParameterLocation.Header,
            Name = "Authorization"
        };
        document.Components.SecuritySchemes["Bearer"] = scheme;

        var schemeRef = new OpenApiSecuritySchemeReference("Bearer", document);
        var securityRequirement = new OpenApiSecurityRequirement
        {
            { schemeRef, new List<string>() }
        };
        document.Security ??= new List<OpenApiSecurityRequirement>();
        document.Security.Add(securityRequirement);

        return Task.CompletedTask;
    });
});

var app = builder.Build();

// CLI Export Endpoint Inventory Support: --export-endpoint-inventory [output-path]
if (args.Contains("--export-endpoint-inventory"))
{
    var outputPath = "docs/audit/endpoint_inventory.md";
    for (int i = 0; i < args.Length; i++)
    {
        if (args[i].Equals("--export-endpoint-inventory", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length && !args[i + 1].StartsWith("--"))
        {
            outputPath = args[i + 1];
        }
    }

    var provider = app.Services.GetRequiredService<Microsoft.AspNetCore.Mvc.Infrastructure.IActionDescriptorCollectionProvider>();
    var actionDescriptors = provider.ActionDescriptors.Items
        .OfType<Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor>()
        .OrderBy(a => a.ControllerTypeInfo.Namespace)
        .ThenBy(a => a.ControllerName)
        .ThenBy(a => a.AttributeRouteInfo?.Template)
        .ToList();

    var sb = new StringBuilder();
    sb.AppendLine("# Endpoint Inventory (Generated automatically from ASP.NET Core ActionDescriptors)");
    sb.AppendLine();
    sb.AppendLine($"Total registered action descriptors: **{actionDescriptors.Count}**");
    sb.AppendLine();
    sb.AppendLine("| # | Module | Controller | Action | Method | Route Template | Auth |");
    sb.AppendLine("|---|---|---|---|---|---|---|");

    int index = 1;
    foreach (var action in actionDescriptors)
    {
        var module = action.ControllerTypeInfo.Namespace?.Replace("StudyAI.Features.", "") ?? "Unknown";
        var controller = action.ControllerName;
        var actionName = action.MethodInfo.Name;
        var route = action.AttributeRouteInfo?.Template ?? "(none)";

        var httpMethod = action.ActionConstraints?.OfType<Microsoft.AspNetCore.Mvc.ActionConstraints.HttpMethodActionConstraint>()
            .SelectMany(c => c.HttpMethods)
            .FirstOrDefault() ??
            action.MethodInfo.GetCustomAttributes(true).OfType<Microsoft.AspNetCore.Mvc.Routing.HttpMethodAttribute>().FirstOrDefault()?.HttpMethods.FirstOrDefault() ??
            "ANY";

        var isAllowAnon = action.MethodInfo.GetCustomAttributes(true).OfType<Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute>().Any() ||
                          action.ControllerTypeInfo.GetCustomAttributes(true).OfType<Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute>().Any();
        var authAttr = action.MethodInfo.GetCustomAttributes(true).OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().FirstOrDefault() ??
                       action.ControllerTypeInfo.GetCustomAttributes(true).OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().FirstOrDefault();

        string authInfo = isAllowAnon ? "AllowAnonymous" :
            (authAttr != null ? (string.IsNullOrEmpty(authAttr.Roles) && string.IsNullOrEmpty(authAttr.Policy) ? "Authorize" : $"Auth({authAttr.Roles ?? authAttr.Policy})") : "Implicit");

        sb.AppendLine($"| {index++} | `{module}` | `{controller}` | `{actionName}` | `{httpMethod.ToUpperInvariant()}` | `{route}` | {authInfo} |");
    }

    var fullPath = Path.IsPathRooted(outputPath) ? outputPath : Path.Combine(Directory.GetCurrentDirectory(), outputPath);
    var parentDir = Path.GetDirectoryName(fullPath);
    if (!string.IsNullOrEmpty(parentDir) && !Directory.Exists(parentDir))
    {
        Directory.CreateDirectory(parentDir);
    }

    File.WriteAllText(fullPath, sb.ToString(), Encoding.UTF8);
    Console.WriteLine($"[ENDPOINT INVENTORY] Successfully generated {actionDescriptors.Count} endpoints into: {fullPath}");
    return;
}

// CLI Bootstrap Admin Command Support: --bootstrap-admin
if (args.Contains("--bootstrap-admin"))
{
    if (args.Any(a => a.StartsWith("--admin-password", StringComparison.OrdinalIgnoreCase)))
    {
        Console.Error.WriteLine("SECURITY ERROR: Passing passwords via command-line arguments is forbidden because it exposes credentials in process listings. Use the ADMIN_BOOTSTRAP_PASSWORD environment variable or enter it securely via the interactive console prompt.");
        Environment.Exit(1);
    }

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

    string? adminEmail = Environment.GetEnvironmentVariable("ADMIN_BOOTSTRAP_EMAIL");
    for (int i = 0; i < args.Length; i++)
    {
        if (args[i].Equals("--admin-email", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
        {
            adminEmail = args[i + 1];
        }
    }

    if (string.IsNullOrWhiteSpace(adminEmail) && !Console.IsInputRedirected)
    {
        Console.Write("Enter admin email: ");
        adminEmail = Console.ReadLine();
    }

    string? adminPass = Environment.GetEnvironmentVariable("ADMIN_BOOTSTRAP_PASSWORD");
    if (string.IsNullOrWhiteSpace(adminPass) && !Console.IsInputRedirected)
    {
        Console.Write("Enter admin password (min 10 chars, upper, lower, digit): ");
        adminPass = ReadMaskedPassword();
    }

    if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPass))
    {
        Console.Error.WriteLine("ERROR: Admin email or password missing. Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD environment variables, or enter them when prompted.");
        Environment.Exit(1);
    }

    var result = await DbInitializer.BootstrapAdminAsync(db, hasher, adminEmail, adminPass);
    if (result.Created)
    {
        Console.WriteLine($"SUCCESS: {result.Message}");
        Environment.Exit(0);
    }
    else
    {
        Console.WriteLine($"INFO: {result.Message}");
        Environment.Exit(result.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase) ? 0 : 1);
    }
}

// Database Migration & Reference Data Initialization (Fail-Fast on error)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var resolvedConfiguration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var activeConn = resolvedConfiguration.GetConnectionString("DefaultConnection") ?? connectionString;

        var applyMigrationsDefault = !app.Environment.IsProduction();
        var shouldMigrate = resolvedConfiguration.GetValue<bool>("Database:ApplyMigrationsOnStartup", applyMigrationsDefault);
        var shouldSeed = resolvedConfiguration.GetValue<bool>("Database:SeedReferenceData", applyMigrationsDefault);

        if (app.Environment.IsDevelopment() || shouldMigrate || shouldSeed || DatabaseSafetyGuard.IsTestExecutionContext)
        {
            DatabaseSafetyGuard.EnsureSafeDatabaseForDevelopmentOrMigration(
                activeConn,
                app.Environment.EnvironmentName,
                "Program.cs Startup Migration/Seed Guard");
        }

        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        if (shouldMigrate)
        {
            await db.Database.MigrateAsync();
        }

        var seedReferenceDefault = !app.Environment.IsProduction();
        if (shouldSeed)
        {
            await DbInitializer.SeedReferenceDataAsync(db);
        }
        if (app.Environment.IsDevelopment())
        {
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
            await DbInitializer.BootstrapAdminAsync(db, hasher, "admin@studyai.internal", "Admin@123456", "Integration Test Admin");
            await DbInitializer.BootstrapLearnerAsync(db, hasher, "learner@studyai.internal", "Learner@123456", "Integration Test Learner", "12");
            await DbInitializer.BootstrapStaffAsync(db, hasher, "content@studyai.internal", "Content@123456", "content", "Biên tập viên Nội dung");
            await DbInitializer.BootstrapStaffAsync(db, hasher, "content2@studyai.internal", "Content2@123456", "content", "Kiểm duyệt viên Nội dung");
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogCritical(ex, "FATAL: Database migration or reference seeding failed. Terminating host startup.");
        Console.Error.WriteLine($"FATAL: Database initialization failed: {ex.Message}");
        Environment.Exit(1);
    }
}

// HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "STUDY_AI API v1");
        options.RoutePrefix = "swagger";
        options.DocumentTitle = "STUDY_AI API Documentation & Explorer";
        options.DisplayRequestDuration();
        options.EnablePersistAuthorization();
        options.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    });
}
else
{
    app.UseHsts();
}

app.UseCors("DefaultCorsPolicy");

app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static string ReadMaskedPassword()
{
    var sb = new StringBuilder();
    while (true)
    {
        var key = Console.ReadKey(intercept: true);
        if (key.Key == ConsoleKey.Enter)
        {
            Console.WriteLine();
            break;
        }
        if (key.Key == ConsoleKey.Backspace && sb.Length > 0)
        {
            sb.Remove(sb.Length - 1, 1);
            Console.Write("\b \b");
        }
        else if (!char.IsControl(key.KeyChar))
        {
            sb.Append(key.KeyChar);
            Console.Write("*");
        }
    }
    return sb.ToString();
}

public partial class Program { }
