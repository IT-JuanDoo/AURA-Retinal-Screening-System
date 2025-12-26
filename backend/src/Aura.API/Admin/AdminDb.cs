using Npgsql;

namespace Aura.API.Admin;

public class AdminDb
{
    private readonly IConfiguration _config;
    private readonly ILogger<AdminDb>? _logger;

    public AdminDb(IConfiguration config, ILogger<AdminDb>? logger = null)
    {
        _config = config;
        _logger = logger;
    }

    public NpgsqlConnection OpenConnection()
    {
        var cs = _config.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("ConnectionStrings:DefaultConnection chưa được cấu hình.");

        // Retry logic for database connection
        const int maxRetries = 5;
        const int delayMs = 2000; // 2 seconds

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                var conn = new NpgsqlConnection(cs);
                conn.Open();
                
                // Test connection with a simple query
                using (var testCmd = new NpgsqlCommand("SELECT 1", conn))
                {
                    testCmd.ExecuteScalar();
                }
                
                _logger?.LogInformation("Database connection established successfully");
                return conn;
            }
            catch (Exception ex) when (attempt < maxRetries)
            {
                _logger?.LogWarning(ex, "Database connection attempt {Attempt}/{MaxRetries} failed, retrying in {Delay}ms...", 
                    attempt, maxRetries, delayMs);
                Thread.Sleep(delayMs);
            }
        }

        // Final attempt without retry
        var finalConn = new NpgsqlConnection(cs);
        finalConn.Open();
        return finalConn;
    }
}


