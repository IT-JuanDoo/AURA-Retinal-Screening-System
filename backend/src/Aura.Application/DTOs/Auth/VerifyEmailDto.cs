namespace Aura.Application.DTOs.Auth;

public class VerifyEmailDto
{
    public string Token { get; set; } = string.Empty;
}

public class ResendVerificationEmailDto
{
    public string Email { get; set; } = string.Empty;
}

