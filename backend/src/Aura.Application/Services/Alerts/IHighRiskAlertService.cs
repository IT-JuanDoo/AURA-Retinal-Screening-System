using Aura.Application.DTOs.Alerts;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Aura.Application.Services.Alerts;

public interface IHighRiskAlertService
{
    /// <summary>
    /// Check if analysis result indicates high risk and generate alert if needed
    /// </summary>
    Task<bool> CheckAndGenerateAlertAsync(string analysisResultId, string userId, string? clinicId = null);

    /// <summary>
    /// Get all high-risk alerts for a clinic
    /// </summary>
    Task<List<HighRiskAlertDto>> GetClinicAlertsAsync(string clinicId, bool unacknowledgedOnly = false, int limit = 50);

    /// <summary>
    /// Get all high-risk alerts for a doctor
    /// </summary>
    Task<List<HighRiskAlertDto>> GetDoctorAlertsAsync(string doctorId, bool unacknowledgedOnly = false, int limit = 50);

    /// <summary>
    /// Get alert summary for a clinic
    /// </summary>
    Task<ClinicAlertSummaryDto?> GetClinicAlertSummaryAsync(string clinicId);

    /// <summary>
    /// Get risk trend for a patient
    /// </summary>
    Task<PatientRiskTrendDto?> GetPatientRiskTrendAsync(string patientUserId, int days = 90);

    /// <summary>
    /// Detect abnormal trends for patients in a clinic
    /// </summary>
    Task<List<AbnormalTrendDto>> DetectAbnormalTrendsAsync(string clinicId, int days = 30);

    /// <summary>
    /// Acknowledge an alert
    /// </summary>
    Task<bool> AcknowledgeAlertAsync(string alertId, string acknowledgedBy);

    /// <summary>
    /// Get high-risk patients for a clinic
    /// </summary>
    Task<List<HighRiskAlertDto>> GetHighRiskPatientsAsync(string clinicId, string? riskLevel = null);
}
