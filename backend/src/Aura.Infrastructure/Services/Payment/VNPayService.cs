using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Aura.Infrastructure.Services.Payment;

/// <summary>
/// VNPay Payment Gateway Service Implementation
/// </summary>
public class VNPayService : IPaymentGatewayService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<VNPayService> _logger;
    private readonly string _tmnCode;
    private readonly string _hashSecret;
    private readonly string _paymentUrl;
    private readonly string _returnUrl;

    public string GatewayName => "VNPay";

    public VNPayService(IConfiguration configuration, ILogger<VNPayService> logger)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // Get VNPay configuration
        _tmnCode = _configuration["Payment:VNPay:TmnCode"] ?? "YOUR_TMN_CODE";
        _hashSecret = _configuration["Payment:VNPay:HashSecret"] ?? "YOUR_HASH_SECRET";
        _paymentUrl = _configuration["Payment:VNPay:PaymentUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        _returnUrl = _configuration["Payment:VNPay:ReturnUrl"] ?? "http://localhost:5000/api/payments/vnpay-callback";
    }

    public async Task<string> CreatePaymentUrlAsync(
        string transactionId,
        decimal amount,
        string currency,
        string orderDescription,
        string returnUrl,
        string? userId = null,
        Dictionary<string, string>? additionalData = null)
    {
        try
        {
            var vnpParams = new Dictionary<string, string>
            {
                { "vnp_Version", "2.1.0" },
                { "vnp_Command", "pay" },
                { "vnp_TmnCode", _tmnCode },
                { "vnp_Amount", ((long)(amount * 100)).ToString() }, // Convert to cents
                { "vnp_CurrCode", currency == "VND" ? "VND" : "USD" },
                { "vnp_TxnRef", transactionId },
                { "vnp_OrderInfo", orderDescription },
                { "vnp_OrderType", "other" },
                { "vnp_Locale", "vn" },
                { "vnp_ReturnUrl", returnUrl },
                { "vnp_IpAddr", "127.0.0.1" }, // Should get from request in production
                { "vnp_CreateDate", DateTime.Now.ToString("yyyyMMddHHmmss") }
            };

            // Add user ID if provided
            if (!string.IsNullOrEmpty(userId))
            {
                vnpParams["vnp_OrderInfo"] = $"{orderDescription} - User: {userId}";
            }

            // Add additional data
            if (additionalData != null)
            {
                foreach (var item in additionalData)
                {
                    if (!vnpParams.ContainsKey(item.Key))
                    {
                        vnpParams[item.Key] = item.Value;
                    }
                }
            }

            // Sort parameters
            var sortedParams = vnpParams.OrderBy(x => x.Key).ToList();

            // Create query string
            var queryString = string.Join("&", sortedParams.Select(x => $"{x.Key}={Uri.EscapeDataString(x.Value)}"));

            // Create secure hash
            var signData = queryString;
            if (!string.IsNullOrEmpty(_hashSecret))
            {
                signData += $"&{_hashSecret}";
            }

            var vnpSecureHash = ComputeHMACSHA512(signData, _hashSecret);
            queryString += $"&vnp_SecureHash={vnpSecureHash}";

            var paymentUrl = $"{_paymentUrl}?{queryString}";

            _logger.LogInformation("VNPay payment URL created for transaction: {TransactionId}", transactionId);

            return await Task.FromResult(paymentUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating VNPay payment URL for transaction: {TransactionId}", transactionId);
            throw new InvalidOperationException($"Failed to create VNPay payment URL: {ex.Message}", ex);
        }
    }

    public async Task<PaymentVerificationResult> VerifyPaymentAsync(Dictionary<string, string> callbackData)
    {
        try
        {
            if (callbackData == null || !callbackData.ContainsKey("vnp_SecureHash"))
            {
                return new PaymentVerificationResult
                {
                    IsValid = false,
                    IsSuccess = false,
                    Message = "Invalid callback data"
                };
            }

            var vnpSecureHash = callbackData["vnp_SecureHash"];
            var vnpResponseCode = callbackData.ContainsKey("vnp_ResponseCode") ? callbackData["vnp_ResponseCode"] : null;
            var vnpTransactionStatus = callbackData.ContainsKey("vnp_TransactionStatus") ? callbackData["vnp_TransactionStatus"] : null;
            var vnpTxnRef = callbackData.ContainsKey("vnp_TxnRef") ? callbackData["vnp_TxnRef"] : null;
            var vnpAmount = callbackData.ContainsKey("vnp_Amount") ? callbackData["vnp_Amount"] : null;

            // Remove secure hash for verification
            var dataForHash = callbackData
                .Where(x => x.Key != "vnp_SecureHash" && x.Key != "vnp_SecureHashType")
                .OrderBy(x => x.Key)
                .Select(x => $"{x.Key}={Uri.EscapeDataString(x.Value)}");

            var queryString = string.Join("&", dataForHash);
            var signData = queryString;
            if (!string.IsNullOrEmpty(_hashSecret))
            {
                signData += $"&{_hashSecret}";
            }

            var computedHash = ComputeHMACSHA512(signData, _hashSecret);

            // Verify hash
            var isValid = computedHash.Equals(vnpSecureHash, StringComparison.OrdinalIgnoreCase);

            if (!isValid)
            {
                _logger.LogWarning("VNPay callback hash verification failed for transaction: {TransactionId}", vnpTxnRef);
                return new PaymentVerificationResult
                {
                    IsValid = false,
                    IsSuccess = false,
                    TransactionId = vnpTxnRef,
                    Message = "Hash verification failed"
                };
            }

            // Check response code (00 = success)
            var isSuccess = vnpResponseCode == "00" && vnpTransactionStatus == "00";

            decimal? amount = null;
            if (!string.IsNullOrEmpty(vnpAmount) && long.TryParse(vnpAmount, out var amountLong))
            {
                amount = amountLong / 100m; // Convert from cents
            }

            _logger.LogInformation("VNPay payment verified for transaction: {TransactionId}, Success: {IsSuccess}", 
                vnpTxnRef, isSuccess);

            return new PaymentVerificationResult
            {
                IsValid = true,
                IsSuccess = isSuccess,
                TransactionId = vnpTxnRef,
                Amount = amount,
                Currency = callbackData.ContainsKey("vnp_CurrCode") ? callbackData["vnp_CurrCode"] : "VND",
                Status = isSuccess ? "Completed" : "Failed",
                Message = isSuccess ? "Payment successful" : $"Payment failed: {vnpResponseCode}",
                AdditionalData = callbackData
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying VNPay payment");
            return new PaymentVerificationResult
            {
                IsValid = false,
                IsSuccess = false,
                Message = $"Verification error: {ex.Message}"
            };
        }
    }

    private string ComputeHMACSHA512(string data, string key)
    {
        using var hmacsha512 = new HMACSHA512(Encoding.UTF8.GetBytes(key));
        var hashBytes = hmacsha512.ComputeHash(Encoding.UTF8.GetBytes(data));
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }
}
