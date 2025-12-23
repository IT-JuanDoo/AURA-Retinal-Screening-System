namespace Aura.Application.Services.Auth;

public interface IEmailService
{
    Task<bool> SendVerificationEmailAsync(string email, string token, string? firstName = null);
    Task<bool> SendPasswordResetEmailAsync(string email, string token, string? firstName = null);
    Task<bool> SendWelcomeEmailAsync(string email, string? firstName = null);
}

