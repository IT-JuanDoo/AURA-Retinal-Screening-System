using System.Security.Claims;
using Aura.Application.DTOs.Users;
using Aura.Application.Services.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aura.UserService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userService.GetAllAsync();
        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        var user = await _userService.GetByIdAsync(id);
        return user == null ? NotFound() : Ok(user);
    }

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

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserProfileDto dto)
    {
        var updated = await _userService.UpdateProfileAsync(id, dto);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpPut("{id}/medical")]
    public async Task<IActionResult> UpdateMedical(string id, [FromBody] UpdateMedicalInfoDto dto)
    {
        var updated = await _userService.UpdateMedicalInfoAsync(id, dto);
        return updated == null ? NotFound() : Ok(updated);
    }

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

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var deleted = await _userService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

