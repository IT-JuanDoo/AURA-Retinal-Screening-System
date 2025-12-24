namespace Aura.Application.DTOs.RBAC;

public class RoleDto
{
    public string Id { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedDate { get; set; }
    public int UserCount { get; set; }
    public int PermissionCount { get; set; }
}

