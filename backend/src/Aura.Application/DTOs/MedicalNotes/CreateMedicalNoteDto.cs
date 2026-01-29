using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.MedicalNotes;

/// <summary>
/// DTO cho tạo medical note mới
/// </summary>
public class CreateMedicalNoteDto
{
    /// <summary>
    /// ID của kết quả phân tích (optional nếu có PatientUserId)
    /// </summary>
    public string? ResultId { get; set; }

    /// <summary>
    /// Alias cho ResultId (frontend gửi analysisId)
    /// </summary>
    public string? AnalysisId { get => ResultId; set => ResultId = value; }
    
    /// <summary>
    /// ID của bệnh nhân (optional nếu có ResultId)
    /// </summary>
    public string? PatientUserId { get; set; }
    
    [Required(ErrorMessage = "NoteType là bắt buộc")]
    public string NoteType { get; set; } = string.Empty; // Diagnosis, Recommendation, FollowUp, General, Prescription, Treatment, Observation, Other
    
    [Required(ErrorMessage = "NoteContent là bắt buộc")]
    [StringLength(5000, ErrorMessage = "NoteContent không được vượt quá 5000 ký tự")]
    public string NoteContent { get; set; } = string.Empty;
    
    [StringLength(500, ErrorMessage = "Diagnosis không được vượt quá 500 ký tự")]
    public string? Diagnosis { get; set; }
    
    [StringLength(2000, ErrorMessage = "Prescription không được vượt quá 2000 ký tự")]
    public string? Prescription { get; set; }
    
    [StringLength(2000, ErrorMessage = "TreatmentPlan không được vượt quá 2000 ký tự")]
    public string? TreatmentPlan { get; set; }
    
    [StringLength(2000, ErrorMessage = "ClinicalObservations không được vượt quá 2000 ký tự")]
    public string? ClinicalObservations { get; set; }
    
    [StringLength(50, ErrorMessage = "Severity không được vượt quá 50 ký tự")]
    public string? Severity { get; set; } // Low, Medium, High, Critical
    
    public DateTime? FollowUpDate { get; set; }
    
    public bool IsImportant { get; set; } = false;
    
    public bool IsPrivate { get; set; } = false;
}
