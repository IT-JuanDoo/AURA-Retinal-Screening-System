namespace Aura.Application.DTOs.Payments;

/// <summary>
/// DTO cho service package
/// </summary>
public class PackageDto
{
    public string Id { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string PackageType { get; set; } = string.Empty; // Individual, Clinic, Enterprise
    public string? Description { get; set; }
    public int NumberOfAnalyses { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "VND";
    public int? ValidityDays { get; set; }
    public bool IsActive { get; set; }
}
