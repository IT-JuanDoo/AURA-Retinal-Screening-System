namespace Aura.Application.DTOs.Doctors;

/// <summary>
/// DTO cho mục trong danh sách phân tích của bác sĩ (Quản lý phân tích).
/// Dùng cho GET /api/doctors/analyses.
/// </summary>
public class DoctorAnalysisListItemDto
{
    public string Id { get; set; } = string.Empty;
    public string ImageId { get; set; } = string.Empty;
    public string PatientUserId { get; set; } = string.Empty;
    public string? PatientName { get; set; }
    public string AnalysisStatus { get; set; } = string.Empty;
    public string? OverallRiskLevel { get; set; }
    public decimal? RiskScore { get; set; }
    public bool DiabeticRetinopathyDetected { get; set; }
    public decimal? AiConfidenceScore { get; set; }
    public DateTime? AnalysisCompletedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    /// <summary>
    /// True nếu bác sĩ hiện tại đã xác nhận (có bản ghi ai_feedback cho ResultId + DoctorId).
    /// </summary>
    public bool IsValidated { get; set; }
    public string? ValidatedBy { get; set; }
    public DateTime? ValidatedAt { get; set; }
}
