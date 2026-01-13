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

    /// <summary>
    /// Upload image for clinic with optional patient and doctor assignment
    /// </summary>
    Task<ImageUploadResponseDto> UploadImageForClinicAsync(
        string clinicId,
        Stream fileStream,
        string originalFilename,
        ImageUploadDto? metadata = null,
        string? patientUserId = null,
        string? doctorId = null);

    /// <summary>
    /// Bulk upload images for clinic (FR-24)
    /// </summary>
    Task<ClinicBulkUploadResponseDto> BulkUploadForClinicAsync(
        string clinicId,
        List<(Stream FileStream, string Filename, ImageUploadDto? Metadata)> files,
        ClinicBulkUploadDto? options = null);

    /// <summary>
    /// Get all images uploaded by a user (FR-6)
    /// </summary>
    Task<List<ImageUploadResponseDto>> GetUserImagesAsync(string userId);
}

