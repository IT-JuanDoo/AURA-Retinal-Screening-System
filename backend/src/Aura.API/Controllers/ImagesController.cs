using Aura.Application.DTOs.Images;
using Aura.Application.Services.Images;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aura.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ImagesController : ControllerBase
{
    private readonly IImageService _imageService;
    private readonly ILogger<ImagesController> _logger;

    public ImagesController(IImageService imageService, ILogger<ImagesController> logger)
    {
        _imageService = imageService;
        _logger = logger;
    }

    /// <summary>
    /// Upload a single retinal image
    /// </summary>
    [HttpPost("upload")]
    [ProducesResponseType(typeof(ImageUploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file, [FromForm] ImageUploadDto? metadata)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        // Get user email from claims for auto-creation if needed
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? $"user_{userId.Substring(0, 8)}@aura.local";
        var firstName = User.FindFirstValue(ClaimTypes.GivenName) ?? "User";
        var lastName = User.FindFirstValue(ClaimTypes.Surname) ?? userId.Substring(0, 8);

        try
        {
            using var stream = file.OpenReadStream();
            // Reset stream position to beginning in case it was read before
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

    /// <summary>
    /// Upload multiple retinal images
    /// </summary>
    [HttpPost("upload-multiple")]
    [ProducesResponseType(typeof(MultipleImageUploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UploadMultipleImages([FromForm] List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest(new { message = "No files uploaded" });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        try
        {
            var fileData = new List<(Stream FileStream, string Filename, ImageUploadDto? Metadata)>();

            foreach (var file in files)
            {
                if (file.Length > 0)
                {
                    var stream = file.OpenReadStream();
                    fileData.Add((stream, file.FileName, null));
                }
            }

            var result = await _imageService.UploadMultipleImagesAsync(userId, fileData);

            // Dispose streams
            foreach (var (stream, _, _) in fileData)
            {
                await stream.DisposeAsync();
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading multiple images");
            return StatusCode(500, new { message = "Failed to upload images" });
        }
    }

    /// <summary>
    /// Get user's uploaded images
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ImageUploadResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUserImages()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        // TODO: Implement GetUserImagesAsync in ImageService
        return Ok(new List<ImageUploadResponseDto>());
    }
}

