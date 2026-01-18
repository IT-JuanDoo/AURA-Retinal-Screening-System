namespace Aura.Application.DTOs.Doctors;

/// <summary>
/// DTO cho thông tin bác sĩ
/// </summary>
public class DoctorDto
{
    public string Id { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public string LicenseNumber { get; set; } = string.Empty;
    public string? Specialization { get; set; }
    public int? YearsOfExperience { get; set; }
    public string? Qualification { get; set; }
    public string? HospitalAffiliation { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string? Bio { get; set; }
    public bool IsVerified { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
}
