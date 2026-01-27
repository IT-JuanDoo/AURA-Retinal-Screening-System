namespace Aura.Application.DTOs.MedicalNotes;

/// <summary>
/// DTO cho cập nhật medical note
/// </summary>
public class UpdateMedicalNoteDto
{
    public string? NoteType { get; set; }
    public string? NoteContent { get; set; }
    public string? Diagnosis { get; set; }
    public string? Prescription { get; set; }
    public string? TreatmentPlan { get; set; }
    public string? ClinicalObservations { get; set; }
    public string? Severity { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public bool? IsImportant { get; set; }
    public bool? IsPrivate { get; set; }
}
