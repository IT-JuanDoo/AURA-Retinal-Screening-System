namespace Aura.Application.DTOs.Doctors;

/// <summary>
/// DTO cho AI Feedback (FR-19)
/// </summary>
public class CreateAIFeedbackDto
{
    public string ResultId { get; set; } = string.Empty;
    public string FeedbackType { get; set; } = string.Empty; // "Correct", "Incorrect", "PartiallyCorrect", "NeedsReview"
    public string? OriginalRiskLevel { get; set; }
    public string? CorrectedRiskLevel { get; set; }
    public string? FeedbackNotes { get; set; }
    public bool UseForTraining { get; set; } = true;
}

public class AIFeedbackDto
{
    public string Id { get; set; } = string.Empty;
    public string ResultId { get; set; } = string.Empty;
    public string DoctorId { get; set; } = string.Empty;
    public string FeedbackType { get; set; } = string.Empty;
    public string? OriginalRiskLevel { get; set; }
    public string? CorrectedRiskLevel { get; set; }
    public string? FeedbackNotes { get; set; }
    public bool IsUsedForTraining { get; set; }
    public System.DateTime CreatedDate { get; set; }
}
