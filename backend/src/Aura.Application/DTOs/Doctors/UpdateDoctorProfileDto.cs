namespace Aura.Application.DTOs.Doctors;

/// <summary>
/// DTO cho cập nhật profile bác sĩ
/// </summary>
public class UpdateDoctorProfileDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public string? Specialization { get; set; }
    public int? YearsOfExperience { get; set; }
    public string? Qualification { get; set; }
    public string? HospitalAffiliation { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string? Bio { get; set; }
}
