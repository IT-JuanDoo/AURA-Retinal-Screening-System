using Aura.API.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aura.API.Controllers;

/// <summary>
/// Controller quản lý Audit Logs (FR-37)
/// </summary>
[ApiController]
[Route("api/admin/audit-logs")]
[Authorize(Policy = "AdminOnly")]
public class AdminAuditLogsController : ControllerBase
{
    private readonly AuditLogRepository _repo;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminAuditLogsController>? _logger;

    public AdminAuditLogsController(
        AuditLogRepository repo,
        IConfiguration config,
        ILogger<AdminAuditLogsController>? logger = null)
    {
        _repo = repo;
        _config = config;
        _logger = logger;
    }

    private bool UseDemoMode => _config.GetValue<bool>("Admin:UseDemoMode", false);

    [HttpGet]
    public async Task<ActionResult<object>> List(
        [FromQuery] string? userId,
        [FromQuery] string? doctorId,
        [FromQuery] string? adminId,
        [FromQuery] string? actionType,
        [FromQuery] string? resourceType,
        [FromQuery] string? resourceId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? ipAddress,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        try
        {
            var filter = new AuditLogFilterDto
            {
                UserId = userId,
                DoctorId = doctorId,
                AdminId = adminId,
                ActionType = actionType,
                ResourceType = resourceType,
                ResourceId = resourceId,
                StartDate = startDate,
                EndDate = endDate,
                IpAddress = ipAddress
            };

            var logs = await _repo.ListAsync(filter, page, pageSize);
            var total = await _repo.CountAsync(filter);

            return Ok(new
            {
                data = logs,
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error listing audit logs");
            if (UseDemoMode)
            {
                return Ok(new { data = new List<AuditLogRowDto>(), total = 0, page = 1, pageSize = 100, totalPages = 0 });
            }
            return StatusCode(500, new { message = $"Không kết nối được database: {ex.Message}" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AuditLogRowDto>> GetById(string id)
    {
        try
        {
            var log = await _repo.GetByIdAsync(id);
            return log == null
                ? NotFound(new { message = "Không tìm thấy audit log" })
                : Ok(log);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting audit log {Id}", id);
            return StatusCode(500, new { message = $"Lỗi khi lấy audit log: {ex.Message}" });
        }
    }

    [HttpGet("export")]
    public async Task<ActionResult> Export(
        [FromQuery] string? userId,
        [FromQuery] string? doctorId,
        [FromQuery] string? adminId,
        [FromQuery] string? actionType,
        [FromQuery] string? resourceType,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? format = "json")
    {
        try
        {
            var filter = new AuditLogFilterDto
            {
                UserId = userId,
                DoctorId = doctorId,
                AdminId = adminId,
                ActionType = actionType,
                ResourceType = resourceType,
                StartDate = startDate,
                EndDate = endDate
            };

            var logs = await _repo.ListAsync(filter, 1, 10000); // Max 10k for export

            if (format?.ToLower() == "csv")
            {
                var csv = "Id,UserId,DoctorId,AdminId,ActionType,ResourceType,ResourceId,IpAddress,CreatedDate,CreatedBy\n";
                foreach (var log in logs)
                {
                    csv += $"{log.Id},{log.UserId ?? ""},{log.DoctorId ?? ""},{log.AdminId ?? ""},{log.ActionType},{log.ResourceType},{log.ResourceId ?? ""},{log.IpAddress ?? ""},{log.CreatedDate:yyyy-MM-dd},{log.CreatedBy ?? ""}\n";
                }
                return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"audit-logs-{DateTime.UtcNow:yyyyMMdd}.csv");
            }

            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error exporting audit logs");
            return StatusCode(500, new { message = $"Lỗi khi export: {ex.Message}" });
        }
    }
}
