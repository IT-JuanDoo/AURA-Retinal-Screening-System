using Npgsql;

namespace Aura.AdminService.Admin;

public class AIConfigurationRepository
{
    private readonly AdminDb _db;

    public AIConfigurationRepository(AdminDb db)
    {
        _db = db;
    }

    public async Task<List<AIConfigurationRowDto>> ListAsync(string? search, string? configurationType, bool? isActive)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
SELECT 
    id, 
    configurationname, 
    configurationtype, 
    modelversionid, 
    parameterkey, 
    parametervalue, 
    parameterdatatype, 
    description, 
    coalesce(isactive, true) as isactive,
    appliedat,
    appliedby,
    createddate,
    createdby
FROM ai_configurations
WHERE coalesce(isdeleted, false) = false
  AND (@isActive IS NULL OR coalesce(isactive, true) = @isActive)
  AND (@configurationType IS NULL OR configurationtype = @configurationType)
  AND (
    @search IS NULL
    OR lower(configurationname) LIKE '%' || lower(@search) || '%'
    OR lower(parameterkey) LIKE '%' || lower(@search) || '%'
    OR lower(coalesce(description, '')) LIKE '%' || lower(@search) || '%'
  )
ORDER BY createddate DESC NULLS LAST
LIMIT 500;", conn);

        var searchParam = new NpgsqlParameter("search", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)search ?? DBNull.Value };
        cmd.Parameters.Add(searchParam);

        var typeParam = new NpgsqlParameter("configurationType", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)configurationType ?? DBNull.Value };
        cmd.Parameters.Add(typeParam);

        var isActiveParam = new NpgsqlParameter("isActive", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)isActive ?? DBNull.Value };
        cmd.Parameters.Add(isActiveParam);

        var list = new List<AIConfigurationRowDto>();
        using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            list.Add(new AIConfigurationRowDto(
                r.GetString(0),
                r.GetString(1),
                r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3),
                r.GetString(4),
                r.GetString(5),
                r.IsDBNull(6) ? null : r.GetString(6),
                r.IsDBNull(7) ? null : r.GetString(7),
                r.GetBoolean(8),
                r.IsDBNull(9) ? null : r.GetDateTime(9),
                r.IsDBNull(10) ? null : r.GetString(10),
                r.IsDBNull(11) ? null : r.GetDateTime(11),
                r.IsDBNull(12) ? null : r.GetString(12)
            ));
        }
        return list;
    }

    public async Task<AIConfigurationRowDto?> GetByIdAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
SELECT 
    id, 
    configurationname, 
    configurationtype, 
    modelversionid, 
    parameterkey, 
    parametervalue, 
    parameterdatatype, 
    description, 
    coalesce(isactive, true) as isactive,
    appliedat,
    appliedby,
    createddate,
    createdby
