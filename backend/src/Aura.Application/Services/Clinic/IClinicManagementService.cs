using Aura.Application.DTOs.Clinic;

namespace Aura.Application.Services.Clinic;

public interface IClinicManagementService
{
    #region Dashboard
    
    /// <summary>
    /// Get clinic dashboard statistics
    /// </summary>
    Task<ClinicDashboardStatsDto> GetDashboardStatsAsync(string clinicId);

    /// <summary>
    /// Get recent clinic activity
    /// </summary>
    Task<List<ClinicActivityDto>> GetRecentActivityAsync(string clinicId, int limit = 10);

    #endregion

    #region Doctor Management

    /// <summary>
    /// Get all doctors in clinic
    /// </summary>
    Task<List<ClinicDoctorDto>> GetDoctorsAsync(string clinicId, string? search = null, bool? isActive = null);

    /// <summary>
    /// Get doctor by ID
    /// </summary>
    Task<ClinicDoctorDto?> GetDoctorByIdAsync(string clinicId, string doctorId);

    /// <summary>
    /// Add doctor to clinic (create new or link existing)
    /// </summary>
    Task<(bool Success, string Message, ClinicDoctorDto? Doctor)> AddDoctorAsync(string clinicId, AddClinicDoctorDto dto);

    /// <summary>
    /// Update doctor info
    /// </summary>
    Task<(bool Success, string Message)> UpdateDoctorAsync(string clinicId, string doctorId, UpdateClinicDoctorDto dto);

    /// <summary>
    /// Remove doctor from clinic (deactivate)
    /// </summary>
    Task<(bool Success, string Message)> RemoveDoctorAsync(string clinicId, string doctorId);

    /// <summary>
    /// Set doctor as primary
    /// </summary>
    Task<(bool Success, string Message)> SetPrimaryDoctorAsync(string clinicId, string doctorId);

    #endregion

    #region Patient Management

    /// <summary>
    /// Get all patients in clinic
    /// </summary>
    Task<List<ClinicPatientDto>> GetPatientsAsync(string clinicId, string? search = null, string? doctorId = null, string? riskLevel = null, bool? isActive = null);

    /// <summary>
    /// Get patient by ID
    /// </summary>
    Task<ClinicPatientDto?> GetPatientByIdAsync(string clinicId, string patientId);

    /// <summary>
    /// Register patient to clinic (create new or link existing)
    /// </summary>
    Task<(bool Success, string Message, ClinicPatientDto? Patient)> RegisterPatientAsync(string clinicId, RegisterClinicPatientDto dto);

    /// <summary>
    /// Update patient info
    /// </summary>
    Task<(bool Success, string Message)> UpdatePatientAsync(string clinicId, string patientId, UpdateClinicPatientDto dto);

    /// <summary>
    /// Remove patient from clinic
    /// </summary>
    Task<(bool Success, string Message)> RemovePatientAsync(string clinicId, string patientId);

    /// <summary>
    /// Assign doctor to patient
    /// </summary>
    Task<(bool Success, string Message)> AssignDoctorToPatientAsync(string clinicId, string patientId, AssignDoctorDto dto);

    #endregion
}
