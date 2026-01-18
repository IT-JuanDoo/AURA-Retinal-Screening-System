using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.MedicalNotes;

/// <summary>
/// DTO cho tạo medical note mới
/// </summary>
public class CreateMedicalNoteDto
{
    [Required(ErrorMessage = "ResultId là bắt buộc")]
    public string ResultId { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "NoteType là bắt buộc")]
    public string NoteType { get; set; } = string.Empty; // Diagnosis, Recommendation, FollowUp, General, Prescription
    
    [Required(ErrorMessage = "NoteContent là bắt buộc")]
    [StringLength(5000, ErrorMessage = "NoteContent không được vượt quá 5000 ký tự")]
    public string NoteContent { get; set; } = string.Empty;
    
    [StringLength(500, ErrorMessage = "Diagnosis không được vượt quá 500 ký tự")]
    public string? Diagnosis { get; set; }
    
    [StringLength(2000, ErrorMessage = "Prescription không được vượt quá 2000 ký tự")]
    public string? Prescription { get; set; }
    
    public DateTime? FollowUpDate { get; set; }
    
    public bool IsImportant { get; set; } = false;
}
