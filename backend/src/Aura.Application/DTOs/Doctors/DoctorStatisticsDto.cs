namespace Aura.Application.DTOs.Doctors;

/// <summary>
/// DTO cho thống kê bác sĩ
/// </summary>
public class DoctorStatisticsDto
{
    public int TotalPatients { get; set; }
    public int ActiveAssignments { get; set; }
    public int TotalAnalyses { get; set; }
    public int PendingAnalyses { get; set; }
    public int MedicalNotesCount { get; set; }
    public DateTime? LastActivityDate { get; set; }
}
