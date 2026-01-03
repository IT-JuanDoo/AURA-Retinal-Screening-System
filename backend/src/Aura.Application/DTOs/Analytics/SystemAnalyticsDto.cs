namespace Aura.Application.DTOs.Analytics;

public class SystemAnalyticsDto
{
    public UsageStatisticsDto UsageStatistics { get; set; } = new();
    public ErrorRateDto ErrorRate { get; set; } = new();
    public ImageCountDto ImageCount { get; set; } = new();
    public RiskDistributionDto RiskDistribution { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class UsageStatisticsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int TotalDoctors { get; set; }
    public int ActiveDoctors { get; set; }
    public int TotalClinics { get; set; }
    public int ActiveClinics { get; set; }
    public int TotalAnalyses { get; set; }
    public int CompletedAnalyses { get; set; }
    public int ProcessingAnalyses { get; set; }
    public int FailedAnalyses { get; set; }
    public int TotalBulkBatches { get; set; }
    public int CompletedBatches { get; set; }
    public List<DailyUsageDto> DailyUsage { get; set; } = new();
}

public class DailyUsageDto
{
    public DateTime Date { get; set; }
    public int AnalysisCount { get; set; }
    public int ImageUploadCount { get; set; }
    public int UserRegistrations { get; set; }
}

public class ErrorRateDto
{
    public double OverallErrorRate { get; set; }
    public int TotalErrors { get; set; }
    public int TotalRequests { get; set; }
    public List<ErrorByTypeDto> ErrorsByType { get; set; } = new();
    public List<DailyErrorRateDto> DailyErrorRates { get; set; } = new();
}

public class ErrorByTypeDto
{
    public string ErrorType { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class DailyErrorRateDto
{
    public DateTime Date { get; set; }
    public int ErrorCount { get; set; }
    public int RequestCount { get; set; }
    public double ErrorRate { get; set; }
}

public class ImageCountDto
{
    public int TotalImages { get; set; }
    public int UploadedImages { get; set; }
    public int ProcessedImages { get; set; }
    public int FailedImages { get; set; }
    public int ProcessingImages { get; set; }
    public List<DailyImageCountDto> DailyImageCounts { get; set; } = new();
}

public class DailyImageCountDto
{
    public DateTime Date { get; set; }
    public int Uploaded { get; set; }
    public int Processed { get; set; }
    public int Failed { get; set; }
}

public class RiskDistributionDto
{
    public int LowRisk { get; set; }
    public int MediumRisk { get; set; }
    public int HighRisk { get; set; }
    public int CriticalRisk { get; set; }
    public double LowRiskPercentage { get; set; }
    public double MediumRiskPercentage { get; set; }
    public double HighRiskPercentage { get; set; }
    public double CriticalRiskPercentage { get; set; }
    public List<RiskDistributionByDateDto> DistributionByDate { get; set; } = new();
}

public class RiskDistributionByDateDto
{
    public DateTime Date { get; set; }
    public int LowRisk { get; set; }
    public int MediumRisk { get; set; }
    public int HighRisk { get; set; }
    public int CriticalRisk { get; set; }
}

