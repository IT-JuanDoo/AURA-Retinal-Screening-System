using Aura.Application.DTOs.Users;
using Aura.Core.Entities;

namespace Aura.Application.Services.Users;

public class UserService : IUserService
{
    // Simple in-memory store to avoid touching other layers (DB/Infra)
    private static readonly List<User> Users = new();

    public Task<IEnumerable<UserDto>> GetAllAsync()
    {
        var result = Users
            .Where(u => !u.IsDeleted)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Dob = u.Dob,
                Phone = u.Phone,
                Gender = u.Gender,
                ProfileImageUrl = u.ProfileImageUrl,
                IsEmailVerified = u.IsEmailVerified,
                IsActive = u.IsActive
            });

        return Task.FromResult(result);
    }

    public Task<UserProfileDto?> GetByIdAsync(string id)
    {
        var user = Users.FirstOrDefault(u => u.Id == id && !u.IsDeleted);
        return Task.FromResult(user == null ? null : MapToProfile(user));
    }

    public Task<UserProfileDto> CreateAsync(CreateUserDto dto)
    {
        if (Users.Any(u => u.Email == dto.Email && !u.IsDeleted))
        {
            throw new InvalidOperationException("Email already exists");
        }

        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = dto.Email,
            Password = dto.Password,
            Username = dto.Username,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Dob = dto.Dob,
            Phone = dto.Phone,
            Gender = dto.Gender,
            Address = dto.Address,
            City = dto.City,
            Province = dto.Province,
            Country = dto.Country ?? "Vietnam",
            IdentificationNumber = dto.IdentificationNumber,
            CreatedDate = DateTime.UtcNow,
            IsActive = true
        };

        Users.Add(user);
        return Task.FromResult(MapToProfile(user));
    }

    public Task<UserProfileDto?> UpdateProfileAsync(string id, UpdateUserProfileDto dto)
    {
        var user = Users.FirstOrDefault(u => u.Id == id && !u.IsDeleted);
        if (user == null) return Task.FromResult<UserProfileDto?>(null);

        if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
        {
            if (Users.Any(u => u.Email == dto.Email && u.Id != id && !u.IsDeleted))
                throw new InvalidOperationException("Email already exists");

            user.Email = dto.Email;
        }

        user.Username = dto.Username ?? user.Username;
        user.FirstName = dto.FirstName ?? user.FirstName;
        user.LastName = dto.LastName ?? user.LastName;
        user.Dob = dto.Dob ?? user.Dob;
        user.Phone = dto.Phone ?? user.Phone;
        user.Gender = dto.Gender ?? user.Gender;
        user.Address = dto.Address ?? user.Address;
        user.City = dto.City ?? user.City;
        user.Province = dto.Province ?? user.Province;
        user.Country = dto.Country ?? user.Country;
        user.IdentificationNumber = dto.IdentificationNumber ?? user.IdentificationNumber;
        user.ProfileImageUrl = dto.ProfileImageUrl ?? user.ProfileImageUrl;
        user.IsActive = dto.IsActive ?? user.IsActive;
        user.UpdatedDate = DateTime.UtcNow;

        return Task.FromResult<UserProfileDto?>(MapToProfile(user));
    }

    public Task<UserProfileDto?> UpdateMedicalInfoAsync(string id, UpdateMedicalInfoDto dto)
    {
        var user = Users.FirstOrDefault(u => u.Id == id && !u.IsDeleted);
        if (user == null) return Task.FromResult<UserProfileDto?>(null);

        user.BloodType = dto.BloodType ?? user.BloodType;
        user.HeightCm = dto.HeightCm ?? user.HeightCm;
        user.WeightKg = dto.WeightKg ?? user.WeightKg;
        user.Allergies = dto.Allergies ?? user.Allergies;
        user.ChronicConditions = dto.ChronicConditions ?? user.ChronicConditions;
        user.CurrentMedications = dto.CurrentMedications ?? user.CurrentMedications;
        user.FamilyHistory = dto.FamilyHistory ?? user.FamilyHistory;
        user.EmergencyContactName = dto.EmergencyContactName ?? user.EmergencyContactName;
        user.EmergencyContactPhone = dto.EmergencyContactPhone ?? user.EmergencyContactPhone;
        user.Lifestyle = dto.Lifestyle ?? user.Lifestyle;
        user.MedicalNotes = dto.MedicalNotes ?? user.MedicalNotes;
        user.UpdatedDate = DateTime.UtcNow;

        return Task.FromResult<UserProfileDto?>(MapToProfile(user));
    }

    public Task<bool> ChangePasswordAsync(string id, ChangePasswordDto dto)
    {
        var user = Users.FirstOrDefault(u => u.Id == id && !u.IsDeleted);
        if (user == null) return Task.FromResult(false);

        if (!string.Equals(user.Password, dto.CurrentPassword))
            throw new InvalidOperationException("Current password is incorrect");

        user.Password = dto.NewPassword;
        user.UpdatedDate = DateTime.UtcNow;
        return Task.FromResult(true);
    }

    public Task<bool> DeleteAsync(string id)
    {
        var user = Users.FirstOrDefault(u => u.Id == id && !u.IsDeleted);
        if (user == null) return Task.FromResult(false);
        user.IsDeleted = true;
        user.UpdatedDate = DateTime.UtcNow;
        return Task.FromResult(true);
    }

    private static UserProfileDto MapToProfile(User u) => new()
    {
        Id = u.Id,
        Username = u.Username,
        FirstName = u.FirstName,
        LastName = u.LastName,
        Email = u.Email,
        Dob = u.Dob,
        Phone = u.Phone,
        Gender = u.Gender,
        Address = u.Address,
        City = u.City,
        Province = u.Province,
        Country = u.Country,
        IdentificationNumber = u.IdentificationNumber,
        ProfileImageUrl = u.ProfileImageUrl,
        IsEmailVerified = u.IsEmailVerified,
        IsActive = u.IsActive,
        BloodType = u.BloodType,
        HeightCm = u.HeightCm,
        WeightKg = u.WeightKg,
        Allergies = u.Allergies,
        ChronicConditions = u.ChronicConditions,
        CurrentMedications = u.CurrentMedications,
        FamilyHistory = u.FamilyHistory,
        EmergencyContactName = u.EmergencyContactName,
        EmergencyContactPhone = u.EmergencyContactPhone,
        Lifestyle = u.Lifestyle,
        MedicalNotes = u.MedicalNotes
    };
}