FROM ai_configurations
WHERE id = @id AND coalesce(isdeleted, false) = false
LIMIT 1;", conn);

        cmd.Parameters.AddWithValue("id", id);
        using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return null;

        return new AIConfigurationRowDto(
            r.GetString(0),
            r.GetString(1),
            r.GetString(2),
            r.IsDBNull(3) ? null : r.GetString(3),
            r.GetString(4),
            r.GetString(5),
            r.IsDBNull(6) ? null : r.GetString(6),
            r.IsDBNull(7) ? null : r.GetString(7),
            r.GetBoolean(8),
            r.IsDBNull(9) ? null : r.GetDateTime(9),
            r.IsDBNull(10) ? null : r.GetString(10),
            r.IsDBNull(11) ? null : r.GetDateTime(11),
            r.IsDBNull(12) ? null : r.GetString(12)
        );
    }

    public async Task<string> CreateAsync(CreateAIConfigurationDto dto, string? createdBy = null)
    {
        var id = $"ai-config-{Guid.NewGuid():N}";
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
INSERT INTO ai_configurations (
    id, 
    configurationname, 
    configurationtype, 
    modelversionid, 
    parameterkey, 
    parametervalue, 
    parameterdatatype, 
    description, 
    isactive,
    createddate,
    createdby,
    note
) VALUES (
    @id,
    @configurationName,
    @configurationType,
    @modelVersionId,
    @parameterKey,
    @parameterValue,
    @parameterDataType,
    @description,
    @isActive,
    CURRENT_DATE,
    @createdBy,
    @note
);", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("configurationName", dto.ConfigurationName);
        cmd.Parameters.AddWithValue("configurationType", dto.ConfigurationType);
        cmd.Parameters.AddWithValue("modelVersionId", (object?)dto.ModelVersionId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("parameterKey", dto.ParameterKey);
        cmd.Parameters.AddWithValue("parameterValue", dto.ParameterValue);
        cmd.Parameters.AddWithValue("parameterDataType", (object?)dto.ParameterDataType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("description", (object?)dto.Description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("isActive", dto.IsActive);
        cmd.Parameters.AddWithValue("createdBy", (object?)createdBy ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)dto.Note ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
        return id;
    }

    public async Task<int> UpdateAsync(string id, UpdateAIConfigurationDto dto, string? updatedBy = null)
    {
        var updates = new List<string>();
        var parameters = new List<NpgsqlParameter>();

        if (dto.ConfigurationName != null)
        {
            updates.Add("configurationname = @configurationName");
            parameters.Add(new NpgsqlParameter("configurationName", dto.ConfigurationName));
        }
        if (dto.ConfigurationType != null)
        {
            updates.Add("configurationtype = @configurationType");
            parameters.Add(new NpgsqlParameter("configurationType", dto.ConfigurationType));
        }
        if (dto.ModelVersionId != null)
        {
            updates.Add("modelversionid = @modelVersionId");
            parameters.Add(new NpgsqlParameter("modelVersionId", dto.ModelVersionId));
        }
        if (dto.ParameterKey != null)
        {
            updates.Add("parameterkey = @parameterKey");
            parameters.Add(new NpgsqlParameter("parameterKey", dto.ParameterKey));
        }
        if (dto.ParameterValue != null)
        {
            updates.Add("parametervalue = @parameterValue");
            parameters.Add(new NpgsqlParameter("parameterValue", dto.ParameterValue));
        }
        if (dto.ParameterDataType != null)
        {
            updates.Add("parameterdatatype = @parameterDataType");
            parameters.Add(new NpgsqlParameter("parameterDataType", dto.ParameterDataType));
        }
        if (dto.Description != null)
        {
            updates.Add("description = @description");
            parameters.Add(new NpgsqlParameter("description", dto.Description));
        }
        if (dto.IsActive.HasValue)
        {
            updates.Add("isactive = @isActive");
            parameters.Add(new NpgsqlParameter("isActive", dto.IsActive.Value));
        }
        if (dto.Note != null)
        {
            updates.Add("note = @note");
            parameters.Add(new NpgsqlParameter("note", dto.Note));
        }

        if (updates.Count == 0) return 0;

        updates.Add("updateddate = CURRENT_DATE");
        if (updatedBy != null)
        {
            updates.Add("updatedby = @updatedBy");
            parameters.Add(new NpgsqlParameter("updatedBy", updatedBy));
        }

        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand($@"
UPDATE ai_configurations
SET {string.Join(", ", updates)}
WHERE id = @id AND coalesce(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        foreach (var param in parameters)
        {
            cmd.Parameters.Add(param);
        }

        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> SetActiveAsync(string id, bool isActive, string? appliedBy = null)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE ai_configurations
SET isactive = @isActive,
    appliedat = CASE WHEN @isActive THEN CURRENT_TIMESTAMP ELSE NULL END,
    appliedby = CASE WHEN @isActive THEN @appliedBy ELSE NULL END,
    updateddate = CURRENT_DATE
WHERE id = @id AND coalesce(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("isActive", isActive);
        cmd.Parameters.AddWithValue("appliedBy", (object?)appliedBy ?? DBNull.Value);

        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> DeleteAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE ai_configurations
SET isdeleted = true,
    updateddate = CURRENT_DATE
WHERE id = @id AND coalesce(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync();
    }
}
