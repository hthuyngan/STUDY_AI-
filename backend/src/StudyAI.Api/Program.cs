using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using StudyAI.Application.Common.Authorization;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.Services;
using StudyAI.Infrastructure.Authentication;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Security;
using StudyAI.Infrastructure.Services;
using StudyAI.Api.Middleware;

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

// 2. Security & Token Services
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<ICurriculumImportParser, CurriculumImportParser>();
builder.Services.AddScoped<ICurriculumImportValidator, CurriculumImportValidator>();
builder.Services.AddScoped<ICurriculumImportConfirmService, CurriculumImportConfirmService>();

// Common Foundation Services (Role + Feature Architecture)
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<IIdGenerator, IdGenerator>();
builder.Services.AddScoped<IAuditWriter, AuditWriter>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<StudyAI.Application.Features.Public.Auth.IAuthService, StudyAI.Application.Features.Public.Auth.AuthService>();

// Admin Services (Role + Feature Architecture)
builder.Services.AddScoped<StudyAI.Application.Features.Admin.Dashboard.IAdminDashboardService, StudyAI.Application.Features.Admin.Dashboard.AdminDashboardService>();
builder.Services.AddScoped<StudyAI.Application.Features.Admin.Users.IAdminUsersService, StudyAI.Application.Features.Admin.Users.AdminUsersService>();
builder.Services.AddScoped<StudyAI.Application.Features.Admin.Teachers.IAdminTeachersService, StudyAI.Application.Features.Admin.Teachers.AdminTeachersService>();
builder.Services.AddScoped<StudyAI.Application.Features.Admin.AuditLogs.IAdminAuditService, StudyAI.Application.Features.Admin.AuditLogs.AdminAuditService>();
builder.Services.AddScoped<StudyAI.Application.Features.Admin.Announcements.IAdminAnnouncementsService, StudyAI.Application.Features.Admin.Announcements.AdminAnnouncementsService>();
builder.Services.AddScoped<StudyAI.Application.Features.Admin.Settings.IAdminSettingsService, StudyAI.Application.Features.Admin.Settings.AdminSettingsService>();

// 2.1 LLM Provider & AI Tutor Service
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<StudyAI.Infrastructure.Services.OpenAiLlmProvider>(client =>
{
    // The per-request CancellationTokenSource with CancelAfter manages timeouts explicitly
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
        builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILlmProvider>(sp => sp.GetRequiredService<StudyAI.Infrastructure.Services.OpenAiLlmProvider>());
    }
    else if (llmProviderConfig == "fake")
    {
        if (!allowDemoInProduction)
        {
            throw new InvalidOperationException(
                "FATAL: Fake LLM provider is strictly forbidden in production unless explicitly authorized via 'Llm:AllowDemoInProduction=true'.");
        }
        builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILlmProvider, StudyAI.Infrastructure.Services.FakeLlmProvider>();
    }
    else
    {
        // In production, unconfigured or unknown provider fails closed via UnconfiguredLlmProvider without silent fallback
        builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILlmProvider, StudyAI.Infrastructure.Services.UnconfiguredLlmProvider>();
    }
}
else
{
    // Development / Test / Demo environments
    if (llmProviderConfig is "openai" or "gemini" or "custom" || (!string.IsNullOrWhiteSpace(llmApiKey) && llmProviderConfig != "fake" && llmProviderConfig != "none"))
    {
        if (string.IsNullOrWhiteSpace(llmApiKey))
        {
            builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILlmProvider, StudyAI.Infrastructure.Services.UnconfiguredLlmProvider>();
        }
        else
        {
            builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILlmProvider>(sp => sp.GetRequiredService<StudyAI.Infrastructure.Services.OpenAiLlmProvider>());
        }
    }
    else if (llmProviderConfig is "none" or "unconfigured")
    {
        builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILlmProvider, StudyAI.Infrastructure.Services.UnconfiguredLlmProvider>();
    }
    else
    {
        // Default to FakeLlmProvider for local dev and automated testing
        builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILlmProvider, StudyAI.Infrastructure.Services.FakeLlmProvider>();
    }
}

builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IAiModelRouter, StudyAI.Infrastructure.Services.AiModelRouter>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IAiTutorService, StudyAI.Infrastructure.Services.AiTutorService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IAiUsageService, StudyAI.Infrastructure.Services.AiUsageService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IAiHintService, StudyAI.Infrastructure.Services.AiHintService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IAiAnalysisService, StudyAI.Infrastructure.Services.AiAnalysisService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IStudentMasteryService, StudyAI.Infrastructure.Services.StudentMasteryService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILearningRecommendationService, StudyAI.Infrastructure.Services.LearningRecommendationService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILearningAnalyticsService, StudyAI.Infrastructure.Services.LearningAnalyticsService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IExamBlueprintService, StudyAI.Infrastructure.Services.ExamBlueprintService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IIntelligentExamService, StudyAI.Infrastructure.Services.IntelligentExamService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IQuestionQualityService, StudyAI.Infrastructure.Services.QuestionQualityService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ISpacedRepetitionService, StudyAI.Infrastructure.Services.SpacedRepetitionService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IRevisionPlannerService, StudyAI.Infrastructure.Services.RevisionPlannerService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IExamReadinessService, StudyAI.Infrastructure.Services.ExamReadinessService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ITeacherManagementService, StudyAI.Infrastructure.Services.TeacherManagementService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ITeachingRecommendationService, StudyAI.Infrastructure.Services.TeachingRecommendationService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IContentGovernanceService, StudyAI.Infrastructure.Services.ContentGovernanceService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IAiLessonAuthoringService, StudyAI.Infrastructure.Services.AiLessonAuthoringService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ISystemHealthService, StudyAI.Infrastructure.Services.SystemHealthService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IAiQualityEvaluationService, StudyAI.Infrastructure.Services.AiQualityEvaluationService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IAiCostOptimizationService, StudyAI.Infrastructure.Services.AiCostOptimizationService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.IContentQualityMonitoringService, StudyAI.Infrastructure.Services.ContentQualityMonitoringService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ILearningDataConsistencyService, StudyAI.Infrastructure.Services.LearningDataConsistencyService>();
builder.Services.AddScoped<StudyAI.Application.Common.Interfaces.ISubjectGradeResolver, StudyAI.Infrastructure.Services.SubjectGradeResolver>();
builder.Services.AddHttpClient<StudyAI.Application.Common.Interfaces.IVideoVerificationService, StudyAI.Infrastructure.Services.VideoVerificationService>();

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
            // Verify token type claim
            var tokenType = context.Principal?.FindFirst("type")?.Value;
            if (tokenType != "access")
            {
                context.Fail("Token type is invalid for API access.");
                return;
            }

            // Verify account status directly from database
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

// CLI Bootstrap Admin Command Support: --bootstrap-admin
if (args.Contains("--bootstrap-admin"))
{
    // Security check: never accept passwords via command-line arguments to avoid process table exposure
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

        // Security Guard: Prevent any non-production process, development server, or migration/seed from targeting StudyAIDb
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

        // Only seed reference data in Development/Testing, or when explicitly enabled via configuration
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

// Masked password reader helper for interactive CLI
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
