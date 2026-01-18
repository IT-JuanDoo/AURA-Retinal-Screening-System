using Aura.Application.DTOs.MedicalNotes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller quản lý Medical Notes (FR-21)
/// </summary>
[ApiController]
[Route("api/medical-notes")]
[Authorize]
[Produces("application/json")]
public class MedicalNotesController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<MedicalNotesController> _logger;
    private readonly string _connectionString;

    public MedicalNotesController(
        IConfiguration configuration,
        ILogger<MedicalNotesController> logger)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string not configured");
    }

    /// <summary>
    /// Tạo medical note mới
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(MedicalNoteDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateMedicalNote([FromBody] CreateMedicalNoteDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        if (string.IsNullOrWhiteSpace(dto.ResultId) || string.IsNullOrWhiteSpace(dto.NoteContent))
        {
            return BadRequest(new { message = "ResultId và NoteContent là bắt buộc" });
        }

        if (dto.NoteContent.Length > 5000)
        {
            return BadRequest(new { message = "NoteContent không được vượt quá 5000 ký tự" });
        }

        if (!IsValidNoteType(dto.NoteType))
        {
            return BadRequest(new { message = "NoteType không hợp lệ. Chọn: Diagnosis, Recommendation, FollowUp, General, Prescription" });
        }

        try
        {
            // Verify analysis result exists and doctor has access
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var verifySql = @"
                SELECT ar.UserId FROM analysis_results ar
                INNER JOIN patient_doctor_assignments pda ON pda.UserId = ar.UserId
                WHERE ar.Id = @ResultId 
                    AND pda.DoctorId = @DoctorId
                    AND COALESCE(pda.IsDeleted, false) = false
                    AND pda.IsActive = true";

            using var verifyCmd = new NpgsqlCommand(verifySql, connection);
            verifyCmd.Parameters.AddWithValue("ResultId", dto.ResultId);
            verifyCmd.Parameters.AddWithValue("DoctorId", doctorId);

            var userId = await verifyCmd.ExecuteScalarAsync() as string;
            if (userId == null)
            {
                return NotFound(new { message = "Không tìm thấy kết quả phân tích hoặc không có quyền truy cập" });
            }

            // Create medical note
            var noteId = Guid.NewGuid().ToString();
            var now = DateTime.UtcNow;

            var insertSql = @"
                INSERT INTO medical_notes 
                (Id, ResultId, DoctorId, NoteType, NoteContent, Diagnosis, Prescription, 
                 FollowUpDate, IsImportant, CreatedDate, CreatedBy, IsDeleted)
                VALUES 
                (@Id, @ResultId, @DoctorId, @NoteType, @NoteContent, @Diagnosis, @Prescription,
                 @FollowUpDate, @IsImportant, @CreatedDate, @CreatedBy, false)
                RETURNING Id, ResultId, DoctorId, NoteType, NoteContent, Diagnosis, Prescription,
                          FollowUpDate, IsImportant, CreatedDate, CreatedBy, UpdatedDate, UpdatedBy";

            using var insertCmd = new NpgsqlCommand(insertSql, connection);
            insertCmd.Parameters.AddWithValue("Id", noteId);
            insertCmd.Parameters.AddWithValue("ResultId", dto.ResultId);
            insertCmd.Parameters.AddWithValue("DoctorId", doctorId);
            insertCmd.Parameters.AddWithValue("NoteType", dto.NoteType);
            insertCmd.Parameters.AddWithValue("NoteContent", dto.NoteContent);
            insertCmd.Parameters.AddWithValue("Diagnosis", (object?)dto.Diagnosis ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("Prescription", (object?)dto.Prescription ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("FollowUpDate", (object?)dto.FollowUpDate ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("IsImportant", dto.IsImportant);
            insertCmd.Parameters.AddWithValue("CreatedDate", now.Date);
            insertCmd.Parameters.AddWithValue("CreatedBy", doctorId);

            using var reader = await insertCmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return StatusCode(500, new { message = "Không thể tạo medical note" });
            }

            var note = MapToDto(reader, doctorId);
            _logger.LogInformation("Medical note created: {NoteId} by doctor {DoctorId}", noteId, doctorId);

            return CreatedAtAction(nameof(GetMedicalNote), new { id = noteId }, note);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating medical note for doctor {DoctorId}", doctorId);
            return StatusCode(500, new { message = "Không thể tạo medical note" });
        }
    }

    /// <summary>
    /// Lấy danh sách medical notes
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<MedicalNoteDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMedicalNotes(
        [FromQuery] string? resultId = null,
        [FromQuery] string? patientId = null,
        [FromQuery] string? noteType = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        // Validate pagination parameters
        if (limit < 1 || limit > 100)
        {
            return BadRequest(new { message = "Limit phải từ 1 đến 100" });
        }
        if (offset < 0)
        {
            return BadRequest(new { message = "Offset phải >= 0" });
        }

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT mn.Id, mn.ResultId, mn.DoctorId, 
                       COALESCE(d.FirstName || ' ' || d.LastName, d.Email) as DoctorName,
                       mn.NoteType, mn.NoteContent, mn.Diagnosis, mn.Prescription,
                       mn.FollowUpDate, mn.IsImportant, mn.CreatedDate, mn.CreatedBy,
                       mn.UpdatedDate, mn.UpdatedBy
                FROM medical_notes mn
                INNER JOIN doctors d ON d.Id = mn.DoctorId
                INNER JOIN analysis_results ar ON ar.Id = mn.ResultId
                INNER JOIN patient_doctor_assignments pda ON pda.UserId = ar.UserId
                WHERE mn.DoctorId = @DoctorId
                    AND COALESCE(mn.IsDeleted, false) = false
                    AND COALESCE(pda.IsDeleted, false) = false
                    AND pda.IsActive = true
                    AND (@ResultId IS NULL OR mn.ResultId = @ResultId)
                    AND (@PatientId IS NULL OR ar.UserId = @PatientId)
                    AND (@NoteType IS NULL OR mn.NoteType = @NoteType)
                ORDER BY mn.CreatedDate DESC, mn.IsImportant DESC
                LIMIT @Limit OFFSET @Offset";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("DoctorId", doctorId);
            command.Parameters.AddWithValue("ResultId", (object?)resultId ?? DBNull.Value);
            command.Parameters.AddWithValue("PatientId", (object?)patientId ?? DBNull.Value);
            command.Parameters.AddWithValue("NoteType", (object?)noteType ?? DBNull.Value);
            command.Parameters.AddWithValue("Limit", limit);
            command.Parameters.AddWithValue("Offset", offset);

            var notes = new List<MedicalNoteDto>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                notes.Add(MapToDto(reader, doctorId));
            }

            return Ok(notes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting medical notes for doctor {DoctorId}", doctorId);
            return StatusCode(500, new { message = "Không thể lấy danh sách medical notes" });
        }
    }

    /// <summary>
    /// Lấy chi tiết medical note
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(MedicalNoteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMedicalNote(string id)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT mn.Id, mn.ResultId, mn.DoctorId, 
                       COALESCE(d.FirstName || ' ' || d.LastName, d.Email) as DoctorName,
                       mn.NoteType, mn.NoteContent, mn.Diagnosis, mn.Prescription,
                       mn.FollowUpDate, mn.IsImportant, mn.CreatedDate, mn.CreatedBy,
                       mn.UpdatedDate, mn.UpdatedBy
                FROM medical_notes mn
                INNER JOIN doctors d ON d.Id = mn.DoctorId
                INNER JOIN analysis_results ar ON ar.Id = mn.ResultId
                INNER JOIN patient_doctor_assignments pda ON pda.UserId = ar.UserId
                WHERE mn.Id = @Id
                    AND mn.DoctorId = @DoctorId
                    AND COALESCE(mn.IsDeleted, false) = false
                    AND COALESCE(pda.IsDeleted, false) = false
                    AND pda.IsActive = true";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);
            command.Parameters.AddWithValue("DoctorId", doctorId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy medical note" });
            }

            var note = MapToDto(reader, doctorId);
            return Ok(note);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting medical note {NoteId} for doctor {DoctorId}", id, doctorId);
            return StatusCode(500, new { message = "Không thể lấy thông tin medical note" });
        }
    }

    /// <summary>
    /// Cập nhật medical note
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(MedicalNoteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateMedicalNote(string id, [FromBody] UpdateMedicalNoteDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        // Validate NoteContent length if provided
        if (!string.IsNullOrWhiteSpace(dto.NoteContent) && dto.NoteContent.Length > 5000)
        {
            return BadRequest(new { message = "NoteContent không được vượt quá 5000 ký tự" });
        }

        if (!string.IsNullOrWhiteSpace(dto.NoteType) && !IsValidNoteType(dto.NoteType))
        {
            return BadRequest(new { message = "NoteType không hợp lệ" });
        }

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE medical_notes
                SET NoteType = COALESCE(@NoteType, NoteType),
                    NoteContent = COALESCE(@NoteContent, NoteContent),
                    Diagnosis = COALESCE(@Diagnosis, Diagnosis),
                    Prescription = COALESCE(@Prescription, Prescription),
                    FollowUpDate = COALESCE(@FollowUpDate, FollowUpDate),
                    IsImportant = COALESCE(@IsImportant, IsImportant),
                    UpdatedDate = CURRENT_DATE,
                    UpdatedBy = @DoctorId
                WHERE Id = @Id
                    AND DoctorId = @DoctorId
                    AND COALESCE(IsDeleted, false) = false
                RETURNING Id, ResultId, DoctorId, NoteType, NoteContent, Diagnosis, Prescription,
                          FollowUpDate, IsImportant, CreatedDate, CreatedBy, UpdatedDate, UpdatedBy";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);
            command.Parameters.AddWithValue("DoctorId", doctorId);
            command.Parameters.AddWithValue("NoteType", (object?)dto.NoteType ?? DBNull.Value);
            command.Parameters.AddWithValue("NoteContent", (object?)dto.NoteContent ?? DBNull.Value);
            command.Parameters.AddWithValue("Diagnosis", (object?)dto.Diagnosis ?? DBNull.Value);
            command.Parameters.AddWithValue("Prescription", (object?)dto.Prescription ?? DBNull.Value);
            command.Parameters.AddWithValue("FollowUpDate", (object?)dto.FollowUpDate ?? DBNull.Value);
            command.Parameters.AddWithValue("IsImportant", (object?)dto.IsImportant ?? DBNull.Value);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy medical note hoặc không có quyền cập nhật" });
            }

            var note = MapToDto(reader, doctorId);
            _logger.LogInformation("Medical note updated: {NoteId} by doctor {DoctorId}", id, doctorId);

            return Ok(note);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating medical note {NoteId} for doctor {DoctorId}", id, doctorId);
            return StatusCode(500, new { message = "Không thể cập nhật medical note" });
        }
    }

    /// <summary>
    /// Xóa medical note (soft delete)
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteMedicalNote(string id)
    {
        var doctorId = GetCurrentDoctorId();
        if (doctorId == null) return Unauthorized(new { message = "Chưa xác thực bác sĩ" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                UPDATE medical_notes
                SET IsDeleted = true,
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
                return NotFound(new { message = "Không tìm thấy medical note hoặc không có quyền xóa" });
            }

            _logger.LogInformation("Medical note deleted: {NoteId} by doctor {DoctorId}", id, doctorId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting medical note {NoteId} for doctor {DoctorId}", id, doctorId);
            return StatusCode(500, new { message = "Không thể xóa medical note" });
        }
    }

    #region Private Methods

    private string? GetCurrentDoctorId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    private static bool IsValidNoteType(string? noteType)
    {
        return noteType != null && new[] { "Diagnosis", "Recommendation", "FollowUp", "General", "Prescription" }.Contains(noteType);
    }

    private static MedicalNoteDto MapToDto(NpgsqlDataReader reader, string? doctorId = null)
    {
        return new MedicalNoteDto
        {
            Id = reader.GetString(0),
            ResultId = reader.GetString(1),
            DoctorId = reader.GetString(2),
            DoctorName = reader.IsDBNull(3) ? null : reader.GetString(3),
            NoteType = reader.GetString(4),
            NoteContent = reader.GetString(5),
            Diagnosis = reader.IsDBNull(6) ? null : reader.GetString(6),
            Prescription = reader.IsDBNull(7) ? null : reader.GetString(7),
            FollowUpDate = reader.IsDBNull(8) ? null : reader.GetDateTime(8),
            IsImportant = reader.GetBoolean(9),
            CreatedDate = reader.GetDateTime(10),
            CreatedBy = reader.IsDBNull(11) ? null : reader.GetString(11),
            UpdatedDate = reader.IsDBNull(12) ? null : reader.GetDateTime(12),
            UpdatedBy = reader.IsDBNull(13) ? null : reader.GetString(13)
        };
    }

    #endregion
}
