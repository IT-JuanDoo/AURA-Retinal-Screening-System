namespace Aura.Application.DTOs.PatientAssignments;

/// <summary>
/// DTO cho patient assignment
/// </summary>
public class PatientAssignmentDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public string? PatientEmail { get; set; }
    public string DoctorId { get; set; } = string.Empty;
    public string? DoctorName { get; set; }
    public string? ClinicId { get; set; }
    public string? ClinicName { get; set; }
    public DateTime AssignedAt { get; set; }
    public string? AssignedBy { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
}
