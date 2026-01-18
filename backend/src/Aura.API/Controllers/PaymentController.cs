using Aura.Application.DTOs.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Security.Claims;

namespace Aura.API.Controllers;

/// <summary>
/// Controller quản lý Payment và Packages (FR-11-12, FR-28)
/// </summary>
[ApiController]
[Route("api/payments")]
[Authorize]
[Produces("application/json")]
public class PaymentController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentController> _logger;
    private readonly string _connectionString;

    public PaymentController(
        IConfiguration configuration,
        ILogger<PaymentController> logger)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Database connection string not configured");
    }

    /// <summary>
    /// Lấy danh sách packages available
    /// </summary>
    [HttpGet("packages")]
    [ProducesResponseType(typeof(List<PackageDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetPackages([FromQuery] string? packageType = null)
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT Id, PackageName, PackageType, Description, NumberOfAnalyses, 
                       Price, Currency, ValidityDays, IsActive
                FROM service_packages
                WHERE COALESCE(IsDeleted, false) = false
                    AND IsActive = true
                    AND (@PackageType IS NULL OR PackageType = @PackageType)
                ORDER BY Price ASC";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("PackageType", (object?)packageType ?? DBNull.Value);

            var packages = new List<PackageDto>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                packages.Add(new PackageDto
                {
                    Id = reader.GetString(0),
                    PackageName = reader.GetString(1),
                    PackageType = reader.GetString(2),
                    Description = reader.IsDBNull(3) ? null : reader.GetString(3),
                    NumberOfAnalyses = reader.GetInt32(4),
                    Price = reader.GetDecimal(5),
                    Currency = reader.IsDBNull(6) ? "VND" : reader.GetString(6),
                    ValidityDays = reader.IsDBNull(7) ? null : reader.GetInt32(7),
                    IsActive = reader.GetBoolean(8)
                });
            }

            return Ok(packages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting packages");
            return StatusCode(500, new { message = "Không thể lấy danh sách packages" });
        }
    }

    /// <summary>
    /// Purchase package
    /// </summary>
    [HttpPost("purchase")]
    [ProducesResponseType(typeof(PaymentHistoryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PurchasePackage([FromBody] PurchasePackageDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { message = "Chưa xác thực người dùng" });

        if (string.IsNullOrWhiteSpace(dto.PackageId))
        {
            return BadRequest(new { message = "PackageId là bắt buộc" });
        }

        if (!IsValidPaymentMethod(dto.PaymentMethod))
        {
            return BadRequest(new { message = "PaymentMethod không hợp lệ" });
        }

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Get package details
            var packageSql = @"
                SELECT Id, PackageName, PackageType, NumberOfAnalyses, Price, Currency, ValidityDays
                FROM service_packages
                WHERE Id = @PackageId AND IsActive = true AND COALESCE(IsDeleted, false) = false";

            using var packageCmd = new NpgsqlCommand(packageSql, connection);
            packageCmd.Parameters.AddWithValue("PackageId", dto.PackageId);

            using var packageReader = await packageCmd.ExecuteReaderAsync();
            if (!await packageReader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy package" });
            }

            var packageName = packageReader.GetString(1);
            var packageType = packageReader.GetString(2);
            var numberOfAnalyses = packageReader.GetInt32(3);
            var price = packageReader.GetDecimal(4);
            var currency = packageReader.IsDBNull(5) ? "VND" : packageReader.GetString(5);
            var validityDays = packageReader.IsDBNull(6) ? null : (int?)packageReader.GetInt32(6);

            // Verify user/clinic exists
            string? clinicId = null;
            if (!string.IsNullOrEmpty(dto.ClinicId))
            {
                var clinicSql = "SELECT Id FROM clinics WHERE Id = @ClinicId AND COALESCE(IsDeleted, false) = false";
                using var clinicCmd = new NpgsqlCommand(clinicSql, connection);
                clinicCmd.Parameters.AddWithValue("ClinicId", dto.ClinicId);
                clinicId = await clinicCmd.ExecuteScalarAsync() as string;
                if (clinicId == null)
                {
                    return NotFound(new { message = "Không tìm thấy clinic" });
                }
            }
            else
            {
                var userSql = "SELECT Id FROM users WHERE Id = @UserId AND COALESCE(IsDeleted, false) = false";
                using var userCmd = new NpgsqlCommand(userSql, connection);
                userCmd.Parameters.AddWithValue("UserId", userId);
                var userExists = await userCmd.ExecuteScalarAsync();
                if (userExists == null)
                {
                    return NotFound(new { message = "Không tìm thấy người dùng" });
                }
            }

            // Create payment record
            var paymentId = Guid.NewGuid().ToString();
            var transactionId = $"TXN-{DateTime.UtcNow:yyyyMMddHHmmss}-{paymentId.Substring(0, 8).ToUpper()}";
            var now = DateTime.UtcNow;

            var paymentSql = @"
                INSERT INTO payment_history
                (Id, UserId, ClinicId, PackageId, PaymentMethod, PaymentProvider, TransactionId,
                 Amount, Currency, PaymentStatus, PaymentDate, CreatedDate, CreatedBy, IsDeleted)
                VALUES
                (@Id, @UserId, @ClinicId, @PackageId, @PaymentMethod, @PaymentProvider, @TransactionId,
                 @Amount, @Currency, 'Pending', @PaymentDate, @CreatedDate, @CreatedBy, false)
                RETURNING Id, UserId, ClinicId, PackageId, PaymentMethod, PaymentProvider, TransactionId,
                          Amount, Currency, PaymentStatus, PaymentDate, ReceiptUrl, Notes";

            using var paymentCmd = new NpgsqlCommand(paymentSql, connection);
            paymentCmd.Parameters.AddWithValue("Id", paymentId);
            paymentCmd.Parameters.AddWithValue("UserId", clinicId == null ? userId : (object)DBNull.Value);
            paymentCmd.Parameters.AddWithValue("ClinicId", (object?)clinicId ?? DBNull.Value);
            paymentCmd.Parameters.AddWithValue("PackageId", dto.PackageId);
            paymentCmd.Parameters.AddWithValue("PaymentMethod", dto.PaymentMethod);
            paymentCmd.Parameters.AddWithValue("PaymentProvider", (object?)dto.PaymentProvider ?? DBNull.Value);
            paymentCmd.Parameters.AddWithValue("TransactionId", transactionId);
            paymentCmd.Parameters.AddWithValue("Amount", price);
            paymentCmd.Parameters.AddWithValue("Currency", currency);
            paymentCmd.Parameters.AddWithValue("PaymentDate", now);
            paymentCmd.Parameters.AddWithValue("CreatedDate", now.Date);
            paymentCmd.Parameters.AddWithValue("CreatedBy", userId);

            using var paymentReader = await paymentCmd.ExecuteReaderAsync();
            if (!await paymentReader.ReadAsync())
            {
                return StatusCode(500, new { message = "Không thể tạo payment record" });
            }

            var payment = new PaymentHistoryDto
            {
                Id = paymentReader.GetString(0),
                UserId = paymentReader.IsDBNull(1) ? null : paymentReader.GetString(1),
                ClinicId = paymentReader.IsDBNull(2) ? null : paymentReader.GetString(2),
                PackageId = paymentReader.GetString(3),
                PackageName = packageName,
                PaymentMethod = paymentReader.IsDBNull(4) ? null : paymentReader.GetString(4),
                PaymentProvider = paymentReader.IsDBNull(5) ? null : paymentReader.GetString(5),
                TransactionId = paymentReader.IsDBNull(6) ? null : paymentReader.GetString(6),
                Amount = paymentReader.GetDecimal(7),
                Currency = paymentReader.IsDBNull(8) ? "VND" : paymentReader.GetString(8),
                PaymentStatus = paymentReader.GetString(9),
                PaymentDate = paymentReader.GetDateTime(10),
                ReceiptUrl = paymentReader.IsDBNull(11) ? null : paymentReader.GetString(11),
                Notes = paymentReader.IsDBNull(12) ? null : paymentReader.GetString(12)
            };

            _logger.LogInformation("Payment created: {PaymentId} for package {PackageId} by user {UserId}", 
                paymentId, dto.PackageId, userId);

            // TODO: Integrate with payment gateway (Stripe, VNPay, etc.)
            // For now, return payment record with Pending status
            // In production, redirect to payment gateway or return payment URL

            return CreatedAtAction(nameof(GetPaymentHistory), new { id = paymentId }, payment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating payment for user {UserId}", userId);
            return StatusCode(500, new { message = "Không thể tạo payment" });
        }
    }

    /// <summary>
    /// Lấy payment history
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(List<PaymentHistoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetPaymentHistory([FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { message = "Chưa xác thực người dùng" });

        // Validate pagination parameters
        if (limit < 1 || limit > 100)
        {
            return BadRequest(new { message = "Limit phải từ 1 đến 100" });
        }
        if (offset < 0)
        {
            return BadRequest(new { message = "Offset phải >= 0" });
        }

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT ph.Id, ph.UserId, ph.ClinicId, ph.PackageId, sp.PackageName, ph.UserPackageId,
                       ph.PaymentMethod, ph.PaymentProvider, ph.TransactionId, ph.Amount, ph.Currency,
                       ph.PaymentStatus, ph.PaymentDate, ph.ReceiptUrl, ph.Notes
                FROM payment_history ph
                LEFT JOIN service_packages sp ON sp.Id = ph.PackageId
                WHERE COALESCE(ph.IsDeleted, false) = false
                    AND (ph.UserId = @UserId OR ph.ClinicId IN (SELECT ClinicId FROM clinic_users WHERE UserId = @UserId))
                ORDER BY ph.PaymentDate DESC
                LIMIT @Limit OFFSET @Offset";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("UserId", userId);
            command.Parameters.AddWithValue("Limit", limit);
            command.Parameters.AddWithValue("Offset", offset);

            var payments = new List<PaymentHistoryDto>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                payments.Add(new PaymentHistoryDto
                {
                    Id = reader.GetString(0),
                    UserId = reader.IsDBNull(1) ? null : reader.GetString(1),
                    ClinicId = reader.IsDBNull(2) ? null : reader.GetString(2),
                    PackageId = reader.GetString(3),
                    PackageName = reader.IsDBNull(4) ? null : reader.GetString(4),
                    UserPackageId = reader.IsDBNull(5) ? null : reader.GetString(5),
                    PaymentMethod = reader.IsDBNull(6) ? null : reader.GetString(6),
                    PaymentProvider = reader.IsDBNull(7) ? null : reader.GetString(7),
                    TransactionId = reader.IsDBNull(8) ? null : reader.GetString(8),
                    Amount = reader.GetDecimal(9),
                    Currency = reader.IsDBNull(10) ? "VND" : reader.GetString(10),
                    PaymentStatus = reader.GetString(11),
                    PaymentDate = reader.GetDateTime(12),
                    ReceiptUrl = reader.IsDBNull(13) ? null : reader.GetString(13),
                    Notes = reader.IsDBNull(14) ? null : reader.GetString(14)
                });
            }

            return Ok(payments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payment history for user {UserId}", userId);
            return StatusCode(500, new { message = "Không thể lấy payment history" });
        }
    }

    /// <summary>
    /// Lấy chi tiết payment
    /// </summary>
    [HttpGet("history/{id}")]
    [ProducesResponseType(typeof(PaymentHistoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetPayment(string id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { message = "Chưa xác thực người dùng" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT ph.Id, ph.UserId, ph.ClinicId, ph.PackageId, sp.PackageName, ph.UserPackageId,
                       ph.PaymentMethod, ph.PaymentProvider, ph.TransactionId, ph.Amount, ph.Currency,
                       ph.PaymentStatus, ph.PaymentDate, ph.ReceiptUrl, ph.Notes
                FROM payment_history ph
                LEFT JOIN service_packages sp ON sp.Id = ph.PackageId
                WHERE ph.Id = @Id
                    AND COALESCE(ph.IsDeleted, false) = false
                    AND (ph.UserId = @UserId OR ph.ClinicId IN (SELECT ClinicId FROM clinic_users WHERE UserId = @UserId))";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("Id", id);
            command.Parameters.AddWithValue("UserId", userId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Không tìm thấy payment" });
            }

            var payment = new PaymentHistoryDto
            {
                Id = reader.GetString(0),
                UserId = reader.IsDBNull(1) ? null : reader.GetString(1),
                ClinicId = reader.IsDBNull(2) ? null : reader.GetString(2),
                PackageId = reader.GetString(3),
                PackageName = reader.IsDBNull(4) ? null : reader.GetString(4),
                UserPackageId = reader.IsDBNull(5) ? null : reader.GetString(5),
                PaymentMethod = reader.IsDBNull(6) ? null : reader.GetString(6),
                PaymentProvider = reader.IsDBNull(7) ? null : reader.GetString(7),
                TransactionId = reader.IsDBNull(8) ? null : reader.GetString(8),
                Amount = reader.GetDecimal(9),
                Currency = reader.IsDBNull(10) ? "VND" : reader.GetString(10),
                PaymentStatus = reader.GetString(11),
                PaymentDate = reader.GetDateTime(12),
                ReceiptUrl = reader.IsDBNull(13) ? null : reader.GetString(13),
                Notes = reader.IsDBNull(14) ? null : reader.GetString(14)
            };

            return Ok(payment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payment {PaymentId} for user {UserId}", id, userId);
            return StatusCode(500, new { message = "Không thể lấy thông tin payment" });
        }
    }

    /// <summary>
    /// Lấy danh sách packages đã mua của user
    /// </summary>
    [HttpGet("my-packages")]
    [ProducesResponseType(typeof(List<UserPackageDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyPackages()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { message = "Chưa xác thực người dùng" });

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT up.Id, up.UserId, up.ClinicId, up.PackageId, sp.PackageName,
                       up.RemainingAnalyses, up.PurchasedAt, up.ExpiresAt, up.IsActive
                FROM user_packages up
                LEFT JOIN service_packages sp ON sp.Id = up.PackageId
                WHERE COALESCE(up.IsDeleted, false) = false
                    AND (up.UserId = @UserId OR up.ClinicId IN (SELECT ClinicId FROM clinic_users WHERE UserId = @UserId))
                ORDER BY up.PurchasedAt DESC";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("UserId", userId);

            var packages = new List<UserPackageDto>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var expiresAt = reader.IsDBNull(7) ? (DateTime?)null : reader.GetDateTime(7);
                packages.Add(new UserPackageDto
                {
                    Id = reader.GetString(0),
                    UserId = reader.IsDBNull(1) ? null : reader.GetString(1),
                    ClinicId = reader.IsDBNull(2) ? null : reader.GetString(2),
                    PackageId = reader.GetString(3),
                    PackageName = reader.IsDBNull(4) ? null : reader.GetString(4),
                    RemainingAnalyses = reader.GetInt32(5),
                    PurchasedAt = reader.GetDateTime(6),
                    ExpiresAt = expiresAt,
                    IsActive = reader.GetBoolean(8)
                });
            }

            return Ok(packages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user packages for user {UserId}", userId);
            return StatusCode(500, new { message = "Không thể lấy danh sách packages" });
        }
    }

    /// <summary>
    /// Verify payment (webhook callback from payment gateway)
    /// </summary>
    [HttpPost("verify")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyPayment([FromBody] Dictionary<string, object> paymentData)
    {
        // TODO: Implement payment gateway webhook verification
        // This should verify the payment with the payment provider (Stripe, VNPay, etc.)
        // and update payment status + create user_package if payment is successful

        try
        {
            var transactionId = paymentData.ContainsKey("transaction_id") 
                ? paymentData["transaction_id"]?.ToString() 
                : null;

            if (string.IsNullOrEmpty(transactionId))
            {
                return BadRequest(new { message = "Transaction ID is required" });
            }

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // Find payment by transaction ID
            var sql = @"
                SELECT Id, UserId, ClinicId, PackageId, PaymentStatus
                FROM payment_history
                WHERE TransactionId = @TransactionId AND COALESCE(IsDeleted, false) = false";

            using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("TransactionId", transactionId);

            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Payment not found" });
            }

            var paymentId = reader.GetString(0);
            var userId = reader.IsDBNull(1) ? null : reader.GetString(1);
            var clinicId = reader.IsDBNull(2) ? null : reader.GetString(2);
            var packageId = reader.GetString(3);
            var currentStatus = reader.GetString(4);

            // TODO: Verify payment status with payment gateway
            // For now, assume payment is completed if webhook is called
            var paymentStatus = "Completed";

            if (currentStatus == "Completed")
            {
                return Ok(new { message = "Payment already processed" });
            }

            // Update payment status
            var updateSql = @"
                UPDATE payment_history
                SET PaymentStatus = @PaymentStatus,
                    UpdatedDate = CURRENT_DATE
                WHERE Id = @PaymentId";

            using var updateCmd = new NpgsqlCommand(updateSql, connection);
            updateCmd.Parameters.AddWithValue("PaymentId", paymentId);
            updateCmd.Parameters.AddWithValue("PaymentStatus", paymentStatus);
            await updateCmd.ExecuteNonQueryAsync();

            // If payment is completed, create user_package
            if (paymentStatus == "Completed")
            {
                // Get package details
                var packageSql = @"
                    SELECT NumberOfAnalyses, ValidityDays FROM service_packages WHERE Id = @PackageId";
                using var packageCmd = new NpgsqlCommand(packageSql, connection);
                packageCmd.Parameters.AddWithValue("PackageId", packageId);

                using var packageReader = await packageCmd.ExecuteReaderAsync();
                if (await packageReader.ReadAsync())
                {
                    var numberOfAnalyses = packageReader.GetInt32(0);
                    var validityDays = packageReader.IsDBNull(1) ? null : (int?)packageReader.GetInt32(1);

                    var userPackageId = Guid.NewGuid().ToString();
                    var expiresAt = validityDays.HasValue 
                        ? DateTime.UtcNow.AddDays(validityDays.Value) 
                        : (DateTime?)null;

                    var userPackageSql = @"
                        INSERT INTO user_packages
                        (Id, UserId, ClinicId, PackageId, RemainingAnalyses, PurchasedAt, ExpiresAt,
                         IsActive, CreatedDate, CreatedBy, IsDeleted)
                        VALUES
                        (@Id, @UserId, @ClinicId, @PackageId, @RemainingAnalyses, @PurchasedAt, @ExpiresAt,
                         true, @CreatedDate, @CreatedBy, false)";

                    using var userPackageCmd = new NpgsqlCommand(userPackageSql, connection);
                    userPackageCmd.Parameters.AddWithValue("Id", userPackageId);
                    userPackageCmd.Parameters.AddWithValue("UserId", (object?)userId ?? DBNull.Value);
                    userPackageCmd.Parameters.AddWithValue("ClinicId", (object?)clinicId ?? DBNull.Value);
                    userPackageCmd.Parameters.AddWithValue("PackageId", packageId);
                    userPackageCmd.Parameters.AddWithValue("RemainingAnalyses", numberOfAnalyses);
                    userPackageCmd.Parameters.AddWithValue("PurchasedAt", DateTime.UtcNow);
                    userPackageCmd.Parameters.AddWithValue("ExpiresAt", (object?)expiresAt ?? DBNull.Value);
                    userPackageCmd.Parameters.AddWithValue("CreatedDate", DateTime.UtcNow.Date);
                    userPackageCmd.Parameters.AddWithValue("CreatedBy", userId ?? clinicId ?? "system");

                    await userPackageCmd.ExecuteNonQueryAsync();

                    // Update payment with user_package_id
                    var updatePaymentSql = @"
                        UPDATE payment_history
                        SET UserPackageId = @UserPackageId
                        WHERE Id = @PaymentId";

                    using var updatePaymentCmd = new NpgsqlCommand(updatePaymentSql, connection);
                    updatePaymentCmd.Parameters.AddWithValue("UserPackageId", userPackageId);
                    updatePaymentCmd.Parameters.AddWithValue("PaymentId", paymentId);
                    await updatePaymentCmd.ExecuteNonQueryAsync();

                    _logger.LogInformation("User package created: {UserPackageId} for payment {PaymentId}", 
                        userPackageId, paymentId);
                }
            }

            return Ok(new { message = "Payment verified successfully", paymentId, status = paymentStatus });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying payment");
            return StatusCode(500, new { message = "Không thể verify payment" });
        }
    }

    #region Private Methods

    private string? GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    private static bool IsValidPaymentMethod(string? method)
    {
        return method != null && new[] { "CreditCard", "DebitCard", "BankTransfer", "E-Wallet", "Other" }.Contains(method);
    }

    #endregion
}
