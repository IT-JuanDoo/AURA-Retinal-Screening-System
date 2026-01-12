using Aura.AdminService.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Aura.AdminService.Controllers;

[ApiController]
[Route("api/admin/clinics")]
[Authorize(Policy = "AdminOnly")]
public class AdminClinicsController : ControllerBase
{
    private readonly AdminAccountRepository _repo;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminClinicsController>? _logger;

    public AdminClinicsController(AdminAccountRepository repo, IConfiguration config, ILogger<AdminClinicsController>? logger = null)
    {
        _repo = repo;
        _config = config;
        _logger = logger;
    }

    private bool UseDemoMode => _config.GetValue<bool>("Admin:UseDemoMode", false);

    private static List<AdminClinicRowDto> DemoClinics => new()
    {
        new("clinic-1", "Phòng khám Mắt Sài Gòn", "matsg@clinic.vn", "028-1234-5678", "123 Nguyễn Huệ, Q1, TP.HCM", "Verified", true),
        new("clinic-2", "Bệnh viện Mắt Hà Nội", "mathn@clinic.vn", "024-9876-5432", "456 Phố Huế, Hai Bà Trưng, HN", "Verified", true),
        new("clinic-3", "Phòng khám Đa khoa ABC", "abc@clinic.vn", "028-1111-2222", "789 Lê Lợi, Q3, TP.HCM", "Pending", false),
    };

    [HttpGet]
    public async Task<ActionResult<List<AdminClinicRowDto>>> List([FromQuery] string? search, [FromQuery] bool? isActive)
    {
        try
        {
            var result = await _repo.ListClinicsAsync(search, isActive);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error listing clinics from database");
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo data due to database connection failure and UseDemoMode=true");
                return Ok(DemoClinics);
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdminCreateClinicDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ClinicName) || 
            string.IsNullOrWhiteSpace(dto.Email) || 
            string.IsNullOrWhiteSpace(dto.Address))
        {
            return BadRequest(new { message = "Tên, Email và Địa chỉ là bắt buộc" });
        }

        try
        {
            var n = await _repo.CreateClinicAsync(dto);
            return n > 0 ? CreatedAtAction(nameof(List), new { id = dto.Id }, dto) 
                         : StatusCode(500, new { message = "Không thể tạo clinic" });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error creating clinic");
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo mode for create operation");
                return CreatedAtAction(nameof(List), new { id = dto.Id }, dto);
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] AdminUpdateClinicDto dto)
    {
        try
        {
            var n = await _repo.UpdateClinicAsync(id, dto);
            return n == 0 ? NotFound(new { message = "Không tìm thấy clinic" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating clinic {ClinicId}", id);
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo mode for update operation");
                return NoContent();
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> SetStatus(string id, [FromBody] AdminUpdateClinicDto dto)
    {
        if (!dto.IsActive.HasValue) return BadRequest(new { message = "Thiếu IsActive" });
        try
        {
            var n = await _repo.SetClinicActiveAsync(id, dto.IsActive.Value);
            return n == 0 ? NotFound(new { message = "Không tìm thấy clinic" }) : NoContent();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error setting clinic status {ClinicId}", id);
            if (UseDemoMode)
            {
                _logger?.LogWarning("Using demo mode for set status operation");
                return NoContent();
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }
}
