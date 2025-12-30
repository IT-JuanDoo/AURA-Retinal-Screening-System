using Aura.Application.DTOs.RBAC;
using Aura.Application.Repositories;
using Npgsql;

namespace Aura.API.Admin;

public class RbacRepository : IRbacRepository
{
    private readonly AdminDb _db;

    public RbacRepository(AdminDb db)
    {
        _db = db;
    }

    // ========== ROLES ==========
    public async Task<IEnumerable<RoleDto>> GetAllRolesAsync()
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            SELECT 
                r.Id,
                r.RoleName,
                r.Note as Description,
                r.CreatedDate,
                COALESCE(COUNT(DISTINCT ur.UserId), 0) as UserCount,
                COALESCE(COUNT(DISTINCT rp.PermissionId), 0) as PermissionCount
            FROM roles r
            LEFT JOIN user_roles ur ON r.Id = ur.RoleId AND COALESCE(ur.IsDeleted, false) = false
            LEFT JOIN role_permissions rp ON r.Id = rp.RoleId AND COALESCE(rp.IsDeleted, false) = false
            WHERE COALESCE(r.IsDeleted, false) = false
            GROUP BY r.Id, r.RoleName, r.Note, r.CreatedDate
            ORDER BY r.RoleName;", conn);
        
        using var reader = await cmd.ExecuteReaderAsync();
        var roles = new List<RoleDto>();
        
        while (await reader.ReadAsync())
        {
            roles.Add(new RoleDto
            {
                Id = reader.GetString(0),
                RoleName = reader.GetString(1),
                Description = reader.IsDBNull(2) ? null : reader.GetString(2),
                CreatedDate = reader.IsDBNull(3) ? DateTime.UtcNow : reader.GetDateTime(3),
                UserCount = reader.GetInt32(4),
                PermissionCount = reader.GetInt32(5)
            });
        }
        
