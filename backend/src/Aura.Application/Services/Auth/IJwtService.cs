using Aura.Core.Entities;

namespace Aura.Application.Services.Auth;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    bool ValidateToken(string token);
    string? GetUserIdFromToken(string token);
}

