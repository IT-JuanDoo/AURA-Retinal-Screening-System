using System.Security.Cryptography;
using System.Text;
using Aura.Application.DTOs.Users;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Aura.Application.Services.Users;

/// <summary>
/// UserService - Kết nối trực tiếp với PostgreSQL database
/// </summary>
public class UserService : IUserService
{
    private readonly string _connectionString;
    private readonly ILogger<UserService>? _logger;

    public UserService(IConfiguration configuration, ILogger<UserService>? logger = null)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Database connection string not configured");
        _logger = logger;
    }

    public async Task<IEnumerable<UserDto>> GetAllAsync()
    {
        var users = new List<UserDto>();
        
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT Id, Username, FirstName, LastName, Email, Dob, Phone, Gender, 
                       ProfileImageUrl, IsEmailVerified, IsActive
                FROM users
                WHERE COALESCE(IsDeleted, false) = false
                ORDER BY CreatedDate DESC";

            using var command = new NpgsqlCommand(sql, connection);
            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                users.Add(new UserDto
                {
                    Id = reader.GetString(0),
                    Username = reader.IsDBNull(1) ? null : reader.GetString(1),
                    FirstName = reader.IsDBNull(2) ? null : reader.GetString(2),
                    LastName = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Email = reader.GetString(4),
                    Dob = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    Phone = reader.IsDBNull(6) ? null : reader.GetString(6),
                    Gender = reader.IsDBNull(7) ? null : reader.GetString(7),
                    ProfileImageUrl = reader.IsDBNull(8) ? null : reader.GetString(8),
                    IsEmailVerified = !reader.IsDBNull(9) && reader.GetBoolean(9),
                    IsActive = reader.IsDBNull(10) || reader.GetBoolean(10)
                });
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting all users");
        }

        return users;
    }

    public async Task<UserProfileDto?> GetByIdAsync(string id)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT Id, Username, FirstName, LastName, Email, Dob, Phone, Gender,
                       Address, City, Province, Country, IdentificationNumber,
                       ProfileImageUrl, IsEmailVerified, IsActive,
                       BloodType, HeightCm, WeightKg, Allergies, ChronicConditions,
                       CurrentMedications, FamilyHistory, EmergencyContactName,
                       EmergencyContactPhone, Lifestyle, MedicalNotes
                FROM users
                WHERE Id = @Id AND COALESCE(IsDeleted, false) = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new UserProfileDto
                {
                    Id = reader.GetString(0),
                    Username = reader.IsDBNull(1) ? null : reader.GetString(1),
                    FirstName = reader.IsDBNull(2) ? null : reader.GetString(2),
                    LastName = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Email = reader.GetString(4),
                    Dob = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    Phone = reader.IsDBNull(6) ? null : reader.GetString(6),
                    Gender = reader.IsDBNull(7) ? null : reader.GetString(7),
                    Address = reader.IsDBNull(8) ? null : reader.GetString(8),
                    City = reader.IsDBNull(9) ? null : reader.GetString(9),
                    Province = reader.IsDBNull(10) ? null : reader.GetString(10),
                    Country = reader.IsDBNull(11) ? null : reader.GetString(11),
                    IdentificationNumber = reader.IsDBNull(12) ? null : reader.GetString(12),
                    ProfileImageUrl = reader.IsDBNull(13) ? null : reader.GetString(13),
                    IsEmailVerified = !reader.IsDBNull(14) && reader.GetBoolean(14),
                    IsActive = reader.IsDBNull(15) || reader.GetBoolean(15),
                    BloodType = reader.IsDBNull(16) ? null : reader.GetString(16),
                    HeightCm = reader.IsDBNull(17) ? null : (double?)reader.GetDecimal(17),
                    WeightKg = reader.IsDBNull(18) ? null : (double?)reader.GetDecimal(18),
                    Allergies = reader.IsDBNull(19) ? null : reader.GetString(19),
                    ChronicConditions = reader.IsDBNull(20) ? null : reader.GetString(20),
                    CurrentMedications = reader.IsDBNull(21) ? null : reader.GetString(21),
                    FamilyHistory = reader.IsDBNull(22) ? null : reader.GetString(22),
                    EmergencyContactName = reader.IsDBNull(23) ? null : reader.GetString(23),
                    EmergencyContactPhone = reader.IsDBNull(24) ? null : reader.GetString(24),
                    Lifestyle = reader.IsDBNull(25) ? null : reader.GetString(25),
                    MedicalNotes = reader.IsDBNull(26) ? null : reader.GetString(26)
                };
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting user by id {UserId}", id);
        }

        return null;
    }

    public async Task<UserProfileDto> CreateAsync(CreateUserDto dto)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Check if email exists
            var checkSql = "SELECT COUNT(*) FROM users WHERE Email = @Email AND COALESCE(IsDeleted, false) = false";
            using var checkCmd = new NpgsqlCommand(checkSql, connection);
            checkCmd.Parameters.AddWithValue("Email", dto.Email);
            var count = Convert.ToInt64(await checkCmd.ExecuteScalarAsync());
            
            if (count > 0)
            {
                throw new InvalidOperationException("Email already exists");
            }

            var userId = Guid.NewGuid().ToString();
            var sql = @"
                INSERT INTO users (Id, Username, Password, FirstName, LastName, Email, Dob, Phone, 
                                   Gender, Address, City, Province, Country, IdentificationNumber,
                                   CreatedDate, IsActive, IsDeleted)
                VALUES (@Id, @Username, @Password, @FirstName, @LastName, @Email, @Dob, @Phone,
                        @Gender, @Address, @City, @Province, @Country, @IdentificationNumber,
                        CURRENT_DATE, true, false)";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", userId);
            command.Parameters.AddWithValue("Username", (object?)dto.Username ?? DBNull.Value);
            command.Parameters.AddWithValue("Password", (object?)dto.Password ?? DBNull.Value);
            command.Parameters.AddWithValue("FirstName", (object?)dto.FirstName ?? DBNull.Value);
            command.Parameters.AddWithValue("LastName", (object?)dto.LastName ?? DBNull.Value);
            command.Parameters.AddWithValue("Email", dto.Email);
            command.Parameters.AddWithValue("Dob", (object?)dto.Dob ?? DBNull.Value);
            command.Parameters.AddWithValue("Phone", (object?)dto.Phone ?? DBNull.Value);
            command.Parameters.AddWithValue("Gender", (object?)dto.Gender ?? DBNull.Value);
            command.Parameters.AddWithValue("Address", (object?)dto.Address ?? DBNull.Value);
            command.Parameters.AddWithValue("City", (object?)dto.City ?? DBNull.Value);
            command.Parameters.AddWithValue("Province", (object?)dto.Province ?? DBNull.Value);
            command.Parameters.AddWithValue("Country", (object?)(dto.Country ?? "Vietnam") ?? DBNull.Value);
            command.Parameters.AddWithValue("IdentificationNumber", (object?)dto.IdentificationNumber ?? DBNull.Value);

            await command.ExecuteNonQueryAsync();

            _logger?.LogInformation("User created: {UserId}", userId);

            return (await GetByIdAsync(userId))!;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error creating user");
            throw new InvalidOperationException("Failed to create user", ex);
        }
    }

    public async Task<UserProfileDto?> UpdateProfileAsync(string id, UpdateUserProfileDto dto)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Check if email exists for another user
            if (!string.IsNullOrEmpty(dto.Email))
            {
                var checkSql = "SELECT COUNT(*) FROM users WHERE Email = @Email AND Id != @Id AND COALESCE(IsDeleted, false) = false";
                using var checkCmd = new NpgsqlCommand(checkSql, connection);
                checkCmd.Parameters.AddWithValue("Email", dto.Email);
                checkCmd.Parameters.AddWithValue("Id", id);
                var count = Convert.ToInt64(await checkCmd.ExecuteScalarAsync());
                
                if (count > 0)
                {
                    throw new InvalidOperationException("Email already exists");
                }
            }

            var sql = @"
                UPDATE users SET
                    Username = COALESCE(@Username, Username),
                    FirstName = COALESCE(@FirstName, FirstName),
                    LastName = COALESCE(@LastName, LastName),
                    Email = COALESCE(@Email, Email),
                    Dob = COALESCE(@Dob, Dob),
                    Phone = COALESCE(@Phone, Phone),
                    Gender = COALESCE(@Gender, Gender),
                    Address = COALESCE(@Address, Address),
                    City = COALESCE(@City, City),
                    Province = COALESCE(@Province, Province),
                    Country = COALESCE(@Country, Country),
                    IdentificationNumber = COALESCE(@IdentificationNumber, IdentificationNumber),
                    ProfileImageUrl = COALESCE(@ProfileImageUrl, ProfileImageUrl),
                    IsActive = COALESCE(@IsActive, IsActive),
                    UpdatedDate = CURRENT_DATE
                WHERE Id = @Id AND COALESCE(IsDeleted, false) = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);
            command.Parameters.AddWithValue("Username", (object?)dto.Username ?? DBNull.Value);
            command.Parameters.AddWithValue("FirstName", (object?)dto.FirstName ?? DBNull.Value);
            command.Parameters.AddWithValue("LastName", (object?)dto.LastName ?? DBNull.Value);
            command.Parameters.AddWithValue("Email", (object?)dto.Email ?? DBNull.Value);
            command.Parameters.AddWithValue("Dob", (object?)dto.Dob ?? DBNull.Value);
            command.Parameters.AddWithValue("Phone", (object?)dto.Phone ?? DBNull.Value);
            command.Parameters.AddWithValue("Gender", (object?)dto.Gender ?? DBNull.Value);
            command.Parameters.AddWithValue("Address", (object?)dto.Address ?? DBNull.Value);
            command.Parameters.AddWithValue("City", (object?)dto.City ?? DBNull.Value);
            command.Parameters.AddWithValue("Province", (object?)dto.Province ?? DBNull.Value);
            command.Parameters.AddWithValue("Country", (object?)dto.Country ?? DBNull.Value);
            command.Parameters.AddWithValue("IdentificationNumber", (object?)dto.IdentificationNumber ?? DBNull.Value);
            command.Parameters.AddWithValue("ProfileImageUrl", (object?)dto.ProfileImageUrl ?? DBNull.Value);
            command.Parameters.AddWithValue("IsActive", (object?)dto.IsActive ?? DBNull.Value);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return null;
            }

            _logger?.LogInformation("User profile updated: {UserId}", id);

            return await GetByIdAsync(id);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating user profile {UserId}", id);
            return null;
        }
    }

    public async Task<UserProfileDto?> UpdateMedicalInfoAsync(string id, UpdateMedicalInfoDto dto)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE users SET
                    BloodType = COALESCE(@BloodType, BloodType),
                    HeightCm = COALESCE(@HeightCm, HeightCm),
                    WeightKg = COALESCE(@WeightKg, WeightKg),
                    Allergies = COALESCE(@Allergies, Allergies),
                    ChronicConditions = COALESCE(@ChronicConditions, ChronicConditions),
                    CurrentMedications = COALESCE(@CurrentMedications, CurrentMedications),
                    FamilyHistory = COALESCE(@FamilyHistory, FamilyHistory),
                    EmergencyContactName = COALESCE(@EmergencyContactName, EmergencyContactName),
                    EmergencyContactPhone = COALESCE(@EmergencyContactPhone, EmergencyContactPhone),
                    Lifestyle = COALESCE(@Lifestyle, Lifestyle),
                    MedicalNotes = COALESCE(@MedicalNotes, MedicalNotes),
                    UpdatedDate = CURRENT_DATE
                WHERE Id = @Id AND COALESCE(IsDeleted, false) = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);
            command.Parameters.AddWithValue("BloodType", (object?)dto.BloodType ?? DBNull.Value);
            command.Parameters.AddWithValue("HeightCm", (object?)dto.HeightCm ?? DBNull.Value);
            command.Parameters.AddWithValue("WeightKg", (object?)dto.WeightKg ?? DBNull.Value);
            command.Parameters.AddWithValue("Allergies", (object?)dto.Allergies ?? DBNull.Value);
            command.Parameters.AddWithValue("ChronicConditions", (object?)dto.ChronicConditions ?? DBNull.Value);
            command.Parameters.AddWithValue("CurrentMedications", (object?)dto.CurrentMedications ?? DBNull.Value);
            command.Parameters.AddWithValue("FamilyHistory", (object?)dto.FamilyHistory ?? DBNull.Value);
            command.Parameters.AddWithValue("EmergencyContactName", (object?)dto.EmergencyContactName ?? DBNull.Value);
            command.Parameters.AddWithValue("EmergencyContactPhone", (object?)dto.EmergencyContactPhone ?? DBNull.Value);
            command.Parameters.AddWithValue("Lifestyle", (object?)dto.Lifestyle ?? DBNull.Value);
            command.Parameters.AddWithValue("MedicalNotes", (object?)dto.MedicalNotes ?? DBNull.Value);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return null;
            }

            _logger?.LogInformation("User medical info updated: {UserId}", id);

            return await GetByIdAsync(id);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating user medical info {UserId}", id);
            return null;
        }
    }

    public async Task<bool> ChangePasswordAsync(string id, ChangePasswordDto dto)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Verify current password
            var verifySql = "SELECT Password FROM users WHERE Id = @Id AND COALESCE(IsDeleted, false) = false";
            using var verifyCmd = new NpgsqlCommand(verifySql, connection);
            verifyCmd.Parameters.AddWithValue("Id", id);
            
            var currentPassword = await verifyCmd.ExecuteScalarAsync() as string;
            if (currentPassword == null)
            {
                return false;
            }

            // Verify password using same method as AuthService
            var hashedCurrentPassword = HashPassword(dto.CurrentPassword);
            if (currentPassword != hashedCurrentPassword)
            {
                throw new InvalidOperationException("Current password is incorrect");
            }

            // Update password using same hash method as AuthService
            var hashedPassword = HashPassword(dto.NewPassword);
            var updateSql = @"
                UPDATE users SET Password = @Password, UpdatedDate = CURRENT_DATE
                WHERE Id = @Id AND COALESCE(IsDeleted, false) = false";

            using var updateCmd = new NpgsqlCommand(updateSql, connection);
            updateCmd.Parameters.AddWithValue("Id", id);
            updateCmd.Parameters.AddWithValue("Password", hashedPassword);

            var rowsAffected = await updateCmd.ExecuteNonQueryAsync();
            
            _logger?.LogInformation("User password changed: {UserId}", id);

            return rowsAffected > 0;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error changing password for user {UserId}", id);
            return false;
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE users SET IsDeleted = true, UpdatedDate = CURRENT_DATE
                WHERE Id = @Id AND COALESCE(IsDeleted, false) = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected > 0)
            {
                _logger?.LogInformation("User deleted: {UserId}", id);
            }

            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error deleting user {UserId}", id);
            return false;
        }
    }

    /// <summary>
    /// Hash password using SHA256 (same method as AuthService for consistency)
    /// </summary>
    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }
}
