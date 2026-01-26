using System.Security.Cryptography;
using System.Text;
using Npgsql;

namespace Aura.API.Admin;

public class AdminAccountRepository
{
    private readonly AdminDb _db;

    public AdminAccountRepository(AdminDb db)
    {
        _db = db;
    }

    public (string Id, string Email, string? FirstName, string? LastName, bool IsSuperAdmin, bool IsActive, string? PasswordHash)? FindAdminByEmail(string email)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
select id, email, firstname, lastname, issuperadmin, isactive, password
from admins
where lower(email)=lower(@email) and coalesce(isdeleted,false)=false
limit 1;", conn);
        cmd.Parameters.AddWithValue("email", email);
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;

        return (
            r.GetString(0),
            r.GetString(1),
            r.IsDBNull(2) ? null : r.GetString(2),
            r.IsDBNull(3) ? null : r.GetString(3),
            !r.IsDBNull(4) && r.GetBoolean(4),
            r.IsDBNull(5) ? true : r.GetBoolean(5),
            r.IsDBNull(6) ? null : r.GetString(6)
        );
    }

    public static bool VerifyPassword(string raw, string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored)) return false;

        // plaintext
        if (stored == raw) return true;

        // sha256-base64 (giống AuthService hiện có)
        if (stored == HashPassword(raw)) return true;

        // bcrypt (nếu DB dùng)
        if (stored.StartsWith("$2"))
        {
            try { return BCrypt.Net.BCrypt.Verify(raw, stored); }
            catch { return false; }
        }

        return false;
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    public async Task<List<AdminUserRowDto>> ListUsersAsync(string? search, bool? isActive)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
select u.id, u.email, u.username, u.firstname, u.lastname, coalesce(u.isemailverified,false) as isemailverified, coalesce(u.isactive,true) as isactive
from users u
where coalesce(u.isdeleted,false)=false
  and not exists (
    select 1 from doctors d 
    where d.id = u.id and coalesce(d.isdeleted,false)=false
  )
  and (@isActive is null or coalesce(u.isactive,true)=@isActive)
  and (
    @search is null
    or lower(u.email) like '%'||lower(@search)||'%'
    or lower(coalesce(u.username,'')) like '%'||lower(@search)||'%'
    or lower(coalesce(u.firstname,'')) like '%'||lower(@search)||'%'
    or lower(coalesce(u.lastname,'')) like '%'||lower(@search)||'%'
  )
order by u.createddate desc nulls last
limit 200;", conn);

        var searchParam = new NpgsqlParameter("search", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)search ?? DBNull.Value };
        cmd.Parameters.Add(searchParam);
        
        var isActiveParam = new NpgsqlParameter("isActive", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)isActive ?? DBNull.Value };
        cmd.Parameters.Add(isActiveParam);

        var list = new List<AdminUserRowDto>();
        using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            list.Add(new AdminUserRowDto(
                r.GetString(0),
                r.GetString(1),
                r.IsDBNull(2) ? null : r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3),
                r.IsDBNull(4) ? null : r.GetString(4),
                r.GetBoolean(5),
                r.GetBoolean(6)
            ));
        }
        return list;
    }

    public async Task<int> UpdateUserAsync(string id, AdminUpdateUserDto dto)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
update users set
  username = coalesce(@username, username),
  firstname = coalesce(@firstname, firstname),
  lastname = coalesce(@lastname, lastname),
  email = coalesce(@email, email),
  phone = coalesce(@phone, phone),
  gender = coalesce(@gender, gender),
  dob = coalesce(@dob, dob),
  isemailverified = coalesce(@isemailverified, isemailverified),
  isactive = coalesce(@isactive, isactive),
  note = coalesce(@note, note),
  updateddate = now()
