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
}

