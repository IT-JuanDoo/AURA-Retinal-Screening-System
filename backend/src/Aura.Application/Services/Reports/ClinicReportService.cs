using Aura.Application.DTOs.Clinic;
using Aura.Application.Services.Export;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System.Text.Json;

namespace Aura.Application.Services.Reports;

/// <summary>
/// Service implementation cho Clinic Report Generation (FR-26)
/// </summary>
public class ClinicReportService : IClinicReportService
{
    private readonly string _connectionString;
    private readonly ILogger<ClinicReportService>? _logger;
    private readonly IExportService _exportService;

    public ClinicReportService(
        IConfiguration configuration,
        IExportService exportService,
        ILogger<ClinicReportService>? logger = null)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Database connection string not configured");
        _exportService = exportService ?? throw new ArgumentNullException(nameof(exportService));
        _logger = logger;
    }

    public async Task<ClinicReportDto> GenerateReportAsync(CreateClinicReportDto dto, string userId)
    {
        if (string.IsNullOrWhiteSpace(dto.ClinicId))
            throw new ArgumentException("ClinicId is required", nameof(dto));

        if (!new[] { "ScreeningCampaign", "RiskDistribution", "MonthlySummary", "AnnualReport", "Custom" }.Contains(dto.ReportType))
            throw new ArgumentException("Invalid ReportType", nameof(dto));

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Verify user has access to clinic
            await VerifyClinicAccessAsync(connection, dto.ClinicId, userId);

            // Calculate period if not provided
            var periodStart = dto.PeriodStart ?? DateTime.UtcNow.AddMonths(-1).Date;
            var periodEnd = dto.PeriodEnd ?? DateTime.UtcNow.Date;

            // Generate report statistics
            var stats = await GetReportStatisticsAsync(connection, dto.ClinicId, periodStart, periodEnd);

            // Get detailed statistics
            var dailyStats = await GetDailyStatisticsAsync(connection, dto.ClinicId, periodStart, periodEnd);

            // Prepare report data
            var reportData = new Dictionary<string, object>
            {
                ["periodStart"] = periodStart.ToString("yyyy-MM-dd"),
                ["periodEnd"] = periodEnd.ToString("yyyy-MM-dd"),
                ["totalPatients"] = stats.TotalPatients,
                ["totalAnalyses"] = stats.TotalAnalyses,
                ["highRiskCount"] = stats.HighRiskCount,
                ["mediumRiskCount"] = stats.MediumRiskCount,
                ["lowRiskCount"] = stats.LowRiskCount,
                ["riskDistribution"] = new Dictionary<string, object>
                {
                    ["high"] = stats.TotalAnalyses > 0 ? Math.Round((double)stats.HighRiskCount / stats.TotalAnalyses * 100, 2) : 0,
                    ["medium"] = stats.TotalAnalyses > 0 ? Math.Round((double)stats.MediumRiskCount / stats.TotalAnalyses * 100, 2) : 0,
                    ["low"] = stats.TotalAnalyses > 0 ? Math.Round((double)stats.LowRiskCount / stats.TotalAnalyses * 100, 2) : 0
                },
                ["dailyStatistics"] = dailyStats
            };

            // Add type-specific data
            if (dto.ReportType == "ScreeningCampaign")
            {
                reportData["campaignData"] = await GetCampaignDataAsync(connection, dto.ClinicId, periodStart, periodEnd);
            }
            else if (dto.ReportType == "RiskDistribution")
            {
                reportData["riskBreakdown"] = await GetRiskBreakdownAsync(connection, dto.ClinicId, periodStart, periodEnd);
            }

            // Create clinic report record
            var reportId = Guid.NewGuid().ToString();
            var report = await SaveReportAsync(connection, reportId, dto, stats, reportData, periodStart, periodEnd, userId);

            _logger?.LogInformation("Clinic report generated: {ReportId} for clinic {ClinicId}, Type: {ReportType}",
                reportId, dto.ClinicId, dto.ReportType);

            return report;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error generating clinic report for clinic {ClinicId}", dto.ClinicId);
            throw;
        }
    }

    public async Task<ClinicReportDto?> GetReportByIdAsync(string reportId, string userId)
    {
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
            command.Parameters.AddWithValue("Id", reportId);
            command.Parameters.AddWithValue("UserId", userId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
                return null;

            return MapReaderToReportDto(reader);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic report {ReportId}", reportId);
            throw;
        }
    }

    public async Task<List<ClinicReportDto>> GetReportsAsync(string userId, string? clinicId = null, string? reportType = null)
    {
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
                reports.Add(MapReaderToReportDto(reader));
            }

            return reports;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic reports");
            throw;
        }
    }

    public async Task<string?> ExportReportAsync(string reportId, string format, string userId)
    {
        var report = await GetReportByIdAsync(reportId, userId);
        if (report == null)
            throw new InvalidOperationException("Report not found");

        // TODO: Implement export using ExportService
        // For now, return null
        _logger?.LogInformation("Export requested for report {ReportId}, format: {Format}", reportId, format);
        return null;
    }

    public async Task<ClinicInfoDto?> GetClinicInfoAsync(string clinicId, string userId)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Verify access
            await VerifyClinicAccessAsync(connection, clinicId, userId);

            var sql = @"
                SELECT Id, ClinicName, Email, Phone, Address
                FROM clinics
                WHERE Id = @ClinicId AND COALESCE(IsDeleted, false) = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("ClinicId", clinicId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
                return null;

            return new ClinicInfoDto
            {
                Id = reader.GetString(0),
                ClinicName = reader.GetString(1),
                Email = reader.GetString(2),
                Phone = reader.IsDBNull(3) ? null : reader.GetString(3),
                Address = reader.IsDBNull(4) ? string.Empty : reader.GetString(4)
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic info for clinic {ClinicId}", clinicId);
            throw;
        }
    }

    public List<ReportTemplateDto> GetReportTemplates()
    {
        return new List<ReportTemplateDto>
        {
            new ReportTemplateDto
            {
                Type = "ScreeningCampaign",
                Name = "Báo cáo Chiến dịch Sàng lọc",
                Description = "Báo cáo tổng hợp về chiến dịch sàng lọc trong khoảng thời gian",
                Icon = "campaign",
                RequiresPeriod = true
            },
            new ReportTemplateDto
            {
                Type = "RiskDistribution",
                Name = "Báo cáo Phân bố Rủi ro",
                Description = "Phân tích phân bố mức độ rủi ro của bệnh nhân",
                Icon = "risk",
                RequiresPeriod = true
            },
            new ReportTemplateDto
            {
                Type = "MonthlySummary",
                Name = "Báo cáo Tổng hợp Tháng",
                Description = "Báo cáo tổng hợp hoạt động trong tháng",
                Icon = "calendar",
                RequiresPeriod = false
            },
            new ReportTemplateDto
            {
                Type = "AnnualReport",
                Name = "Báo cáo Tổng hợp Năm",
                Description = "Báo cáo tổng hợp hoạt động trong năm",
                Icon = "year",
                RequiresPeriod = false
            },
            new ReportTemplateDto
            {
                Type = "Custom",
                Name = "Báo cáo Tùy chỉnh",
                Description = "Tạo báo cáo với khoảng thời gian tùy chỉnh",
                Icon = "custom",
                RequiresPeriod = true
            }
        };
    }

    #region Private Methods

    private async Task VerifyClinicAccessAsync(NpgsqlConnection connection, string clinicId, string userId)
    {
        var verifySql = @"
            SELECT Id FROM clinics 
            WHERE Id = @ClinicId 
                AND (Id IN (SELECT ClinicId FROM clinic_users WHERE UserId = @UserId) 
                     OR Id IN (SELECT ClinicId FROM clinic_doctors WHERE DoctorId = @UserId))
                AND COALESCE(IsDeleted, false) = false";

        using var verifyCmd = new NpgsqlCommand(verifySql, connection);
        verifyCmd.Parameters.AddWithValue("ClinicId", clinicId);
        verifyCmd.Parameters.AddWithValue("UserId", userId);

        var hasAccess = await verifyCmd.ExecuteScalarAsync();
        if (hasAccess == null)
            throw new UnauthorizedAccessException("Không có quyền truy cập clinic này");
    }

    private async Task<(int TotalPatients, int TotalAnalyses, int HighRiskCount, int MediumRiskCount, int LowRiskCount)> 
        GetReportStatisticsAsync(NpgsqlConnection connection, string clinicId, DateTime periodStart, DateTime periodEnd)
    {
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
        statsCmd.Parameters.AddWithValue("ClinicId", clinicId);
        statsCmd.Parameters.AddWithValue("PeriodStart", periodStart);
        statsCmd.Parameters.AddWithValue("PeriodEnd", periodEnd.AddDays(1).AddSeconds(-1));

        using var statsReader = await statsCmd.ExecuteReaderAsync();
        if (!await statsReader.ReadAsync())
            return (0, 0, 0, 0, 0);

        return (
            statsReader.GetInt32(0),
            statsReader.GetInt32(1),
            statsReader.GetInt32(2),
            statsReader.GetInt32(3),
            statsReader.GetInt32(4)
        );
    }

    private async Task<List<Dictionary<string, object>>> GetDailyStatisticsAsync(
        NpgsqlConnection connection, string clinicId, DateTime periodStart, DateTime periodEnd)
    {
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
        detailedStatsCmd.Parameters.AddWithValue("ClinicId", clinicId);
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

        return dailyStats;
    }

    private async Task<Dictionary<string, object>> GetCampaignDataAsync(
        NpgsqlConnection connection, string clinicId, DateTime periodStart, DateTime periodEnd)
    {
        // Additional campaign-specific data
        return new Dictionary<string, object>
        {
            ["campaignPeriod"] = $"{periodStart:yyyy-MM-dd} to {periodEnd:yyyy-MM-dd}",
            ["totalScreened"] = 0 // Can be enhanced with actual campaign data
        };
    }

    private async Task<Dictionary<string, object>> GetRiskBreakdownAsync(
        NpgsqlConnection connection, string clinicId, DateTime periodStart, DateTime periodEnd)
    {
        var riskBreakdownSql = @"
            SELECT 
                ar.OverallRiskLevel,
                COUNT(*) as Count
            FROM analysis_results ar
            INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
            WHERE ri.ClinicId = @ClinicId
                AND ar.AnalysisCompletedAt >= @PeriodStart
                AND ar.AnalysisCompletedAt <= @PeriodEnd
                AND COALESCE(ar.IsDeleted, false) = false
                AND ar.AnalysisStatus = 'Completed'
            GROUP BY ar.OverallRiskLevel";

        using var riskCmd = new NpgsqlCommand(riskBreakdownSql, connection);
        riskCmd.Parameters.AddWithValue("ClinicId", clinicId);
        riskCmd.Parameters.AddWithValue("PeriodStart", periodStart);
        riskCmd.Parameters.AddWithValue("PeriodEnd", periodEnd.AddDays(1).AddSeconds(-1));

        var breakdown = new Dictionary<string, object>();
        using var reader = await riskCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            breakdown[reader.GetString(0)] = reader.GetInt32(1);
        }

        return breakdown;
    }

    private async Task<ClinicReportDto> SaveReportAsync(
        NpgsqlConnection connection,
        string reportId,
        CreateClinicReportDto dto,
        (int TotalPatients, int TotalAnalyses, int HighRiskCount, int MediumRiskCount, int LowRiskCount) stats,
        Dictionary<string, object> reportData,
        DateTime periodStart,
        DateTime periodEnd,
        string userId)
    {
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
        reportCmd.Parameters.AddWithValue("TotalPatients", stats.TotalPatients);
        reportCmd.Parameters.AddWithValue("TotalAnalyses", stats.TotalAnalyses);
        reportCmd.Parameters.AddWithValue("HighRiskCount", stats.HighRiskCount);
        reportCmd.Parameters.AddWithValue("MediumRiskCount", stats.MediumRiskCount);
        reportCmd.Parameters.AddWithValue("LowRiskCount", stats.LowRiskCount);

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
            throw new InvalidOperationException("Failed to create clinic report");

        return MapReaderToReportDto(reportReader);
    }

    private ClinicReportDto MapReaderToReportDto(NpgsqlDataReader reader)
    {
        return new ClinicReportDto
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
    }

    #endregion
}
