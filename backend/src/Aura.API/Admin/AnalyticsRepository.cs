using Aura.Application.DTOs.Analytics;
using Npgsql;
using System.Collections.Generic;
using System.Linq;

namespace Aura.API.Admin;

public class AnalyticsRepository
{
    private readonly AdminDb _db;

    public AnalyticsRepository(AdminDb db)
    {
        _db = db;
    }

    public async Task<SystemAnalyticsDto> GetSystemAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end = endDate ?? DateTime.UtcNow;

        return new SystemAnalyticsDto
        {
            UsageStatistics = await GetUsageStatisticsAsync(start, end),
            ErrorRate = await GetErrorRateAsync(start, end),
            ImageCount = await GetImageCountAsync(start, end),
            RiskDistribution = await GetRiskDistributionAsync(start, end),
            GeneratedAt = DateTime.UtcNow
        };
    }

    private async Task<UsageStatisticsDto> GetUsageStatisticsAsync(DateTime startDate, DateTime endDate)
    {
        using var conn = _db.OpenConnection();

        // Total counts
        var usageStats = new UsageStatisticsDto();

        // Users
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false) as TotalUsers,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND COALESCE(IsActive, true) = true) as ActiveUsers
            FROM users", conn))
        {
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                usageStats.TotalUsers = reader.GetInt32(0);
                usageStats.ActiveUsers = reader.GetInt32(1);
            }
        }

        // Doctors
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false) as TotalDoctors,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND COALESCE(IsActive, true) = true) as ActiveDoctors
            FROM doctors", conn))
        {
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                usageStats.TotalDoctors = reader.GetInt32(0);
                usageStats.ActiveDoctors = reader.GetInt32(1);
            }
        }

        // Clinics
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false) as TotalClinics,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND COALESCE(IsActive, true) = true) as ActiveClinics
            FROM clinics", conn))
        {
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                usageStats.TotalClinics = reader.GetInt32(0);
                usageStats.ActiveClinics = reader.GetInt32(1);
            }
        }

        // Analyses
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false) as TotalAnalyses,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND AnalysisStatus = 'Completed') as CompletedAnalyses,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND AnalysisStatus = 'Processing') as ProcessingAnalyses,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND AnalysisStatus = 'Failed') as FailedAnalyses
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate.Date);
            cmd.Parameters.AddWithValue("EndDate", endDate.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                usageStats.TotalAnalyses = reader.GetInt32(0);
                usageStats.CompletedAnalyses = reader.GetInt32(1);
                usageStats.ProcessingAnalyses = reader.GetInt32(2);
                usageStats.FailedAnalyses = reader.GetInt32(3);
            }
        }

        // Bulk Batches
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false) as TotalBatches,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND UploadStatus = 'Completed') as CompletedBatches
            FROM bulk_upload_batches
            WHERE StartedAt >= @StartDate AND StartedAt <= @EndDate", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate);
            cmd.Parameters.AddWithValue("EndDate", endDate);
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                usageStats.TotalBulkBatches = reader.GetInt32(0);
                usageStats.CompletedBatches = reader.GetInt32(1);
            }
        }

        // Daily usage - Analysis count
        var dailyAnalysisMap = new Dictionary<DateTime, DailyUsageDto>();
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE(CreatedDate) as AnalysisDate,
                COUNT(*) as AnalysisCount
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
            GROUP BY DATE(CreatedDate)
            ORDER BY DATE(CreatedDate)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate.Date);
            cmd.Parameters.AddWithValue("EndDate", endDate.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var date = reader.GetDateTime(0).Date;
                dailyAnalysisMap[date] = new DailyUsageDto
                {
                    Date = date,
                    AnalysisCount = reader.GetInt32(1),
                    ImageUploadCount = 0,
                    UserRegistrations = 0
                };
            }
        }

        // Daily image upload count
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE(UploadedAt) as UploadDate,
                COUNT(*) as ImageUploadCount
            FROM retinal_images
            WHERE UploadedAt >= @StartDate AND UploadedAt <= @EndDate
                AND COALESCE(IsDeleted, false) = false
            GROUP BY DATE(UploadedAt)
            ORDER BY DATE(UploadedAt)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate);
            cmd.Parameters.AddWithValue("EndDate", endDate);
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var date = reader.GetDateTime(0).Date;
                if (!dailyAnalysisMap.ContainsKey(date))
                {
                    dailyAnalysisMap[date] = new DailyUsageDto
                    {
                        Date = date,
                        AnalysisCount = 0,
                        ImageUploadCount = 0,
                        UserRegistrations = 0
                    };
                }
                dailyAnalysisMap[date].ImageUploadCount = reader.GetInt32(1);
            }
        }

        // Daily user registrations
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE(CreatedDate) as RegistrationDate,
                COUNT(*) as UserRegistrations
            FROM users
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
            GROUP BY DATE(CreatedDate)
            ORDER BY DATE(CreatedDate)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate.Date);
            cmd.Parameters.AddWithValue("EndDate", endDate.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var date = reader.GetDateTime(0).Date;
                if (!dailyAnalysisMap.ContainsKey(date))
                {
                    dailyAnalysisMap[date] = new DailyUsageDto
                    {
                        Date = date,
                        AnalysisCount = 0,
                        ImageUploadCount = 0,
                        UserRegistrations = 0
                    };
                }
                dailyAnalysisMap[date].UserRegistrations = reader.GetInt32(1);
            }
        }

        usageStats.DailyUsage = dailyAnalysisMap.Values.OrderBy(d => d.Date).ToList();

        return usageStats;
    }

    private async Task<ErrorRateDto> GetErrorRateAsync(DateTime startDate, DateTime endDate)
    {
        using var conn = _db.OpenConnection();
        var errorRate = new ErrorRateDto();

        // Overall error rate from analysis_results
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false) as TotalRequests,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND AnalysisStatus = 'Failed') as TotalErrors
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate.Date);
            cmd.Parameters.AddWithValue("EndDate", endDate.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                errorRate.TotalRequests = reader.GetInt32(0);
                errorRate.TotalErrors = reader.GetInt32(1);
                errorRate.OverallErrorRate = errorRate.TotalRequests > 0 
                    ? (double)errorRate.TotalErrors / errorRate.TotalRequests * 100 
                    : 0;
            }
        }

        // Errors by type (status)
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                AnalysisStatus,
                COUNT(*) as ErrorCount
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND AnalysisStatus IN ('Failed', 'Processing')
            GROUP BY AnalysisStatus", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate.Date);
            cmd.Parameters.AddWithValue("EndDate", endDate.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var count = reader.GetInt32(1);
                errorRate.ErrorsByType.Add(new ErrorByTypeDto
                {
                    ErrorType = reader.GetString(0),
                    Count = count,
                    Percentage = errorRate.TotalRequests > 0 ? (double)count / errorRate.TotalRequests * 100 : 0
                });
            }
        }

        // Daily error rates
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE(CreatedDate) as ErrorDate,
                COUNT(*) FILTER (WHERE AnalysisStatus = 'Failed') as ErrorCount,
                COUNT(*) as RequestCount
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
            GROUP BY DATE(CreatedDate)
            ORDER BY DATE(CreatedDate)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate.Date);
            cmd.Parameters.AddWithValue("EndDate", endDate.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var requestCount = reader.GetInt32(2);
                var errorCount = reader.GetInt32(1);
                errorRate.DailyErrorRates.Add(new DailyErrorRateDto
                {
                    Date = reader.GetDateTime(0),
                    ErrorCount = errorCount,
                    RequestCount = requestCount,
                    ErrorRate = requestCount > 0 ? (double)errorCount / requestCount * 100 : 0
                });
            }
        }

        return errorRate;
    }

    private async Task<ImageCountDto> GetImageCountAsync(DateTime startDate, DateTime endDate)
    {
        using var conn = _db.OpenConnection();
        var imageCount = new ImageCountDto();

        // Overall image counts
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false) as TotalImages,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND UploadStatus = 'Uploaded') as UploadedImages,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND UploadStatus = 'Processed') as ProcessedImages,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND UploadStatus = 'Failed') as FailedImages,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND UploadStatus = 'Processing') as ProcessingImages
            FROM retinal_images
            WHERE UploadedAt >= @StartDate AND UploadedAt <= @EndDate", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate);
            cmd.Parameters.AddWithValue("EndDate", endDate);
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                imageCount.TotalImages = reader.GetInt32(0);
                imageCount.UploadedImages = reader.GetInt32(1);
                imageCount.ProcessedImages = reader.GetInt32(2);
                imageCount.FailedImages = reader.GetInt32(3);
                imageCount.ProcessingImages = reader.GetInt32(4);
            }
        }

        // Daily image counts
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE(UploadedAt) as UploadDate,
                COUNT(*) FILTER (WHERE UploadStatus = 'Uploaded' OR UploadStatus = 'Processed') as Uploaded,
                COUNT(*) FILTER (WHERE UploadStatus = 'Processed') as Processed,
                COUNT(*) FILTER (WHERE UploadStatus = 'Failed') as Failed
            FROM retinal_images
            WHERE UploadedAt >= @StartDate AND UploadedAt <= @EndDate
                AND COALESCE(IsDeleted, false) = false
            GROUP BY DATE(UploadedAt)
            ORDER BY DATE(UploadedAt)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate);
            cmd.Parameters.AddWithValue("EndDate", endDate);
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                imageCount.DailyImageCounts.Add(new DailyImageCountDto
                {
                    Date = reader.GetDateTime(0),
                    Uploaded = reader.GetInt32(1),
                    Processed = reader.GetInt32(2),
                    Failed = reader.GetInt32(3)
                });
            }
        }

        return imageCount;
    }

    private async Task<RiskDistributionDto> GetRiskDistributionAsync(DateTime startDate, DateTime endDate)
    {
        using var conn = _db.OpenConnection();
        var riskDist = new RiskDistributionDto();

        // Overall risk distribution
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND OverallRiskLevel = 'Low') as LowRisk,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND OverallRiskLevel = 'Medium') as MediumRisk,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND OverallRiskLevel = 'High') as HighRisk,
                COUNT(*) FILTER (WHERE COALESCE(IsDeleted, false) = false AND OverallRiskLevel = 'Critical') as CriticalRisk
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND AnalysisStatus = 'Completed'", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate.Date);
            cmd.Parameters.AddWithValue("EndDate", endDate.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                riskDist.LowRisk = reader.GetInt32(0);
                riskDist.MediumRisk = reader.GetInt32(1);
                riskDist.HighRisk = reader.GetInt32(2);
                riskDist.CriticalRisk = reader.GetInt32(3);

                var total = riskDist.LowRisk + riskDist.MediumRisk + riskDist.HighRisk + riskDist.CriticalRisk;
                if (total > 0)
                {
                    riskDist.LowRiskPercentage = (double)riskDist.LowRisk / total * 100;
                    riskDist.MediumRiskPercentage = (double)riskDist.MediumRisk / total * 100;
                    riskDist.HighRiskPercentage = (double)riskDist.HighRisk / total * 100;
                    riskDist.CriticalRiskPercentage = (double)riskDist.CriticalRisk / total * 100;
                }
            }
        }

        // Risk distribution by date
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE(CreatedDate) as AnalysisDate,
                COUNT(*) FILTER (WHERE OverallRiskLevel = 'Low') as LowRisk,
                COUNT(*) FILTER (WHERE OverallRiskLevel = 'Medium') as MediumRisk,
                COUNT(*) FILTER (WHERE OverallRiskLevel = 'High') as HighRisk,
                COUNT(*) FILTER (WHERE OverallRiskLevel = 'Critical') as CriticalRisk
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND AnalysisStatus = 'Completed'
            GROUP BY DATE(CreatedDate)
            ORDER BY DATE(CreatedDate)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", startDate.Date);
            cmd.Parameters.AddWithValue("EndDate", endDate.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                riskDist.DistributionByDate.Add(new RiskDistributionByDateDto
                {
                    Date = reader.GetDateTime(0),
                    LowRisk = reader.GetInt32(1),
                    MediumRisk = reader.GetInt32(2),
                    HighRisk = reader.GetInt32(3),
                    CriticalRisk = reader.GetInt32(4)
                });
            }
        }

        return riskDist;
    }

    public async Task<RevenueDashboardDto> GetRevenueDashboardAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end = endDate ?? DateTime.UtcNow;
        using var conn = _db.OpenConnection();
        var revenue = new RevenueDashboardDto();

        // Note: Revenue data would typically come from a transactions/subscriptions table
        // For now, we'll simulate based on analysis counts and clinic subscriptions
        // In production, you would have actual payment/subscription tables

        // Total revenue (simulated: each analysis = $X, each clinic subscription = $Y/month)
        const decimal analysisPrice = 5.00m;
        const decimal clinicSubscriptionPrice = 500.00m;

        // Count analyses in period
        using (var cmd = new NpgsqlCommand(@"
            SELECT COUNT(*) 
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND AnalysisStatus = 'Completed'", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start.Date);
            cmd.Parameters.AddWithValue("EndDate", end.Date.AddDays(1));
            var analysisCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            revenue.TotalRevenue = analysisCount * analysisPrice;
        }

        // Count active clinic subscriptions
        using (var cmd = new NpgsqlCommand(@"
            SELECT COUNT(*) 
            FROM clinics
            WHERE COALESCE(IsDeleted, false) = false 
                AND COALESCE(IsActive, true) = true", conn))
        {
            var clinicCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            var months = (end - start).TotalDays / 30.0;
            revenue.TotalRevenue += clinicCount * clinicSubscriptionPrice * (decimal)months;
            revenue.TotalSubscriptions = clinicCount;
            revenue.ActiveSubscriptions = clinicCount;
        }

        // Monthly revenue
        var monthlyStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        using (var cmd = new NpgsqlCommand(@"
            SELECT COUNT(*) 
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND AnalysisStatus = 'Completed'", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", monthlyStart);
            cmd.Parameters.AddWithValue("EndDate", DateTime.UtcNow);
            var monthlyAnalysisCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            revenue.MonthlyRevenue = monthlyAnalysisCount * analysisPrice;
        }

        // Weekly revenue
        var weeklyStart = DateTime.UtcNow.AddDays(-7);
        using (var cmd = new NpgsqlCommand(@"
            SELECT COUNT(*) 
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND AnalysisStatus = 'Completed'", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", weeklyStart);
            cmd.Parameters.AddWithValue("EndDate", DateTime.UtcNow);
            var weeklyAnalysisCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            revenue.WeeklyRevenue = weeklyAnalysisCount * analysisPrice;
        }

        // Daily revenue
        var todayStart = DateTime.UtcNow.Date;
        using (var cmd = new NpgsqlCommand(@"
            SELECT COUNT(*) 
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND AnalysisStatus = 'Completed'", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", todayStart);
            cmd.Parameters.AddWithValue("EndDate", DateTime.UtcNow);
            var dailyAnalysisCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            revenue.DailyRevenue = dailyAnalysisCount * analysisPrice;
        }

        // Daily revenue breakdown
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE(CreatedDate) as RevenueDate,
                COUNT(*) as AnalysisCount
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND AnalysisStatus = 'Completed'
            GROUP BY DATE(CreatedDate)
            ORDER BY DATE(CreatedDate)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start.Date);
            cmd.Parameters.AddWithValue("EndDate", end.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var count = reader.GetInt32(1);
                revenue.DailyRevenueList.Add(new DailyRevenueDto
                {
                    Date = reader.GetDateTime(0).Date,
                    Revenue = count * analysisPrice,
                    TransactionCount = count,
                    SubscriptionCount = 0
                });
            }
        }

        // Revenue by source (simplified)
        revenue.RevenueBySource.IndividualAnalyses = revenue.TotalRevenue * 0.6m;
        revenue.RevenueBySource.ClinicSubscriptions = revenue.TotalRevenue * 0.35m;
        revenue.RevenueBySource.BulkAnalysisPackages = revenue.TotalRevenue * 0.05m;

        revenue.TotalTransactions = (int)(revenue.TotalRevenue / analysisPrice);
        revenue.AverageTransactionValue = revenue.TotalTransactions > 0 
            ? revenue.TotalRevenue / revenue.TotalTransactions 
            : 0;

        return revenue;
    }

    public async Task<AiPerformanceDashboardDto> GetAiPerformanceDashboardAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end = endDate ?? DateTime.UtcNow;
        using var conn = _db.OpenConnection();
        var performance = new AiPerformanceDashboardDto();

        // Overall metrics
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) as TotalAnalyses,
                COUNT(*) FILTER (WHERE AnalysisStatus = 'Completed') as SuccessfulAnalyses,
                COUNT(*) FILTER (WHERE AnalysisStatus = 'Failed') as FailedAnalyses,
                AVG(COALESCE(AiConfidenceScore, 0)) as AvgConfidence,
                AVG(COALESCE(ProcessingTimeSeconds, 0)) as AvgProcessingTime
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start.Date);
            cmd.Parameters.AddWithValue("EndDate", end.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                performance.TotalAnalysesProcessed = reader.GetInt32(0);
                performance.SuccessfulAnalyses = reader.GetInt32(1);
                performance.FailedAnalyses = reader.GetInt32(2);
                performance.AverageConfidenceScore = reader.IsDBNull(3) ? 0 : reader.GetDouble(3);
                performance.AverageProcessingTimeSeconds = reader.IsDBNull(4) ? 0 : reader.GetDouble(4);
                performance.SuccessRate = performance.TotalAnalysesProcessed > 0
                    ? (double)performance.SuccessfulAnalyses / performance.TotalAnalysesProcessed * 100
                    : 0;
                performance.AverageAccuracy = performance.SuccessRate; // Simplified
            }
        }

        // Daily performance
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE(CreatedDate) as PerfDate,
                COUNT(*) as TotalAnalyses,
                COUNT(*) FILTER (WHERE AnalysisStatus = 'Completed') as SuccessfulAnalyses,
                COUNT(*) FILTER (WHERE AnalysisStatus = 'Failed') as FailedAnalyses,
                AVG(COALESCE(AiConfidenceScore, 0)) as AvgConfidence,
                AVG(COALESCE(ProcessingTimeSeconds, 0)) as AvgProcessingTime
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
            GROUP BY DATE(CreatedDate)
            ORDER BY DATE(CreatedDate)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start.Date);
            cmd.Parameters.AddWithValue("EndDate", end.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var total = reader.GetInt32(1);
                var successful = reader.GetInt32(2);
                performance.DailyPerformance.Add(new DailyAiPerformanceDto
                {
                    Date = reader.GetDateTime(0).Date,
                    AnalysesProcessed = total,
                    SuccessfulAnalyses = successful,
                    FailedAnalyses = reader.GetInt32(3),
                    AverageConfidenceScore = reader.IsDBNull(4) ? 0 : reader.GetDouble(4),
                    AverageProcessingTimeSeconds = reader.IsDBNull(5) ? 0 : reader.GetDouble(5),
                    AverageAccuracy = total > 0 ? (double)successful / total * 100 : 0
                });
            }
        }

        // Model metrics by image type
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                ri.ImageType,
                COUNT(*) as AnalysisCount,
                AVG(COALESCE(ar.AiConfidenceScore, 0)) as AvgConfidence
            FROM analysis_results ar
            INNER JOIN retinal_images ri ON ar.ImageId = ri.Id
            WHERE ar.CreatedDate >= @StartDate AND ar.CreatedDate <= @EndDate
                AND COALESCE(ar.IsDeleted, false) = false
                AND ar.AnalysisStatus = 'Completed'
            GROUP BY ri.ImageType", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start.Date);
            cmd.Parameters.AddWithValue("EndDate", end.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var imageType = reader.IsDBNull(0) ? "" : reader.GetString(0);
                var count = reader.GetInt32(1);
                var confidence = reader.IsDBNull(2) ? 0 : reader.GetDouble(2);
                
                if (imageType.Equals("Fundus", StringComparison.OrdinalIgnoreCase))
                {
                    performance.ModelMetrics.FundusAnalysesCount = count;
                    performance.ModelMetrics.FundusAverageConfidence = confidence;
                    performance.ModelMetrics.FundusModelAccuracy = confidence; // Simplified
                }
                else if (imageType.Equals("OCT", StringComparison.OrdinalIgnoreCase))
                {
                    performance.ModelMetrics.OctAnalysesCount = count;
                    performance.ModelMetrics.OctAverageConfidence = confidence;
                    performance.ModelMetrics.OctModelAccuracy = confidence; // Simplified
                }
            }
        }

        // Accuracy by risk level
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                OverallRiskLevel,
                COUNT(*) as RiskCount
            FROM analysis_results
            WHERE CreatedDate >= @StartDate AND CreatedDate <= @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND AnalysisStatus = 'Completed'
                AND OverallRiskLevel IS NOT NULL
            GROUP BY OverallRiskLevel", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start.Date);
            cmd.Parameters.AddWithValue("EndDate", end.Date.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var riskLevel = reader.GetString(0);
                var count = reader.GetInt32(1);
                
                // Simplified accuracy - in production, you'd compare with ground truth
                var accuracy = 85.0 + (new Random().NextDouble() * 10); // 85-95%
                
                switch (riskLevel)
                {
                    case "Low":
                        performance.AccuracyByRiskLevel.LowRiskCount = count;
                        performance.AccuracyByRiskLevel.LowRiskAccuracy = accuracy;
                        break;
                    case "Medium":
                        performance.AccuracyByRiskLevel.MediumRiskCount = count;
                        performance.AccuracyByRiskLevel.MediumRiskAccuracy = accuracy;
                        break;
                    case "High":
                        performance.AccuracyByRiskLevel.HighRiskCount = count;
                        performance.AccuracyByRiskLevel.HighRiskAccuracy = accuracy;
                        break;
                    case "Critical":
                        performance.AccuracyByRiskLevel.CriticalRiskCount = count;
                        performance.AccuracyByRiskLevel.CriticalRiskAccuracy = accuracy;
                        break;
                }
            }
        }

        return performance;
    }

    public async Task<SystemHealthDashboardDto> GetSystemHealthDashboardAsync()
    {
        using var conn = _db.OpenConnection();
        var health = new SystemHealthDashboardDto();

        // System Status (simulated - in production, use actual system metrics)
        health.SystemStatus.OverallStatus = "Healthy";
        health.SystemStatus.CpuUsagePercent = 45.0 + (new Random().NextDouble() * 20); // 45-65%
        health.SystemStatus.MemoryUsagePercent = 60.0 + (new Random().NextDouble() * 15); // 60-75%
        health.SystemStatus.DiskUsagePercent = 35.0 + (new Random().NextDouble() * 10); // 35-45%
        health.SystemStatus.NetworkLatencyMs = 10.0 + (new Random().NextDouble() * 20); // 10-30ms
        health.SystemStatus.LastUpdated = DateTime.UtcNow;

        // Database Health
        var dbStartTime = DateTime.UtcNow;
        using (var testCmd = new NpgsqlCommand("SELECT 1", conn))
        {
            await testCmd.ExecuteScalarAsync();
        }
        health.DatabaseHealth.ResponseTimeMs = (DateTime.UtcNow - dbStartTime).TotalMilliseconds;
        health.DatabaseHealth.Status = health.DatabaseHealth.ResponseTimeMs < 100 ? "Healthy" : "Warning";
        
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COUNT(*) as TotalQueries,
                COUNT(*) FILTER (WHERE state = 'active') as ActiveConnections
            FROM pg_stat_activity
            WHERE datname = current_database()", conn))
        {
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                health.DatabaseHealth.TotalQueries = reader.GetInt64(0);
                health.DatabaseHealth.ActiveConnections = reader.GetInt32(1);
            }
        }
        health.DatabaseHealth.MaxConnections = 100; // Default PostgreSQL max
        health.DatabaseHealth.AverageQueryTimeMs = health.DatabaseHealth.ResponseTimeMs;
        health.DatabaseHealth.SlowQueries = health.DatabaseHealth.ResponseTimeMs > 1000 ? 1 : 0;

        // API Health (simulated - in production, track actual API metrics)
        health.ApiHealth.Status = "Healthy";
        health.ApiHealth.TotalRequests = (int)health.DatabaseHealth.TotalQueries;
        health.ApiHealth.SuccessfulRequests = (int)(health.ApiHealth.TotalRequests * 0.95);
        health.ApiHealth.FailedRequests = health.ApiHealth.TotalRequests - health.ApiHealth.SuccessfulRequests;
        health.ApiHealth.AverageResponseTimeMs = health.DatabaseHealth.ResponseTimeMs * 1.5;
        health.ApiHealth.RequestsPerSecond = health.ApiHealth.TotalRequests / 86400.0; // Simplified

        // AI Service Health (simulated)
        health.AiServiceHealth.Status = "Healthy";
        health.AiServiceHealth.AverageResponseTimeMs = 2000.0 + (new Random().NextDouble() * 1000); // 2-3s
        health.AiServiceHealth.QueueLength = new Random().Next(0, 10);
        health.AiServiceHealth.ActiveWorkers = 2;
        health.AiServiceHealth.MaxWorkers = 5;
        health.AiServiceHealth.QueueProcessingRate = health.AiServiceHealth.ActiveWorkers * 0.5; // Simplified
        health.AiServiceHealth.LastHealthCheck = DateTime.UtcNow;

        // Uptime (simulated)
        health.Uptime.UptimePercentage = 99.9;
        health.Uptime.TotalUptime = TimeSpan.FromDays(30);
        health.Uptime.TotalDowntime = TimeSpan.FromMinutes(30);
        health.Uptime.IncidentsCount = 2;
        health.Uptime.LastIncident = DateTime.UtcNow.AddDays(-5);

        return health;
    }

    public async Task<GlobalDashboardDto> GetGlobalDashboardAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        return new GlobalDashboardDto
        {
            SystemAnalytics = await GetSystemAnalyticsAsync(startDate, endDate),
            RevenueDashboard = await GetRevenueDashboardAsync(startDate, endDate),
            AiPerformanceDashboard = await GetAiPerformanceDashboardAsync(startDate, endDate),
            SystemHealthDashboard = await GetSystemHealthDashboardAsync(),
            GeneratedAt = DateTime.UtcNow
        };
    }
}

