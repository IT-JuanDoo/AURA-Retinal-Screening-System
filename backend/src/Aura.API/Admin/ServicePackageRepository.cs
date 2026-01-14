using Npgsql;

namespace Aura.API.Admin;

public class ServicePackageRepository
{
    private readonly AdminDb _db;

    public ServicePackageRepository(AdminDb db)
    {
        _db = db;
    }

    public async Task<List<ServicePackageRowDto>> ListAsync(string? search, string? packageType, bool? isActive)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
SELECT
    id,
    packagename,
    packagetype,
    description,
    numberofanalyses,
    price,
    currency,
    validitydays,
    coalesce(isactive, true) as isactive,
    createddate,
    createdby
FROM service_packages
WHERE coalesce(isdeleted, false) = false
  AND (@isActive IS NULL OR coalesce(isactive, true) = @isActive)
  AND (@packageType IS NULL OR packagetype = @packageType)
  AND (
    @search IS NULL
    OR lower(packagename) LIKE '%' || lower(@search) || '%'
    OR lower(coalesce(description, '')) LIKE '%' || lower(@search) || '%'
  )
ORDER BY createddate DESC NULLS LAST
LIMIT 500;", conn);

        cmd.Parameters.Add(new NpgsqlParameter("search", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)search ?? DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("packageType", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)packageType ?? DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("isActive", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)isActive ?? DBNull.Value });

        var list = new List<ServicePackageRowDto>();
        using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            list.Add(new ServicePackageRowDto(
                r.GetString(0),
                r.GetString(1),
                r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3),
                r.GetInt32(4),
                r.GetDecimal(5),
                r.IsDBNull(6) ? "VND" : r.GetString(6),
                r.IsDBNull(7) ? null : r.GetInt32(7),
                r.GetBoolean(8),
                r.IsDBNull(9) ? null : r.GetDateTime(9),
                r.IsDBNull(10) ? null : r.GetString(10)
            ));
        }

        return list;
    }

    public async Task<ServicePackageRowDto?> GetByIdAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
SELECT
    id,
    packagename,
    packagetype,
    description,
    numberofanalyses,
    price,
    currency,
    validitydays,
    coalesce(isactive, true) as isactive,
    createddate,
    createdby
FROM service_packages
WHERE id = @id AND coalesce(isdeleted, false) = false
LIMIT 1;", conn);

        cmd.Parameters.AddWithValue("id", id);
        using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return null;

        return new ServicePackageRowDto(
            r.GetString(0),
            r.GetString(1),
            r.GetString(2),
            r.IsDBNull(3) ? null : r.GetString(3),
            r.GetInt32(4),
            r.GetDecimal(5),
            r.IsDBNull(6) ? "VND" : r.GetString(6),
            r.IsDBNull(7) ? null : r.GetInt32(7),
            r.GetBoolean(8),
            r.IsDBNull(9) ? null : r.GetDateTime(9),
            r.IsDBNull(10) ? null : r.GetString(10)
        );
    }

    public async Task<string> CreateAsync(CreateServicePackageDto dto, string? createdBy = null)
    {
        var id = $"pkg-{Guid.NewGuid():N}";
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
INSERT INTO service_packages (
    id,
    packagename,
    packagetype,
    description,
    numberofanalyses,
    price,
    currency,
    validitydays,
    isactive,
    createddate,
    createdby,
    note
) VALUES (
    @id,
    @packageName,
    @packageType,
    @description,
    @numberOfAnalyses,
    @price,
    @currency,
    @validityDays,
    @isActive,
    CURRENT_DATE,
    @createdBy,
    @note
);", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("packageName", dto.PackageName);
        cmd.Parameters.AddWithValue("packageType", dto.PackageType);
        cmd.Parameters.AddWithValue("description", (object?)dto.Description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("numberOfAnalyses", dto.NumberOfAnalyses);
        cmd.Parameters.AddWithValue("price", dto.Price);
        cmd.Parameters.AddWithValue("currency", dto.Currency);
        cmd.Parameters.AddWithValue("validityDays", (object?)dto.ValidityDays ?? DBNull.Value);
        cmd.Parameters.AddWithValue("isActive", dto.IsActive);
        cmd.Parameters.AddWithValue("createdBy", (object?)createdBy ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)dto.Note ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
        return id;
    }

    public async Task<int> UpdateAsync(string id, UpdateServicePackageDto dto, string? updatedBy = null)
    {
        var updates = new List<string>();
        var parameters = new List<NpgsqlParameter>();

        if (dto.PackageName != null)
        {
            updates.Add("packagename = @packageName");
            parameters.Add(new NpgsqlParameter("packageName", dto.PackageName));
        }
        if (dto.PackageType != null)
        {
            updates.Add("packagetype = @packageType");
            parameters.Add(new NpgsqlParameter("packageType", dto.PackageType));
        }
        if (dto.Description != null)
        {
            updates.Add("description = @description");
            parameters.Add(new NpgsqlParameter("description", dto.Description));
        }
        if (dto.NumberOfAnalyses.HasValue)
        {
            updates.Add("numberofanalyses = @numberOfAnalyses");
            parameters.Add(new NpgsqlParameter("numberOfAnalyses", dto.NumberOfAnalyses.Value));
        }
        if (dto.Price.HasValue)
        {
            updates.Add("price = @price");
            parameters.Add(new NpgsqlParameter("price", dto.Price.Value));
        }
        if (dto.Currency != null)
        {
            updates.Add("currency = @currency");
            parameters.Add(new NpgsqlParameter("currency", dto.Currency));
        }
        if (dto.ValidityDays.HasValue)
        {
            updates.Add("validitydays = @validityDays");
            parameters.Add(new NpgsqlParameter("validityDays", dto.ValidityDays.Value));
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
UPDATE service_packages
SET {string.Join(", ", updates)}
WHERE id = @id AND coalesce(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        foreach (var p in parameters)
        {
            cmd.Parameters.Add(p);
        }

        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> SetActiveAsync(string id, bool isActive)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE service_packages
SET isactive = @isActive,
    updateddate = CURRENT_DATE
WHERE id = @id AND coalesce(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("isActive", isActive);

        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> DeleteAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
UPDATE service_packages
SET isdeleted = true,
    updateddate = CURRENT_DATE
WHERE id = @id AND coalesce(isdeleted, false) = false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync();
    }
}

