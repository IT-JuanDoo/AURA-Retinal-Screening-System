namespace Aura.Infrastructure.Services.Payment;

/// <summary>
/// Interface for payment gateway services
/// </summary>
public interface IPaymentGatewayService
{
    /// <summary>
    /// Create payment URL for redirecting user to payment gateway
    /// </summary>
    Task<string> CreatePaymentUrlAsync(
        string transactionId,
        decimal amount,
        string currency,
        string orderDescription,
        string returnUrl,
        string? userId = null,
        Dictionary<string, string>? additionalData = null);

    /// <summary>
    /// Verify payment callback from payment gateway
    /// </summary>
    Task<PaymentVerificationResult> VerifyPaymentAsync(
        Dictionary<string, string> callbackData);

    /// <summary>
    /// Get payment gateway name
    /// </summary>
    string GatewayName { get; }
}

public class PaymentVerificationResult
{
    public bool IsValid { get; set; }
    public bool IsSuccess { get; set; }
    public string? TransactionId { get; set; }
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
    public string? Status { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, string>? AdditionalData { get; set; }
}
