using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.RBAC;

public class AssignPermissionDto
{
    [Required(ErrorMessage = "Role ID is required")]
    public string RoleId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Permission ID is required")]
    public string PermissionId { get; set; } = string.Empty;
}

