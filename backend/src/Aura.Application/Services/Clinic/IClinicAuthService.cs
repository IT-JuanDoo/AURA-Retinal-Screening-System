using Aura.Application.DTOs.Clinic;

namespace Aura.Application.Services.Clinic;

public interface IClinicAuthService
{
    /// <summary>
    /// Register a new clinic with admin account
    /// </summary>
    Task<ClinicAuthResponseDto> RegisterAsync(ClinicRegisterDto dto);

    /// <summary>
    /// Login clinic admin
    /// </summary>
    Task<ClinicAuthResponseDto> LoginAsync(ClinicLoginDto dto);

    /// <summary>
    /// Refresh access token
    /// </summary>
    Task<ClinicAuthResponseDto> RefreshTokenAsync(string refreshToken);

    /// <summary>
    /// Get current clinic admin profile
    /// </summary>
    Task<ClinicAuthResponseDto> GetProfileAsync(string adminId);

    /// <summary>
    /// Change password
    /// </summary>
    Task<ClinicAuthResponseDto> ChangePasswordAsync(string adminId, ClinicChangePasswordDto dto);

    /// <summary>
    /// Logout (invalidate refresh token)
    /// </summary>
    Task<bool> LogoutAsync(string adminId);
}
