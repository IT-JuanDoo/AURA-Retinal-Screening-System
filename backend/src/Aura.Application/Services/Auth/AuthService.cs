using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Aura.Application.DTOs.Auth;
using Aura.Core.Entities;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Aura.Application.Services.Auth;

public class AuthService : IAuthService
{
    private readonly IJwtService _jwtService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    private readonly IDistributedCache? _distributedCache;
    
    // TODO: Inject actual repositories when database is set up
    // private readonly IUserRepository _userRepository;
    // private readonly IRefreshTokenRepository _refreshTokenRepository;
    // private readonly IEmailVerificationTokenRepository _emailVerificationTokenRepository;
    // private readonly IPasswordResetTokenRepository _passwordResetTokenRepository;

    // In-memory storage for development (replace with actual database)
    private static readonly List<User> _users = new();
    private static readonly List<RefreshToken> _refreshTokens = new();
    private static readonly List<EmailVerificationToken> _emailVerificationTokens = new();
    private static readonly List<PasswordResetToken> _passwordResetTokens = new();

    public AuthService(
        IJwtService jwtService,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<AuthService> logger,
        IDistributedCache? distributedCache = null)
    {
        _jwtService = jwtService;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
        _distributedCache = distributedCache;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        try
        {
            using var conn = OpenConnection();
            
            // Check if email already exists in database
            var checkEmailQuery = @"
                SELECT id, email 
                FROM users 
                WHERE email = @email AND isdeleted = false";
            
            using (var cmd = new NpgsqlCommand(checkEmailQuery, conn))
            {
                cmd.Parameters.AddWithValue("email", registerDto.Email.ToLower());
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "Email đã được sử dụng"
                    };
                }
            }

            // Create new user
            var userId = Guid.NewGuid().ToString();
            var hashedPassword = HashPassword(registerDto.Password);
            var username = registerDto.Email.Split('@')[0]; // Generate username from email
            
            var insertQuery = @"
                INSERT INTO users (id, email, password, firstname, lastname, phone, 
                                 authenticationprovider, isemailverified, isactive, 
                                 createddate, username, country)
                VALUES (@id, @email, @password, @firstname, @lastname, @phone, 
                       @provider, @isemailverified, @isactive, 
                       @createddate, @username, @country)";
            
            using (var cmd = new NpgsqlCommand(insertQuery, conn))
            {
                cmd.Parameters.AddWithValue("id", userId);
                cmd.Parameters.AddWithValue("email", registerDto.Email.ToLower());
                cmd.Parameters.AddWithValue("password", hashedPassword);
                cmd.Parameters.AddWithValue("firstname", (object?)registerDto.FirstName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("lastname", (object?)registerDto.LastName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("phone", (object?)registerDto.Phone ?? DBNull.Value);
                cmd.Parameters.AddWithValue("provider", "email");
                cmd.Parameters.AddWithValue("isemailverified", false);
                cmd.Parameters.AddWithValue("isactive", true);
                cmd.Parameters.AddWithValue("createddate", DateTime.UtcNow.Date);
                cmd.Parameters.AddWithValue("username", username);
                cmd.Parameters.AddWithValue("country", "Vietnam");
                
                cmd.ExecuteNonQuery();
            }

            // Read the newly created user
            var getUserQuery = @"
                SELECT id, email, password, firstname, lastname, phone, authenticationprovider, 
                       isemailverified, isactive, lastloginat, createddate, profileimageurl,
                       provideruserid, username, country, dob, gender, address
                FROM users 
                WHERE id = @id AND isdeleted = false";
            
            User? user = null;
            using (var cmd = new NpgsqlCommand(getUserQuery, conn))
            {
                cmd.Parameters.AddWithValue("id", userId);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    user = MapUserFromReader(reader);
                }
            }

            if (user == null)
            {
                _logger.LogError("Failed to retrieve user after registration: {UserId}", userId);
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Đăng ký thất bại. Không thể tạo tài khoản."
                };
            }

            // Create email verification token (still in-memory for now)
            var verificationToken = new EmailVerificationToken
            {
                UserId = user.Id,
                Token = GenerateRandomToken(),
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };
            _emailVerificationTokens.Add(verificationToken);

            // Send verification email
            await _emailService.SendVerificationEmailAsync(user.Email, verificationToken.Token, user.FirstName);

