using Aura.Application.DTOs.Analysis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;

namespace Aura.API.Services;

/// <summary>
/// HTTP Client để gọi Analysis Microservice
/// </summary>
public class AnalysisServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AnalysisServiceClient> _logger;
    private readonly string _baseUrl;

    public AnalysisServiceClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<AnalysisServiceClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _baseUrl = configuration["AnalysisService:BaseUrl"] ?? "http://analysis-service:5004";
        
        _httpClient.BaseAddress = new Uri(_baseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
    }

    /// <summary>
    /// Gọi analysis-service để phân tích ảnh
    /// </summary>
    public async Task<object> AnalyzeImageAsync(string imageUrl, string imageType, string? modelVersion = null)
    {
        try
        {
            var request = new
            {
                imageUrl,
                imageType,
                modelVersion = modelVersion ?? "v1.0.0"
            };

            _logger.LogInformation("Calling analysis-service: {BaseUrl}/api/analysis/analyze", _baseUrl);
            
            var response = await _httpClient.PostAsJsonAsync("/api/analysis/analyze", request);
            response.EnsureSuccessStatusCode();
            
            var result = await response.Content.ReadFromJsonAsync<object>();
            return result ?? new { };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Error calling analysis-service");
            throw new InvalidOperationException($"Failed to call analysis-service: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Health check analysis-service
    /// </summary>
    public async Task<bool> IsHealthyAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync("/health");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
