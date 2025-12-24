using Aura.Application.DTOs.RBAC;
using Aura.Core.Entities;

namespace Aura.Application.Services.RBAC;

public class PermissionService : IPermissionService
{
    // In-memory storage for demo purposes
    private static readonly List<Permission> _permissions = new();
    private static readonly List<RolePermission> _rolePermissions = new();

    // Static method to get permission names by IDs (for RoleService)
    public static IEnumerable<string> GetPermissionNamesByIds(IEnumerable<string> permissionIds)
    {
        return _permissions
            .Where(p => permissionIds.Contains(p.Id) && !p.IsDeleted)
            .Select(p => p.PermissionName);
    }

    // Static method to get permission DTOs by IDs (for RoleService)
    public static IEnumerable<PermissionDto> GetPermissionsByIds(IEnumerable<string> permissionIds)
    {
        return _permissions
            .Where(p => permissionIds.Contains(p.Id) && !p.IsDeleted)
            .Select(p => new PermissionDto
            {
                Id = p.Id,
                PermissionName = p.PermissionName,
                PermissionDescription = p.PermissionDescription,
                ResourceType = p.ResourceType,
                CreatedDate = p.CreatedDate,
                RoleCount = _rolePermissions.Count(rp => rp.PermissionId == p.Id)
            });
    }

    static PermissionService()
    {
        // Initialize with default permissions
        var defaultPermissions = new[]
        {
            new { Name = "users.view", Description = "View users", Resource = "User" },
            new { Name = "users.create", Description = "Create users", Resource = "User" },
            new { Name = "users.update", Description = "Update users", Resource = "User" },
            new { Name = "users.delete", Description = "Delete users", Resource = "User" },
            new { Name = "reports.view", Description = "View reports", Resource = "Report" },
            new { Name = "reports.create", Description = "Create reports", Resource = "Report" },
            new { Name = "reports.update", Description = "Update reports", Resource = "Report" },
            new { Name = "reports.delete", Description = "Delete reports", Resource = "Report" },
            new { Name = "admin.access", Description = "Access admin panel", Resource = "Admin" },
            new { Name = "admin.manage", Description = "Manage system settings", Resource = "Admin" },
            new { Name = "clinic.manage", Description = "Manage clinic", Resource = "Clinic" },
            new { Name = "doctor.manage", Description = "Manage doctor functions", Resource = "Doctor" },
        };

        int id = 1;
        foreach (var perm in defaultPermissions)
        {
            _permissions.Add(new Permission
            {
                Id = id.ToString(),
                PermissionName = perm.Name,
                PermissionDescription = perm.Description,
                ResourceType = perm.Resource,
                CreatedDate = DateTime.UtcNow
            });
            id++;
        }
    }

    public Task<IEnumerable<PermissionDto>> GetAllPermissionsAsync()
    {
        var permissions = _permissions
            .Where(p => !p.IsDeleted)
            .Select(p => new PermissionDto
            {
                Id = p.Id,
                PermissionName = p.PermissionName,
                PermissionDescription = p.PermissionDescription,
                ResourceType = p.ResourceType,
                CreatedDate = p.CreatedDate,
                RoleCount = _rolePermissions.Count(rp => rp.PermissionId == p.Id)
            });
        return Task.FromResult(permissions);
    }

    public Task<PermissionDto?> GetPermissionByIdAsync(string id)
    {
        var permission = _permissions.FirstOrDefault(p => p.Id == id && !p.IsDeleted);
        if (permission == null) return Task.FromResult<PermissionDto?>(null);

        var permissionDto = new PermissionDto
        {
            Id = permission.Id,
            PermissionName = permission.PermissionName,
            PermissionDescription = permission.PermissionDescription,
            ResourceType = permission.ResourceType,
            CreatedDate = permission.CreatedDate,
            RoleCount = _rolePermissions.Count(rp => rp.PermissionId == permission.Id)
        };
        return Task.FromResult<PermissionDto?>(permissionDto);
    }

