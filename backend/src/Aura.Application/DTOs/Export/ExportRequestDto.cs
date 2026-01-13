using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.Export;

/// <summary>
/// DTO cho yêu cầu export báo cáo phân tích
/// </summary>
public class ExportRequestDto
{
    /// <summary>
    /// ID của kết quả phân tích cần export
    /// </summary>
    [Required(ErrorMessage = "AnalysisResultId là bắt buộc")]
    public string AnalysisResultId { get; set; } = string.Empty;
    
    /// <summary>
    /// Loại báo cáo: PDF, CSV, JSON, Excel
    /// </summary>
    [Required(ErrorMessage = "ReportType là bắt buộc")]
    [RegularExpression("^(PDF|CSV|JSON|Excel)$", ErrorMessage = "ReportType phải là PDF, CSV, JSON hoặc Excel")]
    public string ReportType { get; set; } = "PDF";
    
    /// <summary>
    /// Có bao gồm hình ảnh trong báo cáo không (chỉ áp dụng cho PDF)
    /// </summary>
    public bool IncludeImages { get; set; } = true;
    
    /// <summary>
    /// Có bao gồm thông tin bệnh nhân không
    /// </summary>
    public bool IncludePatientInfo { get; set; } = true;
    
    /// <summary>
    /// Ngôn ngữ báo cáo: vi (Tiếng Việt), en (English)
    /// </summary>
    [RegularExpression("^(vi|en)$", ErrorMessage = "Language phải là 'vi' hoặc 'en'")]
    public string Language { get; set; } = "vi";
}

/// <summary>
/// DTO cho yêu cầu export nhiều kết quả phân tích
/// </summary>
public class BatchExportRequestDto
{
    /// <summary>
    /// Danh sách ID của các kết quả phân tích cần export
    /// </summary>
    [Required(ErrorMessage = "AnalysisResultIds là bắt buộc")]
    [MinLength(1, ErrorMessage = "Cần ít nhất 1 ID kết quả phân tích")]
    public List<string> AnalysisResultIds { get; set; } = new();
    
    /// <summary>
    /// Loại báo cáo: PDF, CSV, JSON, Excel
    /// </summary>
    [Required(ErrorMessage = "ReportType là bắt buộc")]
    [RegularExpression("^(PDF|CSV|JSON|Excel)$", ErrorMessage = "ReportType phải là PDF, CSV, JSON hoặc Excel")]
    public string ReportType { get; set; } = "CSV";
    
    /// <summary>
    /// Ngôn ngữ báo cáo
    /// </summary>
    [RegularExpression("^(vi|en)$", ErrorMessage = "Language phải là 'vi' hoặc 'en'")]
    public string Language { get; set; } = "vi";
}

/// <summary>
/// Enum các loại báo cáo được hỗ trợ
/// </summary>
public static class ReportTypes
{
    public const string PDF = "PDF";
    public const string CSV = "CSV";
    public const string JSON = "JSON";
    public const string Excel = "Excel";
    
    public static readonly string[] All = { PDF, CSV, JSON, Excel };
    
    public static bool IsValid(string reportType) => All.Contains(reportType);
}

/// <summary>
/// Enum các loại người yêu cầu export
/// </summary>
public static class RequesterTypes
{
    public const string User = "User";
    public const string Doctor = "Doctor";
    public const string Admin = "Admin";
    public const string Clinic = "Clinic";
    
    public static readonly string[] All = { User, Doctor, Admin, Clinic };
    
    public static bool IsValid(string requesterType) => All.Contains(requesterType);
}
