using Aura.API.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/admin/doctors")]
[Authorize(Policy = "AdminOnly")]
public class AdminDoctorsController : ControllerBase
{
    private readonly AdminAccountRepository _repo;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminDoctorsController>? _logger;

    public AdminDoctorsController(AdminAccountRepository repo, IConfiguration config, ILogger<AdminDoctorsController>? logger = null)
    {
        _repo = repo;
        _config = config;
        _logger = logger;
    }

    private bool UseDemoMode => _config.GetValue<bool>("Admin:UseDemoMode", false);

    private static List<AdminDoctorRowDto> DemoDoctors => new()
    {
        new("doctor-1", "bs.hoang@hospital.vn", "bshoang", "Hoàng", "Văn Nam", "BS-12345", true, true),
        new("doctor-2", "bs.linh@hospital.vn", "bslinh", "Linh", "Thị Hoa", "BS-67890", true, true),
        new("doctor-3", "bs.minh@hospital.vn", "bsminh", "Minh", "Đức", "BS-11111", false, false),
    };

    [HttpGet]
    public async Task<ActionResult<List<AdminDoctorRowDto>>> List([FromQuery] string? search, [FromQuery] bool? isActive)
    {
        try
        {
            var result = await _repo.ListDoctorsAsync(search, isActive);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error listing doctors from database");
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo data due to database connection failure and UseDemoMode=true");
                return Ok(DemoDoctors);
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] AdminUpdateDoctorDto dto)
    {
        try
        {
            var n = await _repo.UpdateDoctorAsync(id, dto);
            return n == 0 ? NotFound(new { message = "Không tìm thấy doctor" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating doctor {DoctorId}", id);
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo mode for update operation");
                return NoContent();
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> SetStatus(string id, [FromBody] AdminUpdateDoctorDto dto)
    {
        if (!dto.IsActive.HasValue) return BadRequest(new { message = "Thiếu IsActive" });
        try
        {
            var n = await _repo.SetDoctorActiveAsync(id, dto.IsActive.Value);
            return n == 0 ? NotFound(new { message = "Không tìm thấy doctor" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error setting doctor status {DoctorId}", id);
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo mode for set status operation");
                return NoContent();
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }
}


