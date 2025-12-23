using Microsoft.AspNetCore.Mvc;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    // TODO: Inject IUserService

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        // TODO: Implement get all users
        return Ok();
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        // TODO: Implement get user by id
        return Ok();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] object updateDto)
    {
        // TODO: Implement update user
        return Ok();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        // TODO: Implement delete user
        return Ok();
    }

    [HttpPost("{id}/upload-avatar")]
    public async Task<IActionResult> UploadAvatar(string id, IFormFile file)
    {
        // TODO: Implement upload avatar
        return Ok();
    }
}

