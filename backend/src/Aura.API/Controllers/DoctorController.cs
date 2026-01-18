using Aura.Application.DTOs.Analysis;
using Aura.Application.DTOs.Doctors;
using Aura.Application.Services.Analysis;
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
    private readonly IConfiguration _configuration;
    private readonly ILogger<DoctorController> _logger;
    private readonly string _connectionString;

    public DoctorController(
        IAnalysisService analysisService,
        IConfiguration configuration,
        ILogger<DoctorController> logger)
    {
        _analysisService = analysisService ?? throw new ArgumentNullException(nameof(analysisService));
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

    #region Private Methods

    private string? GetCurrentDoctorId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    #endregion
}
