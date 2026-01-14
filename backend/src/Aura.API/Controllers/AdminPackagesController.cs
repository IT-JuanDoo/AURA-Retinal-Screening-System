using Aura.API.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Quản lý gói dịch vụ và pricing (FR-34)
/// </summary>
[ApiController]
[Route("api/admin/packages")]
[Authorize(Policy = "AdminOnly")]
public class AdminPackagesController : ControllerBase
{
    private readonly ServicePackageRepository _repo;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminPackagesController>? _logger;

    public AdminPackagesController(
        ServicePackageRepository repo,
        IConfiguration config,
        ILogger<AdminPackagesController>? logger = null)
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
    public async Task<ActionResult<List<ServicePackageRowDto>>> List(
        [FromQuery] string? search,
        [FromQuery] string? packageType,
        [FromQuery] bool? isActive)
    {
        try
        {
            var result = await _repo.ListAsync(search, packageType, isActive);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error listing service packages");
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using empty list for demo mode due to DB error");
                return Ok(new List<ServicePackageRowDto>());
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ServicePackageRowDto>> GetById(string id)
    {
        try
        {
            var pkg = await _repo.GetByIdAsync(id);
            return pkg == null
                ? NotFound(new { message = "Không tìm thấy gói dịch vụ" })
                : Ok(pkg);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting service package {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi lấy gói: {ex.Message}" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<ServicePackageRowDto?>> Create([FromBody] CreateServicePackageDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PackageName))
            return BadRequest(new { message = "Tên gói không được để trống" });
        if (dto.NumberOfAnalyses <= 0)
            return BadRequest(new { message = "Số lượt phân tích phải lớn hơn 0" });
        if (dto.Price <= 0)
            return BadRequest(new { message = "Giá phải lớn hơn 0" });

        try
        {
            var createdBy = GetCurrentAdminId();
            var id = await _repo.CreateAsync(dto, createdBy);
            var created = await _repo.GetByIdAsync(id);
            return CreatedAtAction(nameof(GetById), new { id }, created);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error creating service package");
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo mode for create package");
                return Ok(null);
            }
            return StatusCode(500, new { message = $"Không tạo được gói: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateServicePackageDto dto)
    {
        try
        {
            var updatedBy = GetCurrentAdminId();
            var n = await _repo.UpdateAsync(id, dto, updatedBy);
            return n == 0 ? NotFound(new { message = "Không tìm thấy gói dịch vụ" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating service package {Id}", id);
            if (UseDemoMode) return NoContent();
            return StatusCode(500, new { message = $"Không cập nhật được gói: {ex.Message}" });
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> SetStatus(string id, [FromBody] UpdateServicePackageDto dto)
    {
        if (!dto.IsActive.HasValue)
            return BadRequest(new { message = "Thiếu IsActive" });

        try
        {
            var n = await _repo.SetActiveAsync(id, dto.IsActive.Value);
            return n == 0 ? NotFound(new { message = "Không tìm thấy gói dịch vụ" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error setting package status {Id}", id);
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
            return n == 0 ? NotFound(new { message = "Không tìm thấy gói dịch vụ" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error deleting service package {Id}", id);
            if (UseDemoMode) return NoContent();
            return StatusCode(500, new { message = $"Không xóa được gói: {ex.Message}" });
        }
    }
}

