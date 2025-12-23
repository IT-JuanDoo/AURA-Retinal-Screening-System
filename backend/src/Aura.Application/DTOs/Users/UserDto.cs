namespace Aura.Application.DTOs.Users;

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Email { get; set; } = string.Empty;
    public DateTime? Dob { get; set; }
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; }
}