where id=@id and coalesce(isdeleted,false)=false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("username", (object?)dto.Username ?? DBNull.Value);
        cmd.Parameters.AddWithValue("firstname", (object?)dto.FirstName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("lastname", (object?)dto.LastName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email", (object?)dto.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("phone", (object?)dto.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("gender", (object?)dto.Gender ?? DBNull.Value);
        cmd.Parameters.AddWithValue("dob", (object?)dto.Dob ?? DBNull.Value);
        cmd.Parameters.AddWithValue("isemailverified", (object?)dto.IsEmailVerified ?? DBNull.Value);
        cmd.Parameters.AddWithValue("isactive", (object?)dto.IsActive ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)dto.Note ?? DBNull.Value);

        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> SetUserActiveAsync(string id, bool isActive)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
update users set isactive=@isactive, updateddate=now()
where id=@id and coalesce(isdeleted,false)=false;", conn);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("isactive", isActive);
        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<AdminDoctorRowDto>> ListDoctorsAsync(string? search, bool? isActive)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
select id, email, username, firstname, lastname, licensenumber, coalesce(isverified,false) as isverified, coalesce(isactive,true) as isactive
from doctors
where coalesce(isdeleted,false)=false
  and (@isActive is null or coalesce(isactive,true)=@isActive)
  and (
    @search is null
    or lower(email) like '%'||lower(@search)||'%'
    or lower(coalesce(username,'')) like '%'||lower(@search)||'%'
    or lower(coalesce(firstname,'')) like '%'||lower(@search)||'%'
    or lower(coalesce(lastname,'')) like '%'||lower(@search)||'%'
    or lower(coalesce(licensenumber,'')) like '%'||lower(@search)||'%'
  )
order by createddate desc nulls last
limit 200;", conn);

        var searchParam = new NpgsqlParameter("search", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)search ?? DBNull.Value };
        cmd.Parameters.Add(searchParam);
        
        var isActiveParam = new NpgsqlParameter("isActive", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = (object?)isActive ?? DBNull.Value };
        cmd.Parameters.Add(isActiveParam);

        var list = new List<AdminDoctorRowDto>();
        using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            list.Add(new AdminDoctorRowDto(
                r.GetString(0),
                r.GetString(1),
                r.IsDBNull(2) ? null : r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3),
                r.IsDBNull(4) ? null : r.GetString(4),
                r.GetString(5),
                r.GetBoolean(6),
                r.GetBoolean(7)
            ));
        }
        return list;
    }

    public async Task<int> UpdateDoctorAsync(string id, AdminUpdateDoctorDto dto)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
update doctors set
  username = coalesce(@username, username),
  firstname = coalesce(@firstname, firstname),
  lastname = coalesce(@lastname, lastname),
  email = coalesce(@email, email),
  phone = coalesce(@phone, phone),
  gender = coalesce(@gender, gender),
  licensenumber = coalesce(@licensenumber, licensenumber),
  specialization = coalesce(@specialization, specialization),
  yearsofexperience = coalesce(@yearsofexperience, yearsofexperience),
  isverified = coalesce(@isverified, isverified),
  isactive = coalesce(@isactive, isactive),
  note = coalesce(@note, note),
  updateddate = now()
where id=@id and coalesce(isdeleted,false)=false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("username", (object?)dto.Username ?? DBNull.Value);
        cmd.Parameters.AddWithValue("firstname", (object?)dto.FirstName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("lastname", (object?)dto.LastName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email", (object?)dto.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("phone", (object?)dto.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("gender", (object?)dto.Gender ?? DBNull.Value);
        cmd.Parameters.AddWithValue("licensenumber", (object?)dto.LicenseNumber ?? DBNull.Value);
        cmd.Parameters.AddWithValue("specialization", (object?)dto.Specialization ?? DBNull.Value);
        cmd.Parameters.AddWithValue("yearsofexperience", (object?)dto.YearsOfExperience ?? DBNull.Value);
        cmd.Parameters.AddWithValue("isverified", (object?)dto.IsVerified ?? DBNull.Value);
        cmd.Parameters.AddWithValue("isactive", (object?)dto.IsActive ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)dto.Note ?? DBNull.Value);

        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> SetDoctorActiveAsync(string id, bool isActive)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
update doctors set isactive=@isactive, updateddate=now()
where id=@id and coalesce(isdeleted,false)=false;", conn);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("isactive", isActive);
        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<AdminClinicRowDto>> ListClinicsAsync(string? search, bool? isActive)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
select id, clinicname, email, phone, address, coalesce(verificationstatus,'Pending') as verificationstatus, coalesce(isactive,true) as isactive
from clinics
where coalesce(isdeleted,false)=false
  and (@isActive is null or coalesce(isactive,true)=@isActive)
  and (
    @search is null
    or lower(email) like '%'||lower(@search)||'%'
    or lower(coalesce(clinicname,'')) like '%'||lower(@search)||'%'
    or lower(coalesce(registrationnumber,'')) like '%'||lower(@search)||'%'
  )
order by createddate desc nulls last
limit 200;", conn);

        var searchParam = new NpgsqlParameter("search", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)search ?? DBNull.Value };
        cmd.Parameters.Add(searchParam);
        
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

    public async Task<int> UpdateClinicAsync(string id, AdminUpdateClinicDto dto)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
