using Aura.API.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller quản lý Clinic Registration Approval và Suspension (FR-38)
/// </summary>
[ApiController]
[Route("api/admin/clinics")]
[Authorize(Policy = "AdminOnly")]
public class AdminClinicsController : ControllerBase
{
    private readonly ClinicRepository _repo;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminClinicsController>? _logger;

    public AdminClinicsController(
        ClinicRepository repo,
        IConfiguration config,
        ILogger<AdminClinicsController>? logger = null)
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
    public async Task<ActionResult<List<AdminClinicRowDto>>> List(
        [FromQuery] string? search,
        [FromQuery] string? verificationStatus,
        [FromQuery] bool? isActive)
    {
        try
        {
            var result = await _repo.ListAsync(search, verificationStatus, isActive);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error listing clinics");
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using empty list for demo mode due to DB error");
                return Ok(new List<AdminClinicRowDto>());
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AdminClinicRowDto>> GetById(string id)
    {
        try
        {
            var clinic = await _repo.GetByIdAsync(id);
            return clinic == null
                ? NotFound(new { message = "Không tìm thấy clinic" })
                : Ok(clinic);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting clinic {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi lấy clinic: {ex.Message}" });
        }
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(string id, [FromBody] ApprovalActionDto? dto = null)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var success = await _repo.ApproveAsync(id, adminId, dto?.Note);
            if (!success)
            {
                return NotFound(new { message = "Không tìm thấy clinic để approve" });
            }
            return Ok(new { message = "Đã approve clinic thành công" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error approving clinic {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi approve clinic: {ex.Message}" });
        }
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(string id, [FromBody] ApprovalActionDto? dto = null)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var success = await _repo.RejectAsync(id, adminId, dto?.Note);
            if (!success)
            {
                return NotFound(new { message = "Không tìm thấy clinic để reject" });
            }
            return Ok(new { message = "Đã reject clinic thành công" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error rejecting clinic {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi reject clinic: {ex.Message}" });
        }
    }

    [HttpPost("{id}/suspend")]
    public async Task<IActionResult> Suspend(string id, [FromBody] SuspensionActionDto? dto = null)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var success = await _repo.SuspendAsync(id, adminId, dto?.Note);
            if (!success)
            {
                return NotFound(new { message = "Không tìm thấy clinic để suspend" });
            }
            return Ok(new { message = "Đã suspend clinic thành công" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error suspending clinic {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi suspend clinic: {ex.Message}" });
        }
    }

    [HttpPost("{id}/activate")]
    public async Task<IActionResult> Activate(string id, [FromBody] ActivationActionDto? dto = null)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var success = await _repo.ActivateAsync(id, adminId, dto?.Note);
            if (!success)
            {
                return NotFound(new { message = "Không tìm thấy clinic để activate" });
            }
            return Ok(new { message = "Đã activate clinic thành công" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error activating clinic {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi activate clinic: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] AdminUpdateClinicDto dto)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var success = await _repo.UpdateAsync(id, dto, adminId);
            if (!success)
            {
                return NotFound(new { message = "Không tìm thấy clinic để update" });
            }
            return Ok(new { message = "Đã cập nhật clinic thành công" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating clinic {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi cập nhật clinic: {ex.Message}" });
        }
    }
}

// DTOs for action requests
public class ApprovalActionDto
{
    public string? Note { get; set; }
}

public class SuspensionActionDto
{
    public string? Note { get; set; }
}

public class ActivationActionDto
{
    public string? Note { get; set; }
}
