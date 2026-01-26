namespace Aura.Application.DTOs.Auth;

public class RegisterDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    
    /// <summary>
    /// User type: "patient" (default) or "doctor"
    /// </summary>
    public string UserType { get; set; } = "patient";
    
    // Doctor-specific fields (only used when UserType = "doctor")
    public string? LicenseNumber { get; set; }
    public string? Specialization { get; set; }
    public int? YearsOfExperience { get; set; }
    public string? Qualification { get; set; }
    public string? HospitalAffiliation { get; set; }
}