update clinics set
  clinicname = coalesce(@clinicname, clinicname),
  email = coalesce(@email, email),
  phone = coalesce(@phone, phone),
  address = coalesce(@address, address),
  city = coalesce(@city, city),
  province = coalesce(@province, province),
  websiteurl = coalesce(@websiteurl, websiteurl),
  contactpersonname = coalesce(@contactpersonname, contactpersonname),
  contactpersonphone = coalesce(@contactpersonphone, contactpersonphone),
  clinictype = coalesce(@clinictype, clinictype),
  verificationstatus = coalesce(@verificationstatus, verificationstatus),
  isactive = coalesce(@isactive, isactive),
  note = coalesce(@note, note),
  updateddate = now()
where id=@id and coalesce(isdeleted,false)=false;", conn);

        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("clinicname", (object?)dto.ClinicName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email", (object?)dto.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("phone", (object?)dto.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("address", (object?)dto.Address ?? DBNull.Value);
        cmd.Parameters.AddWithValue("city", (object?)dto.City ?? DBNull.Value);
        cmd.Parameters.AddWithValue("province", (object?)dto.Province ?? DBNull.Value);
        cmd.Parameters.AddWithValue("websiteurl", (object?)dto.WebsiteUrl ?? DBNull.Value);
        cmd.Parameters.AddWithValue("contactpersonname", (object?)dto.ContactPersonName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("contactpersonphone", (object?)dto.ContactPersonPhone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("clinictype", (object?)dto.ClinicType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("verificationstatus", (object?)dto.VerificationStatus ?? DBNull.Value);
        cmd.Parameters.AddWithValue("isactive", (object?)dto.IsActive ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)dto.Note ?? DBNull.Value);

        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> SetClinicActiveAsync(string id, bool isActive)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
update clinics set isactive=@isactive, updateddate=now()
where id=@id and coalesce(isdeleted,false)=false;", conn);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("isactive", isActive);
        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int> CreateClinicAsync(AdminCreateClinicDto dto)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
insert into clinics (
    id, clinicname, email, phone, address, city, province, country,
    websiteurl, contactpersonname, contactpersonphone, clinictype,
    verificationstatus, isactive, createddate, note
) values (
    @id, @clinicname, @email, @phone, @address, @city, @province, coalesce(@country, 'Vietnam'),
    @websiteurl, @contactpersonname, @contactpersonphone, @clinictype,
    coalesce(@verificationstatus, 'Pending'), coalesce(@isactive, true), CURRENT_DATE, @note
);", conn);

        cmd.Parameters.AddWithValue("id", dto.Id);
        cmd.Parameters.AddWithValue("clinicname", dto.ClinicName);
        cmd.Parameters.AddWithValue("email", dto.Email);
        cmd.Parameters.AddWithValue("phone", (object?)dto.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("address", dto.Address);
        cmd.Parameters.AddWithValue("city", (object?)dto.City ?? DBNull.Value);
        cmd.Parameters.AddWithValue("province", (object?)dto.Province ?? DBNull.Value);
        cmd.Parameters.AddWithValue("country", (object?)dto.Country ?? DBNull.Value);
        cmd.Parameters.AddWithValue("websiteurl", (object?)dto.WebsiteUrl ?? DBNull.Value);
        cmd.Parameters.AddWithValue("contactpersonname", (object?)dto.ContactPersonName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("contactpersonphone", (object?)dto.ContactPersonPhone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("clinictype", (object?)dto.ClinicType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("verificationstatus", (object?)dto.VerificationStatus ?? DBNull.Value);
        cmd.Parameters.AddWithValue("isactive", (object?)dto.IsActive ?? DBNull.Value);
        cmd.Parameters.AddWithValue("note", (object?)dto.Note ?? DBNull.Value);

        return await cmd.ExecuteNonQueryAsync();
    }
}


