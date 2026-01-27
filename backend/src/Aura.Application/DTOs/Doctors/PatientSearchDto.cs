namespace Aura.Application.DTOs.Doctors;

/// <summary>
/// DTO for patient search request
/// </summary>
public class PatientSearchDto
{
    /// <summary>
    /// Search query - searches in ID, FirstName, LastName, Email
    /// </summary>
    public string? SearchQuery { get; set; }
    
    /// <summary>
    /// Filter by risk level (Low, Medium, High, Critical)
    /// </summary>
    public string? RiskLevel { get; set; }
    
    /// <summary>
    /// Filter by clinic ID
    /// </summary>
    public string? ClinicId { get; set; }
    
    /// <summary>
    /// Page number (default: 1)
    /// </summary>
    public int Page { get; set; } = 1;
    
    /// <summary>
    /// Page size (default: 20)
    /// </summary>
    public int PageSize { get; set; } = 20;
    
    /// <summary>
    /// Sort field (default: AssignedAt)
    /// </summary>
    public string? SortBy { get; set; } = "AssignedAt";
    
    /// <summary>
    /// Sort direction (asc/desc, default: desc)
    /// </summary>
    public string? SortDirection { get; set; } = "desc";
}

/// <summary>
/// DTO for patient search response with pagination
/// </summary>
public class PatientSearchResponseDto
{
    /// <summary>
    /// List of patients matching the search criteria
    /// </summary>
    public List<PatientSearchResultDto> Patients { get; set; } = new();
    
    /// <summary>
    /// Total number of patients matching the criteria
    /// </summary>
    public int TotalCount { get; set; }
    
    /// <summary>
    /// Current page number
    /// </summary>
    public int Page { get; set; }
    
    /// <summary>
    /// Page size
    /// </summary>
    public int PageSize { get; set; }
    
    /// <summary>
    /// Total number of pages
    /// </summary>
    public int TotalPages { get; set; }
}

/// <summary>
/// DTO for individual patient search result
/// </summary>
public class PatientSearchResultDto
{
    public string UserId { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? Dob { get; set; }
    public string? Gender { get; set; }
    public string? ProfileImageUrl { get; set; }
    /// <summary>
    /// Ngày được gán cho bác sĩ (có thể null nếu chưa được assign)
    /// </summary>
    public DateTime? AssignedAt { get; set; }
    public string? ClinicId { get; set; }
    public string? ClinicName { get; set; }
    public int AnalysisCount { get; set; }
    public int MedicalNotesCount { get; set; }
    
    /// <summary>
    /// Latest risk level from analysis results
    /// </summary>
    public string? LatestRiskLevel { get; set; }
    
    /// <summary>
    /// Latest risk score from analysis results
    /// </summary>
    public decimal? LatestRiskScore { get; set; }
    
    /// <summary>
    /// Date of latest analysis
    /// </summary>
    public DateTime? LatestAnalysisDate { get; set; }
}
