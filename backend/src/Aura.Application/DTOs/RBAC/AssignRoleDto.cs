using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.RBAC;

public class AssignRoleDto
{
    [Required(ErrorMessage = "User ID is required")]
    public string UserId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Role ID is required")]
    public string RoleId { get; set; } = string.Empty;

    public bool IsPrimary { get; set; } = false;
}

