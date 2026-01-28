using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Aura.API.Controllers;

/// <summary>
/// Controller for clinic risk analytics (FR-25)
/// </summary>
[ApiController]
[Route("api/clinic/risk")]
[Authorize]
public class ClinicRiskController : ControllerBase
{
    private readonly string _connectionString;
    private readonly ILogger<ClinicRiskController> _logger;

    public ClinicRiskController(IConfiguration configuration, ILogger<ClinicRiskController> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection not configured");
        _logger = logger;
    }

    /// <summary>
    /// Get aggregated risk overview for clinic
    /// </summary>
    [HttpGet("overview")]
    public async Task<IActionResult> GetRiskOverview()
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    COUNT(*) FILTER (WHERE ar.OverallRiskLevel = 'Critical') as Critical,
                    COUNT(*) FILTER (WHERE ar.OverallRiskLevel = 'High') as High,
                    COUNT(*) FILTER (WHERE ar.OverallRiskLevel = 'Medium') as Medium,
                    COUNT(*) FILTER (WHERE ar.OverallRiskLevel = 'Low') as Low,
                    COUNT(*) as Total
                FROM analysis_results ar
                INNER JOIN retinal_images ri ON ri.Id = ar.ImageId
                WHERE ri.ClinicId = @ClinicId 
                    AND ar.IsDeleted = false 
                    AND ar.AnalysisStatus = 'Completed'";

            using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("ClinicId", clinicId);

            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return Ok(new
                {
                    critical = reader.GetInt32(0),
                    high = reader.GetInt32(1),
                    medium = reader.GetInt32(2),
                    low = reader.GetInt32(3),
                    total = reader.GetInt32(4)
                });
            }

            return Ok(new { critical = 0, high = 0, medium = 0, low = 0, total = 0 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting risk overview for clinic {ClinicId}", clinicId);
            return StatusCode(500, new { message = "Lỗi khi tải dữ liệu" });
        }
    }

    /// <summary>
    /// Get risk distribution breakdown
    /// </summary>
    [HttpGet("distribution")]
    public async Task<IActionResult> GetRiskDistribution()
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    COALESCE(ar.OverallRiskLevel, 'Unknown') as RiskLevel,
                    COUNT(*) as Count
                FROM analysis_results ar
                INNER JOIN retinal_images ri ON ri.Id = ar.ImageId
                WHERE ri.ClinicId = @ClinicId 
                    AND ar.IsDeleted = false 
                    AND ar.AnalysisStatus = 'Completed'
                GROUP BY ar.OverallRiskLevel
                ORDER BY 
                    CASE ar.OverallRiskLevel 
                        WHEN 'Critical' THEN 1 
                        WHEN 'High' THEN 2 
                        WHEN 'Medium' THEN 3 
                        WHEN 'Low' THEN 4 
                        ELSE 5 
                    END";

            using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("ClinicId", clinicId);

            var distribution = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                distribution.Add(new
                {
                    riskLevel = reader.GetString(0),
                    count = reader.GetInt32(1)
                });
            }

            return Ok(distribution);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting risk distribution for clinic {ClinicId}", clinicId);
            return StatusCode(500, new { message = "Lỗi khi tải dữ liệu" });
        }
    }

    /// <summary>
    /// Get risk trends over time
    /// </summary>
    [HttpGet("trends")]
    public async Task<IActionResult> GetRiskTrends([FromQuery] int days = 30)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    DATE(ar.AnalysisCompletedAt) as Date,
                    COUNT(*) FILTER (WHERE ar.OverallRiskLevel IN ('Critical', 'High')) as HighRisk,
                    COUNT(*) FILTER (WHERE ar.OverallRiskLevel = 'Medium') as MediumRisk,
                    COUNT(*) FILTER (WHERE ar.OverallRiskLevel = 'Low') as LowRisk,
                    COUNT(*) as Total
                FROM analysis_results ar
                INNER JOIN retinal_images ri ON ri.Id = ar.ImageId
                WHERE ri.ClinicId = @ClinicId 
                    AND ar.IsDeleted = false 
                    AND ar.AnalysisStatus = 'Completed'
                    AND ar.AnalysisCompletedAt >= @StartDate
                GROUP BY DATE(ar.AnalysisCompletedAt)
                ORDER BY DATE(ar.AnalysisCompletedAt)";

            using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("ClinicId", clinicId);
            cmd.Parameters.AddWithValue("StartDate", DateTime.UtcNow.AddDays(-days));

            var trends = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                trends.Add(new
                {
                    date = reader.GetDateTime(0).ToString("yyyy-MM-dd"),
                    highRisk = reader.GetInt32(1),
                    mediumRisk = reader.GetInt32(2),
                    lowRisk = reader.GetInt32(3),
                    total = reader.GetInt32(4)
                });
            }

            return Ok(trends);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting risk trends for clinic {ClinicId}", clinicId);
            return StatusCode(500, new { message = "Lỗi khi tải dữ liệu" });
        }
    }

    /// <summary>
    /// Get list of high-risk patients
    /// </summary>
    [HttpGet("high-risk-patients")]
    public async Task<IActionResult> GetHighRiskPatients([FromQuery] int limit = 20)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT DISTINCT ON (u.Id)
                    u.Id as UserId,
                    u.FirstName,
                    u.LastName,
                    u.Email,
                    ar.OverallRiskLevel,
                    ar.AnalysisCompletedAt,
                    ar.AiConfidenceScore,
                    (SELECT d.FirstName || ' ' || d.LastName 
                     FROM patient_doctor_assignments pda 
                     INNER JOIN doctors d ON d.Id = pda.DoctorId
                     WHERE pda.UserId = u.Id AND pda.ClinicId = @ClinicId AND pda.IsPrimary = true AND pda.IsDeleted = false
                     LIMIT 1) as AssignedDoctor
                FROM analysis_results ar
                INNER JOIN retinal_images ri ON ri.Id = ar.ImageId
                INNER JOIN users u ON u.Id = ar.UserId
                WHERE ri.ClinicId = @ClinicId 
                    AND ar.IsDeleted = false 
                    AND ar.AnalysisStatus = 'Completed'
                    AND ar.OverallRiskLevel IN ('Critical', 'High')
                ORDER BY u.Id, ar.AnalysisCompletedAt DESC
                LIMIT @Limit";

            using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("ClinicId", clinicId);
            cmd.Parameters.AddWithValue("Limit", limit);

            var patients = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                patients.Add(new
                {
                    userId = reader.GetString(0),
                    fullName = $"{reader.GetString(1)} {reader.GetString(2)}".Trim(),
                    email = reader.GetString(3),
                    riskLevel = reader.GetString(4),
                    analysisDate = reader.IsDBNull(5) ? null : reader.GetDateTime(5).ToString("o"),
                    confidenceScore = reader.IsDBNull(6) ? (decimal?)null : reader.GetDecimal(6),
                    assignedDoctor = reader.IsDBNull(7) ? null : reader.GetString(7)
                });
            }

            return Ok(patients);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting high-risk patients for clinic {ClinicId}", clinicId);
            return StatusCode(500, new { message = "Lỗi khi tải dữ liệu" });
        }
    }

    private string? GetCurrentClinicId()
    {
        return User.FindFirstValue("clinic_id");
    }
}
