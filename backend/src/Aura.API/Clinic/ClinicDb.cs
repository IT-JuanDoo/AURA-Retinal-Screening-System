using Npgsql;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Aura.API.Clinic;

public class ClinicDb
{
    private readonly IConfiguration _config;
    private readonly ILogger<ClinicDb>? _logger;

    public ClinicDb(IConfiguration config, ILogger<ClinicDb>? logger = null)
    {
        _config = config;
        _logger = logger;
    }

    public NpgsqlConnection OpenConnection()
    {
       
        var cs = _config.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(cs))
        {
            throw new InvalidOperationException("ConnectionStrings:DefaultConnection chưa được cấu hình.");
        }

        const int maxRetries = 5;
        const int delayMs = 2000;

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                var conn = new NpgsqlConnection(cs);
                conn.Open();
                return conn; 
            }
            catch (Exception ex) when (attempt < maxRetries)
            {
                
                _logger?.LogWarning(ex, "ClinicDb: Connection failed attempt {Attempt}/{MaxRetries}, retrying...", attempt, maxRetries);
                Thread.Sleep(delayMs);
            }
        }

        throw new InvalidOperationException($"Không thể kết nối Database sau {maxRetries} lần thử.");
    }
}