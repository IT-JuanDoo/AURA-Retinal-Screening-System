using Microsoft.AspNetCore.Mvc;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    // TODO: Inject IUserService

    [HttpGet]
    public IActionResult GetUsers()
    {
        // TODO: Implement get all users
        return Ok(new { message = "Get all users - Not implemented yet" });
    }

    [HttpGet("{id}")]
    public IActionResult GetUser(string id)
    {
        // TODO: Implement get user by id
        return Ok(new { message = $"Get user {id} - Not implemented yet" });
    }

    [HttpPut("{id}")]
    public IActionResult UpdateUser(string id, [FromBody] object updateDto)
    {
        // TODO: Implement update user
        return Ok(new { message = $"Update user {id} - Not implemented yet" });
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteUser(string id)
    {
        // TODO: Implement delete user
        return Ok(new { message = $"Delete user {id} - Not implemented yet" });
    }

    [HttpPost("{id}/upload-avatar")]
    public IActionResult UploadAvatar(string id, IFormFile file)
    {
        // TODO: Implement upload avatar
        return Ok(new { message = $"Upload avatar for user {id} - Not implemented yet" });
    }
}
