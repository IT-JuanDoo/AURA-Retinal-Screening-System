using Npgsql;

namespace Aura.API.Clinic;

public class ClinicRepository
{
    private readonly ClinicDb _db;

    public ClinicRepository(ClinicDb db)
    {
        _db = db;
    }

    // 1. LẤY DANH SÁCH
    public async Task<List<Clinic>> GetListAsync(string? search, bool? isActive)
    {
        
        using var conn = _db.OpenConnection(); 
        
        var sql = "SELECT * FROM clinics WHERE IsDeleted = false";

        if (isActive.HasValue)
        {
            sql += " AND IsActive = @IsActive";
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (LOWER(ClinicName) LIKE LOWER(@Search) OR LOWER(Email) LIKE LOWER(@Search) OR LOWER(Phone) LIKE LOWER(@Search))";
        }
        
        sql += " ORDER BY CreatedDate DESC";

        using var cmd = new NpgsqlCommand(sql, conn);
        if (isActive.HasValue) cmd.Parameters.AddWithValue("IsActive", isActive.Value);
        if (!string.IsNullOrWhiteSpace(search)) cmd.Parameters.AddWithValue("Search", $"%{search}%");

        using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<Clinic>();
        
        while (await reader.ReadAsync())
        {
            list.Add(MapReaderToClinic(reader));
        }
        return list;
    }

    // 2. TẠO MỚI
    public async Task<int> CreateAsync(Clinic clinic)
    {
        if (string.IsNullOrEmpty(clinic.Id)) clinic.Id = Guid.NewGuid().ToString();

        const string sql = @"
            INSERT INTO clinics (Id, ClinicName, Email, Address, Phone, WebsiteUrl, ClinicType, VerificationStatus, IsActive, CreatedDate, IsDeleted) 
            VALUES (@Id, @ClinicName, @Email, @Address, @Phone, @WebsiteUrl, @ClinicType, @VerificationStatus, @IsActive, @CreatedDate, false)";

        
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(sql, conn);
        
        cmd.Parameters.AddWithValue("Id", clinic.Id);
        cmd.Parameters.AddWithValue("ClinicName", clinic.ClinicName);
        cmd.Parameters.AddWithValue("Email", clinic.Email);
        cmd.Parameters.AddWithValue("Address", clinic.Address);
        cmd.Parameters.AddWithValue("Phone", (object?)clinic.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("WebsiteUrl", (object?)clinic.WebsiteUrl ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ClinicType", (object?)clinic.ClinicType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("VerificationStatus", clinic.VerificationStatus);
        cmd.Parameters.AddWithValue("IsActive", clinic.IsActive);
        cmd.Parameters.AddWithValue("CreatedDate", DateTime.Now);

        return await cmd.ExecuteNonQueryAsync();
    }

    // 3. CẬP NHẬT
    public async Task<int> UpdateAsync(string id, Clinic clinic)
    {
        const string sql = @"
            UPDATE clinics 
            SET ClinicName = @ClinicName, Email = @Email, Address = @Address, 
                Phone = @Phone, WebsiteUrl = @WebsiteUrl, UpdatedDate = @UpdatedDate
            WHERE Id = @Id AND IsDeleted = false";

       
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(sql, conn);
        
        cmd.Parameters.AddWithValue("Id", id);
        cmd.Parameters.AddWithValue("ClinicName", clinic.ClinicName);
        cmd.Parameters.AddWithValue("Email", clinic.Email);
        cmd.Parameters.AddWithValue("Address", clinic.Address);
        cmd.Parameters.AddWithValue("Phone", (object?)clinic.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("WebsiteUrl", (object?)clinic.WebsiteUrl ?? DBNull.Value);
        cmd.Parameters.AddWithValue("UpdatedDate", DateTime.Now);

        return await cmd.ExecuteNonQueryAsync();
    }

    // 4. ĐỔI TRẠNG THÁI
    public async Task<int> SetActiveAsync(string id, bool isActive)
    {
        const string sql = "UPDATE clinics SET IsActive = @IsActive WHERE Id = @Id";
        
        
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("Id", id);
        cmd.Parameters.AddWithValue("IsActive", isActive);
        return await cmd.ExecuteNonQueryAsync();
    }

    private static Clinic MapReaderToClinic(NpgsqlDataReader reader)
    {
        return new Clinic
        {
            Id = reader["Id"].ToString()!,
            ClinicName = reader["ClinicName"].ToString()!,
            Email = reader["Email"].ToString()!,
            Address = reader["Address"].ToString()!,
            Phone = reader["Phone"] as string,
            WebsiteUrl = reader["WebsiteUrl"] as string,
            VerificationStatus = reader["VerificationStatus"].ToString()!,
            IsActive = (bool)reader["IsActive"],
            CreatedDate = (DateTime)reader["CreatedDate"],
            ClinicType = reader["ClinicType"] as string
        };
    }
}