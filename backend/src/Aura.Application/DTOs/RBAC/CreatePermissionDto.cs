using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.RBAC;

public class CreatePermissionDto
{
    [Required(ErrorMessage = "Permission name is required")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Permission name must be between 2 and 100 characters")]
    public string PermissionName { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    public string? PermissionDescription { get; set; }

    [StringLength(50, ErrorMessage = "Resource type cannot exceed 50 characters")]
    public string? ResourceType { get; set; }
}

