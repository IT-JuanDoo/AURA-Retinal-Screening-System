using Aura.Application.DTOs.RBAC;

namespace Aura.Application.Services.RBAC;

public interface IRoleService
{
    Task<IEnumerable<RoleDto>> GetAllRolesAsync();
    Task<RoleDto?> GetRoleByIdAsync(string id);
    Task<RoleDto> CreateRoleAsync(CreateRoleDto dto, string? createdBy = null);
    Task<RoleDto?> UpdateRoleAsync(string id, UpdateRoleDto dto, string? updatedBy = null);
    Task<bool> DeleteRoleAsync(string id);
    Task<bool> AssignRoleToUserAsync(string userId, string roleId, bool isPrimary = false, string? assignedBy = null);
    Task<bool> RemoveRoleFromUserAsync(string userId, string roleId);
    Task<IEnumerable<string>> GetUserRolesAsync(string userId);
    Task<IEnumerable<string>> GetUserPermissionsAsync(string userId);
    Task<IEnumerable<PermissionDto>> GetRolePermissionsAsync(string roleId);
}