    public Task<PermissionDto> CreatePermissionAsync(CreatePermissionDto dto, string? createdBy = null)
    {
        var permission = new Permission
        {
            Id = Guid.NewGuid().ToString(),
            PermissionName = dto.PermissionName,
            PermissionDescription = dto.PermissionDescription,
            ResourceType = dto.ResourceType,
            CreatedDate = DateTime.UtcNow,
            CreatedBy = createdBy
        };
        _permissions.Add(permission);

        var permissionDto = new PermissionDto
        {
            Id = permission.Id,
            PermissionName = permission.PermissionName,
            PermissionDescription = permission.PermissionDescription,
            ResourceType = permission.ResourceType,
            CreatedDate = permission.CreatedDate,
            RoleCount = 0
        };
        return Task.FromResult(permissionDto);
    }

    public Task<PermissionDto?> UpdatePermissionAsync(string id, CreatePermissionDto dto, string? updatedBy = null)
    {
        var permission = _permissions.FirstOrDefault(p => p.Id == id && !p.IsDeleted);
        if (permission == null) return Task.FromResult<PermissionDto?>(null);

        permission.PermissionName = dto.PermissionName;
        permission.PermissionDescription = dto.PermissionDescription;
        permission.ResourceType = dto.ResourceType;
        permission.UpdatedDate = DateTime.UtcNow;
        permission.UpdatedBy = updatedBy;

        var permissionDto = new PermissionDto
        {
            Id = permission.Id,
            PermissionName = permission.PermissionName,
            PermissionDescription = permission.PermissionDescription,
            ResourceType = permission.ResourceType,
            CreatedDate = permission.CreatedDate,
            RoleCount = _rolePermissions.Count(rp => rp.PermissionId == permission.Id)
        };
        return Task.FromResult<PermissionDto?>(permissionDto);
    }

    public Task<bool> DeletePermissionAsync(string id)
    {
        var permission = _permissions.FirstOrDefault(p => p.Id == id && !p.IsDeleted);
        if (permission == null) return Task.FromResult(false);

        permission.IsDeleted = true;
        permission.UpdatedDate = DateTime.UtcNow;
        return Task.FromResult(true);
    }

    public Task<bool> AssignPermissionToRoleAsync(string roleId, string permissionId, string? assignedBy = null)
    {
        if (_rolePermissions.Any(rp => rp.RoleId == roleId && rp.PermissionId == permissionId))
            return Task.FromResult(false); // Already assigned

        var rolePermission = new RolePermission
        {
            Id = Guid.NewGuid().ToString(),
            RoleId = roleId,
            PermissionId = permissionId,
            CreatedDate = DateTime.UtcNow,
            CreatedBy = assignedBy
        };
        _rolePermissions.Add(rolePermission);
        return Task.FromResult(true);
    }

    public Task<bool> RemovePermissionFromRoleAsync(string roleId, string permissionId)
    {
        var rolePermission = _rolePermissions.FirstOrDefault(rp => rp.RoleId == roleId && rp.PermissionId == permissionId);
        if (rolePermission == null) return Task.FromResult(false);

        _rolePermissions.Remove(rolePermission);
        return Task.FromResult(true);
    }

    public Task<IEnumerable<PermissionDto>> GetRolePermissionsAsync(string roleId)
    {
        var permissionIds = _rolePermissions
            .Where(rp => rp.RoleId == roleId)
            .Select(rp => rp.PermissionId)
            .ToList();

        var permissions = _permissions
            .Where(p => permissionIds.Contains(p.Id) && !p.IsDeleted)
            .Select(p => new PermissionDto
            {
                Id = p.Id,
                PermissionName = p.PermissionName,
                PermissionDescription = p.PermissionDescription,
                ResourceType = p.ResourceType,
                CreatedDate = p.CreatedDate,
                RoleCount = _rolePermissions.Count(rp => rp.PermissionId == p.Id)
            });
        return Task.FromResult(permissions);
    }
}

