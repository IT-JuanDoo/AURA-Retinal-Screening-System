using Aura.API.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller quản lý Notification Templates và Communication Policy (FR-39)
/// </summary>
[ApiController]
[Route("api/admin/notification-templates")]
[Authorize(Policy = "AdminOnly")]
public class AdminNotificationTemplatesController : ControllerBase
{
    private readonly NotificationTemplateRepository _repo;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminNotificationTemplatesController>? _logger;

    public AdminNotificationTemplatesController(
        NotificationTemplateRepository repo,
        IConfiguration config,
        ILogger<AdminNotificationTemplatesController>? logger = null)
    {
        _repo = repo;
        _config = config;
        _logger = logger;
    }

    private bool UseDemoMode => _config.GetValue<bool>("Admin:UseDemoMode", false);

    private string? GetCurrentAdminId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("id");
    }

    [HttpGet]
    public async Task<ActionResult<List<NotificationTemplateRowDto>>> List(
        [FromQuery] string? search,
        [FromQuery] string? templateType,
        [FromQuery] bool? isActive,
        [FromQuery] string? language)
    {
        try
        {
            var result = await _repo.ListAsync(search, templateType, isActive, language);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error listing notification templates");
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using empty list for demo mode due to DB error");
                return Ok(new List<NotificationTemplateRowDto>());
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<NotificationTemplateRowDto>> GetById(string id)
    {
        try
        {
            var template = await _repo.GetByIdAsync(id);
            return template == null
                ? NotFound(new { message = "Không tìm thấy template" })
                : Ok(template);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting notification template {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi lấy template: {ex.Message}" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] CreateNotificationTemplateDto dto)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var id = await _repo.CreateAsync(dto, adminId);
            return CreatedAtAction(nameof(GetById), new { id }, new { id, message = "Đã tạo template thành công" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error creating notification template");
            return StatusCode(500, new { message = $"Lỗi khi tạo template: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateNotificationTemplateDto dto)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var success = await _repo.UpdateAsync(id, dto, adminId);
            if (!success)
            {
                return NotFound(new { message = "Không tìm thấy template để update" });
            }
            return Ok(new { message = "Đã cập nhật template thành công" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating notification template {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi cập nhật template: {ex.Message}" });
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> SetStatus(string id, [FromBody] SetStatusDto dto)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var success = await _repo.SetActiveAsync(id, dto.IsActive, adminId);
            if (!success)
            {
                return NotFound(new { message = "Không tìm thấy template để update status" });
            }
            return Ok(new { message = $"Đã {(dto.IsActive ? "bật" : "tắt")} template thành công" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating notification template status {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi cập nhật status: {ex.Message}" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var success = await _repo.DeleteAsync(id, adminId);
            if (!success)
            {
                return NotFound(new { message = "Không tìm thấy template để xóa" });
            }
            return Ok(new { message = "Đã xóa template thành công" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error deleting notification template {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi xóa template: {ex.Message}" });
        }
    }

    [HttpPost("{id}/preview")]
    public async Task<ActionResult<object>> Preview(string id, [FromBody] PreviewTemplateDto? dto = null)
    {
        try
        {
            var template = await _repo.GetByIdAsync(id);
            if (template == null)
            {
                return NotFound(new { message = "Không tìm thấy template" });
            }

            // Simple template rendering (replace variables with sample values)
            var sampleVariables = dto?.Variables ?? new Dictionary<string, string>
            {
                { "userName", "Nguyễn Văn A" },
                { "analysisId", "AN-001" },
                { "result", "Low Risk" },
                { "date", DateTime.Now.ToString("dd/MM/yyyy") },
            };

            var title = template.TitleTemplate;
            var content = template.ContentTemplate;

            foreach (var kvp in sampleVariables)
            {
                title = title.Replace($"{{{{ {kvp.Key} }}}}", kvp.Value)
                            .Replace($"{{{{{kvp.Key}}}}}", kvp.Value)
                            .Replace($"${kvp.Key}", kvp.Value);
                content = content.Replace($"{{{{ {kvp.Key} }}}}", kvp.Value)
                               .Replace($"{{{{{kvp.Key}}}}}", kvp.Value)
                               .Replace($"${kvp.Key}", kvp.Value);
            }

            return Ok(new
            {
                templateId = template.Id,
                templateName = template.TemplateName,
                previewTitle = title,
                previewContent = content,
                variables = sampleVariables
            });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error previewing notification template {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi preview template: {ex.Message}" });
        }
    }
}

public class SetStatusDto
{
    public bool IsActive { get; set; }
}

public class PreviewTemplateDto
{
    public Dictionary<string, string>? Variables { get; set; }
}
