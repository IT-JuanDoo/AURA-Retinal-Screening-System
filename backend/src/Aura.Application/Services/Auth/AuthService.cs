using System.Security.Cryptography;
using System.Text;
using Aura.Application.DTOs.Auth;
using Aura.Core.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Aura.Application.Services.Auth;

public class AuthService : IAuthService
{
    private readonly IJwtService _jwtService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    
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
        ILogger<AuthService> logger)
    {
        _jwtService = jwtService;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        try
        {
            // Check if email already exists
            if (_users.Any(u => u.Email.ToLower() == registerDto.Email.ToLower()))
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email đã được sử dụng"
                };
            }

            // Create new user
            var user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = registerDto.Email.ToLower(),
                Password = HashPassword(registerDto.Password),
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                Phone = registerDto.Phone,
                AuthenticationProvider = "email",
                IsEmailVerified = false,
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };

            _users.Add(user);

            // Create email verification token
            var verificationToken = new EmailVerificationToken
            {
                UserId = user.Id,
                Token = GenerateRandomToken(),
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };
            _emailVerificationTokens.Add(verificationToken);

            // Send verification email
            await _emailService.SendVerificationEmailAsync(user.Email, verificationToken.Token, user.FirstName);

            _logger.LogInformation("User registered successfully: {Email}", user.Email);

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
            var user = _users.FirstOrDefault(u => 
                u.Email.ToLower() == loginDto.Email.ToLower() && 
                !u.IsDeleted);

            if (user == null || !VerifyPassword(loginDto.Password, user.Password ?? ""))
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

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;

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

    public Task<UserInfoDto?> GetCurrentUserAsync(string userId)
    {
        var user = _users.FirstOrDefault(u => u.Id == userId && !u.IsDeleted);
        return Task.FromResult(user != null ? MapToUserInfo(user) : null);
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

    public Task<UserInfoDto?> UpdateProfileAsync(string userId, string? firstName, string? lastName, string? phone, string? gender, string? address, string? profileImageUrl, DateTime? dob)
    {
        var user = _users.FirstOrDefault(u => u.Id == userId && !u.IsDeleted);
        if (user == null)
        {
            _logger.LogWarning("User not found for profile update: {UserId}", userId);
            return Task.FromResult<UserInfoDto?>(null);
        }

        // Update fields if provided
        if (!string.IsNullOrEmpty(firstName)) user.FirstName = firstName;
        if (!string.IsNullOrEmpty(lastName)) user.LastName = lastName;
        if (!string.IsNullOrEmpty(phone)) user.Phone = phone;
        if (!string.IsNullOrEmpty(gender)) user.Gender = gender;
        if (!string.IsNullOrEmpty(address)) user.Address = address;
        if (!string.IsNullOrEmpty(profileImageUrl)) user.ProfileImageUrl = profileImageUrl;
        if (dob.HasValue) user.Dob = dob.Value;
        
        user.UpdatedDate = DateTime.UtcNow;

        _logger.LogInformation("Profile updated for user: {UserId}", userId);
        return Task.FromResult<UserInfoDto?>(MapToUserInfo(user));
    }

    #region Private Methods

    private AuthResponseDto ProcessSocialLogin(SocialUserInfo socialUser, string provider, string? ipAddress)
    {
        // Check if user exists with this provider
        var user = _users.FirstOrDefault(u => 
            u.AuthenticationProvider == provider && 
            u.ProviderUserId == socialUser.ProviderId);

        if (user == null)
        {
            // Check if email is already registered with different provider
            var existingUser = _users.FirstOrDefault(u => u.Email.ToLower() == socialUser.Email.ToLower());
            if (existingUser != null)
            {
                // Link account or return error based on business logic
                return new AuthResponseDto
                {
                    Success = false,
                    Message = $"Email đã được đăng ký với {existingUser.AuthenticationProvider}. Vui lòng đăng nhập bằng {existingUser.AuthenticationProvider}."
                };
            }

            // Create new user
            user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = socialUser.Email.ToLower(),
                FirstName = socialUser.FirstName,
                LastName = socialUser.LastName,
                ProfileImageUrl = socialUser.ProfileImageUrl,
                AuthenticationProvider = provider,
                ProviderUserId = socialUser.ProviderId,
                IsEmailVerified = true, // Social login emails are verified
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };

            _users.Add(user);
            _logger.LogInformation("New user registered via {Provider}: {Email}", provider, user.Email);
        }

        // Update user info if provided (avatar, name might have changed)
        if (!string.IsNullOrEmpty(socialUser.ProfileImageUrl) && user.ProfileImageUrl != socialUser.ProfileImageUrl)
        {
            user.ProfileImageUrl = socialUser.ProfileImageUrl;
        }
        if (!string.IsNullOrEmpty(socialUser.FirstName))
        {
            user.FirstName = socialUser.FirstName;
        }
        if (!string.IsNullOrEmpty(socialUser.LastName))
        {
            user.LastName = socialUser.LastName;
        }

        // Generate tokens
        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = CreateRefreshToken(user.Id, ipAddress);

        user.LastLoginAt = DateTime.UtcNow;

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

    #endregion
}
