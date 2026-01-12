var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// HttpClient để gọi AI Core
builder.Services.AddHttpClient("AiCore", (sp, client) =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var baseUrl = configuration["AICore:BaseUrl"] ?? "http://aicore:8000/api";
    client.BaseAddress = new Uri(baseUrl);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Không ép HTTPS vì chạy trong Docker nội bộ
// app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

// Health endpoint root (/health) cho Docker healthcheck
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "analysis-service",
    timestamp = DateTime.UtcNow
}));

app.Run();
