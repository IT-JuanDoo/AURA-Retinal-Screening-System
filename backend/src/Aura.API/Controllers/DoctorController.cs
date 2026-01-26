using Aura.Application.DTOs.Analysis;
using Aura.Application.DTOs.Doctors;
using Aura.Application.Services.Analysis;
using Aura.Application.Services.Doctors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller cho Doctor Dashboard và quản lý bệnh nhân (FR-13-21)
/// </summary>
[ApiController]
[Route("api/doctors")]
[Authorize]
[Produces("application/json")]
public class DoctorController : ControllerBase
{
    private readonly IAnalysisService _analysisService;
    private readonly IPatientSearchService _patientSearchService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DoctorController> _logger;
    private readonly string _connectionString;

    public DoctorController(
        IAnalysisService analysisService,
        IPatientSearchService patientSearchService,
        IConfiguration configuration,
        ILogger<DoctorController> logger)
    {
        _analysisService = analysisService ?? throw new ArgumentNullException(nameof(analysisService));
        _patientSearchService = patientSearchService ?? throw new ArgumentNullException(nameof(patientSearchService));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string not configured");
    }

    #region Doctor Profile

    /// <summary>
    /// Lấy thông tin profile của bác sĩ hiện tại
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(DoctorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentDoctor()
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT Id, Username, FirstName, LastName, Email, Phone, Gender, 
                       LicenseNumber, Specialization, YearsOfExperience, Qualification,
                       HospitalAffiliation, ProfileImageUrl, Bio, IsVerified, IsActive, LastLoginAt
                FROM doctors
                WHERE Id = @DoctorId AND COALESCE(IsDeleted, false) = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("DoctorId", doctorId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy thông tin bác sĩ" });
            }

            var doctor = new DoctorDto
            {
                Id = reader.GetString(0),
                Username = reader.IsDBNull(1) ? null : reader.GetString(1),
                FirstName = reader.IsDBNull(2) ? null : reader.GetString(2),
                LastName = reader.IsDBNull(3) ? null : reader.GetString(3),
                Email = reader.GetString(4),
                Phone = reader.IsDBNull(5) ? null : reader.GetString(5),
                Gender = reader.IsDBNull(6) ? null : reader.GetString(6),
                LicenseNumber = reader.GetString(7),
                Specialization = reader.IsDBNull(8) ? null : reader.GetString(8),
                YearsOfExperience = reader.IsDBNull(9) ? null : reader.GetInt32(9),
                Qualification = reader.IsDBNull(10) ? null : reader.GetString(10),
                HospitalAffiliation = reader.IsDBNull(11) ? null : reader.GetString(11),
                ProfileImageUrl = reader.IsDBNull(12) ? null : reader.GetString(12),
                Bio = reader.IsDBNull(13) ? null : reader.GetString(13),
                IsVerified = reader.GetBoolean(14),
                IsActive = reader.GetBoolean(15),
                LastLoginAt = reader.IsDBNull(16) ? null : reader.GetDateTime(16)
            };

            return Ok(doctor);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting doctor profile {DoctorId}", doctorId);
            return StatusCode(500, new { message = "Không thể lấy thông tin bác sĩ" });
        }
    }

    /// <summary>
    /// Cập nhật profile của bác sĩ hiện tại
    /// </summary>
    [HttpPut("me")]
    [ProducesResponseType(typeof(DoctorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateCurrentDoctor([FromBody] UpdateDoctorProfileDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        // Validate gender if provided
        if (!string.IsNullOrWhiteSpace(dto.Gender) && 
            !new[] { "Male", "Female", "Other" }.Contains(dto.Gender))
        {
            return BadRequest(new { message = "Gender phải là: Male, Female, hoặc Other" });
        }

        // Validate years of experience if provided
        if (dto.YearsOfExperience.HasValue && dto.YearsOfExperience.Value < 0)
        {
            return BadRequest(new { message = "YearsOfExperience không được âm" });
        }

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE doctors
                SET FirstName = COALESCE(@FirstName, FirstName),
                    LastName = COALESCE(@LastName, LastName),
                    Phone = COALESCE(@Phone, Phone),
                    Gender = COALESCE(@Gender, Gender),
                    Specialization = COALESCE(@Specialization, Specialization),
                    YearsOfExperience = COALESCE(@YearsOfExperience, YearsOfExperience),
                    Qualification = COALESCE(@Qualification, Qualification),
                    HospitalAffiliation = COALESCE(@HospitalAffiliation, HospitalAffiliation),
                    ProfileImageUrl = COALESCE(@ProfileImageUrl, ProfileImageUrl),
                    Bio = COALESCE(@Bio, Bio),
                    UpdatedDate = CURRENT_DATE,
                    UpdatedBy = @DoctorId
                WHERE Id = @DoctorId AND COALESCE(IsDeleted, false) = false
                RETURNING Id, Username, FirstName, LastName, Email, Phone, Gender, 
                          LicenseNumber, Specialization, YearsOfExperience, Qualification,
                          HospitalAffiliation, ProfileImageUrl, Bio, IsVerified, IsActive, LastLoginAt";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("DoctorId", doctorId);
            command.Parameters.AddWithValue("FirstName", (object?)dto.FirstName ?? DBNull.Value);
            command.Parameters.AddWithValue("LastName", (object?)dto.LastName ?? DBNull.Value);
            command.Parameters.AddWithValue("Phone", (object?)dto.Phone ?? DBNull.Value);
            command.Parameters.AddWithValue("Gender", (object?)dto.Gender ?? DBNull.Value);
            command.Parameters.AddWithValue("Specialization", (object?)dto.Specialization ?? DBNull.Value);
            command.Parameters.AddWithValue("YearsOfExperience", (object?)dto.YearsOfExperience ?? DBNull.Value);
            command.Parameters.AddWithValue("Qualification", (object?)dto.Qualification ?? DBNull.Value);
            command.Parameters.AddWithValue("HospitalAffiliation", (object?)dto.HospitalAffiliation ?? DBNull.Value);
            command.Parameters.AddWithValue("ProfileImageUrl", (object?)dto.ProfileImageUrl ?? DBNull.Value);
            command.Parameters.AddWithValue("Bio", (object?)dto.Bio ?? DBNull.Value);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy thông tin bác sĩ" });
            }

            var doctor = new DoctorDto
            {
                Id = reader.GetString(0),
                Username = reader.IsDBNull(1) ? null : reader.GetString(1),
                FirstName = reader.IsDBNull(2) ? null : reader.GetString(2),
                LastName = reader.IsDBNull(3) ? null : reader.GetString(3),
                Email = reader.GetString(4),
                Phone = reader.IsDBNull(5) ? null : reader.GetString(5),
                Gender = reader.IsDBNull(6) ? null : reader.GetString(6),
                LicenseNumber = reader.GetString(7),
                Specialization = reader.IsDBNull(8) ? null : reader.GetString(8),
                YearsOfExperience = reader.IsDBNull(9) ? null : reader.GetInt32(9),
                Qualification = reader.IsDBNull(10) ? null : reader.GetString(10),
                HospitalAffiliation = reader.IsDBNull(11) ? null : reader.GetString(11),
                ProfileImageUrl = reader.IsDBNull(12) ? null : reader.GetString(12),
                Bio = reader.IsDBNull(13) ? null : reader.GetString(13),
                IsVerified = reader.GetBoolean(14),
                IsActive = reader.GetBoolean(15),
                LastLoginAt = reader.IsDBNull(16) ? null : reader.GetDateTime(16)
            };

            _logger.LogInformation("Doctor profile updated: {DoctorId}", doctorId);
            return Ok(doctor);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating doctor profile {DoctorId}", doctorId);
            return StatusCode(500, new { message = "Không thể cập nhật thông tin bác sĩ" });
        }
    }

    /// <summary>
    /// Lấy thống kê của bác sĩ
    /// </summary>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(DoctorStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetStatistics()
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    COUNT(DISTINCT pda.UserId) as TotalPatients,
                    COUNT(DISTINCT CASE WHEN pda.IsActive = true THEN pda.UserId END) as ActiveAssignments,
                    COUNT(DISTINCT ar.Id) as TotalAnalyses,
                    COUNT(DISTINCT CASE WHEN ar.AnalysisStatus = 'Pending' THEN ar.Id END) as PendingAnalyses,
                    COUNT(DISTINCT mn.Id) as MedicalNotesCount,
                    MAX(GREATEST(
                        COALESCE(pda.AssignedAt::date, '1970-01-01'::date),
                        COALESCE(ar.CreatedDate, '1970-01-01'::date),
                        COALESCE(mn.CreatedDate, '1970-01-01'::date)
                    )::timestamp) as LastActivityDate
                FROM patient_doctor_assignments pda
                LEFT JOIN analysis_results ar ON ar.UserId = pda.UserId
                LEFT JOIN medical_notes mn ON mn.DoctorId = @DoctorId AND mn.ResultId = ar.Id
                WHERE pda.DoctorId = @DoctorId AND COALESCE(pda.IsDeleted, false) = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("DoctorId", doctorId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return Ok(new DoctorStatisticsDto());
            }

            var statistics = new DoctorStatisticsDto
            {
                TotalPatients = reader.GetInt32(0),
                ActiveAssignments = reader.GetInt32(1),
                TotalAnalyses = reader.GetInt32(2),
                PendingAnalyses = reader.GetInt32(3),
                MedicalNotesCount = reader.GetInt32(4),
                LastActivityDate = reader.IsDBNull(5) ? null : reader.GetDateTime(5)
            };

            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting doctor statistics {DoctorId}", doctorId);
            return StatusCode(500, new { message = "Không thể lấy thống kê" });
        }
    }

    #endregion

    #region Patients Management

    /// <summary>
    /// Tìm kiếm và lọc bệnh nhân theo ID, tên, email và mức độ rủi ro (FR-18)
    /// </summary>
    /// <param name="searchQuery">Từ khóa tìm kiếm (ID, tên, email)</param>
    /// <param name="riskLevel">Lọc theo mức độ rủi ro (Low, Medium, High, Critical)</param>
    /// <param name="clinicId">Lọc theo clinic ID</param>
    /// <param name="page">Số trang (mặc định: 1)</param>
    /// <param name="pageSize">Số lượng mỗi trang (mặc định: 20)</param>
    /// <param name="sortBy">Sắp xếp theo (AssignedAt, FirstName, LastName, Email, LatestAnalysisDate, LatestRiskLevel)</param>
    /// <param name="sortDirection">Hướng sắp xếp (asc/desc, mặc định: desc)</param>
    /// <returns>Danh sách bệnh nhân với phân trang</returns>
    [HttpGet("patients/search")]
    [ProducesResponseType(typeof(PatientSearchResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SearchPatients(
        [FromQuery] string? searchQuery = null,
        [FromQuery] string? riskLevel = null,
        [FromQuery] string? clinicId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            var searchDto = new PatientSearchDto
            {
                SearchQuery = searchQuery,
                RiskLevel = riskLevel,
                ClinicId = clinicId,
                Page = page > 0 ? page : 1,
                PageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 20,
                SortBy = sortBy,
                SortDirection = sortDirection
            };

            var result = await _patientSearchService.SearchPatientsAsync(doctorId, searchDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching patients for doctor {DoctorId}", doctorId);
            return StatusCode(500, new { message = "Không thể tìm kiếm bệnh nhân" });
        }
    }

    /// <summary>
    /// Lấy danh sách bệnh nhân được assign cho bác sĩ
    /// </summary>
    /// <param name="activeOnly">Chỉ lấy bệnh nhân đang active (mặc định: true)</param>
    /// <returns>Danh sách bệnh nhân</returns>
    [HttpGet("patients")]
    [ProducesResponseType(typeof(List<PatientListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetPatients([FromQuery] bool? activeOnly = true)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.Dob, u.Gender, u.ProfileImageUrl,
                    pda.AssignedAt, pda.ClinicId, c.ClinicName,
                    COUNT(DISTINCT ar.Id) as AnalysisCount,
                    COUNT(DISTINCT mn.Id) as MedicalNotesCount
                FROM patient_doctor_assignments pda
                INNER JOIN users u ON u.Id = pda.UserId
                LEFT JOIN clinics c ON c.Id = pda.ClinicId
                LEFT JOIN analysis_results ar ON ar.UserId = u.Id
                LEFT JOIN medical_notes mn ON mn.DoctorId = @DoctorId AND mn.ResultId = ar.Id
                WHERE pda.DoctorId = @DoctorId 
                    AND COALESCE(pda.IsDeleted, false) = false
                    AND COALESCE(u.IsDeleted, false) = false
                    AND (@ActiveOnly IS NULL OR pda.IsActive = @ActiveOnly)
                GROUP BY u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.Dob, u.Gender, 
                         u.ProfileImageUrl, pda.AssignedAt, pda.ClinicId, c.ClinicName
                ORDER BY pda.AssignedAt DESC";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("DoctorId", doctorId);
            command.Parameters.AddWithValue("ActiveOnly", (object?)activeOnly ?? DBNull.Value);

            var patients = new List<PatientListItemDto>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                patients.Add(new PatientListItemDto
                {
                    UserId = reader.GetString(0),
                    FirstName = reader.IsDBNull(1) ? null : reader.GetString(1),
                    LastName = reader.IsDBNull(2) ? null : reader.GetString(2),
                    Email = reader.GetString(3),
                    Phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Dob = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    Gender = reader.IsDBNull(6) ? null : reader.GetString(6),
                    ProfileImageUrl = reader.IsDBNull(7) ? null : reader.GetString(7),
                    AssignedAt = reader.GetDateTime(8),
                    ClinicId = reader.IsDBNull(9) ? null : reader.GetString(9),
                    ClinicName = reader.IsDBNull(10) ? null : reader.GetString(10),
                    AnalysisCount = reader.GetInt32(11),
                    MedicalNotesCount = reader.GetInt32(12)
                });
            }

            return Ok(patients);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting patients for doctor {DoctorId}", doctorId);
            return StatusCode(500, new { message = "Không thể lấy danh sách bệnh nhân" });
        }
    }

    /// <summary>
    /// Lấy thông tin chi tiết của một bệnh nhân
    /// </summary>
    [HttpGet("patients/{patientId}")]
    [ProducesResponseType(typeof(PatientListItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetPatient(string patientId)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            // Verify patient is assigned to this doctor
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.Dob, u.Gender, u.ProfileImageUrl,
                    pda.AssignedAt, pda.ClinicId, c.ClinicName,
                    COUNT(DISTINCT ar.Id) as AnalysisCount,
                    COUNT(DISTINCT mn.Id) as MedicalNotesCount
                FROM patient_doctor_assignments pda
                INNER JOIN users u ON u.Id = pda.UserId
                LEFT JOIN clinics c ON c.Id = pda.ClinicId
                LEFT JOIN analysis_results ar ON ar.UserId = u.Id
                LEFT JOIN medical_notes mn ON mn.DoctorId = @DoctorId AND mn.ResultId = ar.Id
                WHERE pda.DoctorId = @DoctorId 
                    AND pda.UserId = @PatientId
                    AND COALESCE(pda.IsDeleted, false) = false
                    AND COALESCE(u.IsDeleted, false) = false
                GROUP BY u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.Dob, u.Gender, 
                         u.ProfileImageUrl, pda.AssignedAt, pda.ClinicId, c.ClinicName";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("DoctorId", doctorId);
            command.Parameters.AddWithValue("PatientId", patientId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy bệnh nhân hoặc bệnh nhân không được assign cho bác sĩ này" });
            }

            var patient = new PatientListItemDto
            {
                UserId = reader.GetString(0),
                FirstName = reader.IsDBNull(1) ? null : reader.GetString(1),
                LastName = reader.IsDBNull(2) ? null : reader.GetString(2),
                Email = reader.GetString(3),
                Phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                Dob = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                Gender = reader.IsDBNull(6) ? null : reader.GetString(6),
                ProfileImageUrl = reader.IsDBNull(7) ? null : reader.GetString(7),
                AssignedAt = reader.GetDateTime(8),
                ClinicId = reader.IsDBNull(9) ? null : reader.GetString(9),
                ClinicName = reader.IsDBNull(10) ? null : reader.GetString(10),
                AnalysisCount = reader.GetInt32(11),
                MedicalNotesCount = reader.GetInt32(12)
            };

            return Ok(patient);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting patient {PatientId} for doctor {DoctorId}", patientId, doctorId);
            return StatusCode(500, new { message = "Không thể lấy thông tin bệnh nhân" });
        }
    }

    #endregion

    #region Analyses Management

    /// <summary>
    /// Lấy danh sách kết quả phân tích của các bệnh nhân được assign
    /// </summary>
    [HttpGet("analyses")]
    [ProducesResponseType(typeof(List<AnalysisResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAnalyses([FromQuery] string? patientId = null)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            // Get all patient IDs assigned to this doctor
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var patientIds = new List<string>();
            if (!string.IsNullOrEmpty(patientId))
            {
                // Verify patient is assigned to this doctor
                var verifySql = @"
                    SELECT UserId FROM patient_doctor_assignments
                    WHERE DoctorId = @DoctorId AND UserId = @PatientId 
                        AND COALESCE(IsDeleted, false) = false AND IsActive = true";
                
                using var verifyCmd = new NpgsqlCommand(verifySql, connection);
                verifyCmd.Parameters.AddWithValue("DoctorId", doctorId);
                verifyCmd.Parameters.AddWithValue("PatientId", patientId);
                
                var result = await verifyCmd.ExecuteScalarAsync();
                if (result != null)
                {
                    patientIds.Add(patientId);
                }
            }
            else
            {
                // Get all assigned patients
                var patientsSql = @"
                    SELECT DISTINCT UserId FROM patient_doctor_assignments
                    WHERE DoctorId = @DoctorId 
                        AND COALESCE(IsDeleted, false) = false AND IsActive = true";
                
                using var patientsCmd = new NpgsqlCommand(patientsSql, connection);
                patientsCmd.Parameters.AddWithValue("DoctorId", doctorId);
                
                using var reader = await patientsCmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    patientIds.Add(reader.GetString(0));
                }
            }

            if (patientIds.Count == 0)
            {
                return Ok(new List<AnalysisResultDto>());
            }

            // Get analyses for these patients using AnalysisService
            var allAnalyses = new List<AnalysisResultDto>();
            foreach (var pid in patientIds)
            {
                var analyses = await _analysisService.GetUserAnalysisResultsAsync(pid);
                allAnalyses.AddRange(analyses);
            }

            return Ok(allAnalyses.OrderByDescending(a => a.AnalysisStartedAt ?? a.AnalysisCompletedAt ?? DateTime.MinValue));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analyses for doctor {DoctorId}", doctorId);
            return StatusCode(500, new { message = "Không thể lấy danh sách phân tích" });
        }
    }

    /// <summary>
    /// Lấy chi tiết một kết quả phân tích
    /// </summary>
    [HttpGet("analyses/{analysisId}")]
    [ProducesResponseType(typeof(AnalysisResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAnalysis(string analysisId)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            // First, get the analysis to find the patient ID
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT ar.UserId FROM analysis_results ar
                INNER JOIN patient_doctor_assignments pda ON pda.UserId = ar.UserId
                WHERE ar.Id = @AnalysisId 
                    AND pda.DoctorId = @DoctorId
                    AND COALESCE(pda.IsDeleted, false) = false
                    AND pda.IsActive = true";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("AnalysisId", analysisId);
            command.Parameters.AddWithValue("DoctorId", doctorId);

            var userId = await command.ExecuteScalarAsync() as string;
            if (userId == null)
            {
                return NotFound(new { message = "Không tìm thấy kết quả phân tích hoặc không có quyền truy cập" });
            }

            // Get analysis details using AnalysisService
            var analysis = await _analysisService.GetAnalysisResultAsync(analysisId, userId);
            if (analysis == null)
            {
                return NotFound(new { message = "Không tìm thấy kết quả phân tích" });
            }

            return Ok(analysis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analysis {AnalysisId} for doctor {DoctorId}", analysisId, doctorId);
            return StatusCode(500, new { message = "Không thể lấy thông tin phân tích" });
        }
    }

    #endregion

    #region Validate/Correct AI Findings (FR-15)

    /// <summary>
    /// Validate hoặc correct AI findings (FR-15)
    /// </summary>
    [HttpPost("analyses/{analysisId}/validate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ValidateFindings(string analysisId, [FromBody] ValidateFindingsDto dto)
    {
        if (dto.AnalysisId != analysisId)
        {
            return BadRequest(new { message = "AnalysisId không khớp" });
        }

        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Verify doctor has access to this analysis
            var verifySql = @"
                SELECT ar.Id FROM analysis_results ar
                INNER JOIN patient_doctor_assignments pda ON pda.UserId = ar.UserId
                WHERE ar.Id = @AnalysisId 
                    AND pda.DoctorId = @DoctorId
                    AND COALESCE(pda.IsDeleted, false) = false
                    AND pda.IsActive = true";

            using var verifyCmd = new NpgsqlCommand(verifySql, connection);
            verifyCmd.Parameters.AddWithValue("AnalysisId", analysisId);
            verifyCmd.Parameters.AddWithValue("DoctorId", doctorId);

            var hasAccess = await verifyCmd.ExecuteScalarAsync();
            if (hasAccess == null)
            {
                return NotFound(new { message = "Không tìm thấy kết quả phân tích hoặc không có quyền truy cập" });
            }

            // Update analysis_results with validated/corrected data if needed
            if (dto.ValidationStatus == "Corrected" && 
                (dto.CorrectedRiskLevel != null || dto.CorrectedRiskScore.HasValue))
            {
                var updateSql = @"
                    UPDATE analysis_results
                    SET OverallRiskLevel = COALESCE(@CorrectedRiskLevel, OverallRiskLevel),
                        RiskScore = COALESCE(@CorrectedRiskScore, RiskScore),
                        HypertensionRisk = COALESCE(@CorrectedHypertensionRisk, HypertensionRisk),
                        DiabetesRisk = COALESCE(@CorrectedDiabetesRisk, DiabetesRisk),
                        StrokeRisk = COALESCE(@CorrectedStrokeRisk, StrokeRisk),
                        DiabeticRetinopathyDetected = COALESCE(@CorrectedDiabeticRetinopathyDetected, DiabeticRetinopathyDetected),
                        DiabeticRetinopathySeverity = COALESCE(@CorrectedDiabeticRetinopathySeverity, DiabeticRetinopathySeverity),
                        UpdatedDate = CURRENT_DATE,
                        Note = COALESCE(@ValidationNotes, Note)
                    WHERE Id = @AnalysisId";

                using var updateCmd = new NpgsqlCommand(updateSql, connection);
                updateCmd.Parameters.AddWithValue("AnalysisId", analysisId);
                updateCmd.Parameters.AddWithValue("CorrectedRiskLevel", (object?)dto.CorrectedRiskLevel ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("CorrectedRiskScore", (object?)dto.CorrectedRiskScore ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("CorrectedHypertensionRisk", (object?)dto.CorrectedHypertensionRisk ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("CorrectedDiabetesRisk", (object?)dto.CorrectedDiabetesRisk ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("CorrectedStrokeRisk", (object?)dto.CorrectedStrokeRisk ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("CorrectedDiabeticRetinopathyDetected", (object?)dto.CorrectedDiabeticRetinopathyDetected ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("CorrectedDiabeticRetinopathySeverity", (object?)dto.CorrectedDiabeticRetinopathySeverity ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("ValidationNotes", (object?)dto.ValidationNotes ?? DBNull.Value);

                await updateCmd.ExecuteNonQueryAsync();
            }

            // Create or update AI feedback record
            var feedbackSql = @"
                SELECT Id FROM ai_feedback 
                WHERE ResultId = @ResultId AND DoctorId = @DoctorId AND COALESCE(IsDeleted, false) = false
                LIMIT 1";

            using var feedbackCheckCmd = new NpgsqlCommand(feedbackSql, connection);
            feedbackCheckCmd.Parameters.AddWithValue("ResultId", analysisId);
            feedbackCheckCmd.Parameters.AddWithValue("DoctorId", doctorId);

            var existingFeedbackId = await feedbackCheckCmd.ExecuteScalarAsync() as string;

            if (string.IsNullOrEmpty(existingFeedbackId))
            {
                // Create new feedback
                var feedbackId = Guid.NewGuid().ToString();
                var insertFeedbackSql = @"
                    INSERT INTO ai_feedback
                    (Id, ResultId, DoctorId, FeedbackType, OriginalRiskLevel, CorrectedRiskLevel, 
                     FeedbackNotes, IsUsedForTraining, CreatedDate, CreatedBy, IsDeleted)
                    VALUES
                    (@Id, @ResultId, @DoctorId, @FeedbackType, @OriginalRiskLevel, @CorrectedRiskLevel,
                     @FeedbackNotes, @IsUsedForTraining, @CreatedDate, @CreatedBy, false)";

                using var insertFeedbackCmd = new NpgsqlCommand(insertFeedbackSql, connection);
                insertFeedbackCmd.Parameters.AddWithValue("Id", feedbackId);
                insertFeedbackCmd.Parameters.AddWithValue("ResultId", analysisId);
                insertFeedbackCmd.Parameters.AddWithValue("DoctorId", doctorId);
                insertFeedbackCmd.Parameters.AddWithValue("FeedbackType", dto.ValidationStatus == "Corrected" ? "Incorrect" : "Correct");
                insertFeedbackCmd.Parameters.AddWithValue("OriginalRiskLevel", DBNull.Value); // Can be populated from analysis_results
                insertFeedbackCmd.Parameters.AddWithValue("CorrectedRiskLevel", (object?)dto.CorrectedRiskLevel ?? DBNull.Value);
                insertFeedbackCmd.Parameters.AddWithValue("FeedbackNotes", (object?)dto.ValidationNotes ?? DBNull.Value);
                insertFeedbackCmd.Parameters.AddWithValue("IsUsedForTraining", dto.ValidationStatus == "Corrected");
                insertFeedbackCmd.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
                insertFeedbackCmd.Parameters.AddWithValue("CreatedBy", doctorId);

                await insertFeedbackCmd.ExecuteNonQueryAsync();
            }
            else
            {
                // Update existing feedback
                var updateFeedbackSql = @"
                    UPDATE ai_feedback
                    SET FeedbackType = @FeedbackType,
                        CorrectedRiskLevel = COALESCE(@CorrectedRiskLevel, CorrectedRiskLevel),
                        FeedbackNotes = COALESCE(@FeedbackNotes, FeedbackNotes),
                        IsUsedForTraining = @IsUsedForTraining,
                        UpdatedDate = CURRENT_DATE
                    WHERE Id = @FeedbackId";

                using var updateFeedbackCmd = new NpgsqlCommand(updateFeedbackSql, connection);
                updateFeedbackCmd.Parameters.AddWithValue("FeedbackId", existingFeedbackId);
                updateFeedbackCmd.Parameters.AddWithValue("FeedbackType", dto.ValidationStatus == "Corrected" ? "Incorrect" : "Correct");
                updateFeedbackCmd.Parameters.AddWithValue("CorrectedRiskLevel", (object?)dto.CorrectedRiskLevel ?? DBNull.Value);
                updateFeedbackCmd.Parameters.AddWithValue("FeedbackNotes", (object?)dto.ValidationNotes ?? DBNull.Value);
                updateFeedbackCmd.Parameters.AddWithValue("IsUsedForTraining", dto.ValidationStatus == "Corrected");

                await updateFeedbackCmd.ExecuteNonQueryAsync();
            }

            _logger.LogInformation("Findings validated by doctor {DoctorId} for analysis {AnalysisId}, Status: {Status}", 
                doctorId, analysisId, dto.ValidationStatus);

            return Ok(new { message = "Findings validated successfully", analysisId, status = dto.ValidationStatus });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating findings for analysis {AnalysisId}", analysisId);
            return StatusCode(500, new { message = "Không thể validate findings" });
        }
    }

    #endregion

    #region AI Feedback (FR-19)

    /// <summary>
    /// Submit AI feedback (FR-19)
    /// </summary>
    [HttpPost("ai-feedback")]
    [ProducesResponseType(typeof(AIFeedbackDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SubmitAIFeedback([FromBody] CreateAIFeedbackDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        if (string.IsNullOrWhiteSpace(dto.ResultId))
        {
            return BadRequest(new { message = "ResultId là bắt buộc" });
        }

        if (!new[] { "Correct", "Incorrect", "PartiallyCorrect", "NeedsReview" }.Contains(dto.FeedbackType))
        {
            return BadRequest(new { message = "FeedbackType không hợp lệ" });
        }

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Verify doctor has access to this analysis
            var verifySql = @"
                SELECT ar.Id, ar.OverallRiskLevel FROM analysis_results ar
                INNER JOIN patient_doctor_assignments pda ON pda.UserId = ar.UserId
                WHERE ar.Id = @ResultId 
                    AND pda.DoctorId = @DoctorId
                    AND COALESCE(pda.IsDeleted, false) = false
                    AND pda.IsActive = true";

            using var verifyCmd = new NpgsqlCommand(verifySql, connection);
            verifyCmd.Parameters.AddWithValue("ResultId", dto.ResultId);
            verifyCmd.Parameters.AddWithValue("DoctorId", doctorId);

            using var verifyReader = await verifyCmd.ExecuteReaderAsync();
            if (!await verifyReader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy kết quả phân tích hoặc không có quyền truy cập" });
            }

            var originalRiskLevel = verifyReader.IsDBNull(1) ? null : verifyReader.GetString(1);
            verifyReader.Close();

            // Check if feedback already exists
            var checkSql = @"
                SELECT Id FROM ai_feedback 
                WHERE ResultId = @ResultId AND DoctorId = @DoctorId AND COALESCE(IsDeleted, false) = false
                LIMIT 1";

            using var checkCmd = new NpgsqlCommand(checkSql, connection);
            checkCmd.Parameters.AddWithValue("ResultId", dto.ResultId);
            checkCmd.Parameters.AddWithValue("DoctorId", doctorId);

            var existingFeedbackId = await checkCmd.ExecuteScalarAsync() as string;

            string feedbackId;
            if (string.IsNullOrEmpty(existingFeedbackId))
            {
                // Create new feedback
                feedbackId = Guid.NewGuid().ToString();
                var insertSql = @"
                    INSERT INTO ai_feedback
                    (Id, ResultId, DoctorId, FeedbackType, OriginalRiskLevel, CorrectedRiskLevel, 
                     FeedbackNotes, IsUsedForTraining, CreatedDate, CreatedBy, IsDeleted)
                    VALUES
                    (@Id, @ResultId, @DoctorId, @FeedbackType, @OriginalRiskLevel, @CorrectedRiskLevel,
                     @FeedbackNotes, @IsUsedForTraining, @CreatedDate, @CreatedBy, false)
                    RETURNING Id";

                using var insertCmd = new NpgsqlCommand(insertSql, connection);
                insertCmd.Parameters.AddWithValue("Id", feedbackId);
                insertCmd.Parameters.AddWithValue("ResultId", dto.ResultId);
                insertCmd.Parameters.AddWithValue("DoctorId", doctorId);
                insertCmd.Parameters.AddWithValue("FeedbackType", dto.FeedbackType);
                insertCmd.Parameters.AddWithValue("OriginalRiskLevel", (object?)dto.OriginalRiskLevel ?? (object?)originalRiskLevel ?? DBNull.Value);
                insertCmd.Parameters.AddWithValue("CorrectedRiskLevel", (object?)dto.CorrectedRiskLevel ?? DBNull.Value);
                insertCmd.Parameters.AddWithValue("FeedbackNotes", (object?)dto.FeedbackNotes ?? DBNull.Value);
                insertCmd.Parameters.AddWithValue("IsUsedForTraining", dto.UseForTraining);
                insertCmd.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
                insertCmd.Parameters.AddWithValue("CreatedBy", doctorId);

                feedbackId = (await insertCmd.ExecuteScalarAsync() as string) ?? feedbackId;
            }
            else
            {
                // Update existing feedback
                feedbackId = existingFeedbackId;
                var updateSql = @"
                    UPDATE ai_feedback
                    SET FeedbackType = @FeedbackType,
                        OriginalRiskLevel = COALESCE(@OriginalRiskLevel, OriginalRiskLevel),
                        CorrectedRiskLevel = COALESCE(@CorrectedRiskLevel, CorrectedRiskLevel),
                        FeedbackNotes = COALESCE(@FeedbackNotes, FeedbackNotes),
                        IsUsedForTraining = @IsUsedForTraining,
                        UpdatedDate = CURRENT_DATE
                    WHERE Id = @FeedbackId";

                using var updateCmd = new NpgsqlCommand(updateSql, connection);
                updateCmd.Parameters.AddWithValue("FeedbackId", feedbackId);
                updateCmd.Parameters.AddWithValue("FeedbackType", dto.FeedbackType);
                updateCmd.Parameters.AddWithValue("OriginalRiskLevel", (object?)dto.OriginalRiskLevel ?? (object?)originalRiskLevel ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("CorrectedRiskLevel", (object?)dto.CorrectedRiskLevel ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("FeedbackNotes", (object?)dto.FeedbackNotes ?? DBNull.Value);
                updateCmd.Parameters.AddWithValue("IsUsedForTraining", dto.UseForTraining);

                await updateCmd.ExecuteNonQueryAsync();
            }

            // Get created/updated feedback
            var getFeedbackSql = @"
                SELECT Id, ResultId, DoctorId, FeedbackType, OriginalRiskLevel, CorrectedRiskLevel,
                       FeedbackNotes, IsUsedForTraining, CreatedDate
                FROM ai_feedback
                WHERE Id = @FeedbackId";

            using var getFeedbackCmd = new NpgsqlCommand(getFeedbackSql, connection);
            getFeedbackCmd.Parameters.AddWithValue("FeedbackId", feedbackId);

            using var feedbackReader = await getFeedbackCmd.ExecuteReaderAsync();
            if (!await feedbackReader.ReadAsync())
            {
                return StatusCode(500, new { message = "Không thể lấy thông tin feedback" });
            }

            var feedback = new AIFeedbackDto
            {
                Id = feedbackReader.GetString(0),
                ResultId = feedbackReader.GetString(1),
                DoctorId = feedbackReader.GetString(2),
                FeedbackType = feedbackReader.GetString(3),
                OriginalRiskLevel = feedbackReader.IsDBNull(4) ? null : feedbackReader.GetString(4),
                CorrectedRiskLevel = feedbackReader.IsDBNull(5) ? null : feedbackReader.GetString(5),
                FeedbackNotes = feedbackReader.IsDBNull(6) ? null : feedbackReader.GetString(6),
                IsUsedForTraining = feedbackReader.GetBoolean(7),
                CreatedDate = feedbackReader.GetDateTime(8)
            };

            _logger.LogInformation("AI feedback submitted by doctor {DoctorId} for analysis {ResultId}, Type: {FeedbackType}", 
                doctorId, dto.ResultId, dto.FeedbackType);

            return CreatedAtAction(nameof(SubmitAIFeedback), new { id = feedbackId }, feedback);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting AI feedback for result {ResultId}", dto.ResultId);
            return StatusCode(500, new { message = "Không thể submit AI feedback" });
        }
    }

    #endregion

    #region Private Methods

    private string? GetCurrentDoctorId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    #endregion
}
