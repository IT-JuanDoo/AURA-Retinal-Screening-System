using Aura.API.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller quản lý cấu hình AI: Parameters, Thresholds, và Retraining Policies (FR-33)
/// </summary>
[ApiController]
[Route("api/admin/ai-config")]
[Authorize(Policy = "AdminOnly")]
public class AdminAIConfigController : ControllerBase
{
    private readonly AIConfigurationRepository _repo;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminAIConfigController>? _logger;

    public AdminAIConfigController(
        AIConfigurationRepository repo,
        IConfiguration config,
        ILogger<AdminAIConfigController>? logger = null)
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
    public async Task<ActionResult<List<AIConfigurationRowDto>>> List(
        [FromQuery] string? search,
        [FromQuery] string? configurationType,
        [FromQuery] bool? isActive)
    {
        try
        {
            var result = await _repo.ListAsync(search, configurationType, isActive);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error listing AI configurations");
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo data due to database connection failure");
                return Ok(new List<AIConfigurationRowDto>());
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AIConfigurationRowDto>> GetById(string id)
    {
        try
        {
            var cfg = await _repo.GetByIdAsync(id);
            return cfg == null
                ? NotFound(new { message = "Không tìm thấy cấu hình AI" })
                : Ok(cfg);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting AI configuration {ConfigId}", id);
            return StatusCode(500, new { message = $"Lỗi khi lấy cấu hình: {ex.Message}" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<AIConfigurationRowDto?>> Create([FromBody] CreateAIConfigurationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ConfigurationName))
            return BadRequest(new { message = "Tên cấu hình không được để trống" });
        if (string.IsNullOrWhiteSpace(dto.ConfigurationType))
            return BadRequest(new { message = "Loại cấu hình không được để trống" });
        if (string.IsNullOrWhiteSpace(dto.ParameterKey))
            return BadRequest(new { message = "Parameter Key không được để trống" });
        if (string.IsNullOrWhiteSpace(dto.ParameterValue))
            return BadRequest(new { message = "Parameter Value không được để trống" });

        try
        {
            var createdBy = GetCurrentAdminId();
            var id = await _repo.CreateAsync(dto, createdBy);
            var created = await _repo.GetByIdAsync(id);
            return CreatedAtAction(nameof(GetById), new { id }, created);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error creating AI configuration");
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo mode for create operation");
                return Ok(null);
            }
            return StatusCode(500, new { message = $"Không tạo được cấu hình: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateAIConfigurationDto dto)
    {
        try
        {
            var updatedBy = GetCurrentAdminId();
            var n = await _repo.UpdateAsync(id, dto, updatedBy);
            return n == 0 ? NotFound(new { message = "Không tìm thấy cấu hình AI" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating AI configuration {ConfigId}", id);
            if (UseDemoMode) return NoContent();
            return StatusCode(500, new { message = $"Không cập nhật được cấu hình: {ex.Message}" });
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> SetStatus(string id, [FromBody] UpdateAIConfigurationDto dto)
    {
        if (!dto.IsActive.HasValue)
            return BadRequest(new { message = "Thiếu IsActive" });

        try
        {
            var appliedBy = GetCurrentAdminId();
            var n = await _repo.SetActiveAsync(id, dto.IsActive.Value, appliedBy);
            return n == 0 ? NotFound(new { message = "Không tìm thấy cấu hình AI" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error setting AI configuration status {ConfigId}", id);
            if (UseDemoMode) return NoContent();
            return StatusCode(500, new { message = $"Không cập nhật được trạng thái: {ex.Message}" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            var n = await _repo.DeleteAsync(id);
            return n == 0 ? NotFound(new { message = "Không tìm thấy cấu hình AI" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error deleting AI configuration {ConfigId}", id);
            if (UseDemoMode) return NoContent();
            return StatusCode(500, new { message = $"Không xóa được cấu hình: {ex.Message}" });
        }
    }
}

