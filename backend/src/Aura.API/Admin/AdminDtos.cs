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

// =====================================================
// AI Configuration DTOs (FR-33)
// =====================================================

public record AIConfigurationRowDto(
    string Id,
    string ConfigurationName,
    string ConfigurationType,
    string? ModelVersionId,
    string ParameterKey,
    string ParameterValue,
    string? ParameterDataType,
    string? Description,
    bool IsActive,
    DateTime? AppliedAt,
    string? AppliedBy,
    DateTime? CreatedDate,
    string? CreatedBy
);

public class CreateAIConfigurationDto
{
    public string ConfigurationName { get; set; } = string.Empty;
    public string ConfigurationType { get; set; } = string.Empty; // Threshold, Parameter, Policy, Retraining
    public string? ModelVersionId { get; set; }
    public string ParameterKey { get; set; } = string.Empty;
    public string ParameterValue { get; set; } = string.Empty;
    public string? ParameterDataType { get; set; } // Number, String, Boolean, JSON
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Note { get; set; }
}

public class UpdateAIConfigurationDto
{
    public string? ConfigurationName { get; set; }
    public string? ConfigurationType { get; set; }
    public string? ModelVersionId { get; set; }
    public string? ParameterKey { get; set; }
    public string? ParameterValue { get; set; }
    public string? ParameterDataType { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public string? Note { get; set; }
}

// =====================================================
// Service Package DTOs (FR-34)
// =====================================================

public record ServicePackageRowDto(
    string Id,
    string PackageName,
    string PackageType,
    string? Description,
    int NumberOfAnalyses,
    decimal Price,
    string Currency,
    int? ValidityDays,
    bool IsActive,
    DateTime? CreatedDate,
    string? CreatedBy
);

public class CreateServicePackageDto
{
    public string PackageName { get; set; } = string.Empty;
    public string PackageType { get; set; } = "Individual"; // Individual, Clinic, Enterprise
    public string? Description { get; set; }
    public int NumberOfAnalyses { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "VND";
    public int? ValidityDays { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Note { get; set; }
}

public class UpdateServicePackageDto
{
    public string? PackageName { get; set; }
    public string? PackageType { get; set; }
    public string? Description { get; set; }
    public int? NumberOfAnalyses { get; set; }
    public decimal? Price { get; set; }
    public string? Currency { get; set; }
    public int? ValidityDays { get; set; }
    public bool? IsActive { get; set; }
    public string? Note { get; set; }
}



