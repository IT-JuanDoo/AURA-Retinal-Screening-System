namespace Aura.Application.DTOs.Users;

public class UpdateUserProfileDto
{
    public string? Username { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public DateTime? Dob { get; set; }
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Country { get; set; }
    public string? IdentificationNumber { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool? IsActive { get; set; }
}