            _logger.LogInformation("User registered successfully and saved to database: {Email}, ID: {UserId}", user.Email, userId);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
                User = MapToUserInfo(user)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Registration failed for {Email}", registerDto.Email);
            return new AuthResponseDto
            {
                Success = false,
                Message = "Đăng ký thất bại. Vui lòng thử lại."
            };
        }
    }

    public Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        try
        {
            using var conn = OpenConnection();
            
            // Get user from database
            var getUserQuery = @"
                SELECT id, email, password, firstname, lastname, phone, authenticationprovider, 
                       isemailverified, isactive, lastloginat, createddate, profileimageurl,
                       provideruserid, username, country, dob, gender, address
                FROM users 
                WHERE email = @email AND isdeleted = false";
            
            User? user = null;
            string? hashedPassword = null;
            using (var cmd = new NpgsqlCommand(getUserQuery, conn))
            {
                cmd.Parameters.AddWithValue("email", loginDto.Email.ToLower());
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    hashedPassword = reader.IsDBNull(reader.GetOrdinal("password")) ? null : reader.GetString(reader.GetOrdinal("password"));
                    user = MapUserFromReader(reader);
                    user.Password = hashedPassword; // Store password for verification
                }
            }

            if (user == null || string.IsNullOrEmpty(hashedPassword) || !VerifyPassword(loginDto.Password, hashedPassword))
            {
                return Task.FromResult(new AuthResponseDto
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không chính xác"
                });
            }

            if (!user.IsActive)
            {
                return Task.FromResult(new AuthResponseDto
                {
                    Success = false,
                    Message = "Tài khoản đã bị vô hiệu hóa"
                });
            }

            // Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(user);
            var refreshToken = CreateRefreshToken(user.Id);

            // Update last login in database
            var updateLastLoginQuery = @"
                UPDATE users 
                SET lastloginat = @lastloginat 
                WHERE id = @id AND isdeleted = false";
            
            using (var cmd = new NpgsqlCommand(updateLastLoginQuery, conn))
            {
                cmd.Parameters.AddWithValue("id", user.Id);
                cmd.Parameters.AddWithValue("lastloginat", DateTime.UtcNow);
                cmd.ExecuteNonQuery();
            }

            _logger.LogInformation("User logged in: {Email}", user.Email);

            return Task.FromResult(new AuthResponseDto
            {
                Success = true,
                Message = "Đăng nhập thành công",
                AccessToken = accessToken,
                RefreshToken = refreshToken.Token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60")),
                User = MapToUserInfo(user)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Login failed for {Email}", loginDto.Email);
            return Task.FromResult(new AuthResponseDto
            {
                Success = false,
                Message = "Đăng nhập thất bại. Vui lòng thử lại."
            });
        }
    }

    public Task<AuthResponseDto> RefreshTokenAsync(string refreshToken, string? ipAddress = null)
    {
        try
        {
            var token = _refreshTokens.FirstOrDefault(t => t.Token == refreshToken);

            if (token == null || !token.IsActive)
            {
                return Task.FromResult(new AuthResponseDto
                {
                    Success = false,
                    Message = "Token không hợp lệ hoặc đã hết hạn"
                });
            }

            var user = _users.FirstOrDefault(u => u.Id == token.UserId);
            if (user == null || !user.IsActive)
            {
                return Task.FromResult(new AuthResponseDto
                {
                    Success = false,
                    Message = "Người dùng không tồn tại"
                });
            }

            // Revoke old refresh token
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedByIp = ipAddress;
            token.ReasonRevoked = "Replaced by new token";

            // Generate new tokens
            var newAccessToken = _jwtService.GenerateAccessToken(user);
            var newRefreshToken = CreateRefreshToken(user.Id, ipAddress);
            token.ReplacedByToken = newRefreshToken.Token;

            return Task.FromResult(new AuthResponseDto
            {
                Success = true,
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken.Token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60")),
                User = MapToUserInfo(user)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Refresh token failed");
            return Task.FromResult(new AuthResponseDto
            {
                Success = false,
                Message = "Làm mới token thất bại"
            });
        }
    }

    public Task<bool> RevokeTokenAsync(string refreshToken, string? ipAddress = null)
    {
        var token = _refreshTokens.FirstOrDefault(t => t.Token == refreshToken);
        if (token == null || !token.IsActive)
            return Task.FromResult(false);

        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = ipAddress;
        token.ReasonRevoked = "Revoked by user";

        return Task.FromResult(true);
    }

    public async Task<bool> VerifyEmailAsync(string token)
    {
        var verificationToken = _emailVerificationTokens.FirstOrDefault(t => t.Token == token);
        
        if (verificationToken == null || !verificationToken.IsValid)
            return false;

        var user = _users.FirstOrDefault(u => u.Id == verificationToken.UserId);
        if (user == null)
            return false;

        user.IsEmailVerified = true;
        verificationToken.IsUsed = true;
        verificationToken.UsedAt = DateTime.UtcNow;

        // Send welcome email
        await _emailService.SendWelcomeEmailAsync(user.Email, user.FirstName);

        _logger.LogInformation("Email verified for user: {Email}", user.Email);
        return true;
    }

    public async Task<bool> ResendVerificationEmailAsync(string email)
    {
        var user = _users.FirstOrDefault(u => u.Email.ToLower() == email.ToLower());
        if (user == null || user.IsEmailVerified)
            return false;

        // Invalidate old tokens
        var oldTokens = _emailVerificationTokens.Where(t => t.UserId == user.Id && !t.IsUsed);
        foreach (var t in oldTokens)
        {
            t.IsUsed = true;
        }

        // Create new verification token
        var verificationToken = new EmailVerificationToken
        {
            UserId = user.Id,
            Token = GenerateRandomToken(),
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };
        _emailVerificationTokens.Add(verificationToken);

        await _emailService.SendVerificationEmailAsync(user.Email, verificationToken.Token, user.FirstName);
        return true;
    }

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = _users.FirstOrDefault(u => u.Email.ToLower() == email.ToLower());
        if (user == null)
        {
            // Return true anyway to prevent email enumeration
            return true;
        }

        // Invalidate old tokens
        var oldTokens = _passwordResetTokens.Where(t => t.UserId == user.Id && !t.IsUsed);
        foreach (var t in oldTokens)
        {
            t.IsUsed = true;
        }

        // Create new reset token
        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = GenerateRandomToken(),
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };
        _passwordResetTokens.Add(resetToken);

        await _emailService.SendPasswordResetEmailAsync(user.Email, resetToken.Token, user.FirstName);
        return true;
    }

    public Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        var resetToken = _passwordResetTokens.FirstOrDefault(t => t.Token == token);
        if (resetToken == null || !resetToken.IsValid)
            return Task.FromResult(false);

        var user = _users.FirstOrDefault(u => u.Id == resetToken.UserId);
        if (user == null)
            return Task.FromResult(false);

        user.Password = HashPassword(newPassword);
        user.UpdatedDate = DateTime.UtcNow;

        resetToken.IsUsed = true;
        resetToken.UsedAt = DateTime.UtcNow;

        // Revoke all refresh tokens for this user
        var userRefreshTokens = _refreshTokens.Where(t => t.UserId == user.Id && t.IsActive);
        foreach (var t in userRefreshTokens)
        {
            t.RevokedAt = DateTime.UtcNow;
            t.ReasonRevoked = "Password reset";
        }

        _logger.LogInformation("Password reset for user: {Email}", user.Email);
        return Task.FromResult(true);
    }

    public async Task<AuthResponseDto> GoogleLoginAsync(string idToken, string? ipAddress = null)
    {
        try
        {
            // TODO: Verify Google ID token with Google API
            // For now, simulate Google authentication
            var googleUser = await VerifyGoogleTokenAsync(idToken);
            if (googleUser == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Google token không hợp lệ"
                };
            }

            return ProcessSocialLogin(googleUser, "google", ipAddress);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google login failed");
            return new AuthResponseDto
            {
                Success = false,
                Message = "Đăng nhập Google thất bại"
            };
        }
    }

    public async Task<AuthResponseDto> FacebookLoginAsync(string accessToken, string? ipAddress = null)
    {
        try
        {
            // TODO: Verify Facebook access token with Facebook API
            var facebookUser = await VerifyFacebookTokenAsync(accessToken);
            if (facebookUser == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Facebook token không hợp lệ"
                };
            }

            return ProcessSocialLogin(facebookUser, "facebook", ipAddress);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Facebook login failed");
            return new AuthResponseDto
            {
                Success = false,
                Message = "Đăng nhập Facebook thất bại"
            };
        }
    }

    public async Task<UserInfoDto?> GetCurrentUserAsync(string userId)
    {
        try
        {
            // =====================================================================
            // REDIS CACHE: Check cache first to reduce database queries
            // =====================================================================
            string cacheKey = $"user:{userId}";
            var cachedUser = await GetCachedUserAsync(cacheKey);
            if (cachedUser != null)
            {
                _logger.LogDebug("User {UserId} retrieved from cache", userId);
                return cachedUser;
            }

            // Cache miss - query database
            using var conn = OpenConnection();
            
            var getUserQuery = @"
                SELECT id, email, password, firstname, lastname, phone, authenticationprovider, 
                       isemailverified, isactive, lastloginat, createddate, profileimageurl,
                       provideruserid, username, country, dob, gender, address
                FROM users 
                WHERE id = @userId AND isdeleted = false";
            
            User? user = null;
            using (var cmd = new NpgsqlCommand(getUserQuery, conn))
            {
                cmd.Parameters.AddWithValue("userId", userId);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    user = MapUserFromReader(reader);
                }
            }
            
            if (user == null)
            {
                _logger.LogWarning("User not found: {UserId}", userId);
                return null;
            }
            
            var userInfo = MapToUserInfo(user);
            
            // Cache user for 5 minutes to reduce DB load
            await SetCachedUserAsync(cacheKey, userInfo, TimeSpan.FromMinutes(5));
            _logger.LogDebug("User {UserId} cached for 5 minutes", userId);
            
            return userInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user: {UserId}", userId);
            return null;
        }
    }

    public Task<bool> LogoutAsync(string userId, string? refreshToken = null)
    {
        if (!string.IsNullOrEmpty(refreshToken))
        {
            var token = _refreshTokens.FirstOrDefault(t => t.Token == refreshToken);
            if (token != null && token.IsActive)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.ReasonRevoked = "User logged out";
            }
        }
        else
        {
            // Revoke all refresh tokens for this user
            var userTokens = _refreshTokens.Where(t => t.UserId == userId && t.IsActive);
            foreach (var token in userTokens)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.ReasonRevoked = "User logged out";
            }
        }

        return Task.FromResult(true);
    }

    public async Task<UserInfoDto?> UpdateProfileAsync(string userId, string? firstName, string? lastName, string? phone, string? gender, string? address, string? profileImageUrl, DateTime? dob)
    {
        try
        {
            using var conn = OpenConnection();
            
            // First, check if user exists
            var checkUserQuery = @"
                SELECT id FROM users WHERE id = @userId AND isdeleted = false";
            
            using (var checkCmd = new NpgsqlCommand(checkUserQuery, conn))
            {
                checkCmd.Parameters.AddWithValue("userId", userId);
                var exists = await checkCmd.ExecuteScalarAsync();
                if (exists == null)
                {
                    _logger.LogWarning("User not found for profile update: {UserId}", userId);
                    return null;
                }
            }
            
            // Build update query dynamically based on provided fields
            var updateFields = new List<string>();
            var parameters = new List<NpgsqlParameter>();
            
            if (!string.IsNullOrEmpty(firstName))
            {
                updateFields.Add("firstname = @firstname");
                parameters.Add(new NpgsqlParameter("firstname", firstName));
            }
            if (!string.IsNullOrEmpty(lastName))
            {
                updateFields.Add("lastname = @lastname");
                parameters.Add(new NpgsqlParameter("lastname", lastName));
            }
            if (!string.IsNullOrEmpty(phone))
            {
                updateFields.Add("phone = @phone");
                parameters.Add(new NpgsqlParameter("phone", phone));
            }
            if (!string.IsNullOrEmpty(gender))
            {
                updateFields.Add("gender = @gender");
                parameters.Add(new NpgsqlParameter("gender", gender));
            }
            if (!string.IsNullOrEmpty(address))
            {
                updateFields.Add("address = @address");
                parameters.Add(new NpgsqlParameter("address", address));
            }
            if (!string.IsNullOrEmpty(profileImageUrl))
            {
                updateFields.Add("profileimageurl = @profileimageurl");
                parameters.Add(new NpgsqlParameter("profileimageurl", profileImageUrl));
            }
            if (dob.HasValue)
            {
                updateFields.Add("dob = @dob");
                parameters.Add(new NpgsqlParameter("dob", dob.Value));
            }
            
            // Always update UpdatedDate
            updateFields.Add("updateddate = @updateddate");
            parameters.Add(new NpgsqlParameter("updateddate", DateTime.UtcNow.Date));
            
            if (updateFields.Count == 1) // Only UpdatedDate
            {
                _logger.LogWarning("No fields to update for user: {UserId}", userId);
                // Still return the user info
            }
            else
            {
                var updateQuery = $@"
                    UPDATE users 
                    SET {string.Join(", ", updateFields)}
                    WHERE id = @userId AND isdeleted = false";
                
                using (var updateCmd = new NpgsqlCommand(updateQuery, conn))
                {
                    updateCmd.Parameters.AddWithValue("userId", userId);
                    foreach (var param in parameters)
                    {
                        updateCmd.Parameters.Add(param);
                    }
                    await updateCmd.ExecuteNonQueryAsync();
                }
            }
            
            // Read updated user
            var getUserQuery = @"
                SELECT id, email, password, firstname, lastname, phone, authenticationprovider, 
                       isemailverified, isactive, lastloginat, createddate, profileimageurl,
                       provideruserid, username, country, dob, gender, address
                FROM users 
                WHERE id = @userId AND isdeleted = false";
            
            User? user = null;
            using (var cmd = new NpgsqlCommand(getUserQuery, conn))
            {
                cmd.Parameters.AddWithValue("userId", userId);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    user = MapUserFromReader(reader);
                }
            }
            
            if (user == null)
            {
                _logger.LogWarning("User not found after update: {UserId}", userId);
                return null;
            }
            
            _logger.LogInformation("Profile updated for user: {UserId}", userId);
            var updatedUserInfo = MapToUserInfo(user);
            
            // Invalidate cache after update to ensure fresh data
            await InvalidateUserCacheAsync(userId);
            
            return updatedUserInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile for user: {UserId}", userId);
            return null;
        }
    }

    #region Private Methods

    private AuthResponseDto ProcessSocialLogin(SocialUserInfo socialUser, string provider, string? ipAddress)
    {
        try
        {
            using var conn = OpenConnection();
            
            // Check if user exists with this provider
            var checkUserQuery = @"
                SELECT id, email, password, firstname, lastname, phone, authenticationprovider, 
                       isemailverified, isactive, lastloginat, createddate, profileimageurl,
                       provideruserid, username, country, dob, gender, address
                FROM users 
                WHERE authenticationprovider = @provider AND provideruserid = @provideruserid AND isdeleted = false";
            
            User? user = null;
            using (var cmd = new NpgsqlCommand(checkUserQuery, conn))
            {
                cmd.Parameters.AddWithValue("provider", provider);
                cmd.Parameters.AddWithValue("provideruserid", socialUser.ProviderId);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    user = MapUserFromReader(reader);
                }
            }

            if (user == null)
            {
                // Check if email is already registered with different provider
                var checkEmailQuery = @"
                    SELECT id, email, firstname, lastname, phone, authenticationprovider, 
                           isemailverified, isactive, lastloginat, createddate, profileimageurl,
                           provideruserid, username, country
                    FROM users 
                    WHERE email = @email AND isdeleted = false";
                
                using (var cmd = new NpgsqlCommand(checkEmailQuery, conn))
                {
                    cmd.Parameters.AddWithValue("email", socialUser.Email.ToLower());
                    using var reader = cmd.ExecuteReader();
                    if (reader.Read())
                    {
                        var existingUser = MapUserFromReader(reader);
                        return new AuthResponseDto
                        {
                            Success = false,
                            Message = $"Email đã được đăng ký với {existingUser.AuthenticationProvider}. Vui lòng đăng nhập bằng {existingUser.AuthenticationProvider}."
                        };
                    }
                }

                // Create new user
                var userId = Guid.NewGuid().ToString();
                var username = socialUser.Email.Split('@')[0]; // Generate username from email
                
                var insertQuery = @"
                    INSERT INTO users (id, email, firstname, lastname, profileimageurl, 
                                     authenticationprovider, provideruserid, isemailverified, 
                                     isactive, createddate, username, country)
                    VALUES (@id, @email, @firstname, @lastname, @profileimageurl, 
                           @provider, @provideruserid, @isemailverified, 
                           @isactive, @createddate, @username, @country)";
                
                using (var cmd = new NpgsqlCommand(insertQuery, conn))
                {
                    cmd.Parameters.AddWithValue("id", userId);
                    cmd.Parameters.AddWithValue("email", socialUser.Email.ToLower());
                    cmd.Parameters.AddWithValue("firstname", (object?)socialUser.FirstName ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("lastname", (object?)socialUser.LastName ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("profileimageurl", (object?)socialUser.ProfileImageUrl ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("provider", provider);
                    cmd.Parameters.AddWithValue("provideruserid", socialUser.ProviderId);
                    cmd.Parameters.AddWithValue("isemailverified", true); // Social login emails are verified
                    cmd.Parameters.AddWithValue("isactive", true);
                    cmd.Parameters.AddWithValue("createddate", DateTime.UtcNow.Date);
                    cmd.Parameters.AddWithValue("username", username);
                    cmd.Parameters.AddWithValue("country", "Vietnam");
                    
                    cmd.ExecuteNonQuery();
                }

                // Read the newly created user
                using (var cmd = new NpgsqlCommand(checkUserQuery, conn))
                {
                    cmd.Parameters.AddWithValue("provider", provider);
                    cmd.Parameters.AddWithValue("provideruserid", socialUser.ProviderId);
                    using var reader = cmd.ExecuteReader();
                    if (reader.Read())
                    {
                        user = MapUserFromReader(reader);
                    }
                }

                _logger.LogInformation("User saved to database: {Email}, ID: {UserId}", user?.Email, userId);
                _logger.LogInformation("New user registered via {Provider}: {Email}", provider, user?.Email);
            }
            else
            {
                // Update user info if provided (avatar, name might have changed)
                // Only update ProfileImageUrl if it's provided and not empty
                var updateFields = new List<string>();
                var parameters = new List<NpgsqlParameter>();
                
                // Only update ProfileImageUrl if social provider has a new one
                if (!string.IsNullOrEmpty(socialUser.ProfileImageUrl))
                {
                    updateFields.Add("profileimageurl = @profileimageurl");
                    parameters.Add(new NpgsqlParameter("profileimageurl", socialUser.ProfileImageUrl));
                }
                
                if (!string.IsNullOrEmpty(socialUser.FirstName))
                {
                    updateFields.Add("firstname = @firstname");
                    parameters.Add(new NpgsqlParameter("firstname", socialUser.FirstName));
                }
                
                if (!string.IsNullOrEmpty(socialUser.LastName))
                {
                    updateFields.Add("lastname = @lastname");
                    parameters.Add(new NpgsqlParameter("lastname", socialUser.LastName));
                }
                
                // Always update last login and updated date
                updateFields.Add("lastloginat = @lastloginat");
                parameters.Add(new NpgsqlParameter("lastloginat", DateTime.UtcNow));
                updateFields.Add("updateddate = @updateddate");
                parameters.Add(new NpgsqlParameter("updateddate", DateTime.UtcNow.Date));
                
                if (updateFields.Count > 0)
                {
                    var updateQuery = $@"
                        UPDATE users 
                        SET {string.Join(", ", updateFields)}
                        WHERE id = @id";
                    
                    using (var cmd = new NpgsqlCommand(updateQuery, conn))
                    {
                        cmd.Parameters.AddWithValue("id", user.Id);
                        foreach (var param in parameters)
                        {
                            cmd.Parameters.Add(param);
                        }
                        cmd.ExecuteNonQuery();
                    }
                }

                // Update local user object
                if (!string.IsNullOrEmpty(socialUser.ProfileImageUrl))
                    user.ProfileImageUrl = socialUser.ProfileImageUrl;
                if (!string.IsNullOrEmpty(socialUser.FirstName))
                    user.FirstName = socialUser.FirstName;
                if (!string.IsNullOrEmpty(socialUser.LastName))
                    user.LastName = socialUser.LastName;
                user.LastLoginAt = DateTime.UtcNow;
            }

            if (user == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Không thể tạo hoặc tìm thấy người dùng"
                };
            }

            // Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(user);
            var refreshToken = CreateRefreshToken(user.Id, ipAddress);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Đăng nhập thành công",
                AccessToken = accessToken,
                RefreshToken = refreshToken.Token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60")),
                User = MapToUserInfo(user)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing social login for provider: {Provider}", provider);
            return new AuthResponseDto
            {
                Success = false,
                Message = "Đăng nhập thất bại. Vui lòng thử lại."
            };
        }
    }

    private RefreshToken CreateRefreshToken(string userId, string? ipAddress = null)
    {
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            Token = _jwtService.GenerateRefreshToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedByIp = ipAddress
        };

        _refreshTokens.Add(refreshToken);
        return refreshToken;
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    private static bool VerifyPassword(string password, string hashedPassword)
    {
        var hash = HashPassword(password);
        return hash == hashedPassword;
    }

    private static string GenerateRandomToken()
    {
        var randomBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    private static UserInfoDto MapToUserInfo(User user)
    {
        return new UserInfoDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            ProfileImageUrl = user.ProfileImageUrl,
            IsEmailVerified = user.IsEmailVerified,
            AuthenticationProvider = user.AuthenticationProvider
        };
    }

    // Verify Google access token by calling Google's userinfo API
    private async Task<SocialUserInfo?> VerifyGoogleTokenAsync(string accessToken)
    {
        try
        {
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var response = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v2/userinfo");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Google token verification failed: {StatusCode}", response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var googleUser = System.Text.Json.JsonSerializer.Deserialize<GoogleUserInfo>(content, 
                new System.Text.Json.JsonSerializerOptions 
                { 
                    PropertyNameCaseInsensitive = true 
                });

            if (googleUser == null || string.IsNullOrEmpty(googleUser.Email))
            {
                _logger.LogWarning("Failed to parse Google user info");
                return null;
            }

            // Xử lý tên từ Google: ưu tiên GivenName/FamilyName, nếu không có thì split từ Name
            string? firstName = googleUser.GivenName;
            string? lastName = googleUser.FamilyName;
            
            if (string.IsNullOrEmpty(firstName) && string.IsNullOrEmpty(lastName) && !string.IsNullOrEmpty(googleUser.Name))
            {
                // Split full name thành first name và last name
                var nameParts = googleUser.Name.Trim().Split(new[] { ' ' }, 2, StringSplitOptions.RemoveEmptyEntries);
                firstName = nameParts.Length > 0 ? nameParts[0] : null;
                lastName = nameParts.Length > 1 ? nameParts[1] : null;
            }

            return new SocialUserInfo
            {
                ProviderId = googleUser.Id ?? "",
                Email = googleUser.Email,
                FirstName = firstName,
                LastName = lastName,
                ProfileImageUrl = googleUser.Picture,
                Provider = "google"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying Google token");
            return null;
        }
    }

    // Google userinfo response model
    private class GoogleUserInfo
    {
        public string? Id { get; set; }
        public string? Email { get; set; }
        public bool VerifiedEmail { get; set; }
        public string? Name { get; set; }
        public string? GivenName { get; set; }
        public string? FamilyName { get; set; }
        public string? Picture { get; set; }
    }

    // Verify Facebook access token by calling Facebook's Graph API
    private async Task<SocialUserInfo?> VerifyFacebookTokenAsync(string accessToken)
    {
        try
        {
            using var httpClient = new HttpClient();
            
            // Gọi Facebook Graph API để lấy thông tin user (bao gồm name để fallback)
            var response = await httpClient.GetAsync(
                $"https://graph.facebook.com/me?fields=id,email,first_name,last_name,name,picture&access_token={accessToken}");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Facebook token verification failed: {StatusCode}", response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var facebookUser = System.Text.Json.JsonSerializer.Deserialize<FacebookUserInfo>(content, 
                new System.Text.Json.JsonSerializerOptions 
                { 
                    PropertyNameCaseInsensitive = true 
                });

            if (facebookUser == null || string.IsNullOrEmpty(facebookUser.Id))
            {
                _logger.LogWarning("Failed to parse Facebook user info");
                return null;
            }

            // Facebook có thể không trả về email nếu user không cấp quyền
            var email = facebookUser.Email ?? $"{facebookUser.Id}@facebook.com";

            // Xử lý tên từ Facebook: ưu tiên FirstName/LastName, nếu không có thì split từ Name
            string? firstName = facebookUser.FirstName;
            string? lastName = facebookUser.LastName;
            
            if (string.IsNullOrEmpty(firstName) && string.IsNullOrEmpty(lastName) && !string.IsNullOrEmpty(facebookUser.Name))
            {
                // Split full name thành first name và last name
                var nameParts = facebookUser.Name.Trim().Split(new[] { ' ' }, 2, StringSplitOptions.RemoveEmptyEntries);
                firstName = nameParts.Length > 0 ? nameParts[0] : null;
                lastName = nameParts.Length > 1 ? nameParts[1] : null;
            }

            return new SocialUserInfo
            {
                ProviderId = facebookUser.Id,
                Email = email,
                FirstName = firstName,
                LastName = lastName,
                ProfileImageUrl = facebookUser.Picture?.Data?.Url,
                Provider = "facebook"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying Facebook token");
            return null;
        }
    }

    // Facebook userinfo response model
    private class FacebookUserInfo
    {
        public string? Id { get; set; }
        public string? Email { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Name { get; set; }
        public FacebookPicture? Picture { get; set; }
    }

    private class FacebookPicture
    {
        public FacebookPictureData? Data { get; set; }
    }

    private class FacebookPictureData
    {
        public string? Url { get; set; }
    }

    private NpgsqlConnection OpenConnection()
    {
        var cs = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("ConnectionStrings:DefaultConnection chưa được cấu hình.");

        var conn = new NpgsqlConnection(cs);
        conn.Open();
        return conn;
    }

    // =====================================================================
    // REDIS CACHE: Helper methods for user caching
    // =====================================================================
    private async Task<UserInfoDto?> GetCachedUserAsync(string cacheKey)
    {
        if (_distributedCache == null) return null;

        try
        {
            var cachedBytes = await _distributedCache.GetAsync(cacheKey);
            if (cachedBytes == null || cachedBytes.Length == 0)
                return null;

            var json = Encoding.UTF8.GetString(cachedBytes);
            return JsonSerializer.Deserialize<UserInfoDto>(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error reading from cache for key {CacheKey}", cacheKey);
            return null;
        }
    }

    private async Task SetCachedUserAsync(string cacheKey, UserInfoDto userInfo, TimeSpan expiration)
    {
        if (_distributedCache == null) return;

        try
        {
            var json = JsonSerializer.Serialize(userInfo);
            var bytes = Encoding.UTF8.GetBytes(json);
            
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration
            };
            
            await _distributedCache.SetAsync(cacheKey, bytes, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error writing to cache for key {CacheKey}", cacheKey);
            // Don't throw - caching is best effort
        }
    }

    private async Task InvalidateUserCacheAsync(string userId)
    {
        if (_distributedCache == null) return;

        try
        {
            string cacheKey = $"user:{userId}";
            await _distributedCache.RemoveAsync(cacheKey);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error invalidating cache for user {UserId}", userId);
        }
    }

    private User MapUserFromReader(NpgsqlDataReader reader)
    {
        return new User
        {
            Id = reader.GetString(reader.GetOrdinal("id")),
            Email = reader.GetString(reader.GetOrdinal("email")),
            FirstName = reader.IsDBNull(reader.GetOrdinal("firstname")) ? null : reader.GetString(reader.GetOrdinal("firstname")),
            LastName = reader.IsDBNull(reader.GetOrdinal("lastname")) ? null : reader.GetString(reader.GetOrdinal("lastname")),
            Phone = reader.IsDBNull(reader.GetOrdinal("phone")) ? null : reader.GetString(reader.GetOrdinal("phone")),
            AuthenticationProvider = reader.GetString(reader.GetOrdinal("authenticationprovider")),
            IsEmailVerified = reader.GetBoolean(reader.GetOrdinal("isemailverified")),
            IsActive = reader.GetBoolean(reader.GetOrdinal("isactive")),
            LastLoginAt = reader.IsDBNull(reader.GetOrdinal("lastloginat")) ? null : reader.GetDateTime(reader.GetOrdinal("lastloginat")),
            CreatedDate = reader.IsDBNull(reader.GetOrdinal("createddate")) ? DateTime.UtcNow : reader.GetDateTime(reader.GetOrdinal("createddate")),
            ProfileImageUrl = reader.IsDBNull(reader.GetOrdinal("profileimageurl")) ? null : reader.GetString(reader.GetOrdinal("profileimageurl")),
            ProviderUserId = reader.IsDBNull(reader.GetOrdinal("provideruserid")) ? null : reader.GetString(reader.GetOrdinal("provideruserid")),
            Username = reader.IsDBNull(reader.GetOrdinal("username")) ? null : reader.GetString(reader.GetOrdinal("username")),
            Dob = reader.IsDBNull(reader.GetOrdinal("dob")) ? null : reader.GetDateTime(reader.GetOrdinal("dob")),
            Gender = reader.IsDBNull(reader.GetOrdinal("gender")) ? null : reader.GetString(reader.GetOrdinal("gender")),
            Address = reader.IsDBNull(reader.GetOrdinal("address")) ? null : reader.GetString(reader.GetOrdinal("address")),
            Password = null // Not needed for social login
        };
    }

    #endregion
}
