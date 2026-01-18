using Aura.Application.DTOs.Clinic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Security.Claims;
using System.Text.Json;

namespace Aura.API.Controllers;

/// <summary>
/// Controller cho Clinic Reports Generation (FR-26, FR-30)
/// </summary>
[ApiController]
[Route("api/clinic/reports")]
[Authorize]
[Produces("application/json")]
public class ClinicReportsController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ClinicReportsController> _logger;
    private readonly string _connectionString;

    public ClinicReportsController(
        IConfiguration configuration,
        ILogger<ClinicReportsController> logger)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string not configured");
    }

    /// <summary>
    /// Generate clinic-wide report (FR-26)
    /// </summary>
    [HttpPost("generate")]
    [ProducesResponseType(typeof(ClinicReportDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GenerateReport([FromBody] CreateClinicReportDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { message = "Chưa xác thực người dùng" });

        if (string.IsNullOrWhiteSpace(dto.ClinicId))
        {
            return BadRequest(new { message = "ClinicId là bắt buộc" });
        }

        if (!new[] { "ScreeningCampaign", "RiskDistribution", "MonthlySummary", "AnnualReport", "Custom" }.Contains(dto.ReportType))
        {
            return BadRequest(new { message = "ReportType không hợp lệ" });
        }

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Verify user has access to clinic
            var verifySql = @"
                SELECT Id FROM clinics 
                WHERE Id = @ClinicId 
                    AND (Id IN (SELECT ClinicId FROM clinic_users WHERE UserId = @UserId) 
                         OR Id IN (SELECT ClinicId FROM clinic_doctors WHERE DoctorId = @UserId))
                    AND COALESCE(IsDeleted, false) = false";

            using var verifyCmd = new NpgsqlCommand(verifySql, connection);
            verifyCmd.Parameters.AddWithValue("ClinicId", dto.ClinicId);
            verifyCmd.Parameters.AddWithValue("UserId", userId);

            var hasAccess = await verifyCmd.ExecuteScalarAsync();
            if (hasAccess == null)
            {
                return NotFound(new { message = "Không tìm thấy clinic hoặc không có quyền truy cập" });
            }

            // Calculate period if not provided
            var periodStart = dto.PeriodStart ?? DateTime.UtcNow.AddMonths(-1).Date;
            var periodEnd = dto.PeriodEnd ?? DateTime.UtcNow.Date;

            // Generate report statistics
            var statsSql = @"
                SELECT 
                    COUNT(DISTINCT ar.UserId) as TotalPatients,
                    COUNT(ar.Id) as TotalAnalyses,
                    COUNT(CASE WHEN ar.OverallRiskLevel = 'High' OR ar.OverallRiskLevel = 'Critical' THEN 1 END) as HighRiskCount,
                    COUNT(CASE WHEN ar.OverallRiskLevel = 'Medium' THEN 1 END) as MediumRiskCount,
                    COUNT(CASE WHEN ar.OverallRiskLevel = 'Low' THEN 1 END) as LowRiskCount
                FROM analysis_results ar
                INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
                WHERE ri.ClinicId = @ClinicId
                    AND ar.AnalysisCompletedAt >= @PeriodStart
                    AND ar.AnalysisCompletedAt <= @PeriodEnd
                    AND COALESCE(ar.IsDeleted, false) = false
                    AND ar.AnalysisStatus = 'Completed'";

            using var statsCmd = new NpgsqlCommand(statsSql, connection);
            statsCmd.Parameters.AddWithValue("ClinicId", dto.ClinicId);
            statsCmd.Parameters.AddWithValue("PeriodStart", periodStart);
            statsCmd.Parameters.AddWithValue("PeriodEnd", periodEnd.AddDays(1).AddSeconds(-1)); // End of day

            using var statsReader = await statsCmd.ExecuteReaderAsync();
            int totalPatients = 0, totalAnalyses = 0, highRiskCount = 0, mediumRiskCount = 0, lowRiskCount = 0;

            if (await statsReader.ReadAsync())
            {
                totalPatients = statsReader.GetInt32(0);
                totalAnalyses = statsReader.GetInt32(1);
                highRiskCount = statsReader.GetInt32(2);
                mediumRiskCount = statsReader.GetInt32(3);
                lowRiskCount = statsReader.GetInt32(4);
            }
            statsReader.Close();

            // Get detailed statistics
            var detailedStatsSql = @"
                SELECT 
                    DATE_TRUNC('day', ar.AnalysisCompletedAt) as AnalysisDate,
                    COUNT(*) as DailyCount,
                    COUNT(CASE WHEN ar.OverallRiskLevel IN ('High', 'Critical') THEN 1 END) as DailyHighRisk
                FROM analysis_results ar
                INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
                WHERE ri.ClinicId = @ClinicId
                    AND ar.AnalysisCompletedAt >= @PeriodStart
                    AND ar.AnalysisCompletedAt <= @PeriodEnd
                    AND COALESCE(ar.IsDeleted, false) = false
                    AND ar.AnalysisStatus = 'Completed'
                GROUP BY DATE_TRUNC('day', ar.AnalysisCompletedAt)
                ORDER BY AnalysisDate";

            using var detailedStatsCmd = new NpgsqlCommand(detailedStatsSql, connection);
            detailedStatsCmd.Parameters.AddWithValue("ClinicId", dto.ClinicId);
            detailedStatsCmd.Parameters.AddWithValue("PeriodStart", periodStart);
            detailedStatsCmd.Parameters.AddWithValue("PeriodEnd", periodEnd.AddDays(1).AddSeconds(-1));

            var dailyStats = new List<Dictionary<string, object>>();
            using var detailedStatsReader = await detailedStatsCmd.ExecuteReaderAsync();
            while (await detailedStatsReader.ReadAsync())
            {
                dailyStats.Add(new Dictionary<string, object>
                {
                    ["date"] = detailedStatsReader.GetDateTime(0).ToString("yyyy-MM-dd"),
                    ["count"] = detailedStatsReader.GetInt32(1),
                    ["highRiskCount"] = detailedStatsReader.GetInt32(2)
                });
            }
            detailedStatsReader.Close();

            // Prepare report data
            var reportData = new Dictionary<string, object>
            {
                ["periodStart"] = periodStart.ToString("yyyy-MM-dd"),
                ["periodEnd"] = periodEnd.ToString("yyyy-MM-dd"),
                ["totalPatients"] = totalPatients,
                ["totalAnalyses"] = totalAnalyses,
                ["highRiskCount"] = highRiskCount,
                ["mediumRiskCount"] = mediumRiskCount,
                ["lowRiskCount"] = lowRiskCount,
                ["riskDistribution"] = new Dictionary<string, object>
                {
                    ["high"] = totalAnalyses > 0 ? Math.Round((double)highRiskCount / totalAnalyses * 100, 2) : 0,
                    ["medium"] = totalAnalyses > 0 ? Math.Round((double)mediumRiskCount / totalAnalyses * 100, 2) : 0,
                    ["low"] = totalAnalyses > 0 ? Math.Round((double)lowRiskCount / totalAnalyses * 100, 2) : 0
                },
                ["dailyStatistics"] = dailyStats
            };

            // Create clinic report record
            var reportId = Guid.NewGuid().ToString();
            var reportSql = @"
                INSERT INTO clinic_reports
                (Id, ClinicId, ReportName, ReportType, PeriodStart, PeriodEnd,
                 TotalPatients, TotalAnalyses, HighRiskCount, MediumRiskCount, LowRiskCount,
                 ReportData, GeneratedBy, GeneratedAt, CreatedDate, CreatedBy, IsDeleted)
                VALUES
                (@Id, @ClinicId, @ReportName, @ReportType, @PeriodStart, @PeriodEnd,
                 @TotalPatients, @TotalAnalyses, @HighRiskCount, @MediumRiskCount, @LowRiskCount,
                 @ReportData, @GeneratedBy, @GeneratedAt, @CreatedDate, @CreatedBy, false)
                RETURNING Id, ClinicId, ReportName, ReportType, PeriodStart, PeriodEnd,
                          TotalPatients, TotalAnalyses, HighRiskCount, MediumRiskCount, LowRiskCount,
                          ReportData, ReportFileUrl, GeneratedAt";

            using var reportCmd = new NpgsqlCommand(reportSql, connection);
            reportCmd.Parameters.AddWithValue("Id", reportId);
            reportCmd.Parameters.AddWithValue("ClinicId", dto.ClinicId);
            reportCmd.Parameters.AddWithValue("ReportName", dto.ReportName);
            reportCmd.Parameters.AddWithValue("ReportType", dto.ReportType);
            reportCmd.Parameters.AddWithValue("PeriodStart", (object?)periodStart ?? DBNull.Value);
            reportCmd.Parameters.AddWithValue("PeriodEnd", (object?)periodEnd ?? DBNull.Value);
            reportCmd.Parameters.AddWithValue("TotalPatients", totalPatients);
            reportCmd.Parameters.AddWithValue("TotalAnalyses", totalAnalyses);
            reportCmd.Parameters.AddWithValue("HighRiskCount", highRiskCount);
            reportCmd.Parameters.AddWithValue("MediumRiskCount", mediumRiskCount);
            reportCmd.Parameters.AddWithValue("LowRiskCount", lowRiskCount);
            
            var reportDataParam = new NpgsqlParameter("ReportData", NpgsqlTypes.NpgsqlDbType.Jsonb)
            {
                Value = JsonSerializer.Serialize(reportData)
            };
            reportCmd.Parameters.Add(reportDataParam);
            
            reportCmd.Parameters.AddWithValue("GeneratedBy", userId);
            reportCmd.Parameters.AddWithValue("GeneratedAt", DateTime.UtcNow);
            reportCmd.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
            reportCmd.Parameters.AddWithValue("CreatedBy", userId);

            using var reportReader = await reportCmd.ExecuteReaderAsync();
            if (!await reportReader.ReadAsync())
            {
                return StatusCode(500, new { message = "Không thể tạo clinic report" });
            }

            var report = new ClinicReportDto
            {
                Id = reportReader.GetString(0),
                ClinicId = reportReader.GetString(1),
                ReportName = reportReader.GetString(2),
                ReportType = reportReader.GetString(3),
                PeriodStart = reportReader.IsDBNull(4) ? null : reportReader.GetDateTime(4),
                PeriodEnd = reportReader.IsDBNull(5) ? null : reportReader.GetDateTime(5),
                TotalPatients = reportReader.GetInt32(6),
                TotalAnalyses = reportReader.GetInt32(7),
                HighRiskCount = reportReader.GetInt32(8),
                MediumRiskCount = reportReader.GetInt32(9),
                LowRiskCount = reportReader.GetInt32(10),
                ReportData = reportReader.IsDBNull(11) 
                    ? null 
                    : JsonSerializer.Deserialize<Dictionary<string, object>>(reportReader.GetString(11)),
                ReportFileUrl = reportReader.IsDBNull(12) ? null : reportReader.GetString(12),
                GeneratedAt = reportReader.GetDateTime(13)
            };

            _logger.LogInformation("Clinic report generated: {ReportId} for clinic {ClinicId}, Type: {ReportType}", 
                reportId, dto.ClinicId, dto.ReportType);

            // TODO: Export to file (PDF/CSV) if requested
            if (dto.ExportToFile && !string.IsNullOrWhiteSpace(dto.ExportFormat))
            {
                // This can be implemented later using ExportService
                _logger.LogInformation("Export to file requested: {Format}", dto.ExportFormat);
            }

            return CreatedAtAction(nameof(GetReport), new { id = reportId }, report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating clinic report for clinic {ClinicId}", dto.ClinicId);
            return StatusCode(500, new { message = "Không thể generate clinic report" });
        }
    }

    /// <summary>
    /// Get clinic report by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ClinicReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetReport(string id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { message = "Chưa xác thực người dùng" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT cr.Id, cr.ClinicId, cr.ReportName, cr.ReportType, cr.PeriodStart, cr.PeriodEnd,
                       cr.TotalPatients, cr.TotalAnalyses, cr.HighRiskCount, cr.MediumRiskCount, cr.LowRiskCount,
                       cr.ReportData, cr.ReportFileUrl, cr.GeneratedAt
                FROM clinic_reports cr
                WHERE cr.Id = @Id
                    AND COALESCE(cr.IsDeleted, false) = false
                    AND (cr.ClinicId IN (SELECT ClinicId FROM clinic_users WHERE UserId = @UserId)
                         OR cr.ClinicId IN (SELECT ClinicId FROM clinic_doctors WHERE DoctorId = @UserId))";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);
            command.Parameters.AddWithValue("UserId", userId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy clinic report" });
            }

            var report = new ClinicReportDto
            {
                Id = reader.GetString(0),
                ClinicId = reader.GetString(1),
                ReportName = reader.GetString(2),
                ReportType = reader.GetString(3),
                PeriodStart = reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                PeriodEnd = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                TotalPatients = reader.GetInt32(6),
                TotalAnalyses = reader.GetInt32(7),
                HighRiskCount = reader.GetInt32(8),
                MediumRiskCount = reader.GetInt32(9),
                LowRiskCount = reader.GetInt32(10),
                ReportData = reader.IsDBNull(11) 
                    ? null 
                    : JsonSerializer.Deserialize<Dictionary<string, object>>(reader.GetString(11)),
                ReportFileUrl = reader.IsDBNull(12) ? null : reader.GetString(12),
                GeneratedAt = reader.GetDateTime(13)
            };

            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting clinic report {ReportId}", id);
            return StatusCode(500, new { message = "Không thể lấy clinic report" });
        }
    }

    /// <summary>
    /// Get all clinic reports
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ClinicReportDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetReports([FromQuery] string? clinicId = null, [FromQuery] string? reportType = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { message = "Chưa xác thực người dùng" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT cr.Id, cr.ClinicId, cr.ReportName, cr.ReportType, cr.PeriodStart, cr.PeriodEnd,
                       cr.TotalPatients, cr.TotalAnalyses, cr.HighRiskCount, cr.MediumRiskCount, cr.LowRiskCount,
                       cr.ReportData, cr.ReportFileUrl, cr.GeneratedAt
                FROM clinic_reports cr
                WHERE COALESCE(cr.IsDeleted, false) = false
                    AND (cr.ClinicId IN (SELECT ClinicId FROM clinic_users WHERE UserId = @UserId)
                         OR cr.ClinicId IN (SELECT ClinicId FROM clinic_doctors WHERE DoctorId = @UserId))
                    AND (@ClinicId IS NULL OR cr.ClinicId = @ClinicId)
                    AND (@ReportType IS NULL OR cr.ReportType = @ReportType)
                ORDER BY cr.GeneratedAt DESC";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("UserId", userId);
            command.Parameters.AddWithValue("ClinicId", (object?)clinicId ?? DBNull.Value);
            command.Parameters.AddWithValue("ReportType", (object?)reportType ?? DBNull.Value);

            var reports = new List<ClinicReportDto>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                reports.Add(new ClinicReportDto
                {
                    Id = reader.GetString(0),
                    ClinicId = reader.GetString(1),
                    ReportName = reader.GetString(2),
                    ReportType = reader.GetString(3),
                    PeriodStart = reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                    PeriodEnd = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    TotalPatients = reader.GetInt32(6),
                    TotalAnalyses = reader.GetInt32(7),
                    HighRiskCount = reader.GetInt32(8),
                    MediumRiskCount = reader.GetInt32(9),
                    LowRiskCount = reader.GetInt32(10),
                    ReportData = reader.IsDBNull(11) 
                        ? null 
                        : JsonSerializer.Deserialize<Dictionary<string, object>>(reader.GetString(11)),
                    ReportFileUrl = reader.IsDBNull(12) ? null : reader.GetString(12),
                    GeneratedAt = reader.GetDateTime(13)
                });
            }

            return Ok(reports);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting clinic reports");
            return StatusCode(500, new { message = "Không thể lấy danh sách clinic reports" });
        }
    }

    /// <summary>
    /// Export clinic statistics for research (FR-30)
    /// </summary>
    [HttpPost("export-statistics")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ExportStatistics([FromBody] CreateClinicReportDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { message = "Chưa xác thực người dùng" });

        if (string.IsNullOrWhiteSpace(dto.ClinicId))
        {
            return BadRequest(new { message = "ClinicId là bắt buộc" });
        }

        if (string.IsNullOrWhiteSpace(dto.ExportFormat) || !new[] { "PDF", "CSV", "JSON" }.Contains(dto.ExportFormat))
        {
            return BadRequest(new { message = "ExportFormat phải là PDF, CSV hoặc JSON" });
        }

        try
        {
            // Generate report first
            var generateResult = await GenerateReport(dto);
            if (generateResult is not CreatedAtActionResult createdResult || createdResult.Value is not ClinicReportDto report)
            {
                return StatusCode(500, new { message = "Không thể generate report để export" });
            }

            // TODO: Use ExportService to export report to file
            // For now, return report data as JSON
            _logger.LogInformation("Statistics export requested: Clinic {ClinicId}, Format: {Format}", 
                dto.ClinicId, dto.ExportFormat);

            return Ok(new 
            { 
                message = "Statistics export initiated",
                reportId = report.Id,
                format = dto.ExportFormat,
                report = report
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting clinic statistics for clinic {ClinicId}", dto.ClinicId);
            return StatusCode(500, new { message = "Không thể export statistics" });
        }
    }

    #region Private Methods

    private string? GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    #endregion
}
