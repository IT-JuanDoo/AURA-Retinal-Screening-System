using Aura.Application.DTOs.RBAC;

namespace Aura.Application.Repositories;

public interface IRbacRepository
{
    // Roles
    Task<IEnumerable<RoleDto>> GetAllRolesAsync();
    Task<RoleDto?> GetRoleByIdAsync(string id);
    Task<RoleDto> CreateRoleAsync(CreateRoleDto dto, string? createdBy = null);
    Task<RoleDto?> UpdateRoleAsync(string id, UpdateRoleDto dto, string? updatedBy = null);
    Task<bool> DeleteRoleAsync(string id);

    // Permissions
    Task<IEnumerable<PermissionDto>> GetAllPermissionsAsync();
    Task<PermissionDto?> GetPermissionByIdAsync(string id);
    Task<PermissionDto> CreatePermissionAsync(CreatePermissionDto dto, string? createdBy = null);
    Task<PermissionDto?> UpdatePermissionAsync(string id, UpdatePermissionDto dto, string? updatedBy = null);
    Task<bool> DeletePermissionAsync(string id);

    // Role-Permission assignments
    Task<bool> AssignPermissionToRoleAsync(string roleId, string permissionId, string? assignedBy = null);
    Task<bool> RemovePermissionFromRoleAsync(string roleId, string permissionId);
    Task<IEnumerable<PermissionDto>> GetRolePermissionsAsync(string roleId);
    Task<IEnumerable<RoleDto>> GetPermissionRolesAsync(string permissionId);

    // User-Role assignments
    Task<bool> AssignRoleToUserAsync(string userId, string roleId, bool isPrimary = false, string? assignedBy = null);
    Task<bool> RemoveRoleFromUserAsync(string userId, string roleId);
    Task<IEnumerable<string>> GetUserRolesAsync(string userId);
    Task<IEnumerable<string>> GetUserPermissionsAsync(string userId);

    // Doctor-Role assignments (if needed)
    Task<bool> AssignRoleToDoctorAsync(string doctorId, string roleId, bool isPrimary = false, string? assignedBy = null);
    Task<bool> RemoveRoleFromDoctorAsync(string doctorId, string roleId);
    Task<IEnumerable<string>> GetDoctorRolesAsync(string doctorId);
    Task<IEnumerable<string>> GetDoctorPermissionsAsync(string doctorId);

    // Clinic-Role assignments (if needed)
    Task<bool> AssignRoleToClinicAsync(string clinicId, string roleId, bool isPrimary = false, string? assignedBy = null);
    Task<bool> RemoveRoleFromClinicAsync(string clinicId, string roleId);
    Task<IEnumerable<string>> GetClinicRolesAsync(string clinicId);
    Task<IEnumerable<string>> GetClinicPermissionsAsync(string clinicId);
}

