using Aura.Application.DTOs.RBAC;
using Aura.Application.Repositories;

namespace Aura.Application.Services.RBAC;

public class RoleService : IRoleService
{
    private readonly IRbacRepository _repository;

    public RoleService(IRbacRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<RoleDto>> GetAllRolesAsync()
        => _repository.GetAllRolesAsync();

    public Task<RoleDto?> GetRoleByIdAsync(string id)
        => _repository.GetRoleByIdAsync(id);

    public Task<RoleDto> CreateRoleAsync(CreateRoleDto dto, string? createdBy = null)
        => _repository.CreateRoleAsync(dto, createdBy);

    public Task<RoleDto?> UpdateRoleAsync(string id, UpdateRoleDto dto, string? updatedBy = null)
        => _repository.UpdateRoleAsync(id, dto, updatedBy);

    public Task<bool> DeleteRoleAsync(string id)
        => _repository.DeleteRoleAsync(id);

    public Task<bool> AssignRoleToUserAsync(string userId, string roleId, bool isPrimary = false, string? assignedBy = null)
        => _repository.AssignRoleToUserAsync(userId, roleId, isPrimary, assignedBy);

    public Task<bool> RemoveRoleFromUserAsync(string userId, string roleId)
        => _repository.RemoveRoleFromUserAsync(userId, roleId);

    public Task<IEnumerable<string>> GetUserRolesAsync(string userId)
        => _repository.GetUserRolesAsync(userId);

    public Task<IEnumerable<string>> GetUserPermissionsAsync(string userId)
        => _repository.GetUserPermissionsAsync(userId);

    public Task<IEnumerable<PermissionDto>> GetRolePermissionsAsync(string roleId)
        => _repository.GetRolePermissionsAsync(roleId);
}

