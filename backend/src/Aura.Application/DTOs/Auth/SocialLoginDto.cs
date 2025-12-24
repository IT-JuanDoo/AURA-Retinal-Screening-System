namespace Aura.Application.DTOs.Auth;

public class GoogleLoginDto
{
    public string AccessToken { get; set; } = string.Empty;
}

public class FacebookLoginDto
{
    public string AccessToken { get; set; } = string.Empty;
}

public class SocialUserInfo
{
    public string ProviderId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string Provider { get; set; } = string.Empty;
}

