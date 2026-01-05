namespace Aura.Core.Entities;

/// <summary>
/// Entity for tracking bulk image upload batches from clinics (FR-24)
/// </summary>
public class BulkUploadBatch
{
    public string Id { get; set; } = string.Empty;
    public string ClinicId { get; set; } = string.Empty;
    public string UploadedBy { get; set; } = string.Empty;
    public string UploadedByType { get; set; } = string.Empty; // Doctor, Admin, ClinicManager
    public string? BatchName { get; set; }
    public int TotalImages { get; set; }
    public int ProcessedImages { get; set; }
    public int FailedImages { get; set; }
    public int ProcessingImages { get; set; }
    public string UploadStatus { get; set; } = "Pending"; // Pending, Uploading, Processing, Completed, Failed, PartiallyCompleted
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? FailureReason { get; set; }
    public string? Metadata { get; set; } // JSON string for additional metadata
    public DateTime? CreatedDate { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
    public string? Note { get; set; }
}

