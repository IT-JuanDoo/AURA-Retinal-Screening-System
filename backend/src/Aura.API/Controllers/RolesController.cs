using Aura.Application.DTOs.RBAC;
using Aura.Application.Services.RBAC;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<IEnumerable<RoleDto>>> GetAllRoles()
    {
        var roles = await _roleService.GetAllRolesAsync();
        return Ok(roles);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<RoleDto>> GetRoleById(string id)
    {
        var role = await _roleService.GetRoleByIdAsync(id);
        if (role == null)
            return NotFound(new { message = "Role not found" });

        return Ok(role);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<RoleDto>> CreateRole([FromBody] CreateRoleDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = await _roleService.CreateRoleAsync(dto, userId);
        return CreatedAtAction(nameof(GetRoleById), new { id = role.Id }, role);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<RoleDto>> UpdateRole(string id, [FromBody] UpdateRoleDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = await _roleService.UpdateRoleAsync(id, dto, userId);
        if (role == null)
            return NotFound(new { message = "Role not found" });

        return Ok(role);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DeleteRole(string id)
    {
        var result = await _roleService.DeleteRoleAsync(id);
        if (!result)
            return NotFound(new { message = "Role not found" });

        return NoContent();
    }

    [HttpPost("assign")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> AssignRoleToUser([FromBody] AssignRoleDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var result = await _roleService.AssignRoleToUserAsync(dto.UserId, dto.RoleId, dto.IsPrimary, userId);
        if (!result)
            return BadRequest(new { message = "Failed to assign role. Role may already be assigned." });

        return Ok(new { message = "Role assigned successfully" });
    }

    [HttpDelete("users/{userId}/roles/{roleId}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> RemoveRoleFromUser(string userId, string roleId)
    {
        var result = await _roleService.RemoveRoleFromUserAsync(userId, roleId);
        if (!result)
            return NotFound(new { message = "User role not found" });

        return NoContent();
    }

    [HttpGet("users/{userId}/roles")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<string>>> GetUserRoles(string userId)
    {
        // Users can only view their own roles unless they are Admin
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var isAdmin = User.IsInRole("Admin");

        if (!isAdmin && currentUserId != userId)
            return Forbid();

        var roles = await _roleService.GetUserRolesAsync(userId);
        return Ok(roles);
    }

    [HttpGet("users/{userId}/permissions")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<string>>> GetUserPermissions(string userId)
    {
        // Users can only view their own permissions unless they are Admin
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var isAdmin = User.IsInRole("Admin");

        if (!isAdmin && currentUserId != userId)
            return Forbid();

        var permissions = await _roleService.GetUserPermissionsAsync(userId);
        return Ok(permissions);
    }

    [HttpGet("{roleId}/permissions")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<IEnumerable<PermissionDto>>> GetRolePermissions(string roleId)
    {
        var permissions = await _roleService.GetRolePermissionsAsync(roleId);
        return Ok(permissions);
    }
}

