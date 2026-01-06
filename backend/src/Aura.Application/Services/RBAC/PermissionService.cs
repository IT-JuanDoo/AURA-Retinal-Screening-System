using Aura.Application.DTOs.RBAC;
using Aura.Application.Repositories;

namespace Aura.Application.Services.RBAC;

public class PermissionService : IPermissionService
{
    private readonly IRbacRepository _repository;

    public PermissionService(IRbacRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<PermissionDto>> GetAllPermissionsAsync()
        => _repository.GetAllPermissionsAsync();

    public Task<PermissionDto?> GetPermissionByIdAsync(string id)
        => _repository.GetPermissionByIdAsync(id);

    public Task<PermissionDto> CreatePermissionAsync(CreatePermissionDto dto, string? createdBy = null)
        => _repository.CreatePermissionAsync(dto, createdBy);

    public Task<PermissionDto?> UpdatePermissionAsync(string id, UpdatePermissionDto dto, string? updatedBy = null)
        => _repository.UpdatePermissionAsync(id, dto, updatedBy);

    public Task<bool> DeletePermissionAsync(string id)
        => _repository.DeletePermissionAsync(id);

    public Task<bool> AssignPermissionToRoleAsync(string roleId, string permissionId, string? assignedBy = null)
        => _repository.AssignPermissionToRoleAsync(roleId, permissionId, assignedBy);

    public Task<bool> RemovePermissionFromRoleAsync(string roleId, string permissionId)
        => _repository.RemovePermissionFromRoleAsync(roleId, permissionId);

    public Task<IEnumerable<PermissionDto>> GetRolePermissionsAsync(string roleId)
        => _repository.GetRolePermissionsAsync(roleId);
}

