using Aura.Application.Services.Users;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AURA User Service API",
        Version = "v1",
        Description = "User management microservice for AURA"
    });
});

// Đăng ký UserService in-memory (đã có trong Aura.Application)
builder.Services.AddSingleton<IUserService, UserService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "AURA User Service v1");
        options.RoutePrefix = "swagger";
    });
}

// Không ép HTTPS trong Docker
// app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

// Health endpoint
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "user-service",
    timestamp = DateTime.UtcNow
}));

app.Run();
