namespace Aura.Application.DTOs.Images;

public class ImageUploadDto
{
    public string? ImageType { get; set; } // Fundus or OCT
    public string? EyeSide { get; set; } // Left, Right, Both
    public string? CaptureDevice { get; set; }
    public DateTime? CaptureDate { get; set; }
}

public class ImageUploadResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string OriginalFilename { get; set; } = string.Empty;
    public string CloudinaryUrl { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ImageType { get; set; } = string.Empty;
    public string UploadStatus { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}

public class MultipleImageUploadResponseDto
{
    public List<ImageUploadResponseDto> SuccessfullyUploaded { get; set; } = new();
    public List<ImageUploadErrorDto> Failed { get; set; } = new();
}

public class ImageUploadErrorDto
{
    public string Filename { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}

