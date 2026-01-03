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
}

