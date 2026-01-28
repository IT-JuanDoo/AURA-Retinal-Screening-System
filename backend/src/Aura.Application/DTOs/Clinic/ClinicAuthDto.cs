using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.Clinic;

/// <summary>
/// DTO for clinic registration
/// </summary>
public class ClinicRegisterDto
{
    // Clinic Information
    [Required(ErrorMessage = "Tên phòng khám là bắt buộc")]
    [StringLength(255, ErrorMessage = "Tên phòng khám không được vượt quá 255 ký tự")]
    public string ClinicName { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "Mã đăng ký kinh doanh không được vượt quá 100 ký tự")]
    public string? RegistrationNumber { get; set; }

    [StringLength(50, ErrorMessage = "Mã số thuế không được vượt quá 50 ký tự")]
    public string? TaxCode { get; set; }

    [Required(ErrorMessage = "Email phòng khám là bắt buộc")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    public string ClinicEmail { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Số điện thoại không được quá 50 ký tự")]
    public string? ClinicPhone { get; set; }

    [Required(ErrorMessage = "Địa chỉ là bắt buộc")]
    [StringLength(255, ErrorMessage = "Địa chỉ không được vượt quá 255 ký tự")]
    public string Address { get; set; } = string.Empty;

    public string? City { get; set; }
    public string? Province { get; set; }
    public string Country { get; set; } = "Vietnam";
    public string? WebsiteUrl { get; set; }

    [Required(ErrorMessage = "Loại cơ sở y tế là bắt buộc")]
    public string ClinicType { get; set; } = "Clinic"; // Hospital, Clinic, Medical Center, Other

    // Admin Account Information
    [Required(ErrorMessage = "Email quản trị viên là bắt buộc")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    public string AdminEmail { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu là bắt buộc")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu phải từ 6-100 ký tự")]
    public string AdminPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Xác nhận mật khẩu là bắt buộc")]
    [Compare("AdminPassword", ErrorMessage = "Mật khẩu xác nhận không khớp")]
    public string ConfirmPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Họ tên quản trị viên là bắt buộc")]
    [StringLength(255, ErrorMessage = "Họ tên không được vượt quá 255 ký tự")]
    public string AdminFullName { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Số điện thoại không được quá 50 ký tự")]
    public string? AdminPhone { get; set; }
}

/// <summary>
/// DTO for clinic admin login
/// </summary>
public class ClinicLoginDto
{
    [Required(ErrorMessage = "Email là bắt buộc")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu là bắt buộc")]
    public string Password { get; set; } = string.Empty;

    public bool RememberMe { get; set; } = false;
}

/// <summary>
/// DTO for clinic authentication response
/// </summary>
public class ClinicAuthResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public ClinicAdminInfoDto? Admin { get; set; }
    public ClinicInfoDto? Clinic { get; set; }
}

/// <summary>
/// DTO for clinic admin info
/// </summary>
public class ClinicAdminInfoDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = "ClinicAdmin";
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

/// <summary>
/// DTO for basic clinic info in auth response
/// </summary>
public class ClinicInfoDto
{
    public string Id { get; set; } = string.Empty;
    public string ClinicName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Province { get; set; }
    public string ClinicType { get; set; } = string.Empty;
    public string VerificationStatus { get; set; } = "Pending";
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO for changing password
/// </summary>
public class ClinicChangePasswordDto
{
    [Required(ErrorMessage = "Mật khẩu hiện tại là bắt buộc")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu mới là bắt buộc")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu phải từ 6-100 ký tự")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Xác nhận mật khẩu là bắt buộc")]
    [Compare("NewPassword", ErrorMessage = "Mật khẩu xác nhận không khớp")]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}

/// <summary>
/// DTO for refreshing token
/// </summary>
public class ClinicRefreshTokenDto
{
    public string? RefreshToken { get; set; }
}
