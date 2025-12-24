using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.RBAC;

public class CreateRoleDto
{
    [Required(ErrorMessage = "Role name is required")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Role name must be between 2 and 100 characters")]
    public string RoleName { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    public string? Description { get; set; }
}

