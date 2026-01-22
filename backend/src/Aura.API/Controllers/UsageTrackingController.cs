using Aura.Application.DTOs.UsageTracking;
using Aura.Application.Services.UsageTracking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Aura.API.Controllers;

/// <summary>
/// FR-27: Image Analysis and Package Usage Tracking System API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsageTrackingController : ControllerBase
{
    private readonly IUsageTrackingService _trackingService;
    private readonly ILogger<UsageTrackingController>? _logger;

    public UsageTrackingController(
        IUsageTrackingService trackingService,
        ILogger<UsageTrackingController>? logger = null)
    {
        _trackingService = trackingService;
        _logger = logger;
    }

    /// <summary>
    /// Get usage statistics for the current clinic
    /// </summary>
    [HttpGet("clinic")]
    public async Task<ActionResult<ClinicUsageStatisticsDto>> GetClinicUsageStatistics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var clinicId = User.FindFirstValue("ClinicId") 
                ?? User.FindFirstValue("clinic_id")
                ?? throw new UnauthorizedAccessException("Clinic ID not found in token");

            var statistics = await _trackingService.GetClinicUsageStatisticsAsync(clinicId, startDate, endDate);
            return Ok(statistics);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic usage statistics");
            return StatusCode(500, new { message = "Error retrieving usage statistics" });
        }
    }

    /// <summary>
    /// Get usage statistics for the current user
    /// </summary>
    [HttpGet("user")]
    public async Task<ActionResult<UserUsageStatisticsDto>> GetUserUsageStatistics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.FindFirstValue("id")
                ?? throw new UnauthorizedAccessException("User ID not found in token");

            var statistics = await _trackingService.GetUserUsageStatisticsAsync(userId, startDate, endDate);
            return Ok(statistics);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting user usage statistics");
            return StatusCode(500, new { message = "Error retrieving usage statistics" });
        }
    }

    /// <summary>
    /// Get package usage details for the current clinic
    /// </summary>
    [HttpGet("clinic/packages")]
    public async Task<ActionResult<List<PackageUsageDto>>> GetClinicPackageUsage()
    {
        try
        {
            var clinicId = User.FindFirstValue("ClinicId") 
                ?? User.FindFirstValue("clinic_id")
                ?? throw new UnauthorizedAccessException("Clinic ID not found in token");

            var packages = await _trackingService.GetClinicPackageUsageAsync(clinicId);
            return Ok(packages);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic package usage");
            return StatusCode(500, new { message = "Error retrieving package usage" });
        }
    }

    /// <summary>
    /// Get package usage details for the current user
    /// </summary>
    [HttpGet("user/packages")]
    public async Task<ActionResult<List<PackageUsageDto>>> GetUserPackageUsage()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.FindFirstValue("id")
                ?? throw new UnauthorizedAccessException("User ID not found in token");

            var packages = await _trackingService.GetUserPackageUsageAsync(userId);
            return Ok(packages);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting user package usage");
            return StatusCode(500, new { message = "Error retrieving package usage" });
        }
    }
}
