using Aura.API.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aura.API.Controllers;

/// <summary>
/// Controller quản lý Compliance và Privacy Settings (FR-37)
/// </summary>
[ApiController]
[Route("api/admin/compliance")]
[Authorize(Policy = "AdminOnly")]
public class AdminComplianceController : ControllerBase
{
    private readonly AuditLogRepository _repo;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminComplianceController>? _logger;

    public AdminComplianceController(
        AuditLogRepository repo,
        IConfiguration config,
        ILogger<AdminComplianceController>? logger = null)
    {
        _repo = repo;
        _config = config;
        _logger = logger;
    }

    private bool UseDemoMode => _config.GetValue<bool>("Admin:UseDemoMode", false);

    [HttpGet("report")]
    public async Task<ActionResult<ComplianceReportDto>> GetComplianceReport(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var report = await _repo.GetComplianceReportAsync(startDate, endDate);
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting compliance report: {Message}\n{StackTrace}", ex.Message, ex.StackTrace);
            
            // Return empty report instead of 500 error to prevent frontend from breaking
            // This allows the page to load even if there are no audit logs yet
            return Ok(new ComplianceReportDto(
                0, 0, 0, 0, 0,
                new Dictionary<string, int>(),
                new Dictionary<string, int>(),
                new List<ComplianceIssueDto>()
            ));
        }
    }

    [HttpGet("privacy-settings")]
    public async Task<ActionResult<PrivacySettingsDto>> GetPrivacySettings()
    {
        try
        {
            // Lấy từ configuration hoặc database (tạm thời dùng config)
            var settings = new PrivacySettingsDto(
                EnableAuditLogging: _config.GetValue<bool>("Compliance:EnableAuditLogging", true),
                AuditLogRetentionDays: _config.GetValue<int>("Compliance:AuditLogRetentionDays", 365),
                AnonymizeOldLogs: _config.GetValue<bool>("Compliance:AnonymizeOldLogs", false),
                RequireConsentForDataSharing: _config.GetValue<bool>("Compliance:RequireConsentForDataSharing", true),
                EnableGdprCompliance: _config.GetValue<bool>("Compliance:EnableGdprCompliance", true),
                DataRetentionDays: _config.GetValue<int>("Compliance:DataRetentionDays", 2555), // 7 years
                AllowDataExport: _config.GetValue<bool>("Compliance:AllowDataExport", true),
                RequireTwoFactorForSensitiveActions: _config.GetValue<bool>("Compliance:RequireTwoFactorForSensitiveActions", false)
            );

            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting privacy settings");
            return StatusCode(500, new { message = $"Lỗi khi lấy privacy settings: {ex.Message}" });
        }
    }

    [HttpPut("privacy-settings")]
    public async Task<IActionResult> UpdatePrivacySettings([FromBody] UpdatePrivacySettingsDto dto)
    {
        try
        {
            // Trong thực tế, nên lưu vào database hoặc configuration store
            // Tạm thời chỉ log và trả về success
            _logger?.LogInformation("Privacy settings updated: {Settings}", System.Text.Json.JsonSerializer.Serialize(dto));
            
            // TODO: Lưu vào database hoặc configuration store
            // await _settingsRepository.UpdatePrivacySettingsAsync(dto);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating privacy settings");
            return StatusCode(500, new { message = $"Lỗi khi cập nhật privacy settings: {ex.Message}" });
        }
    }
}
