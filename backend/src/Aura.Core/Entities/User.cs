namespace Aura.Core.Entities;

public class User
{
    public string Id { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Email { get; set; } = string.Empty;
    public DateTime? Dob { get; set; }
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Country { get; set; }
    public string? IdentificationNumber { get; set; }
    public string AuthenticationProvider { get; set; } = "email";
    public string? ProviderUserId { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public DateTime? CreatedDate { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
    public string? Note { get; set; }

    // TODO: Add navigation properties
    // public virtual ICollection<UserRole> UserRoles { get; set; }
}

