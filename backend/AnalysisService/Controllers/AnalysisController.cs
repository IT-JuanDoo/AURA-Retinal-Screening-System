using System.Net.Http;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Aura.AnalysisService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AnalysisController> _logger;

    public AnalysisController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AnalysisController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Proxy endpoint: nhận request phân tích và forward sang AI Core (/api/analyze)
    /// </summary>
    [HttpPost("analyze")]
    public async Task<IActionResult> Analyze([FromBody] AnalyzeRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            return BadRequest(new { message = "imageUrl is required" });
        }

        var baseUrl = _configuration["AICore:BaseUrl"] ?? "http://aicore:8000/api";
        var client = _httpClientFactory.CreateClient("AiCore");
        client.BaseAddress ??= new Uri(baseUrl);

        try
        {
            _logger.LogInformation("Forwarding analysis request to AI Core: {ImageUrl}", request.ImageUrl);

            var aiRequest = new
            {
                image_url = request.ImageUrl,
                image_type = request.ImageType ?? "Fundus",
                model_version = request.ModelVersion
            };

            var response = await client.PostAsJsonAsync("analyze", aiRequest);

            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("AI Core returned error {StatusCode}: {Content}", response.StatusCode, content);
                return StatusCode((int)response.StatusCode, new { message = "AI Core error", details = content });
            }

            // Trả nguyên response từ AI Core cho client
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AI Core for analysis");
            return StatusCode(500, new { message = "Failed to call AI Core", error = ex.Message });
        }
    }

    /// <summary>
    /// Health check đơn giản cho service
    /// </summary>
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "healthy",
            service = "analysis-service",
            timestamp = DateTime.UtcNow
        });
    }
}

public class AnalyzeRequestDto
{
    public string ImageUrl { get; set; } = string.Empty;
    public string? ImageType { get; set; } = "Fundus";
    public string? ModelVersion { get; set; }
}

