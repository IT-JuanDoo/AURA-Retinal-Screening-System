namespace Aura.API.Admin;

public record AdminLoginRequest(string Email, string Password);

public record AdminLoginResponse(
    string AccessToken,
    int ExpiresInMinutes,
    AdminProfileDto Admin
);

public record AdminProfileDto(
    string Id,
    string Email,
    string? FirstName,
    string? LastName,
    bool IsSuperAdmin,
    bool IsActive
);

public record AdminUserRowDto(
    string Id,
    string Email,
    string? Username,
    string? FirstName,
    string? LastName,
    bool IsEmailVerified,
    bool IsActive
);

public record AdminDoctorRowDto(
    string Id,
    string Email,
    string? Username,
    string? FirstName,
    string? LastName,
    string LicenseNumber,
    bool IsVerified,
    bool IsActive
);

public record AdminClinicRowDto(
    string Id,
    string ClinicName,
    string Email,
    string? Phone,
    string Address,
    string VerificationStatus,
    bool IsActive
);

public class AdminUpdateUserDto
{
    public string? Username { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public DateTime? Dob { get; set; }
    public bool? IsEmailVerified { get; set; }
    public bool? IsActive { get; set; }
    public string? Note { get; set; }
}

public class AdminUpdateDoctorDto
{
    public string? Username { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public string? LicenseNumber { get; set; }
    public string? Specialization { get; set; }
    public int? YearsOfExperience { get; set; }
    public bool? IsVerified { get; set; }
    public bool? IsActive { get; set; }
    public string? Note { get; set; }
}

public class AdminCreateClinicDto
{
    public string Id { get; set; } = string.Empty;
    public string ClinicName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Country { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? ContactPersonName { get; set; }
    public string? ContactPersonPhone { get; set; }
    public string? ClinicType { get; set; }
    public string? VerificationStatus { get; set; }
    public bool? IsActive { get; set; }
    public string? Note { get; set; }
}

public class AdminUpdateClinicDto
{
    public string? ClinicName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? ContactPersonName { get; set; }
    public string? ContactPersonPhone { get; set; }
    public string? ClinicType { get; set; }
    public string? VerificationStatus { get; set; }
    public bool? IsActive { get; set; }
    public string? Note { get; set; }
}


