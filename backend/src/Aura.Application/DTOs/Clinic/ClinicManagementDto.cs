using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.Clinic;

#region Doctor DTOs

/// <summary>
/// DTO for clinic doctor list item
/// </summary>
public class ClinicDoctorDto
{
    public string Id { get; set; } = string.Empty;
    public string DoctorId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Specialization { get; set; }
    public string? LicenseNumber { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsActive { get; set; }
    public DateTime JoinedAt { get; set; }
    public int PatientCount { get; set; }
    public int AnalysisCount { get; set; }
}

/// <summary>
/// DTO for adding a doctor to clinic
/// </summary>
public class AddClinicDoctorDto
{
    [Required(ErrorMessage = "Email bác sĩ là bắt buộc")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Họ tên bác sĩ là bắt buộc")]
    public string FullName { get; set; } = string.Empty;

    // Optional; accept Vietnamese formats (digits, spaces, + - ( ))
    [RegularExpression(@"^[\d\s\-\+\(\)]*$", ErrorMessage = "Số điện thoại chỉ được chứa chữ số, khoảng trắng, dấu + - ( )")]
    [MaxLength(20)]
    public string? Phone { get; set; }

    public string? Specialization { get; set; }
    public string? LicenseNumber { get; set; }
    public bool IsPrimary { get; set; } = false;

    // If creating new account
    public string? Password { get; set; }
}

/// <summary>
/// DTO for updating clinic doctor
/// </summary>
public class UpdateClinicDoctorDto
{
    public string? Phone { get; set; }
    public string? Specialization { get; set; }
    public bool? IsPrimary { get; set; }
    public bool? IsActive { get; set; }
}

#endregion

#region Patient DTOs

/// <summary>
/// DTO for clinic patient list item
/// </summary>
public class ClinicPatientDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; }
    public DateTime RegisteredAt { get; set; }
    public string? AssignedDoctorId { get; set; }
    public string? AssignedDoctorName { get; set; }
    public int AnalysisCount { get; set; }
    public string? LatestRiskLevel { get; set; }
    public DateTime? LastAnalysisDate { get; set; }
}

/// <summary>
/// DTO for registering patient to clinic
/// </summary>
public class RegisterClinicPatientDto
{
    [Required(ErrorMessage = "Email bệnh nhân là bắt buộc")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Họ tên bệnh nhân là bắt buộc")]
    public string FullName { get; set; } = string.Empty;

    // Optional; accept Vietnamese formats (digits, spaces, + - ( ))
    [RegularExpression(@"^[\d\s\-\+\(\)]*$", ErrorMessage = "Số điện thoại chỉ được chứa chữ số, khoảng trắng, dấu + - ( )")]
    [MaxLength(20)]
    public string? Phone { get; set; }

    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }

    // Optional: Assign to a doctor
    public string? AssignedDoctorId { get; set; }

    // If creating new account
    public string? Password { get; set; }
}

/// <summary>
/// DTO for updating clinic patient
/// </summary>
public class UpdateClinicPatientDto
{
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public bool? IsActive { get; set; }
}

/// <summary>
/// DTO for assigning doctor to patient
/// </summary>
public class AssignDoctorDto
{
    [Required(ErrorMessage = "ID bác sĩ là bắt buộc")]
    public string DoctorId { get; set; } = string.Empty;
    
    public bool IsPrimary { get; set; } = true;
}

#endregion

#region Dashboard DTOs

/// <summary>
/// DTO for clinic dashboard statistics
/// </summary>
public class ClinicDashboardStatsDto
{
    public int TotalDoctors { get; set; }
    public int ActiveDoctors { get; set; }
    public int TotalPatients { get; set; }
    public int ActivePatients { get; set; }
    public int TotalAnalyses { get; set; }
    public int PendingAnalyses { get; set; }
    public int CompletedAnalyses { get; set; }
    public int HighRiskCount { get; set; }
    public int MediumRiskCount { get; set; }
    public int LowRiskCount { get; set; }
    public int CriticalAlerts { get; set; }
    public int RemainingAnalyses { get; set; }
    public DateTime? PackageExpiresAt { get; set; }
}

/// <summary>
/// DTO for recent activity
/// </summary>
public class ClinicActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // Analysis, PatientRegistered, DoctorAdded, Alert
    public string Title { get; set; } = string.Empty;
    /// <summary>Tên bệnh nhân (nếu ảnh/ phân tích gán cho bệnh nhân).</summary>
    public string? PatientName { get; set; }
    public string? Description { get; set; }
    public string? RelatedEntityId { get; set; }
    public DateTime CreatedAt { get; set; }
}

#endregion
