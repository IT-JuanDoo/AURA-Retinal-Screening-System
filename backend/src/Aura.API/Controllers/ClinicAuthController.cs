using System.Security.Claims;
using Aura.Application.DTOs.Clinic;
using Aura.Application.Services.Clinic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aura.API.Controllers;

/// <summary>
/// Controller for clinic authentication (FR-22)
/// </summary>
[ApiController]
[Route("api/clinic/auth")]
public class ClinicAuthController : ControllerBase
{
    private readonly IClinicAuthService _clinicAuthService;
    private readonly ILogger<ClinicAuthController> _logger;

    public ClinicAuthController(IClinicAuthService clinicAuthService, ILogger<ClinicAuthController> logger)
    {
        _clinicAuthService = clinicAuthService;
        _logger = logger;
    }

    /// <summary>
    /// Register a new clinic with admin account
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ClinicAuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ClinicAuthResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] ClinicRegisterDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = string.Join("; ", ModelState
                .Where(x => x.Value?.Errors?.Count > 0)
                .SelectMany(x => x.Value!.Errors.Select(e => e.ErrorMessage)));
            var message = string.IsNullOrEmpty(errors) ? "Dữ liệu không hợp lệ" : errors;
            return BadRequest(new ClinicAuthResponseDto
            {
                Success = false,
                Message = message
            });
        }

        var result = await _clinicAuthService.RegisterAsync(dto);

        if (!result.Success)
            return BadRequest(result);

        // Set refresh token in HTTP-only cookie
        if (!string.IsNullOrEmpty(result.RefreshToken))
        {
            SetRefreshTokenCookie(result.RefreshToken);
        }

        return Ok(result);
    }

    /// <summary>
    /// Login for clinic admin
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ClinicAuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ClinicAuthResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] ClinicLoginDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ClinicAuthResponseDto
            {
                Success = false,
                Message = "Dữ liệu không hợp lệ"
            });
        }

        var result = await _clinicAuthService.LoginAsync(dto);

        if (!result.Success)
            return Unauthorized(result);

        // Set refresh token in HTTP-only cookie
        if (!string.IsNullOrEmpty(result.RefreshToken))
        {
            SetRefreshTokenCookie(result.RefreshToken);
        }

        return Ok(result);
    }

    /// <summary>
    /// Refresh access token
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ClinicAuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ClinicAuthResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] ClinicRefreshTokenDto dto)
    {
        // Try to get refresh token from cookie first, then from body
        var refreshToken = Request.Cookies["clinic_refreshToken"] ?? dto.RefreshToken;

        if (string.IsNullOrEmpty(refreshToken))
        {
            return Unauthorized(new ClinicAuthResponseDto
            {
                Success = false,
                Message = "Refresh token không hợp lệ"
            });
        }

        var result = await _clinicAuthService.RefreshTokenAsync(refreshToken);

        if (!result.Success)
            return Unauthorized(result);

        // Set new refresh token in cookie
        if (!string.IsNullOrEmpty(result.RefreshToken))
        {
            SetRefreshTokenCookie(result.RefreshToken);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get current clinic admin profile
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ClinicAuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetProfile()
    {
        var adminId = GetCurrentAdminId();
        if (adminId == null)
            return Unauthorized(new ClinicAuthResponseDto { Success = false, Message = "Chưa xác thực" });

        // Verify this is a clinic admin
        var userType = User.FindFirstValue("user_type");
        if (userType != "ClinicAdmin")
        {
            return Forbid();
        }

        var result = await _clinicAuthService.GetProfileAsync(adminId);

        if (!result.Success)
            return NotFound(result);

        return Ok(result);
    }

    /// <summary>
    /// Change password
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(typeof(ClinicAuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ClinicAuthResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword([FromBody] ClinicChangePasswordDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ClinicAuthResponseDto
            {
                Success = false,
                Message = "Dữ liệu không hợp lệ"
            });
        }

        var adminId = GetCurrentAdminId();
        if (adminId == null)
            return Unauthorized(new ClinicAuthResponseDto { Success = false, Message = "Chưa xác thực" });

        var userType = User.FindFirstValue("user_type");
        if (userType != "ClinicAdmin")
        {
            return Forbid();
        }

        var result = await _clinicAuthService.ChangePasswordAsync(adminId, dto);

        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    /// <summary>
    /// Logout (invalidate refresh token)
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout()
    {
        var adminId = GetCurrentAdminId();
        if (adminId != null)
        {
            await _clinicAuthService.LogoutAsync(adminId);
        }

        // Clear refresh token cookie
        Response.Cookies.Delete("clinic_refreshToken");

        return Ok(new { message = "Đã đăng xuất thành công" });
    }

    private string? GetCurrentAdminId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
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
        Response.Cookies.Append("clinic_refreshToken", refreshToken, cookieOptions);
    }
}
