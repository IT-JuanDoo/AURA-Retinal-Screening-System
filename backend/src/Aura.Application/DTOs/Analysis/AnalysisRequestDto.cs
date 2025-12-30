namespace Aura.Application.DTOs.Analysis;

public class AnalysisRequestDto
{
    public List<string> ImageIds { get; set; } = new();
}

public class AnalysisResponseDto
{
    public string AnalysisId { get; set; } = string.Empty;
    public string ImageId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // Processing, Completed, Failed
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class AnalysisResultDto
{
    public string Id { get; set; } = string.Empty;
    public string ImageId { get; set; } = string.Empty;
    public string AnalysisStatus { get; set; } = string.Empty;
    public string? OverallRiskLevel { get; set; } // Low, Medium, High, Critical
    public decimal? RiskScore { get; set; } // 0-100
    
    // Cardiovascular Risk
    public string? HypertensionRisk { get; set; }
    public decimal? HypertensionScore { get; set; }
    
    // Diabetes Risk
    public string? DiabetesRisk { get; set; }
    public decimal? DiabetesScore { get; set; }
    public bool DiabeticRetinopathyDetected { get; set; }
    public string? DiabeticRetinopathySeverity { get; set; }
    
    // Stroke Risk
    public string? StrokeRisk { get; set; }
    public decimal? StrokeScore { get; set; }
    
    // Vascular Abnormalities
    public decimal? VesselTortuosity { get; set; }
    public decimal? VesselWidthVariation { get; set; }
    public int MicroaneurysmsCount { get; set; }
    public bool HemorrhagesDetected { get; set; }
    public bool ExudatesDetected { get; set; }
    
    // Annotated Images
    public string? AnnotatedImageUrl { get; set; }
    public string? HeatmapUrl { get; set; }
    
    // AI Confidence
    public decimal? AiConfidenceScore { get; set; }
    
    // Recommendations
    public string? Recommendations { get; set; }
    public string? HealthWarnings { get; set; }
    
    // Processing Info
    public int? ProcessingTimeSeconds { get; set; }
    public DateTime? AnalysisStartedAt { get; set; }
    public DateTime? AnalysisCompletedAt { get; set; }
    
    // Additional Data
    public Dictionary<string, object>? DetailedFindings { get; set; }
}

