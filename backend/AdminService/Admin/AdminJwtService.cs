using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Aura.AdminService.Admin;

public class AdminJwtService
{
    private readonly IConfiguration _configuration;

    public AdminJwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateAdminToken(string adminId, string email, bool isSuperAdmin)
    {
        var secretKey = _configuration["Jwt:SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
        var issuer = _configuration["Jwt:Issuer"] ?? "AuraAPI";
        var audience = _configuration["Jwt:Audience"] ?? "AuraClient";
        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, adminId),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Role, isSuperAdmin ? "SuperAdmin" : "Admin"),
            new("account_type", "admin")
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}


