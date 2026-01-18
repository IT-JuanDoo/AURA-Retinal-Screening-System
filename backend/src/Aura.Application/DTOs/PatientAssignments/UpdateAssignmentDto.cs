namespace Aura.Application.DTOs.PatientAssignments;

/// <summary>
/// DTO cho cập nhật patient assignment
/// </summary>
public class UpdateAssignmentDto
{
    public bool? IsActive { get; set; }
    public string? Notes { get; set; }
}
