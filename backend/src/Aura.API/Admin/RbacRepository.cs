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
                CASE 
                    -- For Doctor role: count from doctors table (users with Doctor role are moved to doctors table)
                    WHEN r.RoleName = 'Doctor' THEN
                        (
                            SELECT COUNT(DISTINCT d.Id)
                            FROM doctors d
                            WHERE COALESCE(d.IsDeleted, false) = false
                        )
                    -- For Admin/SuperAdmin roles: count from admins table
                    WHEN r.RoleName IN ('Admin', 'SuperAdmin') THEN
                        (
                            SELECT COUNT(DISTINCT a.Id)
                            FROM admins a
                            WHERE a.RoleId = r.Id
                                AND COALESCE(a.IsDeleted, false) = false
                        )
                    -- For Clinic role: count from clinics table
                    WHEN r.RoleName = 'Clinic' THEN
                        (
                            SELECT COUNT(DISTINCT c.Id)
                            FROM clinics c
                            WHERE COALESCE(c.IsDeleted, false) = false
                        )
                    -- For User role and others: count from user_roles table (only active, non-deleted users)
                    ELSE
                        (
                            SELECT COUNT(DISTINCT ur.UserId)
                            FROM user_roles ur
                            INNER JOIN users u ON ur.UserId = u.Id
                            WHERE ur.RoleId = r.Id 
                                AND COALESCE(ur.IsDeleted, false) = false
                                AND COALESCE(u.IsDeleted, false) = false
                        )
                END as UserCount,
                -- Count permissions directly from role_permissions table
                (
                    SELECT COUNT(DISTINCT rp.PermissionId)
                    FROM role_permissions rp
                    WHERE rp.RoleId = r.Id
                        AND COALESCE(rp.IsDeleted, false) = false
                ) as PermissionCount
            FROM roles r
            WHERE COALESCE(r.IsDeleted, false) = false
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
                CASE 
                    -- For Doctor role: count from doctors table (users with Doctor role are moved to doctors table)
                    WHEN r.RoleName = 'Doctor' THEN
                        (
                            SELECT COUNT(DISTINCT d.Id)
                            FROM doctors d
                            WHERE COALESCE(d.IsDeleted, false) = false
                        )
                    -- For Admin/SuperAdmin roles: count from admins table
                    WHEN r.RoleName IN ('Admin', 'SuperAdmin') THEN
                        (
                            SELECT COUNT(DISTINCT a.Id)
                            FROM admins a
                            WHERE a.RoleId = r.Id
                                AND COALESCE(a.IsDeleted, false) = false
                        )
                    -- For Clinic role: count from clinics table
                    WHEN r.RoleName = 'Clinic' THEN
                        (
                            SELECT COUNT(DISTINCT c.Id)
                            FROM clinics c
                            WHERE COALESCE(c.IsDeleted, false) = false
                        )
                    -- For User role and others: count from user_roles table (only active, non-deleted users)
                    ELSE
                        (
                            SELECT COUNT(DISTINCT ur.UserId)
                            FROM user_roles ur
                            INNER JOIN users u ON ur.UserId = u.Id
                            WHERE ur.RoleId = r.Id 
                                AND COALESCE(ur.IsDeleted, false) = false
                                AND COALESCE(u.IsDeleted, false) = false
                        )
                END as UserCount,
                -- Count permissions directly from role_permissions table
                (
                    SELECT COUNT(DISTINCT rp.PermissionId)
                    FROM role_permissions rp
                    WHERE rp.RoleId = r.Id
                        AND COALESCE(rp.IsDeleted, false) = false
                ) as PermissionCount
            FROM roles r
            WHERE r.Id = @id AND COALESCE(r.IsDeleted, false) = false;", conn);
        
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
        using var transaction = conn.BeginTransaction();
        
        try
        {
            // Get role name to determine which table to use
            string? roleName = null;
            using (var roleCmd = new NpgsqlCommand(@"SELECT RoleName FROM roles WHERE Id = @roleId AND COALESCE(IsDeleted, false) = false;", conn, transaction))
            {
                roleCmd.Parameters.AddWithValue("roleId", roleId);
                var roleResult = await roleCmd.ExecuteScalarAsync();
                if (roleResult != null)
                {
                    roleName = roleResult.ToString();
                }
            }
            
            if (string.IsNullOrEmpty(roleName))
            {
                transaction.Rollback();
                return false;
            }
            
            // Step 1: Remove all existing roles from user_roles (delete old roles)
            using var deleteOldRolesCmd = new NpgsqlCommand(@"
                UPDATE user_roles 
                SET IsDeleted = true, UpdatedDate = CURRENT_DATE
                WHERE UserId = @userId AND COALESCE(IsDeleted, false) = false;", conn, transaction);
            deleteOldRolesCmd.Parameters.AddWithValue("userId", userId);
            await deleteOldRolesCmd.ExecuteNonQueryAsync();
            
            // Step 2: Remove from other role tables if exists
            // Remove from doctors table
            using var deleteDoctorCmd = new NpgsqlCommand(@"
                UPDATE doctors 
                SET IsDeleted = true, UpdatedDate = CURRENT_DATE
                WHERE Id = @userId AND COALESCE(IsDeleted, false) = false;", conn, transaction);
            deleteDoctorCmd.Parameters.AddWithValue("userId", userId);
            await deleteDoctorCmd.ExecuteNonQueryAsync();
            
            // Remove from admins table
            using var deleteAdminCmd = new NpgsqlCommand(@"
                UPDATE admins 
                SET IsDeleted = true, UpdatedDate = CURRENT_DATE
                WHERE Id = @userId AND COALESCE(IsDeleted, false) = false;", conn, transaction);
            deleteAdminCmd.Parameters.AddWithValue("userId", userId);
            await deleteAdminCmd.ExecuteNonQueryAsync();
            
            // Step 3: Assign new role based on role type
            if (roleName.Equals("Doctor", StringComparison.OrdinalIgnoreCase))
            {
                // For Doctor role: save to doctors table
                await CreateOrUpdateDoctorFromUserAsync(conn, transaction, userId, assignedBy);
                
                // Note: User record is kept in users table for login purposes
                // ListUsersAsync query already excludes doctors using NOT EXISTS
            }
            else if (roleName.Equals("Admin", StringComparison.OrdinalIgnoreCase) || 
                     roleName.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
            {
                // For Admin/SuperAdmin role: save to admins table
                await CreateOrUpdateAdminFromUserAsync(conn, transaction, userId, roleId, roleName, assignedBy);
                
                // Mark user as deleted so they don't appear in users list
                using var deleteUserCmd = new NpgsqlCommand(@"
                    UPDATE users 
                    SET IsDeleted = true, UpdatedDate = CURRENT_DATE
                    WHERE Id = @userId;", conn, transaction);
                deleteUserCmd.Parameters.AddWithValue("userId", userId);
                await deleteUserCmd.ExecuteNonQueryAsync();
            }
            else if (roleName.Equals("Clinic", StringComparison.OrdinalIgnoreCase))
            {
                // For Clinic role: save to clinics table (if user exists as clinic)
                // Note: This assumes the user ID matches a clinic ID, otherwise create new clinic
                // For now, we'll just save the role in user_roles
                using var insertRoleCmd = new NpgsqlCommand(@"
                    INSERT INTO user_roles (Id, UserId, RoleId, IsPrimary, CreatedDate, CreatedBy, IsDeleted)
                    VALUES (@id, @userId, @roleId, @isPrimary, CURRENT_DATE, @createdBy, false);", conn, transaction);
                insertRoleCmd.Parameters.AddWithValue("id", Guid.NewGuid().ToString());
                insertRoleCmd.Parameters.AddWithValue("userId", userId);
                insertRoleCmd.Parameters.AddWithValue("roleId", roleId);
                insertRoleCmd.Parameters.AddWithValue("isPrimary", isPrimary);
                insertRoleCmd.Parameters.AddWithValue("createdBy", (object?)assignedBy ?? DBNull.Value);
                await insertRoleCmd.ExecuteNonQueryAsync();
            }
            else
            {
                // For User role and others: save to user_roles table
                using var insertRoleCmd = new NpgsqlCommand(@"
                    INSERT INTO user_roles (Id, UserId, RoleId, IsPrimary, CreatedDate, CreatedBy, IsDeleted)
                    VALUES (@id, @userId, @roleId, @isPrimary, CURRENT_DATE, @createdBy, false);", conn, transaction);
                insertRoleCmd.Parameters.AddWithValue("id", Guid.NewGuid().ToString());
                insertRoleCmd.Parameters.AddWithValue("userId", userId);
                insertRoleCmd.Parameters.AddWithValue("roleId", roleId);
                insertRoleCmd.Parameters.AddWithValue("isPrimary", isPrimary);
                insertRoleCmd.Parameters.AddWithValue("createdBy", (object?)assignedBy ?? DBNull.Value);
                await insertRoleCmd.ExecuteNonQueryAsync();
                
                // Ensure user is not deleted (restore if was deleted)
                using var restoreUserCmd = new NpgsqlCommand(@"
                    UPDATE users 
                    SET IsDeleted = false, UpdatedDate = CURRENT_DATE
                    WHERE Id = @userId;", conn, transaction);
                restoreUserCmd.Parameters.AddWithValue("userId", userId);
                await restoreUserCmd.ExecuteNonQueryAsync();
            }
            
            transaction.Commit();
            return true;
        }
        catch
        {
            transaction.Rollback();
            return false;
        }
    }
    
    private async Task CreateOrUpdateDoctorFromUserAsync(NpgsqlConnection conn, NpgsqlTransaction transaction, string userId, string? createdBy)
    {
        // Get user information (try from users table first, then doctors if user was already moved)
        using var userCmd = new NpgsqlCommand(@"
            SELECT Id, Email, Username, FirstName, LastName, Phone
            FROM users
            WHERE Id = @userId;", conn, transaction);
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
            SELECT Id FROM doctors WHERE Id = @userId OR Email = @email;", conn, transaction);
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
                );", conn, transaction);
            
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
                WHERE Id = @id;", conn, transaction);
            
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
    
    private async Task CreateOrUpdateAdminFromUserAsync(NpgsqlConnection conn, NpgsqlTransaction transaction, string userId, string roleId, string roleName, string? createdBy)
    {
        // Get user information (try from users table first, then admins if user was already moved)
        using var userCmd = new NpgsqlCommand(@"
            SELECT Id, Email, Username, FirstName, LastName, Phone
            FROM users
            WHERE Id = @userId;", conn, transaction);
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
                // Try to get from admins table if user was already moved
                using var adminCmd = new NpgsqlCommand(@"
                    SELECT Id, Email, Username, FirstName, LastName, Phone
                    FROM admins
                    WHERE Id = @userId;", conn, transaction);
                adminCmd.Parameters.AddWithValue("userId", userId);
                using (var adminReader = await adminCmd.ExecuteReaderAsync())
                {
                    if (await adminReader.ReadAsync())
                    {
                        email = adminReader.GetString(1);
                        username = adminReader.IsDBNull(2) ? null : adminReader.GetString(2);
                        firstName = adminReader.IsDBNull(3) ? null : adminReader.GetString(3);
                        lastName = adminReader.IsDBNull(4) ? null : adminReader.GetString(4);
                        phone = adminReader.IsDBNull(5) ? null : adminReader.GetString(5);
                    }
                    else
                    {
                        return; // User not found
                    }
                }
            }
        }
        
        // Check if admin already exists
        using var checkCmd = new NpgsqlCommand(@"
            SELECT Id FROM admins WHERE Id = @userId OR Email = @email;", conn, transaction);
        checkCmd.Parameters.AddWithValue("userId", userId);
        checkCmd.Parameters.AddWithValue("email", email);
        
        var existingId = await checkCmd.ExecuteScalarAsync();
        
        if (existingId == null)
        {
            // Create new admin record
            using var insertCmd = new NpgsqlCommand(@"
                INSERT INTO admins (
                    Id, Email, Username, FirstName, LastName, Phone, 
                    RoleId, IsSuperAdmin, IsActive, CreatedDate, CreatedBy, IsDeleted
                )
                VALUES (
                    @id, @email, @username, @firstName, @lastName, @phone,
                    @roleId, @isSuperAdmin, true, CURRENT_DATE, @createdBy, false
                );", conn, transaction);
            
            insertCmd.Parameters.AddWithValue("id", userId);
            insertCmd.Parameters.AddWithValue("email", email);
            insertCmd.Parameters.AddWithValue("username", (object?)username ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("firstName", (object?)firstName ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("lastName", (object?)lastName ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("phone", (object?)phone ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("roleId", roleId);
            insertCmd.Parameters.AddWithValue("isSuperAdmin", roleName.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));
            insertCmd.Parameters.AddWithValue("createdBy", (object?)createdBy ?? DBNull.Value);
            
            await insertCmd.ExecuteNonQueryAsync();
        }
        else
        {
            // Update existing admin record (restore if deleted)
            using var updateCmd = new NpgsqlCommand(@"
                UPDATE admins 
                SET Email = @email,
                    Username = COALESCE(@username, Username),
                    FirstName = COALESCE(@firstName, FirstName),
                    LastName = COALESCE(@lastName, LastName),
                    Phone = COALESCE(@phone, Phone),
                    RoleId = @roleId,
                    IsSuperAdmin = @isSuperAdmin,
                    IsDeleted = false,
                    UpdatedDate = CURRENT_DATE,
                    UpdatedBy = @updatedBy
                WHERE Id = @id;", conn, transaction);
            
            updateCmd.Parameters.AddWithValue("id", existingId.ToString()!);
            updateCmd.Parameters.AddWithValue("email", email);
            updateCmd.Parameters.AddWithValue("username", (object?)username ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("firstName", (object?)firstName ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("lastName", (object?)lastName ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("phone", (object?)phone ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("roleId", roleId);
            updateCmd.Parameters.AddWithValue("isSuperAdmin", roleName.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));
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

