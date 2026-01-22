using Aura.Application.DTOs.Alerts;
using Aura.Application.Services.Notifications;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Aura.Application.Services.Alerts;

/// <summary>
/// FR-29: High-Risk Patient Alert System
/// Generates alerts for high-risk patients and analyzes abnormal trends
/// </summary>
public class HighRiskAlertService : IHighRiskAlertService
{
    private readonly string _connectionString;
    private readonly INotificationService _notificationService;
    private readonly ILogger<HighRiskAlertService>? _logger;

    public HighRiskAlertService(
        IConfiguration configuration,
        INotificationService notificationService,
        ILogger<HighRiskAlertService>? logger = null)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Database connection string not configured");
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// Check if analysis result indicates high risk and generate alert if needed
    /// </summary>
    public async Task<bool> CheckAndGenerateAlertAsync(string analysisResultId, string userId, string? clinicId = null)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Get analysis result with risk information
            var sql = @"
                SELECT 
                    ar.Id, ar.UserId, ar.OverallRiskLevel, ar.RiskScore,
                    ar.HypertensionRisk, ar.HypertensionScore,
                    ar.DiabetesRisk, ar.DiabetesScore,
                    ar.StrokeRisk, ar.StrokeScore,
                    ar.DiabeticRetinopathyDetected, ar.DiabeticRetinopathySeverity,
                    ar.HealthWarnings, ar.AnalysisCompletedAt,
                    ar.ImageId, ri.ClinicId, ri.DoctorId,
                    u.FirstName, u.LastName, u.Email
                FROM analysis_results ar
                INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
                INNER JOIN users u ON ar.UserId = u.Id
                WHERE ar.Id = @AnalysisResultId 
                    AND ar.IsDeleted = false
                    AND ar.AnalysisStatus = 'Completed'";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("AnalysisResultId", analysisResultId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                _logger?.LogWarning("Analysis result not found: {AnalysisResultId}", analysisResultId);
                return false;
            }

            var overallRiskLevel = reader.IsDBNull(2) ? null : reader.GetString(2);
            var riskScore = reader.IsDBNull(3) ? (decimal?)null : reader.GetDecimal(3);
            var clinicIdFromDb = reader.IsDBNull(15) ? null : reader.GetString(15);
            var doctorId = reader.IsDBNull(16) ? null : reader.GetString(16);

            // Use clinicId from parameter or from database
            var finalClinicId = clinicId ?? clinicIdFromDb;

            // Check if high risk (High or Critical)
            if (overallRiskLevel != "High" && overallRiskLevel != "Critical")
            {
                _logger?.LogDebug("Analysis result {AnalysisResultId} is not high risk: {RiskLevel}", 
                    analysisResultId, overallRiskLevel);
                return false;
            }

            // Check if alert already exists
            var alertExists = await CheckAlertExistsAsync(analysisResultId);
            if (alertExists)
            {
                _logger?.LogDebug("Alert already exists for analysis result: {AnalysisResultId}", analysisResultId);
                return false;
            }

            // Get patient info
            var patientName = $"{reader.GetString(17)} {reader.GetString(18)}".Trim();
            var patientEmail = reader.IsDBNull(19) ? null : reader.GetString(19);
            var hypertensionRisk = reader.IsDBNull(4) ? null : reader.GetString(4);
            var hypertensionScore = reader.IsDBNull(5) ? (decimal?)null : reader.GetDecimal(5);
            var diabetesRisk = reader.IsDBNull(6) ? null : reader.GetString(6);
            var diabetesScore = reader.IsDBNull(7) ? (decimal?)null : reader.GetDecimal(7);
            var strokeRisk = reader.IsDBNull(8) ? null : reader.GetString(8);
            var strokeScore = reader.IsDBNull(9) ? (decimal?)null : reader.GetDecimal(9);
            var diabeticRetinopathyDetected = reader.GetBoolean(10);
            var diabeticRetinopathySeverity = reader.IsDBNull(11) ? null : reader.GetString(11);
            var healthWarnings = reader.IsDBNull(12) ? null : reader.GetString(12);
            var detectedAt = reader.GetDateTime(13);
            var imageId = reader.GetString(14);

            // Create alert record in database
            var alertId = Guid.NewGuid().ToString();
            await CreateAlertRecordAsync(
                alertId, userId, finalClinicId, doctorId, analysisResultId, imageId,
                overallRiskLevel!, riskScore, hypertensionRisk, hypertensionScore,
                diabetesRisk, diabetesScore, strokeRisk, strokeScore,
                diabeticRetinopathyDetected, diabeticRetinopathySeverity,
                healthWarnings, detectedAt);

            // Send notifications to clinic and doctor
            await SendAlertNotificationsAsync(
                finalClinicId, doctorId, userId, patientName, overallRiskLevel!,
                riskScore, analysisResultId);

            _logger?.LogInformation(
                "High-risk alert generated: {AlertId} for patient {PatientId}, Risk: {RiskLevel}",
                alertId, userId, overallRiskLevel);

            return true;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error checking and generating alert for analysis: {AnalysisResultId}", 
                analysisResultId);
            return false;
        }
    }

    private async Task<bool> CheckAlertExistsAsync(string analysisResultId)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT COUNT(*) 
                FROM notifications 
                WHERE NotificationType = 'HighRiskAlert' 
                    AND RelatedEntityId = @AnalysisResultId
                    AND IsDeleted = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("AnalysisResultId", analysisResultId);

            var count = Convert.ToInt32(await command.ExecuteScalarAsync());
            return count > 0;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error checking if alert exists for analysis: {AnalysisResultId}", 
                analysisResultId);
            return false;
        }
    }

    private async Task CreateAlertRecordAsync(
        string alertId, string userId, string? clinicId, string? doctorId,
        string analysisResultId, string imageId, string riskLevel, decimal? riskScore,
        string? hypertensionRisk, decimal? hypertensionScore,
        string? diabetesRisk, decimal? diabetesScore,
        string? strokeRisk, decimal? strokeScore,
        bool diabeticRetinopathyDetected, string? diabeticRetinopathySeverity,
        string? healthWarnings, DateTime detectedAt)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Create notification record for the alert
            var notificationId = Guid.NewGuid().ToString();
            var title = riskLevel == "Critical" 
                ? "Cảnh báo: Bệnh nhân có nguy cơ nghiêm trọng" 
                : "Cảnh báo: Bệnh nhân có nguy cơ cao";
            
            var description = BuildAlertDescription(riskLevel, riskScore, hypertensionRisk, 
                diabetesRisk, strokeRisk, diabeticRetinopathyDetected);

            var alertData = new
            {
                AlertId = alertId,
                AnalysisResultId = analysisResultId,
                ImageId = imageId,
                RiskLevel = riskLevel,
                RiskScore = riskScore,
                HypertensionRisk = hypertensionRisk,
                HypertensionScore = hypertensionScore,
                DiabetesRisk = diabetesRisk,
                DiabetesScore = diabetesScore,
                StrokeRisk = strokeRisk,
                StrokeScore = strokeScore,
                DiabeticRetinopathyDetected = diabeticRetinopathyDetected,
                DiabeticRetinopathySeverity = diabeticRetinopathySeverity,
                HealthWarnings = healthWarnings,
                DetectedAt = detectedAt
            };

            // Create notification for clinic if clinicId exists
            if (!string.IsNullOrEmpty(clinicId))
            {
                await _notificationService.CreateAsync(
                    null, // Clinic notifications don't have a specific user
                    title,
                    description,
                    "HighRiskAlert",
                    alertData);
            }

            // Create notification for doctor if doctorId exists
            if (!string.IsNullOrEmpty(doctorId))
            {
                await _notificationService.CreateAsync(
                    doctorId,
                    title,
                    description,
                    "HighRiskAlert",
                    alertData);
            }

            _logger?.LogDebug("Alert record created: {AlertId}", alertId);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error creating alert record: {AlertId}", alertId);
            throw;
        }
    }

    private string BuildAlertDescription(
        string riskLevel, decimal? riskScore,
        string? hypertensionRisk, string? diabetesRisk, string? strokeRisk,
        bool diabeticRetinopathyDetected)
    {
        var parts = new List<string>();
        
        parts.Add($"Mức rủi ro tổng thể: {riskLevel}");
        if (riskScore.HasValue)
        {
            parts.Add($"Điểm rủi ro: {riskScore.Value:F1}/100");
        }

        if (hypertensionRisk == "High")
        {
            parts.Add("Nguy cơ tăng huyết áp cao");
        }
        if (diabetesRisk == "High")
        {
            parts.Add("Nguy cơ tiểu đường cao");
        }
        if (strokeRisk == "High")
        {
            parts.Add("Nguy cơ đột quỵ cao");
        }
        if (diabeticRetinopathyDetected)
        {
            parts.Add("Phát hiện bệnh võng mạc đái tháo đường");
        }

        return string.Join(". ", parts);
    }

    private async Task SendAlertNotificationsAsync(
        string? clinicId, string? doctorId, string userId, string patientName,
        string riskLevel, decimal? riskScore, string analysisResultId)
    {
        try
        {
            // Notification is already created in CreateAlertRecordAsync
            // This method can be extended for additional notification channels (email, SMS, etc.)
            _logger?.LogDebug("Alert notifications sent for analysis: {AnalysisResultId}", analysisResultId);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error sending alert notifications for analysis: {AnalysisResultId}", 
                analysisResultId);
        }
    }

    /// <summary>
    /// Get all high-risk alerts for a clinic
    /// </summary>
    public async Task<List<HighRiskAlertDto>> GetClinicAlertsAsync(string clinicId, bool unacknowledgedOnly = false, int limit = 50)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT DISTINCT
                    n.Id, ar.UserId, u.FirstName, u.LastName, u.Email,
                    ri.ClinicId, c.ClinicName, ri.DoctorId, d.FirstName || ' ' || d.LastName as DoctorName,
                    ar.Id as AnalysisResultId, ar.ImageId,
                    ar.OverallRiskLevel, ar.RiskScore,
                    ar.HypertensionRisk, ar.HypertensionScore,
                    ar.DiabetesRisk, ar.DiabetesScore,
                    ar.StrokeRisk, ar.StrokeScore,
                    ar.DiabeticRetinopathyDetected, ar.DiabeticRetinopathySeverity,
                    ar.HealthWarnings, ar.AnalysisCompletedAt as DetectedAt,
                    n.IsRead as IsAcknowledged, n.ReadAt as AcknowledgedAt, n.UpdatedBy as AcknowledgedBy
                FROM notifications n
                INNER JOIN analysis_results ar ON n.RelatedEntityId = ar.Id
                INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
                INNER JOIN users u ON ar.UserId = u.Id
                LEFT JOIN clinics c ON ri.ClinicId = c.Id
                LEFT JOIN doctors d ON ri.DoctorId = d.Id
                WHERE n.NotificationType = 'HighRiskAlert'
                    AND ri.ClinicId = @ClinicId
                    AND n.IsDeleted = false
                    AND ar.IsDeleted = false
                    AND (ar.OverallRiskLevel = 'High' OR ar.OverallRiskLevel = 'Critical')";

            if (unacknowledgedOnly)
            {
                sql += " AND n.IsRead = false";
            }

            sql += " ORDER BY ar.AnalysisCompletedAt DESC LIMIT @Limit";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("ClinicId", clinicId);
            command.Parameters.AddWithValue("Limit", limit);

            var alerts = new List<HighRiskAlertDto>();

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                alerts.Add(MapToAlertDto(reader));
            }

            return alerts;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic alerts for clinic: {ClinicId}", clinicId);
            return new List<HighRiskAlertDto>();
        }
    }

    /// <summary>
    /// Get all high-risk alerts for a doctor
    /// </summary>
    public async Task<List<HighRiskAlertDto>> GetDoctorAlertsAsync(string doctorId, bool unacknowledgedOnly = false, int limit = 50)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT DISTINCT
                    n.Id, ar.UserId, u.FirstName, u.LastName, u.Email,
                    ri.ClinicId, c.ClinicName, ri.DoctorId, d.FirstName || ' ' || d.LastName as DoctorName,
                    ar.Id as AnalysisResultId, ar.ImageId,
                    ar.OverallRiskLevel, ar.RiskScore,
                    ar.HypertensionRisk, ar.HypertensionScore,
                    ar.DiabetesRisk, ar.DiabetesScore,
                    ar.StrokeRisk, ar.StrokeScore,
                    ar.DiabeticRetinopathyDetected, ar.DiabeticRetinopathySeverity,
                    ar.HealthWarnings, ar.AnalysisCompletedAt as DetectedAt,
                    n.IsRead as IsAcknowledged, n.ReadAt as AcknowledgedAt, n.UpdatedBy as AcknowledgedBy
                FROM notifications n
                INNER JOIN analysis_results ar ON n.RelatedEntityId = ar.Id
                INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
                INNER JOIN users u ON ar.UserId = u.Id
                LEFT JOIN clinics c ON ri.ClinicId = c.Id
                LEFT JOIN doctors d ON ri.DoctorId = d.Id
                WHERE n.NotificationType = 'HighRiskAlert'
                    AND (ri.DoctorId = @DoctorId OR n.DoctorId = @DoctorId)
                    AND n.IsDeleted = false
                    AND ar.IsDeleted = false
                    AND (ar.OverallRiskLevel = 'High' OR ar.OverallRiskLevel = 'Critical')";

            if (unacknowledgedOnly)
            {
                sql += " AND n.IsRead = false";
            }

            sql += " ORDER BY ar.AnalysisCompletedAt DESC LIMIT @Limit";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("DoctorId", doctorId);
            command.Parameters.AddWithValue("Limit", limit);

            var alerts = new List<HighRiskAlertDto>();

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                alerts.Add(MapToAlertDto(reader));
            }

            return alerts;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting doctor alerts for doctor: {DoctorId}", doctorId);
            return new List<HighRiskAlertDto>();
        }
    }

    private HighRiskAlertDto MapToAlertDto(NpgsqlDataReader reader)
    {
        return new HighRiskAlertDto
        {
            Id = reader.GetString(0),
            PatientUserId = reader.GetString(1),
            PatientName = $"{reader.GetString(2)} {reader.GetString(3)}".Trim(),
            PatientEmail = reader.IsDBNull(4) ? null : reader.GetString(4),
            ClinicId = reader.IsDBNull(5) ? null : reader.GetString(5),
            ClinicName = reader.IsDBNull(6) ? null : reader.GetString(6),
            DoctorId = reader.IsDBNull(7) ? null : reader.GetString(7),
            DoctorName = reader.IsDBNull(8) ? null : reader.GetString(8),
            AnalysisResultId = reader.GetString(9),
            ImageId = reader.GetString(10),
            OverallRiskLevel = reader.GetString(11),
            RiskScore = reader.IsDBNull(12) ? null : reader.GetDecimal(12),
            HypertensionRisk = reader.IsDBNull(13) ? null : reader.GetString(13),
            HypertensionScore = reader.IsDBNull(14) ? null : reader.GetDecimal(14),
            DiabetesRisk = reader.IsDBNull(15) ? null : reader.GetString(15),
            DiabetesScore = reader.IsDBNull(16) ? null : reader.GetDecimal(16),
            StrokeRisk = reader.IsDBNull(17) ? null : reader.GetString(17),
            StrokeScore = reader.IsDBNull(18) ? null : reader.GetDecimal(18),
            DiabeticRetinopathyDetected = reader.GetBoolean(19),
            DiabeticRetinopathySeverity = reader.IsDBNull(20) ? null : reader.GetString(20),
            HealthWarnings = reader.IsDBNull(21) ? null : reader.GetString(21),
            DetectedAt = reader.GetDateTime(22),
            IsAcknowledged = reader.GetBoolean(23),
            AcknowledgedAt = reader.IsDBNull(24) ? null : reader.GetDateTime(24),
            AcknowledgedBy = reader.IsDBNull(25) ? null : reader.GetString(25)
        };
    }

    /// <summary>
    /// Get alert summary for a clinic
    /// </summary>
    public async Task<ClinicAlertSummaryDto?> GetClinicAlertSummaryAsync(string clinicId)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Get clinic name
            var clinicNameSql = "SELECT ClinicName FROM clinics WHERE Id = @ClinicId AND IsDeleted = false";
            using var clinicCommand = new NpgsqlCommand(clinicNameSql, connection);
            clinicCommand.Parameters.AddWithValue("ClinicId", clinicId);
            var clinicName = await clinicCommand.ExecuteScalarAsync() as string ?? "Unknown Clinic";

            // Get summary statistics
            var summarySql = @"
                SELECT 
                    COUNT(DISTINCT ar.UserId) FILTER (WHERE ar.OverallRiskLevel = 'High') as HighRiskCount,
                    COUNT(DISTINCT ar.UserId) FILTER (WHERE ar.OverallRiskLevel = 'Critical') as CriticalRiskCount,
                    COUNT(DISTINCT n.Id) FILTER (WHERE n.IsRead = false) as UnacknowledgedCount,
                    MAX(ar.AnalysisCompletedAt) as LastAlertDate
                FROM notifications n
                INNER JOIN analysis_results ar ON n.RelatedEntityId = ar.Id
                INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
                WHERE n.NotificationType = 'HighRiskAlert'
                    AND ri.ClinicId = @ClinicId
                    AND n.IsDeleted = false
                    AND ar.IsDeleted = false
                    AND (ar.OverallRiskLevel = 'High' OR ar.OverallRiskLevel = 'Critical')";

            using var summaryCommand = new NpgsqlCommand(summarySql, connection);
            summaryCommand.Parameters.AddWithValue("ClinicId", clinicId);

            using var reader = await summaryCommand.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return new ClinicAlertSummaryDto
                {
                    ClinicId = clinicId,
                    ClinicName = clinicName,
                    TotalHighRiskPatients = 0,
                    TotalCriticalRiskPatients = 0,
                    UnacknowledgedAlerts = 0,
                    RecentAlerts = new List<HighRiskAlertDto>(),
                    LastAlertDate = DateTime.MinValue
                };
            }

            var highRiskCount = reader.GetInt32(0);
            var criticalRiskCount = reader.GetInt32(1);
            var unacknowledgedCount = reader.GetInt32(2);
            var lastAlertDate = reader.IsDBNull(3) ? DateTime.MinValue : reader.GetDateTime(3);

            // Get recent alerts
            var recentAlerts = await GetClinicAlertsAsync(clinicId, unacknowledgedOnly: false, limit: 10);

            return new ClinicAlertSummaryDto
            {
                ClinicId = clinicId,
                ClinicName = clinicName,
                TotalHighRiskPatients = highRiskCount,
                TotalCriticalRiskPatients = criticalRiskCount,
                UnacknowledgedAlerts = unacknowledgedCount,
                RecentAlerts = recentAlerts,
                LastAlertDate = lastAlertDate
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic alert summary for clinic: {ClinicId}", clinicId);
            return null;
        }
    }

    /// <summary>
    /// Get risk trend for a patient
    /// </summary>
    public async Task<PatientRiskTrendDto?> GetPatientRiskTrendAsync(string patientUserId, int days = 90)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Get patient info
            var patientSql = "SELECT FirstName, LastName FROM users WHERE Id = @UserId AND IsDeleted = false";
            using var patientCommand = new NpgsqlCommand(patientSql, connection);
            patientCommand.Parameters.AddWithValue("UserId", patientUserId);
            var patientName = "Unknown";
            using (var reader = await patientCommand.ExecuteReaderAsync())
            {
                if (await reader.ReadAsync())
                {
                    patientName = $"{reader.GetString(0)} {reader.GetString(1)}".Trim();
                }
            }

            // Get analysis history
            var trendSql = $@"
                SELECT 
                    ar.Id, ar.OverallRiskLevel, ar.RiskScore, ar.AnalysisCompletedAt
                FROM analysis_results ar
                WHERE ar.UserId = @UserId
                    AND ar.IsDeleted = false
                    AND ar.AnalysisStatus = 'Completed'
                    AND ar.AnalysisCompletedAt >= CURRENT_DATE - INTERVAL '{days} days'
                ORDER BY ar.AnalysisCompletedAt ASC";

            using var trendCommand = new NpgsqlCommand(trendSql, connection);
            trendCommand.Parameters.AddWithValue("UserId", patientUserId);

            var trendPoints = new List<RiskTrendPointDto>();
            string? currentRiskLevel = null;
            decimal? currentRiskScore = null;
            DateTime? lastAnalysisDate = null;

            using var reader = await trendCommand.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var analysisId = reader.GetString(0);
                var riskLevel = reader.IsDBNull(1) ? null : reader.GetString(1);
                var riskScore = reader.IsDBNull(2) ? null : reader.GetDecimal(2);
                var analysisDate = reader.GetDateTime(3);

                trendPoints.Add(new RiskTrendPointDto
                {
                    AnalysisDate = analysisDate,
                    RiskLevel = riskLevel ?? "Unknown",
                    RiskScore = riskScore,
                    AnalysisResultId = analysisId
                });

                currentRiskLevel = riskLevel;
                currentRiskScore = riskScore;
                lastAnalysisDate = analysisDate;
            }

            if (trendPoints.Count == 0)
            {
                return null;
            }

            // Calculate trend direction
            var trendDirection = CalculateTrendDirection(trendPoints);
            var daysSinceLastAnalysis = lastAnalysisDate.HasValue
                ? (int)(DateTime.UtcNow - lastAnalysisDate.Value).TotalDays
                : 0;

            return new PatientRiskTrendDto
            {
                PatientUserId = patientUserId,
                PatientName = patientName,
                TrendPoints = trendPoints,
                CurrentRiskLevel = currentRiskLevel ?? "Unknown",
                CurrentRiskScore = currentRiskScore,
                TrendDirection = trendDirection,
                DaysSinceLastAnalysis = daysSinceLastAnalysis,
                TotalAnalyses = trendPoints.Count
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting patient risk trend for patient: {PatientUserId}", patientUserId);
            return null;
        }
    }

    private string CalculateTrendDirection(List<RiskTrendPointDto> trendPoints)
    {
        if (trendPoints.Count < 2)
        {
            return "Stable";
        }

        var firstHalf = trendPoints.Take(trendPoints.Count / 2).ToList();
        var secondHalf = trendPoints.Skip(trendPoints.Count / 2).ToList();

        var firstAvg = firstHalf.Where(p => p.RiskScore.HasValue).Average(p => (double)p.RiskScore!.Value);
        var secondAvg = secondHalf.Where(p => p.RiskScore.HasValue).Average(p => (double)p.RiskScore!.Value);

        if (secondAvg > firstAvg + 5) // Threshold: 5 points increase
        {
            return "Worsening";
        }
        else if (secondAvg < firstAvg - 5) // Threshold: 5 points decrease
        {
            return "Improving";
        }
        else
        {
            return "Stable";
        }
    }

    /// <summary>
    /// Detect abnormal trends for patients in a clinic
    /// </summary>
    public async Task<List<AbnormalTrendDto>> DetectAbnormalTrendsAsync(string clinicId, int days = 30)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Get all patients in clinic with multiple analyses
            var sql = $@"
                SELECT DISTINCT ar.UserId
                FROM analysis_results ar
                INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
                WHERE ri.ClinicId = @ClinicId
                    AND ar.IsDeleted = false
                    AND ar.AnalysisStatus = 'Completed'
                    AND ar.AnalysisCompletedAt >= CURRENT_DATE - INTERVAL '{days} days'
                GROUP BY ar.UserId
                HAVING COUNT(*) >= 2";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("ClinicId", clinicId);

            var patientIds = new List<string>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                patientIds.Add(reader.GetString(0));
            }

            var abnormalTrends = new List<AbnormalTrendDto>();

            // Analyze each patient's trend
            foreach (var patientId in patientIds)
            {
                var trend = await GetPatientRiskTrendAsync(patientId, days);
                if (trend == null || trend.TrendPoints.Count < 2)
                {
                    continue;
                }

                var trendAnalysis = AnalyzeAbnormalTrend(trend);
                if (trendAnalysis != null)
                {
                    abnormalTrends.Add(trendAnalysis);
                }
            }

            return abnormalTrends.OrderByDescending(t => t.DetectedAt).ToList();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error detecting abnormal trends for clinic: {ClinicId}", clinicId);
            return new List<AbnormalTrendDto>();
        }
    }

    private AbnormalTrendDto? AnalyzeAbnormalTrend(PatientRiskTrendDto trend)
    {
        if (trend.TrendPoints.Count < 2)
        {
            return null;
        }

        var points = trend.TrendPoints.OrderBy(p => p.AnalysisDate).ToList();
        var firstPoint = points.First();
        var lastPoint = points.Last();

        // Check for rapid deterioration (risk score increased by 20+ points)
        if (firstPoint.RiskScore.HasValue && lastPoint.RiskScore.HasValue)
        {
            var scoreIncrease = lastPoint.RiskScore.Value - firstPoint.RiskScore.Value;
            if (scoreIncrease >= 20)
            {
                return new AbnormalTrendDto
                {
                    PatientUserId = trend.PatientUserId,
                    PatientName = trend.PatientName,
                    TrendType = "RapidDeterioration",
                    Description = $"Nguy cơ tăng nhanh từ {firstPoint.RiskScore.Value:F1} lên {lastPoint.RiskScore.Value:F1} điểm",
                    PreviousRiskScore = firstPoint.RiskScore,
                    CurrentRiskScore = lastPoint.RiskScore,
                    PreviousRiskLevel = firstPoint.RiskLevel,
                    CurrentRiskLevel = lastPoint.RiskLevel,
                    DaysBetweenAnalyses = (int)(lastPoint.AnalysisDate - firstPoint.AnalysisDate).TotalDays,
                    DetectedAt = DateTime.UtcNow,
                    TrendHistory = trend.TrendPoints
                };
            }
        }

        // Check for sudden spike (risk level jumped from Low/Medium to High/Critical)
        var riskLevels = new[] { "Low", "Medium", "High", "Critical" };
        var firstIndex = Array.IndexOf(riskLevels, firstPoint.RiskLevel);
        var lastIndex = Array.IndexOf(riskLevels, lastPoint.RiskLevel);

        if (firstIndex >= 0 && lastIndex >= 0 && lastIndex - firstIndex >= 2)
        {
            return new AbnormalTrendDto
            {
                PatientUserId = trend.PatientUserId,
                PatientName = trend.PatientName,
                TrendType = "SuddenSpike",
                Description = $"Mức rủi ro tăng đột ngột từ {firstPoint.RiskLevel} lên {lastPoint.RiskLevel}",
                PreviousRiskScore = firstPoint.RiskScore,
                CurrentRiskScore = lastPoint.RiskScore,
                PreviousRiskLevel = firstPoint.RiskLevel,
                CurrentRiskLevel = lastPoint.RiskLevel,
                DaysBetweenAnalyses = (int)(lastPoint.AnalysisDate - firstPoint.AnalysisDate).TotalDays,
                DetectedAt = DateTime.UtcNow,
                TrendHistory = trend.TrendPoints
            };
        }

        // Check for consistent high risk (all recent analyses are High or Critical)
        var highRiskCount = points.Count(p => p.RiskLevel == "High" || p.RiskLevel == "Critical");
        if (highRiskCount == points.Count && points.Count >= 3)
        {
            return new AbnormalTrendDto
            {
                PatientUserId = trend.PatientUserId,
                PatientName = trend.PatientName,
                TrendType = "ConsistentHigh",
                Description = $"Nguy cơ cao liên tục trong {points.Count} lần phân tích gần đây",
                PreviousRiskScore = firstPoint.RiskScore,
                CurrentRiskScore = lastPoint.RiskScore,
                PreviousRiskLevel = firstPoint.RiskLevel,
                CurrentRiskLevel = lastPoint.RiskLevel,
                DaysBetweenAnalyses = (int)(lastPoint.AnalysisDate - firstPoint.AnalysisDate).TotalDays,
                DetectedAt = DateTime.UtcNow,
                TrendHistory = trend.TrendPoints
            };
        }

        return null;
    }

    /// <summary>
    /// Acknowledge an alert
    /// </summary>
    public async Task<bool> AcknowledgeAlertAsync(string alertId, string acknowledgedBy)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE notifications 
                SET IsRead = true, 
                    ReadAt = CURRENT_TIMESTAMP,
                    UpdatedBy = @AcknowledgedBy,
                    UpdatedDate = CURRENT_DATE
                WHERE Id = @AlertId 
                    AND NotificationType = 'HighRiskAlert'
                    AND IsDeleted = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("AlertId", alertId);
            command.Parameters.AddWithValue("AcknowledgedBy", acknowledgedBy);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected > 0)
            {
                _logger?.LogInformation("Alert acknowledged: {AlertId} by {AcknowledgedBy}", alertId, acknowledgedBy);
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error acknowledging alert: {AlertId}", alertId);
            return false;
        }
    }

    /// <summary>
    /// Get high-risk patients for a clinic
    /// </summary>
    public async Task<List<HighRiskAlertDto>> GetHighRiskPatientsAsync(string clinicId, string? riskLevel = null)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT DISTINCT ON (ar.UserId)
                    n.Id, ar.UserId, u.FirstName, u.LastName, u.Email,
                    ri.ClinicId, c.ClinicName, ri.DoctorId, d.FirstName || ' ' || d.LastName as DoctorName,
                    ar.Id as AnalysisResultId, ar.ImageId,
                    ar.OverallRiskLevel, ar.RiskScore,
                    ar.HypertensionRisk, ar.HypertensionScore,
                    ar.DiabetesRisk, ar.DiabetesScore,
                    ar.StrokeRisk, ar.StrokeScore,
                    ar.DiabeticRetinopathyDetected, ar.DiabeticRetinopathySeverity,
                    ar.HealthWarnings, ar.AnalysisCompletedAt as DetectedAt,
                    n.IsRead as IsAcknowledged, n.ReadAt as AcknowledgedAt, n.UpdatedBy as AcknowledgedBy
                FROM notifications n
                INNER JOIN analysis_results ar ON n.RelatedEntityId = ar.Id
                INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
                INNER JOIN users u ON ar.UserId = u.Id
                LEFT JOIN clinics c ON ri.ClinicId = c.Id
                LEFT JOIN doctors d ON ri.DoctorId = d.Id
                WHERE n.NotificationType = 'HighRiskAlert'
                    AND ri.ClinicId = @ClinicId
                    AND n.IsDeleted = false
                    AND ar.IsDeleted = false
                    AND (ar.OverallRiskLevel = 'High' OR ar.OverallRiskLevel = 'Critical')";

            if (!string.IsNullOrEmpty(riskLevel))
            {
                sql += " AND ar.OverallRiskLevel = @RiskLevel";
            }

            sql += " ORDER BY ar.UserId, ar.AnalysisCompletedAt DESC";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("ClinicId", clinicId);
            if (!string.IsNullOrEmpty(riskLevel))
            {
                command.Parameters.AddWithValue("RiskLevel", riskLevel);
            }

            var alerts = new List<HighRiskAlertDto>();

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                alerts.Add(MapToAlertDto(reader));
            }

            return alerts;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting high-risk patients for clinic: {ClinicId}", clinicId);
            return new List<HighRiskAlertDto>();
        }
    }
}
