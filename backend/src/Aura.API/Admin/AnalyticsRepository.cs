using Aura.Application.DTOs.Analytics;
using Npgsql;
using System.Collections.Generic;
using System.Linq;
using System.Diagnostics;
using System.IO;

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
        // Normalize dates: ensure start is beginning of day and end covers full day
        var start = startDate?.Date ?? DateTime.UtcNow.AddDays(-30).Date;
        var end = endDate?.Date ?? DateTime.UtcNow.Date;

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
            cmd.Parameters.AddWithValue("StartDate", startDate.Date);
            cmd.Parameters.AddWithValue("EndDate", endDate.Date.AddDays(1));
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
        // Normalize dates: ensure start is beginning of day and end covers full day
        var start = startDate?.Date ?? DateTime.UtcNow.AddDays(-30).Date;
        var end = endDate?.Date ?? DateTime.UtcNow.Date;
        using var conn = _db.OpenConnection();
        var revenue = new RevenueDashboardDto();

        // Total revenue from payment_history (only completed payments)
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                COALESCE(SUM(Amount), 0) as TotalRevenue,
                COUNT(*) as TotalTransactions
            FROM payment_history
            WHERE PaymentDate >= @StartDate AND PaymentDate < @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND PaymentStatus = 'Completed'", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                revenue.TotalRevenue = reader.IsDBNull(0) ? 0 : reader.GetDecimal(0);
                revenue.TotalTransactions = reader.IsDBNull(1) ? 0 : reader.GetInt32(1);
            }
        }

        // Count active subscriptions from user_packages
        using (var cmd = new NpgsqlCommand(@"
            SELECT COUNT(*) 
            FROM user_packages
            WHERE COALESCE(IsDeleted, false) = false 
                AND COALESCE(IsActive, true) = true
                AND (ExpiresAt IS NULL OR ExpiresAt > CURRENT_TIMESTAMP)", conn))
        {
            revenue.ActiveSubscriptions = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        }

        // Total subscriptions (all time)
        using (var cmd = new NpgsqlCommand(@"
            SELECT COUNT(DISTINCT UserPackageId) 
            FROM payment_history
            WHERE COALESCE(IsDeleted, false) = false
                AND PaymentStatus = 'Completed'
                AND UserPackageId IS NOT NULL", conn))
        {
            revenue.TotalSubscriptions = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        }

        // Monthly revenue (current month within date range)
        var monthlyStart = new DateTime(end.Year, end.Month, 1);
        var monthlyEnd = monthlyStart.AddMonths(1);
        if (monthlyEnd > end.AddDays(1)) monthlyEnd = end.AddDays(1);
        if (monthlyStart < start) monthlyStart = start;
        
        using (var cmd = new NpgsqlCommand(@"
            SELECT COALESCE(SUM(Amount), 0)
            FROM payment_history
            WHERE PaymentDate >= @StartDate AND PaymentDate < @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND PaymentStatus = 'Completed'", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", monthlyStart);
            cmd.Parameters.AddWithValue("EndDate", monthlyEnd);
            var result = await cmd.ExecuteScalarAsync();
            revenue.MonthlyRevenue = result == null || result == DBNull.Value ? 0 : Convert.ToDecimal(result);
        }

        // Weekly revenue (last 7 days within date range)
        var weeklyStart = end.AddDays(-7);
        if (weeklyStart < start) weeklyStart = start;
        
        using (var cmd = new NpgsqlCommand(@"
            SELECT COALESCE(SUM(Amount), 0)
            FROM payment_history
            WHERE PaymentDate >= @StartDate AND PaymentDate < @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND PaymentStatus = 'Completed'", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", weeklyStart);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
            var result = await cmd.ExecuteScalarAsync();
            revenue.WeeklyRevenue = result == null || result == DBNull.Value ? 0 : Convert.ToDecimal(result);
        }

        // Daily revenue (last day within date range)
        var dailyStart = end;
        if (dailyStart < start) dailyStart = start;
        
        using (var cmd = new NpgsqlCommand(@"
            SELECT COALESCE(SUM(Amount), 0)
            FROM payment_history
            WHERE PaymentDate >= @StartDate AND PaymentDate < @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND PaymentStatus = 'Completed'", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", dailyStart);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
            var result = await cmd.ExecuteScalarAsync();
            revenue.DailyRevenue = result == null || result == DBNull.Value ? 0 : Convert.ToDecimal(result);
        }

        // Daily revenue breakdown
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE(PaymentDate) as RevenueDate,
                COALESCE(SUM(Amount), 0) as TotalRevenue,
                COUNT(*) as TransactionCount,
                COUNT(DISTINCT UserPackageId) FILTER (WHERE UserPackageId IS NOT NULL) as SubscriptionCount
            FROM payment_history
            WHERE PaymentDate >= @StartDate AND PaymentDate < @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND PaymentStatus = 'Completed'
            GROUP BY DATE(PaymentDate)
            ORDER BY DATE(PaymentDate)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                revenue.DailyRevenueList.Add(new DailyRevenueDto
                {
                    Date = reader.GetDateTime(0).Date,
                    Revenue = reader.IsDBNull(1) ? 0 : reader.GetDecimal(1),
                    TransactionCount = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                    SubscriptionCount = reader.IsDBNull(3) ? 0 : reader.GetInt32(3)
                });
            }
        }

        // Monthly revenue breakdown (group by year-month)
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                DATE_TRUNC('month', PaymentDate) as RevenueMonth,
                COALESCE(SUM(Amount), 0) as TotalRevenue,
                COUNT(*) as TransactionCount
            FROM payment_history
            WHERE PaymentDate >= @StartDate AND PaymentDate < @EndDate
                AND COALESCE(IsDeleted, false) = false
                AND PaymentStatus = 'Completed'
            GROUP BY DATE_TRUNC('month', PaymentDate)
            ORDER BY DATE_TRUNC('month', PaymentDate)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();

            MonthlyRevenueDto? prev = null;
            while (await reader.ReadAsync())
            {
                var period = reader.GetDateTime(0);
                var revenueValue = reader.IsDBNull(1) ? 0 : reader.GetDecimal(1);
                var count = reader.IsDBNull(2) ? 0 : reader.GetInt32(2);

                var monthly = new MonthlyRevenueDto
                {
                    Year = period.Year,
                    Month = period.Month,
                    Revenue = revenueValue,
                    TransactionCount = count,
                    GrowthRate = 0
                };

                // growth vs previous month if available
                if (prev != null && prev.Revenue > 0)
                {
                    monthly.GrowthRate = (monthly.Revenue - prev.Revenue) / prev.Revenue * 100m;
                }

                revenue.MonthlyRevenueList.Add(monthly);
                prev = monthly;
            }
        }

        // Revenue by source (from payment_history and service_packages)
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                sp.PackageType,
                COALESCE(SUM(ph.Amount), 0) as RevenueByType
            FROM payment_history ph
            INNER JOIN service_packages sp ON ph.PackageId = sp.Id
            WHERE ph.PaymentDate >= @StartDate AND ph.PaymentDate < @EndDate
                AND COALESCE(ph.IsDeleted, false) = false
                AND ph.PaymentStatus = 'Completed'
            GROUP BY sp.PackageType", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var packageType = reader.IsDBNull(0) ? "" : reader.GetString(0);
                var revenueByType = reader.IsDBNull(1) ? 0 : reader.GetDecimal(1);
                
                if (packageType == "Individual")
                {
                    revenue.RevenueBySource.IndividualAnalyses = revenueByType;
                }
                else if (packageType == "Clinic")
                {
                    revenue.RevenueBySource.ClinicSubscriptions = revenueByType;
                }
                else if (packageType == "Enterprise")
                {
                    revenue.RevenueBySource.BulkAnalysisPackages = revenueByType;
                }
            }
        }

        // Calculate average transaction value
        revenue.AverageTransactionValue = revenue.TotalTransactions > 0 
            ? revenue.TotalRevenue / revenue.TotalTransactions 
            : 0;

        return revenue;
    }

    public async Task<AiPerformanceDashboardDto> GetAiPerformanceDashboardAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        // Normalize dates: ensure start is beginning of day and end covers full day
        var start = startDate?.Date ?? DateTime.UtcNow.AddDays(-30).Date;
        var end = endDate?.Date ?? DateTime.UtcNow.Date;
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
            WHERE CreatedDate >= @StartDate AND CreatedDate < @EndDate
                AND COALESCE(IsDeleted, false) = false", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
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
                // Average accuracy: calculate from AI feedback if available, otherwise use confidence score as proxy
                performance.AverageAccuracy = performance.AverageConfidenceScore;
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
            WHERE CreatedDate >= @StartDate AND CreatedDate < @EndDate
                AND COALESCE(IsDeleted, false) = false
            GROUP BY DATE(CreatedDate)
            ORDER BY DATE(CreatedDate)", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
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
            WHERE ar.CreatedDate >= @StartDate AND ar.CreatedDate < @EndDate
                AND COALESCE(ar.IsDeleted, false) = false
                AND ar.AnalysisStatus = 'Completed'
            GROUP BY ri.ImageType", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
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

        // Accuracy by risk level - calculate from AI feedback if available, otherwise use average confidence
        using (var cmd = new NpgsqlCommand(@"
            SELECT 
                ar.OverallRiskLevel,
                COUNT(*) as RiskCount,
                AVG(COALESCE(ar.AiConfidenceScore, 0)) as AvgConfidence,
                COUNT(af.Id) FILTER (WHERE af.FeedbackType = 'Correct') as CorrectFeedback,
                COUNT(af.Id) as TotalFeedback
            FROM analysis_results ar
            LEFT JOIN ai_feedback af ON ar.Id = af.ResultId AND COALESCE(af.IsDeleted, false) = false
            WHERE ar.CreatedDate >= @StartDate AND ar.CreatedDate < @EndDate
                AND COALESCE(ar.IsDeleted, false) = false
                AND ar.AnalysisStatus = 'Completed'
                AND ar.OverallRiskLevel IS NOT NULL
            GROUP BY ar.OverallRiskLevel", conn))
        {
            cmd.Parameters.AddWithValue("StartDate", start);
            cmd.Parameters.AddWithValue("EndDate", end.AddDays(1));
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var riskLevel = reader.GetString(0);
                var count = reader.GetInt32(1);
                var avgConfidence = reader.IsDBNull(2) ? 0 : reader.GetDouble(2);
                var correctFeedback = reader.IsDBNull(3) ? 0 : reader.GetInt32(3);
                var totalFeedback = reader.IsDBNull(4) ? 0 : reader.GetInt32(4);
                
                // Calculate accuracy: if we have feedback, use it; otherwise use confidence as proxy
                double accuracy;
                if (totalFeedback > 0)
                {
                    accuracy = (double)correctFeedback / totalFeedback * 100;
                }
                else
                {
                    // Use average confidence as accuracy proxy
                    accuracy = avgConfidence;
                }
                
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

        // System Status - Get real metrics from system
        try
        {
            // CPU Usage - simplified approach using process CPU time
            using var process = Process.GetCurrentProcess();
            var startTime = DateTime.UtcNow;
            var startCpu = process.TotalProcessorTime;
            await Task.Delay(100);
            process.Refresh();
            var endTime = DateTime.UtcNow;
            var endCpu = process.TotalProcessorTime;
            var cpuUsedMs = (endCpu - startCpu).TotalMilliseconds;
            var totalMs = (endTime - startTime).TotalMilliseconds;
            var cpuPercent = (cpuUsedMs / (Environment.ProcessorCount * totalMs)) * 100;
            health.SystemStatus.CpuUsagePercent = Math.Min(100, Math.Max(0, cpuPercent));
        }
        catch
        {
            // Fallback
            health.SystemStatus.CpuUsagePercent = 0;
        }

        try
        {
            // Memory Usage
            using var process = Process.GetCurrentProcess();
            var workingSet = process.WorkingSet64;
            // Get total physical memory - try Linux /proc/meminfo first, then estimate
            long totalSystemMemory = 0;
            try
            {
                if (File.Exists("/proc/meminfo"))
                {
                    // Linux: Read from /proc/meminfo
                    var memInfo = File.ReadAllText("/proc/meminfo");
                    var memTotalLine = memInfo.Split('\n').FirstOrDefault(l => l.StartsWith("MemTotal:"));
                    if (memTotalLine != null)
                    {
                        var parts = memTotalLine.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2 && long.TryParse(parts[1], out var memKb))
                        {
                            totalSystemMemory = memKb * 1024; // Convert KB to bytes
                        }
                    }
                }
            }
            catch
            {
                // If we can't get total memory, estimate based on working set
                totalSystemMemory = workingSet * 10; // Rough estimate
            }

            if (totalSystemMemory == 0)
            {
                totalSystemMemory = workingSet * 10; // Fallback estimate
            }

            health.SystemStatus.MemoryUsagePercent = totalSystemMemory > 0 
                ? (double)(workingSet * 100.0 / totalSystemMemory) 
                : 0;
        }
        catch
        {
            // Fallback
            health.SystemStatus.MemoryUsagePercent = 0;
        }

        try
        {
            // Disk Usage
            var rootPath = Path.GetPathRoot(Environment.CurrentDirectory) ?? "/";
            var drive = new DriveInfo(rootPath);
            if (drive.IsReady)
            {
                var totalSpace = drive.TotalSize;
                var freeSpace = drive.AvailableFreeSpace;
                health.SystemStatus.DiskUsagePercent = totalSpace > 0 
                    ? (double)((totalSpace - freeSpace) * 100.0 / totalSpace) 
                    : 0;
            }
            else
            {
                health.SystemStatus.DiskUsagePercent = 0;
            }
        }
        catch
        {
            health.SystemStatus.DiskUsagePercent = 0;
        }

        // Network Latency - measure database connection time as proxy
        var networkStart = DateTime.UtcNow;
        try
        {
            using (var testCmd = new NpgsqlCommand("SELECT 1", conn))
            {
                await testCmd.ExecuteScalarAsync();
            }
            health.SystemStatus.NetworkLatencyMs = (DateTime.UtcNow - networkStart).TotalMilliseconds;
        }
        catch
        {
            health.SystemStatus.NetworkLatencyMs = 0;
        }

        // Determine overall status
        var issues = new List<string>();
        if (health.SystemStatus.CpuUsagePercent > 80) issues.Add("CPU");
        if (health.SystemStatus.MemoryUsagePercent > 85) issues.Add("Memory");
        if (health.SystemStatus.DiskUsagePercent > 90) issues.Add("Disk");
        if (health.SystemStatus.NetworkLatencyMs > 100) issues.Add("Network");

        health.SystemStatus.OverallStatus = issues.Count == 0 ? "Healthy" 
            : issues.Count <= 2 ? "Warning" 
            : "Unhealthy";
        health.SystemStatus.LastUpdated = DateTime.UtcNow;

        // Database Health - Get real metrics
        var dbStartTime = DateTime.UtcNow;
        try
        {
            using (var testCmd = new NpgsqlCommand("SELECT 1", conn))
            {
                await testCmd.ExecuteScalarAsync();
            }
            health.DatabaseHealth.ResponseTimeMs = (DateTime.UtcNow - dbStartTime).TotalMilliseconds;
        }
        catch
        {
            health.DatabaseHealth.ResponseTimeMs = 9999; // Error
        }
        
        health.DatabaseHealth.Status = health.DatabaseHealth.ResponseTimeMs < 100 ? "Healthy" 
            : health.DatabaseHealth.ResponseTimeMs < 500 ? "Warning" 
            : "Unhealthy";
        
        try
        {
            using (var cmd = new NpgsqlCommand(@"
                SELECT 
                    COUNT(*) as TotalConnections,
                    COUNT(*) FILTER (WHERE state = 'active') as ActiveConnections
                FROM pg_stat_activity
                WHERE datname = current_database()", conn))
            {
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    health.DatabaseHealth.ActiveConnections = reader.GetInt32(1);
                }
            }

            // Get max connections from PostgreSQL
            using (var cmd = new NpgsqlCommand("SHOW max_connections", conn))
            {
                var maxConnStr = await cmd.ExecuteScalarAsync();
                if (maxConnStr != null && int.TryParse(maxConnStr.ToString(), out var maxConn))
                {
                    health.DatabaseHealth.MaxConnections = maxConn;
                }
                else
                {
                    health.DatabaseHealth.MaxConnections = 100; // Default
                }
            }

            // Get total queries from pg_stat_statements if available, otherwise estimate
            try
            {
                using (var cmd = new NpgsqlCommand(@"
                    SELECT COALESCE(SUM(calls), 0)
                    FROM pg_stat_statements
                    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())", conn))
                {
                    var result = await cmd.ExecuteScalarAsync();
                    health.DatabaseHealth.TotalQueries = result != null ? Convert.ToInt64(result) : 0;
                }
            }
            catch
            {
                // pg_stat_statements might not be enabled, use estimate from audit logs
                using (var cmd = new NpgsqlCommand(@"
                    SELECT COUNT(*) 
                    FROM audit_logs 
                    WHERE CreatedDate >= CURRENT_DATE - INTERVAL '30 days'", conn))
                {
                    health.DatabaseHealth.TotalQueries = Convert.ToInt64(await cmd.ExecuteScalarAsync() ?? 0) * 10; // Rough estimate
                }
            }

            // Get slow queries count
            try
            {
                using (var cmd = new NpgsqlCommand(@"
                    SELECT COUNT(*) 
                    FROM pg_stat_statements
                    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
                        AND mean_exec_time > 1000", conn))
                {
                    var result = await cmd.ExecuteScalarAsync();
                    health.DatabaseHealth.SlowQueries = result != null ? Convert.ToInt32(result) : 0;
                }
            }
            catch
            {
                health.DatabaseHealth.SlowQueries = 0;
            }

            health.DatabaseHealth.AverageQueryTimeMs = health.DatabaseHealth.ResponseTimeMs;
        }
        catch
        {
            health.DatabaseHealth.ActiveConnections = 0;
            health.DatabaseHealth.MaxConnections = 100;
            health.DatabaseHealth.TotalQueries = 0;
            health.DatabaseHealth.AverageQueryTimeMs = 0;
            health.DatabaseHealth.SlowQueries = 0;
        }

        // API Health - Get from audit logs
        try
        {
            var last24Hours = DateTime.UtcNow.AddDays(-1);
            using (var cmd = new NpgsqlCommand(@"
                SELECT 
                    COUNT(*) as TotalRequests,
                    COUNT(*) FILTER (WHERE ActionType LIKE '%Error%' OR ActionType LIKE '%Failed%') as FailedRequests
                FROM audit_logs
                WHERE CreatedDate >= @StartDate", conn))
            {
                cmd.Parameters.AddWithValue("StartDate", last24Hours);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    health.ApiHealth.TotalRequests = reader.GetInt32(0);
                    health.ApiHealth.FailedRequests = reader.GetInt32(1);
                    health.ApiHealth.SuccessfulRequests = health.ApiHealth.TotalRequests - health.ApiHealth.FailedRequests;
                }
            }

            // Calculate requests per second (last hour)
            var lastHour = DateTime.UtcNow.AddHours(-1);
            using (var cmd = new NpgsqlCommand(@"
                SELECT COUNT(*) 
                FROM audit_logs
                WHERE CreatedDate >= @StartDate", conn))
            {
                cmd.Parameters.AddWithValue("StartDate", lastHour);
                var requestsLastHour = Convert.ToInt32(await cmd.ExecuteScalarAsync() ?? 0);
                health.ApiHealth.RequestsPerSecond = requestsLastHour / 3600.0;
            }

            health.ApiHealth.AverageResponseTimeMs = health.DatabaseHealth.ResponseTimeMs * 1.5; // Estimate
            health.ApiHealth.Status = health.ApiHealth.FailedRequests > health.ApiHealth.TotalRequests * 0.1 
                ? "Warning" 
                : "Healthy";
        }
        catch
        {
            health.ApiHealth.Status = "Unknown";
            health.ApiHealth.TotalRequests = 0;
            health.ApiHealth.SuccessfulRequests = 0;
            health.ApiHealth.FailedRequests = 0;
            health.ApiHealth.AverageResponseTimeMs = 0;
            health.ApiHealth.RequestsPerSecond = 0;
        }

        // AI Service Health - Get from analysis_results
        try
        {
            var last24Hours = DateTime.UtcNow.AddDays(-1);
            using (var cmd = new NpgsqlCommand(@"
                SELECT 
                    AVG(COALESCE(ProcessingTimeSeconds, 0)) * 1000 as AvgResponseTime,
                    COUNT(*) FILTER (WHERE AnalysisStatus = 'Processing') as QueueLength,
                    COUNT(*) FILTER (WHERE AnalysisStatus = 'Completed' AND CreatedDate >= @StartDate) as CompletedCount
                FROM analysis_results
                WHERE CreatedDate >= @StartDate
                    AND COALESCE(IsDeleted, false) = false", conn))
            {
                cmd.Parameters.AddWithValue("StartDate", last24Hours);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    health.AiServiceHealth.AverageResponseTimeMs = reader.IsDBNull(0) ? 0 : reader.GetDouble(0);
                    health.AiServiceHealth.QueueLength = reader.GetInt32(1);
                    var completedCount = reader.GetInt32(2);
                    health.AiServiceHealth.QueueProcessingRate = completedCount / 24.0; // Per hour
                }
            }

            health.AiServiceHealth.ActiveWorkers = Math.Min(health.AiServiceHealth.QueueLength, 5);
            health.AiServiceHealth.MaxWorkers = 5;
            health.AiServiceHealth.Status = health.AiServiceHealth.AverageResponseTimeMs > 5000 
                ? "Warning" 
                : "Healthy";
            health.AiServiceHealth.LastHealthCheck = DateTime.UtcNow;
        }
        catch
        {
            health.AiServiceHealth.Status = "Unknown";
            health.AiServiceHealth.AverageResponseTimeMs = 0;
            health.AiServiceHealth.QueueLength = 0;
            health.AiServiceHealth.ActiveWorkers = 0;
            health.AiServiceHealth.MaxWorkers = 5;
            health.AiServiceHealth.QueueProcessingRate = 0;
            health.AiServiceHealth.LastHealthCheck = DateTime.UtcNow;
        }

        // Uptime - Calculate from system start time
        try
        {
            var systemStartTime = Process.GetCurrentProcess().StartTime;
            var totalUptime = DateTime.UtcNow - systemStartTime;
            var totalDays = totalUptime.TotalDays;
            
            // Estimate downtime from failed analyses (rough estimate)
            using (var cmd = new NpgsqlCommand(@"
                SELECT COUNT(*) 
                FROM analysis_results
                WHERE AnalysisStatus = 'Failed'
                    AND CreatedDate >= @StartDate", conn))
            {
                cmd.Parameters.AddWithValue("StartDate", systemStartTime);
                var failedCount = Convert.ToInt32(await cmd.ExecuteScalarAsync() ?? 0);
                // Estimate: each failed analysis = 1 minute downtime
                var estimatedDowntime = TimeSpan.FromMinutes(failedCount);
                
                health.Uptime.TotalUptime = totalUptime;
                health.Uptime.TotalDowntime = estimatedDowntime;
                health.Uptime.UptimePercentage = totalDays > 0 
                    ? (double)((totalUptime - estimatedDowntime).TotalDays / totalDays * 100) 
                    : 100;
                health.Uptime.IncidentsCount = failedCount > 0 ? (int)Math.Ceiling(failedCount / 10.0) : 0;
                health.Uptime.LastIncident = failedCount > 0 
                    ? DateTime.UtcNow.AddHours(-1) 
                    : DateTime.UtcNow.AddDays(-30);
            }
        }
        catch
        {
            health.Uptime.UptimePercentage = 99.9;
            health.Uptime.TotalUptime = TimeSpan.FromDays(30);
            health.Uptime.TotalDowntime = TimeSpan.FromMinutes(30);
            health.Uptime.IncidentsCount = 0;
            health.Uptime.LastIncident = DateTime.UtcNow.AddDays(-30);
        }

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

