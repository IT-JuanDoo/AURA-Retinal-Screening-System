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

// Revenue Dashboard DTOs
public class RevenueDashboardDto
{
    public decimal TotalRevenue { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public decimal WeeklyRevenue { get; set; }
    public decimal DailyRevenue { get; set; }
    public int TotalSubscriptions { get; set; }
    public int ActiveSubscriptions { get; set; }
    public int TotalTransactions { get; set; }
    public decimal AverageTransactionValue { get; set; }
    public List<DailyRevenueDto> DailyRevenueList { get; set; } = new();
    public List<MonthlyRevenueDto> MonthlyRevenueList { get; set; } = new();
    public RevenueBySourceDto RevenueBySource { get; set; } = new();
}

public class DailyRevenueDto
{
    public DateTime Date { get; set; }
    public decimal Revenue { get; set; }
    public int TransactionCount { get; set; }
    public int SubscriptionCount { get; set; }
}

public class MonthlyRevenueDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Revenue { get; set; }
    public int TransactionCount { get; set; }
    public decimal GrowthRate { get; set; }
}

public class RevenueBySourceDto
{
    public decimal ClinicSubscriptions { get; set; }
    public decimal IndividualAnalyses { get; set; }
    public decimal BulkAnalysisPackages { get; set; }
    public decimal PremiumFeatures { get; set; }
    public decimal Other { get; set; }
}

// AI Performance Dashboard DTOs
public class AiPerformanceDashboardDto
{
    public double AverageAccuracy { get; set; }
    public double AverageConfidenceScore { get; set; }
    public double AverageProcessingTimeSeconds { get; set; }
    public int TotalAnalysesProcessed { get; set; }
    public int SuccessfulAnalyses { get; set; }
    public int FailedAnalyses { get; set; }
    public double SuccessRate { get; set; }
    public List<DailyAiPerformanceDto> DailyPerformance { get; set; } = new();
    public AiModelMetricsDto ModelMetrics { get; set; } = new();
    public AiAccuracyByRiskLevelDto AccuracyByRiskLevel { get; set; } = new();
}

public class DailyAiPerformanceDto
{
    public DateTime Date { get; set; }
    public int AnalysesProcessed { get; set; }
    public double AverageAccuracy { get; set; }
    public double AverageConfidenceScore { get; set; }
    public double AverageProcessingTimeSeconds { get; set; }
    public int SuccessfulAnalyses { get; set; }
    public int FailedAnalyses { get; set; }
}

public class AiModelMetricsDto
{
    public double FundusModelAccuracy { get; set; }
    public double OctModelAccuracy { get; set; }
    public int FundusAnalysesCount { get; set; }
    public int OctAnalysesCount { get; set; }
    public double FundusAverageConfidence { get; set; }
    public double OctAverageConfidence { get; set; }
}

public class AiAccuracyByRiskLevelDto
{
    public double LowRiskAccuracy { get; set; }
    public double MediumRiskAccuracy { get; set; }
    public double HighRiskAccuracy { get; set; }
    public double CriticalRiskAccuracy { get; set; }
    public int LowRiskCount { get; set; }
    public int MediumRiskCount { get; set; }
    public int HighRiskCount { get; set; }
    public int CriticalRiskCount { get; set; }
}

// System Health Monitoring DTOs
public class SystemHealthDashboardDto
{
    public SystemStatusDto SystemStatus { get; set; } = new();
    public DatabaseHealthDto DatabaseHealth { get; set; } = new();
    public ApiHealthDto ApiHealth { get; set; } = new();
    public AiServiceHealthDto AiServiceHealth { get; set; } = new();
    public List<SystemMetricDto> SystemMetrics { get; set; } = new();
    public List<AlertDto> ActiveAlerts { get; set; } = new();
    public UptimeDto Uptime { get; set; } = new();
}

public class SystemStatusDto
{
    public string OverallStatus { get; set; } = "Healthy"; // Healthy, Warning, Critical
    public double CpuUsagePercent { get; set; }
    public double MemoryUsagePercent { get; set; }
    public double DiskUsagePercent { get; set; }
    public double NetworkLatencyMs { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

public class DatabaseHealthDto
{
    public string Status { get; set; } = "Healthy";
    public double ResponseTimeMs { get; set; }
    public int ActiveConnections { get; set; }
    public int MaxConnections { get; set; }
    public long TotalQueries { get; set; }
    public double AverageQueryTimeMs { get; set; }
    public int SlowQueries { get; set; }
}

public class ApiHealthDto
{
    public string Status { get; set; } = "Healthy";
    public int TotalRequests { get; set; }
    public int SuccessfulRequests { get; set; }
    public int FailedRequests { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public double RequestsPerSecond { get; set; }
    public List<EndpointHealthDto> EndpointHealth { get; set; } = new();
}

public class EndpointHealthDto
{
    public string Endpoint { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public int RequestCount { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public int ErrorCount { get; set; }
    public double ErrorRate { get; set; }
}

public class AiServiceHealthDto
{
    public string Status { get; set; } = "Healthy";
    public double AverageResponseTimeMs { get; set; }
    public int QueueLength { get; set; }
    public int ActiveWorkers { get; set; }
    public int MaxWorkers { get; set; }
    public double QueueProcessingRate { get; set; }
    public DateTime LastHealthCheck { get; set; } = DateTime.UtcNow;
}

public class SystemMetricDto
{
    public DateTime Timestamp { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public double Value { get; set; }
    public string Unit { get; set; } = string.Empty;
}

public class AlertDto
{
    public string Id { get; set; } = string.Empty;
    public string Severity { get; set; } = "Info"; // Info, Warning, Critical
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsResolved { get; set; }
}

public class UptimeDto
{
    public double UptimePercentage { get; set; }
    public TimeSpan TotalUptime { get; set; }
    public TimeSpan TotalDowntime { get; set; }
    public int IncidentsCount { get; set; }
    public DateTime LastIncident { get; set; }
    public List<IncidentDto> RecentIncidents { get; set; } = new();
}

public class IncidentDto
{
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public TimeSpan Duration { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

// Global Dashboard DTO (combines all dashboards)
public class GlobalDashboardDto
{
    public SystemAnalyticsDto SystemAnalytics { get; set; } = new();
    public RevenueDashboardDto RevenueDashboard { get; set; } = new();
    public AiPerformanceDashboardDto AiPerformanceDashboard { get; set; } = new();
    public SystemHealthDashboardDto SystemHealthDashboard { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

