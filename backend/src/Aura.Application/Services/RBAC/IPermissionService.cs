using Aura.Application.DTOs.RBAC;

namespace Aura.Application.Services.RBAC;

public interface IPermissionService
{
    Task<IEnumerable<PermissionDto>> GetAllPermissionsAsync();
    Task<PermissionDto?> GetPermissionByIdAsync(string id);
    Task<PermissionDto> CreatePermissionAsync(CreatePermissionDto dto, string? createdBy = null);
    Task<PermissionDto?> UpdatePermissionAsync(string id, UpdatePermissionDto dto, string? updatedBy = null);
    Task<bool> DeletePermissionAsync(string id);
    Task<bool> AssignPermissionToRoleAsync(string roleId, string permissionId, string? assignedBy = null);
    Task<bool> RemovePermissionFromRoleAsync(string roleId, string permissionId);
    Task<IEnumerable<PermissionDto>> GetRolePermissionsAsync(string roleId);
}

