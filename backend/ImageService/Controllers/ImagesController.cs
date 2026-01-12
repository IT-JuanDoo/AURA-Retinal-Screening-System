using Aura.Application.DTOs.Images;
using Aura.Application.Services.Images;
using Microsoft.AspNetCore.Mvc;

namespace Aura.ImageService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImagesController : ControllerBase
{
    private readonly IImageService _imageService;
    private readonly ILogger<ImagesController> _logger;

    public ImagesController(IImageService imageService, ILogger<ImagesController> logger)
    {
        _imageService = imageService;
        _logger = logger;
    }

    [HttpPost("upload")]
    [ProducesResponseType(typeof(ImageUploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file, [FromForm] ImageUploadDto? metadata)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        var userId = Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous-user";
        var userEmail = Request.Headers["X-User-Email"].FirstOrDefault();
        var firstName = Request.Headers["X-User-FirstName"].FirstOrDefault();
        var lastName = Request.Headers["X-User-LastName"].FirstOrDefault();

        try
        {
            using var stream = file.OpenReadStream();
            if (stream.CanSeek)
            {
                stream.Position = 0;
            }

            var result = await _imageService.UploadImageAsync(
                userId,
                stream,
                file.FileName,
                metadata,
                userEmail,
                firstName,
                lastName
            );

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid file upload: {Filename}", file.FileName);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading image: {Filename}", file.FileName);
            return StatusCode(500, new { message = "Failed to upload image" });
        }
    }
}

