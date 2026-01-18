using Hangfire;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Aura.API.Services.BackgroundJobs;

/// <summary>
/// Background Worker Service cho High-Risk Patient Alerts (FR-29)
/// Sử dụng Hangfire để check high-risk patients định kỳ và gửi alerts
/// </summary>
public class RiskAlertWorker
{
    private readonly ILogger<RiskAlertWorker> _logger;
    private readonly IConfiguration _configuration;
    private readonly string _connectionString;

    public RiskAlertWorker(
        ILogger<RiskAlertWorker> logger,
        IConfiguration configuration)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string not configured");
    }

    /// <summary>
    /// Check high-risk patients and send alerts (FR-29)
    /// Recurring job chạy mỗi giờ
    /// 
    /// Giá trị: Proactive alerts, early intervention, better patient care
    /// </summary>
    [AutomaticRetry(Attempts = 2)]
    public async Task CheckHighRiskPatientsAsync()
    {
        _logger.LogInformation("[Hangfire] Starting high-risk patient check...");

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Find high-risk patients (High or Critical risk level)
            // Check analyses completed in the last 24 hours
            var sql = @"
                SELECT DISTINCT
                    ar.UserId,
                    u.Email,
                    u.FirstName,
                    u.LastName,
                    ar.Id as AnalysisId,
                    ar.OverallRiskLevel,
                    ar.RiskScore,
                    ar.AnalysisCompletedAt,
                    ri.ClinicId,
                    c.ClinicName
                FROM analysis_results ar
                INNER JOIN users u ON ar.UserId = u.Id
                LEFT JOIN retinal_images ri ON ar.ImageId = ri.Id
                LEFT JOIN clinics c ON ri.ClinicId = c.Id
                WHERE ar.OverallRiskLevel IN ('High', 'Critical')
                    AND ar.AnalysisStatus = 'Completed'
                    AND ar.AnalysisCompletedAt >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
                    AND COALESCE(ar.IsDeleted, false) = false
                    AND COALESCE(u.IsDeleted, false) = false
                    AND u.IsActive = true
                    AND NOT EXISTS (
                        SELECT 1 FROM notifications n
                        WHERE n.UserId = ar.UserId
                            AND n.NotificationType = 'HighRiskAlert'
                            AND n.RelatedEntityId = ar.Id
                            AND n.CreatedDate >= CURRENT_DATE - INTERVAL '1 day'
                            AND COALESCE(n.IsDeleted, false) = false
                    )";

            using var command = new NpgsqlCommand(sql, connection);
            var alertsCreated = 0;

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var userId = reader.GetString(0);
                var email = reader.IsDBNull(1) ? null : reader.GetString(1);
                var firstName = reader.IsDBNull(2) ? null : reader.GetString(2);
                var lastName = reader.IsDBNull(3) ? null : reader.GetString(3);
                var analysisId = reader.GetString(4);
                var riskLevel = reader.GetString(5);
                var riskScore = reader.IsDBNull(6) ? 0m : reader.GetDecimal(6);
                var completedAt = reader.GetDateTime(7);
                var clinicId = reader.IsDBNull(8) ? null : reader.GetString(8);
                var clinicName = reader.IsDBNull(9) ? null : reader.GetString(9);

                reader.Close();

                // Create notification for patient
                await CreateHighRiskNotificationAsync(connection, userId, analysisId, riskLevel, riskScore);

                // Create notification for clinic if patient belongs to clinic
                if (!string.IsNullOrEmpty(clinicId))
                {
                    await CreateClinicAlertAsync(connection, clinicId, userId, analysisId, riskLevel, firstName, lastName);
                }

                // Create notification for assigned doctors
                await CreateDoctorAlertsAsync(connection, userId, analysisId, riskLevel, firstName, lastName);

                alertsCreated++;
                _logger.LogInformation("High-risk alert created for user {UserId}, Analysis {AnalysisId}, Risk: {RiskLevel}", 
                    userId, analysisId, riskLevel);
            }

            _logger.LogInformation("[Hangfire] High-risk patient check completed. Alerts created: {Count}", alertsCreated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Hangfire] Error checking high-risk patients");
            throw; // Hangfire will retry automatically
        }
    }

    /// <summary>
    /// Check for abnormal trends (e.g., sudden increase in risk level)
    /// Recurring job chạy mỗi ngày lúc 6:00 AM
    /// </summary>
    [AutomaticRetry(Attempts = 2)]
    public async Task CheckAbnormalTrendsAsync()
    {
        _logger.LogInformation("[Hangfire] Starting abnormal trends check...");

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Find patients with sudden risk level increase
            // Compare current analysis with previous analysis
            var sql = @"
                WITH ranked_analyses AS (
                    SELECT 
                        ar.UserId,
                        ar.Id as AnalysisId,
                        ar.OverallRiskLevel,
                        ar.RiskScore,
                        ar.AnalysisCompletedAt,
                        LAG(ar.OverallRiskLevel) OVER (PARTITION BY ar.UserId ORDER BY ar.AnalysisCompletedAt) as PreviousRiskLevel,
                        LAG(ar.RiskScore) OVER (PARTITION BY ar.UserId ORDER BY ar.AnalysisCompletedAt) as PreviousRiskScore
                    FROM analysis_results ar
                    WHERE ar.AnalysisStatus = 'Completed'
                        AND ar.AnalysisCompletedAt >= CURRENT_TIMESTAMP - INTERVAL '7 days'
                        AND COALESCE(ar.IsDeleted, false) = false
                )
                SELECT UserId, AnalysisId, OverallRiskLevel, RiskScore, PreviousRiskLevel, PreviousRiskScore
                FROM ranked_analyses
                WHERE OverallRiskLevel IN ('High', 'Critical')
                    AND PreviousRiskLevel IN ('Low', 'Medium')
                    AND RiskScore > COALESCE(PreviousRiskScore, 0) + 20";

            using var command = new NpgsqlCommand(sql, connection);
            var trendsDetected = 0;

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var userId = reader.GetString(0);
                var analysisId = reader.GetString(1);
                var currentRisk = reader.GetString(2);
                var currentScore = reader.GetDecimal(3);
                var previousRisk = reader.IsDBNull(4) ? null : reader.GetString(4);
                var previousScore = reader.IsDBNull(5) ? null : (decimal?)reader.GetDecimal(5);

                reader.Close();

                // Create trend alert notification
                await CreateTrendAlertNotificationAsync(connection, userId, analysisId, currentRisk, currentScore, previousRisk, previousScore);

                trendsDetected++;
                _logger.LogInformation("Abnormal trend detected for user {UserId}, Analysis {AnalysisId}, Risk increased from {PreviousRisk} to {CurrentRisk}", 
                    userId, analysisId, previousRisk ?? "N/A", currentRisk);
            }

            _logger.LogInformation("[Hangfire] Abnormal trends check completed. Trends detected: {Count}", trendsDetected);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Hangfire] Error checking abnormal trends");
            throw;
        }
    }

    private async Task CreateHighRiskNotificationAsync(
        NpgsqlConnection connection, 
        string userId, 
        string analysisId, 
        string riskLevel, 
        decimal riskScore)
    {
        var notificationId = Guid.NewGuid().ToString();
        var title = riskLevel == "Critical" 
            ? "Cảnh báo: Mức độ rủi ro nghiêm trọng" 
            : "Cảnh báo: Mức độ rủi ro cao";
        var message = $"Kết quả phân tích của bạn cho thấy mức độ rủi ro {riskLevel.ToLower()} (điểm số: {riskScore:F1}). Vui lòng tham khảo ý kiến bác sĩ.";

        var sql = @"
            INSERT INTO notifications
            (Id, UserId, NotificationType, Title, Description, RelatedEntityId, RelatedEntityType,
             IsRead, CreatedDate, IsDeleted)
            VALUES
            (@Id, @UserId, @NotificationType, @Title, @Description, @RelatedEntityId, @RelatedEntityType,
             false, @CreatedDate, false)";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", notificationId);
        command.Parameters.AddWithValue("UserId", userId);
        command.Parameters.AddWithValue("NotificationType", "HighRiskAlert");
        command.Parameters.AddWithValue("Title", title);
        command.Parameters.AddWithValue("Message", message);
        command.Parameters.AddWithValue("RelatedEntityId", analysisId);
        command.Parameters.AddWithValue("RelatedEntityType", "AnalysisResult");
        command.Parameters.AddWithValue("CreatedAt", DateTime.UtcNow);
        command.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);

        await command.ExecuteNonQueryAsync();
    }

    private async Task CreateClinicAlertAsync(
        NpgsqlConnection connection,
        string clinicId,
        string userId,
        string analysisId,
        string riskLevel,
        string? firstName,
        string? lastName)
    {
        // Get clinic users (admins/managers) to notify
        var clinicUsersSql = @"
            SELECT DISTINCT UserId FROM clinic_users
            WHERE ClinicId = @ClinicId
                AND COALESCE(IsDeleted, false) = false";

        using var clinicUsersCmd = new NpgsqlCommand(clinicUsersSql, connection);
        clinicUsersCmd.Parameters.AddWithValue("ClinicId", clinicId);

        var clinicUserIds = new List<string>();
        using (var clinicUsersReader = await clinicUsersCmd.ExecuteReaderAsync())
        {
            while (await clinicUsersReader.ReadAsync())
            {
                clinicUserIds.Add(clinicUsersReader.GetString(0));
            }
        }

        foreach (var clinicUserId in clinicUserIds)
        {
            var notificationId = Guid.NewGuid().ToString();
            var patientName = $"{firstName} {lastName}".Trim();
            var title = $"Cảnh báo: Bệnh nhân có rủi ro {riskLevel.ToLower()}";
            var message = $"Bệnh nhân {patientName} (ID: {userId.Substring(0, 8)}) có kết quả phân tích với mức độ rủi ro {riskLevel.ToLower()}. Vui lòng xem xét.";

            var sql = @"
                INSERT INTO notifications
                (Id, UserId, NotificationType, Title, Description, RelatedEntityId, RelatedEntityType,
                 IsRead, CreatedDate, IsDeleted)
                VALUES
                (@Id, @UserId, @NotificationType, @Title, @Description, @RelatedEntityId, @RelatedEntityType,
                 false, @CreatedDate, false)";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", notificationId);
            command.Parameters.AddWithValue("UserId", clinicUserId);
            command.Parameters.AddWithValue("NotificationType", "HighRiskAlert");
            command.Parameters.AddWithValue("Title", title);
            command.Parameters.AddWithValue("Description", message);
            command.Parameters.AddWithValue("RelatedEntityId", analysisId);
            command.Parameters.AddWithValue("RelatedEntityType", "AnalysisResult");
            command.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);

            await command.ExecuteNonQueryAsync();
        }
    }

    private async Task CreateDoctorAlertsAsync(
        NpgsqlConnection connection,
        string userId,
        string analysisId,
        string riskLevel,
        string? firstName,
        string? lastName)
    {
        // Get assigned doctors for this patient
        var doctorsSql = @"
            SELECT DISTINCT DoctorId FROM patient_doctor_assignments
            WHERE UserId = @UserId
                AND IsActive = true
                AND COALESCE(IsDeleted, false) = false";

        using var doctorsCmd = new NpgsqlCommand(doctorsSql, connection);
        doctorsCmd.Parameters.AddWithValue("UserId", userId);

        var doctorIds = new List<string>();
        using (var doctorsReader = await doctorsCmd.ExecuteReaderAsync())
        {
            while (await doctorsReader.ReadAsync())
            {
                doctorIds.Add(doctorsReader.GetString(0));
            }
        }

        foreach (var doctorId in doctorIds)
        {
            var notificationId = Guid.NewGuid().ToString();
            var patientName = $"{firstName} {lastName}".Trim();
            var title = $"Cảnh báo: Bệnh nhân có rủi ro {riskLevel.ToLower()}";
            var message = $"Bệnh nhân {patientName} (ID: {userId.Substring(0, 8)}) được bạn quản lý có kết quả phân tích với mức độ rủi ro {riskLevel.ToLower()}. Vui lòng xem xét.";

            var sql = @"
                INSERT INTO notifications
                (Id, UserId, NotificationType, Title, Description, RelatedEntityId, RelatedEntityType,
                 IsRead, CreatedDate, IsDeleted)
                VALUES
                (@Id, @UserId, @NotificationType, @Title, @Description, @RelatedEntityId, @RelatedEntityType,
                 false, @CreatedDate, false)";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", notificationId);
            command.Parameters.AddWithValue("UserId", doctorId);
            command.Parameters.AddWithValue("NotificationType", "HighRiskAlert");
            command.Parameters.AddWithValue("Title", title);
            command.Parameters.AddWithValue("Description", message);
            command.Parameters.AddWithValue("RelatedEntityId", analysisId);
            command.Parameters.AddWithValue("RelatedEntityType", "AnalysisResult");
            command.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);

            await command.ExecuteNonQueryAsync();
        }
    }

    private async Task CreateTrendAlertNotificationAsync(
        NpgsqlConnection connection,
        string userId,
        string analysisId,
        string currentRisk,
        decimal currentScore,
        string? previousRisk,
        decimal? previousScore)
    {
        var notificationId = Guid.NewGuid().ToString();
        var title = "Cảnh báo: Xu hướng bất thường";
        var message = $"Phát hiện sự gia tăng đáng kể về mức độ rủi ro từ {previousRisk ?? "N/A"} lên {currentRisk} (điểm số: {previousScore?.ToString("F1") ?? "N/A"} → {currentScore:F1}). Vui lòng theo dõi.";

        var sql = @"
            INSERT INTO notifications
            (Id, UserId, NotificationType, Title, Description, RelatedEntityId, RelatedEntityType,
             IsRead, CreatedDate, IsDeleted)
            VALUES
            (@Id, @UserId, @NotificationType, @Title, @Description, @RelatedEntityId, @RelatedEntityType,
             false, @CreatedDate, false)";

        using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("Id", notificationId);
        command.Parameters.AddWithValue("UserId", userId);
        command.Parameters.AddWithValue("NotificationType", "AbnormalTrendAlert");
        command.Parameters.AddWithValue("Title", title);
        command.Parameters.AddWithValue("Message", message);
        command.Parameters.AddWithValue("RelatedEntityId", analysisId);
        command.Parameters.AddWithValue("RelatedEntityType", "AnalysisResult");
        command.Parameters.AddWithValue("CreatedAt", DateTime.UtcNow);
        command.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);

        await command.ExecuteNonQueryAsync();
    }
}
