using Aura.Application.DTOs.Users;
using Aura.Application.Services.Auth;
using Aura.Application.Services.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IAuthService _authService;

    public UsersController(IUserService userService, IAuthService authService)
    {
        _userService = userService;
        _authService = authService;
    }

    // GET: /api/users
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userService.GetAllAsync();
        return Ok(users);
    }

    // GET: /api/users/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        var user = await _userService.GetByIdAsync(id);
        return user == null ? NotFound() : Ok(user);
    }

    // POST: /api/users
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        try
        {
            var created = await _userService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetUser), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    // PUT: /api/users/me  (update current user's profile)
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateCurrentUserProfile([FromBody] UpdateUserProfileDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Không thể xác định người dùng" });
        }

        try
        {
            // Parse DOB if provided
            DateTime? dob = null;
            if (dto.Dob.HasValue)
            {
                dob = dto.Dob.Value;
            }

            // Use AuthService to update profile (users are stored there)
            var updated = await _authService.UpdateProfileAsync(
                userId,
                dto.FirstName,
                dto.LastName,
                dto.Phone,
                dto.Gender,
                dto.Address,
                dto.ProfileImageUrl,
                dob
            );
            
            if (updated == null)
            {
                return NotFound(new { message = "Người dùng không tồn tại" });
            }
            
            return Ok(new { success = true, user = updated });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT: /api/users/{id}  (update profile)
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserProfileDto dto)
    {
        // Only allow users to update their own profile
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId != id)
        {
            return Forbid();
        }

        try
        {
            var updated = await _userService.UpdateProfileAsync(id, dto);
            return updated == null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    // PUT: /api/users/{id}/medical  (update medical info)
    [HttpPut("{id}/medical")]
    public async Task<IActionResult> UpdateMedical(string id, [FromBody] UpdateMedicalInfoDto dto)
    {
        var updated = await _userService.UpdateMedicalInfoAsync(id, dto);
        return updated == null ? NotFound() : Ok(updated);
    }

    // PUT: /api/users/{id}/password  (change password)
    [HttpPut("{id}/password")]
    public async Task<IActionResult> ChangePassword(string id, [FromBody] ChangePasswordDto dto)
    {
        try
        {
            var success = await _userService.ChangePasswordAsync(id, dto);
            return success ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // DELETE: /api/users/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var deleted = await _userService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    /// <summary>
    /// Upload avatar cho user
    /// </summary>
    [HttpPost("{id}/upload-avatar")]
    [Authorize]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5MB limit for avatar
    public async Task<IActionResult> UploadAvatar(string id, IFormFile file, [FromServices] IConfiguration configuration)
    {
        // Verify user owns this resource
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId != id)
        {
            return Forbid();
        }

        // Validate file
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "File is required" });
        }

        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
        {
            return BadRequest(new { message = "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." });
        }

        try
        {
            // Upload to Cloudinary
            var cloudName = configuration["Cloudinary:CloudName"];
            var apiKey = configuration["Cloudinary:ApiKey"];
            var apiSecret = configuration["Cloudinary:ApiSecret"];

            string avatarUrl;

            if (string.IsNullOrWhiteSpace(cloudName) || 
                string.IsNullOrWhiteSpace(apiKey) || 
                string.IsNullOrWhiteSpace(apiSecret))
            {
                // Return placeholder URL for development
                avatarUrl = $"https://placeholder.aura-health.com/avatars/{id}/{file.FileName}";
            }
            else
            {
                var account = new CloudinaryDotNet.Account(cloudName, apiKey, apiSecret);
                var cloudinary = new CloudinaryDotNet.Cloudinary(account);

                await using var stream = file.OpenReadStream();
                var uploadParams = new CloudinaryDotNet.Actions.ImageUploadParams
                {
                    File = new CloudinaryDotNet.FileDescription(file.FileName, stream),
                    Folder = "aura/avatars",
                    PublicId = $"avatar_{id}_{DateTime.UtcNow:yyyyMMddHHmmss}",
                    Overwrite = true,
                    Transformation = new CloudinaryDotNet.Transformation()
                        .Width(200).Height(200).Crop("fill").Gravity("face")
                };

                var uploadResult = await cloudinary.UploadAsync(uploadParams);

                if (uploadResult.StatusCode != System.Net.HttpStatusCode.OK)
                {
                    return BadRequest(new { message = "Failed to upload avatar" });
                }

                avatarUrl = uploadResult.SecureUrl.ToString();
            }

            // Update user profile with new avatar URL
            var updated = await _userService.UpdateProfileAsync(id, new UpdateUserProfileDto
            {
                ProfileImageUrl = avatarUrl
            });

            if (updated == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new { 
                success = true,
                avatarUrl = avatarUrl,
                message = "Avatar uploaded successfully"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Failed to upload avatar: {ex.Message}" });
        }
    }
}
