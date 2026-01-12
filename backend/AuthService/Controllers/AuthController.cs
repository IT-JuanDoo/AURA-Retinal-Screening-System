using System.Security.Claims;
using Aura.Application.DTOs.Auth;
using Aura.Application.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aura.AuthService.Controllers;

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

    [HttpPost("register")]
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

    [HttpPost("login")]
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

        SetRefreshTokenCookie(result.RefreshToken!);

        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto? refreshTokenDto = null)
    {
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

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var refreshToken = Request.Cookies["refreshToken"];

        if (!string.IsNullOrEmpty(userId))
        {
            await _authService.LogoutAsync(userId, refreshToken);
        }

        Response.Cookies.Delete("refreshToken");

        return Ok(new { success = true, message = "Đăng xuất thành công" });
    }

    private void SetRefreshTokenCookie(string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(7)
        };

        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    private string? GetIpAddress()
    {
        if (Request.Headers.ContainsKey("X-Forwarded-For"))
        {
            return Request.Headers["X-Forwarded-For"].FirstOrDefault();
        }

        return HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString();
    }
}

