using Aura.Core.Entities;

namespace Aura.Application.Services.Auth;

public interface IJwtService
{
    string GenerateAccessToken(User user, string? userType = null);
    string GenerateRefreshToken();
    bool ValidateToken(string token);
    string? GetUserIdFromToken(string token);
    
    /// <summary>
    /// Generate access token for clinic admin
    /// </summary>
    string GenerateClinicAdminAccessToken(string adminId, string email, string fullName, string clinicId, string role);
}

