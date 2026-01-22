using Aura.API.Admin;
using Aura.Application.DTOs.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Policy = "AdminOnly")]
public class AdminAnalyticsController : ControllerBase
{
    private readonly AnalyticsRepository _repo;
    private readonly ILogger<AdminAnalyticsController>? _logger;

    public AdminAnalyticsController(AnalyticsRepository repo, ILogger<AdminAnalyticsController>? logger = null)
    {
        _repo = repo;
        _logger = logger;
    }

    [HttpGet("system")]
    public async Task<ActionResult<SystemAnalyticsDto>> GetSystemAnalytics(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var analytics = await _repo.GetSystemAnalyticsAsync(startDate, endDate);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting system analytics");
            return StatusCode(500, new { message = $"Lỗi khi lấy dữ liệu analytics: {ex.Message}" });
        }
    }

    [HttpGet("usage")]
    public async Task<ActionResult<UsageStatisticsDto>> GetUsageStatistics(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            var analytics = await _repo.GetSystemAnalyticsAsync(start, end);
            return Ok(analytics.UsageStatistics);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting usage statistics");
            return StatusCode(500, new { message = $"Lỗi khi lấy thống kê sử dụng: {ex.Message}" });
        }
    }

    [HttpGet("errors")]
    public async Task<ActionResult<ErrorRateDto>> GetErrorRates(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            var analytics = await _repo.GetSystemAnalyticsAsync(start, end);
            return Ok(analytics.ErrorRate);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting error rates");
            return StatusCode(500, new { message = $"Lỗi khi lấy tỷ lệ lỗi: {ex.Message}" });
        }
    }

    [HttpGet("images")]
    public async Task<ActionResult<ImageCountDto>> GetImageCounts(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            var analytics = await _repo.GetSystemAnalyticsAsync(start, end);
            return Ok(analytics.ImageCount);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting image counts");
            return StatusCode(500, new { message = $"Lỗi khi lấy thống kê hình ảnh: {ex.Message}" });
        }
    }

    [HttpGet("risk-distribution")]
    public async Task<ActionResult<RiskDistributionDto>> GetRiskDistribution(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            var analytics = await _repo.GetSystemAnalyticsAsync(start, end);
            return Ok(analytics.RiskDistribution);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting risk distribution");
            return StatusCode(500, new { message = $"Lỗi khi lấy phân bổ rủi ro: {ex.Message}" });
        }
    }

    [HttpGet("revenue")]
    public async Task<ActionResult<RevenueDashboardDto>> GetRevenueDashboard(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var revenue = await _repo.GetRevenueDashboardAsync(startDate, endDate);
            return Ok(revenue);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting revenue dashboard");
            return StatusCode(500, new { message = $"Lỗi khi lấy dữ liệu revenue: {ex.Message}" });
        }
    }

    [HttpGet("ai-performance")]
    public async Task<ActionResult<AiPerformanceDashboardDto>> GetAiPerformanceDashboard(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var performance = await _repo.GetAiPerformanceDashboardAsync(startDate, endDate);
            return Ok(performance);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting AI performance dashboard");
            return StatusCode(500, new { message = $"Lỗi khi lấy dữ liệu AI performance: {ex.Message}" });
        }
    }

    [HttpGet("system-health")]
    public async Task<ActionResult<SystemHealthDashboardDto>> GetSystemHealthDashboard()
    {
        try
        {
            var health = await _repo.GetSystemHealthDashboardAsync();
            return Ok(health);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting system health dashboard");
            return StatusCode(500, new { message = $"Lỗi khi lấy dữ liệu system health: {ex.Message}" });
        }
    }

    [HttpGet("global")]
    public async Task<ActionResult<GlobalDashboardDto>> GetGlobalDashboard(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            // Normalize dates: treat as UTC dates (frontend sends YYYY-MM-DD format)
            // Repository will handle adding one day to end date to cover full day
            DateTime? normalizedStart = startDate.HasValue 
                ? startDate.Value.Date.ToUniversalTime() 
                : null;
            DateTime? normalizedEnd = endDate.HasValue 
                ? endDate.Value.Date.ToUniversalTime() 
                : null;
            
            var dashboard = await _repo.GetGlobalDashboardAsync(normalizedStart, normalizedEnd);
            return Ok(dashboard);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting global dashboard");
            return StatusCode(500, new { message = $"Lỗi khi lấy dữ liệu global dashboard: {ex.Message}" });
        }
    }
}

