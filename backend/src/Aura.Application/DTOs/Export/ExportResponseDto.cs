namespace Aura.Application.DTOs.Export;

/// <summary>
/// DTO cho response khi export báo cáo thành công
/// </summary>
public class ExportResponseDto
{
    /// <summary>
    /// ID duy nhất của báo cáo đã export
    /// </summary>
    public string ExportId { get; set; } = string.Empty;
    
    /// <summary>
    /// ID của kết quả phân tích
    /// </summary>
    public string? AnalysisResultId { get; set; }
    
    /// <summary>
    /// Loại báo cáo: PDF, CSV, JSON, Excel
    /// </summary>
    public string ReportType { get; set; } = string.Empty;
    
    /// <summary>
    /// Tên file báo cáo
    /// </summary>
    public string FileName { get; set; } = string.Empty;
    
    /// <summary>
    /// URL để download báo cáo
    /// </summary>
    public string FileUrl { get; set; } = string.Empty;
    
    /// <summary>
    /// Kích thước file (bytes)
    /// </summary>
    public long FileSize { get; set; }
    
    /// <summary>
    /// Kích thước file được format (KB, MB)
    /// </summary>
    public string FileSizeFormatted => FormatFileSize(FileSize);
    
    /// <summary>
    /// Thời điểm export
    /// </summary>
    public DateTime ExportedAt { get; set; }
    
    /// <summary>
    /// Thời điểm hết hạn download
    /// </summary>
    public DateTime? ExpiresAt { get; set; }
    
    /// <summary>
    /// Số lần đã download
    /// </summary>
    public int DownloadCount { get; set; }
    
    /// <summary>
    /// Trạng thái: Available, Expired, Deleted
    /// </summary>
    public string Status => GetStatus();
    
    private string GetStatus()
    {
        if (ExpiresAt.HasValue && ExpiresAt.Value < DateTime.UtcNow)
            return "Expired";
        return "Available";
    }
    
    private static string FormatFileSize(long bytes)
    {
        if (bytes < 1024) return $"{bytes} B";
        if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
        if (bytes < 1024 * 1024 * 1024) return $"{bytes / (1024.0 * 1024):F1} MB";
        return $"{bytes / (1024.0 * 1024 * 1024):F1} GB";
    }
}

/// <summary>
/// DTO cho response khi export nhiều báo cáo
/// </summary>
public class BatchExportResponseDto
{
    /// <summary>
    /// Tổng số báo cáo yêu cầu export
    /// </summary>
    public int TotalRequested { get; set; }
    
    /// <summary>
    /// Số báo cáo export thành công
    /// </summary>
    public int SuccessCount { get; set; }
    
    /// <summary>
    /// Số báo cáo export thất bại
    /// </summary>
    public int FailedCount { get; set; }
    
    /// <summary>
    /// Danh sách báo cáo đã export thành công
    /// </summary>
    public List<ExportResponseDto> SuccessfulExports { get; set; } = new();
    
    /// <summary>
    /// Danh sách lỗi khi export thất bại
    /// </summary>
    public List<ExportErrorDto> FailedExports { get; set; } = new();
}

/// <summary>
/// DTO cho lỗi export
/// </summary>
public class ExportErrorDto
{
    /// <summary>
    /// ID của kết quả phân tích bị lỗi
    /// </summary>
    public string AnalysisResultId { get; set; } = string.Empty;
    
    /// <summary>
    /// Thông báo lỗi
    /// </summary>
    public string ErrorMessage { get; set; } = string.Empty;
}
