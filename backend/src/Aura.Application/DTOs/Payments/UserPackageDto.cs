namespace Aura.Application.DTOs.Payments;

/// <summary>
/// DTO cho user package (purchased package)
/// </summary>
public class UserPackageDto
{
    public string Id { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? ClinicId { get; set; }
    public string PackageId { get; set; } = string.Empty;
    public string? PackageName { get; set; }
    public int RemainingAnalyses { get; set; }
    public DateTime PurchasedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public bool IsExpired => ExpiresAt.HasValue && ExpiresAt.Value < DateTime.UtcNow;
}
