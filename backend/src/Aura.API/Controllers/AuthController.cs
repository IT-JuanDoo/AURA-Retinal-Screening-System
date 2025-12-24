using System.Security.Claims;
using Aura.Application.DTOs.Auth;
using Aura.Application.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Register a new user with email and password
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponseDto
            {
                Success = false,
                Message = "Dữ liệu không hợp lệ"
            });
        }

        var result = await _authService.RegisterAsync(registerDto);
        
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    /// <summary>
    /// Login with email and password
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponseDto
            {
                Success = false,
                Message = "Dữ liệu không hợp lệ"
            });
        }

        var result = await _authService.LoginAsync(loginDto);
        
        if (!result.Success)
            return Unauthorized(result);

        // Set refresh token in HTTP-only cookie
        SetRefreshTokenCookie(result.RefreshToken!);

        return Ok(result);
    }

    /// <summary>
    /// Login with Google OAuth
    /// </summary>
    [HttpPost("google")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto googleLoginDto)
    {
        var ipAddress = GetIpAddress();
        var result = await _authService.GoogleLoginAsync(googleLoginDto.AccessToken, ipAddress);
        
        if (!result.Success)
            return Unauthorized(result);

        SetRefreshTokenCookie(result.RefreshToken!);
        return Ok(result);
    }

    /// <summary>
    /// Login with Facebook OAuth
    /// </summary>
    [HttpPost("facebook")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> FacebookLogin([FromBody] FacebookLoginDto facebookLoginDto)
    {
        var ipAddress = GetIpAddress();
        var result = await _authService.FacebookLoginAsync(facebookLoginDto.AccessToken, ipAddress);
        
        if (!result.Success)
            return Unauthorized(result);

        SetRefreshTokenCookie(result.RefreshToken!);
        return Ok(result);
    }

    /// <summary>
    /// Refresh access token using refresh token
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto? refreshTokenDto = null)
    {
        // Try to get refresh token from cookie first, then from body
        var refreshToken = Request.Cookies["refreshToken"] ?? refreshTokenDto?.RefreshToken;

        if (string.IsNullOrEmpty(refreshToken))
        {
            return Unauthorized(new AuthResponseDto
            {
                Success = false,
                Message = "Refresh token không được cung cấp"
            });
        }

        var ipAddress = GetIpAddress();
        var result = await _authService.RefreshTokenAsync(refreshToken, ipAddress);
        
        if (!result.Success)
            return Unauthorized(result);

        SetRefreshTokenCookie(result.RefreshToken!);
        return Ok(result);
    }

    /// <summary>
    /// Verify email with verification token
    /// </summary>
    [HttpPost("verify-email")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto verifyDto)
    {
        var result = await _authService.VerifyEmailAsync(verifyDto.Token);
        
        if (!result)
        {
            return BadRequest(new { success = false, message = "Token không hợp lệ hoặc đã hết hạn" });
        }

        return Ok(new { success = true, message = "Email đã được xác thực thành công" });
    }

    /// <summary>
    /// Resend verification email
    /// </summary>
    [HttpPost("resend-verification")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ResendVerificationEmail([FromBody] ResendVerificationEmailDto resendDto)
    {
        await _authService.ResendVerificationEmailAsync(resendDto.Email);
        
        // Always return success to prevent email enumeration
        return Ok(new { success = true, message = "Nếu email tồn tại, chúng tôi đã gửi email xác thực" });
    }

    /// <summary>
    /// Request password reset
    /// </summary>
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto forgotPasswordDto)
    {
        await _authService.ForgotPasswordAsync(forgotPasswordDto.Email);
        
        // Always return success to prevent email enumeration
        return Ok(new { success = true, message = "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu" });
    }

    /// <summary>
    /// Reset password with token
    /// </summary>
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto resetPasswordDto)
    {
        if (resetPasswordDto.NewPassword != resetPasswordDto.ConfirmPassword)
        {
            return BadRequest(new { success = false, message = "Mật khẩu xác nhận không khớp" });
        }

        var result = await _authService.ResetPasswordAsync(resetPasswordDto.Token, resetPasswordDto.NewPassword);
        
        if (!result)
        {
            return BadRequest(new { success = false, message = "Token không hợp lệ hoặc đã hết hạn" });
        }

        return Ok(new { success = true, message = "Mật khẩu đã được đặt lại thành công" });
    }

    /// <summary>
    /// Get current authenticated user info
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserInfoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { success = false, message = "Không thể xác định người dùng" });
        }

        var user = await _authService.GetCurrentUserAsync(userId);
        
        if (user == null)
        {
            return Unauthorized(new { success = false, message = "Người dùng không tồn tại" });
        }

        return Ok(new { success = true, user });
    }

    /// <summary>
    /// Logout user and revoke tokens
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var refreshToken = Request.Cookies["refreshToken"];

        if (!string.IsNullOrEmpty(userId))
        {
            await _authService.LogoutAsync(userId, refreshToken);
        }

        // Clear refresh token cookie
        Response.Cookies.Delete("refreshToken");

        return Ok(new { success = true, message = "Đăng xuất thành công" });
    }

    #region Private Methods

    private void SetRefreshTokenCookie(string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Only send over HTTPS
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(7)
        };

        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    private string? GetIpAddress()
    {
        // Check for forwarded header first (for proxies/load balancers)
        if (Request.Headers.ContainsKey("X-Forwarded-For"))
        {
            return Request.Headers["X-Forwarded-For"].FirstOrDefault();
        }

        return HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString();
    }

    #endregion
}
