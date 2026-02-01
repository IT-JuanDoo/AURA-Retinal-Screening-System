using System.Security.Claims;
using Aura.Application.DTOs.Clinic;
using Aura.Application.Services.Clinic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aura.API.Controllers;

/// <summary>
/// Controller for clinic doctor and patient management (FR-23)
/// </summary>
[ApiController]
[Route("api/clinic")]
[Authorize]
public class ClinicManagementController : ControllerBase
{
    private readonly IClinicManagementService _clinicManagementService;
    private readonly ILogger<ClinicManagementController> _logger;

    public ClinicManagementController(
        IClinicManagementService clinicManagementService,
        ILogger<ClinicManagementController> logger)
    {
        _clinicManagementService = clinicManagementService;
        _logger = logger;
    }

    #region Dashboard

    /// <summary>
    /// Get clinic dashboard statistics
    /// </summary>
    [HttpGet("dashboard/stats")]
    [ProducesResponseType(typeof(ClinicDashboardStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboardStats()
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var stats = await _clinicManagementService.GetDashboardStatsAsync(clinicId);
        return Ok(stats);
    }

    /// <summary>
    /// Get recent clinic activity. Optional search filters by patient name or email.
    /// </summary>
    [HttpGet("dashboard/activity")]
    [ProducesResponseType(typeof(List<ClinicActivityDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecentActivity([FromQuery] int limit = 10, [FromQuery] string? search = null)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var activity = await _clinicManagementService.GetRecentActivityAsync(clinicId, limit, search);
        return Ok(activity);
    }

    #endregion

    #region Doctor Management

    /// <summary>
    /// Get all doctors in clinic
    /// </summary>
    [HttpGet("doctors")]
    [ProducesResponseType(typeof(List<ClinicDoctorDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDoctors([FromQuery] string? search, [FromQuery] bool? isActive)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var doctors = await _clinicManagementService.GetDoctorsAsync(clinicId, search, isActive);
        return Ok(doctors);
    }

    /// <summary>
    /// Get doctor by ID
    /// </summary>
    [HttpGet("doctors/{doctorId}")]
    [ProducesResponseType(typeof(ClinicDoctorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDoctor(string doctorId)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var doctor = await _clinicManagementService.GetDoctorByIdAsync(clinicId, doctorId);
        if (doctor == null)
            return NotFound(new { message = "Không tìm thấy bác sĩ" });

        return Ok(doctor);
    }

    /// <summary>
    /// Add doctor to clinic
    /// </summary>
    [HttpPost("doctors")]
    [ProducesResponseType(typeof(ClinicDoctorDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddDoctor([FromBody] AddClinicDoctorDto dto)
    {
        if (!ModelState.IsValid)
        {
            var firstError = ModelState
                .Where(x => x.Value?.Errors?.Count > 0)
                .SelectMany(x => x.Value!.Errors.Select(e => e.ErrorMessage))
                .FirstOrDefault();
            return BadRequest(new { message = firstError ?? "Dữ liệu không hợp lệ", errors = ModelState });
        }

        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return StatusCode(403, new { message = "Vui lòng đăng nhập bằng tài khoản phòng khám để thêm bác sĩ." });

        try
        {
            var (success, message, doctor) = await _clinicManagementService.AddDoctorAsync(clinicId, dto);
            
            if (!success)
                return BadRequest(new { message });

            return CreatedAtAction(nameof(GetDoctor), new { doctorId = doctor?.DoctorId }, doctor);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AddDoctor failed for clinic {ClinicId}", clinicId);
            return StatusCode(500, new { message = "Đã xảy ra lỗi khi thêm bác sĩ. Vui lòng thử lại sau." });
        }
    }

    /// <summary>
    /// Update doctor info
    /// </summary>
    [HttpPut("doctors/{doctorId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDoctor(string doctorId, [FromBody] UpdateClinicDoctorDto dto)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var (success, message) = await _clinicManagementService.UpdateDoctorAsync(clinicId, doctorId, dto);
        
        if (!success)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    /// <summary>
    /// Remove doctor from clinic
    /// </summary>
    [HttpDelete("doctors/{doctorId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveDoctor(string doctorId)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var (success, message) = await _clinicManagementService.RemoveDoctorAsync(clinicId, doctorId);
        
        if (!success)
            return NotFound(new { message });

        return Ok(new { message });
    }

    /// <summary>
    /// Set doctor as primary
    /// </summary>
    [HttpPut("doctors/{doctorId}/set-primary")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetPrimaryDoctor(string doctorId)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var (success, message) = await _clinicManagementService.SetPrimaryDoctorAsync(clinicId, doctorId);
        
        if (!success)
            return NotFound(new { message });

        return Ok(new { message });
    }

    #endregion

    #region Patient Management

    /// <summary>
    /// Get all patients in clinic
    /// </summary>
    [HttpGet("patients")]
    [ProducesResponseType(typeof(List<ClinicPatientDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPatients(
        [FromQuery] string? search,
        [FromQuery] string? doctorId,
        [FromQuery] string? riskLevel,
        [FromQuery] bool? isActive)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var patients = await _clinicManagementService.GetPatientsAsync(clinicId, search, doctorId, riskLevel, isActive);
        return Ok(patients);
    }

    /// <summary>
    /// Get patient by ID
    /// </summary>
    [HttpGet("patients/{patientId}")]
    [ProducesResponseType(typeof(ClinicPatientDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPatient(string patientId)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var patient = await _clinicManagementService.GetPatientByIdAsync(clinicId, patientId);
        if (patient == null)
            return NotFound(new { message = "Không tìm thấy bệnh nhân" });

        return Ok(patient);
    }

    /// <summary>
    /// Register patient to clinic
    /// </summary>
    [HttpPost("patients")]
    [ProducesResponseType(typeof(ClinicPatientDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RegisterPatient([FromBody] RegisterClinicPatientDto dto)
    {
        if (!ModelState.IsValid)
        {
            var firstError = ModelState
                .Where(x => x.Value?.Errors?.Count > 0)
                .SelectMany(x => x.Value!.Errors.Select(e => e.ErrorMessage))
                .FirstOrDefault();
            return BadRequest(new { message = firstError ?? "Dữ liệu không hợp lệ", errors = ModelState });
        }

        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return StatusCode(403, new { message = "Vui lòng đăng nhập bằng tài khoản phòng khám để thêm bệnh nhân." });

        try
        {
            var (success, message, patient) = await _clinicManagementService.RegisterPatientAsync(clinicId, dto);
            
            if (!success)
                return BadRequest(new { message });

            return CreatedAtAction(nameof(GetPatient), new { patientId = patient?.UserId }, patient);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RegisterPatient failed for clinic {ClinicId}", clinicId);
            return StatusCode(500, new { message = "Đã xảy ra lỗi khi thêm bệnh nhân. Vui lòng thử lại sau." });
        }
    }

    /// <summary>
    /// Update patient info
    /// </summary>
    [HttpPut("patients/{patientId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePatient(string patientId, [FromBody] UpdateClinicPatientDto dto)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var (success, message) = await _clinicManagementService.UpdatePatientAsync(clinicId, patientId, dto);
        
        if (!success)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    /// <summary>
    /// Remove patient from clinic
    /// </summary>
    [HttpDelete("patients/{patientId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemovePatient(string patientId)
    {
        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var (success, message) = await _clinicManagementService.RemovePatientAsync(clinicId, patientId);
        
        if (!success)
            return NotFound(new { message });

        return Ok(new { message });
    }

    /// <summary>
    /// Assign doctor to patient
    /// </summary>
    [HttpPost("patients/{patientId}/assign-doctor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AssignDoctorToPatient(string patientId, [FromBody] AssignDoctorDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var clinicId = GetCurrentClinicId();
        if (clinicId == null)
            return Forbid();

        var (success, message) = await _clinicManagementService.AssignDoctorToPatientAsync(clinicId, patientId, dto);
        
        if (!success)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    #endregion

    #region Helpers

    private string? GetCurrentClinicId()
    {
        // For clinic admins, get clinic_id from token
        var clinicId = User.FindFirstValue("clinic_id");
        if (!string.IsNullOrEmpty(clinicId))
            return clinicId;

        // Check if user type is ClinicAdmin
        var userType = User.FindFirstValue("user_type");
        if (userType != "ClinicAdmin")
        {
            _logger.LogWarning("Non-clinic user attempted to access clinic management");
            return null;
        }

        return null;
    }

    #endregion
}
