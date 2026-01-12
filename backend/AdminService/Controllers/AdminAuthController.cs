using Aura.AdminService.Admin;
using Microsoft.AspNetCore.Mvc;

namespace Aura.AdminService.Controllers;

[ApiController]
[Route("api/admin/auth")]
public class AdminAuthController : ControllerBase
{
    private readonly AdminAccountRepository _repo;
    private readonly AdminJwtService _jwt;
    private readonly IConfiguration _config;

    public AdminAuthController(AdminAccountRepository repo, AdminJwtService jwt, IConfiguration config)
    {
        _repo = repo;
        _jwt = jwt;
        _config = config;
    }

    [HttpPost("login")]
    public ActionResult<AdminLoginResponse> Login([FromBody] AdminLoginRequest req)
    {
        var useDemoMode = _config.GetValue<bool>("Admin:UseDemoMode", false);
        var demoEmail = _config["Admin:DemoEmail"] ?? "admin@aura.com";
        var demoPassword = _config["Admin:DemoPassword"] ?? "123456";

        (string Id, string Email, string? FirstName, string? LastName, bool IsSuperAdmin, bool IsActive, string? PasswordHash)? admin = null;
        bool dbConnected = true;

        try
        {
            admin = _repo.FindAdminByEmail(req.Email);
        }
        catch (Exception)
        {
            dbConnected = false;
        }

        // Nếu DB không kết nối được nhưng UseDemoMode=true, cho phép login với demo credentials
        if (!dbConnected)
        {
            if (useDemoMode && req.Email.Equals(demoEmail, StringComparison.OrdinalIgnoreCase) && req.Password == demoPassword)
            {
                var demoToken = _jwt.GenerateAdminToken("demo-admin-id", demoEmail, true);
                var demoExp = int.Parse(_config["Jwt:ExpirationMinutes"] ?? "60");
                return Ok(new AdminLoginResponse(
                    demoToken,
                    demoExp,
                    new AdminProfileDto("demo-admin-id", demoEmail, "Demo", "Admin", true, true)
                ));
            }
            return StatusCode(500, new { message = "Không kết nối được database. Hãy bật PostgreSQL hoặc bật Admin:UseDemoMode trong appsettings.json." });
        }

        if (admin is null)
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });

        if (!admin.Value.IsActive)
            return Unauthorized(new { message = "Tài khoản admin đã bị vô hiệu hoá." });

        if (!AdminAccountRepository.VerifyPassword(req.Password, admin.Value.PasswordHash))
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });

        var token = _jwt.GenerateAdminToken(admin.Value.Id, admin.Value.Email, admin.Value.IsSuperAdmin);
        var exp = int.Parse(_config["Jwt:ExpirationMinutes"] ?? "60");

        return Ok(new AdminLoginResponse(
            token,
            exp,
            new AdminProfileDto(admin.Value.Id, admin.Value.Email, admin.Value.FirstName, admin.Value.LastName, admin.Value.IsSuperAdmin, admin.Value.IsActive)
        ));
    }
}
