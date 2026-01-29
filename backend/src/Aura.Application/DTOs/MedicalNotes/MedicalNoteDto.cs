namespace Aura.Application.DTOs.MedicalNotes;

/// <summary>
/// DTO cho medical note
/// </summary>
public class MedicalNoteDto
{
    public string Id { get; set; } = string.Empty;
    public string? ResultId { get; set; }
    public string? AnalysisId { get; set; }
    public string? PatientUserId { get; set; }
    public string? PatientName { get; set; }
    public string DoctorId { get; set; } = string.Empty;
    public string? DoctorName { get; set; }
    public string NoteType { get; set; } = string.Empty;
    public string NoteContent { get; set; } = string.Empty;
    public string? Diagnosis { get; set; }
    public string? Prescription { get; set; }
    public string? TreatmentPlan { get; set; }
    public string? ClinicalObservations { get; set; }
    public string? Severity { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public bool IsImportant { get; set; }
    public bool IsPrivate { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? CreatedAt { get; set; }  // For frontend compatibility
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    /// <summary>Thời điểm bệnh nhân xem ghi chú (null = chưa xem).</summary>
    public DateTime? ViewedByPatientAt { get; set; }
}
