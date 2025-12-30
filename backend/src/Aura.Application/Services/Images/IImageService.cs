using Aura.Application.DTOs.Images;

namespace Aura.Application.Services.Images;

public interface IImageService
{
    Task<ImageUploadResponseDto> UploadImageAsync(
        string userId,
        Stream fileStream,
        string originalFilename,
        ImageUploadDto? metadata = null,
        string? userEmail = null,
        string? firstName = null,
        string? lastName = null);

    Task<MultipleImageUploadResponseDto> UploadMultipleImagesAsync(
        string userId,
        List<(Stream FileStream, string Filename, ImageUploadDto? Metadata)> files);
}

