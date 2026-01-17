using Npgsql;

namespace Aura.API.Admin;

public class ClinicRepository
{
    private readonly AdminDb _db;

    public ClinicRepository(AdminDb db)
    {
        _db = db;
    }

    public async Task<List<AdminClinicRowDto>> ListAsync(string? search = null, string? verificationStatus = null, bool? isActive = null)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
SELECT 
    id, 
    clinicname, 
    email, 
    phone, 
    address,
    COALESCE(verificationstatus, 'Pending') as verificationstatus,
    COALESCE(isactive, true) as isactive
FROM clinics
WHERE COALESCE(isdeleted, false) = false
  AND (@isActive IS NULL OR COALESCE(isactive, true) = @isActive)
  AND (@verificationStatus IS NULL OR COALESCE(verificationstatus, 'Pending') = @verificationStatus)
  AND (
    @search IS NULL
    OR lower(clinicname) LIKE '%' || lower(@search) || '%'
    OR lower(email) LIKE '%' || lower(@search) || '%'
    OR lower(COALESCE(phone, '')) LIKE '%' || lower(@search) || '%'
    OR lower(address) LIKE '%' || lower(@search) || '%'
  )
ORDER BY createddate DESC NULLS LAST
LIMIT 500;", conn);

        var searchParam = new NpgsqlParameter("search", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)search ?? DBNull.Value };
        cmd.Parameters.Add(searchParam);

        var statusParam = new NpgsqlParameter("verificationStatus", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)verificationStatus ?? DBNull.Value };
        cmd.Parameters.Add(statusParam);

        var isActiveParam = new NpgsqlParameter("isActive", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)isActive ?? DBNull.Value };
        cmd.Parameters.Add(isActiveParam);

        var list = new List<AdminClinicRowDto>();
        using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            list.Add(new AdminClinicRowDto(
                r.GetString(0),
                r.GetString(1),
                r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3),
                r.GetString(4),
                r.GetString(5),
                r.GetBoolean(6)
            ));
        }

        return list;
    }

    public async Task<AdminClinicRowDto?> GetByIdAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
SELECT 
    id, 
    clinicname, 
    email, 
    phone, 
    address,
    COALESCE(verificationstatus, 'Pending') as verificationstatus,
    COALESCE(isactive, true) as isactive
FROM clinics
WHERE id = @id
  AND COALESCE(isdeleted, false) = false
LIMIT 1;", conn);

        cmd.Parameters.AddWithValue("id", id);
        using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return null;

        return new AdminClinicRowDto(
            r.GetString(0),
            r.GetString(1),
            r.GetString(2),
            r.IsDBNull(3) ? null : r.GetString(3),
            r.GetString(4),
            r.GetString(5),
            r.GetBoolean(6)
        );
    }

    public async Task<bool> ApproveAsync(string id, string? approvedBy, string? note = null)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE clinics
SET verificationstatus = 'Approved',
    verifiedat = CURRENT_TIMESTAMP,
    verifiedby = @approvedBy,
    isactive = true,
    updateddate = CURRENT_DATE,
    note = COALESCE(@note, note)
WHERE id = @id
  AND COALESCE(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("approvedBy", (object?)approvedBy ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)note ?? DBNull.Value);

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<bool> RejectAsync(string id, string? rejectedBy, string? note = null)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE clinics
SET verificationstatus = 'Rejected',
    verifiedat = CURRENT_TIMESTAMP,
    verifiedby = @rejectedBy,
    isactive = false,
    updateddate = CURRENT_DATE,
    note = COALESCE(@note, note)
WHERE id = @id
  AND COALESCE(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("rejectedBy", (object?)rejectedBy ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)note ?? DBNull.Value);

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<bool> SuspendAsync(string id, string? suspendedBy, string? note = null)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE clinics
SET verificationstatus = 'Suspended',
    isactive = false,
    updateddate = CURRENT_DATE,
    verifiedby = @suspendedBy,
    note = COALESCE(@note, note)
WHERE id = @id
  AND COALESCE(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("suspendedBy", (object?)suspendedBy ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)note ?? DBNull.Value);

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<bool> ActivateAsync(string id, string? activatedBy, string? note = null)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE clinics
SET verificationstatus = 'Approved',
    isactive = true,
    updateddate = CURRENT_DATE,
    verifiedby = @activatedBy,
    note = COALESCE(@note, note)
WHERE id = @id
  AND COALESCE(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("activatedBy", (object?)activatedBy ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)note ?? DBNull.Value);

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<bool> UpdateAsync(string id, AdminUpdateClinicDto dto, string? updatedBy)
    {
        using var conn = _db.OpenConnection();
        
        var updates = new List<string>();
        var parameters = new List<NpgsqlParameter>();

        if (!string.IsNullOrWhiteSpace(dto.ClinicName))
        {
            updates.Add("clinicname = @clinicName");
            parameters.Add(new NpgsqlParameter("clinicName", dto.ClinicName));
        }
        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            updates.Add("email = @email");
            parameters.Add(new NpgsqlParameter("email", dto.Email));
        }
        if (dto.Phone != null)
        {
            updates.Add("phone = @phone");
            parameters.Add(new NpgsqlParameter("phone", (object?)dto.Phone ?? DBNull.Value));
        }
        if (!string.IsNullOrWhiteSpace(dto.Address))
        {
            updates.Add("address = @address");
            parameters.Add(new NpgsqlParameter("address", dto.Address));
        }
        if (dto.City != null)
        {
            updates.Add("city = @city");
            parameters.Add(new NpgsqlParameter("city", (object?)dto.City ?? DBNull.Value));
        }
        if (dto.Province != null)
        {
            updates.Add("province = @province");
            parameters.Add(new NpgsqlParameter("province", (object?)dto.Province ?? DBNull.Value));
        }
        if (dto.WebsiteUrl != null)
        {
            updates.Add("websiteurl = @websiteUrl");
            parameters.Add(new NpgsqlParameter("websiteUrl", (object?)dto.WebsiteUrl ?? DBNull.Value));
        }
        if (dto.ContactPersonName != null)
        {
            updates.Add("contactpersonname = @contactPersonName");
            parameters.Add(new NpgsqlParameter("contactPersonName", (object?)dto.ContactPersonName ?? DBNull.Value));
        }
        if (dto.ContactPersonPhone != null)
        {
            updates.Add("contactpersonphone = @contactPersonPhone");
            parameters.Add(new NpgsqlParameter("contactPersonPhone", (object?)dto.ContactPersonPhone ?? DBNull.Value));
        }
        if (dto.ClinicType != null)
        {
            updates.Add("clinictype = @clinicType");
            parameters.Add(new NpgsqlParameter("clinicType", (object?)dto.ClinicType ?? DBNull.Value));
        }
        if (dto.VerificationStatus != null)
        {
            updates.Add("verificationstatus = @verificationStatus");
            parameters.Add(new NpgsqlParameter("verificationStatus", dto.VerificationStatus));
        }
        if (dto.IsActive.HasValue)
        {
            updates.Add("isactive = @isActive");
            parameters.Add(new NpgsqlParameter("isActive", dto.IsActive.Value));
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
UPDATE clinics
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
}
