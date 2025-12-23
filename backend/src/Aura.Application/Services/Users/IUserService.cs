using Aura.Application.DTOs.Users;

namespace Aura.Application.Services.Users;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetAllAsync();
    Task<UserProfileDto?> GetByIdAsync(string id);
    Task<UserProfileDto> CreateAsync(CreateUserDto dto);
    Task<UserProfileDto?> UpdateProfileAsync(string id, UpdateUserProfileDto dto);
    Task<UserProfileDto?> UpdateMedicalInfoAsync(string id, UpdateMedicalInfoDto dto);
    Task<bool> ChangePasswordAsync(string id, ChangePasswordDto dto);
    Task<bool> DeleteAsync(string id);
}


