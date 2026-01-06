using System.Text;
using Aura.Application.Services.Auth;
using Aura.Application.Services.Users;
using Aura.Application.Services.RBAC;
using Aura.Shared.Authorization;
using Aura.Shared.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Aura.API.Clinic;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel for larger file uploads (up to 50MB)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 50 * 1024 * 1024; // 50MB
});

// Add services to the container
builder.Services.AddControllers(options =>
{
    // Configure multipart body length limit for file uploads
    options.MaxModelBindingCollectionSize = int.MaxValue;
})
    .AddJsonOptions(options =>
    {
        // Configure JSON serializer to use camelCase (matching frontend)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddEndpointsApiExplorer();

// Configure form options for file uploads (up to 50MB)
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 50 * 1024 * 1024; // 50MB
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartHeadersLengthLimit = int.MaxValue;
});

// Configure Swagger with JWT authentication
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AURA API",
        Version = "v1",
        Description = "API cho Hệ thống Sàng lọc Sức khỏe Mạch máu Võng mạc AURA"
    });

    // Add JWT authentication to Swagger
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập 'Bearer' [space] và token của bạn.\n\nVí dụ: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero // No tolerance for token expiration
    };

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
            {
                context.Response.Headers.Append("Token-Expired", "true");
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole("Admin", "SuperAdmin");
    });
});

// Add HttpContextAccessor for PermissionAuthorizationHandler
builder.Services.AddHttpContextAccessor();

// Register authorization handlers for RBAC
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Register authorization handlers for RBAC
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration["App:FrontendUrl"] ?? "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:5173"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials() // Required for cookies
            .WithExposedHeaders("Token-Expired"); // Expose custom headers
    });
});

// Register application services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<IUserService, UserService>();

// FR-2: Image Services
builder.Services.AddScoped<Aura.Application.Services.Images.IImageService, Aura.Application.Services.Images.ImageService>();

// FR-3: Analysis Services
builder.Services.AddHttpClient<Aura.Application.Services.Analysis.AnalysisService>(client =>
{
    var timeoutValue = builder.Configuration["AICore:Timeout"];
    client.Timeout = TimeSpan.FromMilliseconds(
        int.TryParse(timeoutValue, out var timeout) ? timeout : 30000);
});
builder.Services.AddScoped<Aura.Application.Services.Analysis.IAnalysisService, Aura.Application.Services.Analysis.AnalysisService>();

// FR-24: Analysis Queue Service for batch processing (NFR-2: ≥100 images per batch)
builder.Services.AddScoped<Aura.Application.Services.Analysis.IAnalysisQueueService, Aura.Application.Services.Analysis.AnalysisQueueService>();

// Notifications (in-memory for now)
builder.Services.AddSingleton<Aura.Application.Services.Notifications.INotificationService, Aura.Infrastructure.Services.Notifications.NotificationService>();
// FR-32: RBAC Services
builder.Services.AddScoped<Aura.Application.Repositories.IRbacRepository, Aura.API.Admin.RbacRepository>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();

// FR-31: Admin Account Management (DB based)
builder.Services.AddScoped<Aura.API.Admin.AdminDb>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var logger = sp.GetService<ILogger<Aura.API.Admin.AdminDb>>();
    return new Aura.API.Admin.AdminDb(config, logger);
});
builder.Services.AddScoped<Aura.API.Admin.AdminJwtService>();
builder.Services.AddScoped<Aura.API.Admin.AdminAccountRepository>();
builder.Services.AddScoped<Aura.API.Admin.AnalyticsRepository>();

// FR-22: Clinic Management
builder.Services.AddScoped<ClinicDb>();
builder.Services.AddScoped<ClinicRepository>();

// TODO: Add database context when ready
// builder.Services.AddDbContext<AuraDbContext>(options =>
//     options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// TODO: Add repositories
// builder.Services.AddScoped<IUserRepository, UserRepository>();

var app = builder.Build();

// Configure the HTTP request pipeline
// Enable Swagger and Swagger UI in all environments so admin can access the docs locally
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "AURA API v1");
        options.RoutePrefix = "swagger";
        options.DisplayRequestDuration();
    });
}

// Mặc định không ép HTTPS để tránh lỗi "Network Error" khi local chỉ chạy http://localhost:5000
// Nếu deploy thật sự cần HTTPS redirect, bật cấu hình App:UseHttpsRedirection = true
if (app.Configuration.GetValue<bool>("App:UseHttpsRedirection"))
{
    app.UseHttpsRedirection();
}

// Use CORS before authentication
app.UseCors("AllowFrontend");

// Enable request buffering for file uploads
app.Use(async (context, next) =>
{
    context.Request.EnableBuffering(); // Enable request buffering for file uploads
    await next();
});

// Add headers to support OAuth popups (fix Cross-Origin-Opener-Policy warning)
app.Use(async (context, next) =>
{
    // Set Cross-Origin-Opener-Policy to allow OAuth popups
    context.Response.Headers.Append("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    context.Response.Headers.Append("Cross-Origin-Embedder-Policy", "unsafe-none");
    await next();
});

// Authentication & Authorization middleware
app.UseAuthentication();

// FR-32: RBAC Authorization Middleware (loads user roles/permissions into context)
app.UseMiddleware<RbacAuthorizationMiddleware>();

app.UseAuthorization();

app.MapControllers();

// Health check endpoint with database connection test
app.MapGet("/health", async (IConfiguration config) =>
{
    try
    {
        var cs = config.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrWhiteSpace(cs))
        {
            using var conn = new Npgsql.NpgsqlConnection(cs);
            await conn.OpenAsync();
            using var cmd = new Npgsql.NpgsqlCommand("SELECT 1", conn);
            await cmd.ExecuteScalarAsync();
        }
        return Results.Ok(new { status = "healthy", database = "connected", timestamp = DateTime.UtcNow });
    }
    catch
    {
        return Results.StatusCode(503);
    }
});

app.Run();
