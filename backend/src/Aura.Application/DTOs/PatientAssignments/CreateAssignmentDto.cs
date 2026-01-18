using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.PatientAssignments;

/// <summary>
/// DTO cho tạo patient assignment mới
/// </summary>
public class CreateAssignmentDto
{
    [Required(ErrorMessage = "UserId là bắt buộc")]
    public string UserId { get; set; } = string.Empty;
    
    public string? ClinicId { get; set; }
    
    [StringLength(500, ErrorMessage = "Notes không được vượt quá 500 ký tự")]
    public string? Notes { get; set; }
}
