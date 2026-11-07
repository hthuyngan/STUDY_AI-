using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Infrastructure.Persistence;
using StudyAI.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

// Configuration
var configuration = builder.Configuration;
var connectionString = configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=.\\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

// 1. Database Context
builder.Services.AddDbContext<StudyAIDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
    });
});

builder.Services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<StudyAIDbContext>());

// 2. Security & Token Services
builder.Services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

// 3. JWT Secret Validation & Authentication
var jwtSecret = configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
{
    throw new InvalidOperationException("FATAL: Jwt:SecretKey must be configured with at least 32 characters.");
}

if (builder.Environment.IsProduction() && (jwtSecret.Contains("development", StringComparison.OrdinalIgnoreCase) || jwtSecret.Contains("change_in_production", StringComparison.OrdinalIgnoreCase)))
{
    throw new InvalidOperationException("FATAL: Insecure default Jwt:SecretKey cannot be used in a production environment!");
}

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
    options.AddPolicy("StaffOnly", policy => policy.RequireRole("admin", "teacher", "content", "support"));
    options.AddPolicy("ContentStaff", policy => policy.RequireRole("admin", "content"));
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
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 6. Controllers & JSON Options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never;
    });

// 7. OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

// CLI Bootstrap Admin Command Support: --bootstrap-admin
if (args.Contains("--bootstrap-admin"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    string? adminEmail = Environment.GetEnvironmentVariable("ADMIN_BOOTSTRAP_EMAIL");
    string? adminPass = Environment.GetEnvironmentVariable("ADMIN_BOOTSTRAP_PASSWORD");

    // Optional CLI argument parse
    for (int i = 0; i < args.Length; i++)
    {
        if (args[i] == "--admin-email" && i + 1 < args.Length) adminEmail = args[i + 1];
        if (args[i] == "--admin-password" && i + 1 < args.Length) adminPass = args[i + 1];
    }

    if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPass))
    {
        Console.Error.WriteLine("ERROR: Admin email or password missing. Provide via --admin-email and --admin-password or ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD environment variables.");
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
        Environment.Exit(0);
    }
}

// Database Migration & Reference Data Initialization
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

        if (builder.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup", true))
        {
            await db.Database.MigrateAsync();
        }

        // Seed curriculum reference data
        await DbInitializer.SeedReferenceDataAsync(db);

        // Optional environment-based admin bootstrap
        string? envAdminEmail = Environment.GetEnvironmentVariable("ADMIN_BOOTSTRAP_EMAIL");
        string? envAdminPassword = Environment.GetEnvironmentVariable("ADMIN_BOOTSTRAP_PASSWORD");
        if (!string.IsNullOrWhiteSpace(envAdminEmail) && !string.IsNullOrWhiteSpace(envAdminPassword))
        {
            var bootResult = await DbInitializer.BootstrapAdminAsync(db, hasher, envAdminEmail, envAdminPassword);
            if (bootResult.Created)
            {
                logger.LogInformation("Admin user bootstrapped successfully from environment.");
            }
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while initializing or migrating the database.");
    }
}

// HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

app.UseCors("DefaultCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
