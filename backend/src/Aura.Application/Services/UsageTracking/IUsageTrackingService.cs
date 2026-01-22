using Aura.Application.DTOs.UsageTracking;
using System.Threading.Tasks;

namespace Aura.Application.Services.UsageTracking;

public interface IUsageTrackingService
{
    /// <summary>
    /// Get usage statistics for a clinic
    /// </summary>
    Task<ClinicUsageStatisticsDto> GetClinicUsageStatisticsAsync(string clinicId, DateTime? startDate = null, DateTime? endDate = null);

    /// <summary>
    /// Get usage statistics for a user
    /// </summary>
    Task<UserUsageStatisticsDto> GetUserUsageStatisticsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null);

    /// <summary>
    /// Get package usage details for a clinic
    /// </summary>
    Task<List<PackageUsageDto>> GetClinicPackageUsageAsync(string clinicId);

    /// <summary>
    /// Get package usage details for a user
    /// </summary>
    Task<List<PackageUsageDto>> GetUserPackageUsageAsync(string userId);

    /// <summary>
    /// Track image upload (increment count)
    /// </summary>
    Task TrackImageUploadAsync(string userId, string? clinicId = null);

    /// <summary>
    /// Track analysis completion (increment count and decrement package credits)
    /// </summary>
    Task TrackAnalysisCompletionAsync(string userId, string? clinicId = null, bool success = true);
}
