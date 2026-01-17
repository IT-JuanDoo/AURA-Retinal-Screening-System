using Npgsql;
using System.Text.Json;

namespace Aura.API.Admin;

public class NotificationTemplateRepository
{
    private readonly AdminDb _db;

    public NotificationTemplateRepository(AdminDb db)
    {
        _db = db;
    }

    public async Task<List<NotificationTemplateRowDto>> ListAsync(string? search = null, string? templateType = null, bool? isActive = null, string? language = null)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
SELECT 
    id, 
    templatename, 
    templatetype, 
    titletemplate, 
    contenttemplate,
    variables::text,
    COALESCE(isactive, true) as isactive,
    COALESCE(language, 'vi') as language,
    createddate, 
    createdby,
    updateddate,
    updatedby,
    note
FROM notification_templates
WHERE COALESCE(isdeleted, false) = false
  AND (@isActive IS NULL OR COALESCE(isactive, true) = @isActive)
  AND (@templateType IS NULL OR templatetype = @templateType)
  AND (@language IS NULL OR COALESCE(language, 'vi') = @language)
  AND (
    @search IS NULL
    OR lower(templatename) LIKE '%' || lower(@search) || '%'
    OR lower(titletemplate) LIKE '%' || lower(@search) || '%'
    OR lower(contenttemplate) LIKE '%' || lower(@search) || '%'
  )
ORDER BY createddate DESC NULLS LAST
LIMIT 500;", conn);

        var searchParam = new NpgsqlParameter("search", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)search ?? DBNull.Value };
        cmd.Parameters.Add(searchParam);

        var typeParam = new NpgsqlParameter("templateType", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)templateType ?? DBNull.Value };
        cmd.Parameters.Add(typeParam);

        var isActiveParam = new NpgsqlParameter("isActive", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)isActive ?? DBNull.Value };
        cmd.Parameters.Add(isActiveParam);

        var languageParam = new NpgsqlParameter("language", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)language ?? DBNull.Value };
        cmd.Parameters.Add(languageParam);

        var list = new List<NotificationTemplateRowDto>();
        using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            list.Add(new NotificationTemplateRowDto(
                r.GetString(0),
                r.GetString(1),
                r.GetString(2),
                r.GetString(3),
                r.GetString(4),
                r.IsDBNull(5) ? null : r.GetString(5),
                r.GetBoolean(6),
                r.GetString(7),
                r.IsDBNull(8) ? null : r.GetDateTime(8),
                r.IsDBNull(9) ? null : r.GetString(9),
                r.IsDBNull(10) ? null : r.GetDateTime(10),
                r.IsDBNull(11) ? null : r.GetString(11),
                r.IsDBNull(12) ? null : r.GetString(12)
            ));
        }

        return list;
    }

    public async Task<NotificationTemplateRowDto?> GetByIdAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
SELECT 
    id, 
    templatename, 
    templatetype, 
    titletemplate, 
    contenttemplate,
    variables::text,
    COALESCE(isactive, true) as isactive,
    COALESCE(language, 'vi') as language,
    createddate, 
    createdby,
    updateddate,
    updatedby,
    note
FROM notification_templates
WHERE id = @id
  AND COALESCE(isdeleted, false) = false
