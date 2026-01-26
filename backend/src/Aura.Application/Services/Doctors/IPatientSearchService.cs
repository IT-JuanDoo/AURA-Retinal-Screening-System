using Aura.Application.DTOs.Doctors;

namespace Aura.Application.Services.Doctors;

/// <summary>
/// Service interface for patient search and filtering
/// </summary>
public interface IPatientSearchService
{
    /// <summary>
    /// Search and filter patients assigned to a doctor
    /// </summary>
    Task<PatientSearchResponseDto> SearchPatientsAsync(
        string doctorId,
        PatientSearchDto searchDto);
}
