namespace Aura.Core.Entities;

public class Permission
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PermissionName { get; set; } = string.Empty;
    public string? PermissionDescription { get; set; }
    public string? ResourceType { get; set; } // e.g., "User", "Report", "Admin", "Clinic"
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; } = false;

    // Navigation properties
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