        return roles;
    }

    public async Task<RoleDto?> GetRoleByIdAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            SELECT 
                r.Id,
                r.RoleName,
                r.Note as Description,
                r.CreatedDate,
                COALESCE(COUNT(DISTINCT ur.UserId), 0) as UserCount,
                COALESCE(COUNT(DISTINCT rp.PermissionId), 0) as PermissionCount
            FROM roles r
            LEFT JOIN user_roles ur ON r.Id = ur.RoleId AND COALESCE(ur.IsDeleted, false) = false
            LEFT JOIN role_permissions rp ON r.Id = rp.RoleId AND COALESCE(rp.IsDeleted, false) = false
            WHERE r.Id = @id AND COALESCE(r.IsDeleted, false) = false
            GROUP BY r.Id, r.RoleName, r.Note, r.CreatedDate;", conn);
        
        cmd.Parameters.AddWithValue("id", id);
        using var reader = await cmd.ExecuteReaderAsync();
        
        if (!await reader.ReadAsync()) return null;
        
        return new RoleDto
        {
            Id = reader.GetString(0),
            RoleName = reader.GetString(1),
            Description = reader.IsDBNull(2) ? null : reader.GetString(2),
            CreatedDate = reader.IsDBNull(3) ? DateTime.UtcNow : reader.GetDateTime(3),
            UserCount = reader.GetInt32(4),
            PermissionCount = reader.GetInt32(5)
        };
    }

    public async Task<RoleDto> CreateRoleAsync(CreateRoleDto dto, string? createdBy = null)
    {
        var id = Guid.NewGuid().ToString();
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            INSERT INTO roles (Id, RoleName, Note, CreatedDate, CreatedBy, IsDeleted)
            VALUES (@id, @roleName, @note, CURRENT_DATE, @createdBy, false)
            RETURNING Id, RoleName, Note, CreatedDate;", conn);
        
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("roleName", dto.RoleName);
        cmd.Parameters.AddWithValue("note", (object?)dto.Description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("createdBy", (object?)createdBy ?? DBNull.Value);
        
        using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();
        
        return new RoleDto
        {
            Id = reader.GetString(0),
            RoleName = reader.GetString(1),
            Description = reader.IsDBNull(2) ? null : reader.GetString(2),
            CreatedDate = reader.GetDateTime(3),
            UserCount = 0,
            PermissionCount = 0
        };
    }

    public async Task<RoleDto?> UpdateRoleAsync(string id, UpdateRoleDto dto, string? updatedBy = null)
    {
        using var conn = _db.OpenConnection();
        
        var updates = new List<string>();
        if (!string.IsNullOrEmpty(dto.RoleName))
            updates.Add("RoleName = @roleName");
        if (dto.Description != null)
            updates.Add("Note = @note");
        updates.Add("UpdatedDate = CURRENT_DATE");
        if (!string.IsNullOrEmpty(updatedBy))
            updates.Add("UpdatedBy = @updatedBy");
        
        if (updates.Count == 0) return await GetRoleByIdAsync(id);
        
        using var cmd = new NpgsqlCommand($@"
            UPDATE roles 
            SET {string.Join(", ", updates)}
            WHERE Id = @id AND COALESCE(IsDeleted, false) = false;", conn);
        
        cmd.Parameters.AddWithValue("id", id);
        if (!string.IsNullOrEmpty(dto.RoleName))
            cmd.Parameters.AddWithValue("roleName", dto.RoleName);
        if (dto.Description != null)
            cmd.Parameters.AddWithValue("note", dto.Description);
        if (!string.IsNullOrEmpty(updatedBy))
            cmd.Parameters.AddWithValue("updatedBy", updatedBy);
        
        var affected = await cmd.ExecuteNonQueryAsync();
        if (affected == 0) return null;
        
        return await GetRoleByIdAsync(id);
    }

    public async Task<bool> DeleteRoleAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            UPDATE roles 
            SET IsDeleted = true, UpdatedDate = CURRENT_DATE
            WHERE Id = @id AND COALESCE(IsDeleted, false) = false;", conn);
        
        cmd.Parameters.AddWithValue("id", id);
        var affected = await cmd.ExecuteNonQueryAsync();
        return affected > 0;
    }

    // ========== PERMISSIONS ==========
    public async Task<IEnumerable<PermissionDto>> GetAllPermissionsAsync()
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            SELECT 
                p.Id,
                p.PermissionName,
                p.PermissionDescription,
                p.ResourceType,
                p.CreatedDate,
                COALESCE(COUNT(DISTINCT rp.RoleId), 0) as RoleCount
            FROM permissions p
            LEFT JOIN role_permissions rp ON p.Id = rp.PermissionId AND COALESCE(rp.IsDeleted, false) = false
            WHERE COALESCE(p.IsDeleted, false) = false
            GROUP BY p.Id, p.PermissionName, p.PermissionDescription, p.ResourceType, p.CreatedDate
            ORDER BY p.PermissionName;", conn);
        
        using var reader = await cmd.ExecuteReaderAsync();
        var permissions = new List<PermissionDto>();
        
        while (await reader.ReadAsync())
        {
            permissions.Add(new PermissionDto
            {
                Id = reader.GetString(0),
                PermissionName = reader.GetString(1),
                PermissionDescription = reader.IsDBNull(2) ? null : reader.GetString(2),
                ResourceType = reader.IsDBNull(3) ? null : reader.GetString(3),
                CreatedDate = reader.IsDBNull(4) ? DateTime.UtcNow : reader.GetDateTime(4),
                RoleCount = reader.GetInt32(5)
            });
        }
        
        return permissions;
    }

    public async Task<PermissionDto?> GetPermissionByIdAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            SELECT 
                p.Id,
                p.PermissionName,
                p.PermissionDescription,
                p.ResourceType,
                p.CreatedDate,
                COALESCE(COUNT(DISTINCT rp.RoleId), 0) as RoleCount
            FROM permissions p
            LEFT JOIN role_permissions rp ON p.Id = rp.PermissionId AND COALESCE(rp.IsDeleted, false) = false
            WHERE p.Id = @id AND COALESCE(p.IsDeleted, false) = false
            GROUP BY p.Id, p.PermissionName, p.PermissionDescription, p.ResourceType, p.CreatedDate;", conn);
        
        cmd.Parameters.AddWithValue("id", id);
        using var reader = await cmd.ExecuteReaderAsync();
        
        if (!await reader.ReadAsync()) return null;
        
        return new PermissionDto
        {
            Id = reader.GetString(0),
            PermissionName = reader.GetString(1),
            PermissionDescription = reader.IsDBNull(2) ? null : reader.GetString(2),
            ResourceType = reader.IsDBNull(3) ? null : reader.GetString(3),
            CreatedDate = reader.IsDBNull(4) ? DateTime.UtcNow : reader.GetDateTime(4),
            RoleCount = reader.GetInt32(5)
        };
    }

    public async Task<PermissionDto> CreatePermissionAsync(CreatePermissionDto dto, string? createdBy = null)
    {
        var id = Guid.NewGuid().ToString();
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            INSERT INTO permissions (Id, PermissionName, PermissionDescription, ResourceType, CreatedDate, CreatedBy, IsDeleted)
            VALUES (@id, @permissionName, @permissionDescription, @resourceType, CURRENT_DATE, @createdBy, false)
            RETURNING Id, PermissionName, PermissionDescription, ResourceType, CreatedDate;", conn);
        
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("permissionName", dto.PermissionName);
        cmd.Parameters.AddWithValue("permissionDescription", (object?)dto.PermissionDescription ?? DBNull.Value);
        cmd.Parameters.AddWithValue("resourceType", (object?)dto.ResourceType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("createdBy", (object?)createdBy ?? DBNull.Value);
        
        using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();
        
        return new PermissionDto
        {
            Id = reader.GetString(0),
            PermissionName = reader.GetString(1),
            PermissionDescription = reader.IsDBNull(2) ? null : reader.GetString(2),
            ResourceType = reader.IsDBNull(3) ? null : reader.GetString(3),
            CreatedDate = reader.GetDateTime(4),
            RoleCount = 0
        };
    }

    public async Task<PermissionDto?> UpdatePermissionAsync(string id, UpdatePermissionDto dto, string? updatedBy = null)
    {
        using var conn = _db.OpenConnection();
        
        var updates = new List<string>();
        if (!string.IsNullOrEmpty(dto.PermissionName))
            updates.Add("PermissionName = @permissionName");
        if (dto.PermissionDescription != null)
            updates.Add("PermissionDescription = @permissionDescription");
        if (dto.ResourceType != null)
            updates.Add("ResourceType = @resourceType");
        updates.Add("UpdatedDate = CURRENT_DATE");
        if (!string.IsNullOrEmpty(updatedBy))
            updates.Add("UpdatedBy = @updatedBy");
        
        if (updates.Count == 0) return await GetPermissionByIdAsync(id);
        
        using var cmd = new NpgsqlCommand($@"
            UPDATE permissions 
            SET {string.Join(", ", updates)}
            WHERE Id = @id AND COALESCE(IsDeleted, false) = false;", conn);
        
        cmd.Parameters.AddWithValue("id", id);
        if (!string.IsNullOrEmpty(dto.PermissionName))
            cmd.Parameters.AddWithValue("permissionName", dto.PermissionName);
        if (dto.PermissionDescription != null)
            cmd.Parameters.AddWithValue("permissionDescription", dto.PermissionDescription);
        if (dto.ResourceType != null)
            cmd.Parameters.AddWithValue("resourceType", dto.ResourceType);
        if (!string.IsNullOrEmpty(updatedBy))
            cmd.Parameters.AddWithValue("updatedBy", updatedBy);
        
        var affected = await cmd.ExecuteNonQueryAsync();
        if (affected == 0) return null;
        
        return await GetPermissionByIdAsync(id);
    }

    public async Task<bool> DeletePermissionAsync(string id)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            UPDATE permissions 
            SET IsDeleted = true, UpdatedDate = CURRENT_DATE
            WHERE Id = @id AND COALESCE(IsDeleted, false) = false;", conn);
        
        cmd.Parameters.AddWithValue("id", id);
        var affected = await cmd.ExecuteNonQueryAsync();
        return affected > 0;
    }

    // ========== ROLE-PERMISSION ASSIGNMENTS ==========
    public async Task<bool> AssignPermissionToRoleAsync(string roleId, string permissionId, string? assignedBy = null)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            INSERT INTO role_permissions (Id, RoleId, PermissionId, CreatedDate, CreatedBy, IsDeleted)
            VALUES (@id, @roleId, @permissionId, CURRENT_DATE, @createdBy, false)
            ON CONFLICT (RoleId, PermissionId) DO UPDATE 
            SET IsDeleted = false, UpdatedDate = CURRENT_DATE;", conn);
        
        cmd.Parameters.AddWithValue("id", Guid.NewGuid().ToString());
        cmd.Parameters.AddWithValue("roleId", roleId);
        cmd.Parameters.AddWithValue("permissionId", permissionId);
        cmd.Parameters.AddWithValue("createdBy", (object?)assignedBy ?? DBNull.Value);
        
        try
        {
            await cmd.ExecuteNonQueryAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> RemovePermissionFromRoleAsync(string roleId, string permissionId)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            UPDATE role_permissions 
            SET IsDeleted = true, UpdatedDate = CURRENT_DATE
            WHERE RoleId = @roleId AND PermissionId = @permissionId AND COALESCE(IsDeleted, false) = false;", conn);
        
        cmd.Parameters.AddWithValue("roleId", roleId);
        cmd.Parameters.AddWithValue("permissionId", permissionId);
        var affected = await cmd.ExecuteNonQueryAsync();
        return affected > 0;
    }

    public async Task<IEnumerable<PermissionDto>> GetRolePermissionsAsync(string roleId)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            SELECT 
                p.Id,
                p.PermissionName,
                p.PermissionDescription,
                p.ResourceType,
                p.CreatedDate,
                COUNT(DISTINCT rp2.RoleId) as RoleCount
            FROM role_permissions rp
            INNER JOIN permissions p ON rp.PermissionId = p.Id
            LEFT JOIN role_permissions rp2 ON p.Id = rp2.PermissionId AND COALESCE(rp2.IsDeleted, false) = false
            WHERE rp.RoleId = @roleId 
                AND COALESCE(rp.IsDeleted, false) = false
                AND COALESCE(p.IsDeleted, false) = false
            GROUP BY p.Id, p.PermissionName, p.PermissionDescription, p.ResourceType, p.CreatedDate
            ORDER BY p.PermissionName;", conn);
        
        cmd.Parameters.AddWithValue("roleId", roleId);
        using var reader = await cmd.ExecuteReaderAsync();
        var permissions = new List<PermissionDto>();
        
        while (await reader.ReadAsync())
        {
            permissions.Add(new PermissionDto
            {
                Id = reader.GetString(0),
                PermissionName = reader.GetString(1),
                PermissionDescription = reader.IsDBNull(2) ? null : reader.GetString(2),
                ResourceType = reader.IsDBNull(3) ? null : reader.GetString(3),
                CreatedDate = reader.IsDBNull(4) ? DateTime.UtcNow : reader.GetDateTime(4),
                RoleCount = reader.GetInt32(5)
            });
        }
        
        return permissions;
    }

    public async Task<IEnumerable<RoleDto>> GetPermissionRolesAsync(string permissionId)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            SELECT 
                r.Id,
                r.RoleName,
                r.Note as Description,
                r.CreatedDate,
                COUNT(DISTINCT ur.UserId) as UserCount,
                COUNT(DISTINCT rp2.PermissionId) as PermissionCount
            FROM role_permissions rp
            INNER JOIN roles r ON rp.RoleId = r.Id
            LEFT JOIN user_roles ur ON r.Id = ur.RoleId AND COALESCE(ur.IsDeleted, false) = false
            LEFT JOIN role_permissions rp2 ON r.Id = rp2.RoleId AND COALESCE(rp2.IsDeleted, false) = false
            WHERE rp.PermissionId = @permissionId 
                AND COALESCE(rp.IsDeleted, false) = false
                AND COALESCE(r.IsDeleted, false) = false
            GROUP BY r.Id, r.RoleName, r.Note, r.CreatedDate
            ORDER BY r.RoleName;", conn);
        
        cmd.Parameters.AddWithValue("permissionId", permissionId);
        using var reader = await cmd.ExecuteReaderAsync();
        var roles = new List<RoleDto>();
        
        while (await reader.ReadAsync())
        {
            roles.Add(new RoleDto
            {
                Id = reader.GetString(0),
                RoleName = reader.GetString(1),
                Description = reader.IsDBNull(2) ? null : reader.GetString(2),
                CreatedDate = reader.IsDBNull(3) ? DateTime.UtcNow : reader.GetDateTime(3),
                UserCount = reader.GetInt32(4),
                PermissionCount = reader.GetInt32(5)
            });
        }
        
        return roles;
    }

    // ========== USER-ROLE ASSIGNMENTS ==========
    public async Task<bool> AssignRoleToUserAsync(string userId, string roleId, bool isPrimary = false, string? assignedBy = null)
    {
        using var conn = _db.OpenConnection();
        
        // Get role name to check if it's "Doctor"
        string? roleName = null;
        using (var roleCmd = new NpgsqlCommand(@"SELECT RoleName FROM roles WHERE Id = @roleId AND COALESCE(IsDeleted, false) = false;", conn))
        {
            roleCmd.Parameters.AddWithValue("roleId", roleId);
            var roleResult = await roleCmd.ExecuteScalarAsync();
            if (roleResult != null)
            {
                roleName = roleResult.ToString();
            }
        }
        
        // If setting as primary, remove primary flag from other roles
        if (isPrimary)
        {
            using var updateCmd = new NpgsqlCommand(@"
                UPDATE user_roles 
                SET IsPrimary = false, UpdatedDate = CURRENT_DATE
                WHERE UserId = @userId AND COALESCE(IsDeleted, false) = false;", conn);
            updateCmd.Parameters.AddWithValue("userId", userId);
            await updateCmd.ExecuteNonQueryAsync();
        }
        
        // Assign role to user
        using var cmd = new NpgsqlCommand(@"
            INSERT INTO user_roles (Id, UserId, RoleId, IsPrimary, CreatedDate, CreatedBy, IsDeleted)
            VALUES (@id, @userId, @roleId, @isPrimary, CURRENT_DATE, @createdBy, false)
            ON CONFLICT (UserId, RoleId) DO UPDATE 
            SET IsPrimary = @isPrimary, IsDeleted = false, UpdatedDate = CURRENT_DATE;", conn);
        
        cmd.Parameters.AddWithValue("id", Guid.NewGuid().ToString());
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("roleId", roleId);
        cmd.Parameters.AddWithValue("isPrimary", isPrimary);
        cmd.Parameters.AddWithValue("createdBy", (object?)assignedBy ?? DBNull.Value);
        
        try
        {
            await cmd.ExecuteNonQueryAsync();
            
            // If role is "Doctor", create/update doctor record and mark user as deleted
            if (roleName?.Equals("Doctor", StringComparison.OrdinalIgnoreCase) == true)
            {
                await CreateOrUpdateDoctorFromUserAsync(conn, userId, assignedBy);
                
                // Mark user as deleted so they don't appear in users list anymore
                using var deleteUserCmd = new NpgsqlCommand(@"
                    UPDATE users 
                    SET IsDeleted = true, UpdatedDate = CURRENT_DATE
                    WHERE Id = @userId AND COALESCE(IsDeleted, false) = false;", conn);
                deleteUserCmd.Parameters.AddWithValue("userId", userId);
                await deleteUserCmd.ExecuteNonQueryAsync();
            }
            
            return true;
        }
        catch
        {
            return false;
        }
    }
    
    private async Task CreateOrUpdateDoctorFromUserAsync(NpgsqlConnection conn, string userId, string? createdBy)
    {
        // Get user information
        using var userCmd = new NpgsqlCommand(@"
            SELECT Id, Email, Username, FirstName, LastName, Phone
            FROM users
            WHERE Id = @userId AND COALESCE(IsDeleted, false) = false;", conn);
        userCmd.Parameters.AddWithValue("userId", userId);
        
        string? email = null;
        string? username = null;
        string? firstName = null;
        string? lastName = null;
        string? phone = null;
        
        using (var reader = await userCmd.ExecuteReaderAsync())
        {
            if (await reader.ReadAsync())
            {
                email = reader.GetString(1);
                username = reader.IsDBNull(2) ? null : reader.GetString(2);
                firstName = reader.IsDBNull(3) ? null : reader.GetString(3);
                lastName = reader.IsDBNull(4) ? null : reader.GetString(4);
                phone = reader.IsDBNull(5) ? null : reader.GetString(5);
            }
            else
            {
                return; // User not found
            }
        }
        
        // Check if doctor already exists
        using var checkCmd = new NpgsqlCommand(@"
            SELECT Id FROM doctors WHERE Id = @userId OR Email = @email;", conn);
        checkCmd.Parameters.AddWithValue("userId", userId);
        checkCmd.Parameters.AddWithValue("email", email);
        
        var existingId = await checkCmd.ExecuteScalarAsync();
        
        if (existingId == null)
        {
            // Create new doctor record
            // Generate a unique license number if not provided
            var licenseNumber = $"DR-{userId.Substring(0, Math.Min(8, userId.Length)).ToUpper()}-{DateTime.UtcNow:yyyyMMdd}";
            
            using var insertCmd = new NpgsqlCommand(@"
                INSERT INTO doctors (
                    Id, Email, Username, FirstName, LastName, Phone, 
                    LicenseNumber, IsVerified, IsActive, CreatedDate, CreatedBy, IsDeleted
                )
                VALUES (
                    @id, @email, @username, @firstName, @lastName, @phone,
                    @licenseNumber, false, true, CURRENT_DATE, @createdBy, false
                );", conn);
            
            insertCmd.Parameters.AddWithValue("id", userId);
            insertCmd.Parameters.AddWithValue("email", email);
            insertCmd.Parameters.AddWithValue("username", (object?)username ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("firstName", (object?)firstName ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("lastName", (object?)lastName ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("phone", (object?)phone ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("licenseNumber", licenseNumber);
            insertCmd.Parameters.AddWithValue("createdBy", (object?)createdBy ?? DBNull.Value);
            
            await insertCmd.ExecuteNonQueryAsync();
        }
        else
        {
            // Update existing doctor record (restore if deleted)
            using var updateCmd = new NpgsqlCommand(@"
                UPDATE doctors 
                SET Email = @email,
                    Username = COALESCE(@username, Username),
                    FirstName = COALESCE(@firstName, FirstName),
                    LastName = COALESCE(@lastName, LastName),
                    Phone = COALESCE(@phone, Phone),
                    IsDeleted = false,
                    UpdatedDate = CURRENT_DATE,
                    UpdatedBy = @updatedBy
                WHERE Id = @id;", conn);
            
            updateCmd.Parameters.AddWithValue("id", existingId.ToString()!);
            updateCmd.Parameters.AddWithValue("email", email);
            updateCmd.Parameters.AddWithValue("username", (object?)username ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("firstName", (object?)firstName ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("lastName", (object?)lastName ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("phone", (object?)phone ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("updatedBy", (object?)createdBy ?? DBNull.Value);
            
            await updateCmd.ExecuteNonQueryAsync();
        }
    }

    public async Task<bool> RemoveRoleFromUserAsync(string userId, string roleId)
    {
        using var conn = _db.OpenConnection();
        
        // Get role name to check if it's "Doctor"
        string? roleName = null;
        using (var roleCmd = new NpgsqlCommand(@"SELECT RoleName FROM roles WHERE Id = @roleId AND COALESCE(IsDeleted, false) = false;", conn))
        {
            roleCmd.Parameters.AddWithValue("roleId", roleId);
            var roleResult = await roleCmd.ExecuteScalarAsync();
            if (roleResult != null)
            {
                roleName = roleResult.ToString();
            }
        }
        
        // Remove role from user
        using var cmd = new NpgsqlCommand(@"
            UPDATE user_roles 
            SET IsDeleted = true, UpdatedDate = CURRENT_DATE
            WHERE UserId = @userId AND RoleId = @roleId AND COALESCE(IsDeleted, false) = false;", conn);
        
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("roleId", roleId);
        var affected = await cmd.ExecuteNonQueryAsync();
        
        // If role is "Doctor", mark doctor record as deleted and restore user
        if (affected > 0 && roleName?.Equals("Doctor", StringComparison.OrdinalIgnoreCase) == true)
        {
            using var doctorCmd = new NpgsqlCommand(@"
                UPDATE doctors 
                SET IsDeleted = true, UpdatedDate = CURRENT_DATE
                WHERE Id = @userId AND COALESCE(IsDeleted, false) = false;", conn);
            doctorCmd.Parameters.AddWithValue("userId", userId);
            await doctorCmd.ExecuteNonQueryAsync();
            
            // Restore user so they appear in users list again
            using var restoreUserCmd = new NpgsqlCommand(@"
                UPDATE users 
                SET IsDeleted = false, UpdatedDate = CURRENT_DATE
                WHERE Id = @userId;", conn);
            restoreUserCmd.Parameters.AddWithValue("userId", userId);
            await restoreUserCmd.ExecuteNonQueryAsync();
        }
        
        return affected > 0;
    }

    public async Task<IEnumerable<string>> GetUserRolesAsync(string userId)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            SELECT r.RoleName
            FROM user_roles ur
            INNER JOIN roles r ON ur.RoleId = r.Id
            WHERE ur.UserId = @userId 
                AND COALESCE(ur.IsDeleted, false) = false
                AND COALESCE(r.IsDeleted, false) = false
            ORDER BY ur.IsPrimary DESC, r.RoleName;", conn);
        
        cmd.Parameters.AddWithValue("userId", userId);
        using var reader = await cmd.ExecuteReaderAsync();
        var roles = new List<string>();
        
        while (await reader.ReadAsync())
        {
            roles.Add(reader.GetString(0));
        }
        
        return roles;
    }

    public async Task<IEnumerable<string>> GetUserPermissionsAsync(string userId)
    {
        using var conn = _db.OpenConnection();
        using var cmd = new NpgsqlCommand(@"
            SELECT DISTINCT p.PermissionName
            FROM user_roles ur
            INNER JOIN role_permissions rp ON ur.RoleId = rp.RoleId
            INNER JOIN permissions p ON rp.PermissionId = p.Id
            WHERE ur.UserId = @userId 
                AND COALESCE(ur.IsDeleted, false) = false
                AND COALESCE(rp.IsDeleted, false) = false
                AND COALESCE(p.IsDeleted, false) = false
            ORDER BY p.PermissionName;", conn);
        
        cmd.Parameters.AddWithValue("userId", userId);
        using var reader = await cmd.ExecuteReaderAsync();
        var permissions = new List<string>();
        
        while (await reader.ReadAsync())
        {
            permissions.Add(reader.GetString(0));
        }
        
        return permissions;
    }

    // ========== DOCTOR-ROLE ASSIGNMENTS (Not implemented in DB, return empty) ==========
    public Task<bool> AssignRoleToDoctorAsync(string doctorId, string roleId, bool isPrimary = false, string? assignedBy = null)
        => Task.FromResult(false);

    public Task<bool> RemoveRoleFromDoctorAsync(string doctorId, string roleId)
        => Task.FromResult(false);

    public Task<IEnumerable<string>> GetDoctorRolesAsync(string doctorId)
        => Task.FromResult<IEnumerable<string>>(Array.Empty<string>());

    public Task<IEnumerable<string>> GetDoctorPermissionsAsync(string doctorId)
        => Task.FromResult<IEnumerable<string>>(Array.Empty<string>());

    // ========== CLINIC-ROLE ASSIGNMENTS (Not implemented in DB, return empty) ==========
    public Task<bool> AssignRoleToClinicAsync(string clinicId, string roleId, bool isPrimary = false, string? assignedBy = null)
        => Task.FromResult(false);

    public Task<bool> RemoveRoleFromClinicAsync(string clinicId, string roleId)
        => Task.FromResult(false);

    public Task<IEnumerable<string>> GetClinicRolesAsync(string clinicId)
        => Task.FromResult<IEnumerable<string>>(Array.Empty<string>());

    public Task<IEnumerable<string>> GetClinicPermissionsAsync(string clinicId)
        => Task.FromResult<IEnumerable<string>>(Array.Empty<string>());
}

