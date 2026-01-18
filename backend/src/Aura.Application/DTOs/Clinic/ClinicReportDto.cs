namespace Aura.Application.DTOs.Clinic;

/// <summary>
/// DTO cho Clinic Report (FR-26, FR-30)
/// </summary>
public class CreateClinicReportDto
{
    public string ClinicId { get; set; } = string.Empty;
    public string ReportName { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty; // "ScreeningCampaign", "RiskDistribution", "MonthlySummary", "AnnualReport", "Custom"
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public bool ExportToFile { get; set; } = false; // Export PDF/CSV
    public string? ExportFormat { get; set; } // "PDF", "CSV", "JSON"
}

public class ClinicReportDto
{
    public string Id { get; set; } = string.Empty;
    public string ClinicId { get; set; } = string.Empty;
    public string ReportName { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty;
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public int TotalPatients { get; set; }
    public int TotalAnalyses { get; set; }
    public int HighRiskCount { get; set; }
    public int MediumRiskCount { get; set; }
    public int LowRiskCount { get; set; }
    public Dictionary<string, object>? ReportData { get; set; }
    public string? ReportFileUrl { get; set; }
    public DateTime GeneratedAt { get; set; }
}
