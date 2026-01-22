using Aura.Application.DTOs.Alerts;
using Aura.Application.Services.Alerts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Aura.API.Controllers;

/// <summary>
/// FR-29: High-Risk Patient Alert System API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AlertsController : ControllerBase
{
    private readonly IHighRiskAlertService _alertService;
    private readonly ILogger<AlertsController>? _logger;

    public AlertsController(
        IHighRiskAlertService alertService,
        ILogger<AlertsController>? logger = null)
    {
        _alertService = alertService;
        _logger = logger;
    }

    /// <summary>
    /// Get all high-risk alerts for the current clinic
    /// </summary>
    [HttpGet("clinic")]
    public async Task<ActionResult<List<HighRiskAlertDto>>> GetClinicAlerts(
        [FromQuery] bool unacknowledgedOnly = false,
        [FromQuery] int limit = 50)
    {
        try
        {
            var clinicId = User.FindFirstValue("ClinicId") 
                ?? User.FindFirstValue("clinic_id")
                ?? throw new UnauthorizedAccessException("Clinic ID not found in token");

            var alerts = await _alertService.GetClinicAlertsAsync(clinicId, unacknowledgedOnly, limit);
            return Ok(alerts);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic alerts");
            return StatusCode(500, new { message = "Error retrieving alerts" });
        }
    }

    /// <summary>
    /// Get alert summary for the current clinic
    /// </summary>
    [HttpGet("clinic/summary")]
    public async Task<ActionResult<ClinicAlertSummaryDto>> GetClinicAlertSummary()
    {
        try
        {
            var clinicId = User.FindFirstValue("ClinicId") 
                ?? User.FindFirstValue("clinic_id")
                ?? throw new UnauthorizedAccessException("Clinic ID not found in token");

            var summary = await _alertService.GetClinicAlertSummaryAsync(clinicId);
            if (summary == null)
            {
                return NotFound(new { message = "Clinic not found" });
            }

            return Ok(summary);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic alert summary");
            return StatusCode(500, new { message = "Error retrieving alert summary" });
        }
    }

    /// <summary>
    /// Get all high-risk alerts for the current doctor
    /// </summary>
    [HttpGet("doctor")]
    public async Task<ActionResult<List<HighRiskAlertDto>>> GetDoctorAlerts(
        [FromQuery] bool unacknowledgedOnly = false,
        [FromQuery] int limit = 50)
    {
        try
        {
            var doctorId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.FindFirstValue("id")
                ?? throw new UnauthorizedAccessException("Doctor ID not found in token");

            var alerts = await _alertService.GetDoctorAlertsAsync(doctorId, unacknowledgedOnly, limit);
            return Ok(alerts);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting doctor alerts");
            return StatusCode(500, new { message = "Error retrieving alerts" });
        }
    }

    /// <summary>
    /// Get risk trend for a patient
    /// </summary>
    [HttpGet("patient/{patientUserId}/trend")]
    public async Task<ActionResult<PatientRiskTrendDto>> GetPatientRiskTrend(
        string patientUserId,
        [FromQuery] int days = 90)
    {
        try
        {
            var trend = await _alertService.GetPatientRiskTrendAsync(patientUserId, days);
            if (trend == null)
            {
                return NotFound(new { message = "Patient trend data not found" });
            }

            return Ok(trend);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting patient risk trend for patient: {PatientUserId}", patientUserId);
            return StatusCode(500, new { message = "Error retrieving patient trend" });
        }
    }

    /// <summary>
    /// Detect abnormal trends for patients in the current clinic
    /// </summary>
    [HttpGet("clinic/abnormal-trends")]
    public async Task<ActionResult<List<AbnormalTrendDto>>> DetectAbnormalTrends(
        [FromQuery] int days = 30)
    {
        try
        {
            var clinicId = User.FindFirstValue("ClinicId") 
                ?? User.FindFirstValue("clinic_id")
                ?? throw new UnauthorizedAccessException("Clinic ID not found in token");

            var trends = await _alertService.DetectAbnormalTrendsAsync(clinicId, days);
            return Ok(trends);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error detecting abnormal trends");
            return StatusCode(500, new { message = "Error detecting abnormal trends" });
        }
    }

    /// <summary>
    /// Acknowledge an alert
    /// </summary>
    [HttpPost("{alertId}/acknowledge")]
    public async Task<IActionResult> AcknowledgeAlert(string alertId)
    {
        try
        {
            var acknowledgedBy = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.FindFirstValue("id")
                ?? "Unknown";

            var success = await _alertService.AcknowledgeAlertAsync(alertId, acknowledgedBy);
            if (!success)
            {
                return NotFound(new { message = "Alert not found" });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error acknowledging alert: {AlertId}", alertId);
            return StatusCode(500, new { message = "Error acknowledging alert" });
        }
    }

    /// <summary>
    /// Get high-risk patients for the current clinic
    /// </summary>
    [HttpGet("clinic/high-risk-patients")]
    public async Task<ActionResult<List<HighRiskAlertDto>>> GetHighRiskPatients(
        [FromQuery] string? riskLevel = null)
    {
        try
        {
            var clinicId = User.FindFirstValue("ClinicId") 
                ?? User.FindFirstValue("clinic_id")
                ?? throw new UnauthorizedAccessException("Clinic ID not found in token");

            var patients = await _alertService.GetHighRiskPatientsAsync(clinicId, riskLevel);
            return Ok(patients);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting high-risk patients");
            return StatusCode(500, new { message = "Error retrieving high-risk patients" });
        }
    }
}
