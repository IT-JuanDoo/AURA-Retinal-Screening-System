namespace Aura.Application.DTOs.Alerts;

public class HighRiskAlertDto
{
    public string Id { get; set; } = string.Empty;
    public string PatientUserId { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public string? PatientEmail { get; set; }
    public string? ClinicId { get; set; }
    public string? ClinicName { get; set; }
    public string? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public string AnalysisResultId { get; set; } = string.Empty;
    public string ImageId { get; set; } = string.Empty;
    public string OverallRiskLevel { get; set; } = string.Empty; // High, Critical
    public decimal? RiskScore { get; set; }
    public string? HypertensionRisk { get; set; }
    public decimal? HypertensionScore { get; set; }
    public string? DiabetesRisk { get; set; }
    public decimal? DiabetesScore { get; set; }
    public string? StrokeRisk { get; set; }
    public decimal? StrokeScore { get; set; }
    public bool DiabeticRetinopathyDetected { get; set; }
    public string? DiabeticRetinopathySeverity { get; set; }
    public string? HealthWarnings { get; set; }
    public DateTime DetectedAt { get; set; }
    public bool IsAcknowledged { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public string? AcknowledgedBy { get; set; }
}

public class PatientRiskTrendDto
{
    public string PatientUserId { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public List<RiskTrendPointDto> TrendPoints { get; set; } = new();
    public string CurrentRiskLevel { get; set; } = string.Empty;
    public decimal? CurrentRiskScore { get; set; }
    public string TrendDirection { get; set; } = string.Empty; // Improving, Stable, Worsening
    public int DaysSinceLastAnalysis { get; set; }
    public int TotalAnalyses { get; set; }
}

public class RiskTrendPointDto
{
    public DateTime AnalysisDate { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
    public decimal? RiskScore { get; set; }
    public string AnalysisResultId { get; set; } = string.Empty;
}

public class ClinicAlertSummaryDto
{
    public string ClinicId { get; set; } = string.Empty;
    public string ClinicName { get; set; } = string.Empty;
    public int TotalHighRiskPatients { get; set; }
    public int TotalCriticalRiskPatients { get; set; }
    public int UnacknowledgedAlerts { get; set; }
    public List<HighRiskAlertDto> RecentAlerts { get; set; } = new();
    public DateTime LastAlertDate { get; set; }
}

public class AbnormalTrendDto
{
    public string PatientUserId { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public string TrendType { get; set; } = string.Empty; // RapidDeterioration, SuddenSpike, ConsistentHigh
    public string Description { get; set; } = string.Empty;
    public decimal? PreviousRiskScore { get; set; }
    public decimal? CurrentRiskScore { get; set; }
    public string? PreviousRiskLevel { get; set; }
    public string? CurrentRiskLevel { get; set; }
    public int DaysBetweenAnalyses { get; set; }
    public DateTime DetectedAt { get; set; }
    public List<RiskTrendPointDto> TrendHistory { get; set; } = new();
}
