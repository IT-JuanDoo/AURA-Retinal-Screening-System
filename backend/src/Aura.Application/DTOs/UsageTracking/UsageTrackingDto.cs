namespace Aura.Application.DTOs.UsageTracking;

public class UsageStatisticsDto
{
    public int TotalImages { get; set; }
    public int ProcessedImages { get; set; }
    public int PendingImages { get; set; }
    public int FailedImages { get; set; }
    public int TotalAnalyses { get; set; }
    public int CompletedAnalyses { get; set; }
    public int ProcessingAnalyses { get; set; }
    public int FailedAnalyses { get; set; }
    public int TotalPackages { get; set; }
    public int ActivePackages { get; set; }
    public int ExpiredPackages { get; set; }
    public int TotalRemainingAnalyses { get; set; }
    public int TotalUsedAnalyses { get; set; }
    public List<DailyUsageDto> DailyUsage { get; set; } = new();
    public List<PackageUsageDto> PackageUsage { get; set; } = new();
}

public class DailyUsageDto
{
    public DateTime Date { get; set; }
    public int ImageCount { get; set; }
    public int AnalysisCount { get; set; }
    public int UsedCredits { get; set; }
}

public class PackageUsageDto
{
    public string PackageId { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string PackageType { get; set; } = string.Empty;
    public int TotalAnalyses { get; set; }
    public int RemainingAnalyses { get; set; }
    public int UsedAnalyses { get; set; }
    public decimal UsagePercentage { get; set; }
    public DateTime? PurchasedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public bool IsExpired { get; set; }
}

public class ImageAnalysisTrackingDto
{
    public int TotalImages { get; set; }
    public int ImagesByType { get; set; } // Fundus or OCT
    public int ImagesByStatus { get; set; } // Uploaded, Processing, Processed, Failed
    public List<ImageCountByDateDto> ImageCountByDate { get; set; } = new();
    public List<AnalysisCountByDateDto> AnalysisCountByDate { get; set; } = new();
}

public class ImageCountByDateDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
    public int FundusCount { get; set; }
    public int OctCount { get; set; }
}

public class AnalysisCountByDateDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
    public int CompletedCount { get; set; }
    public int FailedCount { get; set; }
}

public class ClinicUsageStatisticsDto
{
    public string ClinicId { get; set; } = string.Empty;
    public string ClinicName { get; set; } = string.Empty;
    public UsageStatisticsDto UsageStatistics { get; set; } = new();
    public ImageAnalysisTrackingDto ImageAnalysisTracking { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class UserUsageStatisticsDto
{
    public string UserId { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public UsageStatisticsDto UsageStatistics { get; set; } = new();
    public ImageAnalysisTrackingDto ImageAnalysisTracking { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
