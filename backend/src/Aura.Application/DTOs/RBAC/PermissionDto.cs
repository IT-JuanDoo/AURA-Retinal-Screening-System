namespace Aura.Application.DTOs.RBAC;

public class PermissionDto
{
    public string Id { get; set; } = string.Empty;
    public string PermissionName { get; set; } = string.Empty;
    public string? PermissionDescription { get; set; }
    public string? ResourceType { get; set; }
    public DateTime CreatedDate { get; set; }
    public int RoleCount { get; set; }
}

