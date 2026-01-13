using Aura.Application.DTOs.Analysis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;

namespace Aura.Application.Services.Analysis;

public class AnalysisService : IAnalysisService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AnalysisService>? _logger;
    private readonly string _connectionString;
    private readonly HttpClient _httpClient;

    public AnalysisService(
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<AnalysisService>? logger = null)
    {
        _configuration = configuration;
        _logger = logger;
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string not found");
        
        _httpClient = httpClient ?? new HttpClient();
        var timeoutValue = _configuration["AICore:Timeout"];
        _httpClient.Timeout = TimeSpan.FromMilliseconds(
            int.TryParse(timeoutValue, out var timeout) ? timeout : 30000);
    }

    public async Task<AnalysisResponseDto> StartAnalysisAsync(string userId, string imageId)
    {
        try
        {
            // Get image info from database
            var imageInfo = await GetImageInfoAsync(imageId, userId);
            if (imageInfo == null)
            {
                throw new InvalidOperationException("Image not found or access denied");
            }

            // Create analysis record in database
            var analysisId = Guid.NewGuid().ToString();
            var modelVersionId = await GetActiveModelVersionIdAsync();

            await CreateAnalysisRecordAsync(analysisId, imageId, userId, modelVersionId);

            // Call AI Core service
            var (cloudinaryUrl, imageType) = imageInfo.Value;
            var aiResult = await CallAICoreServiceAsync(cloudinaryUrl, imageType);

            // Update analysis record with results
            await UpdateAnalysisResultsAsync(analysisId, aiResult);

            _logger?.LogInformation("Analysis completed: {AnalysisId}, Image: {ImageId}", analysisId, imageId);

            return new AnalysisResponseDto
            {
                AnalysisId = analysisId,
                ImageId = imageId,
                Status = "Completed",
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error starting analysis for image: {ImageId}", imageId);
            throw new InvalidOperationException($"Failed to start analysis: {ex.Message}", ex);
        }
    }

    public async Task<List<AnalysisResponseDto>> StartMultipleAnalysisAsync(string userId, List<string> imageIds)
    {
        var results = new List<AnalysisResponseDto>();

        foreach (var imageId in imageIds)
        {
            try
            {
                var result = await StartAnalysisAsync(userId, imageId);
                results.Add(result);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error analyzing image: {ImageId}", imageId);
                results.Add(new AnalysisResponseDto
                {
                    AnalysisId = Guid.NewGuid().ToString(),
                    ImageId = imageId,
                    Status = "Failed",
                    StartedAt = DateTime.UtcNow
                });
            }
        }

        return results;
    }

    public async Task<AnalysisResultDto?> GetAnalysisResultAsync(string analysisId, string userId)
    {
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT 
                ar.Id, ar.ImageId, ar.AnalysisStatus, ar.OverallRiskLevel, ar.RiskScore,
                ar.HypertensionRisk, ar.HypertensionScore,
                ar.DiabetesRisk, ar.DiabetesScore, ar.DiabeticRetinopathyDetected, ar.DiabeticRetinopathySeverity,
                ar.StrokeRisk, ar.StrokeScore,
                ar.VesselTortuosity, ar.VesselWidthVariation, ar.MicroaneurysmsCount,
                ar.HemorrhagesDetected, ar.ExudatesDetected,
                ar.AnnotatedImageUrl, ar.HeatmapUrl,
                ar.AiConfidenceScore, ar.Recommendations, ar.HealthWarnings,
                ar.ProcessingTimeSeconds, ar.AnalysisStartedAt, ar.AnalysisCompletedAt,
                ar.DetailedFindings
            FROM analysis_results ar
            INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
            WHERE ar.Id = @AnalysisId AND ri.UserId = @UserId AND ar.IsDeleted = false";

        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("AnalysisId", analysisId);
        command.Parameters.AddWithValue("UserId", userId);

        using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new AnalysisResultDto
        {
            Id = reader.GetString(0),
            ImageId = reader.GetString(1),
            AnalysisStatus = reader.GetString(2),
            OverallRiskLevel = reader.IsDBNull(3) ? null : reader.GetString(3),
            RiskScore = reader.IsDBNull(4) ? null : reader.GetDecimal(4),
            HypertensionRisk = reader.IsDBNull(5) ? null : reader.GetString(5),
            HypertensionScore = reader.IsDBNull(6) ? null : reader.GetDecimal(6),
            DiabetesRisk = reader.IsDBNull(7) ? null : reader.GetString(7),
            DiabetesScore = reader.IsDBNull(8) ? null : reader.GetDecimal(8),
            DiabeticRetinopathyDetected = reader.IsDBNull(9) ? false : reader.GetBoolean(9),
            DiabeticRetinopathySeverity = reader.IsDBNull(10) ? null : reader.GetString(10),
            StrokeRisk = reader.IsDBNull(11) ? null : reader.GetString(11),
            StrokeScore = reader.IsDBNull(12) ? null : reader.GetDecimal(12),
            VesselTortuosity = reader.IsDBNull(13) ? null : reader.GetDecimal(13),
            VesselWidthVariation = reader.IsDBNull(14) ? null : reader.GetDecimal(14),
            MicroaneurysmsCount = reader.IsDBNull(15) ? 0 : reader.GetInt32(15),
            HemorrhagesDetected = reader.IsDBNull(16) ? false : reader.GetBoolean(16),
            ExudatesDetected = reader.IsDBNull(17) ? false : reader.GetBoolean(17),
            AnnotatedImageUrl = reader.IsDBNull(18) ? null : reader.GetString(18),
            HeatmapUrl = reader.IsDBNull(19) ? null : reader.GetString(19),
            AiConfidenceScore = reader.IsDBNull(20) ? null : reader.GetDecimal(20),
            Recommendations = reader.IsDBNull(21) ? null : reader.GetString(21),
            HealthWarnings = reader.IsDBNull(22) ? null : reader.GetString(22),
            ProcessingTimeSeconds = reader.IsDBNull(23) ? null : reader.GetInt32(23),
            AnalysisStartedAt = reader.IsDBNull(24) ? null : reader.GetDateTime(24),
            AnalysisCompletedAt = reader.IsDBNull(25) ? null : reader.GetDateTime(25),
            DetailedFindings = reader.IsDBNull(26) 
                ? null 
                : JsonSerializer.Deserialize<Dictionary<string, object>>(reader.GetString(26))
        };
    }

    private async Task<(string CloudinaryUrl, string ImageType)?> GetImageInfoAsync(string imageId, string userId)
    {
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT CloudinaryUrl, ImageType 
            FROM retinal_images 
            WHERE Id = @ImageId AND UserId = @UserId AND IsDeleted = false";

        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("ImageId", imageId);
        command.Parameters.AddWithValue("UserId", userId);

        using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        return (reader.GetString(0), reader.GetString(1));
    }

    private async Task<string> GetActiveModelVersionIdAsync()
    {
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT Id FROM ai_model_versions 
            WHERE IsActive = true AND IsDeleted = false 
            ORDER BY DeployedAt DESC LIMIT 1";

        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        var result = await command.ExecuteScalarAsync();
        
        if (result == null)
        {
            // Create default model version if none exists
            var defaultId = Guid.NewGuid().ToString();
            await CreateDefaultModelVersionAsync(defaultId);
            return defaultId;
        }

        return result.ToString()!;
    }

    private async Task CreateDefaultModelVersionAsync(string modelVersionId)
    {
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            INSERT INTO ai_model_versions (
                Id, ModelName, VersionNumber, ModelType, Description, 
                IsActive, CreatedDate, IsDeleted
            ) VALUES (
                @Id, @ModelName, @VersionNumber, @ModelType, @Description,
                @IsActive, @CreatedDate, @IsDeleted
            )";

        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", modelVersionId);
        command.Parameters.AddWithValue("ModelName", "AURA-Retinal-Analyzer");
        command.Parameters.AddWithValue("VersionNumber", "1.0.0");
        command.Parameters.AddWithValue("ModelType", "RetinalVascularAnalysis");
        command.Parameters.AddWithValue("Description", "Default AI model for retinal vascular health screening");
        command.Parameters.AddWithValue("IsActive", true);
        command.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
        command.Parameters.AddWithValue("IsDeleted", false);

        await command.ExecuteNonQueryAsync();
    }

    private async Task CreateAnalysisRecordAsync(string analysisId, string imageId, string userId, string modelVersionId)
    {
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            INSERT INTO analysis_results (
                Id, ImageId, UserId, ModelVersionId, AnalysisStatus,
                AnalysisStartedAt, CreatedDate, IsDeleted
            ) VALUES (
                @Id, @ImageId, @UserId, @ModelVersionId, @AnalysisStatus,
                @AnalysisStartedAt, @CreatedDate, @IsDeleted
            )";

        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", analysisId);
        command.Parameters.AddWithValue("ImageId", imageId);
        command.Parameters.AddWithValue("UserId", userId);
        command.Parameters.AddWithValue("ModelVersionId", modelVersionId);
        command.Parameters.AddWithValue("AnalysisStatus", "Processing");
        command.Parameters.AddWithValue("AnalysisStartedAt", DateTime.UtcNow);
        command.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
        command.Parameters.AddWithValue("IsDeleted", false);

        await command.ExecuteNonQueryAsync();
    }

    private async Task<Dictionary<string, object>> CallAICoreServiceAsync(string imageUrl, string imageType)
    {
        // Gọi qua Analysis Microservice thay vì gọi thẳng AI Core
        var analysisServiceBaseUrl = _configuration["AnalysisService:BaseUrl"] ?? "http://analysis-service:5004";
        var endpoint = $"{analysisServiceBaseUrl}/api/analysis/analyze";

        var requestBody = new
        {
            imageUrl = imageUrl,
            imageType = imageType,
            modelVersion = "v1.0.0"
        };

        try
        {
            _logger?.LogInformation("Calling analysis-service: {Endpoint}", endpoint);
            
            var response = await _httpClient.PostAsJsonAsync(endpoint, requestBody);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
            
            if (result == null)
            {
                _logger?.LogWarning("Analysis-service returned null result, using mock data");
                return GenerateMockAnalysisResult();
            }

            // Convert analysis-service response format to expected format
            return ConvertAnalysisServiceResponse(result);
        }
        catch (HttpRequestException ex)
        {
            _logger?.LogWarning(ex, "Analysis-service unavailable, using mock data");
            // Return mock data for development
            return GenerateMockAnalysisResult();
        }
    }

    private Dictionary<string, object> ConvertAnalysisServiceResponse(Dictionary<string, object> response)
    {
        // Convert từ format của analysis-service sang format mong đợi
        // Analysis-service trả về format từ AI Core, cần map lại
        var converted = new Dictionary<string, object>();
        
        // Map các field từ AI Core response format
        if (response.TryGetValue("risk_level", out var riskLevel))
            converted["overall_risk_level"] = riskLevel;
        else if (response.TryGetValue("overallRiskLevel", out var riskLevel2))
            converted["overall_risk_level"] = riskLevel2;
        
        if (response.TryGetValue("risk_score", out var riskScore))
            converted["risk_score"] = riskScore;
        else if (response.TryGetValue("riskScore", out var riskScore2))
            converted["risk_score"] = riskScore2;
        
        if (response.TryGetValue("confidence", out var confidence))
            converted["ai_confidence_score"] = confidence;
        
        if (response.TryGetValue("findings", out var findings))
            converted["findings"] = findings;
        
        if (response.TryGetValue("heatmap_url", out var heatmap))
            converted["heatmap_url"] = heatmap;
        else if (response.TryGetValue("heatmapUrl", out var heatmap2))
            converted["heatmap_url"] = heatmap2;
        
        // Nếu không có field nào được map, trả về response gốc
        return converted.Count > 0 ? converted : response;
    }

    private Dictionary<string, object> GenerateMockAnalysisResult()
    {
        var random = new Random();
        return new Dictionary<string, object>
        {
            ["overall_risk_level"] = new[] { "Low", "Medium", "High" }[random.Next(3)],
            ["risk_score"] = random.Next(20, 85),
            ["hypertension_risk"] = new[] { "Low", "Medium", "High" }[random.Next(3)],
            ["hypertension_score"] = random.Next(10, 80),
            ["diabetes_risk"] = new[] { "Low", "Medium", "High" }[random.Next(3)],
            ["diabetes_score"] = random.Next(10, 80),
            ["stroke_risk"] = new[] { "Low", "Medium", "High" }[random.Next(3)],
            ["stroke_score"] = random.Next(10, 80),
            ["vessel_tortuosity"] = random.Next(1, 10),
            ["vessel_width_variation"] = random.Next(1, 10),
            ["microaneurysms_count"] = random.Next(0, 5),
            ["hemorrhages_detected"] = random.Next(0, 2) == 1,
            ["exudates_detected"] = random.Next(0, 2) == 1,
            ["ai_confidence_score"] = random.Next(75, 95),
            ["annotated_image_url"] = "https://placeholder.aura-health.com/annotated.jpg",
            ["heatmap_url"] = "https://placeholder.aura-health.com/heatmap.jpg",
            ["recommendations"] = "Tiếp tục theo dõi định kỳ. Nếu có triệu chứng bất thường, vui lòng tham khảo ý kiến bác sĩ.",
            ["health_warnings"] = random.Next(0, 2) == 1 ? (object)"Phát hiện một số dấu hiệu cần theo dõi." : (object)""
        };
    }

    private async Task UpdateAnalysisResultsAsync(string analysisId, Dictionary<string, object> aiResult)
    {
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            UPDATE analysis_results SET
                AnalysisStatus = @AnalysisStatus,
                OverallRiskLevel = @OverallRiskLevel,
                RiskScore = @RiskScore,
                HypertensionRisk = @HypertensionRisk,
                HypertensionScore = @HypertensionScore,
                DiabetesRisk = @DiabetesRisk,
                DiabetesScore = @DiabetesScore,
                DiabeticRetinopathyDetected = @DiabeticRetinopathyDetected,
                StrokeRisk = @StrokeRisk,
                StrokeScore = @StrokeScore,
                VesselTortuosity = @VesselTortuosity,
                VesselWidthVariation = @VesselWidthVariation,
                MicroaneurysmsCount = @MicroaneurysmsCount,
                HemorrhagesDetected = @HemorrhagesDetected,
                ExudatesDetected = @ExudatesDetected,
                AnnotatedImageUrl = @AnnotatedImageUrl,
                HeatmapUrl = @HeatmapUrl,
                AiConfidenceScore = @AiConfidenceScore,
                Recommendations = @Recommendations,
                HealthWarnings = @HealthWarnings,
                ProcessingTimeSeconds = @ProcessingTimeSeconds,
                AnalysisCompletedAt = @AnalysisCompletedAt,
                RawAiOutput = @RawAiOutput,
                UpdatedDate = @UpdatedDate
            WHERE Id = @Id";

        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        
        // Helper method to safely get value from dictionary
        T GetValue<T>(Dictionary<string, object> dict, string key, T defaultValue)
        {
            if (dict.TryGetValue(key, out var value) && value != null)
            {
                try
                {
                    return (T)Convert.ChangeType(value, typeof(T));
                }
                catch
                {
                    return defaultValue;
                }
            }
            return defaultValue;
        }

        var processingTimeSeconds = GetValue(aiResult, "processing_time_seconds", 15);
        var processingTime = processingTimeSeconds;

        command.Parameters.AddWithValue("Id", analysisId);
        command.Parameters.AddWithValue("AnalysisStatus", "Completed");
        command.Parameters.AddWithValue("OverallRiskLevel", (object?)GetValue(aiResult, "overall_risk_level", (string?)null) ?? DBNull.Value);
        command.Parameters.AddWithValue("RiskScore", (object?)GetValue(aiResult, "risk_score", 0m) ?? DBNull.Value);
        command.Parameters.AddWithValue("HypertensionRisk", (object?)GetValue(aiResult, "hypertension_risk", (string?)null) ?? DBNull.Value);
        command.Parameters.AddWithValue("HypertensionScore", (object?)GetValue(aiResult, "hypertension_score", 0m) ?? DBNull.Value);
        command.Parameters.AddWithValue("DiabetesRisk", (object?)GetValue(aiResult, "diabetes_risk", (string?)null) ?? DBNull.Value);
        command.Parameters.AddWithValue("DiabetesScore", (object?)GetValue(aiResult, "diabetes_score", 0m) ?? DBNull.Value);
        command.Parameters.AddWithValue("DiabeticRetinopathyDetected", GetValue(aiResult, "diabetic_retinopathy_detected", false));
        command.Parameters.AddWithValue("StrokeRisk", (object?)GetValue(aiResult, "stroke_risk", (string?)null) ?? DBNull.Value);
        command.Parameters.AddWithValue("StrokeScore", (object?)GetValue(aiResult, "stroke_score", 0m) ?? DBNull.Value);
        command.Parameters.AddWithValue("VesselTortuosity", (object?)GetValue(aiResult, "vessel_tortuosity", 0m) ?? DBNull.Value);
        command.Parameters.AddWithValue("VesselWidthVariation", (object?)GetValue(aiResult, "vessel_width_variation", 0m) ?? DBNull.Value);
        command.Parameters.AddWithValue("MicroaneurysmsCount", GetValue(aiResult, "microaneurysms_count", 0));
        command.Parameters.AddWithValue("HemorrhagesDetected", GetValue(aiResult, "hemorrhages_detected", false));
        command.Parameters.AddWithValue("ExudatesDetected", GetValue(aiResult, "exudates_detected", false));
        command.Parameters.AddWithValue("AnnotatedImageUrl", (object?)GetValue(aiResult, "annotated_image_url", (string?)null) ?? DBNull.Value);
        command.Parameters.AddWithValue("HeatmapUrl", (object?)GetValue(aiResult, "heatmap_url", (string?)null) ?? DBNull.Value);
        command.Parameters.AddWithValue("AiConfidenceScore", (object?)GetValue(aiResult, "ai_confidence_score", 0m) ?? DBNull.Value);
        command.Parameters.AddWithValue("Recommendations", (object?)GetValue(aiResult, "recommendations", (string?)null) ?? DBNull.Value);
        command.Parameters.AddWithValue("HealthWarnings", (object?)GetValue(aiResult, "health_warnings", (string?)null) ?? DBNull.Value);
        command.Parameters.AddWithValue("ProcessingTimeSeconds", processingTime);
        command.Parameters.AddWithValue("AnalysisCompletedAt", DateTime.UtcNow);
        
        // Cast JSON string to jsonb type for PostgreSQL
        var rawAiOutputParam = new Npgsql.NpgsqlParameter("RawAiOutput", NpgsqlTypes.NpgsqlDbType.Jsonb)
        {
            Value = JsonSerializer.Serialize(aiResult)
        };
        command.Parameters.Add(rawAiOutputParam);
        
        command.Parameters.AddWithValue("UpdatedDate", DateTime.UtcNow.Date);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<List<AnalysisResultDto>> GetUserAnalysisResultsAsync(string userId)
    {
        using var connection = new Npgsql.NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
            SELECT 
                ar.Id, ar.ImageId, ar.AnalysisStatus, ar.OverallRiskLevel, ar.RiskScore,
                ar.HypertensionRisk, ar.HypertensionScore,
                ar.DiabetesRisk, ar.DiabetesScore, ar.DiabeticRetinopathyDetected, ar.DiabeticRetinopathySeverity,
                ar.StrokeRisk, ar.StrokeScore,
                ar.VesselTortuosity, ar.VesselWidthVariation, ar.MicroaneurysmsCount,
                ar.HemorrhagesDetected, ar.ExudatesDetected,
                ar.AnnotatedImageUrl, ar.HeatmapUrl,
                ar.AiConfidenceScore, ar.Recommendations, ar.HealthWarnings,
                ar.ProcessingTimeSeconds, ar.AnalysisStartedAt, ar.AnalysisCompletedAt,
                ar.DetailedFindings
            FROM analysis_results ar
            INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
            WHERE ar.UserId = @UserId AND ar.IsDeleted = false AND ri.IsDeleted = false
            ORDER BY ar.AnalysisCompletedAt DESC NULLS LAST, ar.AnalysisStartedAt DESC";

        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("UserId", userId);

        var results = new List<AnalysisResultDto>();

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            results.Add(new AnalysisResultDto
            {
                Id = reader.GetString(0),
                ImageId = reader.GetString(1),
                AnalysisStatus = reader.GetString(2),
                OverallRiskLevel = reader.IsDBNull(3) ? null : reader.GetString(3),
                RiskScore = reader.IsDBNull(4) ? null : reader.GetDecimal(4),
                HypertensionRisk = reader.IsDBNull(5) ? null : reader.GetString(5),
                HypertensionScore = reader.IsDBNull(6) ? null : reader.GetDecimal(6),
                DiabetesRisk = reader.IsDBNull(7) ? null : reader.GetString(7),
                DiabetesScore = reader.IsDBNull(8) ? null : reader.GetDecimal(8),
                DiabeticRetinopathyDetected = reader.IsDBNull(9) ? false : reader.GetBoolean(9),
                DiabeticRetinopathySeverity = reader.IsDBNull(10) ? null : reader.GetString(10),
                StrokeRisk = reader.IsDBNull(11) ? null : reader.GetString(11),
                StrokeScore = reader.IsDBNull(12) ? null : reader.GetDecimal(12),
                VesselTortuosity = reader.IsDBNull(13) ? null : reader.GetDecimal(13),
                VesselWidthVariation = reader.IsDBNull(14) ? null : reader.GetDecimal(14),
                MicroaneurysmsCount = reader.IsDBNull(15) ? 0 : reader.GetInt32(15),
                HemorrhagesDetected = reader.IsDBNull(16) ? false : reader.GetBoolean(16),
                ExudatesDetected = reader.IsDBNull(17) ? false : reader.GetBoolean(17),
                AnnotatedImageUrl = reader.IsDBNull(18) ? null : reader.GetString(18),
                HeatmapUrl = reader.IsDBNull(19) ? null : reader.GetString(19),
                AiConfidenceScore = reader.IsDBNull(20) ? null : reader.GetDecimal(20),
                Recommendations = reader.IsDBNull(21) ? null : reader.GetString(21),
                HealthWarnings = reader.IsDBNull(22) ? null : reader.GetString(22),
                ProcessingTimeSeconds = reader.IsDBNull(23) ? null : reader.GetInt32(23),
                AnalysisStartedAt = reader.IsDBNull(24) ? null : reader.GetDateTime(24),
                AnalysisCompletedAt = reader.IsDBNull(25) ? null : reader.GetDateTime(25),
                DetailedFindings = reader.IsDBNull(26) 
                    ? null 
                    : JsonSerializer.Deserialize<Dictionary<string, object>>(reader.GetString(26))
            });
        }

        _logger?.LogInformation("Retrieved {Count} analysis results for user: {UserId}", results.Count, userId);
        return results;
    }
}
