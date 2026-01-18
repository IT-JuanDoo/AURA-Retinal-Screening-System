namespace Aura.Application.DTOs.Payments;

/// <summary>
/// DTO cho payment history
/// </summary>
public class PaymentHistoryDto
{
    public string Id { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? ClinicId { get; set; }
    public string PackageId { get; set; } = string.Empty;
    public string? PackageName { get; set; }
    public string? UserPackageId { get; set; }
    public string? PaymentMethod { get; set; }
    public string? PaymentProvider { get; set; }
    public string? TransactionId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string PaymentStatus { get; set; } = string.Empty; // Pending, Completed, Failed, Refunded
    public DateTime PaymentDate { get; set; }
    public string? ReceiptUrl { get; set; }
    public string? Notes { get; set; }
}
