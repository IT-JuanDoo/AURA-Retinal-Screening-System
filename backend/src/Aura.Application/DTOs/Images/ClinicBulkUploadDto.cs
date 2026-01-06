namespace Aura.Application.DTOs.Images;

/// <summary>
/// DTO for clinic bulk image upload request
/// </summary>
public class ClinicBulkUploadDto
{
    /// <summary>
    /// Optional: Patient user ID if uploading for a specific patient
    /// </summary>
    public string? PatientUserId { get; set; }
    
    /// <summary>
    /// Optional: Doctor ID if uploading for a specific doctor
    /// </summary>
    public string? DoctorId { get; set; }
    
    /// <summary>
    /// Optional: Batch name/description for this bulk upload
    /// </summary>
    public string? BatchName { get; set; }
    
    /// <summary>
    /// Optional: Common metadata for all images in this batch
    /// </summary>
    public ImageUploadDto? CommonMetadata { get; set; }
    
    /// <summary>
    /// Whether to automatically start AI analysis after upload
    /// </summary>
    public bool AutoStartAnalysis { get; set; } = true;
}

/// <summary>
/// Response DTO for clinic bulk upload
/// </summary>
public class ClinicBulkUploadResponseDto
{
    /// <summary>
    /// Batch ID for tracking this bulk upload
    /// </summary>
    public string BatchId { get; set; } = string.Empty;
    
    /// <summary>
    /// Total number of files uploaded
    /// </summary>
    public int TotalFiles { get; set; }
    
    /// <summary>
    /// Number of successfully uploaded images
    /// </summary>
    public int SuccessCount { get; set; }
    
    /// <summary>
    /// Number of failed uploads
    /// </summary>
    public int FailedCount { get; set; }
    
    /// <summary>
    /// Successfully uploaded images
    /// </summary>
    public List<ImageUploadResponseDto> SuccessfullyUploaded { get; set; } = new();
    
    /// <summary>
    /// Failed uploads with error details
    /// </summary>
    public List<ImageUploadErrorDto> Failed { get; set; } = new();
    
    /// <summary>
    /// Analysis job ID if AutoStartAnalysis is true
    /// </summary>
    public string? AnalysisJobId { get; set; }
    
    /// <summary>
    /// Upload timestamp
    /// </summary>
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// DTO for batch analysis status
/// </summary>
public class BatchAnalysisStatusDto
{
    public string JobId { get; set; } = string.Empty;
    public string BatchId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // Queued, Processing, Completed, Failed
    public int TotalImages { get; set; }
    public int ProcessedCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<string> ImageIds { get; set; } = new();
}

