using Aura.Application.DTOs.Clinic;
using Aura.Application.Services.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Aura.Application.Services.Clinic;

public class ClinicAuthService : IClinicAuthService
{
    private readonly string _connectionString;
    private readonly IJwtService _jwtService;
    private readonly ILogger<ClinicAuthService>? _logger;
    private readonly int _refreshTokenDays;

    public ClinicAuthService(
        IConfiguration configuration,
        IJwtService jwtService,
        ILogger<ClinicAuthService>? logger = null)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new ArgumentNullException("DefaultConnection not configured");
        _jwtService = jwtService;
        _logger = logger;
        _refreshTokenDays = int.Parse(configuration["Jwt:RefreshTokenDays"] ?? "7");
    }

    public async Task<ClinicAuthResponseDto> RegisterAsync(ClinicRegisterDto dto)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Check if clinic email already exists
            var checkClinicSql = "SELECT Id FROM clinics WHERE Email = @Email AND IsDeleted = false";
            using (var checkCmd = new NpgsqlCommand(checkClinicSql, connection))
            {
                checkCmd.Parameters.AddWithValue("Email", dto.ClinicEmail);
                var existingClinic = await checkCmd.ExecuteScalarAsync();
                if (existingClinic != null)
                {
                    return new ClinicAuthResponseDto
                    {
                        Success = false,
                        Message = "Email phòng khám đã được đăng ký"
                    };
                }
            }

            // Check if admin email already exists
            var checkAdminSql = "SELECT Id FROM clinic_admins WHERE Email = @Email AND IsDeleted = false";
            using (var checkCmd = new NpgsqlCommand(checkAdminSql, connection))
            {
                checkCmd.Parameters.AddWithValue("Email", dto.AdminEmail);
                var existingAdmin = await checkCmd.ExecuteScalarAsync();
                if (existingAdmin != null)
                {
                    return new ClinicAuthResponseDto
                    {
                        Success = false,
                        Message = "Email quản trị viên đã được sử dụng"
                    };
                }
            }

            // Start transaction
            using var transaction = await connection.BeginTransactionAsync();
            try
            {
                // Create clinic
                var clinicId = Guid.NewGuid().ToString();
                var createClinicSql = @"
                    INSERT INTO clinics (
                        Id, ClinicName, RegistrationNumber, TaxCode, Email, Phone,
                        Address, City, Province, Country, WebsiteUrl, ClinicType,
                        VerificationStatus, IsActive, CreatedDate, IsDeleted
                    ) VALUES (
                        @Id, @ClinicName, @RegistrationNumber, @TaxCode, @Email, @Phone,
                        @Address, @City, @Province, @Country, @WebsiteUrl, @ClinicType,
                        'Pending', true, @Now, false
                    )";

                using (var cmd = new NpgsqlCommand(createClinicSql, connection, transaction))
                {
                    cmd.Parameters.AddWithValue("Id", clinicId);
                    cmd.Parameters.AddWithValue("ClinicName", dto.ClinicName);
                    cmd.Parameters.AddWithValue("RegistrationNumber", (object?)dto.RegistrationNumber ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("TaxCode", (object?)dto.TaxCode ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("Email", dto.ClinicEmail);
                    cmd.Parameters.AddWithValue("Phone", (object?)dto.ClinicPhone ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("Address", dto.Address);
                    cmd.Parameters.AddWithValue("City", (object?)dto.City ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("Province", (object?)dto.Province ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("Country", dto.Country);
                    cmd.Parameters.AddWithValue("WebsiteUrl", (object?)dto.WebsiteUrl ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("ClinicType", dto.ClinicType);
                    cmd.Parameters.AddWithValue("Now", DateTime.UtcNow);
                    await cmd.ExecuteNonQueryAsync();
                }

                // Create clinic admin
                var adminId = Guid.NewGuid().ToString();
                var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword);
                var refreshToken = _jwtService.GenerateRefreshToken();
                var refreshExpires = DateTime.UtcNow.AddDays(_refreshTokenDays);

                var createAdminSql = @"
                    INSERT INTO clinic_admins (
                        Id, ClinicId, Email, PasswordHash, FullName, Phone, Role,
                        IsActive, RefreshToken, RefreshTokenExpires, CreatedDate, IsDeleted
                    ) VALUES (
                        @Id, @ClinicId, @Email, @PasswordHash, @FullName, @Phone, 'ClinicAdmin',
                        true, @RefreshToken, @RefreshExpires, @Now, false
                    )";

                using (var cmd = new NpgsqlCommand(createAdminSql, connection, transaction))
                {
                    cmd.Parameters.AddWithValue("Id", adminId);
                    cmd.Parameters.AddWithValue("ClinicId", clinicId);
                    cmd.Parameters.AddWithValue("Email", dto.AdminEmail);
                    cmd.Parameters.AddWithValue("PasswordHash", passwordHash);
                    cmd.Parameters.AddWithValue("FullName", dto.AdminFullName);
                    cmd.Parameters.AddWithValue("Phone", (object?)dto.AdminPhone ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("RefreshToken", refreshToken);
                    cmd.Parameters.AddWithValue("RefreshExpires", refreshExpires);
                    cmd.Parameters.AddWithValue("Now", DateTime.UtcNow);
                    await cmd.ExecuteNonQueryAsync();
                }

                await transaction.CommitAsync();

                _logger?.LogInformation("Clinic registered successfully: {ClinicName}, Admin: {AdminEmail}", 
                    dto.ClinicName, dto.AdminEmail);

                // Generate tokens (but clinic is pending approval, so they can't access most features)
                var accessToken = _jwtService.GenerateClinicAdminAccessToken(
                    adminId, dto.AdminEmail, dto.AdminFullName, clinicId, "ClinicAdmin");

                return new ClinicAuthResponseDto
                {
                    Success = true,
                    Message = "Đăng ký thành công! Phòng khám đang chờ xét duyệt.",
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    ExpiresAt = DateTime.UtcNow.AddHours(1),
                    Admin = new ClinicAdminInfoDto
                    {
                        Id = adminId,
                        Email = dto.AdminEmail,
                        FullName = dto.AdminFullName,
                        Phone = dto.AdminPhone,
                        Role = "ClinicAdmin",
                        IsActive = true
                    },
                    Clinic = new ClinicInfoDto
                    {
                        Id = clinicId,
                        ClinicName = dto.ClinicName,
                        Email = dto.ClinicEmail,
                        Phone = dto.ClinicPhone,
                        Address = dto.Address,
                        City = dto.City,
                        Province = dto.Province,
                        ClinicType = dto.ClinicType,
                        VerificationStatus = "Pending",
                        IsActive = true
                    }
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error registering clinic: {ClinicName}", dto.ClinicName);
            return new ClinicAuthResponseDto
            {
                Success = false,
                Message = "Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại sau."
            };
        }
    }

    public async Task<ClinicAuthResponseDto> LoginAsync(ClinicLoginDto dto)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Get clinic admin with clinic info
            var sql = @"
                SELECT 
                    ca.Id, ca.ClinicId, ca.Email, ca.PasswordHash, ca.FullName, ca.Phone, ca.Role, ca.IsActive,
                    c.ClinicName, c.Email as ClinicEmail, c.Phone as ClinicPhone, c.Address, 
                    c.City, c.Province, c.ClinicType, c.VerificationStatus, c.IsActive as ClinicIsActive
                FROM clinic_admins ca
                INNER JOIN clinics c ON c.Id = ca.ClinicId
                WHERE ca.Email = @Email AND ca.IsDeleted = false AND c.IsDeleted = false";

            using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("Email", dto.Email);

            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return new ClinicAuthResponseDto
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng"
                };
            }

            var adminId = reader.GetString(0);
            var clinicId = reader.GetString(1);
            var email = reader.GetString(2);
            var passwordHash = reader.GetString(3);
            var fullName = reader.GetString(4);
            var phone = reader.IsDBNull(5) ? null : reader.GetString(5);
            var role = reader.GetString(6);
            var isActive = reader.GetBoolean(7);
            var clinicName = reader.GetString(8);
            var clinicEmail = reader.GetString(9);
            var clinicPhone = reader.IsDBNull(10) ? null : reader.GetString(10);
            var address = reader.GetString(11);
            var city = reader.IsDBNull(12) ? null : reader.GetString(12);
            var province = reader.IsDBNull(13) ? null : reader.GetString(13);
            var clinicType = reader.GetString(14);
            var verificationStatus = reader.GetString(15);
            var clinicIsActive = reader.GetBoolean(16);

            await reader.CloseAsync();

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(dto.Password, passwordHash))
            {
                return new ClinicAuthResponseDto
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng"
                };
            }

            // Check if admin is active
            if (!isActive)
            {
                return new ClinicAuthResponseDto
                {
                    Success = false,
                    Message = "Tài khoản đã bị vô hiệu hóa"
                };
            }

            // Check if clinic is active
            if (!clinicIsActive)
            {
                return new ClinicAuthResponseDto
                {
                    Success = false,
                    Message = "Phòng khám đã bị tạm ngưng hoạt động"
                };
            }

            // Generate tokens
            var accessToken = _jwtService.GenerateClinicAdminAccessToken(adminId, email, fullName, clinicId, role);
            var refreshToken = _jwtService.GenerateRefreshToken();
            var refreshExpires = DateTime.UtcNow.AddDays(_refreshTokenDays);

            // Update refresh token and last login
            var updateSql = @"
                UPDATE clinic_admins 
                SET RefreshToken = @RefreshToken, 
                    RefreshTokenExpires = @RefreshExpires,
                    LastLoginAt = @Now,
                    UpdatedDate = @Now
                WHERE Id = @Id";

            using var updateCmd = new NpgsqlCommand(updateSql, connection);
            updateCmd.Parameters.AddWithValue("RefreshToken", refreshToken);
            updateCmd.Parameters.AddWithValue("RefreshExpires", refreshExpires);
            updateCmd.Parameters.AddWithValue("Now", DateTime.UtcNow);
            updateCmd.Parameters.AddWithValue("Id", adminId);
            await updateCmd.ExecuteNonQueryAsync();

            _logger?.LogInformation("Clinic admin logged in: {Email}", email);

            return new ClinicAuthResponseDto
            {
                Success = true,
                Message = "Đăng nhập thành công",
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                Admin = new ClinicAdminInfoDto
                {
                    Id = adminId,
                    Email = email,
                    FullName = fullName,
                    Phone = phone,
                    Role = role,
                    IsActive = isActive,
                    LastLoginAt = DateTime.UtcNow
                },
                Clinic = new ClinicInfoDto
                {
                    Id = clinicId,
                    ClinicName = clinicName,
                    Email = clinicEmail,
                    Phone = clinicPhone,
                    Address = address,
                    City = city,
                    Province = province,
                    ClinicType = clinicType,
                    VerificationStatus = verificationStatus,
                    IsActive = clinicIsActive
                }
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error logging in clinic admin: {Email}", dto.Email);
            return new ClinicAuthResponseDto
            {
                Success = false,
                Message = "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại sau."
            };
        }
    }

    public async Task<ClinicAuthResponseDto> RefreshTokenAsync(string refreshToken)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    ca.Id, ca.ClinicId, ca.Email, ca.FullName, ca.Phone, ca.Role, ca.IsActive,
                    c.ClinicName, c.Email as ClinicEmail, c.Phone as ClinicPhone, c.Address,
                    c.City, c.Province, c.ClinicType, c.VerificationStatus, c.IsActive as ClinicIsActive
                FROM clinic_admins ca
                INNER JOIN clinics c ON c.Id = ca.ClinicId
                WHERE ca.RefreshToken = @RefreshToken 
                    AND ca.RefreshTokenExpires > @Now
                    AND ca.IsDeleted = false 
                    AND c.IsDeleted = false";

            using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("RefreshToken", refreshToken);
            cmd.Parameters.AddWithValue("Now", DateTime.UtcNow);

            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return new ClinicAuthResponseDto
                {
                    Success = false,
                    Message = "Token không hợp lệ hoặc đã hết hạn"
                };
            }

            var adminId = reader.GetString(0);
            var clinicId = reader.GetString(1);
            var email = reader.GetString(2);
            var fullName = reader.GetString(3);
            var phone = reader.IsDBNull(4) ? null : reader.GetString(4);
            var role = reader.GetString(5);
            var isActive = reader.GetBoolean(6);
            var clinicName = reader.GetString(7);
            var clinicEmail = reader.GetString(8);
            var clinicPhone = reader.IsDBNull(9) ? null : reader.GetString(9);
            var address = reader.GetString(10);
            var city = reader.IsDBNull(11) ? null : reader.GetString(11);
            var province = reader.IsDBNull(12) ? null : reader.GetString(12);
            var clinicType = reader.GetString(13);
            var verificationStatus = reader.GetString(14);
            var clinicIsActive = reader.GetBoolean(15);

            await reader.CloseAsync();

            if (!isActive || !clinicIsActive)
            {
                return new ClinicAuthResponseDto
                {
                    Success = false,
                    Message = "Tài khoản hoặc phòng khám đã bị vô hiệu hóa"
                };
            }

            // Generate new tokens
            var newAccessToken = _jwtService.GenerateClinicAdminAccessToken(adminId, email, fullName, clinicId, role);
            var newRefreshToken = _jwtService.GenerateRefreshToken();
            var refreshExpires = DateTime.UtcNow.AddDays(_refreshTokenDays);

            // Update refresh token
            var updateSql = @"
                UPDATE clinic_admins 
                SET RefreshToken = @NewRefreshToken, 
                    RefreshTokenExpires = @RefreshExpires,
                    UpdatedDate = @Now
                WHERE Id = @Id";

            using var updateCmd = new NpgsqlCommand(updateSql, connection);
            updateCmd.Parameters.AddWithValue("NewRefreshToken", newRefreshToken);
            updateCmd.Parameters.AddWithValue("RefreshExpires", refreshExpires);
            updateCmd.Parameters.AddWithValue("Now", DateTime.UtcNow);
            updateCmd.Parameters.AddWithValue("Id", adminId);
            await updateCmd.ExecuteNonQueryAsync();

            return new ClinicAuthResponseDto
            {
                Success = true,
                Message = "Token đã được làm mới",
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                Admin = new ClinicAdminInfoDto
                {
                    Id = adminId,
                    Email = email,
                    FullName = fullName,
                    Phone = phone,
                    Role = role,
                    IsActive = isActive
                },
                Clinic = new ClinicInfoDto
                {
                    Id = clinicId,
                    ClinicName = clinicName,
                    Email = clinicEmail,
                    Phone = clinicPhone,
                    Address = address,
                    City = city,
                    Province = province,
                    ClinicType = clinicType,
                    VerificationStatus = verificationStatus,
                    IsActive = clinicIsActive
                }
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error refreshing token");
            return new ClinicAuthResponseDto
            {
                Success = false,
                Message = "Đã xảy ra lỗi. Vui lòng đăng nhập lại."
            };
        }
    }

    public async Task<ClinicAuthResponseDto> GetProfileAsync(string adminId)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    ca.Id, ca.ClinicId, ca.Email, ca.FullName, ca.Phone, ca.Role, ca.IsActive, ca.LastLoginAt,
                    c.ClinicName, c.Email as ClinicEmail, c.Phone as ClinicPhone, c.Address,
                    c.City, c.Province, c.ClinicType, c.VerificationStatus, c.IsActive as ClinicIsActive
                FROM clinic_admins ca
                INNER JOIN clinics c ON c.Id = ca.ClinicId
                WHERE ca.Id = @AdminId AND ca.IsDeleted = false AND c.IsDeleted = false";

            using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("AdminId", adminId);

            using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return new ClinicAuthResponseDto
                {
                    Success = false,
                    Message = "Không tìm thấy thông tin tài khoản"
                };
            }

            return new ClinicAuthResponseDto
            {
                Success = true,
                Message = "Lấy thông tin thành công",
                Admin = new ClinicAdminInfoDto
                {
                    Id = reader.GetString(0),
                    Email = reader.GetString(2),
                    FullName = reader.GetString(3),
                    Phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Role = reader.GetString(5),
                    IsActive = reader.GetBoolean(6),
                    LastLoginAt = reader.IsDBNull(7) ? null : reader.GetDateTime(7)
                },
                Clinic = new ClinicInfoDto
                {
                    Id = reader.GetString(1),
                    ClinicName = reader.GetString(8),
                    Email = reader.GetString(9),
                    Phone = reader.IsDBNull(10) ? null : reader.GetString(10),
                    Address = reader.GetString(11),
                    City = reader.IsDBNull(12) ? null : reader.GetString(12),
                    Province = reader.IsDBNull(13) ? null : reader.GetString(13),
                    ClinicType = reader.GetString(14),
                    VerificationStatus = reader.GetString(15),
                    IsActive = reader.GetBoolean(16)
                }
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error getting profile for admin: {AdminId}", adminId);
            return new ClinicAuthResponseDto
            {
                Success = false,
                Message = "Đã xảy ra lỗi khi lấy thông tin"
            };
        }
    }

    public async Task<ClinicAuthResponseDto> ChangePasswordAsync(string adminId, ClinicChangePasswordDto dto)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Get current password hash
            var getSql = "SELECT PasswordHash FROM clinic_admins WHERE Id = @Id AND IsDeleted = false";
            using var getCmd = new NpgsqlCommand(getSql, connection);
            getCmd.Parameters.AddWithValue("Id", adminId);
            var currentHash = await getCmd.ExecuteScalarAsync() as string;

            if (currentHash == null)
            {
                return new ClinicAuthResponseDto
                {
                    Success = false,
                    Message = "Không tìm thấy tài khoản"
                };
            }

            // Verify current password
            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, currentHash))
            {
                return new ClinicAuthResponseDto
                {
                    Success = false,
                    Message = "Mật khẩu hiện tại không đúng"
                };
            }

            // Update password
            var newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            var updateSql = @"
                UPDATE clinic_admins 
                SET PasswordHash = @NewHash, UpdatedDate = @Now 
                WHERE Id = @Id";

            using var updateCmd = new NpgsqlCommand(updateSql, connection);
            updateCmd.Parameters.AddWithValue("NewHash", newHash);
            updateCmd.Parameters.AddWithValue("Now", DateTime.UtcNow);
            updateCmd.Parameters.AddWithValue("Id", adminId);
            await updateCmd.ExecuteNonQueryAsync();

            _logger?.LogInformation("Password changed for clinic admin: {AdminId}", adminId);

            return new ClinicAuthResponseDto
            {
                Success = true,
                Message = "Đổi mật khẩu thành công"
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error changing password for admin: {AdminId}", adminId);
            return new ClinicAuthResponseDto
            {
                Success = false,
                Message = "Đã xảy ra lỗi khi đổi mật khẩu"
            };
        }
    }

    public async Task<bool> LogoutAsync(string adminId)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE clinic_admins 
                SET RefreshToken = NULL, RefreshTokenExpires = NULL, UpdatedDate = @Now 
                WHERE Id = @Id";

            using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("Id", adminId);
            cmd.Parameters.AddWithValue("Now", DateTime.UtcNow);
            var rows = await cmd.ExecuteNonQueryAsync();

            return rows > 0;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error logging out admin: {AdminId}", adminId);
            return false;
        }
    }
}
