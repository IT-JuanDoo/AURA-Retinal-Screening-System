using Aura.Core.Entities;

namespace Aura.Application.Services.Auth;

public interface IJwtService
{
    // userType: "User" | "Doctor" | ...
    // doctorId: dùng cho trường hợp tài khoản là bác sĩ nhưng user.Id không trùng doctors.id (vd: đã có doctor theo email)
    string GenerateAccessToken(User user, string? userType = null, string? doctorId = null);
    string GenerateRefreshToken();
    bool ValidateToken(string token);
    string? GetUserIdFromToken(string token);
    
    /// <summary>
    /// Generate access token for clinic admin
    /// </summary>
    string GenerateClinicAdminAccessToken(string adminId, string email, string fullName, string clinicId, string role);
}

