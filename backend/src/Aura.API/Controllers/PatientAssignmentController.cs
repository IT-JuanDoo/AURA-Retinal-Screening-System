using Aura.Application.DTOs.PatientAssignments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller quản lý Patient-Doctor Assignments (FR-14)
/// </summary>
[ApiController]
[Route("api/patient-assignments")]
[Authorize]
[Produces("application/json")]
public class PatientAssignmentController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<PatientAssignmentController> _logger;
    private readonly string _connectionString;

    public PatientAssignmentController(
        IConfiguration configuration,
        ILogger<PatientAssignmentController> logger)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string not configured");
    }

    /// <summary>
    /// Assign patient to current doctor
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PatientAssignmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateAssignment([FromBody] CreateAssignmentDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        if (string.IsNullOrWhiteSpace(dto.UserId))
        {
            return BadRequest(new { message = "UserId là bắt buộc" });
        }

        try
        {
            _logger.LogInformation("Creating assignment: doctorId={DoctorId}, userId={UserId}, clinicId={ClinicId}", 
                doctorId, dto.UserId, dto.ClinicId ?? "null");

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Check if assignment already exists
            var checkSql = @"
                SELECT Id FROM patient_doctor_assignments
                WHERE UserId = @UserId AND DoctorId = @DoctorId AND COALESCE(IsDeleted, false) = false";

            using var checkCmd = new NpgsqlCommand(checkSql, connection);
            checkCmd.Parameters.AddWithValue("UserId", dto.UserId);
            checkCmd.Parameters.AddWithValue("DoctorId", doctorId);

            var existingId = await checkCmd.ExecuteScalarAsync();
            if (existingId != null)
            {
                _logger.LogWarning("Assignment already exists: doctorId={DoctorId}, userId={UserId}", doctorId, dto.UserId);
                return Conflict(new { message = "Bệnh nhân đã được assign cho bác sĩ này" });
            }

            // Verify user exists and is not a doctor
            var userSql = @"
                SELECT u.Id, 
                       CASE WHEN d.Id IS NOT NULL THEN 1 ELSE 0 END as IsDoctor
                FROM users u
                LEFT JOIN doctors d ON d.Id = u.Id
                WHERE u.Id = @UserId AND COALESCE(u.IsDeleted, false) = false";
            using var userCmd = new NpgsqlCommand(userSql, connection);
            userCmd.Parameters.AddWithValue("UserId", dto.UserId);
            using var userReader = await userCmd.ExecuteReaderAsync();
            if (!await userReader.ReadAsync())
            {
                _logger.LogWarning("User not found: {UserId}", dto.UserId);
                return NotFound(new { message = "Không tìm thấy bệnh nhân" });
            }
            
            // Read as integer (PostgreSQL CASE returns integer 0 or 1), then convert to boolean
            var isDoctorInt = userReader.GetInt32(1);
            var isDoctor = isDoctorInt == 1;
            await userReader.CloseAsync();
            
            if (isDoctor)
            {
                _logger.LogWarning("Cannot assign doctor to doctor: userId={UserId} is a doctor", dto.UserId);
                return BadRequest(new { message = "Không thể gán bác sĩ cho bác sĩ" });
            }

            // Create assignment
            var assignmentId = Guid.NewGuid().ToString();
            var now = DateTime.UtcNow;

            // Use ExecuteNonQuery first to insert, then select separately
            // This avoids issues with RETURNING clause
            // Note: AssignedBy references admins(Id), so we set it to NULL when doctor assigns themselves
            var insertSql = @"
                INSERT INTO patient_doctor_assignments
                (Id, UserId, DoctorId, ClinicId, AssignedAt, AssignedBy, IsActive, Notes, CreatedDate, CreatedBy, IsDeleted)
                VALUES
                (@Id, @UserId, @DoctorId, @ClinicId, @AssignedAt, @AssignedBy, true, @Notes, @CreatedDate, @CreatedBy, false)";

            using var insertCmd = new NpgsqlCommand(insertSql, connection);
            insertCmd.Parameters.AddWithValue("Id", assignmentId);
            insertCmd.Parameters.AddWithValue("UserId", dto.UserId);
            insertCmd.Parameters.AddWithValue("DoctorId", doctorId);
            insertCmd.Parameters.AddWithValue("ClinicId", (object?)dto.ClinicId ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("AssignedAt", now);
            // AssignedBy references admins(Id) - set to NULL when doctor assigns themselves
            // Only set AssignedBy when an admin performs the assignment
            insertCmd.Parameters.AddWithValue("AssignedBy", DBNull.Value);
            insertCmd.Parameters.AddWithValue("Notes", (object?)dto.Notes ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("CreatedDate", now.Date);
            insertCmd.Parameters.AddWithValue("CreatedBy", doctorId);

            var rowsAffected = await insertCmd.ExecuteNonQueryAsync();
            if (rowsAffected == 0)
            {
                _logger.LogWarning("Failed to insert assignment: {AssignmentId} for patient {UserId} by doctor {DoctorId}", 
                    assignmentId, dto.UserId, doctorId);
                return StatusCode(500, new { message = "Không thể tạo assignment - không có dòng nào được chèn" });
            }

            // Get assignment details with JOINs after successful insert
            var selectSql = @"
                SELECT pda.Id, pda.UserId, pda.DoctorId, pda.ClinicId, pda.AssignedAt, 
                       pda.AssignedBy, pda.IsActive, pda.Notes,
                       COALESCE(u.FirstName || ' ' || u.LastName, u.Email) as PatientName,
                       u.Email as PatientEmail,
                       COALESCE(d.FirstName || ' ' || d.LastName, d.Email) as DoctorName,
                       c.ClinicName
                FROM patient_doctor_assignments pda
                LEFT JOIN users u ON u.Id = pda.UserId
                LEFT JOIN doctors d ON d.Id = pda.DoctorId
                LEFT JOIN clinics c ON c.Id = pda.ClinicId
                WHERE pda.Id = @Id";

            using var selectCmd = new NpgsqlCommand(selectSql, connection);
            selectCmd.Parameters.AddWithValue("Id", assignmentId);
            using var selectReader = await selectCmd.ExecuteReaderAsync();
            if (!await selectReader.ReadAsync())
            {
                _logger.LogWarning("Assignment inserted but not found when selecting: {AssignmentId}", assignmentId);
                return StatusCode(500, new { message = "Không thể lấy thông tin assignment vừa tạo" });
            }

            var assignment = MapToDtoFromReader(selectReader);
            _logger.LogInformation("Patient assignment created: {AssignmentId} for patient {UserId} by doctor {DoctorId}", 
                assignmentId, dto.UserId, doctorId);

            return CreatedAtAction(nameof(GetAssignment), new { id = assignmentId }, assignment);
        }
        catch (Npgsql.PostgresException pgEx)
        {
            // Handle PostgreSQL-specific errors
            _logger.LogError(pgEx, "PostgreSQL error creating patient assignment: {ErrorCode}, {Message}, {Detail}, {Constraint}", 
                pgEx.SqlState, pgEx.Message, pgEx.Detail, pgEx.ConstraintName);
            
            // Provide more specific error messages based on error code
            if (pgEx.SqlState == "23503") // Foreign key violation
            {
                _logger.LogError("Foreign key constraint violation. AssignedBy must reference admins(Id) or be NULL");
                return BadRequest(new { message = "Lỗi ràng buộc dữ liệu. Vui lòng thử lại." });
            }
            else if (pgEx.SqlState == "23505") // Unique constraint violation
            {
                return Conflict(new { message = "Bệnh nhân đã được assign cho bác sĩ này" });
            }
            
            return StatusCode(500, new { message = $"Lỗi database: {pgEx.Message}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating patient assignment for doctor {DoctorId}, patient {UserId}, clinicId: {ClinicId}", 
                doctorId, dto.UserId, dto.ClinicId ?? "null");
            _logger.LogError("Exception details: {ExceptionType}, {Message}, {StackTrace}", 
                ex.GetType().Name, ex.Message, ex.StackTrace);
            return StatusCode(500, new { message = $"Không thể tạo assignment: {ex.Message}" });
        }
    }

    /// <summary>
    /// Lấy danh sách assignments
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PatientAssignmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAssignments(
        [FromQuery] string? patientId = null,
        [FromQuery] string? doctorId = null,
        [FromQuery] bool? isActive = null)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null) return Unauthorized(new { message = "Chưa xác thực" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Check if current user is doctor or patient
            var isDoctor = await IsDoctorAsync(connection, currentUserId);
            var isPatient = await IsPatientAsync(connection, currentUserId);

            if (!isDoctor && !isPatient)
            {
                return Forbid();
            }

            var sql = @"
                SELECT pda.Id, pda.UserId, pda.DoctorId, pda.ClinicId, pda.AssignedAt, 
                       pda.AssignedBy, pda.IsActive, pda.Notes,
                       COALESCE(u.FirstName || ' ' || u.LastName, u.Email) as PatientName,
                       u.Email as PatientEmail,
                       COALESCE(d.FirstName || ' ' || d.LastName, d.Email) as DoctorName,
                       c.ClinicName
                FROM patient_doctor_assignments pda
                LEFT JOIN users u ON u.Id = pda.UserId
                LEFT JOIN doctors d ON d.Id = pda.DoctorId
                LEFT JOIN clinics c ON c.Id = pda.ClinicId
                WHERE COALESCE(pda.IsDeleted, false) = false
                    AND (@PatientId IS NULL OR pda.UserId = @PatientId)
                    AND (@DoctorId IS NULL OR pda.DoctorId = @DoctorId)
                    AND (@IsActive IS NULL OR pda.IsActive = @IsActive)";

            // Add access control
            if (isDoctor)
            {
                sql += " AND pda.DoctorId = @CurrentUserId";
            }
            else if (isPatient)
            {
                sql += " AND pda.UserId = @CurrentUserId";
            }

            sql += " ORDER BY pda.AssignedAt DESC";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("PatientId", (object?)patientId ?? DBNull.Value);
            command.Parameters.AddWithValue("DoctorId", (object?)doctorId ?? DBNull.Value);
            command.Parameters.AddWithValue("IsActive", (object?)isActive ?? DBNull.Value);
            command.Parameters.AddWithValue("CurrentUserId", currentUserId);

            var assignments = new List<PatientAssignmentDto>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                assignments.Add(MapToDtoFromReader(reader));
            }

            return Ok(assignments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting patient assignments");
            return StatusCode(500, new { message = "Không thể lấy danh sách assignments" });
        }
    }

    /// <summary>
    /// Lấy chi tiết assignment
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(PatientAssignmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAssignment(string id)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null) return Unauthorized(new { message = "Chưa xác thực" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Check access control first
            var isDoctor = await IsDoctorAsync(connection, currentUserId);
            var isPatient = await IsPatientAsync(connection, currentUserId);

            if (!isDoctor && !isPatient)
            {
                return Forbid();
            }

            var sql = @"
                SELECT pda.Id, pda.UserId, pda.DoctorId, pda.ClinicId, pda.AssignedAt, 
                       pda.AssignedBy, pda.IsActive, pda.Notes,
                       COALESCE(u.FirstName || ' ' || u.LastName, u.Email) as PatientName,
                       u.Email as PatientEmail,
                       COALESCE(d.FirstName || ' ' || d.LastName, d.Email) as DoctorName,
                       c.ClinicName
                FROM patient_doctor_assignments pda
                LEFT JOIN users u ON u.Id = pda.UserId
                LEFT JOIN doctors d ON d.Id = pda.DoctorId
                LEFT JOIN clinics c ON c.Id = pda.ClinicId
                WHERE pda.Id = @Id AND COALESCE(pda.IsDeleted, false) = false";

            // Add access control
            if (isDoctor)
            {
                sql += " AND pda.DoctorId = @CurrentUserId";
            }
            else
            {
                sql += " AND pda.UserId = @CurrentUserId";
            }

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);
            command.Parameters.AddWithValue("CurrentUserId", currentUserId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy assignment" });
            }

            var assignment = MapToDtoFromReader(reader);
            return Ok(assignment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting assignment {AssignmentId}", id);
            return StatusCode(500, new { message = "Không thể lấy thông tin assignment" });
        }
    }

    /// <summary>
    /// Cập nhật assignment
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(PatientAssignmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateAssignment(string id, [FromBody] UpdateAssignmentDto dto)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE patient_doctor_assignments
                SET IsActive = COALESCE(@IsActive, IsActive),
                    Notes = COALESCE(@Notes, Notes),
                    UpdatedDate = CURRENT_DATE,
                    UpdatedBy = @DoctorId
                WHERE Id = @Id
                    AND DoctorId = @DoctorId
                    AND COALESCE(IsDeleted, false) = false
                RETURNING Id, UserId, DoctorId, ClinicId, AssignedAt, AssignedBy, IsActive, Notes";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);
            command.Parameters.AddWithValue("DoctorId", doctorId);
            command.Parameters.AddWithValue("IsActive", (object?)dto.IsActive ?? DBNull.Value);
            command.Parameters.AddWithValue("Notes", (object?)dto.Notes ?? DBNull.Value);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy assignment hoặc không có quyền cập nhật" });
            }

            // Get full assignment details with JOINs
            var selectSql = @"
                SELECT pda.Id, pda.UserId, pda.DoctorId, pda.ClinicId, pda.AssignedAt, 
                       pda.AssignedBy, pda.IsActive, pda.Notes,
                       COALESCE(u.FirstName || ' ' || u.LastName, u.Email) as PatientName,
                       u.Email as PatientEmail,
                       COALESCE(d.FirstName || ' ' || d.LastName, d.Email) as DoctorName,
                       c.ClinicName
                FROM patient_doctor_assignments pda
                LEFT JOIN users u ON u.Id = pda.UserId
                LEFT JOIN doctors d ON d.Id = pda.DoctorId
                LEFT JOIN clinics c ON c.Id = pda.ClinicId
                WHERE pda.Id = @Id";

            using var selectCmd = new NpgsqlCommand(selectSql, connection);
            selectCmd.Parameters.AddWithValue("Id", id);
            using var selectReader = await selectCmd.ExecuteReaderAsync();
            if (!await selectReader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy assignment" });
            }

            var assignment = MapToDtoFromReader(selectReader);
            _logger.LogInformation("Assignment updated: {AssignmentId} by doctor {DoctorId}", id, doctorId);

            return Ok(assignment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating assignment {AssignmentId} for doctor {DoctorId}", id, doctorId);
            return StatusCode(500, new { message = "Không thể cập nhật assignment" });
        }
    }

    /// <summary>
    /// Xóa assignment (soft delete / unassign)
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteAssignment(string id)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE patient_doctor_assignments
                SET IsDeleted = true,
                    IsActive = false,
                    UpdatedDate = CURRENT_DATE,
                    UpdatedBy = @DoctorId
                WHERE Id = @Id
                    AND DoctorId = @DoctorId
                    AND COALESCE(IsDeleted, false) = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);
            command.Parameters.AddWithValue("DoctorId", doctorId);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            if (rowsAffected == 0)
            {
                return NotFound(new { message = "Không tìm thấy assignment hoặc không có quyền xóa" });
            }

            _logger.LogInformation("Assignment deleted: {AssignmentId} by doctor {DoctorId}", id, doctorId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting assignment {AssignmentId} for doctor {DoctorId}", id, doctorId);
            return StatusCode(500, new { message = "Không thể xóa assignment" });
        }
    }

    #region Private Methods

    private string? GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    private string? GetCurrentDoctorId()
    {
        return GetCurrentUserId();
    }

    private async Task<bool> IsDoctorAsync(NpgsqlConnection connection, string userId)
    {
        var sql = "SELECT COUNT(*) FROM doctors WHERE Id = @UserId AND COALESCE(IsDeleted, false) = false";
        using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("UserId", userId);
        var count = await cmd.ExecuteScalarAsync();
        return Convert.ToInt64(count) > 0;
    }

    private async Task<bool> IsPatientAsync(NpgsqlConnection connection, string userId)
    {
        var sql = "SELECT COUNT(*) FROM users WHERE Id = @UserId AND COALESCE(IsDeleted, false) = false";
        using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("UserId", userId);
        var count = await cmd.ExecuteScalarAsync();
        return Convert.ToInt64(count) > 0;
    }

    private static PatientAssignmentDto MapToDtoFromReader(NpgsqlDataReader reader)
    {
        return new PatientAssignmentDto
        {
            Id = reader.GetString(0),
            UserId = reader.GetString(1),
            DoctorId = reader.GetString(2),
            ClinicId = reader.IsDBNull(3) ? null : reader.GetString(3),
            AssignedAt = reader.GetDateTime(4),
            AssignedBy = reader.IsDBNull(5) ? null : reader.GetString(5),
            IsActive = reader.GetBoolean(6),
            Notes = reader.IsDBNull(7) ? null : reader.GetString(7),
            PatientName = reader.IsDBNull(8) ? null : reader.GetString(8),
            PatientEmail = reader.IsDBNull(9) ? null : reader.GetString(9),
            DoctorName = reader.IsDBNull(10) ? null : reader.GetString(10),
            ClinicName = reader.IsDBNull(11) ? null : reader.GetString(11)
        };
    }

    #endregion
}
