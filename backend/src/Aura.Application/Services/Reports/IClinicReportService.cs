using Aura.Application.DTOs.Clinic;

namespace Aura.Application.Services.Reports;

/// <summary>
/// Service interface cho Clinic Report Generation (FR-26)
/// </summary>
public interface IClinicReportService
{
    /// <summary>
    /// Generate clinic-wide report
    /// </summary>
    Task<ClinicReportDto> GenerateReportAsync(CreateClinicReportDto dto, string userId);

    /// <summary>
    /// Get clinic report by ID
    /// </summary>
    Task<ClinicReportDto?> GetReportByIdAsync(string reportId, string userId);

    /// <summary>
    /// Get all clinic reports for a user
    /// </summary>
    Task<List<ClinicReportDto>> GetReportsAsync(string userId, string? clinicId = null, string? reportType = null);

    /// <summary>
    /// Export report to file (PDF/CSV/JSON)
    /// </summary>
    Task<string?> ExportReportAsync(string reportId, string format, string userId);

    /// <summary>
    /// Get clinic information for report generation
    /// </summary>
    Task<ClinicInfoDto?> GetClinicInfoAsync(string clinicId, string userId);

    /// <summary>
    /// Get available report templates
    /// </summary>
    List<ReportTemplateDto> GetReportTemplates();
}

/// <summary>
/// DTO for clinic information
/// </summary>
public class ClinicInfoDto
{
    public string Id { get; set; } = string.Empty;
    public string ClinicName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Address { get; set; } = string.Empty;
}

/// <summary>
/// DTO for report template
/// </summary>
public class ReportTemplateDto
{
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public bool RequiresPeriod { get; set; } = true;
}
