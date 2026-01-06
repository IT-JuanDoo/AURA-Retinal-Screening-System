using Aura.Application.DTOs.RBAC;
using Aura.Application.Services.RBAC;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class PermissionsController : ControllerBase
{
    private readonly IPermissionService _permissionService;

    public PermissionsController(IPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PermissionDto>>> GetAllPermissions()
    {
        var permissions = await _permissionService.GetAllPermissionsAsync();
        return Ok(permissions);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PermissionDto>> GetPermissionById(string id)
    {
        var permission = await _permissionService.GetPermissionByIdAsync(id);
        if (permission == null)
            return NotFound(new { message = "Permission not found" });

        return Ok(permission);
    }

    [HttpPost]
    public async Task<ActionResult<PermissionDto>> CreatePermission([FromBody] CreatePermissionDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var permission = await _permissionService.CreatePermissionAsync(dto, userId);
        return CreatedAtAction(nameof(GetPermissionById), new { id = permission.Id }, permission);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PermissionDto>> UpdatePermission(string id, [FromBody] UpdatePermissionDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var permission = await _permissionService.UpdatePermissionAsync(id, dto, userId);
        if (permission == null)
            return NotFound(new { message = "Permission not found" });

        return Ok(permission);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePermission(string id)
    {
        var result = await _permissionService.DeletePermissionAsync(id);
        if (!result)
            return NotFound(new { message = "Permission not found" });

        return NoContent();
    }

    [HttpPost("assign")]
    public async Task<IActionResult> AssignPermissionToRole([FromBody] AssignPermissionDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var result = await _permissionService.AssignPermissionToRoleAsync(dto.RoleId, dto.PermissionId, userId);
        if (!result)
            return BadRequest(new { message = "Failed to assign permission. Permission may already be assigned to this role." });

        return Ok(new { message = "Permission assigned successfully" });
    }

    [HttpDelete("roles/{roleId}/permissions/{permissionId}")]
    public async Task<IActionResult> RemovePermissionFromRole(string roleId, string permissionId)
    {
        var result = await _permissionService.RemovePermissionFromRoleAsync(roleId, permissionId);
        if (!result)
            return NotFound(new { message = "Role permission not found" });

        return NoContent();
    }

    [HttpGet("roles/{roleId}")]
    public async Task<ActionResult<IEnumerable<PermissionDto>>> GetRolePermissions(string roleId)
    {
        var permissions = await _permissionService.GetRolePermissionsAsync(roleId);
        return Ok(permissions);
    }
}