LIMIT 1;", conn);

        cmd.Parameters.AddWithValue("id", id);
        using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return null;

        return new NotificationTemplateRowDto(
            r.GetString(0),
            r.GetString(1),
            r.GetString(2),
            r.GetString(3),
            r.GetString(4),
            r.IsDBNull(5) ? null : r.GetString(5),
            r.GetBoolean(6),
            r.GetString(7),
            r.IsDBNull(8) ? null : r.GetDateTime(8),
            r.IsDBNull(9) ? null : r.GetString(9),
            r.IsDBNull(10) ? null : r.GetDateTime(10),
            r.IsDBNull(11) ? null : r.GetString(11),
            r.IsDBNull(12) ? null : r.GetString(12)
        );
    }

    public async Task<string> CreateAsync(CreateNotificationTemplateDto dto, string? createdBy)
    {
        using var conn = _db.OpenConnection();
        var id = Guid.NewGuid().ToString();

        var variablesJson = dto.Variables != null && dto.Variables.Count > 0
            ? JsonSerializer.Serialize(dto.Variables)
            : (object?)DBNull.Value;

        using var cmd = new NpgsqlCommand(@"
INSERT INTO notification_templates (
    id,
    templatename,
    templatetype,
    titletemplate,
    contenttemplate,
    variables,
    isactive,
    language,
    createddate,
    createdby,
    note
) VALUES (
    @id,
    @templateName,
    @templateType,
    @titleTemplate,
    @contentTemplate,
    @variables::jsonb,
    @isActive,
    @language,
    CURRENT_DATE,
    @createdBy,
    @note
);", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("templateName", dto.TemplateName);
        cmd.Parameters.AddWithValue("templateType", dto.TemplateType);
        cmd.Parameters.AddWithValue("titleTemplate", dto.TitleTemplate);
        cmd.Parameters.AddWithValue("contentTemplate", dto.ContentTemplate);
        cmd.Parameters.AddWithValue("variables", variablesJson ?? DBNull.Value);
        cmd.Parameters.AddWithValue("isActive", dto.IsActive);
        cmd.Parameters.AddWithValue("language", dto.Language);
        cmd.Parameters.AddWithValue("createdBy", (object?)createdBy ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)dto.Note ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
        return id;
    }

    public async Task<bool> UpdateAsync(string id, UpdateNotificationTemplateDto dto, string? updatedBy)
    {
        using var conn = _db.OpenConnection();

        var updates = new List<string>();
        var parameters = new List<NpgsqlParameter>();

        if (!string.IsNullOrWhiteSpace(dto.TemplateName))
        {
            updates.Add("templatename = @templateName");
            parameters.Add(new NpgsqlParameter("templateName", dto.TemplateName));
        }
        if (!string.IsNullOrWhiteSpace(dto.TemplateType))
        {
            updates.Add("templatetype = @templateType");
            parameters.Add(new NpgsqlParameter("templateType", dto.TemplateType));
        }
        if (!string.IsNullOrWhiteSpace(dto.TitleTemplate))
        {
            updates.Add("titletemplate = @titleTemplate");
            parameters.Add(new NpgsqlParameter("titleTemplate", dto.TitleTemplate));
        }
        if (!string.IsNullOrWhiteSpace(dto.ContentTemplate))
        {
            updates.Add("contenttemplate = @contentTemplate");
            parameters.Add(new NpgsqlParameter("contentTemplate", dto.ContentTemplate));
        }
        if (dto.Variables != null)
        {
            updates.Add("variables = @variables::jsonb");
            var variablesJson = dto.Variables.Count > 0
                ? JsonSerializer.Serialize(dto.Variables)
                : "{}";
            parameters.Add(new NpgsqlParameter("variables", variablesJson));
        }
        if (dto.IsActive.HasValue)
        {
            updates.Add("isactive = @isActive");
            parameters.Add(new NpgsqlParameter("isActive", dto.IsActive.Value));
        }
        if (!string.IsNullOrWhiteSpace(dto.Language))
        {
            updates.Add("language = @language");
            parameters.Add(new NpgsqlParameter("language", dto.Language));
        }
        if (dto.Note != null)
        {
            updates.Add("note = @note");
            parameters.Add(new NpgsqlParameter("note", (object?)dto.Note ?? DBNull.Value));
        }

        if (updates.Count == 0) return false;

        updates.Add("updateddate = CURRENT_DATE");
        if (!string.IsNullOrWhiteSpace(updatedBy))
        {
            updates.Add("updatedby = @updatedBy");
            parameters.Add(new NpgsqlParameter("updatedBy", updatedBy));
        }

        using var cmd = new NpgsqlCommand($@"
UPDATE notification_templates
SET {string.Join(", ", updates)}
WHERE id = @id
  AND COALESCE(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        foreach (var p in parameters)
        {
            cmd.Parameters.Add(p);
        }

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<bool> SetActiveAsync(string id, bool isActive, string? updatedBy)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE notification_templates
SET isactive = @isActive,
    updateddate = CURRENT_DATE,
    updatedby = @updatedBy
WHERE id = @id
  AND COALESCE(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("isActive", isActive);
        cmd.Parameters.AddWithValue("updatedBy", (object?)updatedBy ?? DBNull.Value);

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<bool> DeleteAsync(string id, string? updatedBy)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE notification_templates
SET isdeleted = true,
    updateddate = CURRENT_DATE,
    updatedby = @updatedBy
WHERE id = @id
  AND COALESCE(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("updatedBy", (object?)updatedBy ?? DBNull.Value);

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }
}
