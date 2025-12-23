using Aura.Application.DTOs.RBAC;
using Aura.Core.Entities;
using static Aura.Application.Services.RBAC.PermissionService;

namespace Aura.Application.Services.RBAC;

public class RoleService : IRoleService
{
    // In-memory storage for demo purposes
    private static readonly List<Role> _roles = new();
    private static readonly List<UserRole> _userRoles = new();
    private static readonly List<RolePermission> _rolePermissions = new();

    static RoleService()
    {
        // Initialize with default roles
        _roles.Add(new Role
        {
            Id = "1",
            RoleName = "Admin",
            Description = "System Administrator with full access",
            CreatedDate = DateTime.UtcNow
        });
        _roles.Add(new Role
        {
            Id = "2",
            RoleName = "Doctor",
            Description = "Medical doctor with patient management access",
            CreatedDate = DateTime.UtcNow
        });
        _roles.Add(new Role
        {
            Id = "3",
            RoleName = "Clinic",
            Description = "Clinic administrator",
            CreatedDate = DateTime.UtcNow
        });
        _roles.Add(new Role
        {
            Id = "4",
            RoleName = "User",
            Description = "Regular user/patient",
            CreatedDate = DateTime.UtcNow
        });
    }

    public Task<IEnumerable<RoleDto>> GetAllRolesAsync()
    {
        var roles = _roles
            .Where(r => !r.IsDeleted)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                RoleName = r.RoleName,
                Description = r.Description,
                CreatedDate = r.CreatedDate,
                UserCount = _userRoles.Count(ur => ur.RoleId == r.Id),
                PermissionCount = _rolePermissions.Count(rp => rp.RoleId == r.Id)
            });
        return Task.FromResult(roles);
    }

    public Task<RoleDto?> GetRoleByIdAsync(string id)
    {
        var role = _roles.FirstOrDefault(r => r.Id == id && !r.IsDeleted);
        if (role == null) return Task.FromResult<RoleDto?>(null);

        var roleDto = new RoleDto
        {
            Id = role.Id,
            RoleName = role.RoleName,
            Description = role.Description,
            CreatedDate = role.CreatedDate,
            UserCount = _userRoles.Count(ur => ur.RoleId == role.Id),
            PermissionCount = _rolePermissions.Count(rp => rp.RoleId == role.Id)
        };
        return Task.FromResult<RoleDto?>(roleDto);
    }

    public Task<RoleDto> CreateRoleAsync(CreateRoleDto dto, string? createdBy = null)
    {
        var role = new Role
        {
            Id = Guid.NewGuid().ToString(),
            RoleName = dto.RoleName,
            Description = dto.Description,
            CreatedDate = DateTime.UtcNow,
            CreatedBy = createdBy
        };
        _roles.Add(role);

        var roleDto = new RoleDto
        {
            Id = role.Id,
            RoleName = role.RoleName,
            Description = role.Description,
            CreatedDate = role.CreatedDate,
            UserCount = 0,
            PermissionCount = 0
        };
        return Task.FromResult(roleDto);
    }

    public Task<RoleDto?> UpdateRoleAsync(string id, UpdateRoleDto dto, string? updatedBy = null)
    {
        var role = _roles.FirstOrDefault(r => r.Id == id && !r.IsDeleted);
        if (role == null) return Task.FromResult<RoleDto?>(null);

        if (!string.IsNullOrEmpty(dto.RoleName))
            role.RoleName = dto.RoleName;
        if (dto.Description != null)
            role.Description = dto.Description;
        role.UpdatedDate = DateTime.UtcNow;
        role.UpdatedBy = updatedBy;

        var roleDto = new RoleDto
        {
            Id = role.Id,
            RoleName = role.RoleName,
            Description = role.Description,
            CreatedDate = role.CreatedDate,
            UserCount = _userRoles.Count(ur => ur.RoleId == role.Id),
            PermissionCount = _rolePermissions.Count(rp => rp.RoleId == role.Id)
        };
        return Task.FromResult<RoleDto?>(roleDto);
    }

    public Task<bool> DeleteRoleAsync(string id)
    {
        var role = _roles.FirstOrDefault(r => r.Id == id && !r.IsDeleted);
        if (role == null) return Task.FromResult(false);

        role.IsDeleted = true;
        role.UpdatedDate = DateTime.UtcNow;
        return Task.FromResult(true);
    }

    public Task<bool> AssignRoleToUserAsync(string userId, string roleId, bool isPrimary = false, string? assignedBy = null)
    {
        if (_userRoles.Any(ur => ur.UserId == userId && ur.RoleId == roleId))
            return Task.FromResult(false); // Already assigned

        // If setting as primary, remove primary flag from other roles
        if (isPrimary)
        {
            foreach (var ur in _userRoles.Where(ur => ur.UserId == userId))
            {
                ur.IsPrimary = false;
            }
        }

        var userRole = new UserRole
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            RoleId = roleId,
            IsPrimary = isPrimary,
            CreatedDate = DateTime.UtcNow,
            CreatedBy = assignedBy
        };
        _userRoles.Add(userRole);
        return Task.FromResult(true);
    }

    public Task<bool> RemoveRoleFromUserAsync(string userId, string roleId)
    {
        var userRole = _userRoles.FirstOrDefault(ur => ur.UserId == userId && ur.RoleId == roleId);
        if (userRole == null) return Task.FromResult(false);

        _userRoles.Remove(userRole);
        return Task.FromResult(true);
    }

    public Task<IEnumerable<string>> GetUserRolesAsync(string userId)
    {
        var roleIds = _userRoles
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.RoleId)
            .ToList();
        var roleNames = _roles
            .Where(r => roleIds.Contains(r.Id) && !r.IsDeleted)
            .Select(r => r.RoleName);
        return Task.FromResult<IEnumerable<string>>(roleNames);
    }

    public Task<IEnumerable<string>> GetUserPermissionsAsync(string userId)
    {
        // Get all roles for user
        var userRoleIds = _userRoles
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.RoleId)
            .ToList();

        // Get all permissions for those roles
        var permissionIds = _rolePermissions
            .Where(rp => userRoleIds.Contains(rp.RoleId))
            .Select(rp => rp.PermissionId)
            .Distinct()
            .ToList();

        // Get permission names from PermissionService's static list
        // Note: This is a workaround for in-memory storage. In production, use proper DI.
        var permissionNames = GetPermissionNamesByIds(permissionIds);
        return Task.FromResult<IEnumerable<string>>(permissionNames);
    }

    public Task<IEnumerable<PermissionDto>> GetRolePermissionsAsync(string roleId)
    {
        var permissionIds = _rolePermissions
            .Where(rp => rp.RoleId == roleId)
            .Select(rp => rp.PermissionId)
            .ToList();

        // This would need PermissionService to get full permission details
        // For now, return empty list - will be implemented when PermissionService is available
        return Task.FromResult<IEnumerable<PermissionDto>>(new List<PermissionDto>());
    }
}

