namespace Aura.Core.Entities;

/// <summary>
/// Entity cho Clinic Report (FR-26)
/// </summary>
public class ClinicReport
{
    public string Id { get; set; } = string.Empty;
    public string ClinicId { get; set; } = string.Empty;
    public string ReportName { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty; // "ScreeningCampaign", "RiskDistribution", "MonthlySummary", "AnnualReport", "Custom"
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public int TotalPatients { get; set; }
    public int TotalAnalyses { get; set; }
    public int HighRiskCount { get; set; }
    public int MediumRiskCount { get; set; }
    public int LowRiskCount { get; set; }
    public Dictionary<string, object>? ReportData { get; set; }
    public string? GeneratedBy { get; set; }
    public DateTime GeneratedAt { get; set; }
    public string? ReportFileUrl { get; set; }
    public DateTime? CreatedDate { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
}
