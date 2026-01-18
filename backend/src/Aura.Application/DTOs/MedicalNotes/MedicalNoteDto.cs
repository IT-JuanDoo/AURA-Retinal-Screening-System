namespace Aura.Application.DTOs.MedicalNotes;

/// <summary>
/// DTO cho medical note
/// </summary>
public class MedicalNoteDto
{
    public string Id { get; set; } = string.Empty;
    public string ResultId { get; set; } = string.Empty;
    public string DoctorId { get; set; } = string.Empty;
    public string? DoctorName { get; set; }
    public string NoteType { get; set; } = string.Empty;
    public string NoteContent { get; set; } = string.Empty;
    public string? Diagnosis { get; set; }
    public string? Prescription { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public bool IsImportant { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
}
