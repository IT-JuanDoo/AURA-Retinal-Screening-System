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

    // Avatar upload vẫn để TODO cho task khác
    [HttpPost("{id}/upload-avatar")]
    public IActionResult UploadAvatar(string id, IFormFile file)
    {
        return Ok(new { message = $"Upload avatar for user {id} - Not implemented yet" });
    }
}
