namespace Aura.Application.DTOs.Auth;

public class AuthResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public UserInfoDto? User { get; set; }
}

public class UserInfoDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool IsEmailVerified { get; set; }
    public string AuthenticationProvider { get; set; } = "email";
}

