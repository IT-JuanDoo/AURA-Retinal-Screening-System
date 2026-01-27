using Aura.Application.DTOs.Doctors;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Aura.Application.Services.Doctors;

/// <summary>
/// Service implementation for patient search and filtering
/// </summary>
public class PatientSearchService : IPatientSearchService
{
    private readonly string _connectionString;
    private readonly ILogger<PatientSearchService>? _logger;

    public PatientSearchService(
        IConfiguration configuration,
        ILogger<PatientSearchService>? logger = null)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string not configured");
        _logger = logger;
    }

    public async Task<PatientSearchResponseDto> SearchPatientsAsync(
        string doctorId,
        PatientSearchDto searchDto)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Build WHERE clause
            // NOTE: We intentionally do NOT filter by DoctorId here so that
            // doctors có thể tìm tất cả bệnh nhân trong hệ thống.
            // Quan hệ assign doctor-patient (patient_doctor_assignments)
            // vẫn được LEFT JOIN để lấy thông tin AssignedAt/Clinic, nhưng
            // không giới hạn kết quả chỉ những bệnh nhân đã được assign.
            var whereConditions = new List<string>
            {
                "COALESCE(u.IsDeleted, false) = false"
            };

            var parameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("DoctorId", doctorId)
            };

            // Search query filter (ID, name, email, phone)
            if (!string.IsNullOrWhiteSpace(searchDto.SearchQuery))
            {
                whereConditions.Add(@"
                    (
                        LOWER(u.Id) LIKE @SearchQuery OR
                        LOWER(u.FirstName) LIKE @SearchQuery OR
                        LOWER(u.LastName) LIKE @SearchQuery OR
                        LOWER(u.Email) LIKE @SearchQuery OR
                        LOWER(u.Phone) LIKE @SearchQuery OR
                        LOWER(CONCAT(u.FirstName, ' ', u.LastName)) LIKE @SearchQuery
                    )");
                parameters.Add(new NpgsqlParameter("SearchQuery", $"%{searchDto.SearchQuery.ToLower()}%"));
            }

            // Risk level filter (dùng latest_risk CTE)
            if (!string.IsNullOrWhiteSpace(searchDto.RiskLevel))
            {
                whereConditions.Add("latest_risk.OverallRiskLevel = @RiskLevel");
                parameters.Add(new NpgsqlParameter("RiskLevel", searchDto.RiskLevel));
            }

            // Clinic filter (lọc theo clinic trong assignment nếu có)
            if (!string.IsNullOrWhiteSpace(searchDto.ClinicId))
            {
                whereConditions.Add("pda.ClinicId = @ClinicId");
                parameters.Add(new NpgsqlParameter("ClinicId", searchDto.ClinicId));
            }

            var whereClause = string.Join(" AND ", whereConditions);

            // Validate sort fields
            var validSortFields = new[] { "AssignedAt", "FirstName", "LastName", "Email", "LatestAnalysisDate", "LatestRiskLevel" };
            var sortBy = validSortFields.Contains(searchDto.SortBy, StringComparer.OrdinalIgnoreCase) 
                ? searchDto.SortBy 
                : "AssignedAt";
            var sortDirection = searchDto.SortDirection?.ToLower() == "asc" ? "ASC" : "DESC";

            // Build SQL query with latest risk level subquery
            var sql = $@"
                WITH latest_risk AS (
                    SELECT DISTINCT ON (ar.UserId)
                        ar.UserId,
                        ar.OverallRiskLevel,
                        ar.RiskScore,
                        ar.AnalysisCompletedAt
                    FROM analysis_results ar
                    WHERE ar.AnalysisStatus = 'Completed'
                    ORDER BY ar.UserId, ar.AnalysisCompletedAt DESC NULLS LAST
                )
                SELECT 
                    u.Id, 
                    u.FirstName, 
                    u.LastName, 
                    u.Email, 
                    u.Phone, 
                    u.Dob, 
                    u.Gender, 
                    u.ProfileImageUrl,
                    pda.AssignedAt, 
                    pda.ClinicId, 
                    c.ClinicName,
                    COUNT(DISTINCT ar.Id) as AnalysisCount,
                    COUNT(DISTINCT mn.Id) as MedicalNotesCount,
                    latest_risk.OverallRiskLevel as LatestRiskLevel,
                    latest_risk.RiskScore as LatestRiskScore,
                    latest_risk.AnalysisCompletedAt as LatestAnalysisDate
                FROM users u
                LEFT JOIN patient_doctor_assignments pda 
                    ON pda.UserId = u.Id 
                    AND pda.DoctorId = @DoctorId 
                    AND COALESCE(pda.IsDeleted, false) = false
                LEFT JOIN clinics c ON c.Id = pda.ClinicId
                LEFT JOIN analysis_results ar ON ar.UserId = u.Id
                LEFT JOIN medical_notes mn ON mn.DoctorId = @DoctorId AND mn.ResultId = ar.Id
                LEFT JOIN latest_risk ON latest_risk.UserId = u.Id
                WHERE {whereClause}
                GROUP BY 
                    u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.Dob, u.Gender, 
                    u.ProfileImageUrl, pda.AssignedAt, pda.ClinicId, c.ClinicName,
                    latest_risk.OverallRiskLevel, latest_risk.RiskScore, latest_risk.AnalysisCompletedAt";

            // Add sorting
            sql += $" ORDER BY {sortBy} {sortDirection}";

            // Get total count - rebuild where clause without latest_risk reference for count
            var countWhereConditions = new List<string>
            {
                "COALESCE(u.IsDeleted, false) = false"
            };

            var countParameters = new List<NpgsqlParameter>
            {
                new NpgsqlParameter("DoctorId", doctorId)
            };

            // Search query filter (ID, name, email, phone)
            if (!string.IsNullOrWhiteSpace(searchDto.SearchQuery))
            {
                countWhereConditions.Add(@"
                    (
                        LOWER(u.Id) LIKE @SearchQuery OR
                        LOWER(u.FirstName) LIKE @SearchQuery OR
                        LOWER(u.LastName) LIKE @SearchQuery OR
                        LOWER(u.Email) LIKE @SearchQuery OR
                        LOWER(u.Phone) LIKE @SearchQuery OR
                        LOWER(CONCAT(u.FirstName, ' ', u.LastName)) LIKE @SearchQuery
                    )");
                countParameters.Add(new NpgsqlParameter("SearchQuery", $"%{searchDto.SearchQuery.ToLower()}%"));
            }

            // Risk level filter - need to join with latest_risk CTE
            if (!string.IsNullOrWhiteSpace(searchDto.RiskLevel))
            {
                countWhereConditions.Add("latest_risk.OverallRiskLevel = @RiskLevel");
                countParameters.Add(new NpgsqlParameter("RiskLevel", searchDto.RiskLevel));
            }

            // Clinic filter
            if (!string.IsNullOrWhiteSpace(searchDto.ClinicId))
            {
                countWhereConditions.Add("pda.ClinicId = @ClinicId");
                countParameters.Add(new NpgsqlParameter("ClinicId", searchDto.ClinicId));
            }

            var countWhereClause = string.Join(" AND ", countWhereConditions);

            var countSql = $@"
                WITH latest_risk AS (
                    SELECT DISTINCT ON (ar.UserId)
                        ar.UserId,
                        ar.OverallRiskLevel
                    FROM analysis_results ar
                    WHERE ar.AnalysisStatus = 'Completed'
                    ORDER BY ar.UserId, ar.AnalysisCompletedAt DESC NULLS LAST
                )
                SELECT COUNT(DISTINCT u.Id)
                FROM users u
                LEFT JOIN patient_doctor_assignments pda 
                    ON pda.UserId = u.Id 
                    AND pda.DoctorId = @DoctorId 
                    AND COALESCE(pda.IsDeleted, false) = false
                LEFT JOIN latest_risk ON latest_risk.UserId = u.Id
                WHERE {countWhereClause}";

            using var countCommand = new NpgsqlCommand(countSql, connection);
            foreach (var param in countParameters)
            {
                countCommand.Parameters.Add(param);
            }

            var totalCount = Convert.ToInt32(await countCommand.ExecuteScalarAsync() ?? 0);

            // Add pagination
            var offset = (searchDto.Page - 1) * searchDto.PageSize;
            sql += $" LIMIT @PageSize OFFSET @Offset";
            parameters.Add(new NpgsqlParameter("PageSize", searchDto.PageSize));
            parameters.Add(new NpgsqlParameter("Offset", offset));

            // Execute main query
            using var command = new NpgsqlCommand(sql, connection);
            foreach (var param in parameters)
            {
                command.Parameters.Add(param);
            }

            var patients = new List<PatientSearchResultDto>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                patients.Add(new PatientSearchResultDto
                {
                    UserId = reader.GetString(0),
                    FirstName = reader.IsDBNull(1) ? null : reader.GetString(1),
                    LastName = reader.IsDBNull(2) ? null : reader.GetString(2),
                    Email = reader.GetString(3),
                    Phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Dob = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    Gender = reader.IsDBNull(6) ? null : reader.GetString(6),
                    ProfileImageUrl = reader.IsDBNull(7) ? null : reader.GetString(7),
                    AssignedAt = reader.IsDBNull(8) ? null : reader.GetDateTime(8),
                    ClinicId = reader.IsDBNull(9) ? null : reader.GetString(9),
                    ClinicName = reader.IsDBNull(10) ? null : reader.GetString(10),
                    AnalysisCount = reader.GetInt32(11),
                    MedicalNotesCount = reader.GetInt32(12),
                    LatestRiskLevel = reader.IsDBNull(13) ? null : reader.GetString(13),
                    LatestRiskScore = reader.IsDBNull(14) ? null : reader.GetDecimal(14),
                    LatestAnalysisDate = reader.IsDBNull(15) ? null : reader.GetDateTime(15)
                });
            }

            var totalPages = (int)Math.Ceiling(totalCount / (double)searchDto.PageSize);

            return new PatientSearchResponseDto
            {
                Patients = patients,
                TotalCount = totalCount,
                Page = searchDto.Page,
                PageSize = searchDto.PageSize,
                TotalPages = totalPages
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error searching patients for doctor {DoctorId}", doctorId);
            throw;
        }
    }
}
