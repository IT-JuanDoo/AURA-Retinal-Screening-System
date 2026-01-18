namespace Aura.Application.DTOs.Doctors;

/// <summary>
/// DTO cho danh sách bệnh nhân được assign cho bác sĩ
/// </summary>
public class PatientListItemDto
{
    public string UserId { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? Dob { get; set; }
    public string? Gender { get; set; }
    public string? ProfileImageUrl { get; set; }
    public DateTime AssignedAt { get; set; }
    public string? ClinicId { get; set; }
    public string? ClinicName { get; set; }
    public int AnalysisCount { get; set; }
    public int MedicalNotesCount { get; set; }
}
