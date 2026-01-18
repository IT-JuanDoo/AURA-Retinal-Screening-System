namespace Aura.Application.DTOs.Doctors;

/// <summary>
/// DTO cho Validate/Correct AI Findings (FR-15)
/// </summary>
public class ValidateFindingsDto
{
    public string AnalysisId { get; set; } = string.Empty;
    public string ValidationStatus { get; set; } = string.Empty; // "Validated", "Corrected", "NeedsReview"
    public string? CorrectedRiskLevel { get; set; }
    public decimal? CorrectedRiskScore { get; set; }
    public string? CorrectedHypertensionRisk { get; set; }
    public string? CorrectedDiabetesRisk { get; set; }
    public string? CorrectedStrokeRisk { get; set; }
    public bool? CorrectedDiabeticRetinopathyDetected { get; set; }
    public string? CorrectedDiabeticRetinopathySeverity { get; set; }
    public string? ValidationNotes { get; set; }
    public Dictionary<string, object>? CorrectedFindings { get; set; }
}
