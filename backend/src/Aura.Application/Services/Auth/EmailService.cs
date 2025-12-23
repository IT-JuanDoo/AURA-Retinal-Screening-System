using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Aura.Application.Services.Auth;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly string _frontendUrl;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _frontendUrl = _configuration["App:FrontendUrl"] ?? "http://localhost:5173";
    }

    public async Task<bool> SendVerificationEmailAsync(string email, string token, string? firstName = null)
    {
        try
        {
            var verificationUrl = $"{_frontendUrl}/verify-email?token={token}";
            var body = GenerateVerificationEmailBody(firstName, verificationUrl);

            // TODO: Implement actual email sending using SMTP, SendGrid, etc.
            // For now, log the verification URL for testing
            _logger.LogInformation("Verification email for {Email}: {Url}", email, verificationUrl);
            
            // Simulate email sending
            await Task.Delay(100);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendPasswordResetEmailAsync(string email, string token, string? firstName = null)
    {
        try
        {
            var resetUrl = $"{_frontendUrl}/reset-password?token={token}";
            var body = GeneratePasswordResetEmailBody(firstName, resetUrl);

            // TODO: Implement actual email sending
            _logger.LogInformation("Password reset email for {Email}: {Url}", email, resetUrl);
            
            await Task.Delay(100);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendWelcomeEmailAsync(string email, string? firstName = null)
    {
        try
        {
            var body = GenerateWelcomeEmailBody(firstName);

            // TODO: Implement actual email sending
            _logger.LogInformation("Welcome email sent to {Email}", email);
            
            await Task.Delay(100);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send welcome email to {Email}", email);
            return false;
        }
    }

    private string GenerateVerificationEmailBody(string? firstName, string verificationUrl)
    {
        var name = string.IsNullOrEmpty(firstName) ? "bạn" : firstName;
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Xác thực Email - AURA</title>
</head>
<body style='font-family: Inter, sans-serif; background-color: #f8fafc; padding: 20px;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);'>
        <div style='text-align: center; margin-bottom: 30px;'>
            <h1 style='color: #3b82f6; margin: 0;'>AURA</h1>
            <p style='color: #64748b; margin: 5px 0;'>Hệ thống Sàng lọc Sức khỏe Mạch máu Võng mạc</p>
        </div>
        <h2 style='color: #0f172a;'>Xin chào {name},</h2>
        <p style='color: #64748b; line-height: 1.6;'>
            Cảm ơn bạn đã đăng ký tài khoản AURA. Vui lòng xác thực địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:
        </p>
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{verificationUrl}' style='background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;'>
                Xác thực Email
            </a>
        </div>
        <p style='color: #64748b; font-size: 14px;'>
            Link xác thực sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu xác thực này, vui lòng bỏ qua email này.
        </p>
        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;'>
        <p style='color: #94a3b8; font-size: 12px; text-align: center;'>
            © 2024 AURA. Tuân thủ HIPAA.
        </p>
    </div>
</body>
</html>";
    }

    private string GeneratePasswordResetEmailBody(string? firstName, string resetUrl)
    {
        var name = string.IsNullOrEmpty(firstName) ? "bạn" : firstName;
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Đặt lại Mật khẩu - AURA</title>
</head>
<body style='font-family: Inter, sans-serif; background-color: #f8fafc; padding: 20px;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);'>
        <div style='text-align: center; margin-bottom: 30px;'>
            <h1 style='color: #3b82f6; margin: 0;'>AURA</h1>
            <p style='color: #64748b; margin: 5px 0;'>Hệ thống Sàng lọc Sức khỏe Mạch máu Võng mạc</p>
        </div>
        <h2 style='color: #0f172a;'>Xin chào {name},</h2>
        <p style='color: #64748b; line-height: 1.6;'>
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấp vào nút bên dưới để đặt mật khẩu mới:
        </p>
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{resetUrl}' style='background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;'>
                Đặt lại Mật khẩu
            </a>
        </div>
        <p style='color: #64748b; font-size: 14px;'>
            Link đặt lại mật khẩu sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </p>
        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;'>
        <p style='color: #94a3b8; font-size: 12px; text-align: center;'>
            © 2024 AURA. Tuân thủ HIPAA.
        </p>
    </div>
</body>
</html>";
    }

    private string GenerateWelcomeEmailBody(string? firstName)
    {
        var name = string.IsNullOrEmpty(firstName) ? "bạn" : firstName;
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Chào mừng - AURA</title>
</head>
<body style='font-family: Inter, sans-serif; background-color: #f8fafc; padding: 20px;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);'>
        <div style='text-align: center; margin-bottom: 30px;'>
            <h1 style='color: #3b82f6; margin: 0;'>AURA</h1>
            <p style='color: #64748b; margin: 5px 0;'>Hệ thống Sàng lọc Sức khỏe Mạch máu Võng mạc</p>
        </div>
        <h2 style='color: #0f172a;'>Chào mừng {name} đến với AURA!</h2>
        <p style='color: #64748b; line-height: 1.6;'>
            Tài khoản của bạn đã được xác thực thành công. Bạn có thể bắt đầu sử dụng AURA để:
        </p>
        <ul style='color: #64748b; line-height: 1.8;'>
            <li>Tải lên hình ảnh võng mạc để phân tích</li>
            <li>Xem kết quả chẩn đoán AI</li>
            <li>Theo dõi lịch sử sức khỏe</li>
            <li>Nhận tư vấn từ bác sĩ</li>
        </ul>
        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;'>
        <p style='color: #94a3b8; font-size: 12px; text-align: center;'>
            © 2024 AURA. Tuân thủ HIPAA.
        </p>
    </div>
</body>
</html>";
    }
}
