using Aura.Application.DTOs.Auth;

namespace Aura.Application.Services.Auth;

public interface IAuthService
{
    // Email authentication
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
    Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
    
    // Token management
    Task<AuthResponseDto> RefreshTokenAsync(string refreshToken, string? ipAddress = null);
    Task<bool> RevokeTokenAsync(string refreshToken, string? ipAddress = null);
    
    // Email verification
    Task<bool> VerifyEmailAsync(string token);
    Task<bool> ResendVerificationEmailAsync(string email);
    
    // Password reset
    Task<bool> ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordAsync(string token, string newPassword);
    
    // Social authentication
    Task<AuthResponseDto> GoogleLoginAsync(string idToken, string? ipAddress = null);
    Task<AuthResponseDto> FacebookLoginAsync(string accessToken, string? ipAddress = null);
    Task<AuthResponseDto> TwitterLoginAsync(string oauthToken, string oauthVerifier, string? ipAddress = null);
    
    // User info
    Task<UserInfoDto?> GetCurrentUserAsync(string userId);
    Task<bool> LogoutAsync(string userId, string? refreshToken = null);
}
