using Aura.Application.Services.Images;
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
        Title = "AURA Image Service API",
        Version = "v1",
        Description = "Image upload and management microservice for AURA"
    });
});

// Đăng ký ImageService dùng lại từ Aura.Application
builder.Services.AddScoped<IImageService, ImageService>();

var app = builder.Build();

if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "AURA Image Service v1");
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
    service = "image-service",
    timestamp = DateTime.UtcNow
}));

app.Run();
